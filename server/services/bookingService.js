import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { httpError } from "../utils/httpError.js";
import {
  DAY_MS,
  parseDateOnly,
  hotelToday,
  nightsBetween,
} from "../utils/dateUtils.js";

export const MAX_NIGHTS = 30;
export const MAX_ADVANCE_DAYS = 365;
const HOLD_HOURS = 24;
const CANCEL_CUTOFF_DAYS = 1;
const MAX_GUESTS = 5;

function validateStay({ checkIn, checkOut, guests }) {
  const checkInDate = parseDateOnly(checkIn, "Check-in");
  const checkOutDate = parseDateOnly(checkOut, "Check-out");
  const today = hotelToday();

  if (checkInDate < today)
    throw httpError(400, "Check-in can't be in the past");
  if (checkOutDate <= checkInDate)
    throw httpError(400, "Check-out must be after check-in");

  const nights = nightsBetween(checkInDate, checkOutDate);
  if (nights > MAX_NIGHTS)
    throw httpError(400, `Stays are limited to ${MAX_NIGHTS} nights`);
  if (checkInDate - today > MAX_ADVANCE_DAYS * DAY_MS) {
    throw httpError(400, `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead`);
  }

  const guestCount =
    typeof guests === "string" || typeof guests === "number"
      ? Number(guests)
      : NaN;
  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > MAX_GUESTS
  ) {
    throw httpError(
      400,
      `Guests must be a whole number from 1 to ${MAX_GUESTS}`,
    );
  }

  return { checkInDate, checkOutDate, nights, guests: guestCount };
}

const priceFor = (pricePerNight, nights) =>
  Math.round(pricePerNight * nights * 100) / 100;

export function blockingFilter(checkInDate, checkOutDate, now) {
  return {
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate },
    $or: [
      { bookingStatus: { $in: ["confirmed", "checked_in"] } },
      { bookingStatus: "pending", holdExpiresAt: { $gt: now } },
    ],
  };
}

export async function expireStaleHolds() {
  await Booking.updateMany(
    { bookingStatus: "pending", holdExpiresAt: { $lte: new Date() } },
    { $set: { bookingStatus: "expired" }, $unset: { holdExpiresAt: "" } },
  );
}

export async function searchAvailableRooms({ checkIn, checkOut, guests }) {
  const stay = validateStay({ checkIn, checkOut, guests });

  const bookedRoomIds = await Booking.distinct(
    "roomId",
    blockingFilter(stay.checkInDate, stay.checkOutDate, new Date()),
  );

  const rooms = await Room.find({
    active: true,
    capacity: { $gte: stay.guests },
    _id: { $nin: bookedRoomIds },
  }).sort({ pricePerNight: 1 });

  return {
    checkIn,
    checkOut,
    nights: stay.nights,
    guests: stay.guests,
    rooms: rooms.map((room) => ({
      ...room.toObject(),
      nights: stay.nights,
      totalPrice: priceFor(room.pricePerNight, stay.nights),
    })),
  };
}

export async function createBooking(
  userId,
  { roomId, checkIn, checkOut, guestCount },
) {
  if (!mongoose.isValidObjectId(roomId))
    throw httpError(400, "Invalid room id");
  const stay = validateStay({ checkIn, checkOut, guests: guestCount });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        const room = await Room.findOneAndUpdate(
          { _id: roomId, active: true },
          { $inc: { reservationSeq: 1 } },
          { new: true, session },
        );
        if (!room) throw httpError(404, "Room not found");
        if (stay.guests > room.capacity) {
          throw httpError(400, `This room holds up to ${room.capacity} guests`);
        }

        const now = new Date();
        const conflict = await Booking.exists({
          roomId: room._id,
          ...blockingFilter(stay.checkInDate, stay.checkOutDate, now),
        }).session(session);
        if (conflict) {
          throw httpError(
            409,
            "Sorry, this room is no longer available for those dates",
          );
        }

        const [booking] = await Booking.create(
          [
            {
              userId,
              roomId: room._id,
              checkIn: stay.checkInDate,
              checkOut: stay.checkOutDate,
              guestCount: stay.guests,
              nights: stay.nights,
              pricePerNight: room.pricePerNight,
              totalPrice: priceFor(room.pricePerNight, stay.nights),
              bookingStatus: "pending",
              holdExpiresAt: new Date(
                now.getTime() + HOLD_HOURS * 60 * 60 * 1000,
              ),
            },
          ],
          { session },
        );
        return booking;
      });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.bookingReference) continue;
      throw error;
    }
  }
  throw httpError(
    500,
    "Could not generate a booking reference. Please try again.",
  );
}

export async function listMyBookings(userId) {
  await expireStaleHolds();

  const bookings = await Booking.find({ userId })
    .sort({ createdAt: -1 })

    .populate("roomId", "name roomNumber type images");

  return bookings.map((b) => {
    const { roomId, ...rest } = b.toObject();
    return { ...rest, roomId: roomId?._id, room: roomId };
  });
}

export async function cancelBooking(userId, bookingId) {
  if (!mongoose.isValidObjectId(bookingId))
    throw httpError(400, "Invalid booking id");

  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw httpError(404, "Booking not found");

  if (!["pending", "confirmed"].includes(booking.bookingStatus)) {
    throw httpError(400, "This booking can't be cancelled");
  }

  if (booking.paymentStatus === "paid") {
    throw httpError(400, "This booking has been paid. Please contact the hotel to cancel it and arrange a refund.");
  }

  const lastCancelDay = new Date(
    booking.checkIn.getTime() - CANCEL_CUTOFF_DAYS * DAY_MS,
  );
  if (hotelToday() > lastCancelDay) {
    throw httpError(
      400,
      "It's too late to cancel online. Please contact the hotel.",
    );
  }

  const updated = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      userId,
      bookingStatus: { $in: ["pending", "confirmed", "unpaid" ] },
    },
    {
      $set: { bookingStatus: "cancelled", cancelledAt: new Date() },
      $unset: { holdExpiresAt: "" },
    },
    { new: true },
  );
  if (!updated)
    throw httpError(409, "This booking was just changed. Please refresh.");
  return updated;
}


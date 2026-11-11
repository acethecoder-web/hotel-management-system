import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { httpError } from "../utils/httpError.js";
import { hotelToday, nightsBetween } from "../utils/dateUtils.js";
import { blockingFilter } from "./bookingService.js";
import { getSettings } from "./hotelSettingsService.js";
import { toAdminBooking, toAdminRoom, populateBooking, overdueFilter } from "./adminService.js";

const MANUAL_STATUSES = ["available", "cleaning", "maintenance"];
const label = (status) => status.replace("_", " ");


export async function getFrontDesk() {
  const settings = await getSettings();
  const today = hotelToday();
  const now = new Date();

  const [arrivals, checkedIn, overdueRows] = await Promise.all([
    populateBooking(
      Booking.find({
        checkIn: { $lte: today },
        checkOut: { $gt: today },
        $or: [
          { bookingStatus: "confirmed" },
          { bookingStatus: "pending", holdExpiresAt: { $gt: now } },
        ],
      }).sort({ checkIn: 1 }).limit(100)
    ),
    populateBooking(Booking.find({ bookingStatus: "checked_in" }).sort({ checkOut: 1 }).limit(200)),
    Booking.find(overdueFilter(settings)).select("_id"),
  ]);

  const overdueIds = new Set(overdueRows.map((b) => String(b._id)));
  const overdue = [];
  const departingToday = [];
  const staying = [];
  checkedIn.forEach((b) => {
    if (overdueIds.has(String(b._id))) overdue.push(b);
    else if (b.checkOut.getTime() === today.getTime()) departingToday.push(b);
    else staying.push(b);
  });

  return {
    date: today.toISOString().slice(0, 10),
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    arrivals: arrivals.map(toAdminBooking),
    overdue: overdue.map(toAdminBooking),
    departingToday: departingToday.map(toAdminBooking),
    staying: staying.map(toAdminBooking),
  };
}


export async function checkIn(id, adminId, acknowledgeWarnings = false) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");

  const result = await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw httpError(404, "Booking not found");

    if (booking.bookingStatus !== "confirmed") {
      throw httpError(
        409,
        booking.bookingStatus === "pending"
          ? "Confirm this booking before checking in."
          : `This booking is ${label(booking.bookingStatus)} and can't be checked in.`
      );
    }

    const today = hotelToday();
    if (today >= booking.checkOut) {
      throw httpError(409, "This stay has already ended, so it can't be checked in.");
    }

    const room = await Room.findByIdAndUpdate(
      booking.roomId,
      { $inc: { reservationSeq: 1 } },
      { new: true, session }
    );
    if (!room) throw httpError(404, "Room not found");

    const someoneInside = await Booking.exists({
      roomId: room._id,
      _id: { $ne: booking._id },
      bookingStatus: "checked_in",
    }).session(session);
    if (room.operationalStatus === "occupied" || someoneInside) {
      throw httpError(409, `Room ${room.roomNumber} is still occupied. Check the current guest out first.`);
    }
    if (room.operationalStatus === "maintenance") {
      throw httpError(409, `Room ${room.roomNumber} is under maintenance. Change its status first.`);
    }

    const warnings = [];
    let earlyDays = 0;

    if (today < booking.checkIn) {

              if (booking.paymentStatus === "paid") {
        throw httpError(
          409,
          "This booking is already paid for its original dates. Arriving early would change the amount, " +
            "which isn't supported yet. Ask the guest to wait for the booked date, or cancel (with a refund) and rebook."
        );
      }

      earlyDays = nightsBetween(today, booking.checkIn);

      const clash = await Booking.exists({
        _id: { $ne: booking._id },
        roomId: room._id,
        ...blockingFilter(today, booking.checkIn, new Date()),
      }).session(session);
      if (clash) {
        throw httpError(409, "Another booking holds this room before the guest's booked date.");
      }

      warnings.push(
        `Guest is arriving ${earlyDays} ${earlyDays === 1 ? "day" : "days"} early ` +
          `(booked from ${booking.checkIn.toISOString().slice(0, 10)}). The stay will start today ` +
          `and ${earlyDays} extra ${earlyDays === 1 ? "night" : "nights"} will be added to the bill.`
      );
    }

    if (room.operationalStatus === "cleaning") {
      warnings.push(`Room ${room.roomNumber} is still marked as being cleaned.`);
    }

    if (warnings.length > 0 && !acknowledgeWarnings) {
      const error = httpError(409, "Check-in needs confirmation");
      error.extra = { code: "CHECKIN_WARNING", warnings };
      throw error;
    }

    const changes = {
      bookingStatus: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: adminId,
      checkInWarnings: warnings,
    };
    if (earlyDays > 0) {
      const nights = nightsBetween(today, booking.checkOut);
      Object.assign(changes, {
        originalCheckIn: booking.checkIn,
        checkIn: today,
        nights,
        totalPrice: Math.round(booking.pricePerNight * nights * 100) / 100,
      });
    }

    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, bookingStatus: "confirmed" },
      { $set: changes },
      { new: true, session }
    );
    if (!updated) throw httpError(409, "This booking was just changed. Please refresh.");

    await Room.updateOne({ _id: room._id }, { $set: { operationalStatus: "occupied" } }, { session });

    return { id: updated._id, warnings, earlyDays };
  });

  const booking = await populateBooking(Booking.findById(result.id));
  return { booking: toAdminBooking(booking), warnings: result.warnings, earlyDays: result.earlyDays };
}


export async function checkOut(id, adminId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");

  const bookingId = await mongoose.connection.transaction(async (session) => {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw httpError(404, "Booking not found");
    if (booking.bookingStatus !== "checked_in") {
      throw httpError(409, `This booking is ${label(booking.bookingStatus)} and can't be checked out.`);
    }

    await Room.updateOne(
      { _id: booking.roomId },
      { $set: { operationalStatus: "cleaning" }, $inc: { reservationSeq: 1 } },
      { session }
    );

    const updated = await Booking.findOneAndUpdate(
      { _id: id, bookingStatus: "checked_in" },
      { $set: { bookingStatus: "checked_out", checkedOutAt: new Date(), checkedOutBy: adminId } },
      { new: true, session }
    );
    if (!updated) throw httpError(409, "This booking was just changed. Please refresh.");
    return updated._id;
  });

  const booking = await populateBooking(Booking.findById(bookingId));
  return toAdminBooking(booking);
}
export async function setRoomStatus(id, status) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  if (!MANUAL_STATUSES.includes(status)) {
    throw httpError(400, "Status must be available, cleaning, or maintenance");
  }

  return mongoose.connection.transaction(async (session) => {
    const room = await Room.findOneAndUpdate(
      { _id: id, operationalStatus: { $ne: "occupied" } }, 
      { $set: { operationalStatus: status }, $inc: { reservationSeq: 1 } },
      { new: true, session }
    );

    if (!room) {
      const exists = await Room.exists({ _id: id }).session(session);
      throw exists
        ? httpError(409, "This room is occupied. Its status changes when the guest checks out.")
        : httpError(404, "Room not found");
    }

    const guestInside = await Booking.exists({ roomId: room._id, bookingStatus: "checked_in" }).session(session);
    if (guestInside) throw httpError(409, "A guest is checked in to this room.");

    return toAdminRoom(room);
  });
}
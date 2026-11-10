import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { DAY_MS, hotelToday } from "../utils/dateUtils.js";
import mongoose from "mongoose";
import { httpError } from "../utils/httpError.js";

export async function getDashboard() {
  const today = hotelToday();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const afterWeek = new Date(today.getTime() + 8 * DAY_MS); // exclusive end: days 1 to 7
  const now = new Date();
const ROOM_FIELDS = ["roomNumber", "name", "type", "description", "pricePerNight", "capacity"];

  const livePending = { bookingStatus: "pending", holdExpiresAt: { $gt: now } };

  const [
    activeRooms,
    occupiedTonight,
    arrivalsToday,
    departuresToday,
    inHouse,
    pendingConfirmation,
    arrivalsNext7Days,
    roomStatusRows,
    recent,
  ] = await Promise.all([
    Room.countDocuments({ active: true }),

    // Stays that cover tonight: checkIn <= today < checkOut
    Booking.countDocuments({
      checkIn: { $lte: today },
      checkOut: { $gt: today },
      bookingStatus: { $in: ["confirmed", "checked_in"] },
    }),

    Booking.countDocuments({
      checkIn: { $gte: today, $lt: tomorrow },
      $or: [{ bookingStatus: "confirmed" }, livePending],
    }),

    Booking.countDocuments({
      checkOut: { $gte: today, $lt: tomorrow },
      bookingStatus: "checked_in",
    }),

    Booking.countDocuments({ bookingStatus: "checked_in" }),

    Booking.countDocuments(livePending),

    Booking.countDocuments({
      checkIn: { $gte: tomorrow, $lt: afterWeek },
      $or: [{ bookingStatus: "confirmed" }, livePending],
    }),

    Room.aggregate([
      { $match: { active: true } },
      { $group: { _id: "$operationalStatus", count: { $sum: 1 } } },
    ]),

    Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "name email")
      .populate("roomId", "name roomNumber"),
  ]);

  const roomStatus = { available: 0, cleaning: 0, maintenance: 0, occupied: 0 };
  roomStatusRows.forEach((row) => { roomStatus[row._id] = row.count; });

  return {
    date: today.toISOString().slice(0, 10),
    rooms: { active: activeRooms, status: roomStatus },
    occupancy: {
      occupiedTonight,
      percent: activeRooms ? Math.round((occupiedTonight / activeRooms) * 100) : 0,
    },
    arrivalsToday,
    departuresToday,
    inHouse,
    pendingConfirmation,
    arrivalsNext7Days,
    recentBookings: recent.map((b) => ({
      id: b._id,
      bookingReference: b.bookingReference,
      guestName: b.userId?.name ?? "Unknown",
      roomName: b.roomId?.name ?? "Room",
      roomNumber: b.roomId?.roomNumber,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      bookingStatus: b.bookingStatus,
      totalPrice: b.totalPrice,
    })),
  };
}

function toAdminRoom(room) {
  const { reservationSeq, __v, ...safe } = room.toObject();
  return safe;
}

function cleanAmenities(value) {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw httpError(400, "Amenities must be a list of text values");
  }
  const items = [...new Set(value.map((v) => v.trim()).filter(Boolean))];
  if (items.length > 20) throw httpError(400, "At most 20 amenities");
  if (items.some((i) => i.length > 40)) throw httpError(400, "Each amenity must be 40 characters or fewer");
  return items;
}

// Stays that still need this room: not finished, and either confirmed, in-house, or a live hold
function upcomingBookingsFilter(roomId) {
  return {
    roomId,
    checkOut: { $gte: hotelToday() }, // includes guests leaving today (still in the room)
    $or: [
      { bookingStatus: { $in: ["confirmed", "checked_in"] } },
      { bookingStatus: "pending", holdExpiresAt: { $gt: new Date() } },
    ],
  };
}

export async function listRooms() {
  const rooms = await Room.find().sort({ roomNumber: 1 }); // includes inactive rooms
  return rooms.map(toAdminRoom);
}

export async function createRoom(body) {
  const data = {};
  ROOM_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  if (body.amenities !== undefined) data.amenities = cleanAmenities(body.amenities);

  const room = await Room.create(data); // schema validators run here
  return toAdminRoom(room);
}

export async function updateRoom(id, body) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  const room = await Room.findById(id);
  if (!room) throw httpError(404, "Room not found");

  ROOM_FIELDS.forEach((field) => {
    if (body[field] !== undefined) room[field] = body[field];
  });
  if (body.amenities !== undefined) room.amenities = cleanAmenities(body.amenities);

  // Don't shrink a room below the party size of a stay that still needs it
  if (room.isModified("capacity")) {
    const tooBig = await Booking.exists({
      ...upcomingBookingsFilter(room._id),
      guestCount: { $gt: room.capacity },
    });
    if (tooBig) {
      throw httpError(409, "An upcoming booking has more guests than this capacity allows");
    }
  }

  await room.save(); // runs the validators (price range, whole-number capacity, ...)
  return toAdminRoom(room);
}

export async function setRoomActive(id, active) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  if (typeof active !== "boolean") throw httpError(400, "active must be true or false");

  if (active) {
    const room = await Room.findByIdAndUpdate(id, { $set: { active: true } }, { new: true });
    if (!room) throw httpError(404, "Room not found");
    return toAdminRoom(room);
  }

  return mongoose.connection.transaction(async (session) => {
    const room = await Room.findByIdAndUpdate(
      id,
      { $set: { active: false }, $inc: { reservationSeq: 1 } },
      { new: true, session }
    );
    if (!room) throw httpError(404, "Room not found");

    const count = await Booking.countDocuments(upcomingBookingsFilter(room._id)).session(session);
    if (count > 0) {
      throw httpError(
        409,
        `This room has ${count} upcoming ${count === 1 ? "booking" : "bookings"}. Cancel or resolve them first.`
      );
    }
    return toAdminRoom(room);
  });
}

export const fetchAdminRooms = () => api("/api/admin/rooms");

export const createRoomRequest = (data) =>
  api("/api/admin/rooms", { method: "POST", body: data });

export const updateRoomRequest = (id, data) =>
  api(`/api/admin/rooms/${id}`, { method: "PATCH", body: data });

export const setRoomActiveRequest = (id, active) =>
  api(`/api/admin/rooms/${id}/active`, { method: "PATCH", body: { active } });
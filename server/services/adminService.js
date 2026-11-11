import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import mongoose from "mongoose";
import { httpError } from "../utils/httpError.js";
import { uploadImageBuffer, deleteImage } from "./cloudinaryService.js";
import User from "../models/User.js";
import { getSettings } from "./hotelSettingsService.js";
// ...
import { DAY_MS, hotelToday, parseDateOnly, hotelMinutesNow, timeToMinutes } from "../utils/dateUtils.js";

export function overdueFilter(settings) {
  const today = hotelToday();
  const pastCutoff = hotelMinutesNow() > timeToMinutes(settings.checkOutTime);
  return {
    bookingStatus: "checked_in",
    checkOut: pastCutoff ? { $lte: today } : { $lt: today },
  };
}

export async function getDashboard() {
  const settings = await getSettings();
  const today = hotelToday();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const afterWeek = new Date(today.getTime() + 8 * DAY_MS); 
  const now = new Date();

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
    overdueDepartures
  ] = await Promise.all([
    Room.countDocuments({ active: true }),

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
  Booking.countDocuments(overdueFilter(settings))
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
    overdueDepartures,
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

  const ROOM_FIELDS = ["roomNumber", "name", "type", "description", "pricePerNight", "capacity"];

export function toAdminRoom(room) {
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

function upcomingBookingsFilter(roomId) {
  return {
    roomId,
    checkOut: { $gte: hotelToday() }, 
    $or: [
      { bookingStatus: { $in: ["confirmed", "checked_in"] } },
      { bookingStatus: "pending", holdExpiresAt: { $gt: new Date() } },
    ],
  };
}



export async function listRooms() {
  const rooms = await Room.find().sort({ roomNumber: 1 }); 
  return rooms.map(toAdminRoom);
}

export async function createRoom(body) {
  const data = {};
  ROOM_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  if (body.amenities !== undefined) data.amenities = cleanAmenities(body.amenities);

  const room = await Room.create(data); 
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

  if (room.isModified("capacity")) {
    const tooBig = await Booking.exists({
      ...upcomingBookingsFilter(room._id),
      guestCount: { $gt: room.capacity },
    });
    if (tooBig) {
      throw httpError(409, "An upcoming booking has more guests than this capacity allows");
    }
  }

  await room.save(); 
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

const MAX_IMAGES_PER_ROOM = 8;

function looksLikeImage(buffer) {
  if (buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

export async function addRoomImages(id, files) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  if (!files || files.length === 0) throw httpError(400, "Choose at least one image");

  const room = await Room.findById(id).select("images");
  if (!room) throw httpError(404, "Room not found");

  if (room.images.length + files.length > MAX_IMAGES_PER_ROOM) {
    throw httpError(
      400,
      `A room can have up to ${MAX_IMAGES_PER_ROOM} photos (it has ${room.images.length}).`
    );
  }

  const failed = [];
  const valid = [];
  for (const file of files) {
    if (looksLikeImage(file.buffer)) valid.push(file);
    else failed.push({ name: file.originalname, reason: "Not a valid JPG, PNG, or WebP image" });
  }

  const results = await Promise.allSettled(valid.map((f) => uploadImageBuffer(f.buffer)));

  const uploaded = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      uploaded.push({ url: result.value.secure_url, publicId: result.value.public_id });
    } else {
      console.error("cloudinary upload failed:", result.reason?.message);
      failed.push({ name: valid[i].originalname, reason: "Upload to the image service failed" });
    }
  });

  if (uploaded.length === 0) throw httpError(502, "None of the images could be uploaded");

  const updated = await Room.findOneAndUpdate(
    { _id: id, $expr: { $lte: [{ $size: "$images" }, MAX_IMAGES_PER_ROOM - uploaded.length] } },
    { $push: { images: { $each: uploaded } } },
    { new: true }
  );

  if (!updated) {
    await Promise.allSettled(uploaded.map((u) => deleteImage(u.publicId)));
    throw httpError(409, "The room's photos changed while uploading. Please try again.");
  }

  return { room: toAdminRoom(updated), failed };
}

export async function removeRoomImage(id, publicId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  if (typeof publicId !== "string" || !publicId) throw httpError(400, "publicId is required");

  const room = await Room.findOne({ _id: id, "images.publicId": publicId }).select("_id");
  if (!room) throw httpError(404, "Image not found on this room");

  try {
    await deleteImage(publicId);
  } catch (error) {
    console.error("cloudinary delete failed:", error.message);
    throw httpError(502, "Could not delete the image from the image service. Please try again.");
  }

  const updated = await Room.findByIdAndUpdate(
    id,
    { $pull: { images: { publicId } } },
    { new: true }
  );
  return toAdminRoom(updated);
}

export async function setCoverImage(id, publicId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid room id");
  if (typeof publicId !== "string" || !publicId) throw httpError(400, "publicId is required");

  const updated = await Room.findOneAndUpdate(
    { _id: id, "images.publicId": publicId },
    [
      {
        $set: {
          images: {
            $concatArrays: [
              { $filter: { input: "$images", cond: { $eq: ["$$this.publicId", publicId] } } },
              { $filter: { input: "$images", cond: { $ne: ["$$this.publicId", publicId] } } },
            ],
          },
        },
      },
    ],
    { new: true }
  );
  if (!updated) throw httpError(404, "Image not found on this room");
  return toAdminRoom(updated);
}

export const fetchAdminRooms = () => api("/api/admin/rooms");

export const createRoomRequest = (data) =>
  api("/api/admin/rooms", { method: "POST", body: data });

export const updateRoomRequest = (id, data) =>
  api(`/api/admin/rooms/${id}`, { method: "PATCH", body: data });

export const setRoomActiveRequest = (id, active) =>
  api(`/api/admin/rooms/${id}/active`, { method: "PATCH", body: { active } });

const BOOKING_STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "expired"];

export function toAdminBooking(b) {
  return {
    id: b._id,
    bookingReference: b.bookingReference,
    guest: b.userId ? { id: b.userId._id, name: b.userId.name, email: b.userId.email } : null,
    room: b.roomId
      ? { id: b.roomId._id, name: b.roomId.name, roomNumber: b.roomId.roomNumber }
      : null,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: b.nights,
    guestCount: b.guestCount,
    pricePerNight: b.pricePerNight,
    totalPrice: b.totalPrice,
    bookingStatus: b.bookingStatus,
    paymentStatus: b.paymentStatus,
    holdExpiresAt: b.holdExpiresAt,
    confirmedAt: b.confirmedAt,
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
    checkedInAt: b.checkedInAt,
    checkedOutAt: b.checkedOutAt,
    createdAt: b.createdAt,
  };
}

export const populateBooking = (query) =>
  query.populate("userId", "name email").populate("roomId", "name roomNumber");

export async function listReservations({ q, status, from, to, page = 1, limit = 10 }) {
  const filter = {};

  if (BOOKING_STATUSES.includes(status)) filter.bookingStatus = status;

  if (from) filter.checkOut = { $gt: parseDateOnly(from, "From") };
  if (to) filter.checkIn = { $lte: parseDateOnly(to, "To") };

  if (typeof q === "string" && q.trim()) {
    const safe = q.trim().slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ],
    }).select("_id").limit(100);

    filter.$or = [
      { bookingReference: { $regex: safe, $options: "i" } },
      { userId: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

  const [rows, total] = await Promise.all([
    populateBooking(
      Booking.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum)
    ),
    Booking.countDocuments(filter),
  ]);

  return {
    reservations: rows.map(toAdminBooking),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function getReservation(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");
  const booking = await populateBooking(Booking.findById(id));
  if (!booking) throw httpError(404, "Booking not found");
  return toAdminBooking(booking);
}

export async function confirmReservation(id, adminId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");

  const updated = await populateBooking(
    Booking.findOneAndUpdate(
      { _id: id, bookingStatus: "pending", holdExpiresAt: { $gt: new Date() } },
      {
        $set: { bookingStatus: "confirmed", confirmedAt: new Date(), confirmedBy: adminId },
        $unset: { holdExpiresAt: "" }, 
      },
      { new: true }
    )
  );
  if (updated) return toAdminBooking(updated);

  const existing = await Booking.findById(id).select("bookingStatus holdExpiresAt");
  if (!existing) throw httpError(404, "Booking not found");
  if (existing.bookingStatus === "pending") {
    throw httpError(409, "This hold has expired, so the room may have been rebooked. Ask the guest to book again.");
  }
  throw httpError(409, `This booking is ${existing.bookingStatus.replace("_", " ")} and can't be confirmed.`);
}

export async function cancelReservation(id, adminId, reason) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");

  let cleanReason;
  if (reason !== undefined && reason !== null && reason !== "") {
    if (typeof reason !== "string") throw httpError(400, "Reason must be text");
    cleanReason = reason.trim().slice(0, 200);
  }

  const updated = await populateBooking(
    Booking.findOneAndUpdate(
      { _id: id, bookingStatus: { $in: ["pending", "confirmed"] } },
      {
        $set: {
          bookingStatus: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: adminId,
          ...(cleanReason ? { cancelReason: cleanReason } : {}),
        },
        $unset: { holdExpiresAt: "" },
      },
      { new: true }
    )
  );
  if (updated) return toAdminBooking(updated);

  const existing = await Booking.findById(id).select("bookingStatus");
  if (!existing) throw httpError(404, "Booking not found");
  throw httpError(409, `This booking is ${existing.bookingStatus.replace("_", " ")} and can't be cancelled here.`);
}
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { DAY_MS, hotelToday } from "../utils/dateUtils.js";

export async function getDashboard() {
  const today = hotelToday();
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const afterWeek = new Date(today.getTime() + 8 * DAY_MS); // exclusive end: days 1 to 7
  const now = new Date();

  // A pending booking counts only while its hold is still running
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
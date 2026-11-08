import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { createBooking } from "../services/bookingService.js";

await connectDB();

try {
  const room = await Room.findOne({ active: true });
  const user = await User.findOne({ role: "guest" });
  if (!room || !user)
    throw new Error("Need at least one active room and one guest user");

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 60);
  const checkIn = start.toISOString().slice(0, 10);
  start.setUTCDate(start.getUTCDate() + 2);
  const checkOut = start.toISOString().slice(0, 10);

  const ATTEMPTS = 5;
  const results = await Promise.allSettled(
    Array.from({ length: ATTEMPTS }, () =>
      createBooking(user._id, {
        roomId: room._id.toString(),
        checkIn,
        checkOut,
        guestCount: 1,
      }),
    ),
  );

  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  console.log(`Room ${room.roomNumber}, ${checkIn} to ${checkOut}`);

  console.log(`Succeeded: ${ok.length} (expected 1)`);
  console.log(`Rejected:  ${failed.length} (expected ${ATTEMPTS - 1})`);
  failed.forEach((r) => console.log("  -", r.reason.status, r.reason.message));

  // Clean up the test bookings
  await Booking.deleteMany({ _id: { $in: ok.map((r) => r.value._id) } });
} catch (err) {
  console.error("Test failed:", err.message);
} finally {
  await mongoose.disconnect();
}

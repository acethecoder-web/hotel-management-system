import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import Room from "../../models/Room.js";
import Booking from "../../models/Booking.js";
import AuditLog from "../../models/AuditLog.js";
import { hotelToday, DAY_MS } from "../../utils/dateUtils.js";

export const PASSWORD = "Secret#123";

export async function connectTestDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  const name = mongoose.connection.name;
  // Safety net: tests delete data, so they may only touch a database named *_test
  if (!name.endsWith("_test")) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run tests against "${name}". The database name must end with _test.`);
  }
  await Promise.all([User.init(), Room.init(), Booking.init()]); // make sure the unique indexes exist
}

export const disconnectTestDb = () => mongoose.disconnect();

export async function resetDb() {
  await Promise.all([
    User.deleteMany({}), Room.deleteMany({}), Booking.deleteMany({}), AuditLog.deleteMany({}),
  ]);
}

// "YYYY-MM-DD" for hotel-today plus n days
export function dayOffset(n) {
  return new Date(hotelToday().getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

const unique = () => Math.random().toString(36).slice(2, 8);

export async function makeUser(overrides = {}) {
  return User.create({
    name: "Test User",
    email: `user-${unique()}@test.com`,
    passwordHash: await bcrypt.hash(PASSWORD, 4), // low cost: tests should be fast
    ...overrides,
  });
}

export function makeRoom(overrides = {}) {
  return Room.create({
    roomNumber: unique(),
    name: "Test Room",
    type: "single",
    description: "A room used by automated tests.",
    pricePerNight: 100,
    capacity: 2,
    ...overrides,
  });
}

// Inserts a booking directly, bypassing the service (for setting up states)
export function makeBooking(userId, roomId, overrides = {}) {
  return Booking.create({
    userId, roomId,
    checkIn: new Date(`${dayOffset(10)}T00:00:00Z`),
    checkOut: new Date(`${dayOffset(12)}T00:00:00Z`),
    guestCount: 1, nights: 2, pricePerNight: 100, totalPrice: 200,
    bookingStatus: "confirmed",
    ...overrides,
  });
}
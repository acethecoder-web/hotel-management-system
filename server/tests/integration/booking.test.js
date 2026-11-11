import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Booking from "../../models/Booking.js";
import Room from "../../models/Room.js";
import { createBooking, cancelBooking, searchAvailableRooms } from "../../services/bookingService.js";
import { connectTestDb, disconnectTestDb, resetDb, makeUser, makeRoom, dayOffset } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

let user, room;
beforeEach(async () => {
  await resetDb();
  user = await makeUser();
  room = await makeRoom();
});

const book = (checkIn, checkOut, extra = {}) =>
  createBooking(user._id, { roomId: room._id.toString(), checkIn, checkOut, guestCount: 1, ...extra });

const rejectsWith = (promise, status) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.status, status, err.message);
    return true;
  });

test("rejects stays that overlap an existing booking", async () => {
  await book(dayOffset(10), dayOffset(13));
  const clashes = [[10, 13], [11, 12], [8, 11], [12, 15], [8, 15]]; // same, inside, left edge, right edge, surrounding
  for (const [a, b] of clashes) {
    await rejectsWith(book(dayOffset(a), dayOffset(b)), 409);
  }
});

test("allows back-to-back stays (check-out day equals the next check-in day)", async () => {
  await book(dayOffset(10), dayOffset(13));
  await book(dayOffset(13), dayOffset(15));
  await book(dayOffset(8), dayOffset(10));
  assert.equal(await Booking.countDocuments(), 3);
});

test("calculates the total on the server and keeps a price snapshot", async () => {
  await Room.updateOne({ _id: room._id }, { pricePerNight: 99.99 });
  const booking = await book(dayOffset(10), dayOffset(13));
  assert.equal(booking.nights, 3);
  assert.equal(booking.pricePerNight, 99.99);
  assert.equal(booking.totalPrice, 299.97);

  await Room.updateOne({ _id: room._id }, { pricePerNight: 500 }); // a later price change...
  const stored = await Booking.findById(booking._id);
  assert.equal(stored.totalPrice, 299.97);                          // ...doesn't rewrite history
});

test("rejects invalid dates and stay lengths", async () => {
  await rejectsWith(book(dayOffset(-1), dayOffset(2)), 400);   // check-in in the past
  await rejectsWith(book(dayOffset(10), dayOffset(10)), 400);  // zero nights
  await rejectsWith(book(dayOffset(12), dayOffset(10)), 400);  // backwards
  await rejectsWith(book(dayOffset(10), dayOffset(41)), 400);  // 31 nights
  await rejectsWith(book("2026-02-31", "2026-03-02"), 400);    // a date that doesn't exist
  await rejectsWith(book("12/10/2026", "12/12/2026"), 400);    // wrong format
});

test("rejects bad guest counts, including more than the room holds", async () => {
  for (const guestCount of [0, 3, 6, 2.5, "abc", true, null]) {
    await rejectsWith(book(dayOffset(10), dayOffset(12), { guestCount }), 400);
  }
});

test("expired holds and cancelled bookings no longer block the room", async () => {
  const first = await book(dayOffset(10), dayOffset(13));
  await Booking.updateOne({ _id: first._id }, { holdExpiresAt: new Date(Date.now() - 60_000) });

  const second = await book(dayOffset(10), dayOffset(13)); // allowed: the first hold ran out
  await cancelBooking(user._id, second._id.toString());

  await book(dayOffset(10), dayOffset(13));                // allowed again: the second was cancelled
  assert.equal(await Booking.countDocuments({ bookingStatus: "pending", holdExpiresAt: { $gt: new Date() } }), 1);
});

test("a guest can't cancel someone else's booking, and can't cancel too late", async () => {
  const other = await makeUser();
  const mine = await book(dayOffset(10), dayOffset(12));
  await rejectsWith(cancelBooking(other._id, mine._id.toString()), 404);

  const imminent = await book(dayOffset(0), dayOffset(2)); // starts today
  await rejectsWith(cancelBooking(user._id, imminent._id.toString()), 400);
});

test("availability search hides booked rooms and rooms that are too small", async () => {
  await makeRoom({ capacity: 1 });
  await book(dayOffset(10), dayOffset(13));

  const during = await searchAvailableRooms({ checkIn: dayOffset(11), checkOut: dayOffset(12), guests: 2 });
  assert.equal(during.rooms.length, 0);

  const after13 = await searchAvailableRooms({ checkIn: dayOffset(13), checkOut: dayOffset(14), guests: 2 });
  assert.deepEqual(after13.rooms.map((r) => String(r._id)), [String(room._id)]);
});

test("only one of many simultaneous bookings for the same room succeeds", { timeout: 60_000 }, async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 6 }, () => book(dayOffset(20), dayOffset(22)))
  );
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");

  assert.equal(ok.length, 1);
  assert.equal(failed.length, 5);
  failed.forEach((r) => assert.equal(r.reason.status, 409));
  assert.equal(await Booking.countDocuments({ roomId: room._id }), 1);
});
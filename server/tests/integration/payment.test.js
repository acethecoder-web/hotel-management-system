import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Booking from "../../models/Booking.js";
import Payment from "../../models/Payment.js";
import { recordCashPayment, recordCashRefund } from "../../services/paymentService.js";
import { cancelBooking } from "../../services/bookingService.js";
import { cancelReservation } from "../../services/adminService.js";
import { connectTestDb, disconnectTestDb, resetDb, makeUser, makeRoom, makeBooking } from "./helpers.js";

before(connectTestDb);
after(disconnectTestDb);

let admin, guest, room;
beforeEach(async () => {
  await resetDb();
  admin = await makeUser({ role: "admin" });
  guest = await makeUser();
  room = await makeRoom();
});

const rejectsWith = (promise, status) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.status, status, err.message);
    return true;
  });

test("cash payment takes the full amount from the booking", async () => {
  const booking = await makeBooking(guest._id, room._id, { totalPrice: 250 });
  const { booking: paid, payment } = await recordCashPayment(String(booking._id), admin._id, "at desk");
  assert.equal(payment.amount, 250);
  assert.equal(payment.kind, "payment");
  assert.equal(paid.paymentStatus, "paid");
  assert.equal(paid.paymentMethod, "cash");
});

test("only one of many simultaneous cash payments is recorded", { timeout: 60_000 }, async () => {
  const booking = await makeBooking(guest._id, room._id);
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => recordCashPayment(String(booking._id), admin._id))
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  results.filter((r) => r.status === "rejected").forEach((r) => assert.equal(r.reason.status, 409));
  assert.equal(await Payment.countDocuments({ bookingId: booking._id }), 1);
});

test("pending and cancelled bookings can't take a payment", async () => {
  const pending = await makeBooking(guest._id, room._id, { bookingStatus: "pending" });
  const cancelled = await makeBooking(guest._id, room._id, { bookingStatus: "cancelled" });
  await rejectsWith(recordCashPayment(String(pending._id), admin._id), 409);
  await rejectsWith(recordCashPayment(String(cancelled._id), admin._id), 409);
});

test("a guest can't cancel a paid booking, staff can, and the refund is recorded once", async () => {
  const booking = await makeBooking(guest._id, room._id);
  await recordCashPayment(String(booking._id), admin._id);

  await rejectsWith(cancelBooking(guest._id, String(booking._id)), 400);   // guest: contact the hotel
  await rejectsWith(recordCashRefund(String(booking._id), admin._id), 409); // not cancelled yet

  await cancelReservation(String(booking._id), admin._id, "guest called");
  assert.equal((await Booking.findById(booking._id)).paymentStatus, "paid"); // refund still due

  const { booking: refunded, payment } = await recordCashRefund(String(booking._id), admin._id);
  assert.equal(refunded.paymentStatus, "refunded");
  assert.equal(payment.kind, "refund");
  assert.equal(payment.amount, 200);

  await rejectsWith(recordCashRefund(String(booking._id), admin._id), 409); // only once
  assert.equal(await Payment.countDocuments({ bookingId: booking._id }), 2);
});
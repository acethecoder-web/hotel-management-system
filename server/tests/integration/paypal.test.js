import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Booking from "../../models/Booking.js";
import Payment from "../../models/Payment.js";
import { createPaypalOrder, capturePaypalOrder, refundPaypalBooking } from "../../services/paypalService.js";
import { cancelReservation } from "../../services/adminService.js";
import { connectTestDb, disconnectTestDb, resetDb, makeUser, makeRoom, makeBooking } from "./helpers.js";

const realFetch = globalThis.fetch;

// A tiny pretend PayPal. captureValue lets a test simulate a wrong amount being captured.
function fakePayPal({ captureValue } = {}) {
  const orders = new Map();
  const refunds = [];
  const reply = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const view = (o) => {
    const amount = { currency_code: o.unit.amount.currency_code, value: captureValue ?? o.unit.amount.value };
    return {
      id: o.id, status: "COMPLETED",
      purchase_units: [{ custom_id: o.unit.custom_id, amount,
        payments: { captures: [{ id: `CAP${o.id}`, status: "COMPLETED", amount }] } }],
    };
  };

  globalThis.fetch = async (url, options = {}) => {
    const u = String(url);
    if (u.endsWith("/v1/oauth2/token")) return reply(200, { access_token: "t", expires_in: 3600 });
    if (u.endsWith("/v2/checkout/orders")) {
      const id = `ORDER${String(orders.size + 1).padStart(8, "0")}`;
      orders.set(id, { id, unit: JSON.parse(options.body).purchase_units[0], captured: false });
      return reply(201, { id, status: "CREATED" });
    }
    let m = u.match(/\/v2\/checkout\/orders\/(\w+)\/capture$/);
    if (m) {
      const order = orders.get(m[1]);
      if (order.captured) return reply(422, { details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
      order.captured = true;
      return reply(201, view(order));
    }
    m = u.match(/\/v2\/checkout\/orders\/(\w+)$/);
    if (m) return reply(200, view(orders.get(m[1])));
    if (/\/v2\/payments\/captures\/\w+\/refund$/.test(u)) {
      refunds.push(u);
      return reply(201, { id: `REFUND${refunds.length}`, status: "COMPLETED" });
    }
    throw new Error(`Unexpected fetch in test: ${u}`);
  };
  return { refunds };
}

before(connectTestDb);
after(disconnectTestDb);
afterEach(() => { globalThis.fetch = realFetch; });

let guest, admin, room;
beforeEach(async () => {
  await resetDb();
  guest = await makeUser();
  admin = await makeUser({ role: "admin" });
  room = await makeRoom();
});

const pendingBooking = (extra = {}) =>
  makeBooking(guest._id, room._id, {
    bookingStatus: "pending", holdExpiresAt: new Date(Date.now() + 3_600_000), ...extra,
  });

const rejectsWith = (promise, status) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.status, status, err.message);
    return true;
  });

test("a verified PayPal payment confirms and pays the booking", async () => {
  const fake = fakePayPal();
  const booking = await pendingBooking();
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));
  const result = await capturePaypalOrder(guest._id, orderId);

  assert.equal(result.result, "paid");
  const stored = await Booking.findById(booking._id);
  assert.equal(stored.bookingStatus, "confirmed");
  assert.equal(stored.paymentStatus, "paid");
  assert.equal(stored.paymentMethod, "paypal");
  assert.equal(stored.holdExpiresAt, undefined);
  assert.equal(await Payment.countDocuments({ bookingId: booking._id, status: "completed" }), 1);
  assert.equal(fake.refunds.length, 0);
});

test("creating an order extends a short hold", async () => {
  fakePayPal();
  const booking = await pendingBooking({ holdExpiresAt: new Date(Date.now() + 60_000) });
  await createPaypalOrder(guest._id, String(booking._id));
  const stored = await Booking.findById(booking._id);
  assert.ok(stored.holdExpiresAt.getTime() > Date.now() + 20 * 60_000);
});

test("a wrong captured amount is refunded automatically and the booking is not paid", async () => {
  const fake = fakePayPal({ captureValue: "1.00" });
  const booking = await pendingBooking();
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));
  const result = await capturePaypalOrder(guest._id, orderId);

  assert.equal(result.result, "refunded");
  assert.equal(fake.refunds.length, 1);
  const stored = await Booking.findById(booking._id);
  assert.equal(stored.paymentStatus, "unpaid");
  assert.equal(stored.bookingStatus, "pending");
  assert.equal((await Payment.findOne({ bookingId: booking._id })).status, "voided");
});

test("duplicate captures record the payment only once", { timeout: 60_000 }, async () => {
  const fake = fakePayPal();
  const booking = await pendingBooking();
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));

  const results = await Promise.all([
    capturePaypalOrder(guest._id, orderId),
    capturePaypalOrder(guest._id, orderId),
  ]);
  results.forEach((r) => assert.equal(r.result, "paid"));
  assert.equal(await Payment.countDocuments({ bookingId: booking._id, status: "completed" }), 1);
  assert.equal(fake.refunds.length, 0);
});

test("paying after the hold expired and the room was rebooked refunds automatically", async () => {
  const fake = fakePayPal();
  const booking = await pendingBooking();
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));

  await Booking.updateOne({ _id: booking._id }, { holdExpiresAt: new Date(Date.now() - 60_000) });
  const other = await makeUser();
  await makeBooking(other._id, room._id, { bookingStatus: "confirmed" }); // same dates

  const result = await capturePaypalOrder(guest._id, orderId);
  assert.equal(result.result, "refunded");
  assert.match(result.reason, /no longer available/);
  assert.equal(fake.refunds.length, 1);
  assert.equal((await Booking.findById(booking._id)).paymentStatus, "unpaid");
});

test("an order can't be captured by a different guest", async () => {
  fakePayPal();
  const booking = await pendingBooking();
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));
  const intruder = await makeUser();
  await rejectsWith(capturePaypalOrder(intruder._id, orderId), 404);
});

test("staff cancelling a paid PayPal booking can refund it through PayPal, once", async () => {
  const fake = fakePayPal();
  const booking = await makeBooking(guest._id, room._id, { bookingStatus: "confirmed" });
  const { orderId } = await createPaypalOrder(guest._id, String(booking._id));
  await capturePaypalOrder(guest._id, orderId);

  await cancelReservation(String(booking._id), admin._id, "guest called");
  const { booking: refunded } = await refundPaypalBooking(String(booking._id), admin._id);

  assert.equal(refunded.paymentStatus, "refunded");
  assert.equal(fake.refunds.length, 1);
  await rejectsWith(refundPaypalBooking(String(booking._id), admin._id), 409);
});
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import { httpError } from "../utils/httpError.js";
import { hotelToday } from "../utils/dateUtils.js";
import { paypalRequest } from "./paypalClient.js";
import { blockingFilter } from "./bookingService.js";
import { currency, recordCashRefund } from "./paymentService.js";
import { toAdminBooking, populateBooking } from "./adminService.js";

const ORDER_HOLD_MINUTES = 30;
const ORDER_ID = /^[A-Z0-9]{10,30}$/i; 

const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
const loadBooking = async (id) => toAdminBooking(await populateBooking(Booking.findById(id)));


export async function createPaypalOrder(userId, bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) throw httpError(400, "Invalid booking id");

  const now = new Date();
  const holdUntil = new Date(now.getTime() + ORDER_HOLD_MINUTES * 60_000);

  let booking = await Booking.findOneAndUpdate(
    { _id: bookingId, userId, paymentStatus: "unpaid", bookingStatus: "pending", holdExpiresAt: { $gt: now } },
    { $max: { holdExpiresAt: holdUntil } },
    { returnDocument: "after" }
  );
  if (!booking) {
    booking = await Booking.findOne({ _id: bookingId, userId, paymentStatus: "unpaid", bookingStatus: "confirmed" });
  }
  if (!booking) {
    const existing = await Booking.findOne({ _id: bookingId, userId }).select("bookingStatus paymentStatus");
    if (!existing) throw httpError(404, "Booking not found");
    if (existing.paymentStatus === "paid") throw httpError(409, "This booking has already been paid.");
    if (["expired", "pending"].includes(existing.bookingStatus)) {
      throw httpError(409, "This reservation has expired. Please book the room again.");
    }
    throw httpError(409, `This booking is ${existing.bookingStatus.replace("_", " ")} and can't be paid.`);
  }

  let order;
  try {
    order = await paypalRequest("/v2/checkout/orders", {
      method: "POST",
      requestId: randomUUID(),
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: booking.bookingReference,
            custom_id: String(booking._id), // comes back on capture, so we can verify the booking
            description: `Hotel booking ${booking.bookingReference}`,
            amount: { currency_code: currency(), value: money(booking.totalPrice) },
          },
        ],
      },
    });
  } catch (error) {
    console.error("paypal create order failed:", error.message);
    throw httpError(502, "Could not start the PayPal payment. Please try again.");
  }

  await Payment.create({
    bookingId: booking._id, kind: "payment", method: "paypal", status: "pending",
    amount: booking.totalPrice, currency: currency(), paypalOrderId: order.id,
  });

  return { orderId: order.id };
}


async function refundCapture(captureId) {
  try {
    const refund = await paypalRequest(`/v2/payments/captures/${captureId}/refund`, {
      method: "POST", requestId: `refund-${captureId}`, body: {},
    });
    return refund.id;
  } catch (error) {
    if (error.issue === "CAPTURE_FULLY_REFUNDED") return null; // already done: the goal is met
    throw error;
  }
}


function settle(record, capture, customId) {
  return mongoose.connection.transaction(async (session) => {
    // Claim the Payment row. A simultaneous duplicate collides here, retries, and sees "not pending".
    const claimed = await Payment.findOneAndUpdate(
      { _id: record._id, status: "pending" },
      { $set: { paypalCaptureId: capture.id } },
      { returnDocument: "after", session }
    );
    if (!claimed) return { outcome: "already" };

    const booking = await Booking.findById(record.bookingId).session(session);
    if (!booking) return { outcome: "refund", reason: "The booking could not be found." };

    // Room write first, as when creating a booking: it matters if we revive an expired hold
    await Room.updateOne({ _id: booking.roomId }, { $inc: { reservationSeq: 1 } }, { session });

    const amountOk =
      customId === String(booking._id) &&
      capture.amount?.currency_code === record.currency &&
      capture.amount?.value === money(record.amount) &&
      money(booking.totalPrice) === money(record.amount);
    if (!amountOk) return { outcome: "refund", reason: "The amount paid did not match the booking total." };

    if (booking.paymentStatus !== "unpaid") {
      return { outcome: "refund", reason: "This booking was already paid another way." };
    }

    const now = new Date();
    if (["pending", "expired"].includes(booking.bookingStatus)) {
      const holdIsLive = booking.bookingStatus === "pending" && booking.holdExpiresAt > now;
      if (!holdIsLive) {
        if (booking.checkOut <= hotelToday()) {
          return { outcome: "refund", reason: "The stay dates have already passed." };
        }
        const clash = await Booking.exists({
          _id: { $ne: booking._id },
          roomId: booking.roomId,
          ...blockingFilter(booking.checkIn, booking.checkOut, now),
        }).session(session);
        if (clash) {
          return { outcome: "refund", reason: "The room was no longer available because the reservation hold had expired." };
        }
      }
    } else if (booking.bookingStatus !== "confirmed") {
      return { outcome: "refund", reason: `The booking was ${booking.bookingStatus.replace("_", " ")} when the payment arrived.` };
    }

    await Booking.updateOne(
      { _id: booking._id },
      {
        $set: { paymentStatus: "paid", paymentMethod: "paypal", bookingStatus: "confirmed", confirmedAt: now },
        $unset: { holdExpiresAt: "" },
      },
      { session }
    );
    await Payment.updateOne({ _id: record._id }, { $set: { status: "completed" } }, { session });
    return { outcome: "paid" };
  });
}


export async function capturePaypalOrder(userId, orderId) {
  if (typeof orderId !== "string" || !ORDER_ID.test(orderId)) throw httpError(400, "Invalid order id");

  const record = await Payment.findOne({ paypalOrderId: orderId, kind: "payment", method: "paypal" });
  const owned = record && (await Booking.exists({ _id: record.bookingId, userId }));
  if (!record || !owned) throw httpError(404, "Payment not found"); // someone else's order looks like a missing one

  const summary = async (result, reason, alreadyProcessed = false) => {
    const b = await Booking.findById(record.bookingId).select("bookingReference bookingStatus paymentStatus");
    return {
      result, reason, alreadyProcessed,
      bookingReference: b.bookingReference, bookingStatus: b.bookingStatus, paymentStatus: b.paymentStatus,
      message: result === "paid"
        ? "Payment received. Your booking is confirmed."
        : `Your payment was returned to PayPal automatically. ${reason}`,
    };
  };

  if (record.status === "completed") return summary("paid", undefined, true);
  if (record.status === "voided") return summary("refunded", record.note, true);
  if (record.status === "failed") throw httpError(409, "This payment attempt did not go through. Please start again.");
  if (record.status === "action_needed") {
    throw httpError(409, "This payment needs the hotel's attention. Please contact the hotel with your booking reference.");
  }

  let order;
  try {
    order = await paypalRequest(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST", requestId: `capture-${orderId}`,
    });
  } catch (error) {
    try {
      order = await paypalRequest(`/v2/checkout/orders/${orderId}`);
    } catch {
      throw httpError(502, "Could not confirm the payment with PayPal. You have not been charged. Please try again.");
    }
    if (order.status !== "COMPLETED") {
      await Payment.updateOne({ _id: record._id, status: "pending" }, { $set: { status: "failed", note: (error.issue || "capture failed").slice(0, 200) } });
      throw httpError(402, "Your payment was not completed. You have not been charged. Please try again.");
    }
  }

  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  if (!capture || capture.status !== "COMPLETED") {
    throw httpError(409, "PayPal is still reviewing your payment. The hotel will confirm your booking once it clears.");
  }

  let decision;
  try {
    decision = await settle(record, capture, unit.custom_id);
  } catch (error) {
    if (error.code !== 11000) throw error; 
    await Payment.updateOne({ _id: record._id, status: "pending" }, { $set: { paypalCaptureId: capture.id } });
    decision = { outcome: "refund", reason: "This booking was paid at the same moment." };
  }

  if (decision.outcome === "already") {
    const fresh = await Payment.findById(record._id);
    return summary(fresh.status === "completed" ? "paid" : "refunded", fresh.note, true);
  }

  if (decision.outcome === "paid") return summary("paid");

  try {
    const refundId = await refundCapture(capture.id);
    const update = { status: "voided", note: decision.reason.slice(0, 200) };
    if (refundId) update.paypalRefundId = refundId;
    await Payment.updateOne({ _id: record._id }, { $set: update });
  } catch (error) {
    console.error("paypal auto-refund failed:", error.message);
    await Payment.updateOne(
      { _id: record._id },
      { $set: { status: "action_needed", note: `Auto-refund failed. ${decision.reason}`.slice(0, 200) } }
    );
    const failure = httpError(
      502,
      "Your payment was received but could not be returned automatically. Please contact the hotel and quote your booking reference."
    );
    failure.refundFailed = true;
    throw failure;
  }
  return summary("refunded", decision.reason);
}


export async function refundPaypalBooking(id, adminId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");

  const booking = await Booking.findOne({
    _id: id, bookingStatus: "cancelled", paymentStatus: "paid", paymentMethod: "paypal",
  });
  if (!booking) {
    if (!(await Booking.exists({ _id: id }))) throw httpError(404, "Booking not found");
    throw httpError(409, "This booking has no PayPal payment waiting for a refund.");
  }

  const original = await Payment.findOne({ bookingId: id, kind: "payment", method: "paypal", status: "completed" });
  if (!original?.paypalCaptureId) throw httpError(409, "No completed PayPal payment was found for this booking.");

  let refundId;
  try {
    refundId = await refundCapture(original.paypalCaptureId);
  } catch (error) {
    console.error("paypal refund failed:", error.message);
    throw httpError(502, "PayPal could not process the refund. Please try again, or refund it in the PayPal dashboard.");
  }

  try {
    const payment = await mongoose.connection.transaction(async (session) => {
      const updated = await Booking.findOneAndUpdate(
        { _id: id, paymentStatus: "paid" },
        { $set: { paymentStatus: "refunded" } },
        { returnDocument: "after", session }
      );
      if (!updated) throw httpError(409, "This booking was already refunded.");

      const [created] = await Payment.create(
        [{
          bookingId: id, kind: "refund", method: "paypal", status: "completed",
          amount: original.amount, currency: original.currency, recordedBy: adminId,
          ...(refundId ? { paypalRefundId: refundId } : {}),
        }],
        { session }
      );
      return created;
    });
    return { booking: await loadBooking(id), payment };
  } catch (error) {
    if (error.code === 11000) throw httpError(409, "This booking was already refunded.");
    throw error;
  }
}

export async function refundBooking(id, adminId, note) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");
  const booking = await Booking.findById(id).select("paymentMethod");
  if (!booking) throw httpError(404, "Booking not found");
  return booking.paymentMethod === "paypal"
    ? refundPaypalBooking(id, adminId)
    : recordCashRefund(id, adminId, note);
}
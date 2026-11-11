import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import { httpError } from "../utils/httpError.js";
import { toAdminBooking, populateBooking } from "./adminService.js";

export const currency = () => process.env.HOTEL_CURRENCY || "PHP";

const label = (status) => status.replace("_", " ");
const PAYABLE = ["confirmed", "checked_in", "checked_out"];

function cleanNote(note) {
  if (note === undefined || note === null || note === "") return undefined;
  if (typeof note !== "string") throw httpError(400, "Note must be text");
  return note.trim().slice(0, 200) || undefined;
}

const loadBooking = async (id) => toAdminBooking(await populateBooking(Booking.findById(id)));

export const toPayment = (p) => ({
  id: p._id,
  kind: p.kind,
  method: p.method,
  status: p.status,
  amount: p.amount,
  currency: p.currency,
  note: p.note,
  recordedBy: p.recordedBy?.name ? { name: p.recordedBy.name } : null,
  createdAt: p.createdAt,
});

export async function listPayments(bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) throw httpError(400, "Invalid booking id");
  const rows = await Payment.find({ bookingId }).sort({ createdAt: 1 }).populate("recordedBy", "name");
  return rows.map(toPayment);
}

export async function recordCashPayment(id, adminId, note) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");
  const text = cleanNote(note);

  try {
    // The callback can run more than once (automatic retry), so it touches only the database
    const payment = await mongoose.connection.transaction(async (session) => {
      // The conditions live inside the write, so two clicks can't both succeed
      const booking = await Booking.findOneAndUpdate(
        { _id: id, paymentStatus: "unpaid", bookingStatus: { $in: PAYABLE } },
        { $set: { paymentStatus: "paid", paymentMethod: "cash" } },
        { returnDocument: "after", session }
      );

      if (!booking) {
        const existing = await Booking.findById(id).session(session).select("bookingStatus paymentStatus");
        if (!existing) throw httpError(404, "Booking not found");
        if (existing.paymentStatus === "paid") throw httpError(409, "This booking has already been paid.");
        if (existing.paymentStatus === "refunded") throw httpError(409, "This booking's payment was refunded.");
        if (existing.bookingStatus === "pending") throw httpError(409, "Confirm this booking before taking payment.");
        throw httpError(409, `This booking is ${label(existing.bookingStatus)} and can't take a payment.`);
      }

      // The amount comes from the booking in the database. Nothing from the client.
      const [created] = await Payment.create(
        [{
          bookingId: booking._id, kind: "payment", method: "cash", status: "completed",
          amount: booking.totalPrice, currency: currency(), note: text, recordedBy: adminId,
        }],
        { session }
      );
      return created;
    });

    return { booking: await loadBooking(id), payment: payment };
  } catch (error) {
    // The unique index fired: someone recorded it a moment ago
    if (error.code === 11000) throw httpError(409, "This booking has already been paid.");
    throw error;
  }
}

export async function recordCashRefund(id, adminId, note) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid booking id");
  const text = cleanNote(note);

  try {
    const refund = await mongoose.connection.transaction(async (session) => {
      const booking = await Booking.findOneAndUpdate(
        { _id: id, bookingStatus: "cancelled", paymentStatus: "paid", paymentMethod: "cash" },
        { $set: { paymentStatus: "refunded" } },
        { returnDocument: "after", session }
      );

      if (!booking) {
        const existing = await Booking.findById(id).session(session)
          .select("bookingStatus paymentStatus paymentMethod");
        if (!existing) throw httpError(404, "Booking not found");
        if (existing.paymentStatus === "refunded") throw httpError(409, "This booking was already refunded.");
        if (existing.paymentStatus !== "paid") throw httpError(409, "This booking has no payment to refund.");
        if (existing.bookingStatus !== "cancelled") throw httpError(409, "Cancel the booking before recording a refund.");
        throw httpError(409, `This payment was made by ${existing.paymentMethod} and can't be refunded as cash.`);
      }

      const original = await Payment.findOne({ bookingId: id, kind: "payment", status: "completed" })
        .session(session);
      if (!original) throw httpError(409, "No completed payment was found for this booking.");

      const [created] = await Payment.create(
        [{
          bookingId: id, kind: "refund", method: "cash", status: "completed",
          amount: original.amount, currency: original.currency, note: text, recordedBy: adminId,
        }],
        { session }
      );
      return created;
    });

    return { booking: await loadBooking(id), payment: refund };
  } catch (error) {
    if (error.code === 11000) throw httpError(409, "This booking was already refunded.");
    throw error;
  }
}
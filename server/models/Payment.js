import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    kind: { type: String, enum: ["payment", "refund"], required: true },
    method: { type: String, enum: ["cash", "paypal"], required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "voided", "action_needed"],
      default: "pending",
    },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true },
    note: { type: String, maxlength: 200 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    paypalOrderId: String,
    paypalCaptureId: String,
    paypalRefundId: String,
  },
  { timestamps: true }
);

paymentSchema.index(
  { bookingId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { status: "completed" } }
);
paymentSchema.index(
  { paypalOrderId: 1 },
  { unique: true, partialFilterExpression: { paypalOrderId: { $type: "string" } } }
);
paymentSchema.index(
  { paypalCaptureId: 1 },
  { unique: true, partialFilterExpression: { paypalCaptureId: { $type: "string" } } }
);

export default mongoose.model("Payment", paymentSchema);
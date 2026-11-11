import mongoose from "mongoose";
import { generateBookingReference } from "../utils/bookingReference.js";

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      default: generateBookingReference,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    checkIn: { type: Date, required: true },
    checkOut: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.checkIn;
        },
        message: "Check-out must be after check-in",
      },
    },
    guestCount: {
      type: Number,
      required: true,
      min: [1, "At least 1 guest"],
      validate: {
        validator: Number.isInteger,
        message: "Guest count must be a whole number",
      },
    },

    nights: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },

    bookingStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentMethod: { type: String, enum: ["cash", "paypal"] }, 
    holdExpiresAt: Date,
    checkedInAt: Date,
    checkedOutAt: Date,
    cancelledAt: Date,
    cancelReason: { type: String, maxlength: 200 },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        originalCheckIn: Date,                       
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkedOutBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    checkInWarnings: { type: [String], default: [] }, 
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);

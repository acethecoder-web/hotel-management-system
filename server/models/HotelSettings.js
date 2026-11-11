import mongoose from "mongoose";

const timeField = (fallback) => ({
  type: String,
  default: fallback,
  match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM format"],
});

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true }, // one document only
    hotelName: { type: String, default: "Harbor Hotel" },
    address: { type: String, default: "" },
    contact: { phone: { type: String, default: "" }, email: { type: String, default: "" } },
    checkInTime: timeField("14:00"),
    checkOutTime: timeField("12:00"),
    cancellationPolicy: { type: String, default: "Free cancellation until the day before check-in." },
  },
  { timestamps: true }
);

export default mongoose.model("HotelSettings", settingsSchema);
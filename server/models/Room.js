import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Room type is required"],
      enum: ["single", "deluxe", "family"]
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0.01, "Price must be greater than 0"],
      max: [2500, "Price cannot exceed 2500"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [5, "Capacity cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number",
      },
    },
    amenities: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    operationalStatus: {
      type: String,
      enum: ["available", "cleaning", "maintenance", "occupied"],
      default: "available",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
export default Room;
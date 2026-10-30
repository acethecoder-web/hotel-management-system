import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Room from "../models/Room.js";

await connectDB();

try {
  const room = await Room.create({
    roomNumber: "102",
    name: "Test Single",
    type: "single",
    description: "A cozy test room",
    pricePerNight: -80,
    capacity: 0,
  });
  console.log("Created:", room.roomNumber);
} catch (err) {
  if (err.name === "ValidationError") {
    console.log("Validation failed:", Object.keys(err.errors));
  } else if (err.code === 11000) {
    console.log("Duplicate key error:", err.keyValue);
  } else {
    console.log("Unexpected error:", err);
  }
}

await mongoose.disconnect();
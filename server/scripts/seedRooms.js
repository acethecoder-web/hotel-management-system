import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Room from "../models/Room.js";

// Replace YOUR_CLOUD_NAME, version numbers, and file names with your real values
const CLOUD = "https://res.cloudinary.com/dm2eo9umm/image/upload";

const rooms = [
  {
    roomNumber: "101",
    name: "Garden Single",
    type: "single",
    description: "A quiet single room overlooking the garden.",
    pricePerNight: 80,
    capacity: 1,
    amenities: ["WiFi", "Desk"],
    images: [
      {
        url: `${CLOUD}/v1712345678/r1.jpg`,
        publicId: "r1",
      },
    ],
  },
  {
    roomNumber: "102",
    name: "Courtyard Single",
    type: "single",
    description: "Compact and bright, ideal for solo travelers.",
    pricePerNight: 90,
    capacity: 2,
    amenities: ["WiFi", "TV"],
    images: [
      {
       url: `${CLOUD}/v1712345678/r2.jpg`,
        publicId: "r2",
      },
    ],
  },
  {
    roomNumber: "201",
    name: "Deluxe King",
    type: "deluxe",
    description: "Spacious room with a king bed and city view.",
    pricePerNight: 160,
    capacity: 2,
    amenities: ["WiFi", "TV", "Minibar", "Balcony"],
    images: [
      {
       url: `${CLOUD}/v1712345678/r3.jpg`,
        publicId: "r3",
      },
    ],
  },
  {
    roomNumber: "202",
    name: "Deluxe Twin",
    type: "deluxe",
    description: "Two comfortable beds and a seating area.",
    pricePerNight: 150,
    capacity: 3,
    amenities: ["WiFi", "TV", "Air conditioning"],
    images: [
      {
       url: `${CLOUD}/v1712345678/r4.jpg`,
        publicId: "r4",
      },
    ],
  },
  {
    roomNumber: "301",
    name: "Family Suite",
    type: "family",
    description: "Two connected rooms, perfect for families.",
    pricePerNight: 240,
    capacity: 5,
    amenities: ["WiFi", "TV", "Kitchenette"],
    images: [
      {
       url: `${CLOUD}/v1712345678/r5.jpg`,
        publicId: "r5",
      },
    ],
  },
   {
    roomNumber: "302",
    name: "Family Suite",
    type: "family",
    description: "Two connected rooms, perfect for families.",
    pricePerNight: 240,
    capacity: 5,
    amenities: ["WiFi", "TV", "Kitchenette"],
    images: [
      {
       url: `${CLOUD}/v1712345678/r6.jpg`,
        publicId: "r6",
      },
    ],
  },
];

try {
  await connectDB();
  await Room.deleteMany({});
  const created = await Room.insertMany(rooms);
  console.log(`Seeded ${created.length} rooms`);
} catch (err) {
  console.error("Seeding failed:", err.message);
} finally {
  await mongoose.disconnect();
}
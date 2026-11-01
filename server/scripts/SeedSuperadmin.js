import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

try {
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    throw new Error(
      "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in server/.env",
    );
  }
  if (SUPERADMIN_PASSWORD.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD must be at least 12 characters");
  }

  await connectDB();

  const existing = await User.findOne({ role: "superadmin" });
  if (existing) {
    console.log("A superadmin already exists. Nothing changed.");
  } else {
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
    await User.create({
      name: SUPERADMIN_NAME || "Super Admin",
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: "superadmin",
      mustChangePassword: true,
    });

    console.log(`Superadmin created: ${SUPERADMIN_EMAIL}`);
  }
} catch (err) {
  if (err.code === 11000) {
    console.error("That email is already used by another account.");
  } else {
    console.error("Superadmin seeding failed:", err.message);
  }
} finally {
  await mongoose.disconnect();
}

import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const newPassword = process.env.SUPERADMIN_NEW_PASSWORD;

try {
  // 1. Validate input before touching the database
  if (!newPassword) {
    throw new Error(
      "SUPERADMIN_NEW_PASSWORD is not set. Set it in your terminal for this run only.",
    );
  }
  if (newPassword.length < 12) {
    throw new Error("The new password must be at least 12 characters.");
  }

  await connectDB();

  // 2. Hash the new password (cost 12, same as the seed)
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 3. Update the single superadmin account
  const result = await User.findOneAndUpdate(
    { role: "superadmin" },
    {
      $set: { passwordHash, mustChangePassword: true },
      $inc: { tokenVersion: 1 },
    },
  );

  // 4. Report what happened (never print the password or hash)
  if (!result) {
    console.log("No superadmin found. Run scripts/seedSuperadmin.js first.");
  } else {
    console.log(
      `Password reset for ${result.email}. Old sessions are now invalid.`,
    );
  }
} catch (err) {
  console.error("Reset failed:", err.message);
} finally {
  await mongoose.disconnect();
}

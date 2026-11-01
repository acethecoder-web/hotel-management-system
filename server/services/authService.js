import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;
const DUMMY_HASH = await bcrypt.hash("not-a-real-password", 12);

export async function registerUser({ name, email, password }) {
  if (typeof password !== "string" || !PASSWORD_RULE.test(password)) {
    const error = new Error(
      "Password must be 8-72 characters and include a letter, a number, and a special character",
    );
    error.name = "ValidationError";
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "guest",
  });

  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function loginUser({ email, password }) {
  const invalid = () => {
    const error = new Error("Invalid email or password");
    error.status = 401;
    return error;
  };

  if (typeof email !== "string" || typeof password !== "string")
    throw invalid();

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordHash",
  );

  const match = await bcrypt.compare(
    password,
    user ? user.passwordHash : DUMMY_HASH,
  );
  if (!user || !match || !user.active) throw invalid();

  const token = signToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const fail = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
  };

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw fail("Current and new password are required", 400);
  }
  if (!PASSWORD_RULE.test(newPassword)) {
    throw fail(
      "Password must be 8-72 characters and include a letter, a number, and a special character",
      400,
    );
  }
  if (currentPassword === newPassword) {
    throw fail("New password must be different from the current one", 400);
  }

  const user = await User.findById(userId).select("+passwordHash");
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw fail("Current password is incorrect", 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 1. Update the database first, and get the UPDATED document back
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: { passwordHash, mustChangePassword: false },
      $inc: { tokenVersion: 1 },
    },
    { new: true },
  );

  // 2. Sign from the updated record, so the token carries the new tokenVersion
  const token = signToken(updated);

  return {
    token,
    user: {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      mustChangePassword: updated.mustChangePassword,
    },
  };
}

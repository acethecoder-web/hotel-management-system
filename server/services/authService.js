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

  const token = jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );

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

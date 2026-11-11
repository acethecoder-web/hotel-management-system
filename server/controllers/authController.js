import {
  registerUser,
  loginUser,
  changePassword,
} from "../services/authService.js";
import { cookieOptions } from "../config/cookie.js";

import { logAction } from "../services/auditService.js";

import User from "../models/User.js"

export async function register(req, res) {
  const { name, email, password } = req.body; // everything else is ignored

  try {
    const user = await registerUser({ name, email, password });
    res.status(201).json(user);
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = error.errors
        ? Object.values(error.errors)
            .map((e) => e.message)
            .join(", ")
        : error.message;
      return res.status(400).json({ message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered" });
    }
    console.error("register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
}

async function recordFailedLogin(email, req) {
  try {
    if (typeof email !== "string") return;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("name email role");
    // Staff accounts only: random emails can't fill the log
    if (user && user.role !== "guest") {
      await logAction({ actor: user, action: "auth.login_failed", req });
    }
  } catch (error) {
    console.error("failed-login audit error:", error.message);
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const { token, user } = await loginUser({ email, password });
    res.cookie("token", token, cookieOptions).json(user);
  } catch (error) {
    if (error.status === 401) {
  res.status(401).json({ message: error.message });
  await recordFailedLogin(email, req); 
  return;
}
  }

  const { token, user } = await loginUser({ email, password });
  if (user.role !== "guest") {
    await logAction({
      actor: { _id: user.id, name: user.name, email: user.email },
      action: "auth.login",
      req,
    });
  }
  res.cookie("token", token, cookieOptions).json(user);
}

export function logout(req, res) {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie("token", clearOptions).json({ message: "Logged out" });
}

export function me(req, res) {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  });
}

export async function changePasswordHandler(req, res) {
  const { currentPassword, newPassword } = req.body;
  try {
    const { token, user } = await changePassword(req.user._id, {
      currentPassword,
      newPassword,
    });
    res.cookie("token", token, cookieOptions).json(user);
  } catch (error) {
    if (error.status === 400)
      return res.status(400).json({ message: error.message });
    console.error("change-password error:", error);
    res.status(500).json({ message: "Could not change password" });
  }

  if (req.user.role !== "guest") {
    await logAction({ actor: req.user, action: "auth.change_password", req });
  }
}


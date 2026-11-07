import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import { generateTempPassword } from "../utils/generateTempPassword.js";

const ASSIGNABLE_ROLES = ["guest", "admin"];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const toSafe = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  mustChangePassword: u.mustChangePassword,
  createdAt: u.createdAt,
});

async function getManagedUser(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid user id");
  const user = await User.findById(id);
  if (!user) throw httpError(404, "User not found");
  if (user.role === "superadmin") {
    throw httpError(403, "The superadmin account can't be managed here");
  }
  return user;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw httpError(400, `${label} is required`);
  }
}

export async function listUsers({ q, role, active, page = 1, limit = 20 }) {
  const filter = {};

  if (["guest", "admin", "superadmin"].includes(role)) filter.role = role;
  if (active === "true") filter.active = true;
  if (active === "false") filter.active = false;

  if (typeof q === "string" && q.trim()) {
    const safe = q
      .trim()
      .slice(0, 50)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
    ];
  }

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toSafe),
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  };
}

export async function createUser({ name, email, role }) {
  requireString(name, "Name");
  requireString(email, "Email");
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw httpError(400, "Role must be guest or admin");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    mustChangePassword: true,
  });

  return { user: toSafe(user), tempPassword, target: user };
}

export async function updateUser(id, { name, email, role }) {
  const user = await getManagedUser(id);
  const changed = [];
  let roleChange = null;

  if (name !== undefined) {
    requireString(name, "Name");
    user.name = name;
    changed.push("name");
  }
  if (email !== undefined) {
    requireString(email, "Email");
    user.email = email;
    changed.push("email");
  }
  if (role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw httpError(400, "Role must be guest or admin");
    }
    if (role !== user.role) {
      roleChange = { from: user.role, to: role };
      user.role = role;
      user.tokenVersion += 1;
      changed.push("role");
    }
  }

  if (changed.length === 0) throw httpError(400, "Nothing to update");

  await user.save();
  return { user: toSafe(user), target: user, details: { changed, roleChange } };
}

export async function setArchived(id, archived, actorId) {
  if (typeof archived !== "boolean") {
    throw httpError(400, "archived must be true or false");
  }
  if (String(actorId) === String(id)) {
    throw httpError(400, "You can't archive your own account");
  }

  const user = await getManagedUser(id);
  user.active = !archived;
  if (archived) user.tokenVersion += 1;
  await user.save();

  return { user: toSafe(user), target: user, details: { archived } };
}

export async function resetPassword(id) {
  const user = await getManagedUser(id);

  const tempPassword = generateTempPassword();
  user.passwordHash = await bcrypt.hash(tempPassword, 12);
  user.mustChangePassword = true;
  user.tokenVersion += 1;
  await user.save();

  return { user: toSafe(user), tempPassword, target: user };
}

export async function listAuditLogs({ action, page = 1, limit = 30 }) {
  const { default: AuditLog } = await import("../models/AuditLog.js");

  const filter = {};
  if (typeof action === "string" && action) filter.action = action;

  const pageNum = Math.max(parseInt(page) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit) || 30, 1), 100);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, page: pageNum, pages: Math.ceil(total / limitNum) };
}

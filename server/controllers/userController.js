import * as userService from "../services/userService.js";
import { logAction } from "../services/auditService.js";

function handleError(res, error, label) {
  if (error.status)
    return res.status(error.status).json({ message: error.message });

  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  console.error(`${label} error:`, error);
  res.status(500).json({ message: "Something went wrong" });
}

export async function listUsers(req, res) {
  try {
    res.json(await userService.listUsers(req.query));
  } catch (error) {
    handleError(res, error, "listUsers");
  }
}

export async function createUser(req, res) {
  const { name, email, role } = req.body;
  try {
    const { user, tempPassword, target } = await userService.createUser({
      name,
      email,
      role,
    });
    await logAction({
      actor: req.user,
      action: "user.create",
      target,
      req,
      details: { role: user.role },
    });
    res.status(201).json({ user, tempPassword });
  } catch (error) {
    handleError(res, error, "createUser");
  }
}

export async function updateUser(req, res) {
  const { name, email, role } = req.body;
  try {
    const { user, target, details } = await userService.updateUser(
      req.params.id,
      { name, email, role },
    );
    await logAction({
      actor: req.user,
      action: "user.update",
      target,
      details,
      req,
    });
    res.json(user);
  } catch (error) {
    handleError(res, error, "updateUser");
  }
}

export async function setArchived(req, res) {
  try {
    const { user, target, details } = await userService.setArchived(
      req.params.id,
      req.body.archived,
      req.user._id,
    );
    await logAction({
      actor: req.user,
      action: details.archived ? "user.archive" : "user.restore",
      target,
      req,
    });
    res.json(user);
  } catch (error) {
    handleError(res, error, "setArchived");
  }
}

export async function resetPassword(req, res) {
  try {
    const { user, tempPassword, target } = await userService.resetPassword(
      req.params.id,
    );
    await logAction({
      actor: req.user,
      action: "user.reset_password",
      target,
      req,
    });
    res.json({ user, tempPassword });
  } catch (error) {
    handleError(res, error, "resetPassword");
  }
}

export async function listAuditLogs(req, res) {
  try {
    res.json(await userService.listAuditLogs(req.query));
  } catch (error) {
    handleError(res, error, "listAuditLogs");
  }
}

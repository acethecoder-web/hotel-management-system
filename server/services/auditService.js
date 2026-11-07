import AuditLog from "../models/AuditLog.js";

export async function logAction({ actor, action, target, details = {}, req }) {
  try {
    await AuditLog.create({
      actor: actor?._id,
      actorName: actor?.name,
      actorEmail: actor?.email,
      action,
      targetUser: target?._id,
      targetEmail: target?.email,
      details,
      ip: req?.ip,
    });
  } catch (error) {
    console.error("audit log failed:", error.message);
  }
}

import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorEmail: String,
    action: { type: String, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetEmail: String,
    details: { type: Object, default: {} },
    ip: String,
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);

import { Router } from "express";
import { listAuditLogs } from "../controllers/userController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get(
  "/",
  protect,
  requirePasswordChanged,
  requireRole("superadmin"),
  listAuditLogs,
);

export default router;

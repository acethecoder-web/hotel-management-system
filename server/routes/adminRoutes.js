import { Router } from "express";
import { getDashboard } from "../controllers/adminController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("admin"));

router.get("/dashboard", getDashboard);

export default router;
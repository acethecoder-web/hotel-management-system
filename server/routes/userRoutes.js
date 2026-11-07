import { Router } from "express";
import {
  listUsers,
  createUser,
  updateUser,
  setArchived,
  resetPassword,
} from "../controllers/userController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("superadmin"));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);
router.patch("/:id/archive", setArchived);
router.post("/:id/reset-password", resetPassword);

export default router;

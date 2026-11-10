import { Router } from "express";
import { getDashboard,  listRooms, createRoom, updateRoom, setRoomActive  } from "../controllers/adminController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/rooms", listRooms);
router.post("/rooms", createRoom);
router.patch("/rooms/:id", updateRoom);
router.patch("/rooms/:id/active", setRoomActive);

export default router;
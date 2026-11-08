import { Router } from "express";
import { getActiveRooms, getRoomById } from "../controllers/roomController.js";
import { searchAvailability } from "../controllers/bookingController.js";

const router = Router();

router.get("/", getActiveRooms);
router.get("/availability", searchAvailability);
router.get("/:id", getRoomById);

export default router;

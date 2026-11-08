import { Router } from "express";
import {
  createBooking,
  listMyBookings,
  cancelBooking,
} from "../controllers/bookingController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("guest"));

router.post("/", createBooking);
router.get("/mine", listMyBookings);
router.post("/:id/cancel", cancelBooking);

export default router;

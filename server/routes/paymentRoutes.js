import { Router } from "express";
import { createOrder, captureOrder } from "../controllers/paymentController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { paymentLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("guest"), paymentLimiter);

router.post("/paypal/orders", createOrder);
router.post("/paypal/orders/:orderId/capture", captureOrder);

export default router;
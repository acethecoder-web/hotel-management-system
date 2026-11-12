import * as paypal from "../services/paypalService.js";
import { logAction } from "../services/auditService.js";

function handleError(res, error, label) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(`${label} error:`, error);
  res.status(500).json({ message: "Something went wrong" });
}

export async function createOrder(req, res) {
  try {
    res.status(201).json(await paypal.createPaypalOrder(req.user._id, req.body.bookingId));
  } catch (error) {
    handleError(res, error, "createOrder");
  }
}

export async function captureOrder(req, res) {
  try {
    const result = await paypal.capturePaypalOrder(req.user._id, req.params.orderId);
    if (!result.alreadyProcessed) {
      await logAction({
        actor: req.user,
        action: result.result === "paid" ? "payment.paypal" : "payment.paypal_auto_refund",
        target: req.user,
        details: { bookingReference: result.bookingReference, reason: result.reason },
        req,
      });
    }
    res.json(result);
  } catch (error) {
    if (error.refundFailed) {
      await logAction({
        actor: req.user, action: "payment.paypal_refund_failed", target: req.user,
        details: { orderId: req.params.orderId }, req,
      });
    }
    handleError(res, error, "captureOrder");
  }
}
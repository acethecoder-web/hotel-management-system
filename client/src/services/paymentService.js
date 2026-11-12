import { api } from "./api";

export const createPaypalOrderRequest = (bookingId) =>
  api("/api/payments/paypal/orders", { method: "POST", body: { bookingId } });

export const capturePaypalOrderRequest = (orderId) =>
  api(`/api/payments/paypal/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST" });
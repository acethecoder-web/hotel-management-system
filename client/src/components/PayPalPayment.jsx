import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "../hooks/useAuth";
import { createPaypalOrderRequest, capturePaypalOrderRequest } from "../services/paymentService";
import { formatMoney } from "../utils/dates";

const CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const CURRENCY = import.meta.env.VITE_CURRENCY || "PHP";

function PayPalPayment({ booking, onResult, onClose }) {
  const { setUser } = useAuth();
  const [error, setError] = useState("");

  if (!CLIENT_ID) return <p className="muted">Online payment is not configured.</p>;

  function fail(err) {
    if (err.status === 401) setUser(null);
    else setError(err.message);
  }

  // PayPal calls this when the guest clicks the button. The server decides the amount.
  async function createOrder() {
    setError("");
    try {
      return (await createPaypalOrderRequest(booking._id)).orderId;
    } catch (err) {
      fail(err);
      throw err; // tells the PayPal button not to open
    }
  }

  // The guest approved. This is NOT proof of payment: the server captures and verifies it.
  async function onApprove(data) {
    try {
      onResult(await capturePaypalOrderRequest(data.orderID));
    } catch (err) {
      fail(err);
    }
  }

  return (
    <div className="paypal-box">
      <p>Pay <strong>{formatMoney(booking.totalPrice)}</strong> for {booking.bookingReference}.</p>

      <PayPalScriptProvider options={{ clientId: CLIENT_ID, currency: CURRENCY, intent: "capture" }}>
        <PayPalButtons
          style={{ layout: "vertical" }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={() => setError("Payment cancelled. You have not been charged.")}
          onError={() => setError((prev) => prev || "Something went wrong with PayPal. You have not been charged.")}
        />
      </PayPalScriptProvider>

      {error && <div className="state state--error">{error}</div>}
      <button type="button" className="btn btn--outline" onClick={onClose}>Close</button>
    </div>
  );
}

export default PayPalPayment;
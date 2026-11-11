import { useEffect, useRef, useState } from "react";

function CancelReasonDialog({ booking, onClose }) {
  const ref = useRef(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (booking && !dialog.open) {
      setReason("");
      dialog.showModal();
    }
    if (!booking && dialog.open) dialog.close();
  }, [booking]);

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="cancel-title"
      onCancel={(e) => { e.preventDefault(); onClose(null); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(null); }}
    >
      {booking && (
        <div className="confirm__box">
          <h2 id="cancel-title">Cancel {booking.bookingReference}?</h2>
          <p>
            The room will be released. The guest sees the booking as cancelled.
          </p>
          <div className="field">
            <label htmlFor="cancel-reason">Reason (optional)</label>
            <textarea id="cancel-reason" rows={3} maxLength={200} value={reason}
              onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="confirm__actions">
            <button className="btn btn--outline" autoFocus onClick={() => onClose(null)}>
              Keep booking
            </button>
            <button className="btn btn--danger" onClick={() => onClose(reason)}>
              Cancel booking
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default CancelReasonDialog;
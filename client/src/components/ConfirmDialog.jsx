import { useEffect, useRef } from "react";

function ConfirmDialog({ options, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (options && !dialog.open) dialog.showModal();
    if (!options && dialog.open) dialog.close();
  }, [options]);

  const { title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } =
    options || {};

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="confirm-title"
      onCancel={(e) => { e.preventDefault(); onClose(false); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      {options && (
        <div className="confirm__box">
          <h2 id="confirm-title">{title}</h2>
          <p>{message}</p>
          <div className="confirm__actions">
            <button className="btn btn--outline" autoFocus={danger} onClick={() => onClose(false)}>
              {cancelLabel}
            </button>
            <button
              className={`btn ${danger ? "btn--danger" : "btn--primary"}`}
              onClick={() => onClose(true)}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default ConfirmDialog;
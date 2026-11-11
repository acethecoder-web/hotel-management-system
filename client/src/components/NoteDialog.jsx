import { useEffect, useRef, useState } from "react";

function NoteDialog({ config, onClose }) {
  const ref = useRef(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (config && !dialog.open) {
      setNote("");
      dialog.showModal();
    }
    if (!config && dialog.open) dialog.close();
  }, [config]);

  return (
    <dialog
      ref={ref}
      className="confirm"
      aria-labelledby="note-title"
      onCancel={(e) => { e.preventDefault(); onClose(null); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(null); }}
    >
      {config && (
        <div className="confirm__box">
          <h2 id="note-title">{config.title}</h2>
          <p>{config.message}</p>
          <div className="field">
            <label htmlFor="note-text">Note (optional)</label>
            <textarea id="note-text" rows={2} maxLength={200} value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="confirm__actions">
            <button className="btn btn--outline" autoFocus onClick={() => onClose(null)}>Cancel</button>
            <button className={`btn ${config.danger ? "btn--danger" : "btn--primary"}`}
              onClick={() => onClose(note)}>
              {config.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export default NoteDialog;
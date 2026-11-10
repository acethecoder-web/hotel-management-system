import { useState } from "react";

const TYPES = ["single", "deluxe", "family"];

function RoomForm({ room, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    roomNumber: room?.roomNumber ?? "",
    name: room?.name ?? "",
    type: room?.type ?? "single",
    description: room?.description ?? "",
    pricePerNight: room?.pricePerNight ?? "",
    capacity: String(room?.capacity ?? 2),
    amenities: (room?.amenities ?? []).join(", "),
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      roomNumber: form.roomNumber,
      name: form.name,
      type: form.type,
      description: form.description,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      // "WiFi, TV, Balcony" -> ["WiFi", "TV", "Balcony"]
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
    });
  }

  return (
    <form className="room-form" onSubmit={handleSubmit}>
      <h2>{room ? `Edit room ${room.roomNumber}` : "Add room"}</h2>
      {error && <div className="state state--error">{error}</div>}

      <div className="form-row">
        <div className="field">
          <label htmlFor="rf-number">Room number</label>
          <input id="rf-number" name="roomNumber" value={form.roomNumber} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="rf-type">Type</label>
          <select id="rf-type" name="type" value={form.type} onChange={handleChange}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="rf-name">Name</label>
        <input id="rf-name" name="name" value={form.name} onChange={handleChange} required />
      </div>

      <div className="field">
        <label htmlFor="rf-desc">Description</label>
        <textarea id="rf-desc" name="description" rows={3} value={form.description}
          onChange={handleChange} required />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="rf-price">Price per night</label>
          <input id="rf-price" name="pricePerNight" type="number" min="0.01" max="100000" step="0.01"
            value={form.pricePerNight} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="rf-cap">Capacity</label>
          <select id="rf-cap" name="capacity" value={form.capacity} onChange={handleChange}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="rf-amen">Amenities</label>
        <input id="rf-amen" name="amenities" value={form.amenities} onChange={handleChange}
          placeholder="WiFi, TV, Balcony" />
        <small>Separate with commas.</small>
      </div>

      <div className="user-form__actions">
        <button className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving..." : room ? "Save changes" : "Add room"}
        </button>
        <button type="button" className="btn btn--outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default RoomForm;
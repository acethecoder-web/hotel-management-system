import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../hooks/useConfirm";
import {
  fetchAdminRooms, createRoomRequest, updateRoomRequest, setRoomActiveRequest,
} from "../../services/adminService";
import RoomForm from "../../components/RoomForm";
import StatusBadge from "../../components/StatusBadge";
import { optimizeImage } from "../../utils/cloudinary";
import { formatMoney } from "../../utils/dates";
import ImageManager from "../../components/ImageManager";

function AdminRoomsPage() {
  const { setUser } = useAuth();
  const confirm = useConfirm();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [reloadKey, setReloadKey] = useState(0);

  const [formRoom, setFormRoom] = useState(undefined); // undefined closed, null create, object edit
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = await fetchAdminRooms();
        if (!ignore) {
          setRooms(result);
          setError("");
        }
      } catch (err) {
        if (err.status === 401) setUser(null);
        else if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [reloadKey, setUser]);

  const refresh = () => setReloadKey((k) => k + 1);

  // Derived, not stored
  const visible = rooms.filter((r) =>
    filter === "all" ? true : filter === "active" ? r.active : !r.active
  );
  
async function handleSave(values) {
  setSaving(true);
  setFormError("");
  try {
    if (formRoom === null) {
      const created = await createRoomRequest(values);
      setFormRoom(created); // switch to edit mode, which shows the photo manager
      setNotice("Room created. You can add photos below.");
    } else {
      await updateRoomRequest(formRoom._id, values);
      setFormRoom(undefined);
      setNotice("");
    }
    refresh();
  } catch (err) {
    if (err.status === 401) setUser(null);
    else setFormError(err.message);
  } finally {
    setSaving(false);
  }
}
  async function handleToggleActive(room) {
    const deactivating = room.active;
    const ok = await confirm({
      title: deactivating ? `Deactivate ${room.name}?` : `Reactivate ${room.name}?`,
      message: deactivating
        ? "Guests will no longer see or book this room. Rooms with upcoming bookings can't be deactivated."
        : "The room will appear on the website and can be booked again.",
      confirmLabel: deactivating ? "Deactivate" : "Reactivate",
      danger: deactivating,
    });
    if (!ok) return;

    setActionError("");
    try {
      await setRoomActiveRequest(room._id, !room.active);
      refresh();
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setActionError(err.message); // e.g. "This room has 2 upcoming bookings..."
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Rooms</h1>
        <p>Manage the rooms guests can book. Rooms are deactivated, never deleted.</p>
      </div>
      
{formRoom !== undefined ? (
  <>
    {notice && <div className="notice notice--success">{notice}</div>}

    <RoomForm
      key={formRoom?._id ?? "new"}
      room={formRoom}
      onSubmit={handleSave}
      onCancel={() => { setFormRoom(undefined); setFormError(""); setNotice(""); }}
      submitting={saving}
      error={formError}
    />

    {formRoom && (
      <ImageManager
        room={formRoom}
        onChange={(updated) => { setFormRoom(updated); refresh(); }}
      />
    )}
  </>
) : (
  <div className="toolbar">
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="all">All rooms</option>
      <option value="active">Active only</option>
      <option value="inactive">Inactive only</option>
    </select>
    <button className="btn btn--primary" onClick={() => setFormRoom(null)}>+ Add room</button>
  </div>
)}

      {actionError && <div className="state state--error">{actionError}</div>}
      {error && <div className="state state--error">Could not load rooms: {error}</div>}
      {loading && <div className="state">Loading rooms...</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th><th>Room</th><th>Type</th><th>Price</th>
                <th>Guests</th><th>Today</th><th>Listing</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r._id}>
                  <td>
                    {r.images[0] ? (
                      <img className="thumb" src={optimizeImage(r.images[0].url, 96, 72)} alt="" />
                    ) : (
                      <div className="thumb thumb--empty" />
                    )}
                  </td>
                  <td>{r.name} <span className="muted">#{r.roomNumber}</span></td>
                  <td className="cap">{r.type}</td>
                  <td>{formatMoney(r.pricePerNight)}</td>
                  <td>{r.capacity}</td>
                  <td><StatusBadge status={r.operationalStatus} /></td>
                  <td><StatusBadge status={r.active ? "active" : "inactive"} /></td>
                  <td className="table__actions">
                    <button className="btn btn--outline" onClick={() => setFormRoom(r)}>Edit</button>
                    <button className="btn btn--outline" onClick={() => handleToggleActive(r)}>
                      {r.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="state">No rooms match this filter.</div>
      )}
    </>
  );
}

export default AdminRoomsPage;
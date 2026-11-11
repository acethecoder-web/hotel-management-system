import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchAdminRooms, setRoomStatusRequest } from "../services/adminService";
import StatusBadge from "./StatusBadge";

const MANUAL = ["available", "cleaning", "maintenance"];

function RoomBoard({ reloadKey, onChanged }) {
  const { setUser } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [localKey, setLocalKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const result = await fetchAdminRooms();
        if (!ignore) {
          setRooms(result.filter((r) => r.active));
          setError("");
        }
      } catch (err) {
        if (err.status === 401) setUser(null);
        else if (!ignore) setError(err.message);
      }
    }
    load();
    return () => { ignore = true; };
  }, [reloadKey, localKey, setUser]);

  async function change(room, status) {
    setError("");
    setBusyId(room._id);
    try {
      await setRoomStatusRequest(room._id, status);
      setLocalKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      if (err.status === 401) setUser(null);
      else {
        setError(err.message);
        setLocalKey((k) => k + 1);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h2 className="section-title">Rooms</h2>
      {error && <div className="state state--error">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Room</th><th>Type</th><th>Status</th><th>Change to</th></tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r._id}>
                <td>{r.name} <span className="muted">#{r.roomNumber}</span></td>
                <td className="cap">{r.type}</td>
                <td><StatusBadge status={r.operationalStatus} /></td>
                <td>
                  {r.operationalStatus === "occupied" ? (
                    <span className="muted">Changes at check-out</span>
                  ) : (
                    <select value={r.operationalStatus} disabled={busyId === r._id}
                      onChange={(e) => change(r, e.target.value)}>
                      {MANUAL.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default RoomBoard;
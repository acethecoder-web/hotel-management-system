import { useEffect, useState } from "react";
import { fetchRooms } from "../services/roomService";
import RoomCard from "../components/RoomCard";
import RoomCardSkeleton from "../components/RoomCardSkeleton";

const TYPES = ["all", "single", "deluxe", "family"];

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    async function loadRooms() {
      try {
        setRooms(await fetchRooms());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, []);

  const visibleRooms = type === "all" ? rooms : rooms.filter((r) => r.type === type);

  return (
    <>
      <div className="page-header">
        <h1>Find your room</h1>
        <p>Comfortable stays, from solo trips to family holidays.</p>
      </div>

      <div className="chips">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`chip ${type === t ? "chip--active" : ""}`}
            onClick={() => setType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="state state--error">Could not load rooms: {error}</div>}

      {!error && (
        <div className="room-grid">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <RoomCardSkeleton key={i} />)
            : visibleRooms.map((room) => <RoomCard key={room._id} room={room} />)}
        </div>
      )}

      {!loading && !error && visibleRooms.length === 0 && (
        <div className="state">No rooms match this filter.</div>
      )}
    </>
  );
}

export default RoomsPage;
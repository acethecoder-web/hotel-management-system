import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchRooms } from "../services/roomService";
import { searchAvailability } from "../services/bookingService";
import RoomCard from "../components/RoomCard";
import RoomCardSkeleton from "../components/RoomCardSkeleton";
import SearchForm from "../components/SearchForm";
import { formatDate } from "../utils/dates";

const TYPES = ["all", "single", "deluxe", "family"];

function RoomsPage() {
  const [params, setParams] = useSearchParams();
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const guests = params.get("guests") || "1";
  const hasSearch = Boolean(checkIn && checkOut);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = hasSearch
          ? (await searchAvailability({ checkIn, checkOut, guests })).rooms
          : await fetchRooms();
        if (!ignore) setRooms(result);
      } catch (err) {
        if (!ignore) {
          setRooms([]);
          setError(err.message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [hasSearch, checkIn, checkOut, guests]);

  const visibleRooms =
    type === "all" ? rooms : rooms.filter((r) => r.type === type);
  const search = hasSearch
    ? `?${new URLSearchParams({ checkIn, checkOut, guests })}`
    : "";

  return (
    <>
      <div className="page-header">
        <h1>Find your room</h1>
        <p>Comfortable stays, from solo trips to family holidays.</p>
      </div>

      <SearchForm
        initial={{ checkIn, checkOut, guests }}
        hasSearch={hasSearch}
        onSearch={(values) => setParams(values)}
        onClear={() => setParams({})}
      />

      {hasSearch && !error && !loading && (
        <p className="search-summary">
          {rooms.length} {rooms.length === 1 ? "room" : "rooms"} available,{" "}
          {formatDate(checkIn)} to {formatDate(checkOut)}, {guests}{" "}
          {guests === "1" ? "guest" : "guests"}
        </p>
      )}

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

      {error && (
        <div className="state state--error">Could not load rooms: {error}</div>
      )}

      {!error && (
        <div className="room-grid">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <RoomCardSkeleton key={i} />)
            : visibleRooms.map((room) => (
                <RoomCard key={room._id} room={room} search={search} />
              ))}
        </div>
      )}

      {!loading && !error && visibleRooms.length === 0 && (
        <div className="state">
          {hasSearch
            ? "No rooms are available for those dates. Try different dates."
            : "No rooms match this filter."}
        </div>
      )}
    </>
  );
}

export default RoomsPage;

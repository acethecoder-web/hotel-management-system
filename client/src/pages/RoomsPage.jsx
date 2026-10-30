import { useEffect, useState } from "react";
import { fetchRooms } from "../services/roomService";
import RoomCard from "../components/RoomCard";

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await fetchRooms();
        setRooms(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadRooms();
  }, []);

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p>Error: {error}</p>;
  if (rooms.length === 0) return <p>No rooms available.</p>;

  return (
    <div>
      <h1>Our Rooms</h1>
    <div className="room-grid">
  {rooms.map((room) => (
    <RoomCard key={room._id} room={room} />
  ))}
</div>
    </div>
  );
}

export default RoomsPage;
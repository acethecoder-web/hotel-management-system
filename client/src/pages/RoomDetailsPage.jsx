import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRoomById } from "../services/roomService";

function RoomDetailsPage() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRoom() {
      try {
        const data = await fetchRoomById(id);
        setRoom(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [id]);

  if (loading) return <p>Loading room...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="room-details">
      <Link to="/rooms">← Back to rooms</Link>
      <h1>{room.name}</h1>
      <p className="room-card__type">{room.type} · Room {room.roomNumber}</p>
      <p>{room.description}</p>
      <p>Up to {room.capacity} guests</p>
      <p className="room-card__price">${room.pricePerNight} / night</p>
      {room.amenities.length > 0 && (
        <>
          <h2>Amenities</h2>
          <ul>
            {room.amenities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default RoomDetailsPage;
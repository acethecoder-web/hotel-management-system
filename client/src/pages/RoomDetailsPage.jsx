import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchRoomById } from "../services/roomService";
import { optimizeImage } from "../utils/cloudinary";
import StatusBadge from "../components/StatusBadge";

function RoomDetailsPage() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    async function loadRoom() {
      setLoading(true);
      setSelectedIndex(0);
      try {
        setRoom(await fetchRoomById(id));
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [id]);

  if (loading) return <div className="state">Loading room...</div>;
  if (error) return <div className="state state--error">Error: {error}</div>;

  const selected = room.images[selectedIndex]; // derived, not stored

  return (
    <>
      <Link to="/rooms" className="details__back">← Back to rooms</Link>
      <div className="details">
        <section>
          {selected ? (
            <img className="gallery__main" src={optimizeImage(selected.url, 1100)} alt={room.name} />
          ) : (
            <div className="gallery__main state">No photo yet</div>
          )}

          {room.images.length > 1 && (
            <div className="gallery__thumbs">
              {room.images.map((img, i) => (
                <button
                  key={img.publicId}
                  className={`gallery__thumb ${i === selectedIndex ? "gallery__thumb--active" : ""}`}
                  onClick={() => setSelectedIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={optimizeImage(img.url, 200)} alt="" />
                </button>
              ))}
            </div>
          )}

          <div className="details__info">
            <div className="details__title-row">
              <h1>{room.name}</h1>
              <StatusBadge status={room.operationalStatus} />
            </div>
            <p className="room-card__meta">
              {room.type} · Room {room.roomNumber} · Up to {room.capacity} guests
            </p>
            <p>{room.description}</p>

            {room.amenities.length > 0 && (
              <>
                <h2>Amenities</h2>
                <ul className="amenities">
                  {room.amenities.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </>
            )}
          </div>
        </section>

        <aside className="booking-panel">
          <p className="booking-panel__price">${room.pricePerNight} <small>/ night</small></p>
          <button className="btn btn--primary btn--block" disabled>Reserve (coming soon)</button>
          <p className="booking-panel__note">Date selection and booking arrive in Phase 4.</p>
        </aside>
      </div>
    </>
  );
}

export default RoomDetailsPage;
import { Link } from "react-router-dom";
import { optimizeImage } from "../utils/cloudinary";

function RoomCard({ room }) {
  const cover = room.images[0] ? optimizeImage(room.images[0].url, 700) : null;

  return (
    <article className="room-card">
      <div className="room-card__media">
        {cover ? (
          <img src={cover} alt={room.name} className="room-card__image" loading="lazy" />
        ) : (
          <div className="room-card__placeholder">No photo yet</div>
        )}
        <span className="badge room-card__tag">{room.type}</span>
      </div>
      <div className="room-card__body">
        <h2>{room.name}</h2>
        <p className="room-card__meta">
          Room {room.roomNumber} · Up to {room.capacity} {room.capacity === 1 ? "guest" : "guests"}
        </p>
        <div className="room-card__footer">
          <span className="room-card__price">
            ${room.pricePerNight} <small>/ night</small>
          </span>
          <Link to={`/rooms/${room._id}`} className="btn btn--outline">View</Link>
        </div>
      </div>
    </article>
  );
}

export default RoomCard;
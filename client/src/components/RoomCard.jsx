import { Link } from "react-router-dom";
import { optimizeImage } from "../utils/cloudinary";

function RoomCard({ room }) {
const image = room.images.length > 0 ? optimizeImage(room.images[0].url, 600) : null;

  return (
    <article className="room-card">
      {image ? (
<img src={image} alt={room.name} className="room-card__image" loading="lazy" />      ) : (
        <div className="room-card__placeholder">No photo yet</div>
      )}
      <div className="room-card__body">
        <h2>{room.name}</h2>
        <p className="room-card__type">{room.type}</p>
        <p>Up to {room.capacity} guests</p>
        <p className="room-card__price">${room.pricePerNight} / night</p>
        <Link to={`/rooms/${room._id}`}>View details</Link>
      </div>
    </article>
  );
}

export default RoomCard;
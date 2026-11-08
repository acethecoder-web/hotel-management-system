import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  fetchMyBookings,
  cancelBookingRequest,
} from "../services/bookingService";
import { optimizeImage } from "../utils/cloudinary";
import { addDays, formatDate, formatMoney, todayISO } from "../utils/dates";
import StatusBadge from "../components/StatusBadge";

function canCancel(booking) {
  if (!["pending", "confirmed"].includes(booking.bookingStatus)) return false;
  return todayISO() <= addDays(booking.checkIn.slice(0, 10), -1);
}

function MyBookingsPage() {
  const { setUser } = useAuth();
  const location = useLocation();
  const newReference = location.state?.newReference;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await fetchMyBookings();

        if (!ignore) {
          setBookings(data);
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
    return () => {
      ignore = true;
    };
  }, [reloadKey, setUser]);

  async function handleCancel(booking) {
    if (!window.confirm(`Cancel booking ${booking.bookingReference}?`)) return;
    setActionError("");
    setCancellingId(booking._id);
    try {
      await cancelBookingRequest(booking._id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setActionError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) return <div className="state">Loading your bookings...</div>;

  return (
    <>
      <div className="page-header">
        <h1>My bookings</h1>
        <p>Your reservations and their status.</p>
      </div>

      {newReference && (
        <div className="notice notice--success" role="status">
          <strong>Reservation created: {newReference}</strong>
          <p>
            It is held for 24 hours while the hotel confirms it. Keep your
            reference number handy for check-in.
          </p>
        </div>
      )}

      {error && (
        <div className="state state--error">
          Could not load bookings: {error}
        </div>
      )}
      {actionError && <div className="state state--error">{actionError}</div>}

      {!error && bookings.length === 0 && (
        <div className="state">
          You have no bookings yet. <Link to="/rooms">Find a room</Link>
        </div>
      )}

      <div className="booking-list">
        {bookings.map((b) => {
          const cover = b.room?.images?.[0]
            ? optimizeImage(b.room.images[0].url, 400, 300)
            : null;
          return (
            <article key={b._id} className="booking-card">
              <div className="booking-card__media">
                {cover ? (
                  <img src={cover} alt={b.room.name} loading="lazy" />
                ) : (
                  <div className="room-card__placeholder">No photo</div>
                )}
              </div>
              <div className="booking-card__body">
                <div className="booking-card__head">
                  <h2>{b.room?.name ?? "Room"}</h2>
                  <StatusBadge status={b.bookingStatus} />
                </div>
                <p className="muted">
                  Reference <code>{b.bookingReference}</code>
                </p>
                <p>
                  {formatDate(b.checkIn)} to {formatDate(b.checkOut)} ·{" "}
                  {b.nights} {b.nights === 1 ? "night" : "nights"} ·{" "}
                  {b.guestCount} {b.guestCount === 1 ? "guest" : "guests"}
                </p>
                <p className="booking-card__price">
                  {formatMoney(b.totalPrice)}{" "}
                  <small>({formatMoney(b.pricePerNight)} / night)</small>
                </p>
                {b.bookingStatus === "pending" && b.holdExpiresAt && (
                  <p className="muted">
                    Held until {new Date(b.holdExpiresAt).toLocaleString()}
                  </p>
                )}
                {canCancel(b) && (
                  <button
                    className="btn btn--outline"
                    disabled={cancellingId === b._id}
                    onClick={() => handleCancel(b)}
                  >
                    {cancellingId === b._id
                      ? "Cancelling..."
                      : "Cancel booking"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default MyBookingsPage;

import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createBookingRequest } from "../services/bookingService";
import { addDays, formatMoney, nightsBetween, todayISO } from "../utils/dates";

function BookingPanel({ room }) {
  const { user, loading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const today = todayISO();

  const [checkIn, setCheckIn] = useState(params.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") || "");
  const [guests, setGuests] = useState(
    String(Math.min(Number(params.get("guests")) || 1, room.capacity)),
  );
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const datesValid = nights >= 1;
  const estimate = datesValid
    ? Math.round(room.pricePerNight * nights * 100) / 100
    : 0;

  function handleCheckIn(e) {
    const value = e.target.value;
    setCheckIn(value);
    if (value && (!checkOut || checkOut <= value))
      setCheckOut(addDays(value, 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setConflict(false);
    setSubmitting(true);
    try {
      const booking = await createBookingRequest({
        roomId: room._id,
        checkIn,
        checkOut,
        guestCount: Number(guests),
      });
      navigate("/my-bookings", {
        state: { newReference: booking.bookingReference },
      });
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
      } else {
        setError(err.message);
        setConflict(err.status === 409);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const price = (
    <p className="booking-panel__price">
      {formatMoney(room.pricePerNight)} <small>/ night</small>
    </p>
  );

  if (!authLoading && !user) {
    return (
      <aside className="booking-panel">
        {price}
        <Link
          to="/login"
          state={{ from: location }}
          className="btn btn--primary btn--block"
        >
          Log in to reserve
        </Link>
        <p className="booking-panel__note">
          No account?{" "}
          <Link to="/register" state={{ from: location }}>
            Register
          </Link>
        </p>
      </aside>
    );
  }

  if (user && user.role !== "guest") {
    return (
      <aside className="booking-panel">
        {price}
        <p className="booking-panel__note">
          Staff accounts can't make guest reservations.
        </p>
      </aside>
    );
  }

  return (
    <aside className="booking-panel">
      {price}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="bp-in">Check-in</label>
          <input
            id="bp-in"
            type="date"
            min={today}
            value={checkIn}
            onChange={handleCheckIn}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bp-out">Check-out</label>
          <input
            id="bp-out"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bp-guests">Guests</label>
          <select
            id="bp-guests"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          >
            {Array.from({ length: room.capacity }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {datesValid && (
          <div className="price-summary">
            <div>
              <span>
                {formatMoney(room.pricePerNight)} × {nights}{" "}
                {nights === 1 ? "night" : "nights"}
              </span>
              <span>{formatMoney(estimate)}</span>
            </div>
            <div className="price-summary__total">
              <span>Estimated total</span>
              <span>{formatMoney(estimate)}</span>
            </div>
          </div>
        )}

        {error && <div className="state state--error">{error}</div>}
        {conflict && (
          <p className="booking-panel__note">
            <Link
              to={`/rooms?${new URLSearchParams({ checkIn, checkOut, guests })}`}
            >
              See other rooms for these dates
            </Link>
          </p>
        )}
        {user?.mustChangePassword && (
          <p className="booking-panel__note">
            You must <Link to="/change-password">change your password</Link>{" "}
            before booking.
          </p>
        )}

        <button
          className="btn btn--primary btn--block"
          disabled={submitting || authLoading || !datesValid}
        >
          {submitting ? "Reserving..." : "Reserve"}
        </button>
      </form>
      <p className="booking-panel__note">
        The final price is calculated by the hotel's server when you reserve.
        You won't be charged online yet.
      </p>
    </aside>
  );
}

export default BookingPanel;

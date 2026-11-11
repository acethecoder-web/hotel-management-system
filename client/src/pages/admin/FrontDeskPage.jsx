import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBookingActions } from "../../hooks/useBookingActions";
import { fetchFrontDesk } from "../../services/adminService";
import StatusBadge from "../../components/StatusBadge";
import RoomBoard from "../../components/RoomBoard";
import { formatDate } from "../../utils/dates";

function BookingList({ title, hint, tone, items, renderAction }) {
  return (
    <>
      <h2 className={`section-title ${tone ? `section-title--${tone}` : ""}`}>
        {title} <span className="muted">({items.length})</span>
      </h2>
      {hint && <p className="muted">{hint}</p>}
      {items.length === 0 ? (
        <div className="state">Nothing here.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td><code>{b.bookingReference}</code></td>
                  <td>{b.guest?.name}<br /><span className="muted">{b.guest?.email}</span></td>
                  <td>{b.room?.name} <span className="muted">#{b.room?.roomNumber}</span></td>
                  <td>{formatDate(b.checkIn)} to {formatDate(b.checkOut)}</td>
                  <td><StatusBadge status={b.bookingStatus} /></td>
                  <td className="table__actions">{renderAction(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FrontDeskPage() {
  const { setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((k) => k + 1);
  const actions = useBookingActions(refresh);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const result = await fetchFrontDesk();
        if (!ignore) {
          setData(result);
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
    return () => { ignore = true; };
  }, [reloadKey, setUser]);

  if (loading) return <div className="state">Loading front desk...</div>;
  if (error) return <div className="state state--error">Could not load the front desk: {error}</div>;

  const checkInButton = (b) =>
    b.bookingStatus === "confirmed" ? (
      <button className="btn btn--primary" disabled={actions.busyId === b.id}
        onClick={() => actions.checkIn(b)}>Check in</button>
    ) : (
      <span className="muted">Confirm first</span>
    );

  const checkOutButton = (b) => (
    <button className="btn btn--primary" disabled={actions.busyId === b.id}
      onClick={() => actions.checkOut(b)}>Check out</button>
  );

  return (
    <>
      <div className="page-header">
        <h1>Front desk</h1>
        <p>
          {formatDate(data.date)} · standard check-in {data.checkInTime}, check-out {data.checkOutTime}.
          Early arrivals: find the booking in Reservations.
        </p>
      </div>

      {actions.error && <div className="state state--error">{actions.error}</div>}

      {data.overdue.length > 0 && (
        <BookingList title="Overdue departures" tone="warning" items={data.overdue}
          hint="Guests still checked in after their stay should have ended."
          renderAction={checkOutButton} />
      )}

      <BookingList title="Arrivals" items={data.arrivals}
        hint="Due today, or due earlier and not here yet." renderAction={checkInButton} />

      <BookingList title="Departing today" items={data.departingToday} renderAction={checkOutButton} />

      <BookingList title="Staying" items={data.staying} renderAction={checkOutButton} />

      <RoomBoard reloadKey={reloadKey} onChanged={refresh} />
    </>
  );
}

export default FrontDeskPage;
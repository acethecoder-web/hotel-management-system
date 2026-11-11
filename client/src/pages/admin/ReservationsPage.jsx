import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useConfirm } from "../../hooks/useConfirm";
import {
  fetchReservations, confirmReservationRequest, cancelReservationRequest,
} from "../../services/adminService";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";
import CancelReasonDialog from "../../components/CancelReasonDialog";
import { formatDate, formatMoney } from "../../utils/dates";
import useBookingActions from "../../hooks/useBookingActions.js";

const STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "expired"];
const PAGE_SIZE = 10;

function ReservationsPage() {
  const { setUser } = useAuth();
  const confirm = useConfirm();

  const [data, setData] = useState({ reservations: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ q: "", status: "", from: "", to: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchReservations({ ...filters, page, limit: PAGE_SIZE });
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
  }, [filters, page, reloadKey, setUser]);

  const refresh = () => setReloadKey((k) => k + 1);

  const desk = useBookingActions(() => { refresh(); setSelected(null); });

  function changeFilter(name, value) {
    setFilters({ ...filters, [name]: value });
    setPage(1);
  }

  function applySearch(e) {
    e.preventDefault();
    changeFilter("q", search);
  }

  function clearFilters() {
    setFilters({ q: "", status: "", from: "", to: "" });
    setSearch("");
    setPage(1);
  }

  async function run(booking, action) {
    setActionError("");
    setBusyId(booking.id);
    try {
      const updated = await action();
      if (selected?.id === booking.id) setSelected(updated);
      refresh();
    } catch (err) {
      if (err.status === 401) setUser(null);
      else {
        setActionError(err.message); 
        refresh();                   
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirm(b) {
    const ok = await confirm({
      title: `Confirm ${b.bookingReference}?`,
      message: `${b.guest?.name ?? "The guest"} will keep ${b.room?.name ?? "the room"} for ${formatDate(b.checkIn)} to ${formatDate(b.checkOut)}.`,
      confirmLabel: "Confirm booking",
    });
    if (ok) run(b, () => confirmReservationRequest(b.id));
  }

  function handleCancelClosed(reason) {
    const b = cancelTarget;
    setCancelTarget(null);
    if (reason !== null && b) run(b, () => cancelReservationRequest(b.id, reason));
  }

  const hasFilters = Object.values(filters).some(Boolean);
  const canAct = (b) => ["pending", "confirmed"].includes(b.bookingStatus);

  return (
    <>
      <div className="page-header">
        <h1>Reservations</h1>
        <p>Search bookings, confirm pending ones, and cancel when needed.</p>
      </div>

      <div className="toolbar">
        <form className="toolbar__search" onSubmit={applySearch}>
          <input placeholder="Reference, guest name or email" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn--outline">Search</button>
        </form>
        <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <label className="toolbar__date">From
          <input type="date" value={filters.from} onChange={(e) => changeFilter("from", e.target.value)} />
        </label>
        <label className="toolbar__date">To
          <input type="date" min={filters.from || undefined} value={filters.to}
            onChange={(e) => changeFilter("to", e.target.value)} />
        </label>
        {hasFilters && <button className="btn btn--outline" onClick={clearFilters}>Clear</button>}
      </div>

      {actionError && <div className="state state--error">{actionError}</div>}
      {desk.error && <div className="state state--error">{desk.error}</div>}
      {error && <div className="state state--error">Could not load reservations: {error}</div>}

      <p className="muted">{data.total} {data.total === 1 ? "reservation" : "reservations"}</p>

      <div className={`table-wrap ${loading ? "table-wrap--loading" : ""}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th>
              <th>Total</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.reservations.map((b) => (
              <tr key={b.id}>
                <td><code>{b.bookingReference}</code></td>
                <td>{b.guest?.name ?? "Unknown"}<br /><span className="muted">{b.guest?.email}</span></td>
                <td>{b.room?.name ?? "Room"} <span className="muted">#{b.room?.roomNumber}</span></td>
                <td>{formatDate(b.checkIn)} to {formatDate(b.checkOut)}<br />
                  <span className="muted">{b.nights} {b.nights === 1 ? "night" : "nights"}, {b.guestCount} {b.guestCount === 1 ? "guest" : "guests"}</span>
                </td>
                <td>{formatMoney(b.totalPrice)}</td>
                <td><StatusBadge status={b.bookingStatus} /></td>
                <td className="table__actions">
                  <button className="btn btn--outline" onClick={() => setSelected(b)}>Details</button>
                  {b.bookingStatus === "pending" && (
                    <button className="btn btn--primary" disabled={busyId === b.id}
                      onClick={() => handleConfirm(b)}>Confirm</button>
                  )}
                  {canAct(b) && (
                    <button className="btn btn--outline" disabled={busyId === b.id}
                      onClick={() => setCancelTarget(b)}>Cancel</button>
                  )}
                  {b.bookingStatus === "confirmed" && (
  <button className="btn btn--primary" disabled={desk.busyId === b.id}
    onClick={() => desk.checkIn(b)}>Check in</button>
)}
{b.bookingStatus === "checked_in" && (
  <button className="btn btn--primary" disabled={desk.busyId === b.id}
    onClick={() => desk.checkOut(b)}>Check out</button>
)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && data.reservations.length === 0 && (
        <div className="state">No reservations match these filters.</div>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />

      {selected && (
        <aside className="detail-panel" aria-label="Booking details">
          <div className="detail-panel__head">
            <h2>{selected.bookingReference}</h2>
            <button className="btn btn--outline" onClick={() => setSelected(null)}>Close</button>
          </div>
          <StatusBadge status={selected.bookingStatus} />
          <dl className="detail-list">
            <dt>Guest</dt><dd>{selected.guest?.name} ({selected.guest?.email})</dd>
            <dt>Room</dt><dd>{selected.room?.name} #{selected.room?.roomNumber}</dd>
            <dt>Stay</dt><dd>{formatDate(selected.checkIn)} to {formatDate(selected.checkOut)} ({selected.nights} nights)</dd>
            <dt>Guests</dt><dd>{selected.guestCount}</dd>
            <dt>Price</dt><dd>{formatMoney(selected.pricePerNight)} per night, {formatMoney(selected.totalPrice)} total</dd>
            <dt>Payment</dt><dd className="cap">{selected.paymentStatus}</dd>
            <dt>Created</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd>
            {selected.holdExpiresAt && (<><dt>Hold expires</dt><dd>{new Date(selected.holdExpiresAt).toLocaleString()}</dd></>)}
            {selected.confirmedAt && (<><dt>Confirmed</dt><dd>{new Date(selected.confirmedAt).toLocaleString()}</dd></>)}
            {selected.cancelledAt && (<><dt>Cancelled</dt><dd>{new Date(selected.cancelledAt).toLocaleString()}</dd></>)}
            {selected.cancelReason && (<><dt>Reason</dt><dd>{selected.cancelReason}</dd></>)}
            {selected.originalCheckIn && (
  <><dt>Originally booked</dt><dd>{formatDate(selected.originalCheckIn)}</dd></>
)}
          </dl>
        </aside>
      )}

      <CancelReasonDialog booking={cancelTarget} onClose={handleCancelClosed} />
    </>
  );
}

export default ReservationsPage;
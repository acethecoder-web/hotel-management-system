import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { fetchDashboard } from "../../services/adminService";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import { formatDate, formatMoney } from "../../utils/dates";

function DashboardPage() {
  const { setUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const result = await fetchDashboard();
        if (!ignore) setData(result);
      } catch (err) {
        if (err.status === 401) setUser(null); 
        else if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [setUser]);

  if (loading) return <div className="state">Loading dashboard...</div>;
  if (error) return <div className="state state--error">Could not load the dashboard: {error}</div>;

  const { rooms, occupancy } = data;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview for {formatDate(data.date)}</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Payments needing attention" value={data.paymentsNeedingAttention}
  hint="refund failed, fix in PayPal"
  tone={data.paymentsNeedingAttention > 0 ? "warning" : "default"} />
        <StatCard
          label="Occupancy tonight :"
          value={` ${ occupancy.percent} % ` }
          hint={`${occupancy.occupiedTonight} of ${rooms.active} rooms`}
          tone="primary"
        />
        <StatCard label="Arrivals today : " value={data.arrivalsToday} />
        <StatCard label="Departures today : " value={data.departuresToday} />
        <StatCard label="In house now : " value={data.inHouse} hint=" checked-in guests " />
        <StatCard
          label="Awaiting confirmation "
          value={data.pendingConfirmation}
          hint=" pending, hold still active"
          tone={data.pendingConfirmation > 0 ? "warning" : "default"}
        />
        <StatCard label="Arrivals, next 7 days : " value={data.arrivalsNext7Days} />
      </div>
        <br></br>
      <h2 className="section-title">Room status</h2>
      <div className="stat-grid">
        <StatCard label="Available : " value={rooms.status.available} />
        <StatCard label="Occupied : " value={rooms.status.occupied} />
        <StatCard label="Cleaning : " value={rooms.status.cleaning} />
        <StatCard label="Maintenance :" value={rooms.status.maintenance} />
        <StatCard label="Overdue departures: "value={data.overdueDepartures}
          tone={data.overdueDepartures > 0 ? "warning" : "default"}/>
        <StatCard label="Refunds due" value={data.refundsDue} hint="cancelled but still paid"
  tone={data.refundsDue > 0 ? "warning" : "default"} />
      </div>
        <br></br>
      <h2 className="section-title">Recent bookings</h2>
      {data.recentBookings.length === 0 ? (
        <div className="state">No bookings yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th><th>Status</th><th>Total</th></tr>
            </thead>
            <tbody>
              {data.recentBookings.map((b) => (
                <tr key={b.id}>
                  <td><code>{b.bookingReference}</code></td>
                  <td>{b.guestName}</td>
                  <td>{b.roomName} <span className="muted">#{b.roomNumber}</span></td>
                  <td>{formatDate(b.checkIn)} to {formatDate(b.checkOut)}</td>
                  <td><StatusBadge status={b.bookingStatus} /></td>
                  <td>{formatMoney(b.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default DashboardPage;
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { fetchReport } from "../../services/adminService";
import StatCard from "../../components/StatCard";
import BarChart from "../../components/BarChart";
import { addDays, formatMoney, todayISO } from "../../utils/dates";

function ReportsPage() {
  const { setUser } = useAuth();
  const today = todayISO();

  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!range.from || !range.to) return;
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchReport(range);
        if (!ignore) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (err.status === 401) setUser(null);
        else if (!ignore) {
          setData(null);
          setError(err.message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [range, setUser]);

  function preset(days) {
    setRange({ from: addDays(today, -(days - 1)), to: today });
  }

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Occupancy and booked revenue. Cancelled, expired, and pending bookings are not counted.</p>
      </div>

      <div className="toolbar">
        <label className="toolbar__date">From
          <input type="date" value={range.from} max={range.to || undefined}
            onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </label>
        <label className="toolbar__date">To
          <input type="date" value={range.to} min={range.from || undefined}
            onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </label>
        <button className="btn btn--outline" onClick={() => preset(7)}>Last 7 days</button>
        <button className="btn btn--outline" onClick={() => preset(30)}>Last 30 days</button>
        <button className="btn btn--outline" onClick={() => preset(90)}>Last 90 days</button>
      </div>

      {error && <div className="state state--error">{error}</div>}
      {loading && !data && <div className="state">Loading report...</div>}

      {data && (
        <div className={loading ? "table-wrap--loading" : ""}>
          <div className="stat-grid">
            <StatCard label="Occupancy" value={`${data.occupancyPercent}%`}
              hint={`${data.roomNights} of ${data.availableRoomNights} room-nights`} tone="primary" />
            <StatCard label="Booked revenue" value={formatMoney(data.revenue)}
              hint={`${data.days} ${data.days === 1 ? "day" : "days"}`} />
            <StatCard label="Average daily rate" value={formatMoney(data.averageDailyRate)}
              hint="revenue per room-night sold" />
          </div>

          <h2 className="section-title">Daily</h2>
          <BarChart data={data.daily} valueKey="occupancyPercent" label="Occupancy % per night"
            format={(v) => `${v}%`} />
          <BarChart data={data.daily} valueKey="revenue" label="Revenue per night" format={formatMoney} />

          <h2 className="section-title">Top rooms by revenue</h2>
          {data.topRooms.length === 0 ? (
            <div className="state">No bookings in this range.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Room</th><th>Room-nights</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.topRooms.map((r) => (
                    <tr key={r.roomNumber}>
                      <td>{r.name} <span className="muted">#{r.roomNumber}</span></td>
                      <td>{r.roomNights}</td>
                      <td>{formatMoney(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ReportsPage;
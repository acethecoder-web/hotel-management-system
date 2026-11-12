import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchAuditLogs } from "../services/userService";
import Pagination from "./Pagination";

const ACTIONS = [
  "user.create", "user.update", "user.archive", "user.restore",
  "user.reset_password", "auth.login", "auth.change_password",
  "booking.confirm", "booking.cancel",
  "booking.check_in", "booking.check_out", "room.status"
  ,"auth.login_failed", "payment.paypal" , "payment.paypal_auto_refund" 
  , "payment.paypal_refund_failed"
];

function AuditLogTab() {
  const { setUser } = useAuth();
  const [data, setData] = useState({ logs: [], pages: 1 });
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchAuditLogs({ action, page, limit: 5 });
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
    return () => {
      ignore = true;
    };
  }, [action, page, setUser]);

  return (
    <>
      <div className="toolbar">
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="state state--error">
          Could not load the log: {error}
        </div>
      )}

      <div className={`table-wrap ${loading ? "table-wrap--loading" : ""}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((log) => (
              <tr key={log._id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>
                  {log.actorName}
                  <br />
                  <span className="muted">{log.actorEmail}</span>
                </td>
                <td>
                  <code>{log.action}</code>
                </td>
                <td>{log.targetEmail || "—"}</td>

                <td className="muted">
                  {Object.keys(log.details || {}).length
                    ? JSON.stringify(log.details)
                    : "—"}
                </td>
                <td className="muted">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && data.logs.length === 0 && (
        <div className="state">No log entries yet.</div>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}

export default AuditLogTab;

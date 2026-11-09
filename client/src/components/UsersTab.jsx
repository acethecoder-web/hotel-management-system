import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  fetchUsers,
  createUserRequest,
  updateUserRequest,
  setArchivedRequest,
  resetPasswordRequest,
} from "../services/userService";
import StatusBadge from "./StatusBadge";
import UserForm from "./UserForm";
import TempPasswordBox from "./TempPasswordBox";
import Pagination from "./Pagination";

function UsersTab() {
  const { setUser } = useAuth();

  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ q: "", role: "", active: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formUser, setFormUser] = useState(undefined); 
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tempInfo, setTempInfo] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchUsers({ ...filters, page, limit: 5 });
        if (!ignore) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (err.status === 401)
          setUser(null); 
        else if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [filters, page, reloadKey, setUser]);

  const refresh = () => setReloadKey((k) => k + 1);

  function applySearch(e) {
    e.preventDefault();
    setFilters({ ...filters, q: search });
    setPage(1);
  }

  function changeFilter(name, value) {
    setFilters({ ...filters, [name]: value });
    setPage(1);
  }

  async function handleSave(values) {
    setSaving(true);
    setFormError("");
    try {
      if (formUser === null) {
        const { user, tempPassword } = await createUserRequest(values);
        setTempInfo({ email: user.email, tempPassword });
      } else {
        const changes = {};
        for (const key of ["name", "email", "role"]) {
          if (values[key] !== formUser[key]) changes[key] = values[key];
        }
        if (Object.keys(changes).length === 0) {
          setFormError("Nothing was changed");
          return;
        }
        await updateUserRequest(formUser.id, changes);
      }
      setFormUser(undefined);
      refresh();
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action) {
    setActionError("");
    try {
      await action();
      refresh();
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setActionError(err.message);
    }
  }

  function handleArchive(u) {
    const verb = u.active ? "Archive" : "Restore";
    if (!window.confirm(`${verb} ${u.name}?`)) return;
    runAction(() => setArchivedRequest(u.id, u.active)); 
  }

  function handleReset(u) {
    if (
      !window.confirm(
        `Reset the password for ${u.name}? They will be logged out.`,
      )
    )
      return;
    runAction(async () => {
      const { user, tempPassword } = await resetPasswordRequest(u.id);
      setTempInfo({ email: user.email, tempPassword });
    });
  }

  return (
    <>
      {tempInfo && (
        <TempPasswordBox {...tempInfo} onDismiss={() => setTempInfo(null)} />
      )}

      {formUser !== undefined ? (
        <UserForm
          key={formUser?.id ?? "new"}
          user={formUser}
          onSubmit={handleSave}
          onCancel={() => {
            setFormUser(undefined);
            setFormError("");
          }}
          submitting={saving}
          error={formError}
        />
      ) : (
        <div className="toolbar">
          <form className="toolbar__search" onSubmit={applySearch}>
            <input
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn--outline">Search</button>
          </form>
          <select
            value={filters.role}
            onChange={(e) => changeFilter("role", e.target.value)}
          >
            <option value="">All roles</option>
            <option value="guest">Guest</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <select
            value={filters.active}
            onChange={(e) => changeFilter("active", e.target.value)}
          >
            <option value="">Active and archived</option>
            <option value="true">Active only</option>
            <option value="false">Archived only</option>
          </select>
          <button
            className="btn btn--primary"
            onClick={() => setFormUser(null)}
          >
            + New account
          </button>
        </div>
      )}

      {actionError && <div className="state state--error">{actionError}</div>}
      {error && (
        <div className="state state--error">Could not load users: {error}</div>
      )}

      <div className={`table-wrap ${loading ? "table-wrap--loading" : ""}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td className="cap">{u.role}</td>
                <td>
                  <StatusBadge status={u.active ? "active" : "archived"} />
                  {u.mustChangePassword && (
                    <span className="badge badge--cleaning">temp password</span>
                  )}
                </td>
                <td className="table__actions">
                  {u.role === "superadmin" ? (
                    <span className="muted">Protected</span>
                  ) : (
                    <>
                      <button
                        className="btn btn--outline"
                        onClick={() => setFormUser(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn--outline"
                        onClick={() => handleArchive(u)}
                      >
                        {u.active ? "Archive" : "Restore"}
                      </button>
                      <button
                        className="btn btn--outline"
                        onClick={() => handleReset(u)}
                      >
                        Reset password
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && data.users.length === 0 && (
        <div className="state">No accounts match these filters.</div>
      )}

      <Pagination page={page} pages={data.pages} onChange={setPage} />
    </>
  );
}

export default UsersTab;

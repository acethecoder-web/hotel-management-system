import { useState } from "react";

function UserForm({ user, onSubmit, onCancel, submitting, error }) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "guest",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <h2>{user ? `Edit ${user.name}` : "Create account"}</h2>
      {error && <div className="state state--error">{error}</div>}

      <div className="field">
        <label htmlFor="uf-name">Full name</label>
        <input
          id="uf-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="uf-email">Email</label>
        <input
          id="uf-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="uf-role">Role</label>
        <select
          id="uf-role"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="guest">Guest</option>
          <option value="admin">Admin (hotel staff)</option>
        </select>
        {user && (
          <small>Changing the role logs the user out of all sessions.</small>
        )}
      </div>

      <div className="user-form__actions">
        <button className="btn btn--primary" disabled={submitting}>
          {submitting ? "Saving..." : user ? "Save changes" : "Create account"}
        </button>
        <button type="button" className="btn btn--outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default UserForm;

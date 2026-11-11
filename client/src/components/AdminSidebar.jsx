import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/admin", label: "Dashboard", end: true, ready: true },
  { to: "/admin/rooms", label: "Rooms", ready: true },
  { to: "/admin/reservations", label: "Reservations", ready: true },
  { to: "/admin/front-desk", label: "Front desk", ready: true },
];

function AdminSidebar() {
  return (
    <nav className="sidebar" aria-label="Admin">
      {ITEMS.map((item) =>
        item.ready ? (
          <NavLink key={item.to} to={item.to} end={item.end} className="sidebar__link">
            {item.label}
          </NavLink>
        ) : (
          <span key={item.to} className="sidebar__link sidebar__link--soon">
            {item.label} <small>soon</small>
          </span>
        )
      )}
    </nav>
  );
}

export default AdminSidebar;
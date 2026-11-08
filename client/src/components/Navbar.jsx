import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          HME Hotel
        </Link>

        <nav className="navbar__links">
          <NavLink to="/rooms" className="navbar__link">
            Rooms
          </NavLink>

          {!loading && !user && (
            <>
              <NavLink to="/login" className="navbar__link">
                Log in
              </NavLink>
              <NavLink to="/register" className="navbar__link">
                Register
              </NavLink>
            </>
          )}

          {user && (
            <>
              {user.role === "admin" && (
                <NavLink to="/admin" className="navbar__link">
                  Admin
                </NavLink>
              )}

              {user.role === "superadmin" && (
                <NavLink to="/superadmin" className="navbar__link">
                  Accounts
                </NavLink>
              )}

              {user.role === "guest" && (
                <NavLink to="/my-bookings" className="navbar__link">
                  My bookings
                </NavLink>
              )}

              <NavLink to="/change-password" className="navbar__link">
                Change password
              </NavLink>

              <span className="navbar__user">
                Hi, {user.name.split(" ")[0]}
              </span>
              <button className="btn btn--outline" onClick={logout}>
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;

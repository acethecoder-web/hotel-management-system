import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const { user, loading, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          HME Hotel Management System
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

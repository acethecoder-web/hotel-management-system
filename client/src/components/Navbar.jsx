import { Link, NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">🏨 Harbor Hotel</Link>
        <nav className="navbar__links">
          <NavLink to="/rooms" className="navbar__link">Rooms</NavLink>
          {/* Phase 3 adds Login / My Bookings / Admin here */}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
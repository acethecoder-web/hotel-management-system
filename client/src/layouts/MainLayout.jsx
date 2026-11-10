import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} HME Hotel Management System
          <h4>Love Joyce Batuto 2026 @ DCC </h4>
        </div>
      </footer>
    </>
  );
}

export default MainLayout;

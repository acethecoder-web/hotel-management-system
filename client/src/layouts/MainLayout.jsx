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
        </div>
      </footer>
    </>
  );
}

export default MainLayout;

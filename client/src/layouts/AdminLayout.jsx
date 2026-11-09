import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

function AdminLayout() {
  return (
    <div className="admin">
      <AdminSidebar />
      <section className="admin__content">
        <Outlet />
      </section>
    </div>
  );
}

export default AdminLayout;
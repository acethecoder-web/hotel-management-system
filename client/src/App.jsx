import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AccountsPage from "./pages/AccountsPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AdminRoomsPage from "./pages/admin/AdminRoomsPage";
import ReservationsPage from "./pages/admin/ReservationsPage";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/rooms" replace />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:id" element={<RoomDetailsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route path="/superadmin" element={<AccountsPage />} />
        </Route>

<Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
  <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="rooms" element={<AdminRoomsPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
  </Route>
</Route>

        <Route element={<ProtectedRoute allowedRoles={["guest"]} />}>
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Route>
        <Route path="*" element={<div className="state">Page not found</div>} />
      </Route>
    </Routes>
  );
}

export default App;

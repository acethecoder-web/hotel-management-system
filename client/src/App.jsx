import { Routes, Route, Navigate } from "react-router-dom";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailsPage from "./pages/RoomDetailsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/rooms" replace />} />
      <Route path="/rooms" element={<RoomsPage />} />
      <Route path="/rooms/:id" element={<RoomDetailsPage />} />
      <Route path="*" element={<p>Page not found</p>} />
    </Routes>
  );
}

export default App;
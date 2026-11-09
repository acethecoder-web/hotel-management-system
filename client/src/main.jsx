import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/rooms.css";
import "./styles/auth.css";
import "./styles/accounts.css";
import "./styles/booking.css";
import "./styles/admin.css";
import { AuthProvider } from "./context/AuthProvider";
import { ConfirmProvider } from "./context/ConfirmProvider";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

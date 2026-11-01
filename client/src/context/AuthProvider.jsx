import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  loginRequest,
  logoutRequest,
  meRequest,
} from "../services/authService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until /me answers

  useEffect(() => {
    async function checkSession() {
      try {
        setUser(await meRequest());
      } catch {
        setUser(null); // 401 just means "not logged in"
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  async function login(credentials) {
    const loggedIn = await loginRequest(credentials);
    setUser(loggedIn);
    return loggedIn;
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }

  const value = { user, setUser, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

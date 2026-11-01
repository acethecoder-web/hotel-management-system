import { api } from "./api";

export const registerRequest = (data) =>
  api("/api/auth/register", { method: "POST", body: data });

export const loginRequest = (data) =>
  api("/api/auth/login", { method: "POST", body: data });

export const logoutRequest = () => api("/api/auth/logout", { method: "POST" });

export const meRequest = () => api("/api/auth/me");

export const changePasswordRequest = (data) =>
  api("/api/auth/change-password", { method: "POST", body: data });

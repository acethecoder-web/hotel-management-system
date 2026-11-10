import { api } from "./api";

export const fetchDashboard = () => api("/api/admin/dashboard");

export const fetchAdminRooms = () => api("/api/admin/rooms");

export const createRoomRequest = (data) =>
  api("/api/admin/rooms", { method: "POST", body: data });

export const updateRoomRequest = (id, data) =>
  api(`/api/admin/rooms/${id}`, { method: "PATCH", body: data });

export const setRoomActiveRequest = (id, active) =>
  api(`/api/admin/rooms/${id}/active`, { method: "PATCH", body: { active } });
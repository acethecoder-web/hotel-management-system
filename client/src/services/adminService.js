import { api } from "./api";

export const fetchDashboard = () => api("/api/admin/dashboard");

export const fetchAdminRooms = () => api("/api/admin/rooms");

export const createRoomRequest = (data) =>
  api("/api/admin/rooms", { method: "POST", body: data });

export const updateRoomRequest = (id, data) =>
  api(`/api/admin/rooms/${id}`, { method: "PATCH", body: data });

export const setRoomActiveRequest = (id, active) =>
  api(`/api/admin/rooms/${id}/active`, { method: "PATCH", body: { active } }); 

export function uploadRoomImages(id, files) {
  const form = new FormData();
  files.forEach((file) => form.append("images", file)); // field name must match upload.array("images")
  return api(`/api/admin/rooms/${id}/images`, { method: "POST", body: form });
}

export const removeRoomImageRequest = (id, publicId) =>
  api(`/api/admin/rooms/${id}/images?${new URLSearchParams({ publicId })}`, { method: "DELETE" });

export const setCoverImageRequest = (id, publicId) =>
  api(`/api/admin/rooms/${id}/images/cover`, { method: "PATCH", body: { publicId } });

export const fetchReservations = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) search.set(k, v);
  });
  return api(`/api/admin/reservations?${search}`);
};

export const confirmReservationRequest = (id) =>
  api(`/api/admin/reservations/${id}/confirm`, { method: "POST" });

export const cancelReservationRequest = (id, reason) =>
  api(`/api/admin/reservations/${id}/cancel`, { method: "POST", body: { reason } });

export const fetchFrontDesk = () => api("/api/admin/front-desk");

export const checkInRequest = (id, acknowledgeWarnings = false) =>
  api(`/api/admin/reservations/${id}/check-in`, { method: "POST", body: { acknowledgeWarnings } });

export const checkOutRequest = (id) =>
  api(`/api/admin/reservations/${id}/check-out`, { method: "POST" });

export const setRoomStatusRequest = (id, status) =>
  api(`/api/admin/rooms/${id}/status`, { method: "PATCH", body: { status } });

export const fetchReport = ({ from, to }) =>
  api(`/api/admin/reports?${new URLSearchParams({ from, to })}`);
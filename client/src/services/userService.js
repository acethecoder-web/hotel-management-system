import { api } from "./api";

function qs(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const fetchUsers = (params) => api(`/api/users${qs(params)}`);

export const createUserRequest = (data) =>
  api("/api/users", { method: "POST", body: data });

export const updateUserRequest = (id, data) =>
  api(`/api/users/${id}`, { method: "PATCH", body: data });

export const setArchivedRequest = (id, archived) =>
  api(`/api/users/${id}/archive`, { method: "PATCH", body: { archived } });

export const resetPasswordRequest = (id) =>
  api(`/api/users/${id}/reset-password`, { method: "POST" });

export const fetchAuditLogs = (params) => api(`/api/audit-logs${qs(params)}`);

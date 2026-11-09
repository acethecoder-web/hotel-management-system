import { api } from "./api";

export const fetchDashboard = () => api("/api/admin/dashboard");
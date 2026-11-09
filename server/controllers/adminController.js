import * as adminService from "../services/adminService.js";

export async function getDashboard(req, res) {
  try {
    res.json(await adminService.getDashboard());
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ message: "Could not load the dashboard" });
  }
}
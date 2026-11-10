import * as adminService from "../services/adminService.js";

export async function getDashboard(req, res) {
  try {
    res.json(await adminService.getDashboard());
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ message: "Could not load the dashboard" });
  }
}

function handleError(res, error, label) {
  if (error.status) return res.status(error.status).json({ message: error.message });

  if (error.name === "ValidationError") {
    const message = Object.values(error.errors).map((e) => e.message).join(", ");
    return res.status(400).json({ message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "That room number already exists" });
  }

  console.error(`${label} error:`, error);
  res.status(500).json({ message: "Something went wrong" });
}

export async function listRooms(req, res) {
  try {
    res.json(await adminService.listRooms());
  } catch (error) {
    handleError(res, error, "listRooms");
  }
}

export async function createRoom(req, res) {
  try {
    res.status(201).json(await adminService.createRoom(req.body));
  } catch (error) {
    handleError(res, error, "createRoom");
  }
}

export async function updateRoom(req, res) {
  try {
    res.json(await adminService.updateRoom(req.params.id, req.body));
  } catch (error) {
    handleError(res, error, "updateRoom");
  }
}

export async function setRoomActive(req, res) {
  try {
    res.json(await adminService.setRoomActive(req.params.id, req.body.active));
  } catch (error) {
    handleError(res, error, "setRoomActive");
  }
}
import * as adminService from "../services/adminService.js";
import { logAction } from "../services/auditService.js";

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

export async function addRoomImages(req, res) {
  try {
    const { room, failed } = await adminService.addRoomImages(req.params.id, req.files);
    res.status(201).json({ room, failed });
  } catch (error) {
    handleError(res, error, "addRoomImages");
  }
}

export async function removeRoomImage(req, res) {
  try {
    res.json(await adminService.removeRoomImage(req.params.id, req.query.publicId));
  } catch (error) {
    handleError(res, error, "removeRoomImage");
  }
}

export async function setCoverImage(req, res) {
  try {
    res.json(await adminService.setCoverImage(req.params.id, req.body.publicId));
  } catch (error) {
    handleError(res, error, "setCoverImage");
  }
}

export async function listReservations(req, res) {
  try {
    res.json(await adminService.listReservations(req.query));
  } catch (error) {
    handleError(res, error, "listReservations");
  }
}

export async function getReservation(req, res) {
  try {
    res.json(await adminService.getReservation(req.params.id));
  } catch (error) {
    handleError(res, error, "getReservation");
  }
}

export async function confirmReservation(req, res) {
  try {
    const booking = await adminService.confirmReservation(req.params.id, req.user._id);
    await logAction({
      actor: req.user,
      action: "booking.confirm",
      target: booking.guest ? { _id: booking.guest.id, email: booking.guest.email } : undefined,
      details: { bookingReference: booking.bookingReference },
      req,
    });
    res.json(booking);
  } catch (error) {
    handleError(res, error, "confirmReservation");
  }
}

export async function cancelReservation(req, res) {
  try {
    const booking = await adminService.cancelReservation(req.params.id, req.user._id, req.body.reason);
    await logAction({
      actor: req.user,
      action: "booking.cancel",
      target: booking.guest ? { _id: booking.guest.id, email: booking.guest.email } : undefined,
      details: { bookingReference: booking.bookingReference, reason: booking.cancelReason },
      req,
    });
    res.json(booking);
  } catch (error) {
    handleError(res, error, "cancelReservation");
  }
}
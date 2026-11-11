import * as adminService from "../services/adminService.js";
import * as frontDesk from "../services/frontDeskService.js";
import { logAction } from "../services/auditService.js";
import * as reportService from "../services/reportService.js";
import * as payments from "../services/paymentService.js";

export async function getDashboard(req, res) {
  try {
    res.json(await adminService.getDashboard());
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ message: "Could not load the dashboard" });
  }
}

function handleError(res, error, label) {
if (error.status) return res.status(error.status).json({ message: error.message, ...error.extra });
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


export async function getFrontDesk(req, res) {
  try {
    res.json(await frontDesk.getFrontDesk());
  } catch (error) {
    handleError(res, error, "getFrontDesk");
  }
}

export async function checkInReservation(req, res) {
  try {
    const acknowledge = req.body.acknowledgeWarnings === true;
    const { booking, warnings, earlyDays } = await frontDesk.checkIn(req.params.id, req.user._id, acknowledge);
    await logAction({
      actor: req.user,
      action: "booking.check_in",
      target: booking.guest ? { _id: booking.guest.id, email: booking.guest.email } : undefined,
      details: { bookingReference: booking.bookingReference, earlyDays, warnings },
      req,
    });
    res.json(booking);
  } catch (error) {
    handleError(res, error, "checkInReservation");
  }
}

export async function checkOutReservation(req, res) {
  try {
    const booking = await frontDesk.checkOut(req.params.id, req.user._id);
    await logAction({
      actor: req.user,
      action: "booking.check_out",
      target: booking.guest ? { _id: booking.guest.id, email: booking.guest.email } : undefined,
      details: { bookingReference: booking.bookingReference },
      req,
    });
    res.json(booking);
  } catch (error) {
    handleError(res, error, "checkOutReservation");
  }
}

export async function setRoomStatus(req, res) {
  try {
    const room = await frontDesk.setRoomStatus(req.params.id, req.body.status);
    await logAction({
      actor: req.user,
      action: "room.status",
      details: { roomNumber: room.roomNumber, status: room.operationalStatus },
      req,
    });
    res.json(room);
  } catch (error) {
    handleError(res, error, "setRoomStatus");
  }
}

export async function getReport(req, res) {
  try {
    res.json(await reportService.getReport({ from: req.query.from, to: req.query.to }));
  } catch (error) {
    handleError(res, error, "getReport");
  }
}

const guestTarget = (b) => (b.guest ? { _id: b.guest.id, email: b.guest.email } : undefined);

export async function listPayments(req, res) {
  try {
    res.json(await payments.listPayments(req.params.id));
  } catch (error) {
    handleError(res, error, "listPayments");
  }
}

export async function recordCashPayment(req, res) {
  try {
    const { booking, payment } = await payments.recordCashPayment(req.params.id, req.user._id, req.body.note);
    await logAction({
      actor: req.user, action: "payment.cash", target: guestTarget(booking),
      details: { bookingReference: booking.bookingReference, amount: payment.amount, currency: payment.currency },
      req,
    });
    res.status(201).json({ booking, payment: payments.toPayment(payment) });
  } catch (error) {
    handleError(res, error, "recordCashPayment");
  }
}

export async function recordRefund(req, res) {
  try {
    const { booking, payment } = await payments.recordCashRefund(req.params.id, req.user._id, req.body.note);
    await logAction({
      actor: req.user, action: "payment.refund", target: guestTarget(booking),
      details: { bookingReference: booking.bookingReference, amount: payment.amount, method: "cash" },
      req,
    });
    res.json({ booking, payment: payments.toPayment(payment) });
  } catch (error) {
    handleError(res, error, "recordRefund");
  }
}
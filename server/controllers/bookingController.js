import * as bookingService from "../services/bookingService.js";

function handleError(res, error, label) {
  if (error.status)
    return res.status(error.status).json({ message: error.message });

  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }

  console.error(`${label} error:`, error);
  res.status(500).json({ message: "Something went wrong" });
}

export async function searchAvailability(req, res) {
  try {
    const { checkIn, checkOut, guests } = req.query;
    res.json(
      await bookingService.searchAvailableRooms({ checkIn, checkOut, guests }),
    );
  } catch (error) {
    handleError(res, error, "searchAvailability");
  }
}

export async function createBooking(req, res) {
  // Only these four fields are read. Price, status, userId, etc. are never taken from the client.
  const { roomId, checkIn, checkOut, guestCount } = req.body;
  try {
    const booking = await bookingService.createBooking(req.user._id, {
      roomId,
      checkIn,
      checkOut,
      guestCount,
    });
    res.status(201).json(booking);
  } catch (error) {
    handleError(res, error, "createBooking");
  }
}

export async function listMyBookings(req, res) {
  try {
    res.json(await bookingService.listMyBookings(req.user._id));
  } catch (error) {
    handleError(res, error, "listMyBookings");
  }
}

export async function cancelBooking(req, res) {
  try {
    res.json(await bookingService.cancelBooking(req.user._id, req.params.id));
  } catch (error) {
    handleError(res, error, "cancelBooking");
  }
}

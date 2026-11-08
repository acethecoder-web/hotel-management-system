import { api } from "./api";

export const searchAvailability = ({ checkIn, checkOut, guests }) =>
  api(
    `/api/rooms/availability?${new URLSearchParams({ checkIn, checkOut, guests })}`,
  );

export const createBookingRequest = ({
  roomId,
  checkIn,
  checkOut,
  guestCount,
}) =>
  api("/api/bookings", {
    method: "POST",
    body: { roomId, checkIn, checkOut, guestCount },
  });

export const fetchMyBookings = () => api("/api/bookings/mine");

export const cancelBookingRequest = (id) =>
  api(`/api/bookings/${id}/cancel`, { method: "POST" });

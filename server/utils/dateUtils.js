import { httpError } from "./httpError.js";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `${label} must be a date in YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw httpError(400, `${label} is not a real date`);
  }
  return date;
}

export function hotelToday() {
  const text = new Date().toLocaleDateString("en-CA", {
    timeZone: process.env.HOTEL_TIME_ZONE || "Asia/Manila",
  });
  return new Date(`${text}T00:00:00.000Z`);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((checkOut - checkIn) / DAY_MS);
}

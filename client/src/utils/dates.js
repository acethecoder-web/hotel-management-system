const HOTEL_TZ = import.meta.env.VITE_HOTEL_TIME_ZONE || "Asia/Manila";
const DAY_MS = 24 * 60 * 60 * 1000;

export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: HOTEL_TZ });
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((new Date(checkOut) - new Date(checkIn)) / DAY_MS);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(amount) {
  return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

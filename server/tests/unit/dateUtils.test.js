import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDateOnly, nightsBetween, hotelToday, timeToMinutes } from "../../utils/dateUtils.js";

test("parseDateOnly accepts a real date as UTC midnight", () => {
  assert.equal(parseDateOnly("2026-12-10", "Check-in").toISOString(), "2026-12-10T00:00:00.000Z");
});

test("parseDateOnly rejects malformed and impossible dates", () => {
  const bad = ["2026-02-31", "2026-13-01", "12/10/2026", "2026-1-5", "", undefined, null, 20261210, "2026-12-10T10:00:00Z"];
  for (const value of bad) {
    assert.throws(
      () => parseDateOnly(value, "Date"),
      (err) => err.status === 400,
      `should reject ${String(value)}`
    );
  }
});

test("nightsBetween counts nights, not days", () => {
  const d = (s) => parseDateOnly(s, "d");
  assert.equal(nightsBetween(d("2026-12-10"), d("2026-12-13")), 3);
  assert.equal(nightsBetween(d("2026-12-31"), d("2027-01-02")), 2);
});

test("hotelToday is a UTC midnight, so it compares with stored dates", () => {
  const today = hotelToday();
  assert.equal(today.getUTCHours(), 0);
  assert.equal(today.getUTCMinutes(), 0);
  assert.equal(today.getUTCMilliseconds(), 0);
});

test("timeToMinutes converts HH:MM", () => {
  assert.equal(timeToMinutes("12:00"), 720);
  assert.equal(timeToMinutes("00:05"), 5);
  assert.equal(timeToMinutes("23:59"), 1439);
});
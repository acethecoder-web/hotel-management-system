import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { httpError } from "../utils/httpError.js";
import { DAY_MS, parseDateOnly } from "../utils/dateUtils.js";

const COUNTED = ["confirmed", "checked_in", "checked_out"];
const MAX_DAYS = 366;

const iso = (date) => date.toISOString().slice(0, 10);

export async function getReport({ from, to }) {
  const start = parseDateOnly(from, "From");
  const end = parseDateOnly(to, "To");
  if (end < start) throw httpError(400, "'To' must be on or after 'From'");

  const days = Math.round((end - start) / DAY_MS) + 1; // inclusive
  if (days > MAX_DAYS) throw httpError(400, `Reports are limited to ${MAX_DAYS} days`);

  const rangeEnd = new Date(end.getTime() + DAY_MS); // exclusive end

  const [activeRooms, perStay] = await Promise.all([
    Room.countDocuments({ active: true }),

    Booking.aggregate([
      {
        $match: {
          bookingStatus: { $in: COUNTED },
          checkIn: { $lt: rangeEnd },
          checkOut: { $gt: start },
        },
      },
      {
        // nights of this stay that fall inside the range
        $addFields: {
          overlapStart: { $max: ["$checkIn", start] },
          overlapEnd: { $min: ["$checkOut", rangeEnd] },
        },
      },
      {
        $addFields: {
          nightsInRange: {
            $max: [0, { $dateDiff: { startDate: "$overlapStart", endDate: "$overlapEnd", unit: "day" } }],
          },
        },
      },
      {
        $project: {
          roomId: 1,
          pricePerNight: 1,
          overlapStart: 1,
          nightsInRange: 1,
          revenue: { $multiply: ["$nightsInRange", "$pricePerNight"] },
        },
      },
    ]),
  ]);

  // One row per night in the range, filled from the stays
  const daily = Array.from({ length: days }, (_, i) => ({
    date: iso(new Date(start.getTime() + i * DAY_MS)),
    roomNights: 0,
    revenue: 0,
  }));

  let roomNights = 0;
  let revenue = 0;
  const byRoom = new Map();

  for (const stay of perStay) {
    const first = Math.round((stay.overlapStart - start) / DAY_MS);
    for (let n = 0; n < stay.nightsInRange; n++) {
      const row = daily[first + n];
      if (row) {
        row.roomNights += 1;
        row.revenue += stay.pricePerNight;
      }
    }
    roomNights += stay.nightsInRange;
    revenue += stay.revenue;

    const key = String(stay.roomId);
    const entry = byRoom.get(key) ?? { roomId: stay.roomId, roomNights: 0, revenue: 0 };
    entry.roomNights += stay.nightsInRange;
    entry.revenue += stay.revenue;
    byRoom.set(key, entry);
  }

  const available = activeRooms * days;
  const rooms = await Room.find({ _id: { $in: [...byRoom.values()].map((r) => r.roomId) } })
    .select("name roomNumber");
  const roomInfo = new Map(rooms.map((r) => [String(r._id), r]));

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    from,
    to,
    days,
    activeRooms,
    roomNights,
    availableRoomNights: available,
    occupancyPercent: available ? Math.round((roomNights / available) * 1000) / 10 : 0,
    revenue: round2(revenue),
    averageDailyRate: roomNights ? round2(revenue / roomNights) : 0,
    daily: daily.map((d) => ({
      ...d,
      revenue: round2(d.revenue),
      occupancyPercent: activeRooms ? Math.round((d.roomNights / activeRooms) * 100) : 0,
    })),
    topRooms: [...byRoom.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((r) => ({
        name: roomInfo.get(String(r.roomId))?.name ?? "Room",
        roomNumber: roomInfo.get(String(r.roomId))?.roomNumber,
        roomNights: r.roomNights,
        revenue: round2(r.revenue),
      })),
  };
}
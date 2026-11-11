import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import app from "../../app.js";
import User from "../../models/User.js";
import Booking from "../../models/Booking.js";
import AuditLog from "../../models/AuditLog.js";
import {
  connectTestDb, disconnectTestDb, resetDb, makeUser, makeRoom, makeBooking, dayOffset, PASSWORD,
} from "./helpers.js";

let server;
let base;

before(async () => {
  await connectTestDb();
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await disconnectTestDb();
});

beforeEach(resetDb);

async function call(path, { method = "GET", body, cookie, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
          Connection: "close",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("token="));
  return {
    status: res.status,
    body: await res.json().catch(() => null),
    setCookie,
    cookie: setCookie?.split(";")[0], // "token=abc" is what we send back
  };
}

const login = (email, password = PASSWORD) =>
  call("/api/auth/login", { method: "POST", body: { email, password } });

test("registration always creates a guest and never returns the hash", async () => {
  const res = await call("/api/auth/register", {
    method: "POST",
    body: { name: "Ana Cruz", email: "Ana@Mail.com", password: PASSWORD, role: "superadmin" },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.role, "guest");
  assert.equal("passwordHash" in res.body, false);
  assert.equal((await User.findOne({ email: "ana@mail.com" })).role, "guest");

  const duplicate = await call("/api/auth/register", {
    method: "POST", body: { name: "Ana Two", email: "ANA@mail.com", password: PASSWORD },
  });
  assert.equal(duplicate.status, 409);

  const weak = await call("/api/auth/register", {
    method: "POST", body: { name: "Weak", email: "weak@mail.com", password: "abc" },
  });
  assert.equal(weak.status, 400);
});

test("login gives the same answer for a wrong password and an unknown email", async () => {
  const user = await makeUser();
  const wrong = await login(user.email, "Wrong#Pass1");
  const unknown = await login("nobody@test.com", "Wrong#Pass1");
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test("login sets an HttpOnly cookie that unlocks /me", async () => {
  const user = await makeUser();
  const res = await login(user.email);
  assert.equal(res.status, 200);
  assert.match(res.setCookie, /HttpOnly/i);
  assert.equal("passwordHash" in res.body, false);

  const me = await call("/api/auth/me", { cookie: res.cookie });
  assert.equal(me.body.email, user.email);
  assert.equal((await call("/api/auth/me")).status, 401);
});

test("archiving a user or bumping tokenVersion ends their session", async () => {
  const archived = await makeUser();
  const bumped = await makeUser();
  const a = await login(archived.email);
  const b = await login(bumped.email);

  await User.updateOne({ _id: archived._id }, { active: false });
  await User.updateOne({ _id: bumped._id }, { $inc: { tokenVersion: 1 } });

  assert.equal((await call("/api/auth/me", { cookie: a.cookie })).status, 401);
  assert.equal((await call("/api/auth/me", { cookie: b.cookie })).status, 401);
  assert.equal((await login(archived.email)).status, 401);
});

test("changing the password issues a fresh cookie and kills the old one", async () => {
  const user = await makeUser();
  const old = await login(user.email);

  const res = await call("/api/auth/change-password", {
    method: "POST", cookie: old.cookie,
    body: { currentPassword: PASSWORD, newPassword: "NewSecret#456" },
  });
  assert.equal(res.status, 200);
  assert.ok(res.cookie, "a new cookie should be issued");

  assert.equal((await call("/api/auth/me", { cookie: res.cookie })).status, 200);
  assert.equal((await call("/api/auth/me", { cookie: old.cookie })).status, 401);
  assert.equal((await login(user.email, PASSWORD)).status, 401);
  assert.equal((await login(user.email, "NewSecret#456")).status, 200);
});

test("a user who must change their password is locked out of everything else", async () => {
  const user = await makeUser({ mustChangePassword: true });
  const session = await login(user.email);

  assert.equal((await call("/api/auth/me", { cookie: session.cookie })).status, 200);
  const blocked = await call("/api/bookings/mine", { cookie: session.cookie });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, "PASSWORD_CHANGE_REQUIRED");
});

test("roles are enforced by the backend", async () => {
  const guest = await login((await makeUser()).email);
  const admin = await login((await makeUser({ role: "admin" })).email);
  const superadmin = await login((await makeUser({ role: "superadmin" })).email);

  assert.equal((await call("/api/admin/dashboard")).status, 401);                       // logged out
  assert.equal((await call("/api/admin/dashboard", { cookie: guest.cookie })).status, 403);
  assert.equal((await call("/api/users", { cookie: guest.cookie })).status, 403);

  assert.equal((await call("/api/admin/dashboard", { cookie: admin.cookie })).status, 200);
  assert.equal((await call("/api/users", { cookie: admin.cookie })).status, 403);       // staff can't manage accounts

  assert.equal((await call("/api/users", { cookie: superadmin.cookie })).status, 200);
  assert.equal((await call("/api/admin/dashboard", { cookie: superadmin.cookie })).status, 403); // owner can't run the hotel

  const room = await makeRoom();
  const staffBooking = await call("/api/bookings", {
    method: "POST", cookie: admin.cookie,
    body: { roomId: String(room._id), checkIn: dayOffset(10), checkOut: dayOffset(12), guestCount: 1 },
  });
  assert.equal(staffBooking.status, 403);                                                // staff don't book as guests
});

test("the client can't choose the price, status, or owner of a booking", async () => {
  const guest = await makeUser();
  const other = await makeUser();
  const room = await makeRoom();
  const session = await login(guest.email);

  const res = await call("/api/bookings", {
    method: "POST", cookie: session.cookie,
    body: {
      roomId: String(room._id), checkIn: dayOffset(10), checkOut: dayOffset(12), guestCount: 1,
      totalPrice: 1, bookingStatus: "confirmed", userId: String(other._id),
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.totalPrice, 200);          // 2 nights at 100, calculated by the server
  assert.equal(res.body.bookingStatus, "pending");
  assert.equal(String(res.body.userId), String(guest._id));
});

test("a guest can't cancel another guest's booking over the API", async () => {
  const owner = await makeUser();
  const other = await makeUser();
  const room = await makeRoom();
  const booking = await makeBooking(owner._id, room._id);
  const session = await login(other.email);

  const res = await call(`/api/bookings/${booking._id}/cancel`, { method: "POST", cookie: session.cookie });
  assert.equal(res.status, 404);
  assert.equal((await Booking.findById(booking._id)).bookingStatus, "confirmed");
});

test("state-changing requests from another origin are refused", async () => {
  const evil = await call("/api/auth/logout", {  method: "POST", headers: { Origin: "https://evil.example" } });
  assert.equal(evil.status, 403);

  const fine = await call("/api/auth/logout", { method: "POST", headers: { Origin: process.env.CLIENT_URL } });
  assert.equal(fine.status, 200);
});

test("failed logins on staff accounts are audit-logged, guests' are not", async () => {
  const admin = await makeUser({ role: "admin" });
  const guest = await makeUser();
  await login(admin.email, "Wrong#Pass1");
  await login(guest.email, "Wrong#Pass1");

  // the log is written after the response is sent, so wait for it
  for (let i = 0; i < 30; i++) {
    if (await AuditLog.countDocuments({ action: "auth.login_failed" })) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 200)); // give a (wrong) guest entry time to appear too

  const logs = await AuditLog.find({ action: "auth.login_failed" });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].actorEmail, admin.email);
});
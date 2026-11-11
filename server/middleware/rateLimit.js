import rateLimit from "express-rate-limit";

// Automated tests make many requests quickly, so the limiters are off in the test environment
const skip = () => process.env.NODE_ENV === "test";

function limiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skip,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message }, // JSON, so React's api() can show it
  });
}

const MIN = 60 * 1000;

// Everything under /api
export const apiLimiter = limiter({
  windowMs: 15 * MIN, limit: 300,
  message: "Too many requests. Please wait a few minutes and try again.",
});

// Only FAILED attempts count: this is the password-guessing defense
export const loginLimiter = limiter({
  windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});

export const registerLimiter = limiter({
  windowMs: 60 * MIN, limit: 10,
  message: "Too many accounts created from this network. Please try again later.",
});

// change-password checks the current password, so it is a guessing target for a stolen session
export const passwordLimiter = limiter({
  windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});
import rateLimit from "express-rate-limit";

const skip = () => process.env.NODE_ENV === "test";

function limiter({ windowMs, limit, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skip,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message }, 
  });
}

const MIN = 60 * 1000;

export const apiLimiter = limiter({
  windowMs: 15 * MIN, limit: 300,
  message: "Too many requests. Please wait a few minutes and try again.",
});

export const loginLimiter = limiter({
  windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});

export const registerLimiter = limiter({
  windowMs: 60 * MIN, limit: 10,
  message: "Too many accounts created from this network. Please try again later.",
});

export const passwordLimiter = limiter({
  windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

export const paymentLimiter = limiter({
  windowMs: 15 * MIN, limit: 30,
  message: "Too many payment attempts. Please wait a few minutes and try again.",
});
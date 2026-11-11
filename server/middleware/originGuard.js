// Browsers always send an Origin header on cross-site POST/PATCH/DELETE requests.
// Postman and curl send none, so they still work. A page on another site is refused.
export function originGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.headers.origin;
  if (origin && origin !== process.env.CLIENT_URL) {
    return res.status(403).json({ message: "Origin not allowed" });
  }
  next();
}
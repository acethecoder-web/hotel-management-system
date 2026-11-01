import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user || !user.active || user.tokenVersion !== payload.tokenVersion) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }
    console.error("protect error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}

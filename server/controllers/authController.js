import { registerUser, loginUser } from "../services/authService.js";
import { cookieOptions } from "../config/cookie.js";

export async function register(req, res) {
  const { name, email, password } = req.body; // everything else is ignored

  try {
    const user = await registerUser({ name, email, password });
    res.status(201).json(user);
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = error.errors
        ? Object.values(error.errors)
            .map((e) => e.message)
            .join(", ")
        : error.message;
      return res.status(400).json({ message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered" });
    }
    console.error("register error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const { token, user } = await loginUser({ email, password });
    res.cookie("token", token, cookieOptions).json(user);
  } catch (error) {
    if (error.status === 401)
      return res.status(401).json({ message: error.message });
    console.error("login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
}

export function logout(req, res) {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie("token", clearOptions).json({ message: "Logged out" });
}

export function me(req, res) {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  });
}

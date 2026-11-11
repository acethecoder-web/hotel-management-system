import { Router } from "express";
import {
  register,
  login,
  logout,
  me,
  changePasswordHandler,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { loginLimiter, registerLimiter, passwordLimiter } from "../middleware/rateLimit.js";


const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.post("/change-password", protect, changePasswordHandler);
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/change-password", protect, passwordLimiter, changePasswordHandler);

export default router;

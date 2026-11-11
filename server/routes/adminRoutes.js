import { Router } from "express";
import { getDashboard,  listRooms, createRoom, updateRoom, setRoomActive , 
     addRoomImages, removeRoomImage, setCoverImage , listReservations ,
      getReservation , confirmReservation , cancelReservation ,
       getFrontDesk , setRoomStatus , checkOutReservation , 
       checkInReservation , getReport} from "../controllers/adminController.js";
import { protect, requirePasswordChanged } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { uploadImages } from "../middleware/upload.js";

const router = Router();

router.use(protect, requirePasswordChanged, requireRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/rooms", listRooms);
router.post("/rooms", createRoom);
router.patch("/rooms/:id", updateRoom);
router.patch("/rooms/:id/active", setRoomActive);
router.post("/rooms/:id/images", uploadImages, addRoomImages);
router.delete("/rooms/:id/images", removeRoomImage);
router.patch("/rooms/:id/images/cover", setCoverImage);
router.get("/reservations", listReservations);
router.get("/reservations/:id", getReservation);
router.post("/reservations/:id/confirm", confirmReservation);
router.post("/reservations/:id/cancel", cancelReservation);
router.get("/front-desk", getFrontDesk);
router.post("/reservations/:id/check-in", checkInReservation);
router.post("/reservations/:id/check-out", checkOutReservation);
router.patch("/rooms/:id/status", setRoomStatus);
router.get("/reports", getReport);
export default router;
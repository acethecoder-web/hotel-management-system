import { Router } from "express";
import {getActiveRooms,getRoomById} from "../controller/roomController.js";

const router = Router();

router.get("/", getActiveRooms);

router.get("/:id", getRoomById);

export default router;
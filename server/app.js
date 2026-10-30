import express from "express";
import cors from "cors";
import roomRoutes from "./routes/roomRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req,res) => {
    res.json({status: "ok"})
});

app.use("/api/rooms", roomRoutes);

export default app;
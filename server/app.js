import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req,res) => {
    res.json({status: "ok"})
});

app.get("/api/hotel", (req,res) => {
    res.json({status: "Hotel list"})
});

export default app;
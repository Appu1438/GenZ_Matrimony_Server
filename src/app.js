import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.options('*', cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) => res.json({ success: true, message: "GenZ API running" }));
app.use("/api/auth", authRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((err, _req, res, _next) => { console.error(err); if (err.code === 11000) return res.status(409).json({ success: false, message: "Email or mobile already exists" }); res.status(err.statusCode || 500).json({ success: false, message: err.statusCode ? err.message : "Something went wrong" }); });
export default app;
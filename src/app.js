import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";

import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import profilePhotoRoutes from "./routes/profilePhoto.routes.js";

dotenv.config();

const app = express();

// Security headers.
// Allow images to be displayed by your separate React frontend.
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);

// CORS configuration
const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Body and cookie parsing
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "GenZ API running",
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Profile routes
app.use("/api/profile", profileRoutes);

// Profile photo static directory
app.use(
    "/uploads/profile-images",
    express.static(
        path.resolve(
            process.cwd(),
            "uploads",
            "profile-images"
        ),
        {
            index: false,
            dotfiles: "deny",
            immutable: true,
            maxAge: "1y",
            fallthrough: true,

            setHeaders(response) {
                response.setHeader(
                    "Cross-Origin-Resource-Policy",
                    "cross-origin"
                );

                response.setHeader(
                    "X-Content-Type-Options",
                    "nosniff"
                );

                response.setHeader(
                    "Cache-Control",
                    "public, max-age=31536000, immutable"
                );
            },
        }
    )
);

// Profile photo upload/delete routes
app.use(
    "/api/profile/photos",
    profilePhotoRoutes
);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);

    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "Email or mobile already exists",
        });
    }

    return res.status(err.statusCode || err.status || 500).json({
        success: false,
        message:
            err.statusCode || err.status
                ? err.message
                : "Something went wrong",
    });
});

export default app;

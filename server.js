
import "dotenv/config";

import mongoose from "mongoose";
import app from "./src/app.js";
import nodemailer from "nodemailer";

// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 5000;

// ==========================================
// DATABASE CONNECTION
// ==========================================

const connectDatabase = async () => {
  console.log("\n[1/3] Connecting to MongoDB...");

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✓ MongoDB connected successfully");
    console.log(`✓ Database: ${mongoose.connection.name}`);

  } catch (error) {
    console.error("✗ MongoDB connection failed:", error.message);
    throw error;
  }
};

// ==========================================
// SMTP CONNECTION CHECK
// ==========================================

const checkSMTPConnection = async () => {
  console.log("\n[2/3] Checking SMTP connection...");

  const configured =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.log("⚠ SMTP not configured. Development email logging is enabled.");
      return;
    }

    throw new Error("SMTP credentials are missing");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();

    console.log("✓ SMTP connection successful");
    console.log(`✓ SMTP Host: ${process.env.SMTP_HOST}`);

  } catch (error) {
    console.error("✗ SMTP connection failed:", error.message);
    throw error;
  } finally {
    transporter.close();
  }
};

// ==========================================
// START EXPRESS SERVER
// ==========================================

const startServer = async () => {
  try {
    await connectDatabase();

    await checkSMTPConnection();

    console.log("\n[3/3] Starting Express server...");

    const server = app.listen(PORT, () => {
      console.log("✓ Express server started successfully");
      console.log(`✓ API URL: http://localhost:${PORT}`);
      console.log(`✓ Auth API: http://localhost:${PORT}/api/auth`);
      console.log("\n================================");
      console.log(" GENZ MATRIMONY BACKEND READY");
      console.log("================================\n");
    });

    server.on("error", (error) => {
      console.error("✗ Server startup error:", error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error("\n✗ Backend startup failed:", error.message);

    await mongoose.disconnect().catch(() => {});

    process.exit(1);
  }
};

// ==========================================
// START APPLICATION
// ==========================================

startServer();

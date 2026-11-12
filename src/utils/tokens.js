import crypto from "crypto";
import jwt from "jsonwebtoken";
export const hashToken = t => crypto.createHash("sha256").update(t).digest("hex");
export const accessToken = u => jwt.sign({ sub: u._id.toString(), type: "access" }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" });
export const refreshToken = u => jwt.sign({ sub: u._id.toString(), type: "refresh" }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d" });
export const emailToken = u => jwt.sign({ sub: u._id.toString(), type: "email-verification" }, process.env.EMAIL_TOKEN_SECRET, { expiresIn: "30m" });
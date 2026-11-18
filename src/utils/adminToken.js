
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.ADMIN_ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.ADMIN_REFRESH_TOKEN_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error(
        "Admin JWT secrets are missing from environment variables."
    );
}

export const ADMIN_ACCESS_EXPIRES_IN =
    process.env.ADMIN_ACCESS_TOKEN_EXPIRES_IN || "15m";

export const ADMIN_REFRESH_EXPIRES_IN = "7d";

export const ADMIN_REMEMBER_REFRESH_EXPIRES_IN =
    process.env.ADMIN_REMEMBER_REFRESH_TOKEN_EXPIRES_IN || "30d";

export function createAdminAccessToken(admin, sessionId) {
    return jwt.sign(
        {
            sub: admin._id.toString(),
            role: admin.role,
            sid: sessionId.toString(),
            type: "admin_access",
        },
        ACCESS_SECRET,
        {
            expiresIn: ADMIN_ACCESS_EXPIRES_IN,
        }
    );
}

export function createAdminRefreshToken(
    admin,
    sessionId,
    remember = false
) {
    const expiresIn = remember
        ? ADMIN_REMEMBER_REFRESH_EXPIRES_IN
        : ADMIN_REFRESH_EXPIRES_IN;

    return jwt.sign(
        {
            sub: admin._id.toString(),
            sid: sessionId.toString(),
            type: "admin_refresh",
        },
        REFRESH_SECRET,
        {
            expiresIn,
        }
    );
}

export function verifyAdminAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}

export function verifyAdminRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
}

export function hashAdminRefreshToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

export function getTokenExpiry(token) {
    const decoded = jwt.decode(token);

    if (!decoded?.exp) {
        throw new Error("Invalid token expiry.");
    }

    return new Date(decoded.exp * 1000);
}

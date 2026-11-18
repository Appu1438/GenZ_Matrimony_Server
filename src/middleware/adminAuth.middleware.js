
import Admin from "../models/Admin.js";
import AdminSession from "../models/AdminSession.js";
import {
    ADMIN_ACCESS_COOKIE,
} from "../config/adminCookies.js";
import {
    verifyAdminAccessToken,
} from "../utils/adminToken.js";

export async function authenticateAdmin(req, res, next) {
    try {
        const token = req.cookies?.[ADMIN_ACCESS_COOKIE];

        if (!token) {
            return res.status(401).json({
                success: false,
                code: "ADMIN_AUTH_REQUIRED",
                message: "Administrator authentication required.",
            });
        }

        const decoded = verifyAdminAccessToken(token);

        if (
            decoded.type !== "admin_access" ||
            !decoded.sub ||
            !decoded.sid
        ) {
            return res.status(401).json({
                success: false,
                code: "INVALID_ADMIN_TOKEN",
                message: "Invalid administrator session.",
            });
        }

        const session = await AdminSession.findOne({
            _id: decoded.sid,
            admin: decoded.sub,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                code: "ADMIN_SESSION_EXPIRED",
                message: "Your administrator session has expired.",
            });
        }

        const admin = await Admin.findById(decoded.sub);

        if (!admin || admin.status !== "active") {
            return res.status(403).json({
                success: false,
                code: "ADMIN_ACCESS_DENIED",
                message: "Administrator account is unavailable.",
            });
        }

        // Ensure the token role still matches the database role.
        if (decoded.role !== admin.role) {
            return res.status(403).json({
                success: false,
                code: "ADMIN_ROLE_CHANGED",
                message: "Administrator permissions have changed. Please sign in again.",
            });
        }

        req.admin = admin;
        req.adminSession = session;

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                code: "INVALID_OR_EXPIRED_ADMIN_TOKEN",
                message: "Your administrator session is invalid or expired.",
            });
        }

        next(error);
    }
}

// Restrict selected endpoints to specific admin roles.
export function requireAdminRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.admin || !allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                code: "INSUFFICIENT_ADMIN_PERMISSION",
                message: "You do not have permission to perform this action.",
            });
        }

        next();
    };
}

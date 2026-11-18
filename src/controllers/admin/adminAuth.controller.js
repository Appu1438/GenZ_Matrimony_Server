
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Admin from "../../models/Admin.js";
import AdminSession from "../../models/AdminSession.js";

import {
    ADMIN_ACCESS_COOKIE,
    ADMIN_REFRESH_COOKIE,
    adminAccessCookieOptions,
    adminRefreshCookieOptions,
    clearAdminAccessCookieOptions,
    clearAdminRefreshCookieOptions,
} from "../../config/adminCookies.js";


import {
    createAdminAccessToken,
    createAdminRefreshToken,
    verifyAdminRefreshToken,
    hashAdminRefreshToken,
    getTokenExpiry,
} from "../../utils/adminToken.js";

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

function getAdminPublicData(admin) {
    return {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        status: admin.status,
        lastLoginAt: admin.lastLoginAt,
    };
}

function setAdminCookies(res, accessToken, refreshToken, remember) {
    res.cookie(
        ADMIN_ACCESS_COOKIE,
        accessToken,
        {
            ...adminAccessCookieOptions(),
            maxAge: ACCESS_COOKIE_MAX_AGE,
        }
    );

    const refreshOptions = {
        ...adminRefreshCookieOptions(),
    };

    // Remember me controls whether the browser persists the cookie.
    // The JWT and database session still enforce their own expiry.
    if (remember) {
        refreshOptions.maxAge =
            getTokenExpiry(refreshToken).getTime() - Date.now();
    }

    res.cookie(
        ADMIN_REFRESH_COOKIE,
        refreshToken,
        refreshOptions
    );
}

function clearAdminCookies(res) {
    res.clearCookie(
        ADMIN_ACCESS_COOKIE,
        clearAdminAccessCookieOptions()
    );

    res.clearCookie(
        ADMIN_REFRESH_COOKIE,
        clearAdminRefreshCookieOptions()
    );
}

// ======================================================
// ADMIN LOGIN
// POST /api/admin/auth/login
// ======================================================


export async function loginAdmin(req, res, next) {
    try {
        const { identifier, password, remember = false } = req.body;

        if (
            typeof identifier !== "string" ||
            typeof password !== "string" ||
            !identifier.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email/username and password.",
            });
        }

        const normalizedIdentifier = identifier.trim().toLowerCase();

        const admin = await Admin.findOne({
            $or: [
                { email: normalizedIdentifier },
                { username: normalizedIdentifier },
            ],
        }).select("+passwordHash");

        // Admin account not found
        if (!admin) {
            return res.status(404).json({
                success: false,
                code: "ADMIN_NOT_FOUND",
                message: "Admin account not found. Please check your email or username.",
            });
        }

        // Check account status
        if (admin.status !== "active") {
            return res.status(403).json({
                success: false,
                code: "ADMIN_ACCOUNT_SUSPENDED",
                message: "Your administrator account is suspended. Please contact the super administrator.",
            });
        }

        // Check password
        const passwordMatches = await bcrypt.compare(
            password,
            admin.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                code: "INCORRECT_PASSWORD",
                message: "Incorrect password. Please try again.",
            });
        }

        // Create admin session
        const sessionId = new mongoose.Types.ObjectId();

        const refreshToken = createAdminRefreshToken(
            admin,
            sessionId,
            Boolean(remember)
        );

        const accessToken = createAdminAccessToken(
            admin,
            sessionId
        );

        const refreshTokenHash = hashAdminRefreshToken(refreshToken);

        await AdminSession.create({
            _id: sessionId,
            admin: admin._id,
            refreshTokenHash,
            expiresAt: getTokenExpiry(refreshToken),
            remember: Boolean(remember),
            ipAddress: req.ip || "",
            userAgent: req.get("user-agent") || "",
            lastUsedAt: new Date(),
        });

        admin.lastLoginAt = new Date();
        await admin.save();

        setAdminCookies(
            res,
            accessToken,
            refreshToken,
            Boolean(remember)
        );

        return res.status(200).json({
            success: true,
            message: "Administrator login successful.",
            data: {
                admin: getAdminPublicData(admin),
            },
        });

    } catch (error) {
        next(error);
    }
}

// ======================================================
// REFRESH ADMIN SESSION
// POST /api/admin/auth/refresh
// ======================================================

export async function refreshAdminSession(req, res, next) {
    try {
        const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE];

        if (!refreshToken) {
            clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "ADMIN_REFRESH_REQUIRED",
                message: "Please sign in again.",
            });
        }

        let decoded;

        try {
            decoded = verifyAdminRefreshToken(refreshToken);
        } catch {
            clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "INVALID_ADMIN_REFRESH_TOKEN",
                message: "Your administrator session has expired.",
            });
        }

        if (
            decoded.type !== "admin_refresh" ||
            !decoded.sub ||
            !decoded.sid
        ) {
            clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "INVALID_ADMIN_REFRESH_TOKEN",
                message: "Invalid administrator refresh token.",
            });
        }

        const session = await AdminSession.findOne({
            _id: decoded.sid,
            admin: decoded.sub,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        }).select("+refreshTokenHash");

        if (!session) {
            clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "ADMIN_SESSION_EXPIRED",
                message: "Please sign in again.",
            });
        }

        const incomingHash = hashAdminRefreshToken(refreshToken);

        if (incomingHash !== session.refreshTokenHash) {
            // Possible reuse of an old refresh token.
            // Revoke the session to prevent continued use.
            session.revokedAt = new Date();
            await session.save();

            clearAdminCookies(res);

            return res.status(401).json({
                success: false,
                code: "ADMIN_REFRESH_TOKEN_REUSED",
                message: "Your session is no longer valid. Please sign in again.",
            });
        }

        const admin = await Admin.findById(decoded.sub);

        if (!admin || admin.status !== "active") {
            session.revokedAt = new Date();
            await session.save();

            clearAdminCookies(res);

            return res.status(403).json({
                success: false,
                code: "ADMIN_ACCESS_DENIED",
                message: "Administrator account is unavailable.",
            });
        }

        const newRefreshToken = createAdminRefreshToken(
            admin,
            session._id,
            session.remember
        );

        const newAccessToken = createAdminAccessToken(
            admin,
            session._id
        );

        // Rotate the refresh token.
        session.refreshTokenHash =
            hashAdminRefreshToken(newRefreshToken);

        session.expiresAt = getTokenExpiry(newRefreshToken);
        session.lastUsedAt = new Date();

        await session.save();

        setAdminCookies(
            res,
            newAccessToken,
            newRefreshToken,
            session.remember
        );

        return res.status(200).json({
            success: true,
            message: "Administrator session refreshed.",
            data: {
                admin: getAdminPublicData(admin),
            },
        });
    } catch (error) {
        next(error);
    }
}

// ======================================================
// GET CURRENT ADMIN
// GET /api/admin/auth/me
// Protected by authenticateAdmin
// ======================================================

export async function getCurrentAdmin(req, res) {
    return res.status(200).json({
        success: true,
        data: {
            admin: getAdminPublicData(req.admin),
        },
    });
}

// ======================================================
// ADMIN LOGOUT
// POST /api/admin/auth/logout
// ======================================================

export async function logoutAdmin(req, res, next) {
    try {
        const refreshToken = req.cookies?.[ADMIN_REFRESH_COOKIE];

        if (refreshToken) {
            try {
                const decoded = verifyAdminRefreshToken(refreshToken);

                if (
                    decoded.type === "admin_refresh" &&
                    decoded.sid &&
                    decoded.sub
                ) {
                    await AdminSession.updateOne(
                        {
                            _id: decoded.sid,
                            admin: decoded.sub,
                            revokedAt: null,
                        },
                        {
                            $set: {
                                revokedAt: new Date(),
                            },
                        }
                    );
                }
            } catch {
                // Clear cookies even if the refresh token is invalid.
            }
        }

        // If the access middleware has already authenticated the request,
        // revoke its session as well.
        if (req.adminSession?._id) {
            await AdminSession.updateOne(
                {
                    _id: req.adminSession._id,
                    revokedAt: null,
                },
                {
                    $set: {
                        revokedAt: new Date(),
                    },
                }
            );
        }

        clearAdminCookies(res);

        return res.status(200).json({
            success: true,
            message: "Administrator logged out successfully.",
        });
    } catch (error) {
        next(error);
    }
}

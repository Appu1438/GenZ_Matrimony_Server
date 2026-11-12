
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";

import {
    accessToken,
    refreshToken,
    emailToken,
    hashToken,
} from "../utils/tokens.js";

import { sendPasswordResetEmail, sendVerificationEmail } from "../services/email.service.js";

import {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    accessCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
    refreshCookieOptions,
} from "../config/cookies.js";

// ==========================================
// HELPER FUNCTIONS
// ==========================================


const createEmailVerificationToken = () => {
    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    return { token, tokenHash };
};

const safeUser = (user) => ({
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    isEmailVerified: user.isEmailVerified,
});

const createSession = (user, res, remember = true) => {
    // Generate tokens
    const access = accessToken(user);
    const refresh = refreshToken(user);

    // Store hashed refresh token
    user.refreshTokenHash = hashToken(refresh);

    // Refresh token expiration
    const refreshDays = remember
        ? Number(process.env.REFRESH_COOKIE_DAYS || 7)
        : 1;

    const refreshExpiry =
        refreshDays * 24 * 60 * 60 * 1000;

    user.refreshTokenExpiresAt = new Date(
        Date.now() + refreshExpiry
    );

    // Access token cookie
    res.cookie(ACCESS_COOKIE, access, {
        ...accessCookieOptions(),
        maxAge: 15 * 60 * 1000,
    });

    // Refresh token cookie
    res.cookie(REFRESH_COOKIE, refresh, {
        ...refreshCookieOptions(),
        maxAge: refreshExpiry,
    });

    return access;
};

const clearAuthCookies = (res) => {
    res.clearCookie(
        ACCESS_COOKIE,
        clearAccessCookieOptions()
    );

    res.clearCookie(
        REFRESH_COOKIE,
        clearRefreshCookieOptions()
    );
};

export const login = async (req, res, next) => {
    try {
        const { identifier, password, remember = true } = req.body;

        // 1. Validate required fields
        if (
            !identifier ||
            typeof identifier !== "string" ||
            !identifier.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                code: "MISSING_CREDENTIALS",
                message: "Email/mobile and password are required.",
            });
        }

        // 2. Normalize identifier
        const value = identifier.trim();

        const email = value.toLowerCase();
        const mobile = value.replace(/[\s()-]/g, "");

        // 3. Find user by email or mobile
        const user = await User.findOne({
            $or: [
                { email },
                { mobile },
            ],
        }).select(
            "+passwordHash +refreshTokenHash +refreshTokenExpiresAt"
        );

        // 4. Check whether account exists
        if (!user) {
            return res.status(404).json({
                success: false,
                code: "ACCOUNT_NOT_FOUND",
                message:
                    "No account found with this email or mobile number. Please create an account.",
            });
        }

        // 5. Validate password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                code: "INVALID_PASSWORD",
                message: "Incorrect password. Please try again.",
            });
        }

        // 6. Check email verification
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message:
                    "Your email address is not verified. Please verify your email before logging in.",
                data: {
                    email: user.email,
                },
            });
        }

        // 7. Check account status
        if (user.accountStatus !== "active") {
            return res.status(403).json({
                success: false,
                code: "ACCOUNT_UNAVAILABLE",
                message:
                    "Your account is currently unavailable. Please contact support.",
            });
        }

        // 8. Create access and refresh token cookies
        await createSession(user, res, remember);

        // 9. Save refresh token hash and expiry
        await user.save();

        // 10. Successful login
        return res.status(200).json({
            success: true,
            message: "Login successful!",
            data: {
                user: safeUser(user),
            },
        });

    } catch (error) {
        next(error);
    }
};

export const register = async (req, res, next) => {
    try {
        const { fullName, email, mobile, password } = req.body;

        if (!fullName || !email || !mobile || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const name = String(fullName).trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedMobile = String(mobile).replace(/[\s()-]/g, "");

        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Enter your full name",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email",
            });
        }

        if (!/^\+?[0-9]{10,15}$/.test(normalizedMobile)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid mobile number",
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { mobile: normalizedMobile },
            ],
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.email === normalizedEmail
                    ? "An account already exists with this email."
                    : "An account already exists with this mobile number.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const { token, tokenHash } = createEmailVerificationToken();

        const user = await User.create({
            fullName: name,
            email: normalizedEmail,
            mobile: normalizedMobile,
            passwordHash,

            isEmailVerified: false,

            emailVerificationTokenHash: tokenHash,
            emailVerificationExpiresAt:
                new Date(Date.now() + 15 * 60 * 1000),
        });

        const verificationUrl =
            `${process.env.CLIENT_URL}/verify-email?token=${token}`;

        await sendVerificationEmail({
            to: user.email,
            name: user.fullName,
            url: verificationUrl,
        });

        // IMPORTANT:
        // No access token.
        // No refresh token.
        // No authentication cookies.
        // No session creation.

        return res.status(201).json({
            success: true,
            message: "Account created successfully. Please verify your email.",
            data: {
                verificationRequired: true,
            },
        });

    } catch (error) {
        next(error);
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required",
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpiresAt: { $gt: new Date() },
        }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

        if (!user) {
            return res.status(400).json({
                success: false,
                code: "INVALID_OR_EXPIRED_TOKEN",
                message: "Verification link is invalid or expired. Please request a new link.",
            });
        }

        if (user.isEmailVerified) {
            return res.status(200).json({
                success: true,
                message: "Email is already verified.",
            });
        }

        user.isEmailVerified = true;

        // Invalidate verification token
        user.emailVerificationTokenHash = null;
        user.emailVerificationExpiresAt = null;

        await user.save();

        // IMPORTANT: Do not create a session here.

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. You can now log in.",
        });

    } catch (error) {
        next(error);
    }
};

export const resendVerificationEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        }).select(
            "+emailVerificationTokenHash +emailVerificationExpiresAt"
        );

        // Use a generic response to avoid revealing whether
        // an email address has an account.
        const genericResponse = {
            success: true,
            message: "If an unverified account exists with this email, a verification link will be sent.",
        };

        if (!user || user.isEmailVerified) {
            return res.status(200).json(genericResponse);
        }

        // Generate a new token.
        // This automatically invalidates the old token.
        const { token, tokenHash } = createEmailVerificationToken();

        user.emailVerificationTokenHash = tokenHash;

        user.emailVerificationExpiresAt =
            new Date(Date.now() + 15 * 60 * 1000);

        await user.save();

        const verificationUrl =
            `${process.env.CLIENT_URL}/verify-email?token=${token}`;

        await sendVerificationEmail({
            to: user.email,
            name: user.fullName,
            url: verificationUrl,
        });

        return res.status(200).json(genericResponse);

    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE];

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token missing",
            });
        }

        const tokenHash = hashToken(refreshToken);

        const user = await User.findOne({
            refreshTokenHash: tokenHash,
            refreshTokenExpiresAt: { $gt: new Date() },
            accountStatus: "active",
            isEmailVerified: true,
        }).select(
            "+refreshTokenHash +refreshTokenExpiresAt"
        );

        if (!user) {
            clearAuthCookies(res);

            return res.status(401).json({
                success: false,
                message: "Session expired. Please log in again.",
            });
        }

        // Rotate both tokens
        await createSession(user, res, true);

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Session refreshed",
            data: {
                user: safeUser(user),
            },
        });

    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, {
                $set: {
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null,
                },
            });
        }

        clearAuthCookies(res);

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error) {
        next(error);
    }
};

export const me = (req, res) => {
    return res.status(200).json({
        success: true,
        data: {
            user: safeUser(req.user),
        },
    });
};


export const forgotPassword = async (req, res, next) => {
    try {
        const { identifier } = req.body;

        if (
            !identifier ||
            typeof identifier !== "string" ||
            !identifier.trim()
        ) {
            return res.status(400).json({
                success: false,
                code: "MISSING_IDENTIFIER",
                message: "Please enter your registered email or mobile number.",
            });
        }

        const value = identifier.trim();

        const email = value.toLowerCase();
        const mobile = value.replace(/[\s()-]/g, "");

        // Find account using email or mobile.
        const user = await User.findOne({
            $or: [
                { email },
                { mobile },
            ],
            accountStatus: "active",
        });

        // Account does not exist.
        if (!user) {
            return res.status(404).json({
                success: false,
                code: "ACCOUNT_NOT_FOUND",
                message:
                    "No account found with this email or mobile number. Please check your details or create an account.",
            });
        }

        // Generate secure reset token.
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Hash token before storing.
        const resetTokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.passwordResetTokenHash = resetTokenHash;

        user.passwordResetExpiresAt = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        // Generate reset URL.
        const resetUrl =
            `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        // Send reset email to registered email.
        await sendPasswordResetEmail({
            to: user.email,
            name: user.fullName,
            url: resetUrl,
        });

        return res.status(200).json({
            success: true,
            message:
                "Password reset instructions have been sent to your registered email address.",
        });

    } catch (error) {
        next(error);
    }
};


export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (
            !token ||
            typeof token !== "string" ||
            !password ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters.",
            });
        }

        // Hash the received token before searching.
        const resetTokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetTokenHash: resetTokenHash,
            passwordResetExpiresAt: { $gt: new Date() },
            accountStatus: "active",
        }).select(
            "+passwordResetTokenHash +passwordResetExpiresAt +refreshTokenHash +refreshTokenExpiresAt"
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                code: "INVALID_OR_EXPIRED_RESET_TOKEN",
                message:
                    "This password reset link is invalid or has expired. Please request a new one.",
            });
        }

        // Hash the new password.
        user.passwordHash = await bcrypt.hash(password, 12);

        // Invalidate the reset token.
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;

        // Invalidate the existing refresh session.
        user.refreshTokenHash = null;
        user.refreshTokenExpiresAt = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message:
                "Your password has been reset successfully. Please log in with your new password.",
        });

    } catch (error) {
        next(error);
    }
};

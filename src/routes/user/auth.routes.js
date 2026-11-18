
import { Router } from "express";
import rateLimit from "express-rate-limit";

import { authenticate } from "../../middleware/auth.middleware.js";
import { forgotPassword, login, logout, me, refresh, register, resendVerificationEmail, resetPassword, verifyEmail } from "../../controllers/user/auth.controller.js";

const router = Router();

// Registration: 5 attempts per 15 minutes
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many registration attempts.  Please try again after 15 minutes.",
    },
});

// Login: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts.  Please try again after 15 minutes.",
    },
});

// Email verification: 10 attempts per 15 minutes
const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many verification attempts.  Please try again after 15 minutes.",
    },
});

// Resend verification: 3 attempts per 15 minutes
const resendVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many verification emails requested.  Please try again after 15 minutes.",
    },
});

// Refresh token: separate, generous limit
const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many refresh requests. Please try again after 15 minutes.",
    },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password reset requests. Please try again after 15 minutes.",
    },
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password reset attempts. Please try again after 15 minutes.",
    },
});

// Routes
router.post("/register", registerLimiter, register);

router.post("/login", loginLimiter, login);

router.post("/verify-email", verifyEmailLimiter, verifyEmail);

router.post(
    "/resend-verification",
    resendVerificationLimiter,
    resendVerificationEmail
);

router.post("/refresh", refreshLimiter, refresh);

router.post("/logout", logout);

// No shared auth rate limiter on /me
router.get("/me", authenticate, me);

router.post(
    "/forgot-password",
    forgotPasswordLimiter,
    forgotPassword
);

router.post(
    "/reset-password",
    resetPasswordLimiter,
    resetPassword
);

export default router;

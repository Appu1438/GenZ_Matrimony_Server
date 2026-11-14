import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    getMyProfile,
    saveMyProfile,
    submitMyProfile,
} from "../controllers/profile.controller.js";

const router = Router();

const profileWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many profile updates. Please try again later.",
    },
});

router.use(authenticate);

router.get("/me", getMyProfile);
router.put("/me", profileWriteLimiter, saveMyProfile);
router.post("/me/submit", profileWriteLimiter, submitMyProfile);

export default router;

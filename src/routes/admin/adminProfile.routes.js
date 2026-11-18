import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
    listPendingProfiles,
    getProfileForReview,
    reviewProfile,
} from "../controllers/adminProfile.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/profiles", listPendingProfiles);
router.get("/profiles/:id", getProfileForReview);
router.patch("/profiles/:id/review", reviewProfile);

export default router;

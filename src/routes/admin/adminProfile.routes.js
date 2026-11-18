
import { Router } from "express";

import {
    listProfiles,
    getProfileForReview,
    reviewProfile,
    getProfileStats,
} from "../../controllers/admin/adminProfile.controller.js";
import { authenticateAdmin } from "../../middleware/adminAuth.middleware.js";

const router = Router();

router.use(authenticateAdmin);

router.get("/stats", getProfileStats);
router.get("/", listProfiles);
router.get("/:id", getProfileForReview);
router.patch("/:id/review", reviewProfile);

export default router;

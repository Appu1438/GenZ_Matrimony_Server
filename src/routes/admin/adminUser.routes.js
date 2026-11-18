
import express from "express";

import {
    getAllUsers,
    getUserStats,
    getUserById,
    updateUserStatus,
} from "../../controllers/admin/adminUser.controller.js";
import { authenticateAdmin } from "../../middleware/adminAuth.middleware.js";



const router = express.Router();

/* =========================================================
   ADMIN AUTHENTICATION
   All routes require an authenticated administrator.
========================================================= */

router.use(authenticateAdmin);

/* =========================================================
   GET ROUTES - NO RATE LIMITER
========================================================= */

// User statistics
router.get("/stats", getUserStats);

// All users with search, filters and pagination
router.get("/", getAllUsers);

// Single user details
router.get("/:id", getUserById);


/* =========================================================
   WRITE ROUTES - RATE LIMITED
========================================================= */

// Activate / suspend / ban user
router.patch("/:id/status", updateUserStatus);

export default router;

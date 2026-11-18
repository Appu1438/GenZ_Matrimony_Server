
import { Router } from "express";
import { getCurrentAdmin, loginAdmin, logoutAdmin, refreshAdminSession } from "../../controllers/admin/adminAuth.controller.js";
import { authenticateAdmin } from "../../middleware/adminAuth.middleware.js";


const router = Router();

// Public admin authentication endpoints.
router.post("/login", loginAdmin);
router.post("/refresh", refreshAdminSession);

// Logout is allowed even when the access token has expired.
// The controller revokes the session using the refresh cookie.
router.post("/logout", logoutAdmin);

// Protected endpoint.
router.get("/me", authenticateAdmin, getCurrentAdmin);

export default router;

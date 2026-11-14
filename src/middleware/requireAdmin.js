export const requireAdmin = (req, res, next) => {
    // Ensure your User schema has a role field and your admin accounts
    // are assigned role: "admin" through a trusted server-side process.
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            code: "ADMIN_ACCESS_REQUIRED",
            message: "Administrator access is required.",
        });
    }

    next();
};

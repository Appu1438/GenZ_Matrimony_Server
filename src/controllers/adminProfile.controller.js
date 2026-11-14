import MatrimonyProfile from "../models/MatrimonyProfile.js";

export const listPendingProfiles = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

        const [profiles, total] = await Promise.all([
            MatrimonyProfile.find({ status: "pending_review" })
                .populate("user", "fullName email mobile")
                .sort({ submittedAt: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            MatrimonyProfile.countDocuments({ status: "pending_review" }),
        ]);

        return res.status(200).json({
            success: true,
            data: { profiles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
        });
    } catch (error) {
        next(error);
    }
};

export const getProfileForReview = async (req, res, next) => {
    try {
        const profile = await MatrimonyProfile.findById(req.params.id)
            .populate("user", "fullName email mobile")
            .populate("reviewedBy", "fullName email");

        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found." });
        }

        return res.status(200).json({ success: true, data: { profile } });
    } catch (error) {
        next(error);
    }
};

export const reviewProfile = async (req, res, next) => {
    try {
        const { action, note = "" } = req.body;

        if (!["approve", "needs_changes", "reject"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be approve, needs_changes or reject.",
            });
        }

        if (typeof note !== "string" || note.trim().length > 1000) {
            return res.status(400).json({ success: false, message: "Review note must be under 1000 characters." });
        }

        if (action !== "approve" && !note.trim()) {
            return res.status(400).json({
                success: false,
                message: "A reason is required for this review action.",
            });
        }

        const profile = await MatrimonyProfile.findById(req.params.id);

        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found." });
        }

        if (profile.status !== "pending_review") {
            return res.status(409).json({
                success: false,
                message: "Only profiles awaiting review can be reviewed.",
            });
        }

        profile.status = action === "approve"
            ? "approved"
            : action === "needs_changes"
                ? "needs_changes"
                : "rejected";

        profile.reviewNote = note.trim();
        profile.reviewedBy = req.user._id;
        profile.reviewedAt = new Date();
        profile.approvedAt = action === "approve" ? new Date() : null;

        await profile.save();

        return res.status(200).json({
            success: true,
            message: `Profile ${profile.status.replace("_", " ")} successfully.`,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

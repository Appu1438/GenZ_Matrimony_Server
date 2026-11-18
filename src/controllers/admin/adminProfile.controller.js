
import mongoose from "mongoose";
import MatrimonyProfile from "../../models/MatrimonyProfile.js";
import User from "../../models/User.js";

const PROFILE_STATUSES = [
    "draft",
    "pending_review",
    "needs_changes",
    "approved",
    "rejected",
];

const REVIEW_ACTIONS = {
    approve: "approved",
    needs_changes: "needs_changes",
    reject: "rejected",
};

const escapeRegex = (value = "") =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// =====================================================
// GET ALL PROFILES
// =====================================================

export const listProfiles = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "all");

        const query = {};

        if (status !== "all") {
            if (!PROFILE_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile status.",
                });
            }

            query.status = status;
        }

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");

            const matchingUsers = await User.find({
                $or: [
                    { fullName: regex },
                    { email: regex },
                    { mobile: regex },
                ],
            }).select("_id").lean();

            query.$or = [
                { "basic.fullName": regex },
                { user: { $in: matchingUsers.map((user) => user._id) } },
            ];
        }

        const [profiles, total] = await Promise.all([
            MatrimonyProfile.find(query)
                .populate("user", "fullName email mobile")
                .sort({ updatedAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            MatrimonyProfile.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                profiles,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// =====================================================
// PROFILE STATISTICS
// =====================================================

export const getProfileStats = async (req, res, next) => {
    try {
        const counts = await MatrimonyProfile.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const stats = {
            total: 0,
            draft: 0,
            pending_review: 0,
            needs_changes: 0,
            approved: 0,
            rejected: 0,
        };

        counts.forEach(({ _id, count }) => {
            if (Object.prototype.hasOwnProperty.call(stats, _id)) {
                stats[_id] = count;
            }
            stats.total += count;
        });

        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

// =====================================================
// GET SINGLE PROFILE
// =====================================================

export const getProfileForReview = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid profile ID.",
            });
        }

        const profile = await MatrimonyProfile.findById(id)
            .populate("user", "fullName email mobile createdAt")
            .populate("reviewedBy", "fullName email")
            .lean();

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

// =====================================================
// REVIEW / CHANGE PROFILE STATUS
// =====================================================

export const reviewProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action, note = "" } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid profile ID.",
            });
        }

        if (!Object.prototype.hasOwnProperty.call(REVIEW_ACTIONS, action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid review action.",
            });
        }

        if (typeof note !== "string" || note.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Remarks must be under 1000 characters.",
            });
        }

        const trimmedNote = note.trim();

        if (action !== "approve" && !trimmedNote) {
            return res.status(400).json({
                success: false,
                message: "Please provide remarks for this action.",
            });
        }

        const profile = await MatrimonyProfile.findById(id);

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
            });
        }

        // Admin can correct the status of any profile.
        // This is intentionally not restricted to pending_review.

        const newStatus = REVIEW_ACTIONS[action];
        const now = new Date();

        profile.status = newStatus;
        profile.reviewNote = trimmedNote;
        profile.reviewedBy = req.admin._id;
        profile.reviewedAt = now;
        profile.approvedAt = action === "approve" ? now : null;

        await profile.save();

        return res.status(200).json({
            success: true,
            message: `Profile status updated to ${newStatus.replaceAll("_", " ")}.`,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

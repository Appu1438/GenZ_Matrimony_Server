
import mongoose from "mongoose";
import User from "../../models/User.js";
import MatrimonyProfile from "../../models/MatrimonyProfile.js";

/* =========================================================
   HELPERS
========================================================= */

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const USER_STATUSES = ["active", "suspended", "banned"];

const sanitizeUser = (user) => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    isEmailVerified: user.isEmailVerified,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});


/* =========================================================
   GET ALL USERS
   GET /api/admin/users
========================================================= */

export const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);

        const limit = Math.min(
            100,
            Math.max(1, Number(req.query.limit) || 20)
        );

        const skip = (page - 1) * limit;

        const search = String(req.query.search || "").trim();

        const status = req.query.status;
        const verification = req.query.verification;

        const filter = {};

        // Search by name, email or mobile
        if (search) {
            const searchRegex = new RegExp(
                escapeRegex(search),
                "i"
            );

            filter.$or = [
                { fullName: searchRegex },
                { email: searchRegex },
                { mobile: searchRegex },
            ];
        }

        // Account status filter
        if (status && status !== "all") {
            if (!USER_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid account status.",
                });
            }

            filter.accountStatus = status;
        }

        // Email verification filter
        if (verification === "verified") {
            filter.isEmailVerified = true;
        } else if (verification === "unverified") {
            filter.isEmailVerified = false;
        } else if (verification && verification !== "all") {
            return res.status(400).json({
                success: false,
                message: "Invalid verification filter.",
            });
        }

        // Registration date filters
        if (req.query.from || req.query.to) {
            const dateFilter = {};

            if (req.query.from) {
                const from = new Date(req.query.from);

                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid start date.",
                    });
                }

                dateFilter.$gte = from;
            }

            if (req.query.to) {
                const to = new Date(req.query.to);

                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid end date.",
                    });
                }

                to.setHours(23, 59, 59, 999);
                dateFilter.$lte = to;
            }

            if (
                dateFilter.$gte &&
                dateFilter.$lte &&
                dateFilter.$gte > dateFilter.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date.",
                });
            }

            filter.createdAt = dateFilter;
        }

        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select(
                    "fullName email mobile isEmailVerified accountStatus createdAt updatedAt"
                )
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalUsers / limit);

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully.",

            data: {
                users: users.map(sanitizeUser),

                pagination: {
                    currentPage: page,
                    limit,
                    totalUsers,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        });

    } catch (error) {
        console.error("Admin getAllUsers error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch users.",
        });
    }
};


/* =========================================================
   GET USER STATISTICS
   GET /api/admin/users/stats
========================================================= */

export const getUserStats = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            bannedUsers,
            verifiedUsers,
            unverifiedUsers,
            todayRegistrations,
            recentRegistrations,
        ] = await Promise.all([
            User.countDocuments(),

            User.countDocuments({
                accountStatus: "active",
            }),

            User.countDocuments({
                accountStatus: "suspended",
            }),

            User.countDocuments({
                accountStatus: "banned",
            }),

            User.countDocuments({
                isEmailVerified: true,
            }),

            User.countDocuments({
                isEmailVerified: false,
            }),

            User.countDocuments({
                createdAt: {
                    $gte: new Date(
                        new Date().setHours(0, 0, 0, 0)
                    ),
                },
            }),

            User.countDocuments({
                createdAt: {
                    $gte: new Date(
                        Date.now() - 7 * 24 * 60 * 60 * 1000
                    ),
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                suspendedUsers,
                bannedUsers,
                verifiedUsers,
                unverifiedUsers,
                todayRegistrations,
                recentRegistrations,
            },
        });

    } catch (error) {
        console.error("Admin getUserStats error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user statistics.",
        });
    }
};


/* =========================================================
   GET SINGLE USER
   GET /api/admin/users/:id
========================================================= */


export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        const [user, profile] = await Promise.all([
            User.findById(id)
                .select(
                    "fullName email mobile isEmailVerified accountStatus createdAt updatedAt"
                )
                .lean(),

            MatrimonyProfile.findOne({ user: id }).lean(),
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                user: sanitizeUser(user),
                profile,
                hasProfile: Boolean(profile),
            },
        });

    } catch (error) {
        console.error("Admin getUserById error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user details.",
        });
    }
};


/* =========================================================
   UPDATE USER ACCOUNT STATUS
   PATCH /api/admin/users/:id/status
========================================================= */

export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { accountStatus } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        if (!USER_STATUSES.includes(accountStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account status.",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (user.accountStatus === accountStatus) {
            return res.status(200).json({
                success: true,
                message: "Account already has this status.",
                data: {
                    user: sanitizeUser(user),
                },
            });
        }

        user.accountStatus = accountStatus;

        await user.save();

        return res.status(200).json({
            success: true,
            message: `User account ${accountStatus} successfully.`,
            data: {
                user: sanitizeUser(user),
            },
        });

    } catch (error) {
        console.error("Admin updateUserStatus error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update user status.",
        });
    }
};

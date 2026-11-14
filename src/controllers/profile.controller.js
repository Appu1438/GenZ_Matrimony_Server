
import MatrimonyProfile from "../models/MatrimonyProfile.js";

import {
    calculateCompletion,
    validateProfileForSubmission,
} from "../utils/profileCompletion.js";

import {
    pickProfilePayload,
    mergeProfile,
} from "../utils/profilePayload.js";

const profileResponse = (profile) => ({
    profile,
    status: profile?.status || "not_created",
    completionPercentage: profile?.completionPercentage || 0,
});

export const getMyProfile = async (req, res, next) => {
    try {
        const profile = await MatrimonyProfile.findOne({
            user: req.user._id,
        })
            .select("-__v")
            .lean();

        return res.status(200).json({
            success: true,
            data: profileResponse(profile),
        });
    } catch (error) {
        next(error);
    }
};

export const saveMyProfile = async (req, res, next) => {
    try {
        let profile = await MatrimonyProfile.findOne({
            user: req.user._id,
        });

        if (!profile) {
            profile = new MatrimonyProfile({
                user: req.user._id,
            });
        }

        if (["pending_review", "rejected"].includes(profile.status)) {
            return res.status(409).json({
                success: false,
                code: "PROFILE_LOCKED",
                message:
                    "Your profile cannot be edited in its current review status.",
            });
        }

        const payload = pickProfilePayload(req.body);

        mergeProfile(profile, payload);

        // Use the registered account name if the profile name is empty.
        if (!profile.basic?.fullName && req.user.fullName) {
            profile.basic.fullName = req.user.fullName;
        }

        profile.completionPercentage = calculateCompletion(profile);

        // Approved profile edits must be reviewed again.
        if (profile.status === "approved") {
            profile.status = "draft";
            profile.approvedAt = null;
            profile.reviewedAt = null;
            profile.reviewedBy = null;
            profile.submittedAt = null;
            profile.reviewNote =
                "Your profile has been updated and must be submitted for review again.";
        }

        await profile.save();

        return res.status(200).json({
            success: true,
            message: "Profile progress saved.",
            data: profileResponse(profile.toObject()),
        });
    } catch (error) {
        next(error);
    }
};

export const submitMyProfile = async (req, res, next) => {
    try {
        const profile = await MatrimonyProfile.findOne({
            user: req.user._id,
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                code: "PROFILE_NOT_FOUND",
                message: "Create your profile before submitting it.",
            });
        }

        if (profile.status === "pending_review") {
            return res.status(409).json({
                success: false,
                message: "Your profile is already waiting for review.",
            });
        }

        if (profile.status === "approved") {
            return res.status(409).json({
                success: false,
                message: "Your profile is already approved.",
            });
        }

        if (profile.status === "rejected") {
            return res.status(403).json({
                success: false,
                message:
                    "This profile has been rejected. Please contact support.",
            });
        }

        const errors = validateProfileForSubmission(profile);

        if (errors.length) {
            return res.status(422).json({
                success: false,
                code: "PROFILE_INCOMPLETE",
                message: "Please complete all required profile details.",
                errors,
            });
        }

        profile.completionPercentage = calculateCompletion(profile);
        profile.status = "pending_review";
        profile.submittedAt = new Date();
        profile.reviewNote = "";
        profile.reviewedBy = null;
        profile.reviewedAt = null;

        await profile.save();

        return res.status(200).json({
            success: true,
            message: "Your profile has been submitted for admin review.",
            data: profileResponse(profile.toObject()),
        });
    } catch (error) {
        next(error);
    }
};

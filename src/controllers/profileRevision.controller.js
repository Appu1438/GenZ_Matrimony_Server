
import MatrimonyProfile from "../models/MatrimonyProfile.js";
import ProfileRevision from "../models/ProfileRevision.js";

import {
    calculateCompletion,
    validateProfileForSubmission,
} from "../utils/profileCompletion.js";

import {
    pickProfilePayload,
    mergeProfile,
} from "../utils/profilePayload.js";

const ACTIVE_REVISION_STATUSES = [
    "draft",
    "needs_changes",
    "pending_review",
];

const revisionResponse = (revision) => ({
    revision,
    status: revision?.status || "not_created",
    completionPercentage: revision?.completionPercentage || 0,
});

// Create a clean snapshot of the currently approved profile.
const createProfileSnapshot = (profile) => {
    const snapshot = profile.toObject();

    delete snapshot._id;
    delete snapshot.__v;
    delete snapshot.user;

    delete snapshot.status;
    delete snapshot.reviewNote;
    delete snapshot.reviewedBy;
    delete snapshot.reviewedAt;
    delete snapshot.submittedAt;
    delete snapshot.approvedAt;

    delete snapshot.createdAt;
    delete snapshot.updatedAt;

    return snapshot;
};

// GET MY REVISION
export const getMyRevision = async (req, res, next) => {
    try {
        const revision = await ProfileRevision.findOne({
            user: req.user._id,
            status: { $in: ACTIVE_REVISION_STATUSES },
        })
            .sort({ createdAt: -1 })
            .select("-__v")
            .lean();

        return res.status(200).json({
            success: true,
            data: revisionResponse(revision),
        });
    } catch (error) {
        next(error);
    }
};

// SAVE MY REVISION
export const saveMyRevision = async (req, res, next) => {
    try {
        const profile = await MatrimonyProfile.findOne({
            user: req.user._id,
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
                code: "PROFILE_NOT_FOUND",
            });
        }

        if (profile.status !== "approved") {
            return res.status(409).json({
                success: false,
                message: "Only approved profiles can create revisions.",
                code: "PROFILE_NOT_APPROVED",
            });
        }

        let revision = await ProfileRevision.findOne({
            user: req.user._id,
            status: { $in: ACTIVE_REVISION_STATUSES },
        }).sort({ createdAt: -1 });

        if (revision?.status === "pending_review") {
            return res.status(409).json({
                success: false,
                message: "Your changes are already under review.",
                code: "REVISION_PENDING",
            });
        }

        if (!revision) {
            const latestRevision = await ProfileRevision.findOne({
                user: req.user._id,
            }).sort({ revisionNumber: -1 });

            revision = new ProfileRevision({
                user: req.user._id,
                profile: profile._id,
                revisionNumber: (latestRevision?.revisionNumber || 0) + 1,
                profileData: createProfileSnapshot(profile),
                baseProfileUpdatedAt: profile.updatedAt || null,
            });
        }

        // Only accept fields allowed by the existing profile payload utility.
        const payload = pickProfilePayload(req.body);

        mergeProfile(revision.profileData, payload);

        revision.completionPercentage = calculateCompletion(
            revision.profileData
        );

        // A revision returned for changes can be edited and resubmitted.
        if (revision.status === "needs_changes") {
            revision.status = "draft";
            revision.reviewNote = "";
            revision.reviewedBy = null;
            revision.reviewedAt = null;
        }

        revision.markModified("profileData");

        await revision.save();

        return res.status(200).json({
            success: true,
            message: "Profile changes saved successfully.",
            data: revisionResponse(revision),
        });
    } catch (error) {
        next(error);
    }
};

// SUBMIT MY REVISION
export const submitMyRevision = async (req, res, next) => {
    try {
        const revision = await ProfileRevision.findOne({
            user: req.user._id,
            status: { $in: ["draft", "needs_changes"] },
        }).sort({ createdAt: -1 });

        if (!revision) {
            return res.status(404).json({
                success: false,
                message: "No editable profile revision found.",
                code: "REVISION_NOT_FOUND",
            });
        }

        const errors = validateProfileForSubmission(revision.profileData);

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: "Please complete the required profile details.",
                errors,
            });
        }

        revision.completionPercentage = calculateCompletion(
            revision.profileData
        );

        revision.status = "pending_review";
        revision.submittedAt = new Date();
        revision.reviewNote = "";
        revision.reviewedBy = null;
        revision.reviewedAt = null;
        revision.approvedAt = null;

        await revision.save();

        return res.status(200).json({
            success: true,
            message: "Your profile changes have been submitted for review.",
            data: revisionResponse(revision),
        });
    } catch (error) {
        next(error);
    }
};

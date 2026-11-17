
import mongoose from "mongoose";

const { Schema } = mongoose;

const profileRevisionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        profile: {
            type: Schema.Types.ObjectId,
            ref: "MatrimonyProfile",
            required: true,
            index: true,
        },

        revisionNumber: {
            type: Number,
            required: true,
            min: 1,
        },

        // Complete proposed profile snapshot, including photos.
        profileData: {
            type: Schema.Types.Mixed,
            required: true,
        },

        completionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        status: {
            type: String,
            enum: [
                "draft",
                "pending_review",
                "needs_changes",
                "approved",
                "rejected",
            ],
            default: "draft",
            index: true,
        },

        reviewNote: {
            type: String,
            default: "",
            maxlength: 1000,
        },

        submittedAt: {
            type: Date,
            default: null,
        },

        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        // Helps detect whether the live profile changed after
        // this revision was created.
        baseProfileUpdatedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

profileRevisionSchema.index({ user: 1, createdAt: -1 });
profileRevisionSchema.index({ profile: 1, status: 1 });

const ProfileRevision =
    mongoose.models.ProfileRevision ||
    mongoose.model("ProfileRevision", profileRevisionSchema);

export default ProfileRevision;

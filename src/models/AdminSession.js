
import mongoose from "mongoose";

const { Schema } = mongoose;

const adminSessionSchema = new Schema(
    {
        admin: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
            index: true,
        },

        refreshTokenHash: {
            type: String,
            required: true,
            select: false,
        },

        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },

        lastUsedAt: {
            type: Date,
            default: Date.now,
        },

        ipAddress: {
            type: String,
            default: "",
        },

        userAgent: {
            type: String,
            default: "",
            maxlength: 500,
        },

        remember: {
            type: Boolean,
            default: false,
        },

        revokedAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Automatically remove expired sessions.
adminSessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

adminSessionSchema.index({
    admin: 1,
    revokedAt: 1,
});

const AdminSession =
    mongoose.models.AdminSession ||
    mongoose.model("AdminSession", adminSessionSchema);

export default AdminSession;

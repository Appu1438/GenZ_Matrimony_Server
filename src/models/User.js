import mongoose from "mongoose";
const schema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: {
        type: String,
        default: null,
        select: false,
    },

    emailVerificationExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },
    accountStatus: { type: String, enum: ["active", "suspended", "banned"], default: "active" },
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: {
        type: String,
        default: null,
        select: false,
    },

    passwordResetExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },
}, { timestamps: true });
export default mongoose.model("User", schema);
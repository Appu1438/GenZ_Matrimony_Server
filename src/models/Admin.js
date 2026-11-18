
import mongoose from "mongoose";

const { Schema } = mongoose;

const adminSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 150,
        },

        username: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
            maxlength: 40,
        },

        passwordHash: {
            type: String,
            required: true,
            select: false,
        },

        role: {
            type: String,
            enum: ["admin", "super_admin"],
            default: "admin",
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
            index: true,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ username: 1 }, { unique: true, sparse: true });
adminSchema.index({ role: 1, status: 1 });

const Admin =
    mongoose.models.Admin ||
    mongoose.model("Admin", adminSchema);

export default Admin;

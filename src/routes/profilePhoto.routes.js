import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware.js";

import {
    uploadProfilePhoto,
    uploadGalleryPhoto,
    deleteProfilePhoto,
} from "../controllers/profilePhoto.controller.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowed.includes(file.mimetype)) {
            const error = new Error(
                "Please upload a JPG, PNG or WebP image."
            );

            error.status = 415;
            return callback(error);
        }

        callback(null, true);
    },
});

// Authentication runs before Multer.
router.post(
    "/profile",
    authenticate,
    upload.single("photo"),
    uploadProfilePhoto
);

router.post(
    "/gallery",
    authenticate,
    upload.single("photo"),
    uploadGalleryPhoto
);

router.delete(
    "/:imageId",
    authenticate,
    deleteProfilePhoto
);

// Handle Multer errors.
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const status =
            error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

        return res.status(status).json({
            success: false,
            message:
                error.code === "LIMIT_FILE_SIZE"
                    ? "Image must be 10 MB or smaller."
                    : "The uploaded file could not be accepted.",
        });
    }

    if (error.status) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    next(error);
});

export default router;
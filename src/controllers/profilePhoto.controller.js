import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import MatrimonyProfile from "../models/MatrimonyProfile.js";

const PROFILE_IMAGE_DIR = path.resolve(
    process.cwd(),
    "uploads",
    "profile-images"
);

const MAX_GALLERY_PHOTOS = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

const publicBaseUrl = (req) =>
    (
        process.env.SERVER_PUBLIC_URL ||
        `${req.protocol}://${req.get("host")}`
    ).replace(/\/$/, "");

const photoUrl = (req, id) =>
    `${publicBaseUrl(req)}/uploads/profile-images/${id}.jpg`;

async function ensureImageDirectory() {
    await fs.mkdir(PROFILE_IMAGE_DIR, { recursive: true });
}

async function removeStoredImage(publicId) {
    if (!publicId || !/^[0-9a-f-]{36}$/i.test(publicId)) return;

    try {
        await fs.unlink(
            path.join(PROFILE_IMAGE_DIR, `${publicId}.jpg`)
        );
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}

function lockError(res) {
    return res.status(409).json({
        success: false,
        code: "PROFILE_LOCKED",
        message:
            "Your profile cannot be edited in its current review status.",
    });
}

function applyApprovedEditReset(profile) {
    if (profile.status !== "approved") return;

    profile.status = "draft";
    profile.approvedAt = null;
    profile.reviewedAt = null;
    profile.reviewedBy = null;
    profile.submittedAt = null;

    profile.reviewNote =
        "Your profile has been updated and must be submitted for review again.";
}

async function getOrCreateEditableProfile(req, res) {
    let profile = await MatrimonyProfile.findOne({
        user: req.user._id,
    });

    if (!profile) {
        profile = new MatrimonyProfile({
            user: req.user._id,
        });
    }

    if (["pending_review", "rejected"].includes(profile.status)) {
        lockError(res);
        return null;
    }

    return profile;
}

async function processImage(buffer) {
    if (!buffer || buffer.length > MAX_IMAGE_BYTES) {
        const error = new Error("Image must be 10 MB or smaller.");
        error.status = 413;
        throw error;
    }

    const image = sharp(buffer, {
        failOn: "error",
        limitInputPixels: 40_000_000,
    });

    let metadata;

    try {
        metadata = await image.metadata();
    } catch {
        const error = new Error(
            "The uploaded file is not a valid supported image."
        );
        error.status = 415;
        throw error;
    }

    if (!ALLOWED_FORMATS.has(metadata.format)) {
        const error = new Error(
            "Please upload a JPG, PNG or WebP image."
        );
        error.status = 415;
        throw error;
    }

    if (
        !metadata.width ||
        !metadata.height ||
        metadata.width > 8000 ||
        metadata.height > 8000
    ) {
        const error = new Error(
            "Image dimensions must not exceed 8000 × 8000 pixels."
        );
        error.status = 422;
        throw error;
    }

    if (metadata.pages && metadata.pages > 1) {
        const error = new Error(
            "Animated images are not supported. Please upload a still image."
        );
        error.status = 415;
        throw error;
    }

    await ensureImageDirectory();

    const id = randomUUID();
    const filePath = path.join(
        PROFILE_IMAGE_DIR,
        `${id}.jpg`
    );

    await image
        .rotate()
        .resize({
            width: 1800,
            height: 1800,
            fit: "inside",
            withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({
            quality: 92,
            mozjpeg: true,
            chromaSubsampling: "4:4:4",
        })
        .toFile(filePath);

    return { id, filePath };
}

function handleError(res, error) {
    if (error.status) {
        return res.status(error.status).json({
            success: false,
            message: error.message,
        });
    }

    if (error.name === "ValidationError") {
        return res.status(422).json({
            success: false,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message:
            "Unable to process the photo. Please try again.",
    });
}

export const uploadProfilePhoto = async (req, res) => {
    let savedFile;
    let persisted = false;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Choose an image to upload.",
            });
        }

        const profile = await getOrCreateEditableProfile(req, res);
        if (!profile) return;

        savedFile = await processImage(req.file.buffer);

        const previousId =
            profile.photos?.profilePhoto?.publicId;

        const photo = {
            publicId: savedFile.id,
            url: photoUrl(req, savedFile.id),
        };

        profile.photos = profile.photos || {};
        profile.photos.profilePhoto = photo;

        applyApprovedEditReset(profile);

        await profile.save();
        persisted = true;

        if (previousId && previousId !== savedFile.id) {
            await removeStoredImage(previousId).catch(() => { });
        }

        return res.status(200).json({
            success: true,
            message: "Profile photo uploaded successfully.",
            data: {
                photo,
                photos: profile.photos,
            },
        });
    } catch (error) {
        if (savedFile?.id && !persisted) {
            await removeStoredImage(savedFile.id).catch(() => { });
        }

        return handleError(res, error);
    }
};

export const uploadGalleryPhoto = async (req, res) => {
    let savedFile;
    let persisted = false;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Choose an image to upload.",
            });
        }

        const profile = await getOrCreateEditableProfile(req, res);
        if (!profile) return;

        profile.photos = profile.photos || {
            profilePhoto: null,
            gallery: [],
        };

        profile.photos.gallery =
            profile.photos.gallery || [];

        if (
            profile.photos.gallery.length >=
            MAX_GALLERY_PHOTOS
        ) {
            return res.status(422).json({
                success: false,
                code: "GALLERY_LIMIT_REACHED",
                message: `You can upload up to ${MAX_GALLERY_PHOTOS} gallery photos.`,
            });
        }

        savedFile = await processImage(req.file.buffer);

        const photo = {
            publicId: savedFile.id,
            url: photoUrl(req, savedFile.id),
        };

        profile.photos.gallery.push(photo);

        applyApprovedEditReset(profile);

        await profile.save();
        persisted = true;

        return res.status(201).json({
            success: true,
            message: "Gallery photo uploaded successfully.",
            data: {
                photo,
                photos: profile.photos,
            },
        });
    } catch (error) {
        if (savedFile?.id && !persisted) {
            await removeStoredImage(savedFile.id).catch(() => { });
        }

        return handleError(res, error);
    }
};

export const deleteProfilePhoto = async (req, res) => {
    try {
        const { imageId } = req.params;

        if (!/^[0-9a-f-]{36}$/i.test(imageId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image ID.",
            });
        }

        const profile = await MatrimonyProfile.findOne({
            user: req.user._id,
        });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found.",
            });
        }

        if (["pending_review", "rejected"].includes(profile.status)) {
            return lockError(res);
        }

        let found = false;

        if (
            profile.photos?.profilePhoto?.publicId === imageId
        ) {
            profile.photos.profilePhoto = null;
            found = true;
        } else {
            const gallery = profile.photos?.gallery || [];

            const index = gallery.findIndex(
                (photo) => photo.publicId === imageId
            );

            if (index !== -1) {
                gallery.splice(index, 1);
                found = true;
            }
        }

        if (!found) {
            return res.status(404).json({
                success: false,
                message: "Photo not found in your profile.",
            });
        }

        applyApprovedEditReset(profile);

        await profile.save();

        await removeStoredImage(imageId).catch(() => { });

        return res.status(200).json({
            success: true,
            message: "Photo deleted successfully.",
            data: {
                photos: profile.photos,
            },
        });
    } catch (error) {
        return handleError(res, error);
    }
};
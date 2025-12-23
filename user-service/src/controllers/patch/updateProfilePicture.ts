import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { cloudinary } from "../../config/cloudinary.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { UploadApiResponse } from "cloudinary";
import type { Request, Response, NextFunction } from "express";
import { generateProfilePictureURL, generateUserThumbnailURL } from "../../utils/generateImageURL.js";
import { redis } from "../../config/redisClient.js";

const uploadToCloudinary = (fileBuffer: Buffer, userID: string): Promise<UploadApiResponse> =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "USER_PROFILE_PICTURE",
                public_id: `profile-picture-${userID}`,
                overwrite: true,
                transformation: [
                    {
                        width: 600,
                        crop: "limit",
                        fetch_format: "auto",
                        quality: "auto",
                    },
                ],
            },
            (error, result) => {
                if (error || !result) {
                    return reject(error ?? new Error("No result from Cloudinary"));
                }
                resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });

export const updateProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    const userID = req.user?.userID as string;

    if (!req.file) return next(new BadResponse("No file uploaded", 400));

    const allowedTypes = ["image/jpeg", "image/png", "image/x-png"];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return next(new BadResponse("Only JPEG and PNG images are allowed", 400));
    }

    try {
        const uploadResult = await uploadToCloudinary(req.file.buffer, userID);

        const profilePictureURL = generateProfilePictureURL(uploadResult.public_id, uploadResult.version);
        const thumbnailURL = generateUserThumbnailURL(uploadResult.public_id, uploadResult.version);

        await prisma.personalData.update({
            where: { userID },
            data: { cloudinaryPublicID: uploadResult.public_id, profilePictureURL, thumbnailURL },
        });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Faiiled to delete profile cache (updateProfilePicture)", { error });
        });

        return res.status(201).json({
            message: "Profile image uploaded successfully.",
            profilePictureURL,
            thumbnailURL,
        });
    } catch (error: any) {
        if (error.code === "P2025") {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }

        logger.error("Error in updateProfilePicture", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

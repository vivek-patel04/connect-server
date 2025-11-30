import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { cloudinary } from "../../config/cloudinary.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";
import { generateProfilePictureURL, generateUserThumbnailURL } from "../../utils/generateImageURL.js";

export const deleteProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;

        const updated = await prisma.personalData.update({
            where: { userID },
            data: {
                cloudinaryPublicID: "USER_PROFILE_PICTURE/default-profile-picture",
                profilePictureURL: "https://res.cloudinary.com/dlxi00sgn/image/upload/v1764397437/USER_PROFILE_PICTURE/default-profile-picture.png",
                thumbnailURL: "https://res.cloudinary.com/dlxi00sgn/image/upload/v1764417754/USER_PROFILE_PICTURE/default-profile-picture_08c102.jpg",
            },
        });

        return res.status(200).json({ success: true, profilePictureURL: updated.profilePictureURL, thumbnailURL: updated.thumbnailURL });
    } catch (error: any) {
        if (error.code === "P2025") {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }

        logger.error("Error in delete ProfilePicture (deleteProfilePicture)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

import { cloudinary } from "../config/cloudinary.js";
import { logger } from "./logger.js";

export const generateProfilePictureURL = (publicID: string, version: number) => {
    try {
        const url = cloudinary.url(publicID, {
            version,
            width: 600,
            crop: "limit",
            fetch_format: "auto",
            quality: "auto",
        });

        return url;
    } catch (error) {
        logger.error("Failed to generate profile picture url", { error });
        return "https://res.cloudinary.com/dlxi00sgn/image/upload/v1764397437/USER_PROFILE_PICTURE/default-profile-picture.png";
    }
};

export const generateUserThumbnailURL = (publicID: string, version: number) => {
    try {
        const url = cloudinary.url(publicID, {
            version,
            width: 150,
            crop: "limit",
            fetch_format: "auto",
            quality: "auto",
        });

        return url;
    } catch (error) {
        logger.error("Failed to generate thumnail url", { error });
        return "https://res.cloudinary.com/dlxi00sgn/image/upload/v1764417754/USER_PROFILE_PICTURE/default-profile-picture_08c102.jpg";
    }
};

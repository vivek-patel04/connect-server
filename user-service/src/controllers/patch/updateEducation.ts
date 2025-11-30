import { redis } from "../../config/redisClient.js";
import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const updateEducation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const educationID = req.cleanedParams?.id as string;
        const userID = req.user?.userID as string;
        const { institute, instituteType, description, startDate, endDate } = req.cleanedBody;

        const educations = await prisma.personalData.update({
            where: { userID },
            data: {
                education: {
                    update: {
                        where: { id: educationID },
                        data: { institute, instituteType, description, startDate, endDate },
                    },
                },
            },
            select: {
                education: true,
            },
        });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Failed to delete userProfile cache", { error });
        });

        return res.status(200).json({ success: true, educations });
    } catch (error: any) {
        if (error.code === "P2025") return next(new BadResponse("Invalid ID or resource not found", 404));

        logger.error("Error on updating education", { error });
        return next(new BadResponse("Internal Server error", 500));
    }
};

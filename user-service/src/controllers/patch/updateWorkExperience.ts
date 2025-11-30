import { redis } from "../../config/redisClient.js";
import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const updateWorkExperience = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workExpID = req.cleanedParams?.id as string;
        const userID = req.user?.userID as string;
        const { organization, role, location, startDate, endDate, description } = req.cleanedBody;

        const workExperience = await prisma.personalData.update({
            where: { userID },
            data: {
                workExperience: {
                    update: {
                        where: { id: workExpID },
                        data: { organization, role, location, startDate, endDate, description },
                    },
                },
            },
            select: {
                workExperience: true,
            },
        });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Failed to delete userProfile cache", { error });
        });

        return res.status(200).json({ success: true, workExperience });
    } catch (error: any) {
        if (error.code === "P2025") return next(new BadResponse("Invalid ID or resource not found", 404));

        logger.error("Error on updating WorkExperience", { error });
        return next(new BadResponse("Internal Server error", 500));
    }
};

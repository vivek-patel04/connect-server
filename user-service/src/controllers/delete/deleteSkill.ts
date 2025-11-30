import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const deleteSkill = async (req: Request, res: Response, next: NextFunction) => {
    //url= base/api/user/skill/:id
    try {
        const userID = req.user?.userID as string;
        const skillID = req.cleanedParams.id as string;

        const skills = await prisma.personalData.update({
            where: { userID },
            data: {
                skills: {
                    delete: { id: skillID },
                },
            },
            select: {
                skills: true,
            },
        });

        res.status(200).json({ success: true, skills });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Failed to delete userProfile cache", { error });
        });
    } catch (error: any) {
        if (error.code === "P2025") return next(new BadResponse("Invalid ID or resource not found", 404));

        logger.error("Error on deleting skill", { error });
        return next(new BadResponse("Internal Server error", 500));
    }
};

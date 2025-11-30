import { redis } from "../../config/redisClient.js";
import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const addSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;
        const { skillName, description } = req.cleanedBody;

        const skills = await prisma.personalData.update({
            where: { userID },
            data: { skills: { create: { skillName, description } } },
            select: { skills: true },
        });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Failed to delete userProfile cache", { error });
        });

        return res.status(200).json({ success: true, skills });
    } catch (error: any) {
        if (error.code === "P2025") return next(new BadResponse("Invalid ID or resource not found", 404));

        logger.error("Error on adding skill", { error });
        return next(new BadResponse("Internal Server error", 500));
    }
};

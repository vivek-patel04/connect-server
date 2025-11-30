import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const updateSkill = async (req: Request, res: Response, next: NextFunction) => {
    //url= base/api/user/skill/:id
    try {
        const userID = req.user?.userID as string;
        const skillID = req.cleanedParams.id as string;
        const { skillName, description }: { skillName: string; description: string | null } = req.cleanedBody;

        const updatedSkills = await prisma.personalData.update({
            where: { userID },
            data: {
                skills: { update: { where: { id: skillID }, data: { skillName, description } } },
            },
            select: { skills: true },
        });

        res.status(200).json({ success: true, updatedSkills });

        await redis.del(`userProfile:${userID}`).catch(error => {
            logger.warn("Failed to delete userProfile cache", { error });
        });
    } catch (error: any) {
        if (error.code === "P2025") return next(new BadResponse("Invalid ID or resource not found", 404));

        logger.error("Error on updating skill", { error });
        return next(new BadResponse("Internal Server error", 500));
    }
};

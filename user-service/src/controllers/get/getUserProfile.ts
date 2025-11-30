import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const userProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.cleanedParams?.id as string;

        console.log("userProfile receiving request", userID);
        if (!userID) return next(new BadResponse("User id missing", 400));

        let userProfile;
        //FETCH USER PROFILE FROM REDIS
        try {
            const cached = await redis.get(`userProfile:${userID}`);

            if (cached) {
                try {
                    userProfile = JSON.parse(cached);
                } catch (error) {
                    logger.warn("Corrupted userProfile data fetched from redis", { error });
                    userProfile = null;

                    await redis.del(`userProfile:${userID}`).catch(error => {
                        logger.warn("failed to delete userProfile from redis", { error });
                    });
                }
            }
        } catch (error) {
            logger.warn("Error on fetch userProfile from redis", { error });
            userProfile = null;
        }

        //FETCH USER PROFILE FROM DB, IF NOT FOUND IN REDIS
        if (!userProfile) {
            const userProfileFromDb = await prisma.user.findUnique({
                where: { id: userID },
                include: {
                    personalData: {
                        include: {
                            education: true,
                            workExperience: true,
                            awards: true,
                            skills: true,
                        },
                    },
                },
            });

            if (userProfileFromDb) {
                const { password, ...safeProfile } = userProfileFromDb;
                userProfile = safeProfile;

                await redis.set(`userProfile:${userID}`, JSON.stringify(userProfile), "EX", 60 * 60 * 3).catch(error => {
                    logger.warn("Error on save userprofile in redis", { error });
                });
            }
        }

        if (!userProfile) return next(new BadResponse("Invalid id, no user found", 404));

        return res.status(200).json({ success: true, message: "User profile is attached", userProfile });
    } catch (error: any) {
        logger.error("Error on get userProfile", error);
        return next(new BadResponse("Internal server error", 500));
    }
};

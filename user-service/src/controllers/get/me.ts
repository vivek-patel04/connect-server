import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const me = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;

        let userProfile;
        //FETCH USER PROFILE FROM REDIS
        try {
            const cached = await redis.get(`userProfile:${userID}`);

            if (cached) {
                try {
                    userProfile = JSON.parse(cached);
                } catch (error) {
                    logger.warn("Corrupted userProfile data fetched from redis (me)", { error });
                    userProfile = null;

                    await redis.del(`userProfile:${userID}`).catch(error => {
                        logger.warn("failed to delete userProfile from redis (me)", { error });
                    });
                }
            }
        } catch (error) {
            logger.warn("Error on fetch userProfile from redis (me)", { error });
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
                    logger.warn("Error on save userprofile in redis(me)", { error });
                });
            }
        }

        if (!userProfile) return next(new BadResponse("Invalid id, no user found", 404));

        await redis.set(`userProfile:${userID}`, JSON.stringify(userProfile), "EX", 60 * 15);

        return res.status(200).json({ success: true, me: userProfile });
    } catch (error: any) {
        logger.error("Error on get me (me)", error);
        return next(new BadResponse("Internal server error", 500));
    }
};

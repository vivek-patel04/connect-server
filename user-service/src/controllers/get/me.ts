import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const me = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;

        //FETCH USER BASIC DATA FROM REDIS
        let cached = await redis.get(`userBasic:${userID}`).catch(error => {
            cached = null;
            logger.warn("Error on fetch userBasic from redis", { error });
        });

        let userBasic;
        if (cached) {
            try {
                userBasic = JSON.parse(cached);
            } catch (error) {
                userBasic = null;
                logger.warn("Invalid/corrupted userBasic data from redis", { error });
            }
        }

        //FETCH USER BASIC DATA FROM DB
        if (!userBasic) {
            userBasic = await prisma.user.findUnique({
                where: {
                    id: userID,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    personalData: { select: { profilePictureURL: true, thumbnailURL: true } },
                },
            });

            if (!userBasic) return next(new BadResponse("Invalid id, user not found", 404));

            await redis.set(`userBasic:${userID}`, JSON.stringify(userBasic), "EX", 60 * 60 * 6).catch(error => {
                logger.warn("Error on add userBasic to redis", { error });
            });
        }

        return res.status(200).json({ success: true, me: userBasic });
    } catch (error) {
        logger.error("User authentication error", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";

export const getLikeCount = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/like/count/:postID
    try {
        const postID = req.cleanedParams.postID as string;

        //FETCH FROM CACHE
        let cachedCount;
        try {
            const cached = await redis.get(`likesCountOnPost:${postID}`);

            if (cached) {
                cachedCount = Number(cached);
            }
        } catch (error) {
            logger.error("Error on getting like counts from redis (getLikeCount)", { error });
        }

        if (cachedCount) {
            return res.status(200).json({ success: true, likeCount: cachedCount });
        }
        //DB CALL
        const likeCount = await prisma.like.count({ where: { postID } });

        //SAVE IN REDIS
        await redis.set(`likesCountOnPost:${postID}`, likeCount, "EX", 60).catch(error => {
            logger.warn("Error on save like count in redis (getLikeCount)", { error });
        });

        return res.status(200).json({ success: true, likeCount });
    } catch (error) {
        logger.error("Error on getting like count (getLikeCount)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

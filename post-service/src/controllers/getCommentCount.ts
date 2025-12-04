import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";

export const getCommentCount = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/comment/count/:postID
    try {
        const postID = req.cleanedParams.postID as string;

        //FETCH FROM CACHE
        let cachedCount;
        try {
            const cached = await redis.get(`CommentCountOnPost:${postID}`);

            if (cached) {
                cachedCount = Number(cached);
            }
        } catch (error) {
            logger.error("Error on getting comment counts from redis (getCommentCount)", { error });
        }

        if (cachedCount) {
            return res.status(200).json({ success: true, commentCount: cachedCount });
        }
        //DB CALL
        const commentCount = await prisma.comment.count({ where: { postID } });

        res.status(200).json({ success: true, commentCount });

        //SAVE IN REDIS
        await redis.set(`CommentCountOnPost:${postID}`, commentCount, "EX", 60).catch(error => {
            logger.warn("Error on save comment count in redis (getCommentCount)", { error });
        });
    } catch (error) {
        logger.error("Error on getting comment count (getCommentCount)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

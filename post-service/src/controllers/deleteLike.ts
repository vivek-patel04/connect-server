import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";

export const deleteLike = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/:postID/delete/like/:likeID
    try {
        const userID = req.user?.userID as string;
        const postID = req.cleanedParams?.postID as string;
        const likeID = req.cleanedParams.likeID as string;

        //DB CALL
        const LikeCountAfterDeleting = await prisma.$transaction(async tx => {
            const ok = await tx.like.deleteMany({
                where: { id: likeID, postID, userID },
            });
            if (ok.count === 0) {
                throw new BadResponse("Invalid ID, resource not found", 404);
            }

            const totalLike = await tx.like.count({ where: { postID } });

            return totalLike;
        });

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userConnectionPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`likeOnPost:${postID}`);
        pipeline.del(`likeCountOnPost:${postID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to delete data in redis (deleteLike)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on deleting data in redis on query ${index + 1} (deleteLike)`, { error });
                }
            });
        }

        return res.status(200).json({ success: true, likeCount: LikeCountAfterDeleting });
    } catch (error) {
        if (error instanceof BadResponse) {
            return next(new BadResponse(error.message, error.statusCode));
        }
        logger.error("Error on deleting post (deleteLike)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

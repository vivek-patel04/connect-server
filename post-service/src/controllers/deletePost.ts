import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/:postID/delete
    try {
        const userID = req.user?.userID as string;
        const postID = req.cleanedParams?.postID as string;

        const deletePost = await prisma.post.deleteMany({
            where: {
                id: postID,
                userID,
            },
        });

        if (deletePost.count === 0) {
            return next(new BadResponse("Resource not found", 404));
        }

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userFeedPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`likesOnPost:${postID}`);
        pipeline.del(`likesCountOnPost:${postID}`);
        pipeline.del(`commentsOnPost:${postID}`);
        pipeline.del(`commentsCountOnPost:${postID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to delete data in redis (deletePost)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on deleting data in redis on query ${index + 1} (deletePost)`, { error });
                }
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error("Error on deleting post (deletePost)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

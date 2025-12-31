import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { logger } from "../utils/logger.js";
import { publisher, redis } from "../config/redisConfig.js";

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //base/api/post/:postID/delete/comment/:commentID

        const userID = req.user?.userID as string;
        const commentID = req.cleanedParams?.commentID as string;
        const postID = req.cleanedParams?.postID as string;

        //DB CALL
        const ok = await prisma.comment.deleteMany({
            where: { id: commentID, postID, userID },
        });

        if (ok.count === 0) {
            return next(new BadResponse("Invalid ID, resource not found", 404));
        }

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userFeedPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`commentsOnPost:${postID}`);
        pipeline.del(`commentsCountOnPost:${postID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to delete data in redis (deleteComment)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on deleting data in redis on query ${index + 1} (deleteComment)`, { error });
                }
            });
        }

        res.status(200).json({ success: true });

        //PUBLISH A DELETE NOTIFICATION EVENT
        await publisher
            .publish(
                "notification",
                JSON.stringify({
                    actorID: userID,
                    type: "DELETE-COMMENT",
                    message: "",
                    entityType: "POST",
                    entityID: postID,
                    childEntityID: commentID,
                })
            )
            .catch(error => {
                logger.error("Error on creating notification (deleteComment)", { error });
            });
    } catch (error) {
        logger.error("Error on deleting post (deleteComment)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

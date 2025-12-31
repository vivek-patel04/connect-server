import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { publisher, redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";

export const deleteLike = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/:postID/delete/like/:likeID
    try {
        const userID = req.user?.userID as string;
        const postID = req.cleanedParams?.postID as string;

        //DB CALL
        const ok = await prisma.like.delete({
            where: {
                postID_userID: {
                    postID,
                    userID,
                },
            },
            select: {
                post: {
                    select: { userID: true },
                },
            },
        });

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userFeedPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`likesOnPost:${postID}`);
        pipeline.del(`likesCountOnPost:${postID}`);

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

        res.status(200).json({ success: true });

        //PUBLISH A DELETE NOTIFICATION EVENT
        if (ok.post.userID !== userID) {
            await publisher
                .publish(
                    "notification",
                    JSON.stringify({
                        actorID: userID,
                        type: "DELETE-LIKE",
                        message: "",
                        entityType: "POST",
                        entityID: postID,
                        childEntityID: null,
                    })
                )
                .catch(error => {
                    logger.error("Error on creating notification (deleteLike)", { error });
                });
        }
    } catch (error: any) {
        if (error.code === "P2025") {
            return next(new BadResponse("Invalid ID, resource not found", 404));
        }
        logger.error("Error on deleting post (deleteLike)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

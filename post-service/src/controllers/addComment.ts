import { redis } from "../config/redisConfig.js";
import { prisma } from "../config/prismaConfig.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import { getUserByUserID } from "../grpc/grpcCall.js";
import type { Request, Response, NextFunction } from "express";

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
    //post: base/api/comment/post/:postID

    try {
        const userID = req.user?.userID as string;
        const postID = req.cleanedParams?.postID as string;
        const { comment } = req.cleanedBody;

        //GRPC CALL TO GET USER DATA
        let grpcResponse;
        try {
            grpcResponse = await getUserByUserID({ userID });
        } catch (error) {
            logger.error("Error on grpc call (addComment)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        if (!grpcResponse) {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }
        const user = grpcResponse.user;

        //DB CALL

        const newComment = await prisma.comment.create({
            data: {
                comment,
                postID,
                userID,
            },
        });

        const newCommentWithUserData = { ...newComment, user };

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userFeedPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`commentsOnPost:${postID}`);
        pipeline.del(`commentsCountOnPost:${postID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to delete data in redis (addComment)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on deleting data in redis on query ${index + 1} (addComment)`, { error });
                }
            });
        }

        return res.status(200).json({ success: true, comment: newCommentWithUserData });
    } catch (error: any) {
        if (error.code === "P2003") {
            return next(new BadResponse("Post not found", 404));
        }
        logger.error("Error on adding comment (addComment)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { redis } from "../config/redisConfig.js";
import { logger } from "../utils/logger.js";
import { getUserByUserID } from "../grpc/grpcCall.js";

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //base/api/post/:postID/delete/comment/:commentID

        const userID = req.user?.userID as string;
        const commentID = req.cleanedParams?.commentID as string;
        const postID = req.cleanedParams?.postID as string;

        //DB CALL
        const commentCountAfterDeleting = await prisma.$transaction(async tx => {
            const ok = await tx.comment.deleteMany({
                where: { id: commentID, postID, userID },
            });
            if (ok.count === 0) {
                throw new BadResponse("Invalid ID, resource not found", 404);
            }

            const commentCount = await tx.comment.count({ where: { postID } });

            return commentCount;
        });

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userConnectionPosts:${userID}`);
        pipeline.del(`post:${postID}`);
        pipeline.del(`commentOnPost:${postID}`);
        pipeline.del(`CommentCountOnPost:${postID}`);

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

        return res.status(200).json({ success: true, commentCount: commentCountAfterDeleting });
    } catch (error) {
        if (error instanceof BadResponse) {
            return next(new BadResponse(error.message, error.statusCode));
        }
        logger.error("Error on deleting post (deleteComment)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

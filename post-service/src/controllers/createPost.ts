import { prisma } from "../config/prismaConfig.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redisConfig.js";
import { getUserByUserID } from "../grpc/grpcCall.js";

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
    //post: base/api/post/create

    try {
        const userID = req.user?.userID as string;
        const { post } = req.cleanedBody;

        //GRPC CALL TO GET USER DATA
        let grpcResponse;
        try {
            grpcResponse = await getUserByUserID({ userID });
        } catch (error) {
            logger.error("Error on grpc call (createPost)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        if (!grpcResponse) {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }
        const user = grpcResponse.user;

        //DB CALL
        const newPost = await prisma.post.create({
            data: { post, userID },
            include: {
                _count: {
                    select: { like: true, comment: true },
                },
            },
        });

        const newPostWithUserData = { ...newPost, user };

        //CLEAN CACHED DATA
        const pipeline = redis.pipeline();

        pipeline.del(`userOwnPosts:${userID}`);
        pipeline.del(`userFeedPosts:${userID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to delete data in redis (createPost)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on deleting data in redis on query ${index + 1} (createPost)`, { error });
                }
            });
        }

        return res.status(200).json({ success: true, post: newPostWithUserData });
    } catch (error) {
        logger.error("Error on creating post (createPost)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

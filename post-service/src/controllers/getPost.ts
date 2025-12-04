import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { logger } from "../utils/logger.js";
import { redis } from "../config/redisConfig.js";
import { getUserByUserID } from "../grpc/grpcCall.js";

export const getPost = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/:postID

    try {
        const postID = req.cleanedParams.postID as string;
        //FETCH CACHED DATA FROM REDIS
        let cachedPost;
        try {
            const cached = await redis.get(`post:${postID}`);

            if (cached) {
                try {
                    cachedPost = JSON.parse(cached);
                } catch (error) {
                    logger.error("Corrupted data fetched from redis (getPost)", { error });
                    cachedPost = null;
                }
            }
        } catch (error) {
            logger.error("Error on getiing post from redis (getPost)", { error });
        }

        //RESPONSE TO CLIENT
        if (cachedPost) {
            return res.status(200).json({ success: true, post: cachedPost });
        }
        //DB CALL
        const post = await prisma.post.findUnique({
            where: { id: postID },
            include: {
                _count: { select: { like: true, comment: true } },
            },
        });

        if (!post) {
            return next(new BadResponse("Resource not found", 404));
        }

        //GRPC CALL TO GET USER
        let grpcResponse;
        try {
            grpcResponse = await getUserByUserID({ userID: post.userID });
        } catch (error) {
            logger.error("Error on grpc call (getPost)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        if (!grpcResponse) {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }

        const user = grpcResponse.user;

        const postWithUser = { ...post, user };

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true, post: postWithUser });

        //SAVE IN REDIS
        await redis.set(`post:${postID}`, JSON.stringify(post)).catch(error => {
            logger.warn("Failed to save post in redis (getPost)", { error });
        });
    } catch (error) {
        logger.error("Error on getting post (getPost)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

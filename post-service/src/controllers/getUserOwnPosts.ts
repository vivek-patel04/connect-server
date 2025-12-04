import { logger } from "../utils/logger.js";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { getUserByUserID } from "../grpc/grpcCall.js";
import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redisConfig.js";

export const getUserOwnPosts = async (req: Request, res: Response, next: NextFunction) => {
    //get: base/api/post/user?start=1
    try {
        const userID = req.user?.userID as string;
        const start = req.cleanedQuery?.start as number;
        const end = start + 29;

        // GET DATA FROM REDIS
        let cachedPosts;
        let cachedPostsCount;
        try {
            const cachedData = await redis.get(`userOwnPosts:${userID}`);
            const cachedCount = await redis.get(`userOwnPostsCount:${userID}`);

            if (cachedCount === "0") {
                return res.status(200).json({ success: true, start, end, hasMore: false, posts: [] });
            }
            if (cachedData) {
                try {
                    cachedPosts = JSON.parse(cachedData);
                } catch (error) {
                    cachedPosts = null;
                    logger.warn("Corrupted data fetched from redis (getUserOwnPosts)", { error });
                }
            }

            if (cachedCount) {
                cachedPostsCount = Number(cachedCount);
            }
        } catch (error) {
            logger.warn("Error on fetch user posts data from redis (getUserOwnPosts)", { error });
        }

        //RESPONSE TO CLIENT FROM CACHED DATA
        if (cachedPosts && cachedPostsCount) {
            return res.status(200).json({ success: true, start, end, hasMore: cachedPostsCount > end, posts: cachedPosts });
        }

        //GRPC CALL TO GET USER DATA
        let grpcResponse;
        try {
            grpcResponse = await getUserByUserID({ userID });
        } catch (error) {
            logger.error("Error on grpc call (getUserOwnPosts)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        if (!grpcResponse) {
            return next(new BadResponse("Invalid user ID, resource not found", 404));
        }

        const user = grpcResponse.user;

        // GET DATA FROM DB
        const [posts, postsCount] = await Promise.all([
            prisma.post.findMany({
                where: {
                    userID,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 30,
                skip: start - 1,
            }),

            prisma.post.count({ where: { userID } }),
        ]);

        const postsWithUser = posts.map(post => {
            return { ...post, user };
        });

        res.status(200).json({ success: true, start, end, hasMore: postsCount > end, posts: postsWithUser });

        //SAVE IN REDIS
        const pipeline = redis.pipeline();

        pipeline.set(`userOwnPosts:${userID}`, JSON.stringify(postsWithUser), "EX", 60);
        pipeline.set(`userOwnPostsCount:${userID}`, postsCount, "EX", 60);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to save user post details in redis (getUserOwnPosts)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on saving user posts in redis on query ${index + 1} (getUserOwnPosts)`, { error });
                }
            });
        }
    } catch (error) {
        logger.error("Error on get user own post (getUserOwnPosts)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

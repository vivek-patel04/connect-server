import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { getConnectionUserIDs, getUsersByUserIDs } from "../grpc/grpcCall.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import type { UserType } from "../types/model.types.js";
import { redis } from "../config/redisConfig.js";

export const getPostsOfconnections = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/connection?start=1
    try {
        const userID = req.user?.userID as string;
        const start = req.cleanedQuery?.start as number;
        const end = start + 29;

        //FETCH CACHED DATA IN REDIS
        let cachedPosts;
        let cachedPostsCount;
        try {
            const cachedData = await redis.get(`userConnectionPosts:${userID}`);
            const cachedCount = await redis.get(`userConnectionPostsCount:${userID}`);

            if (cachedCount === "0") {
                return res.status(200).json({ success: true, start, end, hasMore: false, posts: [] });
            }
            if (cachedData) {
                try {
                    cachedPosts = JSON.parse(cachedData);
                } catch (error) {
                    cachedPosts = null;
                    logger.warn("Corrupted data fetched from redis (getPostsOfConnection)", { error });
                }
            }

            if (cachedCount) {
                cachedPostsCount = Number(cachedCount);
            }
        } catch (error) {
            logger.warn("Error on fetch posts data from redis (getPostsOfConnection)", { error });
        }

        //RESPONSE TO CLIENT FROM CACHED DATA
        if (cachedPosts && cachedPostsCount) {
            return res.status(200).json({ success: true, start, end, hasMore: cachedPostsCount > end, posts: cachedPosts });
        }

        //GRPC CALL TO GET CONNECTIONS ID
        let grpcResponseForconnectionIDs;
        try {
            grpcResponseForconnectionIDs = await getConnectionUserIDs({ userID });
        } catch (error) {
            logger.error("Error on grpc call (getPostsOfConnection)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        const connectionIDs = grpcResponseForconnectionIDs.userIDs;

        if (connectionIDs.length === 0) {
            return res.status(200).json({ success: true, start, end, hasMore: false, posts: [] });
        }

        //DB CALL
        const [posts, postsCount] = await Promise.all([
            prisma.post.findMany({
                where: { userID: { in: connectionIDs } },
                orderBy: { createdAt: "desc" },
                skip: start - 1,
                take: 30,
                include: {
                    _count: {
                        select: { like: true, comment: true },
                    },
                },
            }),

            prisma.post.count({ where: { userID: { in: connectionIDs } } }),
        ]);

        //GRPC CALL TO GET USER DATA
        const userIDSet = new Set<string>();
        for (let post of posts) {
            userIDSet.add(post.userID);
        }
        const userIDArray = Array.from(userIDSet);

        let grpcResponseForUsers;
        try {
            grpcResponseForUsers = await getUsersByUserIDs({ userIDs: userIDArray });
        } catch (error) {
            logger.error("Error on grpc call (getPostsOfConnection)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        const usersObj: Record<string, UserType> = {};

        grpcResponseForUsers.users.forEach(user => {
            usersObj[user.id] = user;
        });

        const postsWithUser = posts.map(post => {
            return { ...post, user: usersObj[post.userID] };
        });

        res.status(200).json({ success: true, start, end, hasMore: postsCount > end, posts: postsWithUser });

        //SAVE IN REDIS
        const pipeline = redis.pipeline();

        pipeline.set(`userConnectionPosts:${userID}`, JSON.stringify(postsWithUser), "EX", 60);
        pipeline.set(`userConnectionPostsCount:${userID}`, postsCount, "EX", 60);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to save user connection post details in redis (getPostsOfConnection)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on saving posts in redis on query ${index + 1} (getPostsOfConnection)`);
                }
            });
        }
    } catch (error) {
        logger.error("Error on getting posts (getPostsOfConnection)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

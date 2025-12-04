import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import { getUsersByUserIDs } from "../grpc/grpcCall.js";
import { logger } from "../utils/logger.js";
import type { UserType } from "../types/model.types.js";
import { redis } from "../config/redisConfig.js";

export const getTrendingPosts = async (req: Request, res: Response, next: NextFunction) => {
    //get: base/api/post/trending
    try {
        //GET POSTS FROM REDIS
        let cachedPosts;
        try {
            const cached = await redis.get("trendingPosts");

            if (cached) {
                try {
                    cachedPosts = JSON.parse(cached);
                } catch (error) {
                    logger.warn("Corrupted data fetched from redis (getTrendingPosts)", { error });
                    cachedPosts = null;
                }
            }
        } catch (error: any) {
            logger.warn("Error on get trending posts from redis (getTrendingPosts)", { error });
        }

        //RESPONSE TO CLIENT FROM CACHED DATA
        if (cachedPosts) {
            return res.status(200).json({ success: true, posts: cachedPosts });
        }

        //GET POSTS FROM DB
        const posts = await prisma.post.findMany({
            orderBy: { like: { _count: "desc" } },

            take: 10,
            include: {
                _count: { select: { like: true, comment: true } },
            },
        });

        if (posts.length === 0) {
            return res.status(200).json({ success: true, posts: [] });
        }

        //GRPC CALL TO GET USER DATA
        const userIDSet = new Set<string>();
        for (let post of posts) {
            userIDSet.add(post.userID);
        }
        const userIDArray = Array.from(userIDSet);

        let grpcResponse;
        try {
            grpcResponse = await getUsersByUserIDs({ userIDs: userIDArray });
        } catch (error) {
            logger.error("Error on grpc call (getTrendingPosts)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        let usersObj: Record<string, UserType> = {};

        grpcResponse.users.forEach(user => {
            usersObj[user.id] = user;
        });

        const postsWithUser = posts.map(post => {
            return { ...post, user: usersObj[post.userID] };
        });

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true, posts: postsWithUser });

        //SAVE IN REDIS
        await redis.set("trendingPosts", JSON.stringify(postsWithUser), "EX", 60).catch(error => {
            logger.warn("Error on saving trending posts in redis (getTrendingPosts)", { error });
        });
    } catch (error) {
        logger.error("Error on get trending posts (getTrendingPosts)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

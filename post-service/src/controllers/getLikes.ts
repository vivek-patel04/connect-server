import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { getUsersByUserIDs } from "../grpc/grpcCall.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import type { UserType } from "../types/model.types.js";
import { redis } from "../config/redisConfig.js";

export const getLikes = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/like/users/:postID?start=1

    try {
        const postID = req.cleanedParams.postID as string;
        const start = req.cleanedQuery.start as number;
        const end = start + 29;

        //FETCH CACHED DATA FROM REDIS
        let cachedLikes;
        let cachedLikeCount;
        try {
            const cachedData = await redis.get(`likeOnPost:${postID}`);
            const cachedCount = await redis.get(`likeCountOnPost:${postID}`);

            if (cachedCount === "0") {
                return res.status(200).json({ success: true, start, end, hasMore: false, likes: [] });
            }
            if (cachedData) {
                try {
                    cachedLikes = JSON.parse(cachedData);
                } catch (error) {
                    cachedLikeCount = null;
                    logger.warn("Corrupted data fetched from redis (getLikes)", { error });
                }
            }

            if (cachedCount) {
                cachedLikeCount = Number(cachedCount);
            }
        } catch (error) {
            logger.warn("Error on fetch like data from redis (getLikes)", { error });
        }

        //RESPONSE TO CLIENT FROM CACHED DATA
        if (cachedLikes && cachedLikeCount) {
            return res.status(200).json({ success: true, start, end, hasMore: cachedLikeCount > end, likes: cachedLikes });
        }

        //DB CALL
        const [likes, likeCount] = await Promise.all([
            prisma.like.findMany({
                where: { postID },
                orderBy: {
                    createdAt: "desc",
                },
                skip: start - 1,
                take: 30,
            }),

            prisma.like.count({ where: { postID } }),
        ]);

        if (likeCount === 0) {
            return res.status(200).json({ success: true, start, end, hasMore: false, likes: [] });
        }

        //GRPC CALL TO GET USERS
        const userIDSet = new Set<string>();
        for (let like of likes) {
            userIDSet.add(like.userID);
        }
        const userIDArray = Array.from(userIDSet);

        let grpcResponse;
        try {
            grpcResponse = await getUsersByUserIDs({ userIDs: userIDArray });
        } catch (error) {
            logger.error("Error on grpc call (getLikes)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        let usersObj: Record<string, UserType> = {};

        grpcResponse.users.forEach(user => {
            usersObj[user.id] = user;
        });

        const likesWithUser = likes.map(like => {
            return { ...like, user: usersObj[like.userID] };
        });

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true, start, end, hasMore: likeCount > end, likes: likesWithUser });

        //SAVE IN REDIS
        const pipeline = redis.pipeline();

        pipeline.set(`likeOnPost:${postID}`, JSON.stringify(likesWithUser), "EX", 60);
        pipeline.set(`likeCountOnPost:${postID}`, likeCount, "EX", 60);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to save like details in redis (getLikes)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on saving like in redis on query ${index + 1} (getLikes)`, { error });
                }
            });
        }
    } catch (error) {
        logger.error("Error on getting like details on post (getLikes)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

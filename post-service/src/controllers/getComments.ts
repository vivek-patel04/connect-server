import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { getUsersByUserIDs } from "../grpc/grpcCall.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import type { UserType } from "../types/model.types.js";
import { redis } from "../config/redisConfig.js";

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/like/users/:postID?start=1

    try {
        const postID = req.cleanedParams.postID as string;
        const start = req.cleanedQuery.start as number;
        const end = start + 9;

        //FETCH CACHED DATA FROM REDIS
        let cachedComments;
        let cachedCommentCount;
        try {
            const cachedData = await redis.get(`CommentOnPost:${postID}`);
            const cachedCount = await redis.get(`CommentCountOnPost:${postID}`);

            if (cachedCount === "0") {
                return res.status(200).json({ success: true, start, end, hasMore: false, comments: [] });
            }
            if (cachedData) {
                try {
                    cachedComments = JSON.parse(cachedData);
                } catch (error) {
                    cachedComments = null;
                    logger.warn("Corrupted data fetched from redis (getComments)", { error });
                }
            }

            if (cachedCount) {
                cachedCommentCount = Number(cachedCount);
            }
        } catch (error) {
            logger.warn("Error on fetch comments from redis (getComments)", { error });
        }

        //RESPONSE TO CLIENT FROM CACHED DATA
        if (cachedComments && cachedCommentCount) {
            return res.status(200).json({ success: true, start, end, hasMore: cachedCommentCount > end, comments: cachedComments });
        }

        //DB CALL
        const [comments, commentCount] = await Promise.all([
            prisma.comment.findMany({
                where: { postID },
                orderBy: {
                    createdAt: "desc",
                },
                skip: start - 1,
                take: 10,
            }),

            prisma.comment.count({ where: { postID } }),
        ]);

        if (commentCount === 0) {
            return res.status(200).json({ success: true, start, end, hasMore: false, comments: [] });
        }

        //GRPC CALL TO GET USERS
        const userIDSet = new Set<string>();
        for (let comment of comments) {
            userIDSet.add(comment.userID);
        }
        const userIDArray = Array.from(userIDSet);

        let grpcResponse;
        try {
            grpcResponse = await getUsersByUserIDs({ userIDs: userIDArray });
        } catch (error) {
            logger.error("Error on grpc call (getComments)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        let usersObj: Record<string, UserType> = {};

        grpcResponse.users.forEach(user => {
            usersObj[user.id] = user;
        });

        const commentsWithUser = comments.map(comment => {
            return { ...comment, user: usersObj[comment.userID] };
        });

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true, start, end, hasMore: commentCount > end, likes: commentsWithUser });

        //SAVE IN REDIS
        const pipeline = redis.pipeline();

        pipeline.set(`commentOnPost:${postID}`, JSON.stringify(commentsWithUser), "EX", 60);
        pipeline.set(`CommentCountOnPost:${postID}`, commentCount, "EX", 60);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to save comments in redis (getComments)", { error });
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Error on saving comment in redis on query ${index + 1} (getComments)`, { error });
                }
            });
        }
    } catch (error) {
        logger.error("Error on getting comments on post (getComments)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

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
        const postID = req.cleanedParams.postID!;
        const viewerUserID = req.user?.userID!;
        const cursor = req.cleanedCursor!;
        const take = 15;

        //FETCH CACHED DATA FROM REDIS
        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();

        if (isPageOne) {
            let cachedComments;
            try {
                const cachedData = await redis.get(`commentsOnPost:${postID}`);

                if (cachedData) {
                    try {
                        cachedComments = JSON.parse(cachedData);
                    } catch (error) {
                        cachedComments = null;
                        logger.warn("Corrupted data fetched from redis (getComments)", { error });
                    }
                }
            } catch (error) {
                logger.warn("Error on fetch comments from redis (getComments)", { error });
            }

            //RESPONSE TO CLIENT FROM CACHED DATA
            if (cachedComments) {
                const nextCursor =
                    cachedComments.length === take
                        ? { createdAt: cachedComments[cachedComments.length - 1]?.createdAt, id: cachedComments[cachedComments.length - 1]?.id }
                        : null;
                return res.status(200).json({ success: true, comments: cachedComments, nextCursor });
            }
        }

        //DB CALL
        const comments = await prisma.comment.findMany({
            where: {
                postID,
                OR: [
                    {
                        createdAt: {
                            lt: new Date(cursor.createdAt),
                        },
                    },
                    {
                        createdAt: new Date(cursor.createdAt),
                        id: {
                            lt: cursor.id,
                        },
                    },
                ],
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take,
        });

        if (comments.length === 0) {
            return res.status(200).json({ success: true, comments: [], nextCursor: null });
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
            return { ...comment, user: usersObj[comment.userID], commentOwner: comment.userID === viewerUserID };
        });

        //SAVE IN REDIS
        if (isPageOne) {
            await redis.set(`commentsOnPost:${postID}`, JSON.stringify(commentsWithUser), "EX", 60).catch(error => {
                logger.warn("Failed to save comments in redis (getComments)", { error });
            });
        }

        //RESPONSE TO CLIENT
        const nextCursor = comments.length === take ? { createdAt: comments[comments.length - 1]?.createdAt, id: comments[comments.length - 1]?.id } : null;
        res.status(200).json({ success: true, comments: commentsWithUser, nextCursor });
    } catch (error) {
        logger.error("Error on getting comments on post (getComments)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

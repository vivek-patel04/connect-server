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
        const postID = req.cleanedParams.postID!;
        // const viewerUserID = req.user?.userID!;
        const cursor = req.cleanedCursor!;
        const take = 15;

        //FETCH CACHED DATA FROM REDIS
        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();
        if (isPageOne) {
            let cachedLikes;
            try {
                const cachedData = await redis.get(`likesOnPost:${postID}`);

                if (cachedData) {
                    try {
                        cachedLikes = JSON.parse(cachedData);
                    } catch (error) {
                        logger.warn("Corrupted data fetched from redis (getLikes)", { error });
                    }
                }
            } catch (error) {
                logger.warn("Error on fetch like data from redis (getLikes)", { error });
            }

            //RESPONSE TO CLIENT FROM CACHED DATA
            if (cachedLikes) {
                const nextCursor =
                    cachedLikes.length === take
                        ? { createdAt: cachedLikes[cachedLikes.length - 1]?.createdAt, id: cachedLikes[cachedLikes.length - 1]?.id }
                        : null;
                return res.status(200).json({ success: true, likes: cachedLikes, nextCursor });
            }
        }

        //DB CALL
        const likes = await prisma.like.findMany({
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

        if (likes.length === 0) {
            return res.status(200).json({ success: true, likes: [], nextCursor: null });
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

        //SAVE IN REDIS
        if (isPageOne) {
            await redis.set(`likesOnPost:${postID}`, JSON.stringify(likesWithUser), "EX", 60).catch(error => {
                logger.warn("Failed to save like details in redis (getLikes)", { error });
            });
        }

        //RESPONSE TO CLIENT
        const nextCursor = likes.length === take ? { createdAt: likes[likes.length - 1]?.createdAt, id: likes[likes.length - 1]?.id } : null;
        res.status(200).json({ success: true, likes: likesWithUser, nextCursor });
    } catch (error) {
        logger.error("Error on getting like details on post (getLikes)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

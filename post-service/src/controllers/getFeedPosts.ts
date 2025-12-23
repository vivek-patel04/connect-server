import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prismaConfig.js";
import { getConnectionUserIDs, getUsersByUserIDs } from "../grpc/grpcCall.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import type { UserType } from "../types/model.types.js";
import { redis } from "../config/redisConfig.js";

export const getFeedPosts = async (req: Request, res: Response, next: NextFunction) => {
    //base/api/post/connection?start=1
    try {
        const userID = req.user?.userID!;
        const cursor = req.cleanedCursor!;

        //FETCH CACHED DATA IN REDIS
        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();

        if (isPageOne) {
            let cachedPosts;
            try {
                const cachedData = await redis.get(`userFeedPosts:${userID}`);

                if (cachedData) {
                    try {
                        cachedPosts = JSON.parse(cachedData);
                    } catch (error) {
                        cachedPosts = null;
                        logger.warn("Corrupted data fetched from redis (getFeedPosts)", { error });
                    }
                }
            } catch (error) {
                logger.warn("Error on fetch posts data from redis (getFeedPosts)", { error });
            }

            //RESPONSE TO CLIENT FROM CACHED DATA
            if (cachedPosts) {
                const nextCursor =
                    cachedPosts.length === 15
                        ? { createdAt: cachedPosts[cachedPosts.length - 1]?.createdAt, id: cachedPosts[cachedPosts.length - 1]?.id }
                        : null;
                return res.status(200).json({ success: true, posts: cachedPosts, nextCursor });
            }
        }

        //GRPC CALL TO GET CONNECTIONS ID
        let grpcResponseForconnectionIDs;
        try {
            grpcResponseForconnectionIDs = await getConnectionUserIDs({ userID });
        } catch (error) {
            logger.error("Error on grpc call (getFeedPosts)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        let allIDs = grpcResponseForconnectionIDs.userIDs;
        allIDs.push(userID);

        //DB CALL
        const posts = await prisma.post.findMany({
            where: {
                userID: { in: allIDs },
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
            take: 15,
            include: {
                _count: {
                    select: {
                        like: true,
                        comment: true,
                    },
                },
            },
        });

        if (posts.length === 0) {
            return res.status(200).json({ success: true, posts: [], nextCursor: null });
        }

        const postIDs = posts.map(p => p.id);

        const viewerLikeOnPosts = await prisma.like.findMany({
            where: {
                userID: userID,
                postID: { in: postIDs },
            },
            select: {
                postID: true,
            },
        });

        const likedPostSet = new Set(viewerLikeOnPosts.map(p => p.postID));

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
            logger.error("Error on grpc call (getFeedPosts)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        const usersObj: Record<string, UserType> = {};

        grpcResponseForUsers.users.forEach(user => {
            usersObj[user.id] = user;
        });

        const postsWithUser = posts.map(post => ({
            ...post,
            user: usersObj[post.userID],
            viewerLiked: likedPostSet.has(post.id),
            viewerPost: post.userID === userID,
        }));

        //SAVE IN REDIS
        if (isPageOne) {
            await redis.set(`userFeedPosts:${userID}`, JSON.stringify(postsWithUser), "EX", 15).catch(error => {
                logger.warn("Failed to save user feed posts in redis (getFeedPosts)", { error });
            });
        }

        const nextCursor = posts.length === 15 ? { createdAt: posts[posts.length - 1]?.createdAt, id: posts[posts.length - 1]?.id } : null;
        return res.status(200).json({ success: true, posts: postsWithUser, nextCursor });
    } catch (error) {
        logger.error("Error on getting posts (getFeedPosts)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

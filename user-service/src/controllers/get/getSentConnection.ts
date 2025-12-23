import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

interface CursorType {
    createdAt: string;
    id: string;
}

export const sentConnectionRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;
        const cursor = req.cleanedCursor as CursorType;
        const take = 15;

        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();

        //REDIS QUERY
        if (isPageOne) {
            try {
                const cachedData = await redis.get(`userSentConnection:${userID}`);

                let cachedUsers;
                if (cachedData) {
                    try {
                        cachedUsers = JSON.parse(cachedData);
                    } catch (error) {
                        logger.warn("Corrupted data fetched from redis (getSentConnection)", { error });
                    }
                }

                if (cachedUsers) {
                    const nextCursor =
                        cachedUsers.length === take
                            ? { createdAt: cachedUsers[cachedUsers.length - 1]?.createdAt, id: cachedUsers[cachedUsers.length - 1]?.id }
                            : null;

                    return res.status(200).json({ success: true, users: cachedUsers, nextCursor });
                }
            } catch (error) {
                logger.warn("Error on fetch sent connections from redis (getSentConnection)", { error });
            }
        }

        //DB QUERY IF REDIS QUERY FAILED
        const users = await prisma.connection.findMany({
            where: {
                senderID: userID,
                status: "pending",
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
            select: {
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        personalData: { select: { thumbnailURL: true } },
                        createdAt: true,
                    },
                },
            },
        });

        const nextCursor = users.length === take ? { createdAt: users[users.length - 1]?.receiver?.createdAt, id: users[users.length - 1]?.receiver.id } : null;
        const finalUsers = users.map(user => user.receiver);

        //SAVE DATA IN REDIS
        if (isPageOne) {
            await redis.set(`userSentConnection:${userID}`, JSON.stringify(finalUsers), "EX", 60).catch(error => {
                logger.warn(`Error on saving user's sent connections in redis (getSentConnection)`, { error });
            });
        }

        //RESPONSE TO CLIENT
        return res.status(200).json({ success: true, users: finalUsers, nextCursor });
    } catch (error) {
        logger.error("Error on getting sent connections data (getSentConnection)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

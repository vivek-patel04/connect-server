import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

interface CursorType {
    createdAt: string;
    id: string;
}

export const receivedConnectionRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;
        const cursor = req.cleanedCursor as CursorType;
        const take = 15;

        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();

        //REDIS QUERY
        if (isPageOne) {
            try {
                const cachedData = await redis.get(`userReceivedConnection:${userID}`);

                let cachedUsers;
                if (cachedData) {
                    try {
                        cachedUsers = JSON.parse(cachedData);
                    } catch (error) {
                        logger.warn("Corrupted data fetched from redis (getReceivedConnection)", { error });
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
                logger.warn("Error on fetch data from redis (getReceivedConnection)", { error });
            }
        }

        //DB QUERY IF REDIS QUERY FAILED
        const users = await prisma.connection.findMany({
            where: {
                receiverID: userID,
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
                sender: {
                    select: {
                        id: true,
                        name: true,
                        personalData: { select: { thumbnailURL: true } },
                        createdAt: true,
                    },
                },
            },
        });

        const nextCursor = users.length === take ? { createdAt: users[users.length - 1]?.sender?.createdAt, id: users[users.length - 1]?.sender.id } : null;
        const finalUsers = users.map(user => user.sender);

        //SAVE DATA IN REDIS
        if (isPageOne) {
            await redis.set(`userReceivedConnection:${userID}`, JSON.stringify(finalUsers), "EX", 60).catch(error => {
                logger.warn(`Error on saving data in redis (getReceivedConnection)`, { error });
            });
        }

        //RESPONSE TO CLIENT
        return res.status(200).json({ success: true, users: finalUsers, nextCursor });
    } catch (error) {
        logger.error("Error on getting received connections data (getReceivedConnection)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

interface CursorType {
    createdAt: string;
    id: string;
}
export const connection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID as string;
        const cursor = req.cleanedCursor as CursorType;
        const take = 15;

        const isPageOne = cursor.id === "ffffffff-ffff-ffff-ffff-ffffffffffff" && cursor.createdAt > new Date().toISOString();

        //REDIS QUERY
        if (isPageOne) {
            try {
                const cachedData = await redis.get(`userConnection:${userID}`);

                let cachedUsers;
                if (cachedData) {
                    try {
                        cachedUsers = JSON.parse(cachedData);
                    } catch (error) {
                        logger.warn("Corrupted data fetched from redis (getConnection)", { error });
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
                logger.warn("Error on fetch data from redis (getConnection)", { error });
            }
        }

        //DB QUERY IF REDIS QUERY FAILED
        const connections = await prisma.connected.findMany({
            where: {
                userID,
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

            select: {
                connectionUser: {
                    select: {
                        id: true,
                        name: true,
                        personalData: {
                            select: {
                                thumbnailURL: true,
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        const nextCursor =
            connections.length === take
                ? { createdAt: connections[connections.length - 1]?.connectionUser.createdAt, id: connections[connections.length - 1]?.connectionUser.id }
                : null;
        const finalUsers = connections.map(c => c.connectionUser);

        //SAVE IN REDIS
        if (isPageOne) {
            await redis.set(`userConnection:${userID}`, JSON.stringify(finalUsers), "EX", 60).catch(error => {
                logger.warn(`Error on saving data in redis (getConnection)`, { error });
            });
        }

        //CLIENT RESPONSE
        return res.status(200).json({ success: true, users: finalUsers, nextCursor });
    } catch (error) {
        logger.error("Error on get connections (getConnection)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

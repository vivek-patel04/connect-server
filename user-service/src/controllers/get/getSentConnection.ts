import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

export const sentConnectionRequest = async (req: Request, res: Response, next: NextFunction) => {
    //url= http://localhost:4002/connection/sent?start=51

    try {
        const userID = req.user?.userID as string;

        let { start } = req.cleanedQuery as {
            start: number;
        };

        let connections;
        let totalCount;

        //REDIS QUERY
        try {
            const cachedCount = await redis.get(`userSentConnectionCount:${userID}`);
            const cachedConnections = await redis.get(`userSentConnection:${userID}:${start}`);

            if (!cachedConnections || !cachedCount) throw Error("404");

            totalCount = Number(cachedCount);

            if (Number.isNaN(totalCount)) throw Error("404");

            try {
                connections = JSON.parse(cachedConnections);
            } catch (error) {
                logger.warn("Corrupted data fetched from redis userSentConnection");
                throw Error("404");
            }

            //RESPONSE TO CLIENT
            return res.status(200).json({
                success: true,
                start,
                end: start + 19,
                hasAfter: totalCount > start + 19,
                connections,
            });
        } catch (error: any) {
            if (error.message === "404") {
            } else {
                logger.warn("Error on fetching sent connection details from redis", { error });
            }
        }

        //DB QUERY IF REDIS QUERY FAILED
        [totalCount, connections] = await Promise.all([
            prisma.connection.count({ where: { senderID: userID, status: "pending" } }),

            prisma.connection.findMany({
                where: {
                    senderID: userID,
                    status: "pending",
                },

                orderBy: {
                    createdAt: "desc",
                },

                skip: start - 1,
                take: 20,
                select: {
                    receiver: {
                        select: {
                            id: true,
                            name: true,
                            personalData: { select: { thumbnailURL: true } },
                        },
                    },
                },
            }),
        ]);

        //RESPONSE TO CLIENT
        res.status(200).json({
            success: true,
            start,
            end: start + 19,
            hasAfter: totalCount > start + 19,
            connections,
        });

        //SAVE DATA IN REDIS
        const pipeline = redis.pipeline();
        pipeline.set(`userSentConnectionCount:${userID}`, totalCount, "EX", 60);
        pipeline.set(`userSentConnection:${userID}:${start}`, JSON.stringify(connections), "EX", 60);

        const pipelineResult = await pipeline.exec().catch(error => {
            logger.warn("Error on saving user's sent connection and count in redis", { error });
            return null;
        });

        if (pipelineResult) {
            pipelineResult.forEach(([error, d], index) => {
                if (error) {
                    logger.warn(`Error on saving user's sent connection on query ${index + 1} in redis`, { error });
                }
            });
        }
    } catch (error) {
        logger.error("Error on getSentConnection", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

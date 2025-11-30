import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

export const connection = async (req: Request, res: Response, next: NextFunction) => {
    //url= http://localhost:4002/connection/:id?start=51&count=20&sort=asc

    try {
        const userID = req.cleanedParams as string;
        let { start, count, sort } = req.cleanedQuery as {
            start: number;
            count: number;
            sort: "asc" | "desc" | "recent";
        };

        let connections;
        let totalCount;

        //REDIS QUERY
        try {
            const cachedCount = await redis.get(`userConnectionCount:${userID}`);
            const cachedConnections = await redis.get(`userConnection:${userID}:${start}:${count}:${sort}`);

            if (!cachedConnections || !cachedCount) throw Error("404");

            totalCount = Number(cachedCount);

            if (Number.isNaN(totalCount)) throw Error("404");

            try {
                connections = JSON.parse(cachedConnections);
            } catch (error) {
                logger.warn("Corrupted data fetched from redis userConnection");
                throw Error("404");
            }

            //RESPONSE TO CLIENT
            return res.status(200).json({
                success: true,
                start,
                end: start + count - 1,
                hasAfter: totalCount > start + count - 1,
                connections,
            });
        } catch (error: any) {
            if (error.message === "404") {
            } else {
                logger.warn("Error on fetching user connection details from redis", { error });
            }
        }

        //DB QUERY IF REDIS QUERY FAILED
        [totalCount, connections] = await Promise.all([
            prisma.connected.count({ where: { userID } }),

            prisma.connected.findMany({
                where: {
                    userID,
                },
                orderBy:
                    sort === "recent"
                        ? {
                              createdAt: "desc",
                          }
                        : {
                              connectionUser: {
                                  name: sort,
                              },
                          },
                skip: start - 1,
                take: count,
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
                        },
                    },
                },
            }),
        ]);

        //CLIENT RESPONSE
        res.status(200).json({
            success: true,
            start,
            end: start + count - 1,
            hasAfter: totalCount > start + count - 1,
            connections,
        });

        const pipeline = redis.pipeline();
        pipeline.set(`userConnection:${userID}:${start}:${count}:${sort}`, JSON.stringify(connections), "EX", 60);
        pipeline.set(`userConnectionCount:${userID}`, totalCount, "EX", 60);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Error on set user connection and count in redis", { error });
            return null;
        });

        if (pipelineResponse)
            pipelineResponse.forEach(([error, d], index) => {
                if (error) {
                    logger.warn(`Error on redis set userConnection on query ${index + 1}`, { error });
                }
            });
    } catch (error) {
        logger.error("Error on getConnection", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

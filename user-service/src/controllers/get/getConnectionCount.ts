import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import { redis } from "../../config/redisClient.js";
import { prisma } from "../../config/prismaClient.js";

export const connectionCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.cleanedParams?.id;

        if (!userID) {
            return next(new BadResponse("Invalid URL", 400));
        }

        let count;
        //FETCH FROM REDIS
        count = await redis.get(`userConnectionCount:${userID}`).catch(error => {
            logger.warn("Error on fetch user connection count from redis", { error });
        });

        //FETCH FROM DB
        if (!count) {
            count = await prisma.connected.count({
                where: { userID },
            });

            if (count)
                await redis.set(`userConnectionCount:${userID}`, count, "EX", 60 * 15).catch(error => {
                    logger.warn("Error on save user connection count in redis", { error });
                });
        }

        count = Number(count) || 0;

        return res.status(200).json({ success: true, connectionCount: count });
    } catch (error) {
        logger.error("Error on get connection count", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

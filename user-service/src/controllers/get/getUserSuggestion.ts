import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import type { NextFunction, Request, Response } from "express";

export const userSuggestion = async (req: Request, res: Response, next: NextFunction) => {
    //url= base/connection/suggestion

    try {
        const userID = req.user?.userID as string;

        let userSuggestions;
        //REDIS QUERY
        const cached = await redis.get(`userSuggestion:${userID}`).catch(error => {
            logger.warn("Error on fetching user suggestions (getUserSuggestion)", { error });
            return null;
        });

        if (cached) {
            try {
                userSuggestions = JSON.parse(cached);
            } catch (error) {
                userSuggestions = null;
                logger.warn("Corrupted data fetched from redis (getUserSuggestion)", { error });
            }
        }

        //DB QUERY
        if (!userSuggestions) {
            const isUserExist = await prisma.user.findUnique({ where: { id: userID } });

            if (!isUserExist) throw new BadResponse("Invalid ID or resource not found", 404);

            userSuggestions = await prisma.user.findMany({
                where: {
                    id: { not: userID },
                    connectionSent: { none: { receiverID: userID } },
                    connectionReceived: { none: { senderID: userID } },
                },
                orderBy: { createdAt: "desc" },
                take: 30,
                select: { id: true, name: true, personalData: { select: { thumbnailURL: true } } },
            });
        }

        //CLIENT RESPONSE
        res.status(200).json({
            success: true,
            users: userSuggestions,
        });

        await redis
            .set(`userSuggestion:${userID}`, JSON.stringify(userSuggestions), "EX", 60)
            .catch(error => logger.warn("Failed to save suggested user in redis (getUserSuggestion)", { error }));
    } catch (error) {
        logger.error("Error on getConnectionSuggestion", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

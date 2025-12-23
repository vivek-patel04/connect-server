import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prismaClient.js";
import { redis } from "../../config/redisClient.js";
import { error } from "console";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";

export const connectionRelation = async (req: Request, res: Response, next: NextFunction) => {
    //url: base/api/user/connection/relation/:id
    try {
        const loggedinUserID = req.user?.userID as string;
        const otherUserID = req.cleanedParams.id as string;

        if (loggedinUserID === otherUserID) {
            return res.status(200).json({ success: true, relation: "self" });
        }

        //FETCH CACHED DATA FROM REDIS
        const cachedRelation = await redis.get(`userRelation${loggedinUserID}:${otherUserID}`).catch(error => {
            logger.warn("Failed to get user relation from redis (connectionRelation)", { error });
            return null;
        });

        if (cachedRelation) {
            return res.status(200).json({ success: true, relation: cachedRelation });
        }

        //DB CALL
        let pair;
        if (loggedinUserID < otherUserID) {
            pair = `${loggedinUserID}:${otherUserID}`;
        } else {
            pair = `${otherUserID}:${loggedinUserID}`;
        }

        const userRelation = await prisma.connection.findUnique({
            where: { pair },
            select: {
                receiverID: true,
                senderID: true,
                status: true,
            },
        });

        if (!userRelation) {
            await redis.set(`userRelation${loggedinUserID}:${otherUserID}`, "no relation", "EX", 60 * 5).catch(error => {
                logger.warn("Failed to save user relation in redis (connectionRelation)", { error });
            });

            return res.status(200).json({ success: true, relation: "no relation" });
        }

        if (userRelation.status === "accepted") {
            await redis.set(`userRelation${loggedinUserID}:${otherUserID}`, "connection", "EX", 60 * 5).catch(error => {
                logger.warn("Failed to save user relation in redis (connectionRelation)", { error });
            });

            return res.status(200).json({ success: true, relation: "connection" });
        }

        if (loggedinUserID === userRelation.senderID) {
            await redis.set(`userRelation${loggedinUserID}:${otherUserID}`, "request sent", "EX", 60 * 5).catch(error => {
                logger.warn("Failed to save user relation in redis (connectionRelation)", { error });
            });

            return res.status(200).json({ success: true, relation: "request sent" });
        }

        if (loggedinUserID === userRelation.receiverID) {
            await redis.set(`userRelation${loggedinUserID}:${otherUserID}`, "request received", "EX", 60 * 5).catch(error => {
                logger.warn("Failed to save user relation in redis (connectionRelation)", { error });
            });
            return res.status(200).json({ success: true, relation: "request received" });
        }
    } catch (error) {
        logger.error("Error on get user connection relation (connectionRelation)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

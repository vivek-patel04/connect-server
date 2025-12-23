import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prismaClient.js";
import { BadResponse } from "../../utils/badResponse.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const sendConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        //url= base/api/user/connection/send/:id
        const senderUserID = req.user?.userID as string;
        const receiverUserID = req.cleanedParams.id as string;

        if (senderUserID === receiverUserID) {
            return next(new BadResponse("Sender and receiver can not be same", 400));
        }

        let pair;
        if (senderUserID < receiverUserID) {
            pair = `${senderUserID}:${receiverUserID}`;
        } else {
            pair = `${receiverUserID}:${senderUserID}`;
        }

        await prisma.connection.create({
            data: { senderID: senderUserID, receiverID: receiverUserID, pair },
        });

        //REDIS CLEAN UP
        const pipeline = redis.pipeline();

        pipeline.del(`userReceivedConnection:${receiverUserID}`);
        pipeline.del(`userSentConnection:${senderUserID}`);
        pipeline.del(`userSuggestion:${senderUserID}`);
        pipeline.del(`userSuggestion:${receiverUserID}`);
        pipeline.del(`userRelation${receiverUserID}:${senderUserID}`);
        pipeline.del(`userRelation${senderUserID}:${receiverUserID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to execute delete user connections in redis (sendConnectionRequest)", { error });
            return null;
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Failed to execute redis ops on query ${index + 1} (sendConnectionRequest)`);
                }
            });
        }

        //RESPONSE TO CLIENT
        return res.status(200).json({ success: true });
    } catch (error: any) {
        if (error.code === "P2002") {
            return next(new BadResponse("Request or connection already exist", 400));
        }
        return next(new BadResponse("Internal server error", 500));
    }
};

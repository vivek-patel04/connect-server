import type { NextFunction, Request, Response } from "express";
import { BadResponse } from "../../utils/badResponse.js";
import { prisma } from "../../config/prismaClient.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const deleteSentRequest = async (req: Request, res: Response, next: NextFunction) => {
    //url: base/api/user/connection/sent/delete/:id
    try {
        const loggedinUserID = req.user?.userID as string;
        const receiverUserID = req.cleanedParams.id as string;

        if (loggedinUserID === receiverUserID) {
            return next(new BadResponse("User can not delete connection with self", 400));
        }

        const count = await prisma.connection.deleteMany({ where: { senderID: loggedinUserID, receiverID: receiverUserID, status: "pending" } });

        if (count.count === 0) return next(new BadResponse("Connection request not exist", 404));

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true });

        //REDIS CLEAN UP
        const pipeline = redis.pipeline();
        pipeline.del(`userReceivedConnectionCount:${receiverUserID}`);
        pipeline.del(`userSentConnectionCount:${loggedinUserID}`);
        pipeline.del(`userReceivedConnection:${receiverUserID}`);
        pipeline.del(`userSentConnection:${loggedinUserID}`);
        pipeline.del(`userSuggestion:${receiverUserID}`);
        pipeline.del(`userSuggestion:${loggedinUserID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to execute delete user connections in redis (deleteSentRequest)", { error });
            return null;
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Failed to execute redis ops on query ${index + 1} (deleteSentRequest)`);
                }
            });
        }
    } catch (error: any) {
        return next(new BadResponse("Internal Server Error", 500));
    }
};

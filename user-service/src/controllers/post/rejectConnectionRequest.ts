import type { NextFunction, Request, Response } from "express";
import { BadResponse } from "../../utils/badResponse.js";
import { prisma } from "../../config/prismaClient.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const rejectConnection = async (req: Request, res: Response, next: NextFunction) => {
    //url: base/api/user/connection/reject/:id
    try {
        const loggedinUserID = req.user?.userID as string;
        const senderUserID = req.cleanedParams.id as string;

        if (loggedinUserID === senderUserID) {
            return next(new BadResponse("User can not receive self request", 400));
        }

        const count = await prisma.connection.deleteMany({ where: { senderID: senderUserID, receiverID: loggedinUserID, status: "pending" } });

        if (count.count === 0) return next(new BadResponse("Connection request not exist", 404));

        //REDIS CLEAN UP
        const pipeline = redis.pipeline();
        pipeline.del(`userReceivedConnectionCount:${loggedinUserID}`);
        pipeline.del(`userSentConnectionCount:${senderUserID}`);
        pipeline.del(`userReceivedConnection:${loggedinUserID}`);
        pipeline.del(`userSentConnection:${senderUserID}`);
        pipeline.del(`userSuggestion:${loggedinUserID}`);
        pipeline.del(`userSuggestion:${senderUserID}`);
        pipeline.del(`userRelation${loggedinUserID}:${senderUserID}`);
        pipeline.del(`userRelation${senderUserID}:${loggedinUserID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to execute delete user connections in redis (rejectConnectionRequest)", { error });
            return null;
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Failed to execute redis ops on query ${index + 1} (rejectConnectionRequest)`);
                }
            });
        }

        //RESPONSE TO CLIENT
        return res.status(200).json({ success: true });
    } catch (error: any) {
        if (error.code === "P2025") {
            return next(new BadResponse("Connection request not exist", 400));
        } else {
            return next(new BadResponse("Internal Server Error", 500));
        }
    }
};

import type { NextFunction, Request, Response } from "express";
import { BadResponse } from "../../utils/badResponse.js";
import { prisma } from "../../config/prismaClient.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const acceptConnection = async (req: Request, res: Response, next: NextFunction) => {
    //url: base/api/user/connection/accept/:id
    try {
        const loggedinUserID = req.user?.userID as string;
        const senderUserID = req.cleanedParams.id as string;

        if (loggedinUserID === senderUserID) {
            return next(new BadResponse("Sender and accepter can not be same", 400));
        }

        await prisma.$transaction(async tx => {
            const updated = await tx.connection.updateMany({
                where: { senderID: senderUserID, receiverID: loggedinUserID, status: "pending" },
                data: { status: "accepted" },
            });

            if (updated.count === 0) {
                throw new BadResponse("No pending request", 400);
            }

            await tx.connected.createMany({
                data: [
                    { userID: loggedinUserID, connectionUserID: senderUserID },
                    { userID: senderUserID, connectionUserID: loggedinUserID },
                ],
            });
        });

        //REDIS CLEAN UP
        const pipeline = redis.pipeline();
        pipeline.del(`userConnectionCount:${loggedinUserID}`);
        pipeline.del(`userConnectionCount:${senderUserID}`);
        pipeline.del(`userReceivedConnectionCount:${loggedinUserID}`);
        pipeline.del(`userSentConnectionCount:${senderUserID}`);
        pipeline.del(`userConnection:${loggedinUserID}`);
        pipeline.del(`userConnection:${senderUserID}`);
        pipeline.del(`userReceivedConnection:${loggedinUserID}`);
        pipeline.del(`userSentConnection:${senderUserID}`);
        pipeline.del(`userSuggestion:${senderUserID}`);
        pipeline.del(`userSuggestion:${loggedinUserID}`);
        pipeline.del(`userRelation${loggedinUserID}:${senderUserID}`);
        pipeline.del(`userRelation${senderUserID}:${loggedinUserID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to execute delete user connections in redis (acceptConnectionRequest)", { error });
            return null;
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Failed to execute redis ops on query ${index + 1} (acceptConnectionRequest)`);
                }
            });
        }

        //RESPONSE TO CLIENT
        return res.status(200).json({ success: true });
    } catch (error) {
        if (error instanceof BadResponse) {
            return next(error);
        } else {
            return next(new BadResponse("Internal Server Error", 500));
        }
    }
};

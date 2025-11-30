import type { NextFunction, Request, Response } from "express";
import { BadResponse } from "../../utils/badResponse.js";
import { prisma } from "../../config/prismaClient.js";
import { redis } from "../../config/redisClient.js";
import { logger } from "../../utils/logger.js";

export const deleteConnection = async (req: Request, res: Response, next: NextFunction) => {
    //url: base/api/user/connection/delete/:id
    try {
        const loggedinUserID = req.user?.userID as string;
        const deleteUserID = req.cleanedParams.id as string;

        if (loggedinUserID === deleteUserID) {
            return next(new BadResponse("User cannot delete connection with self", 400));
        }

        let pair;
        if (loggedinUserID < deleteUserID) {
            pair = `${loggedinUserID}:${deleteUserID}`;
        } else {
            pair = `${deleteUserID}:${loggedinUserID}`;
        }

        const [deleteCount] = await prisma.$transaction([
            prisma.connection.deleteMany({ where: { pair, status: "accepted" } }),
            prisma.connected.deleteMany({
                where: {
                    OR: [
                        { userID: loggedinUserID, connectionUserID: deleteUserID },
                        { userID: deleteUserID, connectionUserID: loggedinUserID },
                    ],
                },
            }),
        ]);

        if (deleteCount.count === 0) return next(new BadResponse("No accepted connection exists between these users", 404));

        //RESPONSE TO CLIENT
        res.status(200).json({ success: true });

        //REDIS CLEAN UP
        const pipeline = redis.pipeline();

        pipeline.del(`userConnectionCount:${loggedinUserID}`);
        pipeline.del(`userConnectionCount:${deleteUserID}`);
        pipeline.del(`userConnection:${loggedinUserID}`);
        pipeline.del(`userConnection:${deleteUserID}`);
        pipeline.del(`userSuggestion:${loggedinUserID}`);
        pipeline.del(`userSuggestion:${deleteUserID}`);

        const pipelineResponse = await pipeline.exec().catch(error => {
            logger.warn("Failed to execute delete user connections in redis (deleteConnection)", { error });
            return null;
        });

        if (pipelineResponse) {
            pipelineResponse.forEach(([error], index) => {
                if (error) {
                    logger.warn(`Failed to execute redis ops on query ${index + 1} (deleteConnection)`);
                }
            });
        }
    } catch (error: any) {
        return next(new BadResponse("Internal Server Error", 500));
    }
};

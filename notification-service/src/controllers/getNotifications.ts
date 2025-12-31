import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import { Notification } from "../models/notificationModel.js";

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID!;
        const cursor = req.cleanedCursor!;
        const limit = 15;

        const notifications = await Notification.find({
            userID,
            $or: [{ createdAt: { $lt: cursor.createdAt } }, { createdAt: cursor.createdAt, _id: { $lt: cursor.id } }],
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit);

        const nextCursor =
            notifications.length === limit
                ? { createdAt: notifications[notifications.length - 1]?.createdAt, id: notifications[notifications.length - 1]?._id }
                : null;

        return res.status(200).json({ success: true, notifications, nextCursor });
    } catch (error) {
        logger.error("Error on getting notifications (getNotifications)", { error });
        return next(new BadResponse("Internal Server Error", 500));
    }
};

import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/badResponse.js";
import { Notification } from "../models/notificationModel.js";

export const getUnreadNotificationsCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userID = req.user?.userID!;

        const count = await Notification.countDocuments({ userID, isRead: false });

        return res.status(200).json({ success: true, count });
    } catch (error) {
        logger.error("Error on getting notifications (getUnreadNotificationsCount)", { error });
        return next(new BadResponse("Internal Server Error", 500));
    }
};

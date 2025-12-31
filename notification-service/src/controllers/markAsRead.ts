import type { Request, Response, NextFunction } from "express";
import { Notification } from "../models/notificationModel.js";
import { logger } from "../utils/logger.js";

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notificationID = req.cleanedParams.notificationID;

        await Notification.findOneAndUpdate({ _id: notificationID }, { isRead: true }, { new: true });

        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error("Error on marking notification as read (markAsRead)", { error });
        return next(error);
    }
};

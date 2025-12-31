import { Notification } from "../models/notificationModel.js";
import { logger } from "../utils/logger.js";

interface DataType {
    userID: string;
    actorID: string;
    type: string;
    message: string;
    entityType: string;
    entityID: string | null;
    childEntityID: string | null;
}

export const createNotification = async (data: DataType) => {
    try {
        const newNotification = await Notification.create({
            userID: data.userID,
            actorID: data.actorID,
            type: data.type,
            message: data.message,
            entityType: data.entityType,
            entityID: data.entityID,
            childEntityID: data.childEntityID,
        });

        return newNotification;
    } catch (error) {
        logger.error("Error on creating notification (createNotification)", { error });
        return null;
    }
};

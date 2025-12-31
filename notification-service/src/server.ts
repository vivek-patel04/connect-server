import http from "node:http";
import { WebSocketServer } from "ws";
import { app } from "./app.js";
import { subscriber } from "./config/redisConfig.js";
import { createNotification } from "./controllers/createNotification.js";
import { logger } from "./utils/logger.js";
import { port } from "./config/envConfig.js";
import { connectMongo } from "./config/mongoConfig.js";
import { Notification } from "./models/notificationModel.js";

const httpServer = http.createServer(app);

const wss = new WebSocketServer({ server: httpServer });

const onlineUsers = new Map();

wss.on("connection", ws => {
    ws.on("message", data => {
        const message = JSON.parse(data.toString());

        if (message.type === "AUTH") {
            ws.userID = message.userID;
            onlineUsers.set(message.userID, ws);
        }
    });

    ws.on("close", () => {
        if (ws.userID) {
            onlineUsers.delete(ws.userID);
        }
    });
});

subscriber.subscribe("notification");

subscriber.on("message", async (channel, message) => {
    const data = JSON.parse(message);

    if (data.type === "DELETE-LIKE") {
        try {
            await Notification.findOneAndDelete({
                actorID: data.actorID,
                type: "ADD-LIKE",
                entityType: "POST",
                entityID: data.entityID,
            });
        } catch (error) {
            logger.warn("Failed to delete like notification", { error });
        }
        return;
    }

    if (data.type === "DELETE-COMMENT") {
        try {
            await Notification.findOneAndDelete({
                actorID: data.actorID,
                type: "ADD-COMMENT",
                entityType: "POST",
                entityID: data.entityID,
                childEntityID: data.childEntityID,
            });
        } catch (error) {
            logger.warn("Failed to delete comment notification", { error });
        }
        return;
    }

    if (data.type === "CANCEL-REQUEST") {
        try {
            await Notification.findOneAndDelete({
                userID: data.userID,
                actorID: data.actorID,
                type: "SENT-REQUEST",
                entityType: "USER",
            });
        } catch (error) {
            logger.warn("Failed to delete sent request notification", { error });
        }
        return;
    }

    const notification = await createNotification({
        userID: data.userID,
        actorID: data.actorID,
        type: data.type,
        message: data.message,
        entityType: data.entityType,
        entityID: data.entityID,
        childEntityID: data.childEntityID,
    });

    if (notification) {
        const ws = onlineUsers.get(notification.userID);

        if (ws) {
            ws.send(JSON.stringify(notification));
        }
    }
});

await connectMongo();
httpServer.listen(port, () => {
    logger.info(`Notification server is running on port ${port}`);
});

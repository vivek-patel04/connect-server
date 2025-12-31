import express from "express";
import { userAuthentication } from "../middlewares/userAuthentication.js";
import { getNotifications, markAsRead, getUnreadNotificationsCount } from "../controllers/index.js";
import { cursorValidation, notificationIDValidation } from "../middlewares/inputValidators.js";

export const notificationRouter = express.Router();

notificationRouter.patch("/markAsRead/:notificationID", userAuthentication, notificationIDValidation, markAsRead);
notificationRouter.get("/get/notifications", userAuthentication, cursorValidation, getNotifications);
notificationRouter.get("/get/unreadCount", userAuthentication, getUnreadNotificationsCount);

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userID: {
            type: String,
            required: true,
            index: true,
        },

        actorID: {
            type: String,
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["ADD-LIKE", "DELETE-LIKE", "ADD-COMMENT", "DELETE-COMMENT", "SENT-REQUEST", "CANCEL-REQUEST", "ACCEPT-REQUEST", "SYSTEM", "PROFILE"],
            required: true,
        },

        message: {
            type: String,
            required: true,
        },

        entityType: {
            type: String,
            enum: ["POST", "USER"],
            required: true,
        },

        entityID: {
            type: String,
            default: null,
        },
        childEntityID: {
            type: String,
            default: null,
        },

        isRead: {
            type: Boolean,
            default: false,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Notification = mongoose.model("Notification", notificationSchema);

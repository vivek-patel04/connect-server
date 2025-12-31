import mongoose from "mongoose";
import { mongoURL } from "./envConfig.js";
import { logger } from "../utils/logger.js";

export const connectMongo = async () => {
    try {
        await mongoose.connect(mongoURL);
        logger.info("MongoDB connected");
    } catch (error) {
        logger.error("Failed to connect mongo db", { error });
        process.exit(1);
    }
};

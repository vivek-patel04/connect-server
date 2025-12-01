import dotenv from "dotenv";
import { app } from "./app.js";
import { port } from "./config/envConfig.js";
import { logger } from "./utils/logger.js";

dotenv.config();

app.listen(port, () => {
    logger.info(`Post service is running on port ${port}`);
});

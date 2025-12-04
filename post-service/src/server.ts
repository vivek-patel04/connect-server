import dotenv from "dotenv";
import { app } from "./app.js";
import { logger } from "./utils/logger.js";
import { parseEnv, port } from "./config/envConfig.js";

dotenv.config();
parseEnv();

app.listen(port, () => {
    logger.info(`Post service is running on port ${port}`);
});

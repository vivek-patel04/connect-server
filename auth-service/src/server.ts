import dotenv from "dotenv";
import { app } from "./app.js";
import { parseEnv } from "./config/envConfig.js";
import { port } from "./config/envConfig.js";
import { logger } from "./utils/logger.js";

dotenv.config();
parseEnv();

app.listen(port, () => {
    logger.info(`Auth service is running on port ${port}`);
});

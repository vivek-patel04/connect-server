import dotenv from "dotenv";
import { app } from "./app.js";
import { ServerCredentials } from "@grpc/grpc-js";
import { authUserGrpcServer } from "./grpc/authUserGrpcServer.js";
import { userServiceGrpcPort, parseEnv, port } from "./config/envConfig.js";
import { logger } from "./utils/logger.js";

dotenv.config();

parseEnv();

app.listen(port, () => {
    logger.info(`User service is running on port ${port}`);
});

authUserGrpcServer.bindAsync(`0.0.0.0:${userServiceGrpcPort}`, ServerCredentials.createInsecure(), (err, port) => {
    logger.info(`gRPC server is running on port ${port}`);
});

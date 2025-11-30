import { AuthUserCommunicationClient } from "../grpc/generated/auth-user.js";
import { credentials } from "@grpc/grpc-js";
import { userServiceContainerName, userServiceGrpcPort } from "./envConfig.js";

export const authUserGrpcClient = new AuthUserCommunicationClient(`${userServiceContainerName}:${userServiceGrpcPort}`, credentials.createInsecure());

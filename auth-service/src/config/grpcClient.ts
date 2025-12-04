import { credentials } from "@grpc/grpc-js";
import { userServiceContainerName, userServiceGrpcPort } from "./envConfig.js";
import { UserCommunicationClient } from "../grpc/generated/user.js";

export const authUserGrpcClient = new UserCommunicationClient(`${userServiceContainerName}:${userServiceGrpcPort}`, credentials.createInsecure());

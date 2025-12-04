import { UserCommunicationClient } from "../grpc/generated/user.js";
import { userServiceContainerName, userServiceGrpcPort } from "./envConfig.js";
import { credentials } from "@grpc/grpc-js";

export const postUserGrpcClient = new UserCommunicationClient(`${userServiceContainerName}:${userServiceGrpcPort}`, credentials.createInsecure());

import { z } from "zod";
import { logger } from "../utils/logger.js";
import { prisma } from "../config/prismaClient.js";
import { Server, status } from "@grpc/grpc-js";
import { grpcSecret } from "../config/envConfig.js";
import { UserCommunicationService } from "./generated/user.js";
import type { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js";
import type {
    getConnectionUserIDsRequest,
    getConnectionUserIDsResponse,
    getUserByUserIDRequest,
    getUserByUserIDResponse,
    getUserIdPassRequest,
    getUserIdPassResponse,
    getUsersByUserIDsRequest,
    getUsersByUserIDsResponse,
    userRegistrationRequest,
    userRegistrationResponse,
} from "./generated/user.js";

export const userGrpcServer = new Server();

userGrpcServer.addService(UserCommunicationService, {
    getUserIdPass: async (call: ServerUnaryCall<getUserIdPassRequest, getUserIdPassResponse>, callback: sendUnaryData<getUserIdPassResponse>) => {
        try {
            const token = call.metadata.get("x-grpc-secret");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== grpcSecret) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { email } = call.request;

            const emailSchema = z.email();
            const result = emailSchema.safeParse(email);

            if (!result.success) {
                return callback({ code: status.INVALID_ARGUMENT, details: "Invalid arguments" }, undefined);
            }

            const fetchIdPass = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    password: true,
                },
            });

            if (!fetchIdPass) {
                return callback({ code: status.NOT_FOUND, details: "User not found" }, undefined);
            }

            const data = { userID: fetchIdPass.id, hashedPassword: fetchIdPass.password };
            return callback(null, data);
        } catch (error) {
            logger.error("Error on gRPC: getUserIdPassword", { error });
            return callback({ code: status.INTERNAL, details: "gRPC internal error" }, undefined);
        }
    },

    userRegistration: async (call: ServerUnaryCall<userRegistrationRequest, userRegistrationResponse>, callback: sendUnaryData<userRegistrationResponse>) => {
        try {
            const token = call.metadata.get("x-grpc-secret");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== grpcSecret) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { name, email, hashedPassword } = call.request;

            const userRegistrationSchema = z.object({
                name: z.string().max(50),
                email: z.email(),
                hashedPassword: z.string(),
            });

            const result = userRegistrationSchema.safeParse({ name, email, hashedPassword });

            if (!result.success) {
                return callback({ code: status.INVALID_ARGUMENT, details: "Invalid arguments" }, undefined);
            }

            const ok = await prisma.user.create({
                data: { name, email, password: hashedPassword, personalData: { create: {} } },
                select: { id: true },
            });

            return callback(null, { userID: ok.id });
        } catch (error: any) {
            if (error.code === "P2002") return callback({ code: status.INVALID_ARGUMENT, details: "Email already exist" }, undefined);

            logger.error("Error on gRPC: userRegistration", { error });
            return callback({ code: status.INTERNAL, details: "gRPC internal error" }, undefined);
        }
    },

    /////////////////////////////////////////////////////////////////////////////

    getUsersByUserIDs: async (
        call: ServerUnaryCall<getUsersByUserIDsRequest, getUsersByUserIDsResponse>,
        callback: sendUnaryData<getUsersByUserIDsResponse>
    ) => {
        try {
            const token = call.metadata.get("x-grpc-secret");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== grpcSecret) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { userIDs } = call.request;

            const schema = z.array(z.uuid());

            const result = schema.safeParse(userIDs);

            if (!result.success) {
                return callback({ code: status.INVALID_ARGUMENT, details: "Invalid arguments" }, undefined);
            }

            const users = await prisma.user.findMany({
                where: {
                    id: { in: userIDs },
                },
                select: {
                    id: true,
                    name: true,
                    personalData: {
                        select: { thumbnailURL: true },
                    },
                },
            });

            if (users.length === 0) {
                return callback({ code: status.NOT_FOUND, details: "Resource not found" }, undefined);
            }

            const response = users.map(user => ({ id: user.id, name: user.name, thumbnailURL: user.personalData?.thumbnailURL as string }));

            return callback(null, { users: response });
        } catch (error) {
            logger.error("Error on gRPC: getUsersByUserIDs", { error });
            return callback({ code: status.INTERNAL, details: "gRPC internal error" }, undefined);
        }
    },

    getUserByUserId: async (call: ServerUnaryCall<getUserByUserIDRequest, getUserByUserIDResponse>, callback: sendUnaryData<getUserByUserIDResponse>) => {
        try {
            const token = call.metadata.get("x-grpc-secret");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== grpcSecret) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { userID } = call.request;

            const schema = z.uuid();

            const result = schema.safeParse(userID);

            if (!result.success) {
                return callback({ code: status.INVALID_ARGUMENT, details: "Invalid arguments" }, undefined);
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: userID,
                },
                select: {
                    id: true,
                    name: true,
                    personalData: {
                        select: { thumbnailURL: true },
                    },
                },
            });

            if (!user) {
                return callback({ code: status.NOT_FOUND, details: "Resource not found" }, undefined);
            }

            return callback(null, { user: { id: user.id, name: user.name, thumbnailURL: user.personalData?.thumbnailURL as string } });
        } catch (error) {
            logger.error("Error on gRPC: getUserByUserId", { error });
            return callback({ code: status.INTERNAL, details: "gRPC internal error" }, undefined);
        }
    },

    getConnectionUserIDs: async (
        call: ServerUnaryCall<getConnectionUserIDsRequest, getConnectionUserIDsResponse>,
        callback: sendUnaryData<getConnectionUserIDsResponse>
    ) => {
        try {
            const token = call.metadata.get("x-grpc-secret");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== grpcSecret) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { userID } = call.request;

            const schema = z.uuid();

            const result = schema.safeParse(userID);

            if (!result.success) {
                return callback({ code: status.INVALID_ARGUMENT, details: "Invalid arguments" }, undefined);
            }

            const dbResponse = await prisma.connected.findMany({
                where: { userID },
                select: { connectionUserID: true },
            });

            const userIDs = dbResponse.map(u => {
                return u.connectionUserID;
            });
            return callback(null, { userIDs });
        } catch (error) {
            logger.error("Error on gRPC: getUserByUserId", { error });
            return callback({ code: status.INTERNAL, details: "gRPC internal error" }, undefined);
        }
    },
});

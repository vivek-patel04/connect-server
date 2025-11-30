import z from "zod";
import { logger } from "../utils/logger.js";
import { prisma } from "../config/prismaClient.js";
import { Server, status } from "@grpc/grpc-js";
import { authUserGrpcKey } from "../config/envConfig.js";
import {
    AuthUserCommunicationService,
    userRegistrationRequest,
    userRegistrationResponse,
    getUserIdPassRequest,
    getUserIdPassResponse,
} from "./generated/auth-user.js";
import type { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";

export const authUserGrpcServer = new Server();

authUserGrpcServer.addService(AuthUserCommunicationService, {
    getUserIdPass: async (call: ServerUnaryCall<getUserIdPassRequest, getUserIdPassResponse>, callback: sendUnaryData<getUserIdPassResponse>) => {
        try {
            const token = call.metadata.get("x-api-key");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== authUserGrpcKey) {
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
            const token = call.metadata.get("x-api-key");

            if (!token.length) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            if (token[0] !== authUserGrpcKey) {
                return callback({ code: status.UNAUTHENTICATED, details: "Unauthorized" }, undefined);
            }

            const { name, email, hashedPassword } = call.request;

            const userRegistrationSchema = z.object({
                name: z
                    .string()
                    .max(50)
                    .regex(/^[A-Za-z]+( [A-Za-z]+)*$/),
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
});

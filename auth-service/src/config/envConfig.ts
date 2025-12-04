import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const port = Number(process.env.PORT as string);
export const nodeEnv = process.env.NODE_ENV as string;
export const grpcSecret = process.env.GRPC_SECRET as string;
export const grpcCallTTL = Number(process.env.GRPC_CALL_TTL as string);
export const publicKey = process.env.PUBLIC_KEY as string;
export const privateKey = process.env.PRIVATE_KEY as string;
export const redisURL = process.env.REDIS_URL as string;
export const userServiceContainerName = process.env.USER_SERVICE_DOCKER_CONTAINER_NAME as string;
export const userServiceGrpcPort = Number(process.env.USER_SERVICE_GRPC_PORT as string);

//VALIDATE
const envSchema = z.object({
    PORT: z.string().regex(/^[0-9]+$/),
    NODE_ENV: z.enum(["development", "production"]),
    GRPC_SECRET: z.string().min(1),
    GRPC_CALL_TTL: z.string().regex(/^[0-9]+$/),
    REDIS_URL: z.string().min(1),
    PUBLIC_KEY: z.string().min(1),
    PRIVATE_KEY: z.string().min(1),
    USER_SERVICE_DOCKER_CONTAINER_NAME: z.string().min(1),
    USER_SERVICE_GRPC_PORT: z.string().regex(/^[0-9]+$/),
});

export const parseEnv = () => {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const ErrorArray = result.error.issues;
        const errorMessages = ErrorArray.map(err => err.message);

        console.error("Env variables configuration error\n", errorMessages);
        process.exit(1);
    }
};

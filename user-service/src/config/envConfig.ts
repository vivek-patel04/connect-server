import dotenv from "dotenv";
import z from "zod";

dotenv.config();

export const port = Number(process.env.PORT as string);
export const nodeEnv = process.env.NODE_ENV as string;
export const publicKey = process.env.PUBLIC_KEY as string;
export const authUserGrpcKey = process.env.AUTH_USER_GRPC_SECRET as string;
export const cloudinaryName = process.env.CLOUDINARY_NAME as string;
export const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY as string;
export const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET as string;
export const databaseURL = process.env.DATABASE_URL as string;
export const redisURL = process.env.REDIS_URL as string;
export const userServiceGrpcPort = Number(process.env.USER_SERVICE_GRPC_PORT as string);

//VALIDATE
const envSchema = z.object({
    PORT: z.string().regex(/^[0-9]+$/),
    USER_SERVICE_GRPC_PORT: z.string().regex(/^[0-9]+$/),
    NODE_ENV: z.enum(["development", "production"]),
    DATABASE_URL: z.string().min(1),
    PUBLIC_KEY: z.string().min(1),
    AUTH_USER_GRPC_SECRET: z.string().min(1),
    CLOUDINARY_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z.string().min(1),
    REDIS_URL: z.string().min(1),
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

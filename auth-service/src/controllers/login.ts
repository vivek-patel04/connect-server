import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { redis } from "../config/redisClient.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/BadResponse.js";
import { getUserIdPass } from "../grpc/grpcCall.js";
import { nodeEnv, privateKey } from "../config/envConfig.js";
import type { Request, Response, NextFunction } from "express";
import type { LoginCleanedBodyType } from "../types/types.model.js";

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.cleanedBody as LoginCleanedBodyType;

        let user;

        //GET USER ID AND HASHED PASSWORD USING MAIL: GRPC CALL
        try {
            user = await getUserIdPass(email); //{userId, hashedPassword }
        } catch (error: any) {
            if (error.details === "User not found") {
                return next(new BadResponse("Invalid credentials", 401));
            }

            logger.error("Error on grpc: getUserBasic (login)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        //RATE LIMIT
        let attempt: number;
        try {
            attempt = Number(await redis.get(`loginAttempt:${user.userID}`)) || 1;

            if (attempt >= 5) return next(new BadResponse("Too many failed attempts, try after some time ", 403));
        } catch (error) {
            logger.warn("Failed to get user login attempt from redis (login)", { error });
            attempt = 1;
        }

        //CHECK PASSWORD
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword as string);

        if (!isPasswordValid) {
            await redis.set(`loginAttempt:${user.userID}`, attempt + 1, "EX", 3600).catch(error => {
                logger.warn("Failed on saving login attempt in redis (login)", { error });
            });

            return next(new BadResponse("Invalid credentials", 401));
        }

        await redis.del(`loginAttempt:${user.userID}`).catch(error => {
            logger.warn("Failed to delete login attempt in redis (login)", { error });
        });

        //TOKENS
        const csrfToken = crypto.randomBytes(128).toString("base64url");
        const csrfTokenHash = crypto.createHash("sha256").update(csrfToken).digest("hex");

        let accessToken;
        try {
            const payload = { userID: user.userID as string, csrfTokenHash };
            accessToken = jwt.sign(payload, privateKey as string, { expiresIn: "20m", algorithm: "RS256" });
        } catch (error) {
            logger.error("Error on creating access token (login)", { error });
            return next(new BadResponse("Internal server Error", 500));
        }

        const refreshToken = crypto.randomBytes(128).toString("base64url");
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        try {
            const payload = { userID: user.userID as string };

            const pipeline = redis.pipeline();

            pipeline.set(`refreshToken:${refreshTokenHash}`, JSON.stringify(payload), "EX", 60 * 60 * 24 * 7);
            pipeline.sadd(`refreshtoken:userID:${user.userID as string}`, refreshTokenHash);

            const pipelineResponse = await pipeline.exec();

            if (pipelineResponse) {
                pipelineResponse.forEach(([error], index) => {
                    if (error) {
                        logger.error(`Error on saving refresh token in redis on query ${index + 1} (login)`, { error });
                        return next(new BadResponse("Internal server error", 500));
                    }
                });
            }
        } catch (error) {
            logger.error("Error on saving refresh token in redis (login)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(Date.now() + 1000 * 60 * 20),
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            })
            .cookie("csrfToken", csrfToken, {
                httpOnly: false,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            })
            .set("Cache-Control", "no-store")
            .json({
                success: true,
            });
    } catch (error) {
        logger.error("Error on user login (login)", { error });
        return next(new BadResponse("Internal server Error", 500));
    }
};

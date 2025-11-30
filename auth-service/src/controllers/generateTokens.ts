import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { redis } from "../config/redisClient.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/BadResponse.js";
import { nodeEnv, privateKey } from "../config/envConfig.js";
import type { Request, Response, NextFunction } from "express";

export const generateTokens = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clientToken = req.cookies?.refreshToken;
        if (!clientToken) return next(new BadResponse("Refresh token missing", 401));

        const clientRefreshTokenHash = crypto.createHash("sha256").update(clientToken).digest("hex");

        //VERIFY CLIENT REFRESH TOKEN
        let userID;
        try {
            const existedToken = await redis.get(`refreshToken:${clientRefreshTokenHash}`);

            if (!existedToken) return next(new BadResponse("Invalid token", 401));

            try {
                const parsed = JSON.parse(existedToken); //{userId}
                userID = parsed.userID;
            } catch (error) {
                logger.warn("Corrupted refresh token fetched from redis (generateTokens)", { error });
                return next(new BadResponse("Service interrupted, please login", 500));
            }
        } catch (error) {
            logger.warn("Failed to get refresh token from redis (generateTokens)", { error });
            return next(new BadResponse("Service interrupted, please login", 500));
        }

        //GENERATE NEW TOKENS
        const newCsrfToken = crypto.randomBytes(128).toString("base64url");
        const newCsrfTokenHash = crypto.createHash("sha256").update(newCsrfToken).digest("hex");

        let newAccessToken;
        try {
            const payload = { userID, csrfTokenHash: newCsrfTokenHash };
            newAccessToken = jwt.sign(payload, privateKey as string, { expiresIn: "20m", algorithm: "RS256" });
        } catch (error) {
            logger.error("Error on creating access token (generateTokens)", { error });
            return next(new BadResponse("Internal server Error", 500));
        }

        const newRefreshToken = crypto.randomBytes(128).toString("base64url");
        const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

        // ROTATE REFRESH TOKEN IN REDIS
        try {
            const payload = { userID };

            const pipeline = redis.pipeline();

            pipeline.set(`refreshToken:${newRefreshTokenHash}`, JSON.stringify(payload), "EX", 60 * 60 * 24 * 7);
            pipeline.sadd(`refreshtoken:userID:${userID}`, newRefreshTokenHash);
            pipeline.del(`refreshToken:${clientRefreshTokenHash}`);
            pipeline.srem(`refreshToken:userID:${userID}`, clientRefreshTokenHash);

            const pipelineResponse = await pipeline.exec();

            if (pipelineResponse) {
                pipelineResponse.forEach(([error], index) => {
                    if (error) {
                        logger.error(`Error on executing refresh token ratotion in redis on query ${index + 1} (generateTokens)`, { error });
                        return next(new BadResponse("Service interupted, Please login", 500));
                    }
                });
            }
        } catch (error) {
            logger.error("Error on executing refresh token ratotion in redis (generateTokens)", { error });
            return next(new BadResponse("Internal Server error", 500));
        }

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(Date.now() + 1000 * 60 * 20),
            })
            .cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            })
            .cookie("csrfToken", newCsrfToken, {
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
        logger.error("Error on generate tokens (generateTokens)", { error });
        return next(new BadResponse("Internal server Error", 500));
    }
};

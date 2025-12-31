import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { publisher, redis } from "../config/redisClient.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/BadResponse.js";
import { userRegistration } from "../grpc/grpcCall.js";
import { nodeEnv, privateKey } from "../config/envConfig.js";
import type { Request, Response, NextFunction } from "express";
import type { SignupCleanedBodyType } from "../types/types.model.js";

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.cleanedBody as SignupCleanedBodyType;

        const hashedPassword = await bcrypt.hash(password, 10);

        //GRPC CALL: REGISTER USER
        let userID: string;
        try {
            const grpcRes = await userRegistration({ name, email, hashedPassword }); //{userID: id}
            userID = grpcRes.userID;
        } catch (error: any) {
            if (error.details === "Email already exist") {
                return next(new BadResponse("Email already exist", 400));
            }

            logger.error("Error on grpc call: userRegistration (register)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        //TOKENS
        const csrfToken = crypto.randomBytes(128).toString("base64url");
        const csrfTokenHash = crypto.createHash("sha256").update(csrfToken).digest("hex");

        let accessToken;
        try {
            const payload = { userID, csrfTokenHash };
            accessToken = jwt.sign(payload, privateKey as string, { expiresIn: "20m", algorithm: "RS256" });
        } catch (error) {
            logger.error("Error on creating access token (register)", { error });
            return next(new BadResponse("Internal server Error", 500));
        }

        const refreshToken = crypto.randomBytes(128).toString("base64url");
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        try {
            const payload = { userID };

            const pipeline = redis.pipeline();

            pipeline.set(`refreshToken:${refreshTokenHash}`, JSON.stringify(payload), "EX", 60 * 60 * 24 * 7);
            pipeline.sadd(`refreshtoken:userID:${userID}`, refreshTokenHash);

            const pipelineResponse = await pipeline.exec();

            if (pipelineResponse) {
                pipelineResponse.forEach(([error], index) => {
                    if (error) {
                        logger.error(`Error on saving refresh token in redis on query ${index + 1} (register)`, { error });
                        return next(new BadResponse("Internal server error", 500));
                    }
                });
            }
        } catch (error) {
            logger.error("Error on saving refresh token in redis (register)", { error });
            return next(new BadResponse("Internal server error", 500));
        }

        res.status(201)
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
                message: "Successfully user registered",
            });

        //CREATE NOTIFICATION
        await publisher
            .publish(
                "notification",
                JSON.stringify({
                    userID,
                    actorID: userID,
                    type: "PROFILE",
                    message: "Successfully user registered, Please complete your profile",
                    entityType: "USER",
                    entityID: null,
                    childEntityID: null,
                })
            )
            .catch(error => {
                logger.error("Error on creating notification (register)", { error });
            });
    } catch (error: any) {
        logger.error("Error on user registration (register)", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

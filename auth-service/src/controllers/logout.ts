import crypto from "node:crypto";
import { redis } from "../config/redisClient.js";
import { logger } from "../utils/logger.js";
import { BadResponse } from "../utils/BadResponse.js";
import { nodeEnv } from "../config/envConfig.js";
import type { Request, Response, NextFunction } from "express";

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    const clearCookiesAndLogout = () => {
        return res
            .status(200)
            .cookie("accessToken", "", {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(0),
            })
            .cookie("refreshToken", "", {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(0),
            })
            .cookie("csrfToken", "", {
                httpOnly: false,
                sameSite: "lax",
                path: "/",
                secure: nodeEnv === "production",
                expires: new Date(0),
            })
            .set("Cache-Control", "no-store")
            .json({
                success: true,
                message: "User successfully signed out",
            });
    };

    try {
        const clientToken = req.cookies?.refreshToken;
        if (!clientToken) {
            return clearCookiesAndLogout();
        }

        const clientTokenHash = crypto.createHash("sha256").update(clientToken).digest("hex");

        //VERIFY REFRESH TOKEN IN DB
        let userID;
        try {
            const existedToken = await redis.get(`refreshToken:${clientTokenHash}`);
            if (!existedToken) return clearCookiesAndLogout();

            const parsed = JSON.parse(existedToken);
            userID = parsed.userID;
        } catch (error) {
            logger.warn("Failed to get refresh token or corrupted refresh token from redis", { error });
            return clearCookiesAndLogout();
        }

        //DELETE REFRESH TOKEN
        try {
            await redis.multi().del(`refreshToken:${clientTokenHash}`).srem(`refreshToken:userID:${userID}`, clientTokenHash).exec();
        } catch (error) {
            logger.error("Failed to delete the refresh token in redis", { error });
            return clearCookiesAndLogout();
        }

        return clearCookiesAndLogout();
    } catch (error) {
        logger.error("Error on user signout", { error });
        return clearCookiesAndLogout();
    }
};

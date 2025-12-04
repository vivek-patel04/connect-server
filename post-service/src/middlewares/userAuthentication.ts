import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import { publicKey } from "../config/envConfig.js";
import { BadResponse } from "../utils/badResponse.js";
import type { DecodedTokenType } from "../types/model.types.js";
import type { Request, Response, NextFunction } from "express";

export const userAuthentication = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken;

        if (!token) return next(new BadResponse("Token missing, Unauthorized", 401));

        let decoded;
        try {
            decoded = jwt.verify(token, publicKey as string, { algorithms: ["RS256"] });
        } catch (error) {
            return next(new BadResponse("Expired or invalid token", 401));
        }

        const { userID, csrfTokenHash } = decoded as DecodedTokenType;
        if (!userID || !csrfTokenHash) return next(new BadResponse("Invalid payload, token not acceptable", 401));

        req.user = { userID, csrfTokenHash };
        next();
    } catch (error) {
        logger.error("User authentication error", { error });
        return next(new BadResponse("Internal server error", 500));
    }
};

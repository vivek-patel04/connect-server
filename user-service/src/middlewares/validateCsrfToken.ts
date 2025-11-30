import crypto from "node:crypto";
import { BadResponse } from "../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";

export const csrfTokenValidation = (req: Request, res: Response, next: NextFunction) => {
    const csrfTokenHash = req.user?.csrfTokenHash as string;
    const csrfToken = req.get("x-csrf-token");

    if (!csrfToken) return next(new BadResponse("CSRF token not found", 401));

    const hash = crypto.createHash("sha256").update(csrfToken).digest("hex");
    const isValid = hash === csrfTokenHash;

    if (!isValid) return next(new BadResponse("Invalid csrf token", 401));
    next();
};

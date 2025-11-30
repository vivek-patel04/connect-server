import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { BadResponse } from "../utils/BadResponse.js";

const loginSchema = z.object({
    email: z
        .string({ message: "Email must be a string" })
        .trim()
        .toLowerCase()
        .email({ message: "Email is not valid" })
        .max(50, { message: "Email can contain maximum 50 characters" }),
    password: z
        .string({ message: "Password must be a string" })
        .trim()
        .min(8, { message: "Password must contain minimum 8 characters" })
        .max(20, { message: "Password can contain maximum 20 characters" }),
});
export const loginInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const result = loginSchema.safeParse(req.body);
    if (result.error) return next(new BadResponse(result.error?.issues[0]?.message as string, 400));

    req.cleanedBody = result.data;
    next();
};

const registerSchema = loginSchema.extend({
    name: z.string({ message: "Name must be a string" }).trim().max(50, { message: "Name can contain maximum 50 characters" }),
});
export const registerInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const result = registerSchema.safeParse(req.body);
    if (result.error) return next(new BadResponse(result.error?.issues[0]?.message as string, 400));

    req.cleanedBody = result.data;
    next();
};

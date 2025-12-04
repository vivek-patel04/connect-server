import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { BadResponse } from "../utils/BadResponse.js";

const loginSchema = z.object({
    email: z
        .string({ message: "Email must be a string" })
        .trim()
        .toLowerCase()
        .email({ message: "Email is not valid" })
        .max(50, { message: "Email must be 50 characters or fewer" }),
    password: z
        .string({ message: "Password must be a string" })
        .trim()
        .min(8, { message: "Password must be atleast 8 characters" })
        .max(20, { message: "Password must be 20 characters or fewer" })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-!@#$*._/])[A-Za-z0-9!@#$*._]+$/, {
            message: "Password must include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (- ! @ # $ * . / _).",
        }),
});
export const loginInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const result = loginSchema.safeParse(req.body);
    if (result.error) return next(new BadResponse(result.error?.issues[0]?.message as string, 400));

    req.cleanedBody = result.data;
    next();
};

const registerSchema = loginSchema.extend({
    name: z
        .string({ message: "Name must be a string" })
        .trim()
        .min(1, { message: "Name can not be empty" })
        .max(50, { message: "Name must be 50 characters or fewer" }),
});
export const registerInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const result = registerSchema.safeParse(req.body);
    if (result.error) return next(new BadResponse(result.error?.issues[0]?.message as string, 400));

    req.cleanedBody = result.data;
    next();
};

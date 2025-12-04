import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { BadResponse } from "../utils/badResponse.js";

const startSchema = z
    .string({ message: "Invalid data type" })
    .min(1, { message: "start can not be empty" })
    .regex(/^[0-9]+$/, { message: "Start can be a positive integer" })
    .transform(input => {
        return Number(input);
    })
    .refine(
        input => {
            if (input == 0) return false;
            return true;
        },
        { message: "Start can not be 0" }
    );

const idSchema = z.uuid({ message: "Invalid ID" });

////////////////////////////////////////////////////////////////////////////////////

export const postIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        postID: idSchema,
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid URL", 400));

    req.cleanedParams = data;
    next();
};

export const commentIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        commentID: idSchema,
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid URL", 400));

    req.cleanedParams = data;
    next();
};

export const likeIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        likeID: idSchema,
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid URL", 400));

    req.cleanedParams = data;
    next();
};

export const startQueryValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        start: startSchema,
    });

    const { success, data, error } = schema.safeParse(req.query);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedQuery = data;
    next();
};

export const postInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        post: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Post can not be empty" })
            .max(700, { message: "Post must be 700 characters or fewer" }),
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const commentInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        comment: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Comment can not be empty" })
            .max(500, { message: "Comment must be 500 characters or fewer" }),
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

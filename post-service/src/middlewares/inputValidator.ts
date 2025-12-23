import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { BadResponse } from "../utils/badResponse.js";

const idSchema = z.string().uuid({ message: "Invalid ID" });

////////////////////////////////////////////////////////////////////////////////////

export const postIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        postID: idSchema,
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid URL", 400));

    req.cleanedParams = { ...req.cleanedParams, ...data };
    next();
};

export const commentIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        commentID: idSchema,
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid URL", 400));

    req.cleanedParams = { ...req.cleanedParams, ...data };
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

export const cursorValidation = (req: Request, res: Response, next: NextFunction) => {
    let cursor = req.query?.cursor;

    if (!cursor) {
        return next(new BadResponse("Cursor is missing", 404));
    }

    try {
        cursor = JSON.parse(cursor as string);
    } catch (error) {
        return next(new BadResponse("Invalid cursor", 400));
    }

    const schema = z.object({
        createdAt: z.iso.datetime(),
        id: z.uuid(),
    });

    const { success, data, error } = schema.safeParse(cursor);

    if (!success) {
        return next(new BadResponse("Invalid cursor", 400));
    }

    req.cleanedCursor = data;
    next();
};

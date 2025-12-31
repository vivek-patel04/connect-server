import type { Request, Response, NextFunction } from "express";
import { BadResponse } from "../utils/badResponse.js";
import z from "zod";
import mongoose from "mongoose";

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
        id: z.string().refine(id => mongoose.Types.ObjectId.isValid(id)),
    });

    const { success, data, error } = schema.safeParse(cursor);

    if (!success) {
        return next(new BadResponse("Invalid cursor", 400));
    }

    req.cleanedCursor = data;
    next();
};

export const notificationIDValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        notificationID: z.string().refine(id => mongoose.Types.ObjectId.isValid(id)),
    });

    const { success, data, error } = schema.safeParse(req.params);

    if (!success) return next(new BadResponse("Invalid id in URL", 400));

    req.cleanedParams = { ...req.cleanedParams, ...data };
    next();
};

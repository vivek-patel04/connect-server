import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    let name = err.name || "Unknown Name";
    let statusCode = err.statusCode || 500;
    let message = err.message || "Unknown message";
    let stack = err.stack || "Unknown stack";

    const production = process.env.ENV === "production";

    if (production) {
        return res.status(statusCode).json({ success: false, message });
    } else {
        return res.status(statusCode).json({ success: false, name, statusCode, message, stack });
    }
};

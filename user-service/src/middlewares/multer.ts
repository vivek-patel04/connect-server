import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { BadResponse } from "../utils/badResponse.js";

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

export const multerMiddlewareForProfilePicture = (req: Request, res: Response, next: NextFunction) => {
    const handler = upload.single("profilePic");

    handler(req, res, (err: any) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return next(new BadResponse("File too large. Max 2MB allowed", 400));
            }
            return next(new BadResponse("Error processing file upload", 400));
        }
        next();
    });
};

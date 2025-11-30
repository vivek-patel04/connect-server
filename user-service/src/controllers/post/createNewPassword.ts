import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import bcrypt from "bcrypt";

export const createPassword = async (req: Request, res: Response, next: NextFunction) => {
    //url= base/api/user/update/password
    try {
        const { email, password }: { email: string; password: string } = req.cleanedBody;

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({ where: { email }, data: { password: hashedPassword } });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        if (error.code === "P2025") {
            return next(new BadResponse("Invalid Email", 401));
        }
        logger.error("Error on update forgotten password", { error });
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

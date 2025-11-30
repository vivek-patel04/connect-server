import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prismaClient.js";
import { logger } from "../../utils/logger.js";
import { BadResponse } from "../../utils/badResponse.js";
import bcrypt from "bcrypt";

export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    //url= base/api/user/change/password
    try {
        const userID = req.user?.userID as string;
        const { oldPassword, newPassword }: { oldPassword: string; newPassword: string } = req.cleanedBody;

        await prisma.$transaction(async tx => {
            const user = await tx.user.findUnique({ where: { id: userID } });
            if (!user) throw new BadResponse("Unauthorized, invalid id", 401);

            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

            if (!isOldPasswordValid) throw new BadResponse("Invalid password", 401);

            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            await tx.user.update({ where: { id: userID }, data: { password: newHashedPassword } });
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        if (error instanceof BadResponse) {
            return next(error);
        }
        logger.error("Error on update forgotten password", { error });
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

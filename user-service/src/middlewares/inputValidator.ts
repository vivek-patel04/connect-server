import { z } from "zod";
import { BadResponse } from "../utils/badResponse.js";
import type { Request, Response, NextFunction } from "express";
import type {} from "zod";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const passwordSchema = z
    .string({ message: "Invalid data type" })
    .trim()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(20, { message: "Password must be at most 20 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-!@#$*._/])[A-Za-z0-9!@#$*._]+$/, {
        message: "Password must include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (- ! @ # $ * . / _).",
    });

const descriptionSchema = z.string({ message: "Invalid data type" }).trim().max(750, { message: "Description must be 750 characters or fewer" }).optional();

const dateSchema = z
    .string({ message: "Invalid data type" })
    .trim()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine(
        input => {
            const [year, month, date] = input.split("-").map(str => Number(str));

            if (!year || !month || !date) return false;

            const d = new Date(year, month - 1, date);

            return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === date;
        },
        { message: "Invalid date" }
    );

const dateSchemaOptional = z
    .string({ message: "Invalid data type" })
    .trim()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine(
        input => {
            if (!input) return true;
            const [year, month, date] = input.split("-").map(str => Number(str));

            if (!year || !month || !date) return false;

            const d = new Date(year, month - 1, date);

            return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === date;
        },
        { message: "Invalid date" }
    )
    .optional();

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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export const updatePasswordInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        oldPassword: passwordSchema,
        newPassword: passwordSchema,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const createPasswordInputValidator = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        email: z
            .string({ message: "Invalid data type" })
            .trim()
            .toLowerCase()
            .max(50, { message: "Mail must be 50 characters or fewer" })
            .email({ message: "Invalid email" }),
        password: passwordSchema,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const idParamValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        id: z.uuid(),
    });

    const { success, data } = schema.safeParse(req.params);

    if (!success) {
        return next(new BadResponse("Invalid URL", 400));
    }
    req.cleanedParams = data;
    next();
};

export const awardInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        title: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Title can not be empty" })
            .max(50, { message: "Title must be 50 characters or fewer" }),

        description: descriptionSchema,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const educationInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        institute: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Institute name can not be empty" })
            .max(50, { message: "Institute name must be 50 characters or fewer" }),
        instituteType: z.enum(["school", "highSchool", "university", "bootcamp", "other"], {
            message: "Institute type can be only school, highSchool, university, bootcamp and other",
        }),
        description: descriptionSchema,
        startDate: dateSchema,
        endDate: dateSchemaOptional,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    if (data.endDate) {
        if (data.endDate < data.startDate) {
            return next(new BadResponse("End date can not be smaller then start date", 400));
        }
    }

    req.cleanedBody = data;
    next();
};

export const workExpInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        organization: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Organization name can not be empty" })
            .max(50, { message: "Organization name must be 50 characters or fewer" }),
        role: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Role can not be empty" })
            .max(50, { message: "Role must be 50 characters or fewer" }),
        location: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Location can not be empty" })
            .max(50, { message: "Location must be 50 characters or fewer" }),
        description: descriptionSchema,
        startDate: dateSchema,
        endDate: dateSchemaOptional,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    if (data?.endDate) {
        if (data.endDate <= data.startDate) {
            return next(new BadResponse("End date can not be smaller then start date", 400));
        }
    }

    req.cleanedBody = data;
    next();
};

export const skillsInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        skillName: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Skill name can not be empty" })
            .max(50, { message: "Skill name must be 50 characters or fewer" }),
        description: descriptionSchema,
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const userBasicInfoInputValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        dob: dateSchemaOptional,
        gender: z.enum(["male", "female"], { message: "Gender can be only male or female" }).optional(),
        hometown: z
            .string({ message: "Invalid data type" })
            .trim()
            .min(1, { message: "Home town can not be empty" })
            .max(50, { message: "Home town must be 50 characters or fewer" })
            .optional(),
        languages: z
            .array(
                z
                    .string({ message: "Invalid data type" })
                    .trim()
                    .min(1, { message: "Language can not be empty" })
                    .max(15, { message: "Language must be 15 characters or fewer" })
                    .optional()
            )
            .max(5, { message: "You can add upto five languages" })
            .optional(),
        interests: z
            .array(
                z
                    .string({ message: "Invalid data type" })
                    .trim()
                    .min(1, { message: "Interest can not be empty" })
                    .max(30, { message: "Interest must be 30 characters or fewer" })
                    .optional()
            )
            .max(10, { message: "You can add upto ten interests" })
            .optional(),
    });

    const { success, data, error } = schema.safeParse(req.body);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedBody = data;
    next();
};

export const connectionQueryParamValidation = (req: Request, res: Response, next: NextFunction) => {
    const schema = z.object({
        start: startSchema,
        count: z
            .string({ message: "Invalid data type" })
            .min(1, { message: "Count can not be empty" })
            .regex(/^[0-9]+$/, { message: "Count can be a positive integer" })
            .transform(input => {
                let data = Number(input);
                if (data > 50) {
                    data = 50;
                }
                return data;
            })
            .refine(
                input => {
                    if (input == 0) return false;
                    return true;
                },
                { message: "Count can not be 0" }
            ),

        sort: z.enum(["asc", "desc", "recent"], { message: "Sort can be only 'asc', 'desc', 'recent'" }),
    });

    const { success, data, error } = schema.safeParse(req.query);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedQuery = data;
    next();
};

export const startQueryParamValidation = (req: Request, res: Response, next: NextFunction) => {
    const { success, data, error } = startSchema.safeParse(req.query);

    if (!success) {
        return next(new BadResponse(error.issues[0]?.message as string, 400));
    }

    req.cleanedQuery = data;
    next();
};

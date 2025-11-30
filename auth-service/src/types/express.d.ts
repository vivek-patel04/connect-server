import type { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; name: string; email: string; personalData: { profilePhoto: string } };
            cleanedBody?: any;
            cleanedParams?: Record<string, unknown>;
            cleanedQuery?: Record<string, unknown>;
        }
    }
}

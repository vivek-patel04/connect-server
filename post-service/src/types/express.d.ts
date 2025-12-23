import type { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: { userID: string; csrfTokenHash: string };
            cleanedBody?: any;
            cleanedParams?: any;
            cleanedQuery?: any;
            cleanedCursor?: { createdAt: string; id: string };
        }
    }
}

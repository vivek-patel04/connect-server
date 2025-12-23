import type { JwtPayload } from "jsonwebtoken";

export interface DecodedTokenType extends JwtPayload {
    userID: string;
    csrfTokenHash: string;
}

export interface UserType {
    id: string;
    name: string;
    personalData: {
        thumbnailURL: string;
    };
}

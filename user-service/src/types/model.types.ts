import type { JwtPayload } from "jsonwebtoken";

export interface DecodedTokenType extends JwtPayload {
    userID: string;
    csrfTokenHash: string;
}

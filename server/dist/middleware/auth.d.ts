import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: any;
            sessionId?: string;
        }
    }
}
export interface JWTPayload {
    userId: string;
    email: string;
    sessionId: string;
    iat: number;
    exp: number;
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (userId: string, email: string, sessionId: string) => string;
export declare const verifyToken: (token: string) => JWTPayload | null;
//# sourceMappingURL=auth.d.ts.map
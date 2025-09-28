import mongoose, { Document } from 'mongoose';
export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    isActive: boolean;
    lastActivity: Date;
    expiresAt: Date;
    createdAt: Date;
    isValid(): boolean;
    deactivate(): Promise<ISession>;
    updateActivity(): Promise<ISession>;
}
export declare const Session: mongoose.Model<ISession, {}, {}, {}, mongoose.Document<unknown, {}, ISession, {}, {}> & ISession & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Session.d.ts.map
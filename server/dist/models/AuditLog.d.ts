import mongoose, { Document } from 'mongoose';
export interface IAuditLog extends Document {
    userId?: mongoose.Types.ObjectId;
    action: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}
export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
    logAction(action: string, userId?: mongoose.Types.ObjectId, ipAddress?: string, userAgent?: string, metadata?: Record<string, any>): Promise<IAuditLog>;
}
export declare const AuditLog: IAuditLogModel;
//# sourceMappingURL=AuditLog.d.ts.map
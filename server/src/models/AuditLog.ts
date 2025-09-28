import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  logAction(
    action: string,
    userId?: mongoose.Types.ObjectId,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<IAuditLog>;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'AUTHENTICATOR_REGISTERED',
      'AUTHENTICATOR_REMOVED',
      'OAUTH_LOGIN',
      'SESSION_CREATED',
      'SESSION_DESTROYED',
      'PASSWORD_RESET_REQUESTED',
      'PASSWORD_RESET_COMPLETED',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'SUSPICIOUS_ACTIVITY'
    ]
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = function(
  action: string,
  userId?: mongoose.Types.ObjectId,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, any>
) {
  return this.create({
    userId,
    action,
    ipAddress,
    userAgent,
    metadata,
    timestamp: new Date()
  });
};

export const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);

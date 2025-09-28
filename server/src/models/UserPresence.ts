import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPresence extends Document {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  socketId?: string;
  updatedAt: Date;
}

const UserPresenceSchema = new Schema<IUserPresence>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['online', 'away', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  socketId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
UserPresenceSchema.index({ status: 1 });
UserPresenceSchema.index({ lastSeen: -1 });

// Update lastSeen when status changes
UserPresenceSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.lastSeen = new Date();
  }
  next();
});

export const UserPresence = mongoose.model<IUserPresence>('UserPresence', UserPresenceSchema);

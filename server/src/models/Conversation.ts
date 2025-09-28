import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  _id: string;
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  admins?: string[];
  isPrivate: boolean;
  description?: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
    type: 'text' | 'image' | 'file' | 'system';
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'channel'],
    required: true,
    default: 'direct'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    trim: true
  },
  lastMessage: {
    content: {
      type: String,
      maxlength: 1000
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ type: 1, isPrivate: 1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });

// Ensure direct conversations have exactly 2 participants
ConversationSchema.pre('save', function(next) {
  if (this.type === 'direct' && this.participants.length !== 2) {
    return next(new Error('Direct conversations must have exactly 2 participants'));
  }
  next();
});

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileInfo?: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  replyTo?: string;
  reactions: {
    emoji: string;
    userIds: string[];
  }[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  readBy: {
    userId: string;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'system';
    },
    maxlength: 4000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    required: true,
    default: 'text'
  },
  fileInfo: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    userIds: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  readBy: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ type: 1 });

// Virtual for reaction count
MessageSchema.virtual('reactionCount').get(function() {
  return this.reactions.reduce((total, reaction) => total + reaction.userIds.length, 0);
});

// Method to add reaction
MessageSchema.methods.addReaction = function(emoji: string, userId: string) {
  const reaction = this.reactions.find((r: any) => r.emoji === emoji);
  if (reaction) {
    if (!reaction.userIds.includes(userId)) {
      reaction.userIds.push(userId);
    }
  } else {
    this.reactions.push({ emoji, userIds: [userId] });
  }
  return this.save();
};

// Method to remove reaction
MessageSchema.methods.removeReaction = function(emoji: string, userId: string) {
  const reaction = this.reactions.find((r: any) => r.emoji === emoji);
  if (reaction) {
    reaction.userIds = reaction.userIds.filter((id: string) => id.toString() !== userId.toString());
    if (reaction.userIds.length === 0) {
      this.reactions = this.reactions.filter((r: any) => r.emoji !== emoji);
    }
  }
  return this.save();
};

// Method to mark as read
MessageSchema.methods.markAsRead = function(userId: string) {
  const existingRead = this.readBy.find((read: any) => read.userId.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ userId, readAt: new Date() });
  }
  return this.save();
};

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

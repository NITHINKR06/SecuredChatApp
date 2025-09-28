import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Request } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { UserPresence } from '../models/UserPresence';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

interface Socket extends any {
  userId?: string;
  user?: any;
}

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

class SocketManager {
  private io: SocketIOServer;
  private typingUsers: Map<string, Map<string, TypingUser>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const sessionId = socket.handshake.auth.sessionId;
        const userId = socket.handshake.auth.userId;

        if (!userId) {
          return next(new Error('Authentication required'));
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = userId;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`);

      // Update user presence
      this.updateUserPresence(socket.userId!, 'online', socket.id);

      // Join user to their conversations
      this.joinUserConversations(socket);

      // Handle conversation joining
      socket.on('join_conversation', async (data: { conversationId: string }) => {
        await this.handleJoinConversation(socket, data.conversationId);
      });

      // Handle leaving conversation
      socket.on('leave_conversation', async (data: { conversationId: string }) => {
        await this.handleLeaveConversation(socket, data.conversationId);
      });

      // Handle sending messages
      socket.on('send_message', async (data: {
        conversationId: string;
        content: string;
        type?: 'text' | 'image' | 'file';
        fileInfo?: any;
        replyTo?: string;
      }) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('start_typing', (data: { conversationId: string }) => {
        this.handleStartTyping(socket, data.conversationId);
      });

      socket.on('stop_typing', (data: { conversationId: string }) => {
        this.handleStopTyping(socket, data.conversationId);
      });

      // Handle message reactions
      socket.on('add_reaction', async (data: {
        messageId: string;
        emoji: string;
      }) => {
        await this.handleAddReaction(socket, data);
      });

      socket.on('remove_reaction', async (data: {
        messageId: string;
        emoji: string;
      }) => {
        await this.handleRemoveReaction(socket, data);
      });

      // Handle message editing
      socket.on('edit_message', async (data: {
        messageId: string;
        content: string;
      }) => {
        await this.handleEditMessage(socket, data);
      });

      // Handle message deletion
      socket.on('delete_message', async (data: { messageId: string }) => {
        await this.handleDeleteMessage(socket, data);
      });

      // Handle user status updates
      socket.on('update_status', async (data: { status: 'online' | 'away' | 'offline' }) => {
        await this.updateUserPresence(socket.userId!, data.status, socket.id);
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User ${socket.userId} disconnected`);
        await this.updateUserPresence(socket.userId!, 'offline');
        this.cleanupTypingUsers(socket.userId!);
      });
    });
  }

  private async joinUserConversations(socket: AuthenticatedSocket) {
    try {
      const conversations = await Conversation.find({
        participants: socket.userId
      }).select('_id');

      conversations.forEach(conv => {
        socket.join(`conversation_${conv._id}`);
      });
    } catch (error) {
      console.error('Error joining user conversations:', error);
    }
  }

  private async handleJoinConversation(socket: AuthenticatedSocket, conversationId: string) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      socket.join(`conversation_${conversationId}`);
      socket.emit('joined_conversation', { conversationId });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  private async handleLeaveConversation(socket: AuthenticatedSocket, conversationId: string) {
    socket.leave(`conversation_${conversationId}`);
    socket.emit('left_conversation', { conversationId });
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    fileInfo?: any;
    replyTo?: string;
  }) {
    try {
      const conversation = await Conversation.findOne({
        _id: data.conversationId,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found or access denied' });
        return;
      }

      const message = new Message({
        conversationId: data.conversationId,
        senderId: socket.userId,
        content: data.content,
        type: data.type || 'text',
        fileInfo: data.fileInfo,
        replyTo: data.replyTo
      });

      await message.save();

      // Update conversation's last message
      conversation.lastMessage = {
        content: data.content,
        senderId: socket.userId!,
        timestamp: new Date(),
        type: data.type || 'text'
      };
      await conversation.save();

      // Populate sender information
      await message.populate('senderId', 'username email avatar');

      // Broadcast to all participants in the conversation
      this.io.to(`conversation_${data.conversationId}`).emit('new_message', {
        message: message.toObject()
      });

      // Stop typing indicator for sender
      this.handleStopTyping(socket, data.conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleStartTyping(socket: AuthenticatedSocket, conversationId: string) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Map());
    }

    const conversationTyping = this.typingUsers.get(conversationId)!;
    conversationTyping.set(socket.userId!, {
      userId: socket.userId!,
      username: socket.user?.username || 'Unknown',
      timestamp: Date.now()
    });

    // Broadcast typing indicator to other participants
    socket.to(`conversation_${conversationId}`).emit('user_is_typing', {
      conversationId,
      userId: socket.userId,
      username: socket.user?.username
    });

    // Auto-remove typing indicator after 3 seconds
    setTimeout(() => {
      this.handleStopTyping(socket, conversationId);
    }, 3000);
  }

  private handleStopTyping(socket: AuthenticatedSocket, conversationId: string) {
    const conversationTyping = this.typingUsers.get(conversationId);
    if (conversationTyping) {
      conversationTyping.delete(socket.userId!);
      
      // Broadcast stop typing to other participants
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userId: socket.userId
      });
    }
  }

  private cleanupTypingUsers(userId: string) {
    this.typingUsers.forEach((conversationTyping, conversationId) => {
      if (conversationTyping.has(userId)) {
        conversationTyping.delete(userId);
        this.io.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
          conversationId,
          userId
        });
      }
    });
  }

  private async handleAddReaction(socket: AuthenticatedSocket, data: {
    messageId: string;
    emoji: string;
  }) {
    try {
      const message = await Message.findById(data.messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Check if user is participant in the conversation
      const conversation = await Conversation.findOne({
        _id: message.conversationId,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await message.addReaction(data.emoji, socket.userId!);

      // Broadcast reaction to conversation participants
      this.io.to(`conversation_${message.conversationId}`).emit('reaction_added', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: socket.userId
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  private async handleRemoveReaction(socket: AuthenticatedSocket, data: {
    messageId: string;
    emoji: string;
  }) {
    try {
      const message = await Message.findById(data.messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      await message.removeReaction(data.emoji, socket.userId!);

      // Broadcast reaction removal to conversation participants
      this.io.to(`conversation_${message.conversationId}`).emit('reaction_removed', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: socket.userId
      });

    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  private async handleEditMessage(socket: AuthenticatedSocket, data: {
    messageId: string;
    content: string;
  }) {
    try {
      const message = await Message.findOne({
        _id: data.messageId,
        senderId: socket.userId,
        isDeleted: false
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found or access denied' });
        return;
      }

      message.content = data.content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      // Broadcast message edit to conversation participants
      this.io.to(`conversation_${message.conversationId}`).emit('message_edited', {
        messageId: data.messageId,
        content: data.content,
        editedAt: message.editedAt
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  }

  private async handleDeleteMessage(socket: AuthenticatedSocket, data: { messageId: string }) {
    try {
      const message = await Message.findOne({
        _id: data.messageId,
        senderId: socket.userId,
        isDeleted: false
      });

      if (!message) {
        socket.emit('error', { message: 'Message not found or access denied' });
        return;
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      await message.save();

      // Broadcast message deletion to conversation participants
      this.io.to(`conversation_${message.conversationId}`).emit('message_deleted', {
        messageId: data.messageId
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  private async updateUserPresence(userId: string, status: 'online' | 'away' | 'offline', socketId?: string) {
    try {
      await UserPresence.findOneAndUpdate(
        { userId },
        {
          status,
          lastSeen: new Date(),
          socketId: status === 'online' ? socketId : undefined
        },
        { upsert: true }
      );

      // Broadcast presence update to all connected users
      this.io.emit('user_presence_update', {
        userId,
        status,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }

  public getIO() {
    return this.io;
  }
}

export default SocketManager;

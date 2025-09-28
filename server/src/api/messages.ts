import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { authenticateToken } from '../middleware/auth';
import { messageLimiter } from '../middleware/security';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * DELETE /api/v1/messages/:messageId
 * Delete a single message (soft delete)
 */
router.delete('/:messageId', [
  param('messageId').isMongoId().withMessage('Invalid message ID')
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = ''; // Clear content for privacy
    
    // Clear file info if exists
    if (message.fileInfo) {
      message.fileInfo = undefined;
    }

    await message.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversationId.toString()).emit('messageDeleted', {
        messageId,
        conversationId: message.conversationId
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

/**
 * POST /api/v1/messages/delete-multiple
 * Delete multiple messages at once
 */
router.post('/delete-multiple', [
  body('messageIds').isArray().withMessage('Message IDs must be an array'),
  body('messageIds.*').isMongoId().withMessage('Invalid message ID')
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { messageIds } = req.body;
    const userId = req.user._id;

    // Find all messages
    const messages = await Message.find({
      _id: { $in: messageIds },
      senderId: userId // Only allow deletion of own messages
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No messages found or you do not have permission to delete them'
      });
    }

    // Soft delete all messages
    const updatePromises = messages.map(async (message) => {
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = '';
      if (message.fileInfo) {
        message.fileInfo = undefined;
      }
      return message.save();
    });

    await Promise.all(updatePromises);

    // Get unique conversation IDs
    const conversationIds = [...new Set(messages.map(m => m.conversationId.toString()))];

    // Emit socket events for real-time updates
    const io = req.app.get('io');
    if (io) {
      conversationIds.forEach(conversationId => {
        io.to(conversationId).emit('messagesDeleted', {
          messageIds: messages
            .filter(m => m.conversationId.toString() === conversationId)
            .map(m => m._id),
          conversationId
        });
      });
    }

    res.json({
      success: true,
      message: `${messages.length} messages deleted successfully`,
      deletedCount: messages.length
    });
  } catch (error) {
    console.error('Error deleting multiple messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete messages'
    });
  }
});

/**
 * POST /api/v1/messages/:messageId/forward
 * Forward a message to another conversation
 */
router.post('/:messageId/forward', [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  body('conversationIds').isArray().withMessage('Conversation IDs must be an array'),
  body('conversationIds.*').isMongoId().withMessage('Invalid conversation ID')
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { messageId } = req.params;
    const { conversationIds } = req.body;
    const userId = req.user._id;

    // Find the original message
    const originalMessage = await Message.findById(messageId);
    
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user has access to the original message's conversation
    const hasAccess = await Conversation.findOne({
      _id: originalMessage.conversationId,
      participants: userId
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this message'
      });
    }

    // Verify user has access to all target conversations
    const targetConversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: userId
    });

    if (targetConversations.length !== conversationIds.length) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to all selected conversations'
      });
    }

    // Create forwarded messages
    const forwardedMessages = await Promise.all(
      targetConversations.map(async (conversation) => {
        const newMessage = new Message({
          conversationId: conversation._id,
          senderId: userId,
          content: originalMessage.content,
          type: originalMessage.type,
          fileInfo: originalMessage.fileInfo,
          isForwarded: true,
          forwardedFrom: {
            messageId: originalMessage._id,
            senderId: originalMessage.senderId
          }
        });

        await newMessage.save();

        // Update conversation's last message
        conversation.lastMessage = {
          content: newMessage.content,
          senderId: userId,
          timestamp: newMessage.createdAt,
          type: newMessage.type
        };
        await conversation.save();

        return newMessage;
      })
    );

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      forwardedMessages.forEach(message => {
        io.to(message.conversationId.toString()).emit('newMessage', message);
      });
    }

    res.json({
      success: true,
      message: `Message forwarded to ${forwardedMessages.length} conversation(s)`,
      forwardedCount: forwardedMessages.length
    });
  } catch (error) {
    console.error('Error forwarding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forward message'
    });
  }
});

/**
 * POST /api/v1/messages/:messageId/reply
 * Reply to a specific message
 */
router.post('/:messageId/reply', [
  param('messageId').isMongoId().withMessage('Invalid message ID'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Message content is required'),
  body('type').optional().isIn(['text', 'image', 'file', 'video', 'audio']).withMessage('Invalid message type')
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { messageId } = req.params;
    const { content, type = 'text', fileInfo } = req.body;
    const userId = req.user._id;

    // Find the original message
    const originalMessage = await Message.findById(messageId).populate('senderId', 'username displayName');
    
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user has access to the conversation
    const conversation = await Conversation.findOne({
      _id: originalMessage.conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this conversation'
      });
    }

    // Create reply message
    const replyMessage = new Message({
      conversationId: conversation._id,
      senderId: userId,
      content,
      type,
      fileInfo,
      replyTo: {
        messageId: originalMessage._id,
        content: originalMessage.content,
        senderId: (originalMessage.senderId as any)._id,
        senderName: (originalMessage.senderId as any).displayName || (originalMessage.senderId as any).username
      }
    });

    await replyMessage.save();

    // Update conversation's last message
    conversation.lastMessage = {
      content: replyMessage.content,
      senderId: userId,
      timestamp: replyMessage.createdAt,
      type: replyMessage.type
    };
    await conversation.save();

    // Populate the reply message before sending
    await replyMessage.populate('senderId', 'username displayName avatar');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('newMessage', replyMessage);
    }

    res.status(201).json({
      success: true,
      data: replyMessage
    });
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reply to message'
    });
  }
});

/**
 * GET /api/v1/messages/search
 * Search messages in conversations
 */
router.get('/search', [
  query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
  query('conversationId').optional().isMongoId().withMessage('Invalid conversation ID')
], async (req: any, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { q, conversationId } = req.query;
    const userId = req.user._id;

    // Build search query
    let searchQuery: any = {
      content: { $regex: q, $options: 'i' },
      isDeleted: { $ne: true }
    };

    if (conversationId) {
      // Search in specific conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this conversation'
        });
      }

      searchQuery.conversationId = conversationId;
    } else {
      // Search in all user's conversations
      const userConversations = await Conversation.find({
        participants: userId
      }).select('_id');

      searchQuery.conversationId = { 
        $in: userConversations.map(c => c._id) 
      };
    }

    // Execute search
    const messages = await Message.find(searchQuery)
      .populate('senderId', 'username displayName avatar')
      .populate('conversationId', 'name type')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages'
    });
  }
});

export default router;

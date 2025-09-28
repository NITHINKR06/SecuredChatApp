import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { UserPresence } from '../models/UserPresence';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all conversations for the authenticated user
router.get('/conversations', async (req: any, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username email avatar')
    .populate('lastMessage.senderId', 'username')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
});

// Create a new conversation
router.post('/conversations', [
  body('type').isIn(['direct', 'group', 'channel']).withMessage('Invalid conversation type'),
  body('participants').isArray({ min: 1 }).withMessage('At least one participant required'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean')
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

    const { type, participants, name, description, isPrivate } = req.body;

    // Get the current user ID properly - handle Mongoose document
    const currentUserId = req.user._id?.toString() || req.user.id || req.user._id;
    
    console.log('Debug - req.user:', req.user);
    console.log('Debug - currentUserId:', currentUserId);
    console.log('Debug - participants before:', participants);
    
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }

    // Filter out null/undefined participants and validate
    const validParticipants = participants.filter((p: any) => {
      if (!p || p === null || p === undefined) {
        console.log('Warning: Filtering out null/undefined participant');
        return false;
      }
      return true;
    });

    console.log('Debug - valid participants after filtering:', validParticipants);

    // Check if we have any valid participants
    if (validParticipants.length === 0 && type === 'direct') {
      return res.status(400).json({
        success: false,
        message: 'At least one valid participant is required for direct conversations'
      });
    }

    // Ensure the creator is included in participants first
    // Convert to string for comparison since MongoDB IDs can be objects
    const participantStrings = validParticipants.map((p: any) => {
      try {
        return p.toString();
      } catch (error) {
        console.error('Error converting participant to string:', p, error);
        return null;
      }
    }).filter(p => p !== null);

    if (!participantStrings.includes(currentUserId.toString())) {
      validParticipants.push(currentUserId);
    }

    // Update participants with the valid ones
    const finalParticipants = validParticipants;
    
    console.log('Debug - participants after:', finalParticipants);

    // For direct conversations, ensure exactly 2 participants after adding current user
    if (type === 'direct' && finalParticipants.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Direct conversations must have exactly 2 participants'
      });
    }

    // Check if direct conversation already exists
    if (type === 'direct') {
      const existingConversation = await Conversation.findOne({
        type: 'direct',
        participants: { $all: finalParticipants }
      });

      if (existingConversation) {
        // Populate before returning
        await existingConversation.populate('participants', 'username email avatar');
        return res.json({
          success: true,
          data: existingConversation,
          message: 'Direct conversation already exists'
        });
      }
    }

    const conversation = new Conversation({
      type,
      participants: finalParticipants,
      name: type !== 'direct' ? name : undefined,
      description,
      isPrivate: isPrivate || false,
      admins: type !== 'direct' ? [currentUserId] : undefined
    });

    await conversation.save();

    // Populate the conversation data
    await conversation.populate('participants', 'username email avatar');

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation'
    });
  }
});

// Get conversation details
router.get('/conversations/:id', [
  param('id').isMongoId().withMessage('Invalid conversation ID')
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

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    })
    .populate('participants', 'username email avatar')
    .populate('admins', 'username email avatar')
    .populate('lastMessage.senderId', 'username');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation'
    });
  }
});

// Update conversation
router.put('/conversations/:id', [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be boolean')
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

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      admins: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or insufficient permissions'
      });
    }

    const { name, description, isPrivate } = req.body;

    if (name !== undefined) conversation.name = name;
    if (description !== undefined) conversation.description = description;
    if (isPrivate !== undefined) conversation.isPrivate = isPrivate;

    await conversation.save();

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation'
    });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is participant in the conversation
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const messages = await Message.find({
      conversationId: req.params.id,
      isDeleted: false
    })
    .populate('senderId', 'username email avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: req.params.id,
        senderId: { $ne: req.user._id },
        'readBy.userId': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: {
            userId: req.user._id,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total: await Message.countDocuments({
          conversationId: req.params.id,
          isDeleted: false
        })
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Get user presence
router.get('/users/presence', async (req: any, res) => {
  try {
    const presences = await UserPresence.find({
      userId: { $in: req.query.userIds || [] }
    }).populate('userId', 'username email avatar');

    res.json({
      success: true,
      data: presences
    });
  } catch (error) {
    console.error('Error fetching user presence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user presence'
    });
  }
});

// Search conversations and messages
router.get('/search', [
  query('q').isLength({ min: 1 }).withMessage('Search query is required'),
  query('type').optional().isIn(['conversations', 'messages', 'all']).withMessage('Invalid search type')
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

    const { q, type = 'all' } = req.query;
    const results: any = {};

    if (type === 'conversations' || type === 'all') {
      const conversations = await Conversation.find({
        participants: req.user._id,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      })
      .populate('participants', 'username email avatar')
      .limit(10);

      results.conversations = conversations;
    }

    if (type === 'messages' || type === 'all') {
      const userConversations = await Conversation.find({
        participants: req.user._id
      }).select('_id');

      const conversationIds = userConversations.map(conv => conv._id);

      const messages = await Message.find({
        conversationId: { $in: conversationIds },
        content: { $regex: q, $options: 'i' },
        isDeleted: false
      })
      .populate('senderId', 'username email avatar')
      .populate('conversationId', 'name type')
      .sort({ createdAt: -1 })
      .limit(20);

      results.messages = messages;
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search'
    });
  }
});

// Add participant to conversation
router.post('/conversations/:id/participants', [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  body('userId').isMongoId().withMessage('Invalid user ID')
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

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      admins: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or insufficient permissions'
      });
    }

    // Check if user exists
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a participant
    if (conversation.participants.includes(req.body.userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant'
      });
    }

    conversation.participants.push(req.body.userId);
    await conversation.save();

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participant'
    });
  }
});

// Remove participant from conversation
router.delete('/conversations/:id/participants/:userId', [
  param('id').isMongoId().withMessage('Invalid conversation ID'),
  param('userId').isMongoId().withMessage('Invalid user ID')
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

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      admins: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or insufficient permissions'
      });
    }

    conversation.participants = conversation.participants.filter(
      (id: any) => id.toString() !== req.params.userId
    );

    // Remove from admins if they were an admin
    conversation.admins = conversation.admins?.filter(
      (id: any) => id.toString() !== req.params.userId
    );

    await conversation.save();

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant'
    });
  }
});

export default router;

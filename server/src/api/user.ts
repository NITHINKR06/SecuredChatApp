  import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { UserPresence } from '../models/UserPresence';
import { authenticateToken } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    const user = await User.findById(userId).select('-authenticators -publicKey -privateKey');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user info'
    });
  }
});

// Get user's contacts (simplified for now)
router.get('/contacts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    const user = await User.findById(userId).populate('contacts.userId', 'username displayName email avatar');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return empty array for now if no contacts
    const contacts = user.contacts || [];

    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts'
    });
  }
});

// Add a contact by username
router.post('/contacts/add', [
  authenticateToken,
  body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-z0-9]+$/)
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username format',
        errors: errors.array()
      });
    }

    const userId = req.user?._id;
    const { username } = req.body;

    // Find the user to add
    const contactUser = await User.findOne({ username: username.toLowerCase() });
    
    if (!contactUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found with that username'
      });
    }

    if (contactUser._id.toString() === userId?.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a contact'
      });
    }

    // Check if already in contacts
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Current user not found'
      });
    }

    const existingContact = currentUser.contacts.find(
      (c: any) => c.userId?.toString() === contactUser._id.toString()
    );

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'User is already in your contacts'
      });
    }

    // Add to contacts
    currentUser.contacts.push({
      userId: contactUser._id as any,
      isFavorite: false,
      isBlocked: false,
      addedAt: new Date()
    });

    await currentUser.save();

    res.json({
      success: true,
      message: 'Contact added successfully',
      data: {
        _id: contactUser._id,
        username: contactUser.username,
        displayName: contactUser.displayName,
        email: contactUser.email,
        avatar: contactUser.avatar,
        isFavorite: false,
        isBlocked: false
      }
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contact'
    });
  }
});

// Search users by username
router.get('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Support both 'query' and 'username' parameters for flexibility
    const { query, username } = req.query;
    const searchTerm = query || username;
    const userId = req.user?._id;

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: userId } },
        {
          $or: [
            { username: { $regex: searchTerm, $options: 'i' } },
            { displayName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username displayName email avatar')
    .limit(10);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
});

// Get user profile
router.get('/profile/:username', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('username displayName email avatar bio createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { displayName, bio, avatar } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    // For now, return empty array or mock data
    // This would typically fetch from a sessions collection
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions'
    });
  }
});

// Get user devices
router.get('/devices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    // For now, return empty array or mock data
    // This would typically fetch registered WebAuthn devices
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices'
    });
  }
});

export default router;

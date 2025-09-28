import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { WebAuthnService } from '../services/webauthn';
import { generateToken } from '../middleware/auth';
import { Session } from '../models/Session';
import { AuditLog } from '../models/AuditLog';
import { authLimiter } from '../middleware/security';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

/**
 * POST /api/v1/auth/register/start
 * Start WebAuthn registration process
 */
router.post('/register/start', [
  body('email').isEmail().normalizeEmail(),
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-z0-9]+$/)
    .withMessage('Username can only contain lowercase letters and numbers, no spaces'),
  body('displayName').trim().isLength({ min: 2, max: 50 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, username, displayName } = req.body;

    const options = await WebAuthnService.generateRegistrationOptions(email, username, displayName);
    
    // Store challenge in session
    req.session.registrationChallenge = options.challenge;
    req.session.registrationEmail = email;
    req.session.registrationUsername = username;
    req.session.registrationDisplayName = displayName;

    await AuditLog.logAction(
      'USER_REGISTERED',
      undefined,
      req.ip,
      req.get('User-Agent'),
      { email, displayName }
    );

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Registration start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start registration'
    });
  }
});

/**
 * POST /api/v1/auth/register/finish
 * Complete WebAuthn registration
 */
router.post('/register/finish', async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    const challenge = req.session.registrationChallenge;
    const email = req.session.registrationEmail;
    const username = req.session.registrationUsername;
    const displayName = req.session.registrationDisplayName;

    if (!challenge || !email || !username || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Registration session expired'
      });
    }

    const result = await WebAuthnService.verifyRegistration(email, username, response, challenge);

    if (result.verified && result.user) {
      // Clear registration session
      delete req.session.registrationChallenge;
      delete req.session.registrationEmail;
      delete req.session.registrationUsername;
      delete req.session.registrationDisplayName;

      // Create session
      const session = new Session({
        userId: result.user._id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await session.save();

      // Generate JWT token
      const token = generateToken(
        result.user._id.toString(),
        result.user.email,
        session.sessionId
      );

      await AuditLog.logAction(
        'AUTHENTICATOR_REGISTERED',
        result.user._id,
        req.ip,
        req.get('User-Agent'),
        { email }
      );

      res.json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            username: result.user.username,
            displayName: result.user.displayName
          },
          token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Registration verification failed'
      });
    }
  } catch (error) {
    console.error('Registration finish error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration'
    });
  }
});

/**
 * POST /api/v1/auth/login/start
 * Start WebAuthn authentication process
 */
router.post('/login/start', [
  body('email').isEmail().normalizeEmail()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const options = await WebAuthnService.generateAuthenticationOptions(email);
    
    // Store challenge in session
    req.session.loginChallenge = options.challenge;
    req.session.loginEmail = email;

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Login start error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start login'
    });
  }
});

/**
 * POST /api/v1/auth/login/finish
 * Complete WebAuthn authentication
 */
router.post('/login/finish', async (req: Request, res: Response) => {
  try {
    const { response } = req.body;
    const challenge = req.session.loginChallenge;

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Login session expired'
      });
    }

    const result = await WebAuthnService.verifyAuthentication(response, challenge);

    if (result.verified && result.user) {
      // Clear login session
      delete req.session.loginChallenge;
      delete req.session.loginEmail;

      // Create session
      const session = new Session({
        userId: result.user._id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await session.save();

      // Generate JWT token
      const token = generateToken(
        result.user._id.toString(),
        result.user.email,
        session.sessionId
      );

      await AuditLog.logAction(
        'USER_LOGIN',
        result.user._id,
        req.ip,
        req.get('User-Agent'),
        { email: result.user.email }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            username: result.user.username,
            displayName: result.user.displayName
          },
          token
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Login finish error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete login'
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user and destroy session
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionId = req.sessionID;
    
    // Deactivate session
    await Session.findOneAndUpdate(
      { sessionId },
      { isActive: false }
    );

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });

    await AuditLog.logAction(
      'USER_LOGOUT',
      req.user?._id,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout'
    });
  }
});

export default router;

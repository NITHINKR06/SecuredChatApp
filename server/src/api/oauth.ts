import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { config } from '../config/config';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { AuditLog } from '../models/AuditLog';
import { generateToken } from '../middleware/auth';

const router = Router();

// Configure Google OAuth Strategy
if (config.google.clientId && config.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: '/api/v1/oauth/google/callback'
  }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = profile.displayName || profile.name?.givenName || 'User';

      if (!email) {
        return done(new Error('No email found in Google profile'), undefined);
      }

      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { email },
          { googleId: profile.id }
        ]
      });

      if (user) {
        // Update Google ID if not set
        if (!user.googleId) {
          user.googleId = profile.id;
        }
        
        // Check if user has username, if not generate one
        if (!user.username) {
          let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          if (baseUsername.length < 3) {
            baseUsername = 'user' + baseUsername;
          }
          if (baseUsername.length > 20) {
            baseUsername = baseUsername.substring(0, 20);
          }
          
          // Ensure username is unique
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = baseUsername + counter;
            counter++;
            if (username.length > 20) {
              baseUsername = baseUsername.substring(0, baseUsername.length - 1);
              username = baseUsername + counter;
            }
          }
          user.username = username;
        }
        
        await user.save();
      } else {
        // Generate a unique username from email or profile
        let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseUsername.length < 3) {
          baseUsername = 'user' + baseUsername;
        }
        if (baseUsername.length > 20) {
          baseUsername = baseUsername.substring(0, 20);
        }
        
        // Ensure username is unique
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
          username = baseUsername + counter;
          counter++;
          if (username.length > 20) {
            // If adding counter makes it too long, truncate base and try again
            baseUsername = baseUsername.substring(0, baseUsername.length - 1);
            username = baseUsername + counter;
          }
        }
        
        // Create new user
        user = new User({
          email,
          username,
          displayName,
          googleId: profile.id
          // Don't initialize authenticators array for OAuth users
        });
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

// Configure GitHub OAuth Strategy
if (config.github.clientId && config.github.clientSecret) {
  passport.use(new GitHubStrategy({
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: '/api/v1/oauth/github/callback'
  }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      const displayName = profile.displayName || profile.username || 'User';

      if (!email) {
        return done(new Error('No email found in GitHub profile'), undefined);
      }

      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { email },
          { githubId: profile.id }
        ]
      });

      if (user) {
        // Update GitHub ID if not set
        if (!user.githubId) {
          user.githubId = profile.id;
        }
        
        // Check if user has username, if not generate one
        if (!user.username) {
          let baseUsername = profile.username || email.split('@')[0];
          baseUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          if (baseUsername.length < 3) {
            baseUsername = 'user' + baseUsername;
          }
          if (baseUsername.length > 20) {
            baseUsername = baseUsername.substring(0, 20);
          }
          
          // Ensure username is unique
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = baseUsername + counter;
            counter++;
            if (username.length > 20) {
              baseUsername = baseUsername.substring(0, baseUsername.length - 1);
              username = baseUsername + counter;
            }
          }
          user.username = username;
        }
        
        await user.save();
      } else {
        // Try to use GitHub username first, or generate from email
        let baseUsername = profile.username || email.split('@')[0];
        baseUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (baseUsername.length < 3) {
          baseUsername = 'user' + baseUsername;
        }
        if (baseUsername.length > 20) {
          baseUsername = baseUsername.substring(0, 20);
        }
        
        // Ensure username is unique
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
          username = baseUsername + counter;
          counter++;
          if (username.length > 20) {
            // If adding counter makes it too long, truncate base and try again
            baseUsername = baseUsername.substring(0, baseUsername.length - 1);
            username = baseUsername + counter;
          }
        }
        
        // Create new user
        user = new User({
          email,
          username,
          displayName,
          githubId: profile.id
          // Don't initialize authenticators array for OAuth users
        });
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * GET /api/v1/oauth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * GET /api/v1/oauth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect('/login?error=oauth_failed');
      }

      // Create session
      const session = new Session({
        userId: user._id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await session.save();

      // Generate JWT token
      const token = generateToken(
        user._id.toString(),
        user.email,
        session.sessionId
      );

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      await AuditLog.logAction(
        'OAUTH_LOGIN',
        user._id,
        req.ip,
        req.get('User-Agent'),
        { provider: 'google', email: user.email }
      );

      // Redirect to frontend with token
      const frontendUrl = config.webauthn.rpOrigin;
      console.log('Google OAuth - Redirecting to:', `${frontendUrl}/auth/callback?token=${token}`);
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

/**
 * GET /api/v1/oauth/github
 * Initiate GitHub OAuth flow
 */
router.get('/github', passport.authenticate('github', {
  scope: ['user:email']
}));

/**
 * GET /api/v1/oauth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=oauth_failed' }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.redirect('/login?error=oauth_failed');
      }

      // Create session
      const session = new Session({
        userId: user._id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      await session.save();

      // Generate JWT token
      const token = generateToken(
        user._id.toString(),
        user.email,
        session.sessionId
      );

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      await AuditLog.logAction(
        'OAUTH_LOGIN',
        user._id,
        req.ip,
        req.get('User-Agent'),
        { provider: 'github', email: user.email }
      );

      // Redirect to frontend with token
      const frontendUrl = config.webauthn.rpOrigin;
      console.log('GitHub OAuth - Redirecting to:', `${frontendUrl}/auth/callback?token=${token}`);
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
);

export default router;

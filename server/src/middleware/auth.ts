import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User } from '../models/User';
import { Session } from '../models/Session';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      sessionId?: string;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // Verify session is still active
    const session = await Session.findOne({
      sessionId: decoded.sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      res.status(401).json({ 
        success: false, 
        message: 'Session expired or invalid' 
      });
      return;
    }

    // Get user details
    const user = await User.findById(decoded.userId).select('-authenticators');
    
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    // Update session activity
    await session.updateActivity();

    req.user = user;
    req.sessionId = decoded.sessionId;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Authentication failed' 
      });
    }
  }
};

/**
 * Middleware to check if user is authenticated (optional)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      
      const session = await Session.findOne({
        sessionId: decoded.sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (session) {
        const user = await User.findById(decoded.userId).select('-authenticators');
        if (user) {
          await session.updateActivity();
          req.user = user;
          req.sessionId = decoded.sessionId;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (userId: string, email: string, sessionId: string): string => {
  return jwt.sign(
    { userId, email, sessionId },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

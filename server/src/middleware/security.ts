import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import crypto from 'crypto';

// Rate limiting configurations for different endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: 'Too many messages sent, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:3003',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};

// MongoDB injection prevention
export const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Attempted NoSQL injection blocked: ${key}`);
  }
});

// XSS protection
export const xssProtection = xss();

// HTTP Parameter Pollution prevention
export const hppProtection = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit']
});

// CSRF token generation and validation
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();

  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(stored.token),
      Buffer.from(token)
    );
  }

  private static cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, value] of this.tokens.entries()) {
      if (value.expires < now) {
        this.tokens.delete(key);
      }
    }
  }
}

// CSRF middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.session?.id;
  const token = req.headers['x-csrf-token'] as string;

  if (!sessionId || !token) {
    return res.status(403).json({ 
      success: false, 
      message: 'CSRF token missing' 
    });
  }

  if (!CSRFProtection.validateToken(sessionId, token)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid CSRF token' 
    });
  }

  next();
};

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potential script tags or dangerous HTML
  const sanitizeString = (str: any): any => {
    if (typeof str === 'string') {
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof str === 'object' && str !== null) {
      for (const key in str) {
        str[key] = sanitizeString(str[key]);
      }
    }
    return str;
  };

  req.body = sanitizeString(req.body);
  req.query = sanitizeString(req.query);
  req.params = sanitizeString(req.params);

  next();
};

// Security audit logging
export const auditLog = (action: string, userId: string, details: any) => {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  };

  // In production, send to logging service
  console.log('[SECURITY AUDIT]', JSON.stringify(log));
};

// Detect and prevent brute force attacks
export class BruteForceProtection {
  private static attempts = new Map<string, { count: number; lastAttempt: number }>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  static recordAttempt(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (now - record.lastAttempt > this.WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count > this.MAX_ATTEMPTS) {
      auditLog('BRUTE_FORCE_DETECTED', identifier, { 
        attempts: record.count,
        blocked: true 
      });
      return false;
    }

    return true;
  }

  static resetAttempts(identifier: string) {
    this.attempts.delete(identifier);
  }
}

// Content Security Policy nonce generation
export const generateCSPNonce = (req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
};

// Secure session configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const
  },
  name: 'sessionId'
};

export default {
  authLimiter,
  messageLimiter,
  generalLimiter,
  securityHeaders,
  corsOptions,
  mongoSanitization,
  xssProtection,
  hppProtection,
  csrfProtection,
  validateInput,
  auditLog,
  BruteForceProtection,
  generateCSPNonce,
  sessionConfig,
  CSRFProtection
};

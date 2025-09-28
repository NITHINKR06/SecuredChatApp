import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cors from 'cors';
import crypto from 'crypto';
import { body, param, query, validationResult } from 'express-validator';

// Enhanced rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: 'Too many messages sent, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 uploads per 5 minutes
  message: 'Too many file uploads, please try again later.',
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

// Enhanced security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// Enhanced CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:3003',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

// Enhanced MongoDB injection prevention
export const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] NoSQL injection attempt blocked:`, {
      key,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  },
  allowDots: false,
  dryRun: false
});

// Enhanced XSS protection with custom sanitization
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Helper function to recursively sanitize objects
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Custom HTML sanitization without external library
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
      .replace(/<meta\b[^>]*>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '')
      .replace(/expression\s*\(/gi, '')
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Sanitize the key as well
        const sanitizedKey = typeof key === 'string' ? 
          key.replace(/[<>\"\']/g, '') : key;
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// HTTP Parameter Pollution prevention
export const hppProtection = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'filter', 'search'],
  checkBody: true,
  checkQuery: true
});

// Enhanced CSRF Protection with double-submit cookie pattern
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 3600000; // 1 hour

  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const expires = Date.now() + this.TOKEN_EXPIRY;
    
    this.tokens.set(sessionId, { token, expires });
    
    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();
    
    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    if (!sessionId || !token) return false;
    
    const stored = this.tokens.get(sessionId);
    
    if (!stored) return false;
    
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(stored.token),
        Buffer.from(token)
      );
    } catch {
      return false;
    }
  }

  private static cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, value] of this.tokens.entries()) {
      if (value.expires < now) {
        this.tokens.delete(key);
      }
    }
  }

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const sessionId = req.session?.id;
      const token = req.headers['x-csrf-token'] as string || req.body?._csrf;

      if (!sessionId || !token) {
        return res.status(403).json({ 
          success: false, 
          message: 'CSRF token missing' 
        });
      }

      if (!this.validateToken(sessionId, token)) {
        console.warn(`[SECURITY] Invalid CSRF token:`, {
          sessionId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid CSRF token' 
        });
      }

      next();
    };
  }
}

// Enhanced input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /import\s+/gi,
    /require\s*\(/gi,
    /\.\.\/|\.\.\\/, // Path traversal
    /\x00/, // Null bytes
    /%00/, // URL encoded null bytes
    /\${.*}/, // Template injection
    /{{.*}}/, // Template injection
  ];

  const checkForSuspiciousContent = (value: any): boolean => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };

  const validateRecursive = (obj: any, path: string = ''): boolean => {
    if (checkForSuspiciousContent(obj)) {
      console.warn(`[SECURITY] Suspicious content detected:`, {
        path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      return false;
    }

    if (Array.isArray(obj)) {
      return obj.every((item, index) => validateRecursive(item, `${path}[${index}]`));
    }

    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).every(key => 
        validateRecursive(obj[key], path ? `${path}.${key}` : key)
      );
    }

    return true;
  };

  // Validate all input sources
  const isBodyValid = validateRecursive(req.body, 'body');
  const isQueryValid = validateRecursive(req.query, 'query');
  const isParamsValid = validateRecursive(req.params, 'params');

  if (!isBodyValid || !isQueryValid || !isParamsValid) {
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }

  next();
};

// Security audit logging
export const auditLog = (action: string, userId: string | undefined, req: Request, details?: any) => {
  const log = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId || 'anonymous',
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    path: req.path,
    details
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service (e.g., CloudWatch, Datadog, etc.)
    console.log('[SECURITY AUDIT]', JSON.stringify(log));
  } else {
    console.log('[SECURITY AUDIT]', log);
  }
};

// Enhanced Brute Force Protection
export class BruteForceProtection {
  private static attempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

  static recordAttempt(identifier: string, req: Request): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return true;
    }

    // Check if currently blocked
    if (record.blocked && (now - record.lastAttempt) < this.BLOCK_DURATION) {
      auditLog('BRUTE_FORCE_BLOCKED', identifier, req, { 
        attempts: record.count,
        blockedUntil: new Date(record.lastAttempt + this.BLOCK_DURATION)
      });
      return false;
    }

    // Reset if outside window
    if (now - record.lastAttempt > this.WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now, blocked: false });
      return true;
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count > this.MAX_ATTEMPTS) {
      record.blocked = true;
      auditLog('BRUTE_FORCE_DETECTED', identifier, req, { 
        attempts: record.count,
        blocked: true,
        duration: this.BLOCK_DURATION
      });
      return false;
    }

    return true;
  }

  static resetAttempts(identifier: string) {
    this.attempts.delete(identifier);
  }

  static isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record) return false;
    
    const now = Date.now();
    if (record.blocked && (now - record.lastAttempt) < this.BLOCK_DURATION) {
      return true;
    }
    
    return false;
  }
}

// Content Security Policy nonce generation
export const generateCSPNonce = (req: Request, res: Response, next: NextFunction) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  
  // Override CSP header with nonce
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${res.locals.cspNonce}'; style-src 'self' 'nonce-${res.locals.cspNonce}';`
  );
  
  next();
};

// Session security configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' as const,
    path: '/',
    domain: process.env.COOKIE_DOMAIN
  },
  name: 'sessionId',
  genid: () => crypto.randomBytes(32).toString('hex')
};

// SQL Injection prevention for any SQL queries (if used)
export const sqlSanitize = (value: string): string => {
  if (typeof value !== 'string') return value;
  
  // Remove or escape dangerous SQL characters
  return value
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '') // Remove extended stored procedures
    .replace(/sp_/gi, '') // Remove stored procedures
    .trim();
};

// Validation schemas for common inputs
export const validationSchemas = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 }),
    
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    
  mongoId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  pagination: [
    query('page').optional().isInt({ min: 1, max: 1000 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ]
};

// Middleware to handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg
      }))
    });
  }
  next();
};

export default {
  authLimiter,
  messageLimiter,
  uploadLimiter,
  generalLimiter,
  securityHeaders,
  corsOptions,
  mongoSanitization,
  xssProtection,
  hppProtection,
  CSRFProtection,
  validateInput,
  auditLog,
  BruteForceProtection,
  generateCSPNonce,
  sessionConfig,
  sqlSanitize,
  validationSchemas,
  handleValidationErrors
};

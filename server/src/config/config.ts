import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/passwordless-portal',
  
  // Session Configuration
  sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-here',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
  
  // WebAuthn Configuration
  webauthn: {
    rpId: process.env.RP_ID || 'localhost',
    rpName: process.env.RP_NAME || 'Passwordless Portal',
    rpOrigin: process.env.RP_ORIGIN || 'http://localhost:3000',
  },
  
  // CORS Configuration - Support multiple ports for development
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Security
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validate required environment variables in production
if (config.isProduction) {
  const requiredVars = [
    'MONGO_URI',
    'SESSION_SECRET',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
}

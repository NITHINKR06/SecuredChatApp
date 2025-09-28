"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/passwordless-portal',
    sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-here',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    webauthn: {
        rpId: process.env.RP_ID || 'localhost',
        rpName: process.env.RP_NAME || 'Passwordless Portal',
        rpOrigin: process.env.RP_ORIGIN || 'http://localhost:3000',
    },
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
};
if (exports.config.isProduction) {
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
//# sourceMappingURL=config.js.map
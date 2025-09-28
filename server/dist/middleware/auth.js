"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config/config");
const User_1 = require("../models/User");
const Session_1 = require("../models/Session");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const session = await Session_1.Session.findOne({
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
        const user = await User_1.User.findById(decoded.userId).select('-authenticators');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        await session.updateActivity();
        req.user = user;
        req.sessionId = decoded.sessionId;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        else {
            console.error('Authentication error:', error);
            res.status(500).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            const session = await Session_1.Session.findOne({
                sessionId: decoded.sessionId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });
            if (session) {
                const user = await User_1.User.findById(decoded.userId).select('-authenticators');
                if (user) {
                    await session.updateActivity();
                    req.user = user;
                    req.sessionId = decoded.sessionId;
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const generateToken = (userId, email, sessionId) => {
    return jsonwebtoken_1.default.sign({ userId, email, sessionId }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webauthn_1 = require("../services/webauthn");
const auth_1 = require("../middleware/auth");
const Session_1 = require("../models/Session");
const AuditLog_1 = require("../models/AuditLog");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/me', async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                displayName: user.displayName,
                hasAuthenticators: user.authenticators.length > 0,
                lastLoginAt: user.lastLoginAt,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});
router.get('/devices', async (req, res) => {
    try {
        const devices = await webauthn_1.WebAuthnService.getUserAuthenticators(req.user.email);
        res.json({
            success: true,
            data: devices
        });
    }
    catch (error) {
        console.error('Get user devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user devices'
        });
    }
});
router.delete('/devices/:credentialId', async (req, res) => {
    try {
        const { credentialId } = req.params;
        const userEmail = req.user.email;
        const success = await webauthn_1.WebAuthnService.removeAuthenticator(userEmail, credentialId);
        if (success) {
            await AuditLog_1.AuditLog.logAction('AUTHENTICATOR_REMOVED', req.user._id, req.ip, req.get('User-Agent'), { credentialId });
            res.json({
                success: true,
                message: 'Device removed successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
    }
    catch (error) {
        console.error('Remove device error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove device'
        });
    }
});
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await Session_1.Session.find({
            userId: req.user._id,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).sort({ lastActivity: -1 });
        const sessionData = sessions.map(session => ({
            id: session.sessionId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            isCurrent: session.sessionId === req.sessionId
        }));
        res.json({
            success: true,
            data: sessionData
        });
    }
    catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user sessions'
        });
    }
});
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;
        if (sessionId === req.sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot revoke current session'
            });
        }
        const session = await Session_1.Session.findOneAndUpdate({
            sessionId,
            userId,
            isActive: true
        }, { isActive: false });
        if (session) {
            await AuditLog_1.AuditLog.logAction('SESSION_DESTROYED', userId, req.ip, req.get('User-Agent'), { sessionId });
            res.json({
                success: true,
                message: 'Session revoked successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
    }
    catch (error) {
        console.error('Revoke session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke session'
        });
    }
});
router.delete('/sessions', async (req, res) => {
    try {
        const userId = req.user._id;
        const currentSessionId = req.sessionId;
        const result = await Session_1.Session.updateMany({
            userId,
            sessionId: { $ne: currentSessionId },
            isActive: true
        }, { isActive: false });
        await AuditLog_1.AuditLog.logAction('SESSION_DESTROYED', userId, req.ip, req.get('User-Agent'), { action: 'revoke_all_other_sessions', count: result.modifiedCount });
        res.json({
            success: true,
            message: `Revoked ${result.modifiedCount} sessions`
        });
    }
    catch (error) {
        console.error('Revoke all sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke sessions'
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map
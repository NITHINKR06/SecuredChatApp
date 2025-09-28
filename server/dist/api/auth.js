"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const webauthn_1 = require("../services/webauthn");
const auth_1 = require("../middleware/auth");
const Session_1 = require("../models/Session");
const AuditLog_1 = require("../models/AuditLog");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
router.use(security_1.authRateLimit);
router.post('/register/start', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('displayName').trim().isLength({ min: 2, max: 50 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { email, displayName } = req.body;
        const options = await webauthn_1.WebAuthnService.generateRegistrationOptions(email, displayName);
        req.session.registrationChallenge = options.challenge;
        req.session.registrationEmail = email;
        req.session.registrationDisplayName = displayName;
        await AuditLog_1.AuditLog.logAction('USER_REGISTERED', undefined, req.ip, req.get('User-Agent'), { email, displayName });
        res.json({
            success: true,
            data: options
        });
    }
    catch (error) {
        console.error('Registration start error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start registration'
        });
    }
});
router.post('/register/finish', async (req, res) => {
    try {
        const { response } = req.body;
        const challenge = req.session.registrationChallenge;
        const email = req.session.registrationDisplayName;
        const displayName = req.session.registrationDisplayName;
        if (!challenge || !email || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Registration session expired'
            });
        }
        const result = await webauthn_1.WebAuthnService.verifyRegistration(email, response, challenge);
        if (result.verified && result.user) {
            delete req.session.registrationChallenge;
            delete req.session.registrationEmail;
            delete req.session.registrationDisplayName;
            const session = new Session_1.Session({
                userId: result.user._id,
                sessionId: req.sessionID,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            await session.save();
            const token = (0, auth_1.generateToken)(result.user._id.toString(), result.user.email, session.sessionId);
            await AuditLog_1.AuditLog.logAction('AUTHENTICATOR_REGISTERED', result.user._id, req.ip, req.get('User-Agent'), { email });
            res.json({
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: result.user._id,
                        email: result.user.email,
                        displayName: result.user.displayName
                    },
                    token
                }
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Registration verification failed'
            });
        }
    }
    catch (error) {
        console.error('Registration finish error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete registration'
        });
    }
});
router.post('/login/start', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { email } = req.body;
        const options = await webauthn_1.WebAuthnService.generateAuthenticationOptions(email);
        req.session.loginChallenge = options.challenge;
        req.session.loginEmail = email;
        res.json({
            success: true,
            data: options
        });
    }
    catch (error) {
        console.error('Login start error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start login'
        });
    }
});
router.post('/login/finish', async (req, res) => {
    try {
        const { response } = req.body;
        const challenge = req.session.loginChallenge;
        if (!challenge) {
            return res.status(400).json({
                success: false,
                message: 'Login session expired'
            });
        }
        const result = await webauthn_1.WebAuthnService.verifyAuthentication(response, challenge);
        if (result.verified && result.user) {
            delete req.session.loginChallenge;
            delete req.session.loginEmail;
            const session = new Session_1.Session({
                userId: result.user._id,
                sessionId: req.sessionID,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
            await session.save();
            const token = (0, auth_1.generateToken)(result.user._id.toString(), result.user.email, session.sessionId);
            await AuditLog_1.AuditLog.logAction('USER_LOGIN', result.user._id, req.ip, req.get('User-Agent'), { email: result.user.email });
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: result.user._id,
                        email: result.user.email,
                        displayName: result.user.displayName
                    },
                    token
                }
            });
        }
        else {
            res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }
    catch (error) {
        console.error('Login finish error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete login'
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const sessionId = req.sessionID;
        await Session_1.Session.findOneAndUpdate({ sessionId }, { isActive: false });
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
            }
        });
        await AuditLog_1.AuditLog.logAction('USER_LOGOUT', req.user?._id, req.ip, req.get('User-Agent'));
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
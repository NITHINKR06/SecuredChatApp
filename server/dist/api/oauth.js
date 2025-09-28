"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const config_1 = require("../config/config");
const User_1 = require("../models/User");
const Session_1 = require("../models/Session");
const AuditLog_1 = require("../models/AuditLog");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
if (config_1.config.google.clientId && config_1.config.google.clientSecret) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: config_1.config.google.clientId,
        clientSecret: config_1.config.google.clientSecret,
        callbackURL: '/api/v1/oauth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const displayName = profile.displayName || profile.name?.givenName || 'User';
            if (!email) {
                return done(new Error('No email found in Google profile'), undefined);
            }
            let user = await User_1.User.findOne({
                $or: [
                    { email },
                    { googleId: profile.id }
                ]
            });
            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
            }
            else {
                user = new User_1.User({
                    email,
                    displayName,
                    googleId: profile.id,
                    authenticators: []
                });
                await user.save();
            }
            return done(null, user);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
}
if (config_1.config.github.clientId && config_1.config.github.clientSecret) {
    passport_1.default.use(new passport_github2_1.Strategy({
        clientID: config_1.config.github.clientId,
        clientSecret: config_1.config.github.clientSecret,
        callbackURL: '/api/v1/oauth/github/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const displayName = profile.displayName || profile.username || 'User';
            if (!email) {
                return done(new Error('No email found in GitHub profile'), undefined);
            }
            let user = await User_1.User.findOne({
                $or: [
                    { email },
                    { githubId: profile.id }
                ]
            });
            if (user) {
                if (!user.githubId) {
                    user.githubId = profile.id;
                    await user.save();
                }
            }
            else {
                user = new User_1.User({
                    email,
                    displayName,
                    githubId: profile.id,
                    authenticators: []
                });
                await user.save();
            }
            return done(null, user);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
}
passport_1.default.serializeUser((user, done) => {
    done(null, user._id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.User.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect('/login?error=oauth_failed');
        }
        const session = new Session_1.Session({
            userId: user._id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await session.save();
        const token = (0, auth_1.generateToken)(user._id.toString(), user.email, session.sessionId);
        user.lastLoginAt = new Date();
        await user.save();
        await AuditLog_1.AuditLog.logAction('OAUTH_LOGIN', user._id, req.ip, req.get('User-Agent'), { provider: 'google', email: user.email });
        const frontendUrl = config_1.config.webauthn.rpOrigin;
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/login?error=oauth_failed');
    }
});
router.get('/github', passport_1.default.authenticate('github', {
    scope: ['user:email']
}));
router.get('/github/callback', passport_1.default.authenticate('github', { failureRedirect: '/login?error=oauth_failed' }), async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect('/login?error=oauth_failed');
        }
        const session = new Session_1.Session({
            userId: user._id,
            sessionId: req.sessionID,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await session.save();
        const token = (0, auth_1.generateToken)(user._id.toString(), user.email, session.sessionId);
        user.lastLoginAt = new Date();
        await user.save();
        await AuditLog_1.AuditLog.logAction('OAUTH_LOGIN', user._id, req.ip, req.get('User-Agent'), { provider: 'github', email: user.email });
        const frontendUrl = config_1.config.webauthn.rpOrigin;
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
    catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect('/login?error=oauth_failed');
    }
});
exports.default = router;
//# sourceMappingURL=oauth.js.map
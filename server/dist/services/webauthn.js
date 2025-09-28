"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAuthnService = void 0;
const server_1 = require("@simplewebauthn/server");
const config_1 = require("../config/config");
const User_1 = require("../models/User");
const rpName = config_1.config.webauthn.rpName;
const rpID = config_1.config.webauthn.rpId;
const origin = config_1.config.webauthn.rpOrigin;
class WebAuthnService {
    static async generateRegistrationOptions(userEmail, userName) {
        const user = await User_1.User.findOne({ email: userEmail });
        const opts = {
            rpName,
            rpID,
            userID: userEmail,
            userName,
            userDisplayName: userName,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'preferred',
                residentKey: 'preferred',
            },
            supportedAlgorithmIDs: [-7, -257],
        };
        if (user) {
            opts.excludeCredentials = user.authenticators.map(authenticator => ({
                id: authenticator.credentialID,
                type: 'public-key',
                transports: authenticator.transports,
            }));
        }
        return await (0, server_1.generateRegistrationOptions)(opts);
    }
    static async verifyRegistration(userEmail, response, expectedChallenge) {
        let verification;
        try {
            const opts = {
                response,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                requireUserVerification: true,
            };
            verification = await (0, server_1.verifyRegistrationResponse)(opts);
        }
        catch (error) {
            console.error('WebAuthn verification failed:', error);
            return { verified: false };
        }
        const { verified, registrationInfo } = verification;
        if (verified && registrationInfo) {
            const { credentialID, credentialPublicKey, counter } = registrationInfo;
            let user = await User_1.User.findOne({ email: userEmail });
            if (!user) {
                user = new User_1.User({
                    email: userEmail,
                    displayName: userEmail.split('@')[0],
                    authenticators: [],
                });
            }
            const newAuthenticator = {
                credentialID: Buffer.from(credentialID),
                credentialPublicKey: Buffer.from(credentialPublicKey),
                counter,
                transports: response.response.transports || [],
            };
            await user.addAuthenticator(newAuthenticator);
            return { verified: true, user };
        }
        return { verified: false };
    }
    static async generateAuthenticationOptions(userEmail) {
        const opts = {
            rpID,
            allowCredentials: [],
            userVerification: 'preferred',
        };
        if (userEmail) {
            const user = await User_1.User.findOne({ email: userEmail });
            if (user && user.authenticators.length > 0) {
                opts.allowCredentials = user.authenticators.map(authenticator => ({
                    id: authenticator.credentialID,
                    type: 'public-key',
                    transports: authenticator.transports,
                }));
            }
        }
        return await (0, server_1.generateAuthenticationOptions)(opts);
    }
    static async verifyAuthentication(response, expectedChallenge) {
        const { id } = response;
        const user = await User_1.User.findOne({
            'authenticators.credentialID': Buffer.from(id, 'base64url')
        });
        if (!user) {
            return { verified: false };
        }
        const authenticator = user.findAuthenticator(Buffer.from(id, 'base64url'));
        if (!authenticator) {
            return { verified: false };
        }
        let verification;
        try {
            const opts = {
                response,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator: {
                    credentialID: authenticator.credentialID,
                    credentialPublicKey: authenticator.credentialPublicKey,
                    counter: authenticator.counter,
                },
                requireUserVerification: true,
            };
            verification = await (0, server_1.verifyAuthenticationResponse)(opts);
        }
        catch (error) {
            console.error('WebAuthn authentication verification failed:', error);
            return { verified: false };
        }
        const { verified, authenticationInfo } = verification;
        if (verified && authenticationInfo) {
            const { newCounter } = authenticationInfo;
            await user.updateAuthenticatorCounter(authenticator.credentialID, newCounter);
            user.lastLoginAt = new Date();
            await user.save();
            return { verified: true, user };
        }
        return { verified: false };
    }
    static async removeAuthenticator(userEmail, credentialID) {
        const user = await User_1.User.findOne({ email: userEmail });
        if (!user) {
            return false;
        }
        const credentialBuffer = Buffer.from(credentialID, 'base64url');
        await user.removeAuthenticator(credentialBuffer);
        return true;
    }
    static async getUserAuthenticators(userEmail) {
        const user = await User_1.User.findOne({ email: userEmail });
        if (!user) {
            return [];
        }
        return user.authenticators.map(auth => ({
            id: auth.credentialID.toString('base64url'),
            counter: auth.counter,
            transports: auth.transports,
            createdAt: auth.createdAt,
        }));
    }
}
exports.WebAuthnService = WebAuthnService;
//# sourceMappingURL=webauthn.js.map
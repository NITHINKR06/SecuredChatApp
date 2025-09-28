import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { config } from '../config/config';
import { User, IAuthenticator } from '../models/User';

const rpName = config.webauthn.rpName;
const rpID = config.webauthn.rpId;
const origin = config.webauthn.rpOrigin;

export class WebAuthnService {
  /**
   * Generate registration options for a new user
   */
  static async generateRegistrationOptions(
    userEmail: string,
    username: string,
    userName: string
  ): Promise<any> {
    // Check if username is already taken
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      throw new Error('Username is already taken');
    }
    
    const user = await User.findOne({ email: userEmail });
    
    const userIDBuffer = Buffer.from(userEmail);
    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: userIDBuffer,
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

    if (user && user.authenticators) {
      opts.excludeCredentials = user.authenticators.map(authenticator => ({
        id: authenticator.credentialID.toString('base64url'),
        transports: authenticator.transports as AuthenticatorTransportFuture[],
      }));
    }

    return await generateRegistrationOptions(opts);
  }

  /**
   * Verify registration response and save authenticator
   */
  static async verifyRegistration(
    userEmail: string,
    username: string,
    response: any,
    expectedChallenge: string
  ): Promise<{ verified: boolean; user?: any }> {
    let verification;
    
    try {
      const opts: VerifyRegistrationResponseOpts = {
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      };

      verification = await verifyRegistrationResponse(opts);
    } catch (error) {
      console.error('WebAuthn verification failed:', error);
      return { verified: false };
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = registrationInfo;

      // Find or create user
      let user = await User.findOne({ email: userEmail });
      
      if (!user) {
        user = new User({
          email: userEmail,
          username: username.toLowerCase(),
          displayName: userEmail.split('@')[0], // Use email prefix as display name
          authenticators: [],
        });
      }

      // Add the new authenticator
      const newAuthenticator: Omit<IAuthenticator, 'createdAt'> = {
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

  /**
   * Generate authentication options for login
   */
  static async generateAuthenticationOptions(userEmail?: string): Promise<any> {
    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      allowCredentials: [],
      userVerification: 'preferred',
    };

    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user && user.authenticators && user.authenticators.length > 0) {
        opts.allowCredentials = user.authenticators.map(authenticator => ({
          id: authenticator.credentialID.toString('base64url'),
          transports: authenticator.transports as AuthenticatorTransportFuture[],
        }));
      }
    }

    return await generateAuthenticationOptions(opts);
  }

  /**
   * Verify authentication response
   */
  static async verifyAuthentication(
    response: any,
    expectedChallenge: string
  ): Promise<{ verified: boolean; user?: any }> {
    const { id } = response;

    // Find user by credential ID
    const user = await User.findOne({
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
      const opts: VerifyAuthenticationResponseOpts = {
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      };

      verification = await verifyAuthenticationResponse(opts);
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error);
      return { verified: false };
    }

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      const { newCounter } = authenticationInfo;
      
      // Update the authenticator counter
      await user.updateAuthenticatorCounter(
        authenticator.credentialID,
        newCounter
      );

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      return { verified: true, user };
    }

    return { verified: false };
  }

  /**
   * Remove an authenticator from user
   */
  static async removeAuthenticator(
    userEmail: string,
    credentialID: string
  ): Promise<boolean> {
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return false;
    }

    const credentialBuffer = Buffer.from(credentialID, 'base64url');
    await user.removeAuthenticator(credentialBuffer);
    
    return true;
  }

  /**
   * Get user's authenticators
   */
  static async getUserAuthenticators(userEmail: string): Promise<any[]> {
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return [];
    }

    return (user.authenticators || []).map(auth => ({
      id: auth.credentialID.toString('base64url'),
      counter: auth.counter,
      transports: auth.transports,
      createdAt: auth.createdAt,
    }));
  }
}

export declare class WebAuthnService {
    static generateRegistrationOptions(userEmail: string, userName: string): Promise<any>;
    static verifyRegistration(userEmail: string, response: any, expectedChallenge: string): Promise<{
        verified: boolean;
        user?: any;
    }>;
    static generateAuthenticationOptions(userEmail?: string): Promise<any>;
    static verifyAuthentication(response: any, expectedChallenge: string): Promise<{
        verified: boolean;
        user?: any;
    }>;
    static removeAuthenticator(userEmail: string, credentialID: string): Promise<boolean>;
    static getUserAuthenticators(userEmail: string): Promise<any[]>;
}
//# sourceMappingURL=webauthn.d.ts.map
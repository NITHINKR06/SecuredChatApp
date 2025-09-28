export declare const config: {
    nodeEnv: string;
    port: number;
    mongoUri: string;
    sessionSecret: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    google: {
        clientId: string;
        clientSecret: string;
    };
    github: {
        clientId: string;
        clientSecret: string;
    };
    webauthn: {
        rpId: string;
        rpName: string;
        rpOrigin: string;
    };
    corsOrigin: string;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    isProduction: boolean;
    isDevelopment: boolean;
};
//# sourceMappingURL=config.d.ts.map
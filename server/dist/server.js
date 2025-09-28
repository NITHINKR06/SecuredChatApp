"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const passport_1 = __importDefault(require("passport"));
const config_1 = require("./config/config");
const database_1 = require("./config/database");
const security_1 = require("./middleware/security");
const auth_1 = __importDefault(require("./api/auth"));
const user_1 = __importDefault(require("./api/user"));
const oauth_1 = __importDefault(require("./api/oauth"));
const app = (0, express_1.default)();
(0, database_1.connectDatabase)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));
app.use(security_1.securityHeaders);
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(config_1.config.isDevelopment ? 'dev' : 'combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, express_session_1.default)({
    secret: config_1.config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: config_1.config.mongoUri,
        touchAfter: 24 * 3600
    }),
    cookie: {
        secure: config_1.config.isProduction,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: config_1.config.isProduction ? 'strict' : 'lax'
    }
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use('/api', security_1.apiRateLimit);
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: config_1.config.nodeEnv
    });
});
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/user', user_1.default);
app.use('/api/v1/oauth', oauth_1.default);
app.use(security_1.notFoundHandler);
app.use(security_1.errorHandler);
const PORT = config_1.config.port;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${config_1.config.nodeEnv}`);
    console.log(`🔗 CORS Origin: ${config_1.config.corsOrigin}`);
    console.log(`🔐 WebAuthn RP ID: ${config_1.config.webauthn.rpId}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
exports.default = app;
//# sourceMappingURL=server.js.map
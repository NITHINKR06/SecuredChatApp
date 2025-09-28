"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const authenticatorSchema = new mongoose_1.Schema({
    credentialID: {
        type: Buffer,
        required: true,
        unique: true
    },
    credentialPublicKey: {
        type: Buffer,
        required: true
    },
    counter: {
        type: Number,
        required: true,
        default: 0
    },
    transports: [{
            type: String,
            enum: ['usb', 'nfc', 'ble', 'internal']
        }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    authenticators: [authenticatorSchema],
    googleId: {
        type: String,
        sparse: true
    },
    githubId: {
        type: String,
        sparse: true
    },
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true
});
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ githubId: 1 });
userSchema.index({ 'authenticators.credentialID': 1 });
userSchema.virtual('hasAuthenticators').get(function () {
    return this.authenticators && this.authenticators.length > 0;
});
userSchema.methods.addAuthenticator = function (authenticator) {
    this.authenticators.push(authenticator);
    return this.save();
};
userSchema.methods.removeAuthenticator = function (credentialID) {
    this.authenticators = this.authenticators.filter((auth) => !auth.credentialID.equals(credentialID));
    return this.save();
};
userSchema.methods.findAuthenticator = function (credentialID) {
    return this.authenticators.find((auth) => auth.credentialID.equals(credentialID));
};
userSchema.methods.updateAuthenticatorCounter = function (credentialID, counter) {
    const authenticator = this.findAuthenticator(credentialID);
    if (authenticator) {
        authenticator.counter = counter;
        return this.save();
    }
    return null;
};
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map
import mongoose, { Document } from 'mongoose';
export interface IAuthenticator {
    credentialID: Buffer;
    credentialPublicKey: Buffer;
    counter: number;
    transports?: string[];
    createdAt: Date;
}
export interface IUser extends Document {
    email: string;
    displayName: string;
    authenticators: IAuthenticator[];
    googleId?: string;
    githubId?: string;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    hasAuthenticators: boolean;
    addAuthenticator(authenticator: Omit<IAuthenticator, 'createdAt'>): Promise<IUser>;
    removeAuthenticator(credentialID: Buffer): Promise<IUser>;
    findAuthenticator(credentialID: Buffer): IAuthenticator | undefined;
    updateAuthenticatorCounter(credentialID: Buffer, counter: number): Promise<IUser | null>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map
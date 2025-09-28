import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthenticator {
  credentialID: Buffer;
  credentialPublicKey: Buffer;
  counter: number;
  transports?: string[];
  createdAt: Date;
}

export interface IContact {
  userId: mongoose.Types.ObjectId;
  isFavorite: boolean;
  isBlocked: boolean;
  addedAt: Date;
}

export interface IUser extends Document {
  email: string;
  username: string;
  displayName: string;
  authenticators: IAuthenticator[];
  contacts: IContact[];
  avatar?: string;
  bio?: string;
  publicKey?: string;
  privateKey?: string;
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

const authenticatorSchema = new Schema<IAuthenticator>({
  credentialID: {
    type: Buffer,
    required: true
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

const contactSchema = new Schema<IContact>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: [/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers, no spaces']
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  authenticators: {
    type: [authenticatorSchema],
    default: undefined
  },
  contacts: {
    type: [contactSchema],
    default: []
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  publicKey: {
    type: String,
    select: false
  },
  privateKey: {
    type: String,
    select: false
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for checking if user has any authenticators
userSchema.virtual('hasAuthenticators').get(function() {
  return this.authenticators && this.authenticators.length > 0;
});

// Method to add a new authenticator
userSchema.methods.addAuthenticator = function(authenticator: Omit<IAuthenticator, 'createdAt'>) {
  if (!this.authenticators) {
    this.authenticators = [];
  }
  this.authenticators.push(authenticator);
  return this.save();
};

// Method to remove an authenticator by credentialID
userSchema.methods.removeAuthenticator = function(credentialID: Buffer) {
  if (!this.authenticators) {
    this.authenticators = [];
  }
  this.authenticators = this.authenticators.filter(
    (auth: IAuthenticator) => !auth.credentialID.equals(credentialID)
  );
  return this.save();
};

// Method to find authenticator by credentialID
userSchema.methods.findAuthenticator = function(credentialID: Buffer) {
  if (!this.authenticators) {
    return undefined;
  }
  return this.authenticators.find(
    (auth: IAuthenticator) => auth.credentialID.equals(credentialID)
  );
};

// Method to update authenticator counter
userSchema.methods.updateAuthenticatorCounter = function(credentialID: Buffer, counter: number) {
  const authenticator = this.findAuthenticator(credentialID);
  if (authenticator) {
    authenticator.counter = counter;
    return this.save();
  }
  return null;
};

export const User = mongoose.model<IUser>('User', userSchema);

import mongoose from 'mongoose';
import { config } from './config';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = config.mongoUri;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    console.log('✅ Connected to MongoDB successfully');

    // Drop the problematic index if it exists
    try {
      const db = mongoose.connection.db;
      if (db) {
        const collection = db.collection('users');
        const indexes = await collection.indexes();
        const problematicIndex = indexes.find(idx => 
          idx.key && 'authenticators.credentialID' in idx.key
        );
        
        if (problematicIndex && problematicIndex.name) {
          await collection.dropIndex(problematicIndex.name);
          console.log('🔧 Dropped problematic authenticators.credentialID index');
        }
      }
    } catch (error) {
      // Index might not exist, which is fine
      console.log('ℹ️ No problematic index to drop or already dropped');
    }

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

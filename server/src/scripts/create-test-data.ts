import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config } from '../config/config';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Create test users
    const hashedPassword = await bcryptjs.hash('testpassword123', 10);
    
    // Check if test users already exist
    let testUser1 = await User.findOne({ email: 'testuser1@example.com' });
    if (!testUser1) {
      testUser1 = await User.create({
        email: 'testuser1@example.com',
        username: 'TestUser1',
        displayName: 'Test User 1',
        password: hashedPassword,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test user 1:', testUser1.email);
    } else {
      console.log('Test user 1 already exists:', testUser1.email);
    }

    let testUser2 = await User.findOne({ email: 'testuser2@example.com' });
    if (!testUser2) {
      testUser2 = await User.create({
        email: 'testuser2@example.com',
        username: 'TestUser2',
        displayName: 'Test User 2',
        password: hashedPassword,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test user 2:', testUser2.email);
    } else {
      console.log('Test user 2 already exists:', testUser2.email);
    }

    // Create a test conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [testUser1._id, testUser2._id] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        name: 'Test Conversation',
        participants: [testUser1._id, testUser2._id],
        type: 'direct',
        createdBy: testUser1._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created test conversation');

      // Create a test message
      await Message.create({
        conversationId: conversation._id,
        senderId: testUser1._id,
        content: 'Hello! This is a test message.',
        type: 'text',
        createdAt: new Date(),
        updatedAt: new Date(),
        reactions: [],
        readBy: [{
          userId: testUser1._id,
          readAt: new Date()
        }]
      });
      console.log('Created test message');
    } else {
      console.log('Test conversation already exists');
    }

    console.log('\n✅ Test data created successfully!');
    console.log('\nYou can now login with:');
    console.log('Email: testuser1@example.com');
    console.log('Password: testpassword123');
    console.log('\nOr:');
    console.log('Email: testuser2@example.com');
    console.log('Password: testpassword123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createTestData();

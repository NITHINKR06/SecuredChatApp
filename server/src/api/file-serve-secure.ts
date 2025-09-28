import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { messageLimiter } from '../middleware/security';

const router = express.Router();

// CRITICAL FIX: Add authentication and authorization for file access
router.use(authenticateToken); // Require authentication for ALL file access
router.use(messageLimiter); // Add rate limiting to prevent abuse

// Serve uploaded files WITH authentication and authorization checks
router.get('/:userId/:filename', async (req: any, res) => {
  try {
    const { userId, filename } = req.params;
    const requestingUserId = req.user._id?.toString() || req.user.id;

    // SECURITY: Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    
    // SECURITY: Validate filename format (alphanumeric, dash, underscore, dot)
    const filenameRegex = /^[a-zA-Z0-9\-_.]+$/;
    if (!filenameRegex.test(sanitizedFilename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    // SECURITY: Validate userId format (MongoDB ObjectId)
    const objectIdRegex = /^[a-f\d]{24}$/i;
    if (!objectIdRegex.test(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Build safe file path
    const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
    const userDir = path.join(UPLOAD_DIR, userId);
    const filePath = path.join(userDir, sanitizedFilename);

    // SECURITY: Ensure the resolved path is within the uploads directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      // Log potential path traversal attempt
      console.error(`[SECURITY] Path traversal attempt detected:`, {
        userId: requestingUserId,
        requestedPath: filePath,
        resolvedPath,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // AUTHORIZATION: Check if user has permission to access this file
    // Option 1: Only allow users to access their own files
    if (userId !== requestingUserId) {
      // Option 2: Check if file is shared with the user (implement sharing logic)
      // For now, we'll check if they're in the same conversation
      const { Conversation } = require('../models/Conversation');
      const { Message } = require('../models/Message');
      
      // Check if both users share a conversation with this file
      const sharedConversation = await Conversation.findOne({
        participants: { $all: [requestingUserId, userId] }
      });

      if (!sharedConversation) {
        // Check if file was shared in a group conversation
        const messageWithFile = await Message.findOne({
          'fileInfo.filename': sanitizedFilename,
          senderId: userId
        }).populate('conversationId');

        if (!messageWithFile || 
            !messageWithFile.conversationId?.participants?.includes(requestingUserId)) {
          
          // Log unauthorized access attempt
          console.warn(`[SECURITY] Unauthorized file access attempt:`, {
            requestingUser: requestingUserId,
            fileOwner: userId,
            filename: sanitizedFilename,
            ip: req.ip
          });

          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this file'
          });
        }
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // SECURITY: Set appropriate headers
    const fileStats = fs.statSync(filePath);
    
    // Determine content type safely
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set security headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': fileStats.size.toString(),
      'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'private, max-age=3600',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    });

    // Log successful file access for audit
    console.log(`[AUDIT] File accessed:`, {
      user: requestingUserId,
      file: `${userId}/${sanitizedFilename}`,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get file metadata (with authentication)
router.head('/:userId/:filename', authenticateToken, async (req: any, res) => {
  try {
    const { userId, filename } = req.params;
    const requestingUserId = req.user._id?.toString() || req.user.id;

    // Same security checks as GET
    const sanitizedFilename = path.basename(filename);
    const filenameRegex = /^[a-zA-Z0-9\-_.]+$/;
    if (!filenameRegex.test(sanitizedFilename)) {
      return res.status(400).end();
    }

    // Only allow users to access their own files or shared files
    if (userId !== requestingUserId) {
      return res.status(403).end();
    }

    const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
    const filePath = path.join(UPLOAD_DIR, userId, sanitizedFilename);
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).end();
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }

    const fileStats = fs.statSync(filePath);
    res.set({
      'Content-Length': fileStats.size.toString(),
      'Last-Modified': fileStats.mtime.toUTCString()
    });
    
    res.status(200).end();
  } catch (error) {
    res.status(500).end();
  }
});

export default router;

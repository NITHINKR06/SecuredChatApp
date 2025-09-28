import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Apply authentication middleware to all routes in this router
router.use(authenticateToken);

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const userDir = path.join(UPLOAD_DIR, req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExtension}`;
    cb(null, filename);
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow ALL file types - no restrictions
    // This enables WhatsApp-like functionality where users can share any file
    cb(null, true);
  }
});

// Generate pre-signed URL for direct upload (returns local storage indicator)
router.post('/sign-url', (req: any, res) => {
  // Return a response indicating local storage mode
  return res.status(200).json({
    success: true,
    useLocalStorage: true,
    message: 'Using local storage for file uploads'
  });
});

// Upload file directly to server
router.post('/direct', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const file = req.file;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fileUrl = `${baseUrl}/api/v1/upload/files/${req.user.id}/${file.filename}`;

    res.json({
      success: true,
      data: {
        fileKey: `${req.user.id}/${file.filename}`,
        publicUrl: fileUrl,
        fileInfo: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl
        }
      }
    });
  } catch (error) {
    console.error('Error in direct upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete file
router.delete('/:userId/:filename', async (req: any, res) => {
  try {
    const { userId, filename } = req.params;

    // Verify the file belongs to the user
    if (userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const filePath = path.join(UPLOAD_DIR, userId, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Error in delete file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's uploaded files
router.get('/list', async (req: any, res) => {
  try {
    const userDir = path.join(UPLOAD_DIR, req.user.id);
    
    if (!fs.existsSync(userDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(userDir).map(filename => {
      const filePath = path.join(userDir, filename);
      const stats = fs.statSync(filePath);
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      
      return {
        key: `${req.user.id}/${filename}`,
        size: stats.size,
        lastModified: stats.mtime,
        publicUrl: `${baseUrl}/api/v1/upload/files/${req.user.id}/${filename}`
      };
    });

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error in list files:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

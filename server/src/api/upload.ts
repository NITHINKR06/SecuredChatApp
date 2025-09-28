import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_BUCKET_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Generate pre-signed URL for direct upload
router.post('/sign-url', (req: any, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({
        success: false,
        message: 'fileName, fileType, and fileSize are required'
      });
    }

    // Validate file size (50MB limit)
    if (fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 50MB limit'
      });
    }

    // Generate unique file key
    const fileExtension = fileName.split('.').pop();
    const fileKey = `uploads/${req.user.id}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Expires: 60 * 5, // 5 minutes
      Metadata: {
        'original-name': fileName,
        'user-id': req.user.id
      }
    };

    s3.getSignedUrl('putObject', params, (err, url) => {
      if (err) {
        console.error('Error generating signed URL:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate upload URL'
        });
      }

      res.json({
        success: true,
        data: {
          uploadUrl: url,
          fileKey,
          publicUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_BUCKET_REGION}.amazonaws.com/${fileKey}`
        }
      });
    });
  } catch (error) {
    console.error('Error in sign-url:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload file directly to server (fallback method)
router.post('/direct', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const file = req.file;
    const fileExtension = file.originalname.split('.').pop();
    const fileKey = `uploads/${req.user.id}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalname,
        'user-id': req.user.id
      }
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file'
        });
      }

      res.json({
        success: true,
        data: {
          fileKey,
          publicUrl: data.Location,
          fileInfo: {
            filename: fileKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: data.Location
          }
        }
      });
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
router.delete('/:fileKey', async (req: any, res) => {
  try {
    const { fileKey } = req.params;

    // Verify the file belongs to the user
    if (!fileKey.startsWith(`uploads/${req.user.id}/`)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey
    };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete file'
        });
      }

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    });
  } catch (error) {
    console.error('Error in delete file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's uploaded files
router.get('/files', async (req: any, res) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: `uploads/${req.user.id}/`,
      MaxKeys: 100
    };

    s3.listObjectsV2(params, (err, data) => {
      if (err) {
        console.error('Error listing files:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to list files'
        });
      }

      const files = data.Contents?.map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        publicUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_S3_BUCKET_REGION}.amazonaws.com/${file.Key}`
      })) || [];

      res.json({
        success: true,
        data: files
      });
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

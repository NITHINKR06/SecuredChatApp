import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { messageLimiter } from '../middleware/security';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';

const router = express.Router();
const unlinkAsync = promisify(fs.unlink);

// Apply authentication middleware to all routes in this router
router.use(authenticateToken);
router.use(messageLimiter); // Add rate limiting

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// SECURITY: Whitelist of allowed file extensions and MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  
  // Documents
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'application/csv'],
  '.rtf': ['application/rtf', 'text/rtf'],
  
  // Archives
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.rar': ['application/x-rar-compressed', 'application/vnd.rar'],
  '.7z': ['application/x-7z-compressed'],
  
  // Audio
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav'],
  '.ogg': ['audio/ogg'],
  '.m4a': ['audio/mp4', 'audio/x-m4a'],
  
  // Video
  '.mp4': ['video/mp4'],
  '.avi': ['video/x-msvideo'],
  '.mov': ['video/quicktime'],
  '.wmv': ['video/x-ms-wmv'],
  '.webm': ['video/webm'],
};

// SECURITY: Blacklisted file extensions (additional safety)
const BLACKLISTED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.app', '.deb', '.rpm',
  '.sh', '.bash', '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse',
  '.ws', '.wsf', '.scr', '.pif', '.msc', '.jar', '.gadget',
  '.application', '.msp', '.scr', '.hta', '.cpl', '.msc', '.dll'
];

// SECURITY: Maximum file sizes by type (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024,    // 10MB for images
  document: 25 * 1024 * 1024,  // 25MB for documents
  video: 100 * 1024 * 1024,    // 100MB for videos
  audio: 50 * 1024 * 1024,     // 50MB for audio
  archive: 50 * 1024 * 1024,   // 50MB for archives
  default: 10 * 1024 * 1024    // 10MB default
};

// Helper function to get file type category
function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  if (mimeType.includes('document') || mimeType.includes('pdf') || mimeType.includes('text')) return 'document';
  return 'default';
}

// SECURITY: Sanitize filename
function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = path.basename(filename);
  
  // Replace spaces and special characters
  let sanitized = basename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Remove multiple dots (prevent extension confusion)
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  
  // Ensure filename doesn't start with a dot (hidden files)
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }
  
  // Limit filename length
  const ext = path.extname(sanitized);
  const nameWithoutExt = path.basename(sanitized, ext);
  if (nameWithoutExt.length > 100) {
    sanitized = nameWithoutExt.substring(0, 100) + ext;
  }
  
  return sanitized;
}

// SECURITY: Verify file content matches extension (basic check)
async function verifyFileContent(filePath: string, mimeType: string): Promise<boolean> {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 511 });
    let buffer = Buffer.alloc(0);
    
    stream.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
    });
    
    stream.on('end', () => {
      // Check magic numbers for common file types
      const magicNumbers: { [key: string]: Buffer[] } = {
        'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
        'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
        'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
        'application/pdf': [Buffer.from('%PDF')],
        'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
      };
      
      const expectedMagic = magicNumbers[mimeType];
      if (expectedMagic) {
        const isValid = expectedMagic.some(magic => {
          if (buffer.length < magic.length) return false;
          return buffer.slice(0, magic.length).equals(magic);
        });
        resolve(isValid);
      } else {
        // If we don't have magic numbers for this type, allow it
        resolve(true);
      }
    });
    
    stream.on('error', () => {
      resolve(false);
    });
  });
}

// Configure multer for local storage with security enhancements
const storage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    try {
      const userId = req.user._id?.toString() || req.user.id;
      const userDir = path.join(UPLOAD_DIR, userId);
      
      // Create user directory if it doesn't exist
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true, mode: 0o750 });
      }
      
      // Create temp directory for initial upload
      const tempDir = path.join(userDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o750 });
      }
      
      cb(null, tempDir);
    } catch (error) {
      cb(error as any, '');
    }
  },
  filename: (req, file, cb) => {
    try {
      // Sanitize original filename
      const sanitizedOriginal = sanitizeFilename(file.originalname);
      const fileExtension = path.extname(sanitizedOriginal).toLowerCase();
      
      // Generate unique filename with hash
      const uniqueId = uuidv4();
      const hash = crypto.createHash('sha256')
        .update(uniqueId + Date.now().toString())
        .digest('hex')
        .substring(0, 8);
      
      const filename = `${uniqueId}-${hash}${fileExtension}`;
      cb(null, filename);
    } catch (error) {
      cb(error as any, '');
    }
  }
});

// Configure multer with security validations
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB absolute maximum
    files: 1, // Only one file at a time
    fields: 10, // Limit number of fields
    parts: 100, // Limit number of parts
  },
  fileFilter: async (req, file, cb) => {
    try {
      // SECURITY: Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Check if extension is blacklisted
      if (BLACKLISTED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`File type ${ext} is not allowed for security reasons`));
      }
      
      // Check if extension is in whitelist
      if (!ALLOWED_FILE_TYPES[ext]) {
        return cb(new Error(`File type ${ext} is not supported`));
      }
      
      // Check MIME type matches extension
      const allowedMimes = ALLOWED_FILE_TYPES[ext];
      if (!allowedMimes.includes(file.mimetype)) {
        return cb(new Error(`MIME type ${file.mimetype} doesn't match extension ${ext}`));
      }
      
      // Check file size based on type
      const category = getFileCategory(file.mimetype);
      const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
      
      // Note: We can't check actual file size here, it's done by multer limits
      // But we can set expectations for the frontend
      
      cb(null, true);
    } catch (error) {
      cb(error as any);
    }
  }
});

// Generate pre-signed URL for direct upload (returns local storage indicator)
router.post('/sign-url', (req: any, res) => {
  // Return a response indicating local storage mode
  return res.status(200).json({
    success: true,
    useLocalStorage: true,
    message: 'Using secure local storage for file uploads',
    maxFileSize: MAX_FILE_SIZES,
    allowedTypes: Object.keys(ALLOWED_FILE_TYPES)
  });
});

// Upload file directly to server with security checks
router.post('/direct', upload.single('file'), async (req: any, res) => {
  let tempFilePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const file = req.file;
    const userId = req.user._id?.toString() || req.user.id;
    tempFilePath = file.path;
    
    // SECURITY: Verify file content matches MIME type
    const isValidContent = await verifyFileContent(tempFilePath, file.mimetype);
    if (!isValidContent) {
      await unlinkAsync(tempFilePath);
      return res.status(400).json({
        success: false,
        message: 'File content does not match the declared type'
      });
    }
    
    // SECURITY: Additional file size check
    const stats = fs.statSync(tempFilePath);
    const category = getFileCategory(file.mimetype);
    const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
    
    if (stats.size > maxSize) {
      await unlinkAsync(tempFilePath);
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size for ${category} files`
      });
    }
    
    // Move file from temp to final location
    const finalDir = path.join(UPLOAD_DIR, userId);
    const finalPath = path.join(finalDir, file.filename);
    
    fs.renameSync(tempFilePath, finalPath);
    tempFilePath = null; // File moved successfully
    
    // Set appropriate permissions
    fs.chmodSync(finalPath, 0o640);
    
    // Generate secure URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fileUrl = `${baseUrl}/api/v1/upload/files/${userId}/${file.filename}`;
    
    // Log successful upload for audit
    console.log(`[AUDIT] File uploaded:`, {
      user: userId,
      filename: file.filename,
      originalName: sanitizeFilename(file.originalname),
      size: stats.size,
      mimeType: file.mimetype,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        fileKey: `${userId}/${file.filename}`,
        publicUrl: fileUrl,
        fileInfo: {
          filename: file.filename,
          originalName: sanitizeFilename(file.originalname),
          mimeType: file.mimetype,
          size: stats.size,
          url: fileUrl,
          uploadedAt: new Date().toISOString()
        }
      }
    });
  } catch (error: any) {
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await unlinkAsync(tempFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    console.error('Error in direct upload:', error);
    
    // Don't expose internal error details
    const message = error.message?.includes('not allowed') || 
                   error.message?.includes('not supported') ||
                   error.message?.includes('match') ? 
                   error.message : 'File upload failed';
    
    res.status(400).json({
      success: false,
      message
    });
  }
});

// Delete file with security checks
router.delete('/:userId/:filename', async (req: any, res) => {
  try {
    const { userId, filename } = req.params;
    const requestingUserId = req.user._id?.toString() || req.user.id;

    // SECURITY: Verify the file belongs to the user
    if (userId !== requestingUserId) {
      console.warn(`[SECURITY] Unauthorized delete attempt:`, {
        requestingUser: requestingUserId,
        targetUser: userId,
        filename,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // SECURITY: Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    
    // SECURITY: Validate filename format
    const filenameRegex = /^[a-zA-Z0-9\-_.]+$/;
    if (!filenameRegex.test(sanitizedFilename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    const filePath = path.join(UPLOAD_DIR, userId, sanitizedFilename);
    
    // SECURITY: Ensure the resolved path is within the user's upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUserDir = path.resolve(path.join(UPLOAD_DIR, userId));
    
    if (!resolvedPath.startsWith(resolvedUserDir)) {
      console.error(`[SECURITY] Path traversal attempt in delete:`, {
        userId: requestingUserId,
        requestedPath: filePath,
        resolvedPath,
        ip: req.ip
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // Log successful deletion for audit
      console.log(`[AUDIT] File deleted:`, {
        user: requestingUserId,
        filename: sanitizedFilename,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
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
      message: 'Failed to delete file'
    });
  }
});

// Get user's uploaded files with security
router.get('/list', async (req: any, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const userDir = path.join(UPLOAD_DIR, userId);
    
    if (!fs.existsSync(userDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(userDir)
      .filter(filename => {
        // Filter out temp directory and hidden files
        return filename !== 'temp' && !filename.startsWith('.');
      })
      .map(filename => {
        const filePath = path.join(userDir, filename);
        try {
          const stats = fs.statSync(filePath);
          const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
          
          return {
            key: `${userId}/${filename}`,
            filename,
            size: stats.size,
            lastModified: stats.mtime,
            publicUrl: `${baseUrl}/api/v1/upload/files/${userId}/${filename}`
          };
        } catch (error) {
          console.error(`Error reading file stats for ${filename}:`, error);
          return null;
        }
      })
      .filter(file => file !== null);

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error in list files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files'
    });
  }
});

// Get storage usage for user
router.get('/usage', async (req: any, res) => {
  try {
    const userId = req.user._id?.toString() || req.user.id;
    const userDir = path.join(UPLOAD_DIR, userId);
    
    if (!fs.existsSync(userDir)) {
      return res.json({
        success: true,
        data: {
          used: 0,
          limit: 1024 * 1024 * 1024, // 1GB limit per user
          percentage: 0
        }
      });
    }

    let totalSize = 0;
    const files = fs.readdirSync(userDir);
    
    for (const filename of files) {
      if (filename !== 'temp' && !filename.startsWith('.')) {
        const filePath = path.join(userDir, filename);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        } catch (error) {
          console.error(`Error reading file stats for ${filename}:`, error);
        }
      }
    }

    const limit = 1024 * 1024 * 1024; // 1GB limit
    const percentage = Math.round((totalSize / limit) * 100);

    res.json({
      success: true,
      data: {
        used: totalSize,
        limit,
        percentage,
        remaining: limit - totalSize
      }
    });
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate storage usage'
    });
  }
});

export default router;

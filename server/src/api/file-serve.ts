import express from 'express';
import path from 'path';
import cors from 'cors';

const router = express.Router();

// Add CORS headers for file serving
router.use(cors({
  origin: true, // Allow all origins for file serving
  credentials: false,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges']
}));

// Add headers to allow cross-origin requests
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Serve uploaded files WITHOUT authentication (public access)
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
router.use('/', express.static(UPLOAD_DIR, {
  setHeaders: (res, path) => {
    // Set proper headers for different file types
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/*');
    } else if (path.endsWith('.mp4') || path.endsWith('.webm') || path.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'video/*');
    } else if (path.endsWith('.mp3') || path.endsWith('.wav') || path.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'audio/*');
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  }
}));

export default router;

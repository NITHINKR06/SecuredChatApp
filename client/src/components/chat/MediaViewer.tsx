import React, { useEffect, useState, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio';
  fileName?: string;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  fileName = 'media'
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setImageLoaded(false);
      setImageError(false);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch(e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [mediaUrl, fileName]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop, not the content
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
      onClick={handleBackdropClick}
    >
      {/* Header with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Close and filename */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white text-sm font-medium truncate max-w-xs sm:max-w-md">
              {fileName}
            </span>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center space-x-2">
            {mediaType === 'image' && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Zoom out"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white text-sm min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Zoom in"
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Rotate"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Media content */}
      <div className="relative w-full h-full flex items-center justify-center p-4 pt-20 pb-4">
        {mediaType === 'image' && (
          <>
            {/* Loading spinner */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
              </div>
            )}
            
            {/* Error state */}
            {imageError && (
              <div className="text-white text-center">
                <p className="text-lg mb-2">Failed to load image</p>
                <p className="text-sm opacity-70">{fileName}</p>
              </div>
            )}
            
            {/* Image */}
            {!imageError && (
              <img
                src={mediaUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-300"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  opacity: imageLoaded ? 1 : 0,
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                draggable={false}
              />
            )}
          </>
        )}

        {mediaType === 'video' && (
          <video
            src={mediaUrl}
            className="max-w-full max-h-full"
            controls
            autoPlay
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {mediaType === 'audio' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <p className="text-white font-medium truncate">{fileName}</p>
            </div>
            <audio
              src={mediaUrl}
              controls
              className="w-full"
              autoPlay={false}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      {mediaType === 'image' && imageLoaded && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="text-white/70 text-xs">
            Press Esc to close • Ctrl+/- to zoom
          </p>
        </div>
      )}
    </div>
  );
};

export default MediaViewer;

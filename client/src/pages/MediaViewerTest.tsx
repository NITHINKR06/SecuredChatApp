import React, { useState } from 'react';
import MediaViewer from '../components/chat/MediaViewer';

const MediaViewerTest: React.FC = () => {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [showAudioViewer, setShowAudioViewer] = useState(false);

  // Sample media URLs for testing
  const sampleImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop';
  const sampleVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';
  const sampleAudio = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Media Viewer Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test the WhatsApp-like Media Viewer</h2>
          <p className="text-gray-600 mb-6">
            Click on any media thumbnail below to open it in the full-screen viewer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image Test */}
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Image Viewer</h3>
              <div 
                className="relative cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => setShowImageViewer(true)}
              >
                <img 
                  src={sampleImage} 
                  alt="Sample" 
                  className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Click to view image</p>
            </div>

            {/* Video Test */}
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Video Viewer</h3>
              <div 
                className="relative cursor-pointer group overflow-hidden rounded-lg bg-gray-900"
                onClick={() => setShowVideoViewer(true)}
              >
                <video 
                  src={sampleVideo}
                  className="w-full h-48 object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-3 bg-white bg-opacity-90 rounded-full group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">Click to play video</p>
            </div>

            {/* Audio Test */}
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700">Audio Viewer</h3>
              <div 
                className="relative cursor-pointer group overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 h-48 flex items-center justify-center"
                onClick={() => setShowAudioViewer(true)}
              >
                <div className="text-white">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  <p className="text-sm font-medium">Audio File</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Click to play audio</p>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Full-screen display</p>
                <p className="text-sm text-gray-500">Opens media in a dark overlay</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Zoom controls</p>
                <p className="text-sm text-gray-500">Zoom in/out with buttons or Ctrl+scroll</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Image rotation</p>
                <p className="text-sm text-gray-500">Rotate images in 90° increments</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Keyboard shortcuts</p>
                <p className="text-sm text-gray-500">Esc to close, Ctrl+/- to zoom</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Download option</p>
                <p className="text-sm text-gray-500">Download media files directly</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Click outside to close</p>
                <p className="text-sm text-gray-500">Easy dismissal by clicking backdrop</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Viewers */}
      <MediaViewer
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        mediaUrl={sampleImage}
        mediaType="image"
        fileName="mountain-landscape.jpg"
      />

      <MediaViewer
        isOpen={showVideoViewer}
        onClose={() => setShowVideoViewer(false)}
        mediaUrl={sampleVideo}
        mediaType="video"
        fileName="sample-video.mp4"
      />

      <MediaViewer
        isOpen={showAudioViewer}
        onClose={() => setShowAudioViewer(false)}
        mediaUrl={sampleAudio}
        mediaType="audio"
        fileName="sample-audio.mp3"
      />
    </div>
  );
};

export default MediaViewerTest;

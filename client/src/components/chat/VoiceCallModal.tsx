import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Video,
  VideoOff,
  Minimize2,
  Maximize2,
  User
} from 'lucide-react';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  isIncoming?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  user,
  isIncoming = false,
  onAccept,
  onReject
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && callStatus === 'connected') {
      // Start call duration timer
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, callStatus]);

  useEffect(() => {
    // Initialize media devices
    const initializeMedia = async () => {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('getUserMedia is not supported in this browser');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        localStreamRef.current = stream;
        
        // Set up local audio element for testing
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        // Show user-friendly error message
        alert('Unable to access microphone. Please check your browser permissions.');
      }
    };

    if (isOpen) {
      initializeMedia();
    }

    return () => {
      // Cleanup media streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = () => {
    setCallStatus('connected');
    if (onAccept) onAccept();
  };

  const handleRejectCall = () => {
    setCallStatus('ended');
    if (onReject) onReject();
    setTimeout(onClose, 1000);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(onClose, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleVideo = async () => {
    if (!isVideoOn) {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Video calling is not supported in this browser');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Replace audio track in existing stream
        if (localStreamRef.current) {
          const oldAudioTrack = localStreamRef.current.getAudioTracks()[0];
          if (oldAudioTrack) oldAudioTrack.stop();
        }
        
        localStreamRef.current = stream;
        setIsVideoOn(true);
      } catch (error) {
        console.error('Error enabling video:', error);
        alert('Unable to access camera. Please check your browser permissions.');
      }
    } else {
      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach(track => track.stop());
        
        // Switch back to audio only
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          localStreamRef.current = stream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error switching to audio only:', error);
          alert('Unable to access microphone. Please check your browser permissions.');
        }
      }
      setIsVideoOn(false);
    }
  };

  if (!isOpen) return null;

  // Minimized View
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-50 w-80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">
                {callStatus === 'connected' ? formatDuration(callDuration) : 'Calling...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-full"
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full View
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white relative">
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <div className="text-center">
            {/* Avatar */}
            <div className="mb-4 relative inline-block">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-full border-4 border-white/30"
                />
              ) : (
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              
              {/* Pulse animation for ringing */}
              {callStatus === 'ringing' && (
                <div className="absolute inset-0 rounded-full border-4 border-white animate-ping"></div>
              )}
            </div>

            <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
            
            {/* Call Status */}
            <p className="text-white/80">
              {callStatus === 'ringing' && (isIncoming ? 'Incoming call...' : 'Calling...')}
              {callStatus === 'connected' && formatDuration(callDuration)}
              {callStatus === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>

        {/* Video Container (if video is enabled) */}
        {isVideoOn && (
          <div className="relative bg-black h-64">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <video
              ref={localVideoRef}
              className="absolute bottom-4 right-4 w-24 h-32 object-cover rounded-lg border-2 border-white"
              autoPlay
              playsInline
              muted
            />
          </div>
        )}

        {/* Controls */}
        <div className="p-6 bg-gray-50">
          {callStatus === 'ringing' && isIncoming ? (
            // Incoming call controls
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRejectCall}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-110"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={handleAcceptCall}
                className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all transform hover:scale-110 animate-pulse"
              >
                <Phone className="w-6 h-6" />
              </button>
            </div>
          ) : (
            // Active call controls
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full transition-all ${
                  isMuted 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleSpeaker}
                className={`p-3 rounded-full transition-all ${
                  isSpeakerOn 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isSpeakerOn ? 'Speaker Off' : 'Speaker On'}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-all ${
                  isVideoOn 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-110"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Incoming Call Notification Component
export const IncomingCallNotification: React.FC<{
  caller: { name: string; avatar?: string };
  onAccept: () => void;
  onReject: () => void;
}> = ({ caller, onAccept, onReject }) => {
  useEffect(() => {
    // Play ringtone
    const audio = new Audio('/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(e => console.log('Could not play ringtone:', e));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-50 w-80 animate-slide-in">
      <div className="flex items-center space-x-3 mb-4">
        {caller.avatar ? (
          <img src={caller.avatar} alt={caller.name} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{caller.name}</p>
          <p className="text-sm text-gray-500">Incoming voice call...</p>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onReject}
          className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center animate-pulse"
        >
          <Phone className="w-4 h-4 mr-2" />
          Accept
        </button>
      </div>
    </div>
  );
};

export default VoiceCallModal;

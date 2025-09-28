import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  User,
  Shield,
  Lock
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface CallState {
  isConnecting: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  duration: number;
  isEncrypted: boolean;
}

const VoiceCall: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [callState, setCallState] = useState<CallState>({
    isConnecting: true,
    isConnected: false,
    isMuted: false,
    isSpeakerOn: false,
    duration: 0,
    isEncrypted: true
  });

  const [remoteUser, setRemoteUser] = useState<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC configuration with STUN/TURN servers
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN server for better connectivity
      {
        urls: 'turn:numb.viagenie.ca',
        username: 'webrtc@live.com',
        credential: 'muazkh'
      }
    ],
    iceCandidatePoolSize: 10
  };

  useEffect(() => {
    const contactId = location.state?.contactId;
    if (!contactId) {
      navigate('/contacts');
      return;
    }

    initializeCall(contactId);

    return () => {
      endCall();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // WebRTC signaling events
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);

    return () => {
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('ice_candidate');
      socket.off('offer');
      socket.off('answer');
    };
  }, [socket]);

  const initializeCall = async (contactId: string) => {
    try {
      // Get user media (audio only for voice call)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            candidate: event.candidate,
            to: contactId
          });
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socket) {
        socket.emit('call_request', {
          to: contactId,
          offer: offer,
          type: 'voice'
        });
      }

      // Simulate getting remote user info
      setRemoteUser({
        displayName: 'John Doe',
        username: 'johndoe',
        avatar: null
      });

    } catch (error) {
      console.error('Failed to initialize call:', error);
      navigate('/contacts');
    }
  };

  const handleCallAccepted = async (data: any) => {
    setCallState(prev => ({ ...prev, isConnecting: false, isConnected: true }));
    startCallTimer();
  };

  const handleCallRejected = () => {
    alert('Call was rejected');
    endCall();
    navigate('/contacts');
  };

  const handleCallEnded = () => {
    endCall();
    navigate('/contacts');
  };

  const handleIceCandidate = async (data: any) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleOffer = async (data: any) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      if (socket) {
        socket.emit('answer', {
          answer: answer,
          to: data.from
        });
      }
    }
  };

  const handleAnswer = async (data: any) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      }
    }
  };

  const toggleSpeaker = () => {
    setCallState(prev => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
    // In a real app, you would switch audio output device here
  };

  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Emit call end event
    if (socket) {
      socket.emit('end_call', {
        to: location.state?.contactId
      });
    }
  };

  const handleEndCall = () => {
    endCall();
    navigate('/contacts');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <audio ref={audioRef} autoPlay />
      
      <div className="w-full max-w-md">
        <Card className="bg-gray-800/50 backdrop-blur-lg border-gray-700">
          <div className="p-8">
            {/* Encryption Badge */}
            {callState.isEncrypted && (
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-2 bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm">
                  <Lock className="w-4 h-4" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>
            )}

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {remoteUser?.avatar ? (
                    <img 
                      src={remoteUser.avatar} 
                      alt={remoteUser.displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-white" />
                  )}
                </div>
                {callState.isConnected && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Call Info */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {remoteUser?.displayName || 'Unknown'}
              </h2>
              <p className="text-gray-400">
                {callState.isConnecting && 'Connecting...'}
                {callState.isConnected && formatDuration(callState.duration)}
                {!callState.isConnecting && !callState.isConnected && 'Call ended'}
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${
                  callState.isMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {callState.isMuted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all transform hover:scale-110"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={toggleSpeaker}
                className={`p-4 rounded-full transition-all ${
                  callState.isSpeakerOn 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {callState.isSpeakerOn ? (
                  <Volume2 className="w-6 h-6 text-white" />
                ) : (
                  <VolumeX className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            {/* Security Info */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Shield className="w-4 h-4 mr-2" />
                <span>Your call is protected with end-to-end encryption</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoiceCall;

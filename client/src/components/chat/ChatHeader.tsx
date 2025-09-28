import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Phone, Video, Users, Hash, MessageCircle, X, Search, Bell, BellOff, UserPlus, Edit2 } from 'lucide-react';
import { Conversation } from '../../stores/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import VoiceCallModal from './VoiceCallModal';

interface ChatHeaderProps {
  conversation: Conversation;
  isConnected: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation, isConnected }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getConversationTitle = () => {
    if (conversation.name) return conversation.name;
    
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p._id !== user?.id);
      return otherParticipant?.username || 'Unknown User';
    }
    
    return 'Unnamed Conversation';
  };

  const getConversationIcon = () => {
    switch (conversation.type) {
      case 'direct':
        return <MessageCircle className="w-5 h-5" />;
      case 'group':
        return <Users className="w-5 h-5" />;
      case 'channel':
        return <Hash className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getParticipantCount = () => {
    if (conversation.type === 'direct') {
      return 'Direct message';
    }
    return `${conversation.participants.length} members`;
  };

  const getConnectionStatus = () => {
    if (!isConnected) {
      return <span className="text-red-500 text-xs">Disconnected</span>;
    }
    return <span className="text-green-500 text-xs">Connected</span>;
  };

  return (
    <div className="border-b border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar/Icon */}
          <div className="flex-shrink-0">
            {conversation.type === 'direct' ? (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {getConversationTitle().charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
                {getConversationIcon()}
              </div>
            )}
          </div>

          {/* Title and Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {getConversationTitle()}
              </h2>
              {getConnectionStatus()}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {getParticipantCount()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Video/Audio call buttons */}
          <button 
            onClick={() => {
              if (conversation.type === 'direct') {
                const otherParticipant = conversation.participants.find(p => p._id !== user?.id);
                if (otherParticipant) {
                  setIsVideoCall(false);
                  setShowVoiceCall(true);
                }
              } else {
                alert('Group calls are coming soon!');
              }
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Start voice call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              if (conversation.type === 'direct') {
                const otherParticipant = conversation.participants.find(p => p._id !== user?.id);
                if (otherParticipant) {
                  setIsVideoCall(true);
                  setShowVoiceCall(true);
                }
              } else {
                alert('Group video calls are coming soon!');
              }
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Start video call"
          >
            <Video className="w-5 h-5" />
          </button>

          {/* More options */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button 
                  onClick={() => {
                    setShowSettings(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Conversation Settings
                </button>
                <button 
                  onClick={() => {
                    setShowProfile(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => {
                    setIsMuted(!isMuted);
                    setShowMenu(false);
                    // Store mute preference in localStorage
                    localStorage.setItem(`muted_${conversation._id}`, (!isMuted).toString());
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  {isMuted ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </button>
                <button 
                  onClick={() => {
                    setShowSearch(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Messages
                </button>
                {conversation.type !== 'direct' && (
                  <>
                    <hr className="my-1" />
                    <button 
                      onClick={() => {
                        console.log('Add Members clicked');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Add Members
                    </button>
                    <button 
                      onClick={() => {
                        console.log('Edit Group clicked');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit Group
                    </button>
                  </>
                )}
                <hr className="my-1" />
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to leave this conversation?')) {
                      console.log('Leaving conversation...');
                      // TODO: Implement leave conversation functionality
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Leave Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description (for groups/channels) */}
      {conversation.description && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">{conversation.description}</p>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">User Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {conversation.type === 'direct' && (
                <>
                  {(() => {
                    const otherParticipant = conversation.participants.find(p => p._id !== user?.id);
                    return otherParticipant ? (
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                          {otherParticipant.username.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-semibold mb-2">{otherParticipant.username}</h2>
                        <p className="text-gray-500 mb-4">{otherParticipant.email}</p>
                        <div className="space-y-2 text-left">
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Status</span>
                            <span className="text-gray-900">Online</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Member Since</span>
                            <span className="text-gray-900">2024</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
              {conversation.type !== 'direct' && (
                <div>
                  <h4 className="font-medium mb-3">Group Information</h4>
                  <p className="text-gray-600">This is a {conversation.type} with {conversation.participants.length} members.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Messages Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Search Messages</h3>
              <button
                onClick={() => setShowSearch(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {searchQuery ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Search functionality will be implemented soon!</p>
                  <p className="text-sm mt-2">You searched for: "{searchQuery}"</p>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Type to search through messages</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Conversation Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Conversation Name</h4>
                <input
                  type="text"
                  defaultValue={getConversationTitle()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={conversation.type === 'direct'}
                />
                {conversation.type === 'direct' && (
                  <p className="text-xs text-gray-500 mt-1">Cannot rename direct messages</p>
                )}
              </div>

              {conversation.type !== 'direct' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                  <textarea
                    defaultValue={conversation.description || ''}
                    placeholder="Add a description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Notifications</h4>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm text-gray-600">Enable notifications</span>
                </label>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Members ({conversation.participants.length})</h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {conversation.participants.map((participant) => (
                    <div key={participant._id} className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {participant.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">{participant.username}</span>
                      {participant._id === user?.id && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 p-4 border-t">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Saving settings...');
                  setShowSettings(false);
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {showVoiceCall && conversation.type === 'direct' && (() => {
        const otherParticipant = conversation.participants.find(p => p._id !== user?.id);
        return otherParticipant ? (
          <VoiceCallModal
            isOpen={showVoiceCall}
            onClose={() => setShowVoiceCall(false)}
            user={{
              id: otherParticipant._id,
              name: otherParticipant.username,
              avatar: otherParticipant.avatar
            }}
          />
        ) : null;
      })()}
    </div>
  );
};

export default ChatHeader;

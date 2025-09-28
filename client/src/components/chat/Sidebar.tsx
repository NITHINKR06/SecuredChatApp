import React, { useState } from 'react';
import { Search, Plus, MessageCircle, Users, Hash, Settings, UserPlus } from 'lucide-react';
import { Conversation } from '../../stores/chatStore';
import CreateConversationModal from './CreateConversationModal';
import AddUserModal from './AddUserModal';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onCreateConversation: (participants: string[], type: 'direct' | 'group' | 'channel', name?: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversation,
  onConversationSelect,
  onCreateConversation
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(query) ||
      conv.description?.toLowerCase().includes(query) ||
      conv.participants.some(p => p.username.toLowerCase().includes(query))
    );
  });

  const getConversationIcon = (conversation: Conversation) => {
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

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.name) return conversation.name;
    
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p._id !== currentUser?.id);
      return otherParticipant?.username || 'Unknown User';
    }
    
    return 'Unnamed Conversation';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    const { content, type, senderId } = conversation.lastMessage;
    
    if (type === 'image') return '📷 Image';
    if (type === 'file') return '📎 File';
    if (type === 'system') return content;
    
    // Handle both cases: senderId as object with username or as string ID
    let senderName = 'Unknown';
    if (senderId) {
      if (typeof senderId === 'object' && senderId.username) {
        senderName = senderId.username;
      } else if (typeof senderId === 'string') {
        // If senderId is just an ID string, try to find the user in participants
        const sender = conversation.participants.find(p => p._id === senderId);
        senderName = sender?.username || 'Unknown';
      }
    }
    
    return `${senderName}: ${content}`;
  };

  const getLastMessageTime = (conversation: Conversation) => {
    if (!conversation.lastMessage) return '';
    
    try {
      return formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-5 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Nexus Chat</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="p-2.5 text-gray-500 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-200 hover:shadow-md"
              title="Add user by username"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 text-gray-500 hover:text-white hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-200 hover:shadow-md"
              title="New group conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all duration-200"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                  currentConversation?._id === conversation._id
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 shadow-md'
                    : 'hover:bg-gray-50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar/Icon */}
                  <div className="flex-shrink-0">
                    {conversation.type === 'direct' ? (
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                        {getConversationTitle(conversation).charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-600 shadow-sm">
                        {getConversationIcon(conversation)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getConversationTitle(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {getLastMessageTime(conversation)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {getLastMessagePreview(conversation)}
                    </p>
                    
                    {/* Participants count for groups */}
                    {conversation.type !== 'direct' && (
                      <div className="flex items-center mt-1">
                        <Users className="w-3 h-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-400">
                          {conversation.participants.length} members
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-gray-200">
        <button 
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-gray-600 hover:text-white bg-gray-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-xl transition-all duration-200 hover:shadow-md"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </button>
      </div>

      {/* Create Conversation Modal */}
      {showCreateModal && (
        <CreateConversationModal
          onClose={() => setShowCreateModal(false)}
          onCreateConversation={onCreateConversation}
        />
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
      />
    </div>
  );
};

export default Sidebar;

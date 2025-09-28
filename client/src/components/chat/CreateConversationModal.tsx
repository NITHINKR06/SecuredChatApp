import React, { useState, useEffect } from 'react';
import { X, Users, MessageCircle, Hash, Search } from 'lucide-react';
// import { api } from '../../lib/api'; // TODO: Implement user search API
import { User } from '../../stores/chatStore';

interface CreateConversationModalProps {
  onClose: () => void;
  onCreateConversation: (participants: string[], type: 'direct' | 'group' | 'channel', name?: string) => void;
}

const CreateConversationModal: React.FC<CreateConversationModalProps> = ({
  onClose,
  onCreateConversation
}) => {
  const [step, setStep] = useState<'type' | 'participants' | 'details'>('type');
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'channel'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [conversationName, setConversationName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load users for selection
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // This would typically be an API call to get all users
        // For now, we'll use a placeholder
        setUsers([]);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    if (step === 'participants') {
      loadUsers();
    }
  }, [step]);

  const handleTypeSelect = (type: 'direct' | 'group' | 'channel') => {
    setConversationType(type);
    if (type === 'direct') {
      setStep('participants');
    } else {
      setStep('participants');
    }
  };

  const handleUserSelect = (user: User) => {
    if (conversationType === 'direct') {
      setSelectedUsers([user]);
      handleCreate();
    } else {
      const isSelected = selectedUsers.some(u => u._id === user._id);
      if (isSelected) {
        setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleNext = () => {
    if (conversationType === 'direct' && selectedUsers.length === 1) {
      handleCreate();
    } else if (conversationType !== 'direct' && selectedUsers.length > 0) {
      setStep('details');
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const participantIds = selectedUsers.map(u => u._id);
      const name = conversationType !== 'direct' ? conversationName : undefined;
      
      onCreateConversation(participantIds, conversationType, name);
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'type' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Choose conversation type</h3>
              
              <button
                onClick={() => handleTypeSelect('direct')}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Direct Message</h4>
                    <p className="text-sm text-gray-500">Start a private conversation</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('group')}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Group Chat</h4>
                    <p className="text-sm text-gray-500">Create a group conversation</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('channel')}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <Hash className="w-6 h-6 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Channel</h4>
                    <p className="text-sm text-gray-500">Create a public channel</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 'participants' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                {conversationType === 'direct' ? 'Select a user' : 'Select participants'}
              </h3>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* User List */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some(u => u._id === user._id);
                  return (
                    <button
                      key={user._id}
                      onClick={() => handleUserSelect(user)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{user.username}</h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {conversationType !== 'direct' && (
                <button
                  onClick={handleNext}
                  disabled={selectedUsers.length === 0}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next ({selectedUsers.length} selected)
                </button>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Conversation details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  placeholder="Enter conversation name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('participants')}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!conversationName.trim() || loading}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateConversationModal;

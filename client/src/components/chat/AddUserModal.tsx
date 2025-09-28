import React, { useState } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useChatStore } from '../../stores/chatStore';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const { user } = useAuth();
  const { conversations, setConversations, setCurrentConversation } = useChatStore();

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      // Search for user by username
      const response = await api.get(`/user/search?username=${username.toLowerCase()}`);
      
      if (response.data.success && response.data.data) {
        const searchResults = response.data.data;
        
        // The search endpoint returns an array, so we need to handle it properly
        if (Array.isArray(searchResults)) {
          // Find exact username match from the results
          const foundUser = searchResults.find((u: any) => 
            u.username.toLowerCase() === username.toLowerCase()
          );
          
          if (!foundUser) {
            setError('User not found');
            return;
          }
          
          // Check if it's the current user
          if (foundUser._id === user?.id) {
            setError("You can't start a conversation with yourself");
            return;
          }

          // Check if conversation already exists
          const existingConversation = conversations.find(conv => 
            conv.type === 'direct' && 
            conv.participants.some(p => p._id === foundUser._id)
          );

          if (existingConversation) {
            setCurrentConversation(existingConversation);
            onClose();
            return;
          }

          setSearchResult(foundUser);
        } else {
          // Handle single user response (backward compatibility)
          const foundUser = searchResults;
          
          // Check if it's the current user
          if (foundUser._id === user?.id) {
            setError("You can't start a conversation with yourself");
            return;
          }

          // Check if conversation already exists
          const existingConversation = conversations.find(conv => 
            conv.type === 'direct' && 
            conv.participants.some(p => p._id === foundUser._id)
          );

          if (existingConversation) {
            setCurrentConversation(existingConversation);
            onClose();
            return;
          }

          setSearchResult(foundUser);
        }
      } else {
        setError('User not found');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setError(error.response?.data?.message || 'Failed to search user');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!searchResult) return;

    // Validate that we have a valid user ID
    if (!searchResult._id) {
      setError('Invalid user data - missing user ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Creating conversation with user:', searchResult);
      
      // Create a new direct conversation
      const response = await api.post('/chat/conversations', {
        type: 'direct',
        participants: [searchResult._id]
      });

      if (response.data.success) {
        const newConversation = response.data.data;
        
        // Check if it's an existing conversation
        if (response.data.message === 'Direct conversation already exists') {
          // Still add it to the list if not already there
          const exists = conversations.find(c => c._id === newConversation._id);
          if (!exists) {
            setConversations([newConversation, ...conversations]);
          }
        } else {
          setConversations([newConversation, ...conversations]);
        }
        
        setCurrentConversation(newConversation);
        onClose();
      }
    } catch (error: any) {
      console.error('Create conversation error:', error);
      setError(error.response?.data?.message || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Add User by Username</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Username
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setUsername(value);
                }}
                onKeyPress={handleKeyPress}
                placeholder="username (lowercase, no spaces)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !username.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Username can only contain lowercase letters and numbers
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Search Result */}
          {searchResult && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {searchResult.displayName?.charAt(0).toUpperCase() || searchResult.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{searchResult.displayName}</p>
                    <p className="text-sm text-gray-500">@{searchResult.username}</p>
                  </div>
                </div>
                <button
                  onClick={handleStartConversation}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Start Chat</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;

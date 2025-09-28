import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Conversation, Message } from '../../stores/chatStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { useAuth } from '../../contexts/AuthContext';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  socket: Socket | null;
  isConnected: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  socket,
  isConnected
}) => {
  const { user } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'file' = 'text', fileInfo?: any) => {
    if (!socket || !conversation) return;
    
    // For text messages, check if content is not empty
    // For file/image messages, check if fileInfo exists
    if (type === 'text' && !content.trim()) return;
    if ((type === 'image' || type === 'file') && !fileInfo) return;

    socket.emit('send_message', {
      conversationId: conversation._id,
      content: content.trim() || '', // Allow empty content for file/image messages
      type,
      fileInfo
    });

    // Stop typing indicator
    if (isTyping) {
      socket.emit('stop_typing', { conversationId: conversation._id });
      setIsTyping(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!socket || !conversation) return;

    if (isTyping && !isTyping) {
      socket.emit('start_typing', { conversationId: conversation._id });
      setIsTyping(true);
    } else if (!isTyping && isTyping) {
      socket.emit('stop_typing', { conversationId: conversation._id });
      setIsTyping(false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: conversation._id });
        setIsTyping(false);
      }, 3000);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!socket) return;

    const message = messages.find(m => m._id === messageId);
    if (!message) return;

    const reaction = message.reactions.find(r => r.emoji === emoji);
    const hasReacted = reaction?.userIds.includes(user?.id || '');

    if (hasReacted) {
      socket.emit('remove_reaction', { messageId, emoji });
    } else {
      socket.emit('add_reaction', { messageId, emoji });
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (!socket) return;
    socket.emit('edit_message', { messageId, content });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket) return;
    socket.emit('delete_message', { messageId });
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Nexus Chat</h3>
          <p className="text-gray-600 text-lg">Select a conversation to start messaging</p>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-gray-50 min-h-0">
      {/* Header */}
      <ChatHeader conversation={conversation} isConnected={isConnected} />

      {/* Messages */}
      <div className="flex-1 overflow-hidden min-h-0">
        <MessageList
          messages={messages}
          currentUserId={user?.id}
          onReaction={handleReaction}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
};

export default ChatArea;

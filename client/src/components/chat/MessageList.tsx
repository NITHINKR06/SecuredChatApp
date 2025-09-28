import React, { useEffect, useRef } from 'react';
import { Message } from '../../stores/chatStore';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { useChatStore } from '../../stores/chatStore';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  onReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReaction,
  onEditMessage,
  onDeleteMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { typingUsers, currentConversation } = useChatStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const messageGroups = groupMessagesByDate(messages);
  const currentTypingUsers = currentConversation ? typingUsers[currentConversation._id] || [] : [];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
          <p className="text-gray-500">Start the conversation by sending a message</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 chat-scroll-container">
      <div className="space-y-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                {formatDateHeader(date)}
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-1">
              {dateMessages.map((message, index) => {
                const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                const nextMessage = index < dateMessages.length - 1 ? dateMessages[index + 1] : null;
                
                const showAvatar = !prevMessage || 
                  prevMessage.senderId._id !== message.senderId._id ||
                  new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000; // 5 minutes
                
                const showTimestamp = !nextMessage || 
                  nextMessage.senderId._id !== message.senderId._id ||
                  new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() > 5 * 60 * 1000; // 5 minutes

                return (
                  <MessageItem
                    key={message._id}
                    message={message}
                    isOwn={message.senderId._id === currentUserId}
                    showAvatar={showAvatar}
                    showTimestamp={showTimestamp}
                    onReaction={onReaction}
                    onEditMessage={onEditMessage}
                    onDeleteMessage={onDeleteMessage}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {currentTypingUsers.length > 0 && (
          <TypingIndicator users={currentTypingUsers} />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;

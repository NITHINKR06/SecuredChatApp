import React, { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import Sidebar from '../components/chat/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import { Conversation, Message } from '../stores/chatStore';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const {
    conversations,
    currentConversation,
    messages,
    setConversations,
    setCurrentConversation,
    setMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    addTypingUser,
    removeTypingUser,
    updateUserPresence,
    // clearCurrentConversation
  } = useChatStore();

  const [loading, setLoading] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await api.get('/chat/conversations');
        if (response.data.success) {
          setConversations(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadConversations();
    }
  }, [user, setConversations]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Message events
    socket.on('new_message', (data: { message: Message }) => {
      addMessage(data.message);
    });

    socket.on('message_edited', (data: { messageId: string; content: string; editedAt: string }) => {
      updateMessage(data.messageId, {
        content: data.content,
        isEdited: true,
        editedAt: data.editedAt
      });
    });

    socket.on('message_deleted', (data: { messageId: string }) => {
      deleteMessage(data.messageId);
    });

    // Typing events
    socket.on('user_is_typing', (data: { conversationId: string; userId: string; username: string }) => {
      if (data.userId !== user?.id) {
        addTypingUser(data.conversationId, {
          _id: data.userId,
          username: data.username,
          email: '',
          avatar: undefined
        });
      }
    });

    socket.on('user_stopped_typing', (data: { conversationId: string; userId: string }) => {
      removeTypingUser(data.conversationId, data.userId);
    });

    // Presence events
    socket.on('user_presence_update', (data: { userId: string; status: string; lastSeen: string }) => {
      updateUserPresence(data.userId, {
        userId: data.userId,
        status: data.status as 'online' | 'away' | 'offline',
        lastSeen: data.lastSeen
      });
    });

    // Reaction events
    socket.on('reaction_added', (data: { messageId: string; emoji: string; userId: string }) => {
      const message = messages.find(m => m._id === data.messageId);
      if (message) {
        const reaction = message.reactions.find(r => r.emoji === data.emoji);
        if (reaction) {
          if (!reaction.userIds.includes(data.userId)) {
            reaction.userIds.push(data.userId);
          }
        } else {
          message.reactions.push({
            emoji: data.emoji,
            userIds: [data.userId]
          });
        }
        updateMessage(data.messageId, { reactions: message.reactions });
      }
    });

    socket.on('reaction_removed', (data: { messageId: string; emoji: string; userId: string }) => {
      const message = messages.find(m => m._id === data.messageId);
      if (message) {
        const reaction = message.reactions.find(r => r.emoji === data.emoji);
        if (reaction) {
          reaction.userIds = reaction.userIds.filter(id => id !== data.userId);
          if (reaction.userIds.length === 0) {
            message.reactions = message.reactions.filter(r => r.emoji !== data.emoji);
          }
        }
        updateMessage(data.messageId, { reactions: message.reactions });
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('user_is_typing');
      socket.off('user_stopped_typing');
      socket.off('user_presence_update');
      socket.off('reaction_added');
      socket.off('reaction_removed');
    };
  }, [socket, isConnected, user, addMessage, updateMessage, deleteMessage, addTypingUser, removeTypingUser, updateUserPresence, messages]);

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversation) {
        setMessages([]);
        return;
      }

      try {
        const response = await api.get(`/chat/conversations/${currentConversation._id}/messages`);
        if (response.data.success) {
          setMessages(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentConversation, setMessages]);

  // Join conversation room when current conversation changes
  useEffect(() => {
    if (socket && isConnected && currentConversation) {
      socket.emit('join_conversation', { conversationId: currentConversation._id });
    }

    return () => {
      if (socket && currentConversation) {
        socket.emit('leave_conversation', { conversationId: currentConversation._id });
      }
    };
  }, [socket, isConnected, currentConversation]);

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const handleCreateConversation = async (participants: string[], type: 'direct' | 'group' | 'channel', name?: string) => {
    try {
      const response = await api.post('/chat/conversations', {
        type,
        participants,
        name
      });

      if (response.data.success) {
        setConversations([response.data.data, ...conversations]);
        setCurrentConversation(response.data.data);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onConversationSelect={handleConversationSelect}
        onCreateConversation={handleCreateConversation}
      />
      <ChatArea
        conversation={currentConversation}
        messages={messages}
        socket={socket}
        isConnected={isConnected}
      />
    </div>
  );
};

export default ChatPage;

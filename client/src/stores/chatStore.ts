import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface Conversation {
  _id: string;
  name?: string;
  type: 'direct' | 'group' | 'channel';
  participants: User[];
  admins?: User[];
  isPrivate: boolean;
  description?: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    senderId: User;
    timestamp: string;
    type: 'text' | 'image' | 'file' | 'system';
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileInfo?: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  };
  replyTo?: Message;
  reactions: {
    emoji: string;
    userIds: string[];
  }[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  readBy: {
    userId: string;
    readAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
}

interface ChatState {
  // Conversations
  conversations: Conversation[];
  currentConversation: Conversation | null;
  
  // Messages
  messages: Message[];
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  
  // UI State
  sidebarOpen: boolean;
  searchQuery: string;
  searchResults: {
    conversations: Conversation[];
    messages: Message[];
  };
  
  // Real-time state
  typingUsers: { [conversationId: string]: User[] };
  userPresence: { [userId: string]: UserPresence };
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  setMessagesLoading: (loading: boolean) => void;
  setHasMoreMessages: (hasMore: boolean) => void;
  
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: { conversations: Conversation[]; messages: Message[] }) => void;
  
  addTypingUser: (conversationId: string, user: User) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  updateUserPresence: (userId: string, presence: UserPresence) => void;
  
  // Utility actions
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversation: (conversationId: string) => Message[];
  clearCurrentConversation: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      conversations: [],
      currentConversation: null,
      messages: [],
      messagesLoading: false,
      hasMoreMessages: true,
      sidebarOpen: true,
      searchQuery: '',
      searchResults: { conversations: [], messages: [] },
      typingUsers: {},
      userPresence: {},
      
      // Conversation actions
      setConversations: (conversations) => set({ conversations }),
      
      addConversation: (conversation) => set((state) => ({
        conversations: [conversation, ...state.conversations]
      })),
      
      updateConversation: (conversationId, updates) => set((state) => ({
        conversations: state.conversations.map(conv =>
          conv._id === conversationId ? { ...conv, ...updates } : conv
        ),
        currentConversation: state.currentConversation?._id === conversationId
          ? { ...state.currentConversation, ...updates }
          : state.currentConversation
      })),
      
      setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
      
      // Message actions
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => set((state) => {
        // Don't add duplicate messages
        if (state.messages.some(m => m._id === message._id)) {
          return state;
        }
        
        return {
          messages: [...state.messages, message]
        };
      }),
      
      updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map(msg =>
          msg._id === messageId ? { ...msg, ...updates } : msg
        )
      })),
      
      deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.map(msg =>
          msg._id === messageId ? { ...msg, isDeleted: true, deletedAt: new Date().toISOString() } : msg
        )
      })),
      
      setMessagesLoading: (loading) => set({ messagesLoading: loading }),
      setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
      
      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      
      // Real-time actions
      addTypingUser: (conversationId, user) => set((state) => {
        const currentTyping = state.typingUsers[conversationId] || [];
        const isAlreadyTyping = currentTyping.some(u => u._id === user._id);
        
        if (isAlreadyTyping) return state;
        
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...currentTyping, user]
          }
        };
      }),
      
      removeTypingUser: (conversationId, userId) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: (state.typingUsers[conversationId] || []).filter(u => u._id !== userId)
        }
      })),
      
      updateUserPresence: (userId, presence) => set((state) => ({
        userPresence: {
          ...state.userPresence,
          [userId]: presence
        }
      })),
      
      // Utility actions
      getConversationById: (id) => {
        const state = get();
        return state.conversations.find(conv => conv._id === id);
      },
      
      getMessagesByConversation: (conversationId) => {
        const state = get();
        return state.messages.filter(msg => msg.conversationId === conversationId);
      },
      
      clearCurrentConversation: () => set({
        currentConversation: null,
        messages: [],
        typingUsers: {}
      })
    }),
    {
      name: 'chat-store'
    }
  )
);

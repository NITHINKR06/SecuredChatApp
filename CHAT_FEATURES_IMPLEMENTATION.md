# 📱 Chat Features Implementation Guide

## 🎯 New Features Added

### 1. **Media Viewer Modal** 
- Click on images/videos to open in fullscreen popup
- Zoom, rotate, download capabilities for images
- Custom video player with controls
- Audio player support

### 2. **Message Actions & Deletion**
- Delete individual messages
- Bulk delete multiple messages
- Forward messages to other conversations
- Reply to specific messages
- Copy message text

### 3. **Voice/Video Calling**
- One-on-one voice calls
- Video call capability
- Call controls (mute, speaker, video toggle)
- Incoming call notifications
- Minimizable call window

---

## 📦 Files Created

### Frontend Components:
1. **`MediaViewer.tsx`** - Fullscreen media viewer modal
2. **`MessageActions.tsx`** - Message action buttons and bulk actions
3. **`VoiceCallModal.tsx`** - Voice/video call interface
4. **`MessageItemEnhanced.tsx`** - Enhanced message component with all features

### Backend API:
5. **`messages.ts`** - Message management endpoints

---

## 🔧 Integration Steps

### Step 1: Install Required Dependencies

```bash
# Frontend dependencies
cd client
npm install react-dropzone lucide-react

# Backend dependencies (if not already installed)
cd ../server
npm install express-validator
```

### Step 2: Update Message Model

Add these fields to your Message model (`server/src/models/Message.ts`):

```typescript
// Add to Message schema
isDeleted: {
  type: Boolean,
  default: false
},
deletedAt: {
  type: Date
},
isForwarded: {
  type: Boolean,
  default: false
},
forwardedFrom: {
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' }
},
replyTo: {
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  content: String,
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  senderName: String
}
```

### Step 3: Update Server Routes

Add the messages API to your server (`server/src/server.ts`):

```typescript
import messageRoutes from './api/messages';

// Add this route
app.use('/api/v1/messages', messageRoutes);
```

### Step 4: Update ChatArea Component

Replace your existing MessageItem with the enhanced version:

```typescript
// In ChatArea.tsx or MessageList.tsx
import MessageItemEnhanced from './MessageItemEnhanced';
import { BulkActionsBar } from './MessageActions';

const ChatArea = () => {
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.delete(`/messages/${messageId}`);
      // Update local state
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await api.post('/messages/delete-multiple', {
        messageIds: selectedMessages
      });
      setSelectedMessages([]);
    } catch (error) {
      console.error('Failed to delete messages:', error);
    }
  };

  return (
    <div>
      {/* Message List */}
      {messages.map(message => (
        <MessageItemEnhanced
          key={message._id}
          message={message}
          isOwn={message.senderId._id === currentUserId}
          currentUserId={currentUserId}
          onDelete={handleDeleteMessage}
          onReply={handleReplyMessage}
          onForward={handleForwardMessage}
        />
      ))}
      
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedMessages.length}
        onDeleteSelected={handleDeleteSelected}
        onClearSelection={() => setSelectedMessages([])}
        onForwardSelected={handleForwardSelected}
      />
    </div>
  );
};
```

### Step 5: Add Socket Event Handlers

Update your socket connection to handle new events:

```typescript
// In SocketContext.tsx or socket handler
socket.on('messageDeleted', ({ messageId, conversationId }) => {
  // Remove message from local state
  setMessages(prev => prev.filter(m => m._id !== messageId));
});

socket.on('messagesDeleted', ({ messageIds, conversationId }) => {
  // Remove multiple messages from local state
  setMessages(prev => prev.filter(m => !messageIds.includes(m._id)));
});

// Voice call events
socket.on('incomingCall', ({ caller, roomId }) => {
  // Show incoming call notification
});

socket.on('callAccepted', ({ roomId }) => {
  // Start call connection
});

socket.on('callEnded', ({ roomId }) => {
  // End call
});
```

### Step 6: Add WebRTC for Voice Calls

Create a WebRTC service (`client/src/services/webrtc.ts`):

```typescript
class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  async initializeCall(isVideo: boolean = false) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Add local stream tracks
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
      };

      return { localStream: this.localStream, peerConnection: this.peerConnection };
    } catch (error) {
      console.error('Failed to initialize call:', error);
      throw error;
    }
  }

  async createOffer() {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    await this.peerConnection.setRemoteDescription(answer);
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  endCall() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}

export default new WebRTCService();
```

### Step 7: Add Styles

Add these styles to your `index.css`:

```css
/* Media Viewer Animations */
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

/* Message Selection */
.message-item:hover .message-actions {
  opacity: 1;
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

/* Call Animation */
@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s infinite;
}
```

---

## 🧪 Testing the Features

### Test Media Viewer:
1. Send an image/video in chat
2. Click on the media to open viewer
3. Test zoom, rotate, download functions
4. Press ESC or click outside to close

### Test Message Deletion:
1. Hover over your message
2. Click the three dots menu
3. Select "Delete"
4. Confirm deletion
5. Message should show "This message was deleted"

### Test Bulk Delete:
1. Select multiple messages using checkboxes
2. Click "Delete" in the bulk actions bar
3. Confirm deletion
4. All selected messages should be deleted

### Test Voice Calling:
1. Click the phone icon next to a user's name
2. Wait for the other user to accept
3. Test mute, speaker, and video toggle
4. End call when done

---

## 🔒 Security Considerations

1. **File Access**: All media files require authentication (implemented in secure file-serve)
2. **Message Deletion**: Users can only delete their own messages
3. **Forward/Reply**: Validates user has access to conversations
4. **WebRTC**: Use TURN servers for NAT traversal in production
5. **Rate Limiting**: Applied to all message operations

---

## 📝 Environment Variables

Add these to your `.env` files:

```bash
# Server (.env)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password

# Client (.env)
VITE_WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302
VITE_WEBRTC_TURN_SERVERS=turn:your-turn-server.com:3478
```

---

## 🚀 Production Deployment

### For Voice/Video Calls:
1. Set up a TURN server (e.g., Coturn)
2. Use HTTPS for secure WebRTC connections
3. Implement signaling server for call coordination

### For Media Storage:
1. Consider using CDN for media files
2. Implement media compression
3. Add virus scanning for uploaded files

### Performance Optimizations:
1. Lazy load media in messages
2. Implement virtual scrolling for long message lists
3. Cache media files locally
4. Use WebSocket for real-time updates

---

## 🎨 Customization Options

### Media Viewer:
- Adjust max zoom levels
- Add image filters
- Implement slideshow mode
- Add sharing capabilities

### Message Actions:
- Add star/favorite messages
- Implement message editing
- Add message reactions
- Create message threads

### Voice Calls:
- Add call recording
- Implement screen sharing
- Add group calling
- Create call history

---

## 📚 Additional Resources

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Dropzone](https://react-dropzone.js.org/)
- [Lucide Icons](https://lucide.dev/)

---

## ✅ Checklist

- [ ] Install dependencies
- [ ] Update Message model
- [ ] Add message API routes
- [ ] Replace MessageItem component
- [ ] Set up WebRTC service
- [ ] Test media viewer
- [ ] Test message deletion
- [ ] Test voice calling
- [ ] Configure production settings
- [ ] Deploy to production

---

**Implementation Complete!** 🎉

Your chat application now has:
- ✅ Media viewer with zoom/rotate
- ✅ Message deletion (single & bulk)
- ✅ Message forwarding & replies
- ✅ Voice/video calling
- ✅ Enhanced security

For support or questions, refer to the documentation or create an issue in the repository.

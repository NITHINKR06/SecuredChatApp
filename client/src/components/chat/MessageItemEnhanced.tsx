import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Download, 
  File, 
  Image, 
  Play, 
  Trash2,
  MoreVertical,
  Copy,
  Reply,
  Forward,
  Phone
} from 'lucide-react';
import MediaViewer from './MediaViewer';
import MessageActions from './MessageActions';
import VoiceCallModal from './VoiceCallModal';

interface MessageItemEnhancedProps {
  message: {
    _id: string;
    content: string;
    senderId: {
      _id: string;
      username: string;
      displayName: string;
      avatar?: string;
    };
    type: 'text' | 'image' | 'file' | 'video' | 'audio';
    fileInfo?: {
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
    };
    createdAt: string;
    readBy: Array<{ userId: string; readAt: string }>;
    isDeleted?: boolean;
  };
  isOwn: boolean;
  currentUserId: string;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
}

const MessageItemEnhanced: React.FC<MessageItemEnhancedProps> = ({
  message,
  isOwn,
  currentUserId,
  onDelete,
  onReply,
  onForward
}) => {
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  // Check if message has been deleted
  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className="max-w-xs px-4 py-2 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500 italic">This message was deleted</p>
        </div>
      </div>
    );
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleMediaClick = () => {
    if (message.type !== 'text' && message.fileInfo) {
      setShowMediaViewer(true);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg z-50';
    toast.textContent = 'Copied to clipboard';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2000);
  };

  const handleDelete = (messageId: string) => {
    if (onDelete) {
      onDelete(messageId);
    }
  };

  const handleStartCall = () => {
    setShowVoiceCall(true);
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
        );

      case 'image':
        return (
          <div 
            className="cursor-pointer group relative"
            onClick={handleMediaClick}
          >
            <img
              src={message.fileInfo?.url}
              alt={message.fileInfo?.originalName}
              className="rounded-lg max-w-full h-auto max-h-64 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Image className="w-8 h-8 text-white" />
              </div>
            </div>
            {message.content && (
              <p className="mt-2 text-sm break-words">{message.content}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div 
            className="cursor-pointer group relative"
            onClick={handleMediaClick}
          >
            <div className="relative rounded-lg overflow-hidden bg-gray-900 max-w-full max-h-64">
              <video
                src={message.fileInfo?.url}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="p-3 bg-white bg-opacity-90 rounded-full group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </div>
            {message.content && (
              <p className="mt-2 text-sm break-words">{message.content}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={handleMediaClick}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
            >
              <Play className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {message.fileInfo?.originalName || 'Audio message'}
              </p>
              <p className="text-xs text-gray-500">
                {message.fileInfo?.size ? formatFileSize(message.fileInfo.size) : 'Audio'}
              </p>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg">
              <File className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.fileInfo?.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {message.fileInfo?.size ? formatFileSize(message.fileInfo.size) : ''}
              </p>
            </div>
            <a
              href={message.fileInfo?.url}
              download={message.fileInfo?.originalName}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4 text-gray-600" />
            </a>
          </div>
        );

      default:
        return <p className="text-sm">{message.content}</p>;
    }
  };

  return (
    <>
      <div 
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Selection Checkbox */}
        {showActions && (
          <div className="flex items-center mr-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => setIsSelected(!isSelected)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
        )}

        {/* Avatar for other users */}
        {!isOwn && (
          <div className="mr-2 flex-shrink-0">
            {message.senderId.avatar ? (
              <img
                src={message.senderId.avatar}
                alt={message.senderId.displayName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {message.senderId.displayName[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}

        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
          {/* Sender name for group chats */}
          {!isOwn && (
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-xs font-medium text-gray-600">
                {message.senderId.displayName}
              </p>
              <button
                onClick={handleStartCall}
                className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Start voice call"
              >
                <Phone className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          )}

          <div
            className={`relative px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-900'
            } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
          >
            {renderMessageContent()}

            {/* Message Actions */}
            {showActions && (
              <div className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-0`}>
                <MessageActions
                  messageId={message._id}
                  message={message.content || ''}
                  isOwn={isOwn}
                  isSelected={isSelected}
                  onDelete={handleDelete}
                  onSelect={() => setIsSelected(!isSelected)}
                  onReply={() => onReply && onReply(message._id)}
                  onForward={() => onForward && onForward(message._id)}
                  onCopy={handleCopy}
                />
              </div>
            )}

            {/* Time and Read Status */}
            <div className={`flex items-center justify-end mt-1 space-x-1 ${
              isOwn ? 'text-blue-100' : 'text-gray-500'
            }`}>
              <span className="text-xs">{formatTime(message.createdAt)}</span>
              {isOwn && (
                <span>
                  {message.readBy.length > 0 ? (
                    <CheckCheck className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {showMediaViewer && message.fileInfo && (
        <MediaViewer
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          mediaUrl={message.fileInfo.url}
          mediaType={message.type as 'image' | 'video' | 'audio'}
          fileName={message.fileInfo.originalName}
        />
      )}

      {/* Voice Call Modal */}
      {showVoiceCall && (
        <VoiceCallModal
          isOpen={showVoiceCall}
          onClose={() => setShowVoiceCall(false)}
          user={{
            id: message.senderId._id,
            name: message.senderId.displayName,
            avatar: message.senderId.avatar
          }}
        />
      )}
    </>
  );
};

export default MessageItemEnhanced;

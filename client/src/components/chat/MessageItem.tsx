import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, Reply, Smile, Play, Image as ImageIcon, Phone } from 'lucide-react';
import { Message } from '../../stores/chatStore';
import { format } from 'date-fns';
import MessageReactions from './MessageReactions';
import MediaViewer from './MediaViewer';
import VoiceCallModal from './VoiceCallModal';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  onReaction,
  onEditMessage,
  onDeleteMessage
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEditMessage(message._id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(message._id);
    }
    setShowMenu(false);
  };

  const handleReaction = (emoji: string) => {
    onReaction(message._id, emoji);
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const getFileIcon = (mimeType: string, filename: string = '') => {
    // Check by MIME type first
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
    if (mimeType.includes('text')) return '📃';
    
    // Check by file extension as fallback
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext) {
      // Audio formats
      if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'].includes(ext)) return '🎵';
      // Video formats
      if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return '🎥';
      // Image formats
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) return '🖼️';
      // Document formats
      if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return '📝';
      if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return '📊';
      if (['ppt', 'pptx', 'odp'].includes(ext)) return '📽️';
      if (['pdf'].includes(ext)) return '📄';
      // Archive formats
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return '📦';
      // Code/text formats
      if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'ini', 'conf'].includes(ext)) return '📃';
      if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'].includes(ext)) return '💻';
      // Executable formats
      if (['exe', 'msi', 'app', 'deb', 'rpm', 'dmg', 'pkg', 'apk'].includes(ext)) return '⚙️';
    }
    
    return '📎'; // Default file icon
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="bg-gray-100 text-gray-500 text-sm px-3 py-2 rounded-lg max-w-xs">
          <em>This message was deleted</em>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group transition-all duration-200 hover:scale-[1.01]`}>
      <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {showAvatar && !isOwn && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white">
              {message.senderId.username.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender Name */}
          {showAvatar && !isOwn && (
            <div className="text-xs font-medium text-gray-600 mb-1 px-2">
              {message.senderId.username}
            </div>
          )}

          {/* Message Bubble */}
          <div className="relative">
            <div
              className={`px-4 py-2.5 ${
                isOwn
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md'
                  : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
              } ${message.type !== 'text' ? 'p-3' : ''} transition-all duration-200 hover:shadow-lg`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {message.type === 'text' ? (
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                      {message.isEdited && (
                        <span className="text-xs opacity-75 ml-1">(edited)</span>
                      )}
                    </div>
                  ) : message.type === 'image' ? (
                    <div className="space-y-2">
                      <div 
                        className="cursor-pointer group relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMediaViewer(true);
                        }}
                      >
                        <img
                          src={message.fileInfo?.url}
                          alt={message.fileInfo?.originalName}
                          className="max-w-full h-auto rounded transition-transform duration-200 hover:scale-105"
                          style={{ maxHeight: '300px' }}
                          loading="lazy"
                          onLoad={() => console.log('Message image loaded successfully')}
                          onError={(e) => {
                            console.error('Failed to load message image:', e);
                            // Show a placeholder or error state
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>
                      {message.content && (
                        <div className="text-sm">{message.content}</div>
                      )}
                    </div>
                  ) : message.type === 'file' ? (
                    <div className="space-y-2">
                      {/* Special handling for audio files */}
                      {message.fileInfo?.mimeType?.startsWith('audio/') ? (
                        <div className="space-y-2">
                          <div 
                            className="cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMediaViewer(true);
                            }}
                          >
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <button
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {message.fileInfo?.originalName || 'Audio message'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {((message.fileInfo?.size || 0) / 1024 / 1024).toFixed(1)} MB • Click to open in viewer
                                </div>
                              </div>
                            </div>
                          </div>
                          <audio 
                            controls 
                            className="w-full max-w-sm"
                            preload="metadata"
                          >
                            <source src={message.fileInfo?.url} type={message.fileInfo?.mimeType} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : message.fileInfo?.mimeType?.startsWith('video/') ? (
                        // Special handling for video files
                        <div className="space-y-2">
                          <div 
                            className="cursor-pointer group relative"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMediaViewer(true);
                            }}
                          >
                            <div className="relative rounded overflow-hidden bg-gray-900 max-w-sm">
                              <video 
                                className="w-full h-auto"
                                preload="metadata"
                              >
                                <source src={message.fileInfo?.url} type={message.fileInfo?.mimeType} />
                                Your browser does not support the video element.
                              </video>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="p-3 bg-white bg-opacity-90 rounded-full group-hover:scale-110 transition-transform">
                                  <Play className="w-6 h-6 text-gray-900" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs opacity-75">
                            {message.fileInfo?.originalName} • {((message.fileInfo?.size || 0) / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                      ) : (
                        // Default file display with download link
                        <a
                          href={message.fileInfo?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 p-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
                        >
                          <span className="text-2xl">{getFileIcon(message.fileInfo?.mimeType || '', message.fileInfo?.originalName || '')}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {message.fileInfo?.originalName}
                            </div>
                            <div className="text-xs opacity-75">
                              {((message.fileInfo?.size || 0) / 1024 / 1024).toFixed(1)} MB • Click to download
                            </div>
                          </div>
                        </a>
                      )}
                      {message.content && (
                        <div className="text-sm mt-2">{message.content}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm">{message.content}</div>
                  )}
                </>
              )}
            </div>

            {/* Message Actions Menu */}
            {!isEditing && (
              <div className={`absolute top-0 ${isOwn ? 'left-0 transform -translate-x-full' : 'right-0 transform translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>

                  {showMenu && (
                    <div className="absolute top-0 right-full mr-1 bg-white border border-gray-200 rounded shadow-lg py-1 z-10">
                      {!isOwn && (
                        <button
                          onClick={() => {
                            setShowVoiceCall(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Voice Call</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleReaction('👍')}
                        className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Smile className="w-4 h-4" />
                        <span>React</span>
                      </button>
                      <button
                        onClick={() => {/* TODO: Implement reply */}}
                        className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Reply className="w-4 h-4" />
                        <span>Reply</span>
                      </button>
                      {isOwn && (
                        <>
                          <button
                            onClick={handleEdit}
                            className="w-full px-3 py-1 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={handleDelete}
                            className="w-full px-3 py-1 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="mt-1">
              <MessageReactions
                reactions={message.reactions}
                onReaction={handleReaction}
              />
            </div>
          )}

          {/* Timestamp */}
          {showTimestamp && (
            <div className={`text-xs text-gray-500 mt-1 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              {formatTime(message.createdAt)}
            </div>
          )}
        </div>

        {/* Spacer for own messages */}
        {isOwn && <div className="w-8" />}
      </div>

      {/* Media Viewer Modal */}
      {showMediaViewer && message.fileInfo && (
        <MediaViewer
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          mediaUrl={message.fileInfo.url}
          mediaType={message.type === 'image' ? 'image' : message.fileInfo.mimeType?.startsWith('video/') ? 'video' : 'audio'}
          fileName={message.fileInfo.originalName}
        />
      )}

      {/* Voice Call Modal */}
      {showVoiceCall && !isOwn && (
        <VoiceCallModal
          isOpen={showVoiceCall}
          onClose={() => setShowVoiceCall(false)}
          user={{
            id: message.senderId._id,
            name: message.senderId.username,
            avatar: message.senderId.avatar
          }}
        />
      )}
    </div>
  );
};

export default MessageItem;

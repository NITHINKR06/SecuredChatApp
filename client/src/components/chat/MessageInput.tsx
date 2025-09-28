import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api } from '../../lib/api';

interface MessageInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'file', fileInfo?: any) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message, 'text');
      setMessage('');
      onTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    if (value.trim()) {
      onTyping(true);
    } else {
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0 || disabled) return;

    const file = files[0];
    setIsUploading(true);

    try {
      // Check if we should use S3 or local storage
      const signResponse = await api.post('/upload/sign-url', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      // Check if we're using local storage
      if (signResponse.data.useLocalStorage) {
        // Use direct upload (local storage)
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/upload/direct', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          onSendMessage('', messageType, response.data.data.fileInfo);
        } else {
          throw new Error('Direct upload failed');
        }
      } else if (signResponse.data.success && signResponse.data.data) {
        // Use S3 upload
        const { uploadUrl, fileKey, publicUrl } = signResponse.data.data;

        // Upload file to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResponse.ok) {
          const fileInfo = {
            filename: fileKey,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url: publicUrl
          };

          const messageType = file.type.startsWith('image/') ? 'image' : 'file';
          onSendMessage('', messageType, fileInfo);
        } else {
          throw new Error('S3 upload failed');
        }
      } else {
        throw new Error('Invalid upload configuration');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(handleFileUpload, [disabled, onSendMessage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Accept ALL file types - no restrictions
    // This enables WhatsApp-like functionality
    accept: undefined, // Accept all file types
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const getFileIcon = () => {
    if (isUploading) {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
    }
    return <Paperclip className="w-5 h-5" />;
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-3 bg-white rounded-2xl shadow-lg p-2">
      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`p-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-purple-400 bg-purple-50 scale-105'
            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-gray-500 hover:text-purple-600 transition-colors">
          {getFileIcon()}
        </div>
      </div>

      {/* Message Input */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-400"
          rows={1}
          style={{
            minHeight: '48px',
            maxHeight: '120px',
            height: 'auto',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        
        {/* Emoji Button */}
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-all duration-200 hover:scale-110"
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </button>
      </div>

      {/* Send Button */}
      <button
        type="submit"
        disabled={!message.trim() || disabled || isUploading}
        className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};

export default MessageInput;

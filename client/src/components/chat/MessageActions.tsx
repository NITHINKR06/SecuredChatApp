import React, { useState } from 'react';
import { Trash2, Copy, Reply, Forward, Star, MoreVertical, Check, X } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  message: string;
  isOwn: boolean;
  isSelected: boolean;
  onDelete: (messageId: string) => void;
  onSelect: (messageId: string) => void;
  onReply: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onCopy: (text: string) => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  message,
  isOwn,
  isSelected,
  onDelete,
  onSelect,
  onReply,
  onForward,
  onCopy
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(messageId);
    setShowDeleteConfirm(false);
    setShowActions(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleCopy = () => {
    onCopy(message);
    navigator.clipboard.writeText(message);
    setShowActions(false);
  };

  const handleReply = () => {
    onReply(messageId);
    setShowActions(false);
  };

  const handleForward = () => {
    onForward(messageId);
    setShowActions(false);
  };

  const handleSelect = () => {
    onSelect(messageId);
  };

  return (
    <div className="relative inline-block">
      {/* Selection Checkbox */}
      <div className="absolute -left-8 top-1/2 -translate-y-1/2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      {/* More Actions Button */}
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {/* Actions Dropdown */}
      {showActions && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={handleReply}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Reply className="w-4 h-4 mr-2" />
              Reply
            </button>

            <button
              onClick={handleForward}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Forward className="w-4 h-4 mr-2" />
              Forward
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </button>

            {isOwn && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
          <p className="text-sm text-gray-700 mb-4">
            Are you sure you want to delete this message?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={cancelDelete}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Bulk Actions Bar Component
interface BulkActionsBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onForwardSelected: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onDeleteSelected,
  onClearSelection,
  onForwardSelected
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClearSelection}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onForwardSelected}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete {selectedCount} messages?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone. These messages will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSelected();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageActions;

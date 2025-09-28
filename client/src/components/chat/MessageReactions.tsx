import React from 'react';
import { Smile } from 'lucide-react';

interface Reaction {
  emoji: string;
  userIds: string[];
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onReaction: (emoji: string) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ reactions, onReaction }) => {
  // const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡']; // TODO: Implement emoji picker

  return (
    <div className="flex items-center space-x-1">
      {reactions.map((reaction, index) => (
        <button
          key={index}
          onClick={() => onReaction(reaction.emoji)}
          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm transition-colors"
        >
          <span>{reaction.emoji}</span>
          <span className="text-gray-600">{reaction.userIds.length}</span>
        </button>
      ))}
      
      <button
        onClick={() => onReaction('👍')} // Default reaction
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="Add reaction"
      >
        <Smile className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MessageReactions;

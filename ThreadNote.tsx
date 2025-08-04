import React, { useState } from 'react';
import { Reply, MoreHorizontal, X, Bot, Edit } from 'lucide-react';
import { Note } from '../types/Note';
import './ThreadNote.css';

interface ThreadNoteProps {
  note: Note;
  replyToNote?: Note | null;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onReply: (noteId: string) => void;
  onRemove: () => void;
}

const ThreadNote: React.FC<ThreadNoteProps> = ({
  note,
  replyToNote,
  isFirst,
  isLast,
  onUpdate,
  onReply,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showActions, setShowActions] = useState(false);

  const handleSaveEdit = () => {
    onUpdate(note.id, { content: editContent });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setEditContent(note.content);
      setIsEditing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeEmoji = (type: Note['type']) => {
    switch (type) {
      case 'todo': return '☑️';
      case 'folder': return '📁';
      case 'webview': return '🌐';
      case 'voice': return '🎤';
      case 'sketch': return '✏️';
      case 'scan': return '📄';
      case 'media': return '🖼️';
      default: return '💭';
    }
  };

  return (
    <div 
      className={`thread-note ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''} ${note.replyToId ? 'reply' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {replyToNote && (
        <div className="reply-reference">
          <Reply size={12} />
          <span>Replying to: {replyToNote.content.substring(0, 40)}...</span>
        </div>
      )}

      <div className="note-header">
        <div className="note-meta">
          <span className="note-type">{getTypeEmoji(note.type)}</span>
          <span className="note-timestamp">{formatTimestamp(note.createdAt)}</span>
          {note.aiGenerated && (
            <span className="ai-badge">
              <Bot size={10} />
              AI
            </span>
          )}
        </div>

        <div className={`note-actions ${showActions ? 'visible' : ''}`}>
          <button
            className="note-action"
            onClick={() => setIsEditing(!isEditing)}
            title="Edit message"
          >
            <Edit size={12} />
          </button>
          
          <button
            className="note-action"
            onClick={() => onReply(note.id)}
            title="Reply to this message"
          >
            <Reply size={12} />
          </button>

          <div className="note-menu">
            <button className="note-action">
              <MoreHorizontal size={12} />
            </button>
            <div className="note-menu-dropdown">
              <button onClick={onRemove}>
                <X size={10} />
                Remove from thread
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="note-content">
        {isEditing ? (
          <div className="edit-container">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="edit-textarea"
              autoFocus
            />
            <div className="edit-actions">
              <button
                className="save-btn"
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setEditContent(note.content);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="note-text">
            {note.content}
          </div>
        )}
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="note-tags">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
          {note.tags.length > 3 && (
            <span className="tag-more">+{note.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadNote;
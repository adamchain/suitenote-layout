import React, { useState } from 'react';
import { Plus, MessageSquare, Pin } from 'lucide-react';
import { Thread } from '../../types/Thread';
import './ThreadsList.css';

interface ThreadsListProps {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onCreateThread: (title: string, description?: string, noteIds?: string[]) => Thread;
  onUpdateThread?: (id: string, updates: Partial<Thread>) => void;
}

const ThreadsList: React.FC<ThreadsListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onCreateThread,
  onUpdateThread
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');

  const activeThreads = threads.filter(thread => !thread.isArchived);
  const pinnedThreads = activeThreads.filter(thread => thread.isPinned);
  const regularThreads = activeThreads.filter(thread => !thread.isPinned);

  const handleCreateThread = () => {
    if (!newThreadTitle.trim()) return;
    
    const newThread = onCreateThread(newThreadTitle.trim());
    setNewThreadTitle('');
    setShowCreateForm(false);
    
    // Auto-select the new thread
    onSelectThread(newThread.id);
  };

  const handleTogglePin = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (onUpdateThread) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        onUpdateThread(threadId, { isPinned: !thread.isPinned });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateThread();
    }
    if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewThreadTitle('');
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const renderThreadGroup = (threads: Thread[], title?: string) => {
    if (threads.length === 0) return null;

    return (
      <div className="thread-group">
        {title && (
          <div className="group-header">
            <span>{title}</span>
          </div>
        )}
        {threads.map(thread => (
          <div
            key={thread.id}
            className={`thread-item ${selectedThreadId === thread.id ? 'selected' : ''}`}
            onClick={() => onSelectThread(thread.id)}
          >
            <div className="thread-icon">
              <MessageSquare size={14} />
              {thread.isPinned && <Pin size={10} className="pin-indicator" />}
            </div>
            <div className="thread-info">
              <div className="thread-title">
                {thread.title}
              </div>
              <div className="thread-meta">
                <span className="thread-count">
                  {thread.noteIds.length} messages
                </span>
                <span className="thread-activity">
                  {formatLastActivity(thread.metadata?.lastActivity || thread.updatedAt)}
                </span>
              </div>
            </div>
            <div className="thread-actions">
              <button
                className="thread-action"
                onClick={(e) => handleTogglePin(e, thread.id)}
                title={thread.isPinned ? 'Unpin thread' : 'Pin thread'}
              >
                <Pin size={12} className={thread.isPinned ? 'pinned' : ''} />
              </button>
            </div>
            {!thread.isRead && <div className="unread-indicator" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="threads-list">
      <div className="threads-header">
        <button
          className="create-thread-btn"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={14} />
          New Thread
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form">
          <input
            type="text"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Thread title..."
            className="thread-title-input"
            autoFocus
          />
          <div className="form-actions">
            <button
              className="form-btn create"
              onClick={handleCreateThread}
              disabled={!newThreadTitle.trim()}
            >
              Create
            </button>
            <button
              className="form-btn cancel"
              onClick={() => {
                setShowCreateForm(false);
                setNewThreadTitle('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="threads-content">
        {activeThreads.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={24} />
            <p>No threads yet</p>
            <span>Create a thread to start organizing conversations</span>
          </div>
        ) : (
          <>
            {renderThreadGroup(pinnedThreads, 'Pinned')}
            {renderThreadGroup(regularThreads)}
          </>
        )}
      </div>
    </div>
  );
};

export default ThreadsList;
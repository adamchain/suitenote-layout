import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  X, 
  Send, 
  Plus, 
  Pin, 
  Archive, 
  Users,
  MoreHorizontal,
  Reply,
  MessageSquare
} from 'lucide-react';
import { Thread } from '../types/Thread';
import { Note } from '../types/Note';
import ThreadNote from './ThreadNote';
import './ThreadView.css';

interface ThreadViewProps {
  thread: Thread;
  notes: Note[];
  allNotes: Note[];
  onUpdateThread: (id: string, updates: Partial<Thread>) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onAddNote: (threadId: string, noteId: string) => void;
  onRemoveNote: (threadId: string, noteId: string) => void;
  onBack: () => void;
  onClose: () => void;
  isMobile?: boolean;
  onMobileBack?: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  notes,
  allNotes,
  onUpdateThread,
  onUpdateNote,
  onAddNote,
  onRemoveNote,
  onBack,
  onClose,
  isMobile = false,
  onMobileBack
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showAddNotes, setShowAddNotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  useEffect(() => {
    // Mark thread as read when viewing
    if (!thread.isRead) {
      onUpdateThread(thread.id, { isRead: true, unreadCount: 0 });
    }
  }, [thread.id, thread.isRead, onUpdateThread]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Create a new note for the message
    const newNote: Partial<Note> = {
      id: Date.now().toString() + Math.random(),
      type: 'note',
      content: newMessage.trim(),
      position: { x: 0, y: 0 }, // Not used in thread view
      threadId: thread.id,
      replyToId: replyToId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      color: 'blue'
    };

    // Add note to thread
    onAddNote(thread.id, newNote.id!);
    
    // Update thread activity
    onUpdateThread(thread.id, {
      lastActivity: new Date().toISOString()
    });

    setNewMessage('');
    setReplyToId(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape') {
      setReplyToId(null);
    }
  };

  const handleThreadAction = (action: string) => {
    switch (action) {
      case 'pin':
        onUpdateThread(thread.id, { isPinned: !thread.isPinned });
        break;
      case 'archive':
        onUpdateThread(thread.id, { isArchived: true });
        onBack();
        break;
    }
  };

  const availableNotes = allNotes.filter(note => 
    !note.isArchived && 
    !note.threadId &&
    note.content.trim() !== ''
  );

  const getReplyToNote = (replyToId: string) => {
    return notes.find(note => note.id === replyToId);
  };

  const formatParticipantCount = () => {
    const count = thread.collaborators?.length || 0;
    return `${count} participant${count !== 1 ? 's' : ''}`;
  };

  return (
    <div className="thread-view">
      <div className="thread-view-header">
        <div className="header-left">
          <button className="back-btn" onClick={isMobile && onMobileBack ? onMobileBack : onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="thread-info">
            <div className="thread-title-container">
              <h2 className="thread-title">{thread.title}</h2>
              {thread.isPinned && <Pin size={14} className="pinned-indicator" />}
            </div>
            <div className="thread-meta">
              <span className="participant-count">
                <Users size={12} />
                {formatParticipantCount()}
              </span>
              <span className="message-count">
                <MessageSquare size={12} />
                {notes.length} message{notes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`action-btn ${thread.isPinned ? 'active' : ''}`}
            onClick={() => handleThreadAction('pin')}
            title={thread.isPinned ? 'Unpin thread' : 'Pin thread'}
          >
            <Pin size={16} />
          </button>
          
          <button
            className="action-btn"
            onClick={() => setShowAddNotes(!showAddNotes)}
            title="Add existing notes"
          >
            <Plus size={16} />
          </button>

          <div className="thread-menu">
            <button className="action-btn">
              <MoreHorizontal size={16} />
            </button>
            <div className="thread-menu-dropdown">
              <button onClick={() => handleThreadAction('archive')}>
                <Archive size={12} />
                Archive Thread
              </button>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      {thread.description && (
        <div className="thread-description">
          <p>{thread.description}</p>
        </div>
      )}

      {showAddNotes && (
        <div className="add-notes-panel">
          <div className="panel-header">
            <h3>Add Existing Notes</h3>
            <button onClick={() => setShowAddNotes(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="available-notes">
            {availableNotes.length === 0 ? (
              <p className="no-available-notes">No available notes to add</p>
            ) : (
              availableNotes.slice(0, 5).map(note => (
                <div
                  key={note.id}
                  className="available-note"
                  onClick={() => {
                    onAddNote(thread.id, note.id);
                    onUpdateNote(note.id, { threadId: thread.id });
                  }}
                >
                  <div className="note-preview">
                    {note.content.substring(0, 50)}...
                  </div>
                  <button className="add-note-btn">
                    <Plus size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="thread-messages">
        {notes.length === 0 ? (
          <div className="empty-thread">
            <MessageSquare size={48} />
            <h3>Start the conversation</h3>
            <p>Be the first to add a message to this thread</p>
          </div>
        ) : (
          notes.map((note, index) => {
            const isReply = note.replyToId;
            const replyToNote = isReply ? getReplyToNote(note.replyToId!) : null;
            
            return (
              <ThreadNote
                key={note.id}
                note={note}
                replyToNote={replyToNote}
                isFirst={index === 0}
                isLast={index === notes.length - 1}
                onUpdate={onUpdateNote}
                onReply={(noteId) => setReplyToId(noteId)}
                onRemove={() => {
                  onRemoveNote(thread.id, note.id);
                  onUpdateNote(note.id, { threadId: undefined, replyToId: undefined });
                }}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="thread-input">
        {replyToId && (
          <div className="reply-context">
            <Reply size={14} />
            <span>Replying to: {getReplyToNote(replyToId)?.content.substring(0, 50)}...</span>
            <button onClick={() => setReplyToId(null)}>
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyToId ? "Write a reply..." : "Type a message..."}
            className="message-input"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="input-hint">
          Press Cmd+Enter to send
        </div>
      </div>
    </div>
  );
};

export default ThreadView;
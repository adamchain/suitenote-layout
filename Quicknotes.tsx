import React, { useState, useEffect } from 'react';
import { StickyNote, X, Plus, Clock } from 'lucide-react';
import './Quicknotes.css';

interface QuicknoteItem {
  id: string;
  content: string;
  timestamp: string;
  isHighlighted?: boolean;
}

interface QuicknotesProps {
  workspaceId: string;
}

const Quicknotes: React.FC<QuicknotesProps> = ({ workspaceId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quicknotes, setQuicknotes] = useState<QuicknoteItem[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Load quicknotes from localStorage on mount
  useEffect(() => {
    const savedQuicknotes = localStorage.getItem(`quicknotes_${workspaceId}`);
    if (savedQuicknotes) {
      setQuicknotes(JSON.parse(savedQuicknotes));
    }
  }, [workspaceId]);

  // Save quicknotes to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`quicknotes_${workspaceId}`, JSON.stringify(quicknotes));
  }, [quicknotes, workspaceId]);

  const addQuicknote = () => {
    if (newNoteContent.trim()) {
      const newQuicknote: QuicknoteItem = {
        id: Date.now().toString(),
        content: newNoteContent.trim(),
        timestamp: new Date().toISOString(),
        isHighlighted: quicknotes.length === 0 // Highlight first note
      };

      setQuicknotes(prev => [newQuicknote, ...prev]);
      setNewNoteContent('');
    }
  };

  const deleteQuicknote = (id: string) => {
    setQuicknotes(prev => prev.filter(note => note.id !== id));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return formatTime(timestamp);
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addQuicknote();
    }
  };

  return (
    <>
      {/* Quicknotes Button */}
      <button
        className="quicknotes-button"
        onClick={() => setIsOpen(true)}
        title="Open Quicknotes"
      >
        <StickyNote size={16} />
        Add Doc
      </button>

      {/* Quicknotes Modal */}
      {isOpen && (
        <div className="quicknotes-overlay" onClick={() => setIsOpen(false)}>
          <div className="quicknotes-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="quicknotes-header">
              <h3>Quicknotes</h3>
              <button
                className="quicknotes-close"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* New Note Input */}
            <div className="quicknotes-input-section">
              <div className="new-note-header">
                <h4>New quicknote</h4>
                <span className="current-time">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="No addition..."
                className="quicknotes-textarea"
                rows={3}
              />
              <button
                className="add-quicknote-btn"
                onClick={addQuicknote}
                disabled={!newNoteContent.trim()}
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Quicknotes List */}
            <div className="quicknotes-list">
              {quicknotes.length === 0 ? (
                <div className="empty-quicknotes">
                  <StickyNote size={32} />
                  <p>No quick docs yet</p>
                </div>
              ) : (
                quicknotes.map((note) => (
                  <div
                    key={note.id}
                    className={`quicknote-item ${note.isHighlighted ? 'highlighted' : ''}`}
                  >
                    <div className="quicknote-content">
                      <div className="quicknote-text">{note.content}</div>
                      <div className="quicknote-meta">
                        <Clock size={12} />
                        <span className="quicknote-time">
                          {formatDate(note.timestamp)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="delete-quicknote"
                      onClick={() => deleteQuicknote(note.id)}
                      title="Delete quicknote"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Quicknotes;
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X, Monitor, Plus } from 'lucide-react';
import WebviewNote from '../WebviewNote';
import { Note } from '../../types/Note';
import './BottomWebViewPanel.css';

interface BottomWebViewPanelProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  notes: Note[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (type: Note['type'], position?: { x: number; y: number }, color?: Note['color']) => Promise<Note>;
  onCreateNote: (content: string, url?: string) => void;
}

const BottomWebViewPanel: React.FC<BottomWebViewPanelProps> = ({
  isOpen,
  onToggle,
  notes,
  onUpdateNote,
  onDeleteNote,
  onAddNote,
  onCreateNote
}) => {
  const [height, setHeight] = useState(() => Math.round(window.innerHeight * 0.5));
  const [isResizing, setIsResizing] = useState(false);
  const [activeWebViewId, setActiveWebViewId] = useState<string | null>(null);

  const webViewNotes = notes.filter(note => note.type === 'webview' && !note.isArchived);
  const activeWebView = activeWebViewId ? webViewNotes.find(note => note.id === activeWebViewId) : webViewNotes[0];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight - (e.clientY - startY);
      setHeight(Math.max(200, Math.min(600, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleAddWebView = async () => {
    try {
      const newWebView = await onAddNote('webview', { x: 0, y: 0 });
      setActiveWebViewId(newWebView.id);
      if (!isOpen) {
        onToggle(true);
      }
    } catch (error) {
      console.error('Failed to add web view:', error);
    }
  };

  const handleClose = () => {
    onToggle(false);
    setActiveWebViewId(null);
  };

  if (!isOpen && webViewNotes.length === 0) {
    return (
      <div className="bottom-webview-panel collapsed">
        <div className="panel-trigger" onClick={() => onToggle(true)}>
          <Monitor size={16} />
          <span>Web View</span>
          <ChevronUp size={14} />
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="bottom-webview-panel collapsed">
        <div className="panel-trigger" onClick={() => onToggle(true)}>
          <Monitor size={16} />
          <span>{webViewNotes.length} Web View{webViewNotes.length !== 1 ? 's' : ''}</span>
          <ChevronUp size={14} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bottom-webview-panel open ${isResizing ? 'resizing' : ''}`}
      style={{ height }}
    >
      {/* Resize Handle */}
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
      />

      <div className="panel-header">
        <div className="panel-title">
          <Monitor size={16} />
          <span>Web Views</span>
        </div>

        <div className="panel-info">
          {activeWebView && (
            <span className="webview-title">
              {activeWebView.content.split('\n')[0] || 'Web View'}
            </span>
          )}
        </div>

        <div className="panel-actions">
          <button
            className="action-btn"
            onClick={handleClose}
            title="Close panel"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        {activeWebView ? (
          <WebviewNote
            note={activeWebView}
            onUpdate={onUpdateNote}
            onDelete={(id) => {
              onDeleteNote(id);
              const remainingNotes = webViewNotes.filter(n => n.id !== id);
              setActiveWebViewId(remainingNotes[0]?.id || null);
              if (remainingNotes.length === 0) {
                onToggle(false);
              }
            }}
            onCreateNote={onCreateNote}
          />
        ) : (
          <div className="empty-webview">
            <Monitor size={48} />
            <h3>No Web Views</h3>
            <p>Click + to add a web view</p>
            <button className="add-webview-btn" onClick={handleAddWebView}>
              <Plus size={16} />
              Add Web View
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomWebViewPanel;
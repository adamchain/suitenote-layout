import React, { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Note } from '../types/Note';
import './FocusMode.css';

interface FocusModeProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onClose: () => void;
}

const FocusMode: React.FC<FocusModeProps> = ({
  note,
  onUpdate,
  onClose
}) => {
  const [content, setContent] = React.useState(note.content);
  const [lastSaved, setLastSaved] = React.useState<Date>(new Date());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        onUpdate(note.id, { content });
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, note.id, onUpdate, onClose]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onUpdate(note.id, { content: e.target.value });
    setLastSaved(new Date());
  };

  const formatNoteType = (type: Note['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatLastSaved = () => {
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 5) return 'Saved just now';
    if (diffSecs < 60) return `Saved ${diffSecs}s ago`;
    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  };

  return (
    <div className="focus-mode-overlay">
      <div className="focus-mode">
        <div className="focus-header">
          <div className="focus-title">
            <Maximize2 size={20} />
            <div className="focus-note-info">
              <span className="focus-mode-label">Focus Mode</span>
              <span className="focus-note-type">{formatNoteType(note.type)} Note</span>
            </div>
          </div>
          
          <div className="focus-actions">
            <span className="focus-save-status">{formatLastSaved()}</span>
            <span className="focus-shortcut">Esc to exit • Cmd+Enter to save</span>
            <button
              className="focus-close"
              onClick={onClose}
              title="Exit focus mode (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="focus-content">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing in focus mode..."
            className="focus-textarea"
            autoFocus
          />
        </div>

        <div className="focus-footer">
          <div className="focus-stats">
            <span>{content.length} characters</span>
            <span>{content.split(/\s+/).filter(word => word.length > 0).length} words</span>
            <span>{content.split('\n').length} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusMode;
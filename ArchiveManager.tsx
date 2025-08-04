import React, { useState } from 'react';
import { Archive, X, RotateCcw, Trash2, Search } from 'lucide-react';
import { Note } from '../types/Note';
import './ArchiveManager.css';

interface ArchiveManagerProps {
  notes: Note[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onClose: () => void;
}

const ArchiveManager: React.FC<ArchiveManagerProps> = ({
  notes,
  onUpdateNote,
  onDeleteNote,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const archivedNotes = notes.filter(note => note.isArchived);
  const filteredNotes = archivedNotes.filter(note =>
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const restoreNote = (noteId: string) => {
    onUpdateNote(noteId, { isArchived: false });
  };

  const permanentlyDelete = (noteId: string) => {
    if (confirm('Are you sure? This will permanently delete the note.')) {
      onDeleteNote(noteId);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const bulkRestore = () => {
    selectedNotes.forEach(noteId => {
      onUpdateNote(noteId, { isArchived: false });
    });
    setSelectedNotes([]);
  };

  const bulkDelete = () => {
    if (confirm(`Are you sure? This will permanently delete ${selectedNotes.length} notes.`)) {
      selectedNotes.forEach(noteId => {
        onDeleteNote(noteId);
      });
      setSelectedNotes([]);
    }
  };

  return (
    <div className="archive-manager-overlay" onClick={onClose}>
      <div className="archive-manager" onClick={(e) => e.stopPropagation()}>
        <div className="archive-header">
          <div className="header-title">
            <Archive size={24} />
            <h2>Archive Manager</h2>
            <span className="archive-count">({archivedNotes.length} archived)</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="archive-content">
          <div className="archive-controls">
            <div className="search-container">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search archived docs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {selectedNotes.length > 0 && (
              <div className="bulk-actions">
                <span>{selectedNotes.length} selected</span>
                <button className="bulk-restore" onClick={bulkRestore}>
                  <RotateCcw size={16} />
                  Restore
                </button>
                <button className="bulk-delete" onClick={bulkDelete}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="empty-archive">
              <Archive size={48} />
              <h3>No archived notes</h3>
              <p>
                {archivedNotes.length === 0 
                  ? 'Archive notes to keep your workspace clean while preserving important content.'
                  : 'No notes match your search criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="archived-notes">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`archived-note ${selectedNotes.includes(note.id) ? 'selected' : ''}`}
                >
                  <div className="note-selector">
                    <input
                      type="checkbox"
                      checked={selectedNotes.includes(note.id)}
                      onChange={() => toggleNoteSelection(note.id)}
                    />
                  </div>

                  <div className="note-preview">
                    <div className="note-content">
                      {note.content.substring(0, 150)}
                      {note.content.length > 150 && '...'}
                    </div>
                    <div className="note-meta">
                      <span className="note-type">{note.type}</span>
                      <span className="note-date">
                        Archived: {new Date(note.updatedAt).toLocaleDateString()}
                      </span>
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
                  </div>

                  <div className="note-actions">
                    <button
                      className="restore-btn"
                      onClick={() => restoreNote(note.id)}
                      title="Restore note"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => permanentlyDelete(note.id)}
                      title="Delete permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveManager;
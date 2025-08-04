import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, Hash, Filter } from 'lucide-react';
import { Note } from '../types/Note';
import './TagManager.css';

interface TagManagerProps {
  notes: Note[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onClose: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({
  notes,
  onUpdateNote,
  onClose
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'any'>('any');

  // Get all unique tags from all notes
  const allTags = Array.from(
    new Set(
      notes.flatMap(note => note.tags || [])
    )
  ).sort();

  // Get tag usage counts
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = notes.filter(note => note.tags?.includes(tag)).length;
    return acc;
  }, {} as Record<string, number>);

  // Filter notes based on selected tags
  const filteredNotes = selectedTags.length === 0 
    ? notes 
    : notes.filter(note => {
        const noteTags = note.tags || [];
        if (filterMode === 'all') {
          return selectedTags.every(tag => noteTags.includes(tag));
        } else {
          return selectedTags.some(tag => noteTags.includes(tag));
        }
      });

  const addNewTag = () => {
    if (newTag.trim() && !allTags.includes(newTag.trim())) {
      setNewTag('');
    }
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const removeTagFromNote = (noteId: string, tagToRemove: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const updatedTags = (note.tags || []).filter(tag => tag !== tagToRemove);
      onUpdateNote(noteId, { tags: updatedTags });
    }
  };

  const addTagToNote = (noteId: string, tagToAdd: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const currentTags = note.tags || [];
      if (!currentTags.includes(tagToAdd)) {
        onUpdateNote(noteId, { tags: [...currentTags, tagToAdd] });
      }
    }
  };

  return (
    <div className="tag-manager-overlay" onClick={onClose}>
      <div className="tag-manager" onClick={(e) => e.stopPropagation()}>
        <div className="tag-manager-header">
          <div className="header-title">
            <Tag size={24} />
            <h2>Tag Manager</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="tag-manager-content">
          {/* Tag Filter Section */}
          <div className="tag-filter-section">
            <div className="section-header">
              <Filter size={16} />
              <h3>Filter by Tags</h3>
              <div className="filter-mode">
                <button
                  className={`mode-btn ${filterMode === 'any' ? 'active' : ''}`}
                  onClick={() => setFilterMode('any')}
                >
                  Any
                </button>
                <button
                  className={`mode-btn ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  All
                </button>
              </div>
            </div>

            <div className="tags-grid">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-filter ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTagFilter(tag)}
                >
                  <Hash size={12} />
                  <span>{tag}</span>
                  <span className="tag-count">{tagCounts[tag]}</span>
                </button>
              ))}
            </div>

            {selectedTags.length > 0 && (
              <div className="active-filters">
                <span>Active filters:</span>
                {selectedTags.map(tag => (
                  <span key={tag} className="active-filter">
                    {tag}
                    <button onClick={() => toggleTagFilter(tag)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button 
                  className="clear-filters"
                  onClick={() => setSelectedTags([])}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Notes with Tags Section */}
          <div className="notes-section">
            <div className="section-header">
              <h3>Notes ({filteredNotes.length})</h3>
            </div>

            <div className="notes-list">
              {filteredNotes.map(note => (
                <div key={note.id} className="note-item">
                  <div className="note-preview">
                    <div className="note-content-preview">
                      {note.content.substring(0, 100)}
                      {note.content.length > 100 && '...'}
                    </div>
                    <div className="note-meta">
                      <span className="note-type">{note.type}</span>
                      <span className="note-date">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="note-tags">
                    {(note.tags || []).map(tag => (
                      <span key={tag} className="note-tag">
                        #{tag}
                        <button
                          onClick={() => removeTagFromNote(note.id, tag)}
                          className="remove-tag"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    
                    <div className="add-tag-to-note">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addTagToNote(note.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="tag-select"
                      >
                        <option value="">Add tag...</option>
                        {allTags
                          .filter(tag => !(note.tags || []).includes(tag))
                          .map(tag => (
                            <option key={tag} value={tag}>#{tag}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
import React, { useState } from 'react';
import { Plus, Grid3X3, X } from 'lucide-react';
import { Note } from '../types/Note';
import BasicNote from './BasicNote';
import EnhancedNote from './EnhancedNote';
import VoiceNote from './VoiceNote';
import SketchNote from './SketchNote';
import ScanNote from './ScanNote';
import MediaNote from './MediaNote';
import WebviewNote from './WebviewNote';
import './GridComponent.css';

interface GridComponentProps {
  note: Note; // The grid note itself
  notes: Note[]; // All notes for lookup
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onAddNote: (type: Note['type'], position?: { x: number; y: number }, color?: Note['color']) => Promise<Note>;
  onCreateNote?: (content: string, url?: string) => void;
}

const GridComponent: React.FC<GridComponentProps> = ({
  note,
  notes,
  onUpdate,
  onDelete,
  onAddNote,
  onCreateNote
}) => {
  const [dragOver, setDragOver] = useState(false);

  // Get notes that are in this grid
  const gridItems = (note.gridItems || [])
    .map(id => notes.find(n => n.id === id))
    .filter(Boolean) as Note[];

  // Allow dropping any note into the grid (not just file tree items)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const draggedNoteId = e.dataTransfer.getData('text/plain');
    if (draggedNoteId && !note.gridItems?.includes(draggedNoteId)) {
      // Add the note to this grid
      const newGridItems = [...(note.gridItems || []), draggedNoteId];
      onUpdate(note.id, { gridItems: newGridItems });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const removeFromGrid = (noteId: string) => {
    const newGridItems = (note.gridItems || []).filter(id => id !== noteId);
    onUpdate(note.id, { gridItems: newGridItems });
  };

  const addNewItemToGrid = async () => {
    try {
      const newNote = await onAddNote('note', { x: 0, y: 0 });
      const newGridItems = [...(note.gridItems || []), newNote.id];
      onUpdate(note.id, { gridItems: newGridItems });
    } catch (error) {
      console.error('Failed to add note to grid:', error);
    }
  };

  const handleDragStart = (noteId: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', noteId);
  };

  // Fix: always provide a fallback for onCreateNote
  const safeOnCreateNote = onCreateNote || (() => { });

  const renderNoteInGrid = (gridNote: Note) => {
    const commonProps = {
      note: gridNote,
      onUpdate,
      onDelete: () => removeFromGrid(gridNote.id)
    };
    switch (gridNote.type) {
      case 'voice':
        return <VoiceNote {...commonProps} />;
      case 'sketch':
        return <SketchNote {...commonProps} />;
      case 'scan':
        return <ScanNote {...commonProps} />;
      case 'media':
        return <MediaNote {...commonProps} />;
      case 'webview':
        return <WebviewNote {...commonProps} onCreateNote={safeOnCreateNote} />;
      default:
        if (gridNote.isEnhanced) {
          return <EnhancedNote {...commonProps} />;
        }
        return <BasicNote {...commonProps} />;
    }
  };

  return (
    <div className="grid-component">
      <div className="grid-header">
        <div className="grid-title">
          <Grid3X3 size={16} />
          <input
            type="text"
            value={note.content.split('\n')[0] || 'Grid Collection'}
            onChange={(e) => {
              const lines = note.content.split('\n');
              lines[0] = e.target.value;
              onUpdate(note.id, { content: lines.join('\n') });
            }}
            className="grid-title-input"
            placeholder="Grid title..."
          />
        </div>
        <button
          className="add-to-grid-btn"
          onClick={addNewItemToGrid}
          title="Add new item to grid"
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        className={`grid-dropzone${dragOver ? ' drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {gridItems.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={handleDragStart(item.id)}
            className="grid-draggable-item"
          >
            {/* Render note preview here */}
            <BasicNote note={item} onUpdate={onUpdate} onDelete={onDelete} />
            <button className="remove-btn" onClick={() => removeFromGrid(item.id)}><X size={12} /></button>
          </div>
        ))}
        {gridItems.length === 0 && (
          <div className="grid-empty-state">
            <Grid3X3 size={48} />
            <p>Empty Grid Collection</p>
            <span>Drag notes here or click + to add items</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GridComponent;
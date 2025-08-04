import React, { useState, useRef } from 'react';
import { Image, X, Upload, Download, Crop, Palette, RotateCcw } from 'lucide-react';
import { Note } from '../types/Note';
import './MediaNote.css';

interface MediaNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const MediaNote: React.FC<MediaNoteProps> = ({
  note,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState(note.content || '');
  const [filter, setFilter] = useState('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        onUpdate(note.id, { 
          imageUrl: imageData,
          metadata: {
            ...note.metadata,
            originalFileName: file.name,
            fileSize: file.size,
            fileType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadImage = () => {
    if (note.imageUrl) {
      const link = document.createElement('a');
      link.download = `image-${note.id}.png`;
      link.href = note.imageUrl;
      link.click();
    }
  };

  const applyFilter = (filterName: string) => {
    setFilter(filterName);
    // In a real app, you'd apply actual image filters here
  };

  const filters = [
    { name: 'none', label: 'Original' },
    { name: 'grayscale', label: 'B&W' },
    { name: 'sepia', label: 'Sepia' },
    { name: 'blur', label: 'Blur' },
    { name: 'brightness', label: 'Bright' },
    { name: 'contrast', label: 'Contrast' }
  ];

  const getFilterStyle = () => {
    switch (filter) {
      case 'grayscale': return { filter: 'grayscale(100%)' };
      case 'sepia': return { filter: 'sepia(100%)' };
      case 'blur': return { filter: 'blur(2px)' };
      case 'brightness': return { filter: 'brightness(1.3)' };
      case 'contrast': return { filter: 'contrast(1.3)' };
      default: return {};
    }
  };

  return (
    <div className="media-note">
      <div className="media-header">
        <div className="media-title">
          <Image size={16} />
          <span>Media Note</span>
        </div>
        
        <div className="media-actions">
          {note.imageUrl && (
            <>
              <button
                className="media-action"
                onClick={() => setIsEditing(!isEditing)}
                title="Edit filters"
              >
                <Palette size={16} />
              </button>
              <button
                className="media-action"
                onClick={downloadImage}
                title="Download image"
              >
                <Download size={16} />
              </button>
              <button
                className="media-action"
                onClick={() => fileInputRef.current?.click()}
                title="Replace image"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
          <button
            className="note-delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete media note"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="media-content">
        {!note.imageUrl ? (
          <div className="upload-area">
            <div className="upload-placeholder">
              <Image size={48} />
              <h3>Add an Image</h3>
              <p>Upload photos, screenshots, or any image file</p>
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Choose Image
              </button>
            </div>
          </div>
        ) : (
          <div className="image-container">
            <img
              src={note.imageUrl}
              alt="Media content"
              className="media-image"
              style={getFilterStyle()}
            />
            
            {isEditing && (
              <div className="filter-panel">
                <h4>Filters</h4>
                <div className="filter-grid">
                  {filters.map((f) => (
                    <button
                      key={f.name}
                      className={`filter-btn ${filter === f.name ? 'active' : ''}`}
                      onClick={() => applyFilter(f.name)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="caption-section">
          <textarea
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              onUpdate(note.id, { content: e.target.value });
            }}
            placeholder="Add a caption or description..."
            className="caption-input"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      {note.metadata?.fileSize && (
        <div className="media-footer">
          <span className="file-info">
            {note.metadata.originalFileName} • {Math.round(note.metadata.fileSize / 1024)}KB
          </span>
        </div>
      )}
    </div>
  );
};

export default MediaNote;
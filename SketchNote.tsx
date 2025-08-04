import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Trash2, Palette, Eraser } from 'lucide-react';
import { Note } from '../types/Note';
import './SketchNote.css';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../auth/AuthContext';

interface SketchNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const SketchNote: React.FC<SketchNoteProps & { currentWorkspaceId?: string }> = ({
  note,
  onUpdate,
  onDelete,
  currentWorkspaceId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const { lastMessage, sendDocumentChange } = useWebSocket();
  const { state: authState } = useAuth();

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && note.sketchData) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = note.sketchData;
      }
    }
  }, [note.sketchData]);

  // Listen for remote document_change events
  useEffect(() => {
    if (
      lastMessage &&
      lastMessage.type === 'document_change' &&
      lastMessage.documentId === note.id &&
      lastMessage.userId !== authState.user?.id
    ) {
      if (
        lastMessage.version > (note.version || 1) ||
        lastMessage.changes.sketchData !== note.sketchData
      ) {
        onUpdate(note.id, { ...lastMessage.changes, version: lastMessage.version });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, note.id, authState.user?.id]);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);

        if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = brushColor;
        }

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSketch();
    }
  };

  const saveSketch = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL();
      onUpdate(note.id, { sketchData: dataURL });
      // Emit document_change for sketch updates
      if (currentWorkspaceId) {
        sendDocumentChange(currentWorkspaceId, note, { sketchData: dataURL }, (note.version || 1) + 1);
      }
    }
  };

  // Touch event handlers for mobile drawing
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas && touch) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      setIsDrawing(true);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);

        if (currentTool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = brushColor;
        }

        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas && touch) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isDrawing) {
      setIsDrawing(false);
      saveSketch();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveSketch();
      }
    }
  };

  const downloadSketch = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `sketch-${note.id}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="sketch-note">
      <div className="sketch-header">
        <div className="sketch-tools">
          <button
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => setCurrentTool('pen')}
            title="Pen tool"
          >
            <Palette size={16} />
          </button>

          <button
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="Eraser tool"
          >
            <Eraser size={16} />
          </button>

          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="color-picker"
            disabled={currentTool === 'eraser'}
          />

          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="brush-size"
            title={`Brush size: ${brushSize}px`}
          />
        </div>

        <div className="sketch-actions">
          <button
            className="action-btn"
            onClick={clearCanvas}
            title="Clear canvas"
          >
            <Trash2 size={16} />
          </button>

          <button
            className="action-btn"
            onClick={downloadSketch}
            title="Download sketch"
          >
            <Download size={16} />
          </button>

          <button
            className="note-delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete sketch"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="sketch-canvas-container">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          className="sketch-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="sketch-footer">
        <span className="sketch-info">
          {currentTool === 'pen' ? `Pen • ${brushSize}px • ${brushColor}` : `Eraser • ${brushSize}px`}
        </span>
      </div>
    </div>
  );
};

export default SketchNote;
import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Download, RotateCcw, Zap, FileText, Crop } from 'lucide-react';
import Webcam from 'react-webcam';
import { Note } from '../types/Note';
import './ScanNote.css';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../auth/AuthContext';

interface ScanNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const ScanNote: React.FC<ScanNoteProps & { currentWorkspaceId?: string }> = ({
  note,
  onUpdate,
  onDelete,
  currentWorkspaceId
}) => {
  const [isCapturing, setIsCapturing] = useState(!note.scanData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState(note.metadata?.extractedText || '');
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { lastMessage, sendDocumentChange } = useWebSocket();
  const { state: authState } = useAuth();

  // Listen for remote document_change events
  React.useEffect(() => {
    if (
      lastMessage &&
      lastMessage.type === 'document_change' &&
      lastMessage.documentId === note.id &&
      lastMessage.userId !== authState.user?.id
    ) {
      if (
        lastMessage.version > (note.version || 1) ||
        lastMessage.changes.content !== note.content
      ) {
        onUpdate(note.id, { ...lastMessage.changes, version: lastMessage.version });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, note.id, authState.user?.id]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onUpdate(note.id, {
        scanData: imageSrc,
        cameraData: imageSrc
      });
      setIsCapturing(false);
      processImage(imageSrc);
    }
  }, [note.id, onUpdate]);

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      const mockExtractedText = "Sample extracted text from document\nThis would be the actual OCR result\nwith multiple lines of text";
      setExtractedText(mockExtractedText);
      onUpdate(note.id, {
        content: mockExtractedText,
        metadata: {
          ...note.metadata,
          extractedText: mockExtractedText,
          documentType: 'document'
        }
      });
      // Emit document_change for OCR result
      if (currentWorkspaceId) {
        sendDocumentChange(currentWorkspaceId, note, { content: mockExtractedText }, (note.version || 1) + 1);
      }
      setIsProcessing(false);
    }, 2000);
  };

  const retakePhoto = () => {
    setIsCapturing(true);
    onUpdate(note.id, { scanData: undefined, cameraData: undefined });
  };

  const downloadImage = () => {
    if (note.scanData) {
      const link = document.createElement('a');
      link.download = `scan-${note.id}.png`;
      link.href = note.scanData;
      link.click();
    }
  };

  const enhanceImage = () => {
    // Simulate image enhancement
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      // In a real app, this would apply filters to improve OCR accuracy
    }, 1000);
  };

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "environment" // Use back camera on mobile
  };

  return (
    <div className="scan-note">
      <div className="scan-header">
        <div className="scan-title">
          <Camera size={16} />
          <span>Document Scanner</span>
        </div>

        <div className="scan-actions">
          {note.scanData && (
            <>
              <button
                className="scan-action"
                onClick={enhanceImage}
                title="Enhance image"
                disabled={isProcessing}
              >
                <Zap size={16} />
              </button>
              <button
                className="scan-action"
                onClick={downloadImage}
                title="Download image"
              >
                <Download size={16} />
              </button>
              <button
                className="scan-action"
                onClick={retakePhoto}
                title="Retake photo"
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
          <button
            className="note-delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete scan note"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="scan-content">
        {isCapturing ? (
          <div className="camera-view">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="webcam"
            />
            <div className="camera-overlay">
              <div className="scan-frame"></div>
              <div className="camera-instructions">
                <p>Position document within the frame</p>
                <p>Ensure good lighting and focus</p>
              </div>
            </div>
            <button className="capture-btn" onClick={capture}>
              <Camera size={24} />
              <span>Capture</span>
            </button>
          </div>
        ) : (
          <div className="scan-result">
            {note.scanData && (
              <div className="scanned-image">
                <img src={note.scanData} alt="Scanned document" />
                {isProcessing && (
                  <div className="processing-overlay">
                    <div className="processing-spinner"></div>
                    <span>Processing image...</span>
                  </div>
                )}
              </div>
            )}

            <div className="extracted-content">
              <div className="content-header">
                <FileText size={16} />
                <span>Extracted Text</span>
              </div>

              <textarea
                value={extractedText}
                onChange={(e) => {
                  setExtractedText(e.target.value);
                  onUpdate(note.id, {
                    content: e.target.value,
                    metadata: {
                      ...note.metadata,
                      extractedText: e.target.value
                    }
                  });
                }}
                placeholder={isProcessing ? "Extracting text..." : "Extracted text will appear here..."}
                className="extracted-text"
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanNote;
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Clock,
  MapPin,
  Cloud,
  Heart,
  Zap,
  Paperclip,
  Calendar,
  AlertCircle,
  Star,
  X,
  Plus,
  Bot
} from 'lucide-react';
import { Note } from '../types/Note';
import { aiService } from '../services/aiService';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../auth/AuthContext';
import './EnhancedNote.css';

interface EnhancedNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const EnhancedNote: React.FC<EnhancedNoteProps & { currentWorkspaceId?: string }> = ({
  note,
  onUpdate,
  onDelete,
  currentWorkspaceId
}) => {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [localContent, setLocalContent] = useState(note.content);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const { lastMessage, sendDocumentChange } = useWebSocket();
  const { state: authState } = useAuth();

  const priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' }
  ];

  const moods = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'sad', emoji: '😢', label: 'Sad' },
    { value: 'excited', emoji: '🤩', label: 'Excited' },
    { value: 'calm', emoji: '😌', label: 'Calm' },
    { value: 'stressed', emoji: '😰', label: 'Stressed' },
    { value: 'focused', emoji: '🎯', label: 'Focused' }
  ];

  const energyLevels = [
    { value: 'low', label: 'Low', color: '#6b7280' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' }
  ];

  // Sync local content with note content only if not currently typing and content actually changed
  useEffect(() => {
    if (!isTypingRef.current && localContent !== note.content) {
      setLocalContent(note.content);
    }
  }, [note.content, localContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Listen for remote document_change events
  useEffect(() => {
    if (
      lastMessage &&
      lastMessage.type === 'document_change' &&
      lastMessage.documentId === note.id &&
      lastMessage.userId !== authState.user?.id
    ) {
      // Only update if version is newer or content is different
      if (
        lastMessage.version > (note.version || 1) ||
        lastMessage.changes.content !== note.content
      ) {
        onUpdate(note.id, { ...lastMessage.changes, version: lastMessage.version });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, note.id, authState.user?.id]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    isTypingRef.current = true;
    setLocalContent(newContent);

    // Debounce the update to prevent rapid API calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(note.id, { content: newContent });
      // Emit document_change event for real-time sync
      if (currentWorkspaceId) {
        sendDocumentChange(currentWorkspaceId, note, { content: newContent }, (note.version || 1) + 1);
      }
      isTypingRef.current = false;
    }, 800);
  }, [note.id, onUpdate, currentWorkspaceId, note, sendDocumentChange]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      size: file.size
    }));

    onUpdate(note.id, {
      attachments: [...(note.attachments || []), ...newAttachments]
    });
  };

  const removeAttachment = (attachmentId: string) => {
    const updatedAttachments = (note.attachments || []).filter(
      att => att.id !== attachmentId
    );
    onUpdate(note.id, { attachments: updatedAttachments });
  };

  const generateAIEnhancement = async () => {
    if (!aiService.isAIEnabled() || !localContent) return;

    setIsGeneratingAI(true);
    try {
      const [summary, tags, sentiment] = await Promise.all([
        aiService.generateSummary(localContent),
        aiService.generateTags(localContent),
        aiService.analyzeSentiment(localContent)
      ]);

      // Auto-suggest mood based on sentiment
      let suggestedMood: Note['mood'] = 'calm';
      if (sentiment === 'positive') suggestedMood = 'happy';
      if (sentiment === 'negative') suggestedMood = 'sad';

      onUpdate(note.id, {
        metadata: {
          ...note.metadata,
          aiSummary: summary,
          aiTags: tags,
          sentiment
        },
        tags: [...(note.tags || []), ...tags.slice(0, 3)],
        mood: suggestedMood
      });
    } catch (error) {
      console.error('AI enhancement failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="enhanced-note">
      <div className="note-header">
        <div className="note-title">
          <span>✨ Enhanced {note.type}</span>
          {note.priority && (
            <div
              className="priority-indicator"
              style={{ backgroundColor: priorities.find(p => p.value === note.priority)?.color }}
            >
              {priorities.find(p => p.value === note.priority)?.label}
            </div>
          )}
        </div>

        <div className="note-actions">
          <button
            className="ai-enhance-btn"
            onClick={generateAIEnhancement}
            disabled={isGeneratingAI || !localContent}
            title="AI Enhancement"
          >
            <Bot size={14} />
            {isGeneratingAI ? '...' : 'AI'}
          </button>
          <button
            className="metadata-toggle"
            onClick={() => setShowMetadata(!showMetadata)}
            title="Toggle metadata"
          >
            <Star size={14} />
          </button>
          <button
            className="delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete note"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="note-content">
        <textarea
          value={localContent}
          onChange={handleContentChange}
          placeholder="Start writing... (AI will enhance automatically)"
          className="content-textarea"
        />
      </div>

      {showMetadata && (
        <div className="metadata-panel">
          <div className="metadata-section">
            <h4>Context</h4>

            <div className="metadata-row">
              <label>Priority:</label>
              <select
                value={note.priority || ''}
                onChange={(e) => onUpdate(note.id, { priority: e.target.value as Note['priority'] })}
              >
                <option value="">None</option>
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="metadata-row">
              <label>Due Date:</label>
              <input
                type="datetime-local"
                value={note.dueDate || ''}
                onChange={(e) => onUpdate(note.id, { dueDate: e.target.value })}
              />
            </div>

            <div className="metadata-row">
              <label>Mood:</label>
              <div className="mood-selector">
                {moods.map(mood => (
                  <button
                    key={mood.value}
                    className={`mood-btn ${note.mood === mood.value ? 'active' : ''}`}
                    onClick={() => onUpdate(note.id, { mood: mood.value as Note['mood'] })}
                    title={mood.label}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="metadata-row">
              <label>Energy:</label>
              <div className="energy-selector">
                {energyLevels.map(level => (
                  <button
                    key={level.value}
                    className={`energy-btn ${note.energy === level.value ? 'active' : ''}`}
                    onClick={() => onUpdate(note.id, { energy: level.value as Note['energy'] })}
                    style={{ backgroundColor: note.energy === level.value ? level.color : undefined }}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="metadata-section">
            <h4>Attachments</h4>
            <div className="attachments-area">
              <button
                className="add-attachment"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={16} />
                Add File
              </button>

              {(note.attachments || []).map(attachment => (
                <div key={attachment.id} className="attachment-item">
                  <div className="attachment-info">
                    <span className="attachment-name">{attachment.name}</span>
                    <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                  </div>
                  <button
                    className="remove-attachment"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {note.metadata?.aiSummary && (
            <div className="metadata-section">
              <h4>AI Insights</h4>
              <div className="ai-summary">
                <p>{note.metadata.aiSummary}</p>
                {note.metadata.sentiment && (
                  <div className="sentiment-badge">
                    Sentiment: {note.metadata.sentiment}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <div className="note-footer">
        <div className="note-indicators">
          {note.dueDate && (
            <div className="indicator due-date">
              <Calendar size={12} />
              <span>{new Date(note.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {note.mood && (
            <div className="indicator mood">
              {moods.find(m => m.value === note.mood)?.emoji}
            </div>
          )}
          {note.attachments && note.attachments.length > 0 && (
            <div className="indicator attachments">
              <Paperclip size={12} />
              <span>{note.attachments.length}</span>
            </div>
          )}
        </div>
        <div className="note-timestamp">
          {new Date(note.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedNote;
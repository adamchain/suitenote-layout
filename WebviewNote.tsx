import React, { useState, useRef } from 'react';
import { X, ExternalLink, Bookmark, StickyNote } from 'lucide-react';
import { Note } from '../types/Note';
import './WebviewNote.css';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../auth/AuthContext';

interface WebviewNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onCreateNote: (content: string, url?: string) => void;
}

const WebviewNote: React.FC<WebviewNoteProps & { currentWorkspaceId?: string }> = ({
  note,
  onUpdate,
  onDelete,
  onCreateNote,
  currentWorkspaceId
}) => {
  const [url, setUrl] = useState(note.url || 'https://');
  const [noteContent, setNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && url !== 'https://' && url.trim()) {
      let validUrl = url.trim();
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
      setIsLoading(true);
      setHasLoadedOnce(false);
      onUpdate(note.id, {
        url: validUrl,
        metadata: {
          domain: new URL(validUrl).hostname,
          title: new URL(validUrl).hostname
        }
      });
      // Emit document_change for URL change
      if (currentWorkspaceId) {
        sendDocumentChange(currentWorkspaceId, note, { url: validUrl }, (note.version || 1) + 1);
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);

    // Only update metadata once to prevent repeated API calls
    if (hasLoadedOnce) return;
    setHasLoadedOnce(true);

    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const title = iframe.contentDocument.title;
        if (title && title !== note.metadata?.title) {
          onUpdate(note.id, {
            metadata: {
              ...note.metadata,
              title: title || note.metadata?.domain
            }
          });
        }
      }
    } catch (error) {
      // Cross-origin restrictions prevent access
      console.log('Cannot access iframe content due to CORS');
    }
  };

  const createContextualNote = () => {
    if (noteContent.trim()) {
      onCreateNote(noteContent, note.url);
      setNoteContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      createContextualNote();
    }
  };

  const handleNoteContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteContent(e.target.value);
    // Optionally: emit document_change for contextual note content if needed
  };

  return (
    <div className="webview-note">
      <div className="webview-header">
        <div className="webview-controls">
          <form onSubmit={handleUrlSubmit} className="url-form">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL..."
              className="url-input"
            />

          </form>

          <div className="webview-actions">
            <button
              className="webview-action"
              onClick={() => {
                if (note.url) {
                  window.open(note.url, '_blank', 'noopener,noreferrer');
                }
              }}
              title="Open in new tab"
            >
              <ExternalLink size={16} />
            </button>
            <button
              className="note-delete-btn"
              onClick={() => onDelete(note.id)}
              title="Delete webview note"
            >
              <X size={14} />
            </button>
          </div>
        </div>


      </div>

      <div className="webview-content">
        <div className="webview-browser">
          {isLoading && (
            <div className="webview-loading">
              <div className="loading-spinner"></div>
              <span>Loading website...</span>
            </div>
          )}

          {note.url && note.url !== 'https://' && (
            <iframe
              ref={iframeRef}
              src={note.url}
              className="webview-iframe"
              onLoad={handleIframeLoad}
              onError={() => {
                setIsLoading(false);
                console.error('Failed to load URL:', note.url);
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title={note.metadata?.title || 'Webview'}
            />
          )}
        </div>

        <div className="webview-notes">
          <div className="notes-header">
            <StickyNote size={16} />
            <span>Contextual Notes</span>
          </div>

          <textarea
            value={noteContent}
            onChange={handleNoteContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Take docs about this page... (Cmd+Enter to save)"
            className="notes-input"
          />

          <button
            onClick={createContextualNote}
            className="create-note-btn"
            disabled={!noteContent.trim()}
          >
            Create Note
          </button>

          {note.url && (
            <div className="url-info">
              <Bookmark size={12} />
              <span>Notes will be tagged with: {note.metadata?.domain}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebviewNote;
import React, { useState } from 'react';
import { ArrowLeft, Maximize2, Grid3X3, List, Plus, StickyNote, CheckSquare, Folder, FileText, Mic, PenTool, Camera, Image, Monitor } from 'lucide-react';
import { extractCleanTitle } from '../../utils/textUtils';
import FocusMode from '../FocusMode';
import ThreadView from '../ThreadView';
import WelcomeTab from './WelcomeTab';
import BasicNote from '../BasicNote';
import TodoNote from '../TodoNote';
import EnhancedNote from '../EnhancedNote';
import VoiceNote from '../VoiceNote';
import SketchNote from '../SketchNote';
import ScanNote from '../ScanNote';
import MediaNote from '../MediaNote';
import WebviewNote from '../WebviewNote';
import GridComponent from '../GridComponent';
import SpreadsheetEditor from '../SpreadsheetEditor';
import { Note } from '../../types/Note';
import { Thread } from '../../types/Thread';
import { ViewMode, MainView } from './MainLayout';
import { TabItem } from './TabContainer';
import TabContainer from './TabContainer';
import './MainSection.css';

interface MainSectionProps {
  viewMode: ViewMode;
  mainView: MainView;
  notes: Note[];
  selectedNote: Note | null;
  selectedThread: Thread | null;
  selectedFolderId: string | null;
  threads: Thread[];
  openTabs: TabItem[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onUpdateTabTitle: (tabId: string, newTitle: string) => void;
  onMarkTabAsModified: (tabId: string, isModified: boolean) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onAddNote: (type: Note['type'], position?: { x: number; y: number }, color?: Note['color']) => Promise<Note>;
  onCreateNote: (content: string, url?: string) => void;
  onAddToThread: (noteId: string) => void;
  onUpdateThread: (id: string, updates: Partial<Thread>) => void;
  onAddNoteToThread: (threadId: string, noteId: string) => void;
  onRemoveNoteFromThread: (threadId: string, noteId: string) => void;
  onBackToCanvas: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectNote: (noteId: string) => void;
  showFocusMode: boolean;
  onShowFocusMode: (show: boolean) => void;
  workspaceTitle?: string;
  onUpdateWorkspaceTitle?: (title: string) => void;
  onShowProductivityDashboard: () => void;
  createThread: (title: string, description?: string, noteIds?: string[]) => Thread;
  onSelectThread: (threadId: string) => void;
  isMobile?: boolean;
  onMobileBackToDirectory?: () => void;
  currentWorkspaceId?: string;
}

const MainSection: React.FC<MainSectionProps> = ({
  viewMode,
  mainView,
  notes,
  selectedNote,
  selectedThread,
  selectedFolderId,
  threads,
  openTabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onUpdateTabTitle,
  onMarkTabAsModified,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onAddNote,
  onCreateNote,
  onAddToThread,
  onUpdateThread,
  onAddNoteToThread,
  onRemoveNoteFromThread,
  onBackToCanvas,
  onViewModeChange,
  onSelectNote,
  showFocusMode,
  onShowFocusMode,
  workspaceTitle = "My Workspace",
  onUpdateWorkspaceTitle,
  onShowProductivityDashboard,
  createThread,
  onSelectThread,
  isMobile = false,
  onMobileBackToDirectory,
  currentWorkspaceId
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(workspaceTitle);

  // Update title value when prop changes
  React.useEffect(() => {
    setTitleValue(workspaceTitle);
  }, [workspaceTitle]);

  // Update tab titles when notes or threads change
  React.useEffect(() => {
    openTabs.forEach(tab => {
      if (tab.type === 'note') {
        const note = notes.find(n => n.id === tab.content?.id);
        if (note) {
          const newTitle = extractCleanTitle(note.content) || 'Untitled';
          if (newTitle !== tab.title) {
            onUpdateTabTitle(tab.id, newTitle);
          }
        }
      } else if (tab.type === 'thread') {
        const thread = threads.find(t => t.id === tab.content?.id);
        if (thread) {
          const newTitle = thread.title || 'Untitled Thread';
          if (newTitle !== tab.title) {
            onUpdateTabTitle(tab.id, newTitle);
          }
        }
      }
    });
  }, [notes, threads, openTabs, onUpdateTabTitle]);

  const handleTitleClick = () => {
    setEditingTitle(true);
  };

  const handleTitleSubmit = () => {
    if (onUpdateWorkspaceTitle && titleValue.trim()) {
      onUpdateWorkspaceTitle(titleValue.trim());
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleValue(workspaceTitle);
      setEditingTitle(false);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuAction = async (type: Note['type']) => {
    if (contextMenu) {
      // Calculate position relative to canvas
      const canvasRect = document.querySelector('.canvas-content')?.getBoundingClientRect();
      if (canvasRect) {
        const x = contextMenu.x - canvasRect.left;
        const y = contextMenu.y - canvasRect.top;
        await onAddNote(type, { x: Math.max(20, x), y: Math.max(20, y) });
      }
    }
    setContextMenu(null);
  };

  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: Note['type']) => {
    const iconProps = { size: 16, color: 'var(--vscode-text-muted)' };

    switch (type) {
      case 'todo': return <CheckSquare {...iconProps} />;
      case 'folder': return <Folder {...iconProps} />;
      case 'webview': return <Monitor {...iconProps} />;
      case 'voice': return <Mic {...iconProps} />;
      case 'sketch': return <PenTool {...iconProps} />;
      case 'scan': return <Camera {...iconProps} />;
      case 'media': return <Image {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  const getThreadNotes = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return [];

    return notes
      .filter(note => thread.noteIds.includes(note.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const renderMainContent = () => {
    if (showFocusMode && selectedNote) {
      return (
        <FocusMode
          note={selectedNote}
          onUpdate={onUpdateNote}
          onClose={() => onShowFocusMode(false)}
        />
      );
    }

    // Show folder contents when a folder is selected
    if (selectedFolderId && !selectedNote && !selectedThread) {
      const selectedFolder = notes.find(n => n.id === selectedFolderId);
      const folderContents = notes.filter(note => note.parentId === selectedFolderId && !note.isArchived);

      return (
        <div className="folder-contents-view">
          <div className="folder-header">
            <button className="ms-button secondary" onClick={onBackToCanvas}>
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="folder-info">
              <Folder size={20} color="var(--copilot-primary)" />
              <h2 className="folder-title">
                {selectedFolder ? (selectedFolder.content.split('\n')[0] || 'Untitled Folder') : 'Folder'}
              </h2>
            </div>
          </div>

          <div className="folder-contents-section">
            {folderContents.length === 0 ? (
              <div className="empty-state">
                <Folder size={48} />
                <h3>This folder is empty</h3>
                <p>Add notes to see them here</p>
                <button
                  className="ms-button"
                  onClick={async () => {
                    if (selectedFolderId) {
                      const newNote = await onAddNote('note');
                      onUpdateNote(newNote.id, { parentId: selectedFolderId });
                    }
                  }}
                >
                  <Plus size={16} />
                  Add Doc
                </button>
              </div>
            ) : (
              <div className="vs-grid-view">
                {folderContents.map(note => (
                  <div
                    key={note.id}
                    className="fluent-card note-card"
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="note-card-header">
                      <div className="note-card-icon">
                        {getTypeIcon(note.type)}
                      </div>
                      <span className="note-card-title">
                        {note.content.split('\n')[0] || 'Untitled'}
                      </span>
                    </div>
                    <div className="note-card-preview">
                      {note.content.substring(0, 100) || 'Empty note'}
                    </div>
                    <div className="note-card-footer">
                      <span className="note-card-date">
                        {formatRelativeTime(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show welcome tab when no note, thread, or folder is selected
    if (!selectedNote && !selectedThread && !selectedFolderId) {
      return (
        <WelcomeTab
          notes={notes}
          threads={threads}
          onAddNote={onAddNote}
          onCreateThread={(title, description, noteIds) => {
            // Create thread and switch to thread view
            const newThread = createThread(title, description, noteIds);
            onSelectThread(newThread.id);
            return newThread;
          }}
          onSelectNote={onSelectNote}
          onShowProductivityDashboard={onShowProductivityDashboard}
        />
      );
    }

    switch (mainView) {
      case 'note':
        if (!selectedNote) return renderCanvas();

        return (
          <div className="vs-editor-view">
            {renderNoteComponent(selectedNote)}
          </div>
        );

      case 'thread':
        // Thread view is hidden for now
        return renderCanvas();

      case 'canvas':
      default:
        return renderCanvas();
    }
  };

  const renderCanvas = () => {
    const canvasNotes = notes.filter(note => !note.isArchived);

    // If in grid view, show grid creation and management UI
    if (viewMode === 'grid') {
      return (
        <div className="vs-grid-section">
          <div className="grids-container">
            {notes.filter(n => n.type === 'grid').map(gridNote => (
              <GridComponent
                key={gridNote.id}
                note={gridNote}
                notes={notes}
                onUpdate={onUpdateNote}
                onDelete={onDeleteNote}
                onAddNote={onAddNote}
                onCreateNote={onCreateNote}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="vs-workspace-container">
        <div className="vs-workspace-content">
          {(viewMode as ViewMode) === 'grid' ? (
            <div className="vs-grid-view">
              {canvasNotes.length === 0 ? (
                <div className="empty-state">
                  <Grid3X3 size={48} />
                  <h3>No notes yet</h3>
                  <p>Create your first note to see it here</p>
                  <button
                    className="ms-button"
                    onClick={() => onAddNote('note')}
                  >
                    <Plus size={16} />
                    Create Note
                  </button>
                </div>
              ) : (
                <div className="vs-grid-container">
                  {canvasNotes.map(note => (
                    <div
                      key={note.id}
                      className={`fluent-card note-card ${selectedNote?.id === note.id ? 'selected' : ''}`}
                      onClick={() => onSelectNote(note.id)}
                    >
                      <div className="note-card-header">
                        <div className="note-card-icon">
                          {getTypeIcon(note.type)}
                        </div>
                        <span className="note-card-title">
                          {extractCleanTitle(note.content) || 'Untitled'}
                        </span>
                      </div>
                      <div className="note-card-content">
                        {renderNoteComponent(note)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (viewMode as ViewMode) === 'list' ? (
            <div className="vs-list-view">
              {canvasNotes.length === 0 ? (
                <div className="empty-state">
                  <List size={48} />
                  <h3>No notes in list view</h3>
                  <p>Create your first note to see it here</p>
                  <button
                    className="ms-button"
                    onClick={() => onAddNote('note')}
                  >
                    <Plus size={16} />
                    Create Note
                  </button>
                </div>
              ) : (
                canvasNotes.map(note => (
                  <div
                    key={note.id}
                    className={`fluent-card list-note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                    onClick={() => onSelectNote(note.id)}
                  >
                    <div className="list-note-main">
                      <div className="list-note-header">
                        <div className="note-type-indicator">
                          {getTypeIcon(note.type)}
                        </div>
                        <span className="list-note-title">
                          {extractCleanTitle(note.content) || 'Untitled'}
                        </span>
                        <span className="list-note-date">
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                      </div>
                      <div className="list-note-preview">
                        {note.content.substring(50, 200) || 'Empty note'}
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="list-note-tags">
                          {note.tags.slice(0, 5).map(tag => (
                            <span key={tag} className="fluent-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const handleEnhanceNote = (noteId: string) => {
    // Convert basic note to enhanced note by adding enhanced properties
    onUpdateNote(noteId, {
      isEnhanced: true,
      metadata: { ...selectedNote?.metadata, enhancedAt: new Date().toISOString() }
    });
  };

  const renderNoteComponent = (note: Note) => {
    const commonProps = {
      note,
      onUpdate: onUpdateNote,
      onDelete: onDeleteNote
    };

    try {
      switch (note.type) {
        case 'voice':
          return <VoiceNote {...commonProps} />;
        case 'sketch':
          return <SketchNote {...commonProps} currentWorkspaceId={currentWorkspaceId} />;
        case 'scan':
          return <ScanNote {...commonProps} currentWorkspaceId={currentWorkspaceId} />;
        case 'media':
          return <MediaNote {...commonProps} />;
        case 'webview':
          return <WebviewNote {...commonProps} onCreateNote={onCreateNote} currentWorkspaceId={currentWorkspaceId} />;
        case 'grid':
          return (
            <GridComponent
              {...commonProps}
              notes={notes}
              onAddNote={onAddNote}
              onCreateNote={onCreateNote}
            />
          );
        case 'spreadsheet':
          return (
            <SpreadsheetEditor
              initialData={note.content ? JSON.parse(note.content) : undefined}
              fileName={note.metadata?.title || note.content?.split('\n')[0] || 'Spreadsheet'}
              onFileNameChange={(name) => onUpdateNote(note.id, { metadata: { ...note.metadata, title: name } })}
              onSave={(data) => onUpdateNote(note.id, { content: JSON.stringify(data) })}
            />
          );
        case 'todo':
          // Use dedicated TodoNote component for todo notes
          return (
            <TodoNote
              {...commonProps}
              onEnhance={handleEnhanceNote}
              onFocus={() => onShowFocusMode(true)}
              fullView={mainView === 'note' && selectedNote?.id === note.id}
            />
          );
        case 'note':
        case 'folder':
          // Check if note is explicitly enhanced
          if (note.isEnhanced) {
            return <EnhancedNote {...commonProps} currentWorkspaceId={currentWorkspaceId} />;
          }
          return (
            <BasicNote
              {...commonProps}
              onFocus={() => onShowFocusMode(true)}
              fullView={true}
            />
          );
        default:
          return (
            <BasicNote
              {...commonProps}
              onFocus={() => onShowFocusMode(true)}
            />
          );
      }
    } catch (error) {
      console.error('Error rendering note component:', error);
      return (
        <div className="error-state">
          <FileText size={48} color="var(--vscode-text-muted)" />
          <h3>Error loading note</h3>
          <p>Unable to display this note. Try refreshing the page.</p>
          <button
            className="ms-button secondary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }
  };

  return (
    <div className="main-section">
      <TabContainer
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
      >
        {renderMainContent()}
      </TabContainer>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="vs-context-menu"
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 10000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-header">Create Document</div>
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('note')}
            >
              <FileText size={16} />
              Document
            </button>
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('todo')}
            >
              <CheckSquare size={16} />
              Task List
            </button>
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('folder')}
            >
              <Folder size={16} />
              Folder
            </button>
            <hr className="context-menu-separator" />
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('voice')}
            >
              <Mic size={16} />
              Voice Note
            </button>
            <button
              className="context-menu-item"
              onClick={() => handleContextMenuAction('sketch')}
            >
              <PenTool size={16} />
              Sketch
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MainSection;
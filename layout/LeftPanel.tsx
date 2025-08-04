import React, { useState } from 'react';
import {
  ChevronLeft,
  MessageSquare,
  Clock,
  Folder,
  ChevronDown,
  ChevronRight,
  Home,
  User,
  Settings,
  Users
} from 'lucide-react';
import { Note } from '../../types/Note';
import { Thread } from '../../types/Thread';
import WorkspaceExplorer from './WorkspaceExplorer';
import ThreadsList from './ThreadsList';
import TodosList from './TodosList';
import './LeftPanel.css';

interface LeftPanelProps {
  width: number;
  collapsed: boolean;
  className?: string;
  sections: {
    explorer: boolean;
    threads: boolean;
    todos: boolean;
  };
  notes: Note[];
  threads: Thread[];
  filteredNotes: Note[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  selectedThreadId: string | null;
  onToggleCollapse: () => void;
  onToggleSection: (section: keyof LeftPanelProps['sections']) => void;
  onSelectNote: (noteId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onSelectThread: (threadId: string) => void;
  onAddNote: (type: Note['type'], parentId?: string) => Promise<Note>;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onCreateThread: (title: string, description?: string, noteIds?: string[]) => Thread;
  onUpdateThread: (id: string, updates: Partial<Thread>) => void;
  onResize: (width: number) => void;
  workspaceName?: string;
  user?: any;
  onShowCreateWorkspace?: () => void;
  onShowCollaboration?: () => void;
  // WebView props for VerticalActionSidebar
  onCreateWebView?: () => Promise<void>;
  onOpenWebViewOverlay?: () => void;
  showWebViewPanel?: boolean;
  onToggleWebView?: (show: boolean) => void;
  workspaces: { id: string; name: string }[]; // Add this prop
  onSelectWorkspace: (workspaceId: string) => void; // Callback for selecting a workspace
  onOpenSpreadsheet?: () => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  width,
  collapsed,
  className = '',
  sections,
  notes,
  threads,
  filteredNotes,
  selectedNoteId,
  selectedFolderId,
  selectedThreadId,
  onToggleCollapse,
  onToggleSection,
  onSelectNote,
  onSelectFolder,
  onSelectThread,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onCreateThread,
  onUpdateThread,
  onResize,
  workspaceName,
  user,
  onShowCreateWorkspace,
  onShowCollaboration,
  onCreateWebView,
  onOpenWebViewOverlay,
  showWebViewPanel,
  onToggleWebView,
  workspaces,
  onSelectWorkspace,
  onOpenSpreadsheet
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleAddNote = async (type: Note['type'], parentId?: string) => {
    return await onAddNote(type, parentId);
  };

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.workspace-selector')) {
        setShowWorkspaceMenu(false);
      }
      if (!target.closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (collapsed) {
    return (
      <div className="left-panel collapsed">
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          title="Expand panel"
          aria-label="Expand left panel"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="collapsed-icons">
          <div
            className="collapsed-icon"
            title="Explorer"
            onClick={() => onToggleSection('explorer')}
            role="button"
            tabIndex={0}
          >
            <Folder size={16} />
          </div>
          {/* Threads icon - Hidden for now */}
          {false && (
            <div
              className="collapsed-icon"
              title="Threads"
              onClick={() => onToggleSection('threads')}
              role="button"
              tabIndex={0}
              style={{ display: 'none' }}
            >
              <MessageSquare size={16} />
            </div>
          )}
          <div
            className="collapsed-icon"
            title="Todos"
            onClick={() => onToggleSection('todos')}
            role="button"
            tabIndex={0}
          >
            <Clock size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`left-panel ${className} chatgpt-enhanced`} style={{ width }}>
      {/* Header Section - Logo and Workspace */}
      <div className="panel-header">
        <div className="logo-section">
          <span style={{ color: 'black', fontWeight: '600', fontSize: 16 }}>
            Suitenote
          </span>
        </div>

        <div className="workspace-selector">
          <span>{workspaceName || "My Desk"}</span>
          <button
            className="workspace-dropdown-btn"
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          >
            <ChevronDown size={12} />
          </button>
          {showWorkspaceMenu && (
            <div className="workspace-dropdown">
              <div className="workspace-dropdown-header">Workspaces</div>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  className={`workspace-item ${workspace.name === workspaceName ? "active" : ""
                    }`}
                  onClick={() => {
                    onSelectWorkspace(workspace.id);
                    setShowWorkspaceMenu(false);
                  }}
                >
                  <Home size={14} />
                  <span>{workspace.name}</span>
                </button>
              ))}
              <div className="workspace-dropdown-separator" />
              <button
                className="workspace-item new-workspace"
                onClick={onShowCreateWorkspace}
              >
                <span>+ New Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="vs-panel-sections">
        {/* Explorer Section */}
        {sections.explorer && (
          <div className="vs-panel-section explorer-section">
            <div className="section-content">
              <WorkspaceExplorer
                notes={notes}
                selectedNoteId={selectedNoteId}
                selectedFolderId={selectedFolderId}
                onSelectNote={onSelectNote}
                onSelectFolder={onSelectFolder}
                onAddNote={handleAddNote}
                onUpdateNote={onUpdateNote}
                onDeleteNote={onDeleteNote}
                workspaceName={workspaceName}
                onCreateWebView={onCreateWebView}
                onOpenWebViewOverlay={onOpenWebViewOverlay}
                showWebViewPanel={showWebViewPanel}
                onToggleWebView={onToggleWebView}
                onOpenSpreadsheet={onOpenSpreadsheet}
              />
            </div>
          </div>
        )}

        {/* Threads Section - Hidden for now */}
        {false && sections.threads && (
          <div className="vs-panel-section threads-section" style={{ display: 'none' }}>
            <div className="section-header">
              <div className="section-title">
                <MessageSquare size={12} />
                <span>Threads</span>
              </div>
              <div className="section-controls">
                <span className="section-count">
                  {threads.length}
                </span>
              </div>
            </div>
            <div className="section-content">
              <ThreadsList
                threads={threads}
                selectedThreadId={selectedThreadId}
                onSelectThread={onSelectThread}
                onCreateThread={onCreateThread}
                onUpdateThread={onUpdateThread}
              />
            </div>
          </div>
        )}

        {/* Todos Section */}
        {sections.todos && (
          <div className="vs-panel-section todos-section">
            <div className="section-header">
              <div className="section-title">
                <Clock size={12} />
                <span>Tasks</span>
              </div>
              <div className="section-controls">
                <span className="section-count">
                  {notes.filter(note => note.type === 'todo' && !note.isArchived).length}
                </span>
              </div>
            </div>
            <div className="section-content">
              <TodosList
                todoNotes={notes.filter(note => note.type === 'todo' && !note.isArchived)}
                selectedNoteId={selectedNoteId}
                onSelectNote={onSelectNote}
                onAddNote={async (type, position, color) => {
                  return await onAddNote(type);
                }}
                onUpdateNote={onUpdateNote}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Section - User Info */}
      <div className="panel-footer">
        <div className="user-menu">
          <button
            className="user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User size={16} />
            <span className="user-name">
              {user?.profile?.name || user?.phoneNumber || 'User'}
            </span>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <div className="user-details">
                  <div className="user-display-name">
                    {user?.profile?.name || 'User'}
                  </div>
                  <div className="user-phone">
                    {user?.phoneNumber}
                  </div>
                </div>
              </div>
              <hr />
              <button className="dropdown-item">
                <Settings size={14} />
                Settings
              </button>
              <button className="dropdown-item">
                <User size={14} />
                Profile
              </button>
              <button className="dropdown-item" onClick={onShowCollaboration}>
                <Users size={14} />
                Invite to Workspace
              </button>
              <hr />
              <button className="dropdown-item danger">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={`resize-handle vertical ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-label="Resize left panel"
        tabIndex={0}
      />
    </div>
  );
};

export default LeftPanel;
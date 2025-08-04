import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useNotes } from '../../hooks/useNotes';
import { useThreads } from '../../hooks/useThreads';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import LeftPanel from './LeftPanel';
import MainSection from './MainSection';
import RightPanel from './RightPanel';
import BottomWebViewPanel from './BottomWebViewPanel';
import WebViewOverlay from '../webview/WebViewOverlay';
import CalendarModal from '../CalendarModal';
import TagManager from '../TagManager';
import ArchiveManager from '../ArchiveManager';
import ProductivityDashboard from '../ProductivityDashboard';
import CollaborationPanel from '../CollaborationPanel';
import WorkspaceCollaborationModal from '../workspace/WorkspaceCollaborationModal';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';
import SpreadsheetEditor from '../SpreadsheetEditor';
import { Note } from '../../types/Note';
import { Thread } from '../../types/Thread';
import { TabItem } from './TabContainer';
import apiService from '../../services/apiService';
import './MainLayout.css';
export type ViewMode = 'canvas' | 'list' | 'grid';
export type MainView = 'canvas' | 'note' | 'thread' | 'focus';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { state: authState } = useAuth();
  const {
    currentWorkspace,
    workspaces,
    switchWorkspace,
    createWorkspace: createWorkspaceInContext,
    isLoading: workspaceLoading,
    error: workspaceError
  } = useWorkspace();

  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    searchTerm,
    setSearchTerm,
    filteredNotes,
    archiveNote,
    isLoading
  } = useNotes(currentWorkspace?.id);

  const {
    threads,
    createThread,
    updateThread,
    deleteThread,
    addNoteToThread,
    removeNoteFromThread
  } = useThreads(currentWorkspace?.id);

  // Layout state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [mainView, setMainView] = useState<MainView>('note');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);

  // Panel section states
  const [leftSections, setLeftSections] = useState({
    explorer: true,
    threads: true,
    todos: false
  });
  const [rightSections, setRightSections] = useState({
    ai: true,
    analytics: false,
    organization: false
  });

  // Modal/overlay states
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showArchiveManager, setShowArchiveManager] = useState(false);
  const [showProductivityDashboard, setShowProductivityDashboard] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showWebViewPanel, setShowWebViewPanel] = useState(false);
  const [showWebViewOverlay, setShowWebViewOverlay] = useState(false);
  const [webViewOverlaySearchQuery, setWebViewOverlaySearchQuery] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);

  // Mobile-specific states
  const [isMobile, setIsMobile] = useState(false);
  const [mobileLeftPanelOpen, setMobileLeftPanelOpen] = useState(false);
  const [mobileAIPanelOpen, setMobileAIPanelOpen] = useState(false);
  const [mobileShowingFile, setMobileShowingFile] = useState(false);

  // Tab state
  const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Status states
  const [isRecording, setIsRecording] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;
  const selectedFolder = selectedFolderId ? notes.find(n => n.id === selectedFolderId) : null;
  const selectedThread = selectedThreadId ? threads.find(t => t.id === selectedThreadId) : null;

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for webview search events from AI panel
  React.useEffect(() => {
    const handleOpenWebViewSearch = (event: CustomEvent) => {
      const query = event.detail?.query || '';
      setWebViewOverlaySearchQuery(query);
      setShowWebViewOverlay(true);
    };

    window.addEventListener('open-webview-search', handleOpenWebViewSearch as EventListener);
    return () => window.removeEventListener('open-webview-search', handleOpenWebViewSearch as EventListener);
  }, []);

  // Workspace error handling
  React.useEffect(() => {
    if (workspaceError) {
      console.error('[MainLayout] Workspace error:', workspaceError);
    }
  }, [workspaceError]);

  // Note operations with sync status
  const handleAddNote = async (type: Note['type'], parentIdOrPosition?: string | { x: number; y: number }, color?: Note['color']) => {
    try {
      setSyncStatus('syncing');

      let position: { x: number; y: number } | undefined;
      let parentId: string | undefined;

      // Handle overloaded parameter
      if (typeof parentIdOrPosition === 'string') {
        parentId = parentIdOrPosition;
        // Generate a position for folder-based notes
        position = {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100
        };
      } else {
        position = parentIdOrPosition;
      }

      const newNote = await addNote(type, position, color);

      // Set parent relationship if creating in a folder
      if (parentId) {
        updateNote(newNote.id, { parentId });
      }

      if (type === 'folder') {
        // For folders, don't change main view or select as note
        // The folder will be selected in the left panel by WorkspaceExplorer
      } else {
        setSelectedNoteId(newNote.id);
        setMainView('note');
        // Automatically open the new note in a tab
        openTab('note', newNote);
      }
      setSyncStatus('synced');
      return newNote;
    } catch (error) {
      setSyncStatus('offline');
      throw error;
    }
  };

  const handleSelectNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      openTab('note', note);
    }

    // On mobile, show file and close left panel
    if (isMobile) {
      setMobileShowingFile(true);
      setMobileLeftPanelOpen(false);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    // Don't change main view when selecting folders - keep current view
  };

  const handleSelectThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      openTab('thread', thread);
    }

    // On mobile, show thread and close left panel
    if (isMobile) {
      setMobileShowingFile(true);
      setMobileLeftPanelOpen(false);
    }
  };

  const handleCreateNote = (content: string, url?: string) => {
    const position = {
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    };

    handleAddNote('note', position).then(newNote => {
      updateNote(newNote.id, {
        content,
        tags: url ? [`@${new URL(url).hostname}`] : []
      });
    });
  };

  const handleAddToThread = async (noteId: string) => {
    // Show thread selection or create new thread
    const threadTitle = prompt('Enter thread title:');
    if (threadTitle) {
      const newThread = await createThread(threadTitle, undefined, [noteId]);
      updateNote(noteId, { threadId: newThread.id });
      setSelectedThreadId(newThread.id);
      setMainView('thread');
    }
  };

  const handleInviteUser = async (email: string, role: 'viewer' | 'editor' | 'admin' = 'viewer') => {
    try {
      if (!currentWorkspace?.id) {
        throw new Error('No current workspace found');
      }

      await apiService.inviteToWorkspace(currentWorkspace.id, email.trim(), role);
      console.log(`Invitation sent to ${email} with ${role} access!`);

    } catch (error) {
      console.error('Failed to invite user:', error);
      alert(`Failed to send invitation: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleCreateWorkspace = async (name: string, description?: string) => {
    try {
      const newWorkspace = await createWorkspaceInContext(name, description);
      setShowCreateWorkspace(false);

      // Switch to the new workspace
      await switchWorkspace(newWorkspace.id);

      console.log(`Workspace "${name}" created successfully!`);

    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert(`Failed to create workspace: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  // Mobile handlers
  const handleMobileBackToDirectory = () => {
    setMobileShowingFile(false);
    setSelectedNoteId(null);
    setSelectedThreadId(null);
    setMainView('canvas');
  };

  const handleMobileToggleLeftPanel = () => {
    setMobileLeftPanelOpen(!mobileLeftPanelOpen);
  };

  const handleMobileToggleAIPanel = () => {
    setMobileAIPanelOpen(!mobileAIPanelOpen);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewNote: () => handleAddNote('note'),
    onSearch: () => {
      // Open search modal or focus search functionality
      // Since we removed the search bar, we could implement a search modal here
      console.log('Search functionality - could open search modal');
    },
    onCalendar: () => setShowCalendar(true)
  });

  // Panel resize handlers
  const handleLeftPanelResize = (width: number) => {
    setLeftPanelWidth(Math.max(280, Math.min(500, width)));
  };

  const handleRightPanelResize = (width: number) => {
    setRightPanelWidth(Math.max(280, Math.min(500, width)));
  };

  const toggleLeftSection = (section: keyof typeof leftSections) => {
    setLeftSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleRightSection = (section: keyof typeof rightSections) => {
    setRightSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Tab management functions
  const createTabId = (type: 'note' | 'thread' | 'folder', id: string) => `${type}-${id}`;

  const getTabTitle = (type: 'note' | 'thread' | 'folder', content: Note | Thread | null) => {
    if (!content) return 'Untitled';

    if (type === 'thread') {
      const thread = content as Thread;
      return thread.title || 'Untitled Thread';
    } else {
      const note = content as Note;
      const firstLine = note.content.split('\n')[0];
      return firstLine || 'Untitled';
    }
  };

  const openTab = (type: 'note' | 'thread' | 'folder', content: Note | Thread | null) => {
    if (!content) return;

    const tabId = createTabId(type, content.id);
    const existingTab = openTabs.find(tab => tab.id === tabId);

    if (existingTab) {
      // Tab already exists, just switch to it
      setActiveTabId(tabId);
    } else {
      // Create new tab
      const newTab: TabItem = {
        id: tabId,
        type,
        title: getTabTitle(type, content),
        content,
        isModified: false
      };

      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);
    }
  };

  const closeTab = (tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);

      // If closing the active tab, switch to another tab or clear selection
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex(tab => tab.id === tabId);
        if (newTabs.length > 0) {
          // Switch to the next tab, or previous if it was the last one
          const newActiveIndex = currentIndex < newTabs.length ? currentIndex : newTabs.length - 1;
          const newActiveTab = newTabs[newActiveIndex];
          setActiveTabId(newActiveTab.id);

          // Sync the selected state with the new active tab
          if (newActiveTab.type === 'note') {
            setSelectedNoteId(newActiveTab.content?.id || null);
            setSelectedThreadId(null);
            setSelectedFolderId(null);
            setMainView('note');
          } else if (newActiveTab.type === 'thread') {
            setSelectedThreadId(newActiveTab.content?.id || null);
            setSelectedNoteId(null);
            setSelectedFolderId(null);
            setMainView('thread');
          } else if (newActiveTab.type === 'folder') {
            setSelectedFolderId(newActiveTab.content?.id || null);
            setSelectedNoteId(null);
            setSelectedThreadId(null);
            setMainView('canvas');
          }
        } else {
          setActiveTabId(null);
          setMainView('canvas');
          setSelectedNoteId(null);
          setSelectedThreadId(null);
          setSelectedFolderId(null);
        }
      }

      return newTabs;
    });
  };

  const switchToTab = (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    setActiveTabId(tabId);

    // Update the main view state based on the tab
    if (tab.type === 'note') {
      setSelectedNoteId(tab.content?.id || null);
      setSelectedThreadId(null);
      setSelectedFolderId(null);
      setMainView('note');
    } else if (tab.type === 'thread') {
      setSelectedThreadId(tab.content?.id || null);
      setSelectedNoteId(null);
      setSelectedFolderId(null);
      setMainView('thread');
    } else if (tab.type === 'folder') {
      setSelectedFolderId(tab.content?.id || null);
      setSelectedNoteId(null);
      setSelectedThreadId(null);
      setMainView('canvas');
    }
  };

  const updateTabTitle = (tabId: string, newTitle: string) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, title: newTitle } : tab
    ));
  };

  const markTabAsModified = (tabId: string, isModified: boolean) => {
    setOpenTabs(prev => prev.map(tab =>
      tab.id === tabId ? { ...tab, isModified } : tab
    ));
  };

  // Create a single webview for footer button
  const handleCreateWebView = async () => {
    try {
      setSyncStatus('syncing');
      const newWebView = await addNote('webview', { x: 0, y: 0 });
      setSelectedNoteId(newWebView.id);
      setMainView('note');
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to create web view:', error);
      setSyncStatus('offline');
    }
  };

  // Open full-screen webview overlay
  const handleOpenWebViewOverlay = () => {
    setShowWebViewOverlay(true);
  };

  // Handle note creation from webview overlay
  const handleCreateNoteFromWebView = async (content: string, url?: string) => {
    try {
      setSyncStatus('syncing');
      const newNote = await addNote('note', { x: 0, y: 0 });

      // Update the note with content and URL metadata
      await updateNote(newNote.id, {
        content,
        url,
        metadata: url ? {
          domain: new URL(url).hostname,
          title: content.slice(0, 50) || new URL(url).hostname
        } : undefined
      });

      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to create note from webview:', error);
      setSyncStatus('offline');
    }
  };

  const handleSelectWorkspace = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
  };

  const handleOpenSpreadsheet = () => {
    setShowSpreadsheet(true);
  };

  return (
    <div className="vs-layout fade-in">
      {/* VS Code Title Bar */}
      <div className="vs-title-bar">
        <div className="title-bar-content">
          <span className="app-title">Suitenote</span>
          <span className="workspace-indicator">
            {currentWorkspace?.name || 'My Workspace'}
          </span>
          <div className="copilot-badge">
            <div className="copilot-indicator"></div>
            Copilot
          </div>
        </div>
      </div>

      {/* VS Code Activity Bar */}
      <div className="vs-activity-bar">
        <div
          className={`activity-item ${!leftPanelCollapsed ? 'active' : ''}`}
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          title="Explorer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h7v2H3v14h7v2H3c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm11 4l4 4-4 4v-3H9v-2h5V7z" />
          </svg>
        </div>

        <div
          className="activity-item"
          title="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>

        <div
          className={`activity-item ${!rightPanelCollapsed ? 'active' : ''}`}
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          title="Copilot"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        <div
          className="activity-item"
          title="Extensions"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
          </svg>
        </div>
      </div>

      {/* Mobile Navigation Toggle */}
      {isMobile && (
        <button
          className="mobile-nav-toggle"
          onClick={handleMobileToggleLeftPanel}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileLeftPanelOpen && (
        <div
          className="mobile-overlay visible"
          onClick={() => setMobileLeftPanelOpen(false)}
        />
      )}

      <LeftPanel
        width={leftPanelWidth}
        collapsed={leftPanelCollapsed}
        className={isMobile && mobileLeftPanelOpen ? 'mobile-open' : ''}
        sections={leftSections}
        notes={notes}
        threads={threads}
        filteredNotes={filteredNotes}
        selectedNoteId={selectedNoteId}
        selectedFolderId={selectedFolderId}
        selectedThreadId={selectedThreadId}
        onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        onToggleSection={toggleLeftSection}
        onSelectNote={handleSelectNote}
        onSelectFolder={handleSelectFolder}
        onSelectThread={handleSelectThread}
        onAddNote={handleAddNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        onCreateThread={(
          title: string,
          description?: string,
          noteIds?: string[]
        ) => {
          // Synchronously return a Thread by blocking on the async function (not recommended for real UI, but matches expected signature)
          let thread: Thread | undefined = undefined;
          createThread(title, description, noteIds).then(t => {
            thread = t;
          });
          // @ts-ignore
          return thread as Thread;
        }}
        onUpdateThread={updateThread}
        onResize={handleLeftPanelResize}
        workspaceName={currentWorkspace?.name || 'My Workspace'}
        user={authState.user}
        onShowCreateWorkspace={() => setShowCreateWorkspace(true)}
        onShowCollaboration={() => setShowCollaboration(true)}
        onCreateWebView={handleCreateWebView}
        onOpenWebViewOverlay={handleOpenWebViewOverlay}
        showWebViewPanel={showWebViewPanel}
        onToggleWebView={setShowWebViewPanel}
        workspaces={workspaces}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenSpreadsheet={handleOpenSpreadsheet}
      />

      {/* Main Section - show directory on mobile when no file selected */}
      {isMobile && !mobileShowingFile ? (
        <div className="main-section">
          {/* Show file directory as main view on mobile */}
          <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600' }}>Files</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notes.filter(note => !note.isArchived).map(note => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #c7c7c7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {note.type === 'todo' ? '☑️' :
                        note.type === 'folder' ? '📁' :
                          note.type === 'voice' ? '🎤' :
                            note.type === 'sketch' ? '✏️' :
                              note.type === 'scan' ? '📄' :
                                note.type === 'media' ? '🖼️' : '📝'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '16px', marginBottom: '4px' }}>
                        {note.content.split('\n')[0] || 'Untitled'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#888888' }}>
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MainSection
          viewMode={viewMode}
          mainView={mainView}
          notes={notes}
          selectedNote={selectedNote ?? null}
          selectedThread={selectedThread ?? null}
          selectedFolderId={selectedFolderId}
          threads={threads}
          openTabs={openTabs}
          activeTabId={activeTabId}
          onTabSelect={switchToTab}
          onTabClose={closeTab}
          onUpdateTabTitle={updateTabTitle}
          onMarkTabAsModified={markTabAsModified}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onArchiveNote={archiveNote}
          onAddNote={handleAddNote}
          onCreateNote={handleCreateNote}
          onAddToThread={handleAddToThread}
          onUpdateThread={updateThread}
          onAddNoteToThread={addNoteToThread}
          onRemoveNoteFromThread={removeNoteFromThread}
          onBackToCanvas={() => {
            if (isMobile) {
              handleMobileBackToDirectory();
            } else {
              setMainView('canvas');
              setSelectedNoteId(null);
              setSelectedThreadId(null);
              setSelectedFolderId(null);
            }
          }}
          onViewModeChange={setViewMode}
          onSelectNote={handleSelectNote}
          showFocusMode={showFocusMode}
          onShowFocusMode={setShowFocusMode}
          workspaceTitle={currentWorkspace?.name || 'My Workspace'}
          onUpdateWorkspaceTitle={(title) => {
            // Note: This would require implementing workspace title updates in the context
            console.log('Workspace title update requested:', title);
          }}
          onShowProductivityDashboard={() => setShowProductivityDashboard(true)}
          createThread={(
            title: string,
            description?: string,
            noteIds?: string[]
          ) => {
            // Synchronously return a Thread by blocking on the async function (not recommended for real UI, but matches expected signature)
            let thread: Thread | undefined = undefined;
            createThread(title, description, noteIds).then(t => {
              thread = t;
            });
            // @ts-ignore
            return thread as Thread;
          }}
          onSelectThread={handleSelectThread}
          isMobile={isMobile}
          onMobileBackToDirectory={handleMobileBackToDirectory}
          currentWorkspaceId={currentWorkspace?.id || 'default'}
        />
      )}

      {!isMobile && <RightPanel
        width={rightPanelWidth}
        collapsed={rightPanelCollapsed}
        sections={rightSections}
        notes={notes}
        selectedNote={selectedNote ?? null}
        selectedFolder={selectedFolder ?? null}
        onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        onToggleSection={toggleRightSection}
        onUpdateNote={updateNote}
        onCreateNote={handleCreateNote}
        onShowTagManager={() => setShowTagManager(true)}
        onShowArchiveManager={() => setShowArchiveManager(true)}
        onShowProductivityDashboard={() => setShowProductivityDashboard(true)}
        currentFileName={selectedNote ? (selectedNote.content.split('\n')[0] || 'Untitled') : ''}
        currentFileContent={selectedNote ? selectedNote.content : ''}
        onEditFile={(newContent) => {
          if (selectedNote) updateNote(selectedNote.id, { content: newContent });
        }}
      />}


      {/* Mobile AI FAB */}
      {isMobile && (
        <button
          className="mobile-ai-fab"
          onClick={handleMobileToggleAIPanel}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
        </button>
      )}

      {/* Mobile AI Panel */}
      {isMobile && (
        <div className={`mobile-ai-panel ${mobileAIPanelOpen ? 'open' : ''}`}>
          <div className="mobile-ai-header">
            <h2 className="mobile-ai-title">AI Assistant</h2>
            <button
              className="mobile-ai-close"
              onClick={() => setMobileAIPanelOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="mobile-ai-content">
            <RightPanel
              width={rightPanelWidth}
              collapsed={false}
              sections={rightSections}
              notes={notes}
              selectedNote={selectedNote ?? null}
              selectedFolder={selectedFolder ?? null}
              onToggleCollapse={() => { }}
              onToggleSection={toggleRightSection}
              onUpdateNote={updateNote}
              onCreateNote={handleCreateNote}
              onShowTagManager={() => setShowTagManager(true)}
              onShowArchiveManager={() => setShowArchiveManager(true)}
              onShowProductivityDashboard={() => setShowProductivityDashboard(true)}
              currentFileName={selectedNote ? (selectedNote.content.split('\n')[0] || 'Untitled') : ''}
              currentFileContent={selectedNote ? selectedNote.content : ''}
              onEditFile={(newContent) => {
                if (selectedNote) updateNote(selectedNote.id, { content: newContent });
              }}
            />
          </div>
        </div>
      )}


      {/* Bottom WebView Panel */}
      {!isMobile && showWebViewPanel && (
        <BottomWebViewPanel
          isOpen={showWebViewPanel}
          onToggle={setShowWebViewPanel}
          notes={notes}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onAddNote={handleAddNote}
          onCreateNote={handleCreateNote}
        />
      )}

      {/* Workspace Collaboration Modal */}
      {showCollaboration && selectedNote && (
        <CollaborationPanel
          note={selectedNote}
          onUpdate={updateNote}
          onClose={() => setShowCollaboration(false)}
          currentWorkspaceId={currentWorkspace?.id || null}
        />
      )}

      {/* Workspace Collaboration Modal */}
      {showCollaboration && !selectedNote && currentWorkspace && (
        <WorkspaceCollaborationModal
          workspaceId={currentWorkspace.id}
          workspaceName={currentWorkspace.name}
          onClose={() => setShowCollaboration(false)}
        />
      )}

      {/* Debug: Show modal even without workspace ID if collaboration is requested */}
      {showCollaboration && !selectedNote && !currentWorkspace && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          <p>Workspace not loaded yet. Current workspace: {currentWorkspace?.name || 'None'}</p>
          <p>Auth token: {localStorage.getItem('auth_token') ? 'Present' : 'Missing'}</p>
          <p>Workspace loading: {workspaceLoading ? 'Yes' : 'No'}</p>
          <p>Workspace error: {workspaceError || 'None'}</p>
          <button onClick={() => setShowCollaboration(false)}>Close</button>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspace(false)}
          onCreateWorkspace={handleCreateWorkspace}
        />
      )}

      {/* Overlays and Modals */}
      {showCalendar && (
        <div className="modal-overlay">
          <CalendarModal notes={notes} onClose={() => setShowCalendar(false)} />
        </div>
      )}

      {showTagManager && (
        <TagManager
          notes={notes}
          onUpdateNote={updateNote}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {showArchiveManager && (
        <ArchiveManager
          notes={notes}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
          onClose={() => setShowArchiveManager(false)}
        />
      )}

      {showProductivityDashboard && (
        <ProductivityDashboard
          notes={notes}
          onClose={() => setShowProductivityDashboard(false)}
        />
      )}

      {/* Full-Screen WebView Overlay */}
      <WebViewOverlay
        isOpen={showWebViewOverlay}
        onClose={() => {
          setShowWebViewOverlay(false);
          setWebViewOverlaySearchQuery('');
        }}
        onCreateNote={handleCreateNoteFromWebView}
        initialSearchQuery={webViewOverlaySearchQuery}
      />

      {/* Spreadsheet Editor Modal */}
      {showSpreadsheet && (
        <SpreadsheetEditor
          isModal={true}
          onClose={() => setShowSpreadsheet(false)}
          onSave={(data) => {
            console.log('Spreadsheet saved:', data);
            // TODO: Optionally save as a note or to server
          }}
          title="New Spreadsheet"
        />
      )}

      {/* VS Code Status Bar */}
      <div className="vs-status-bar">
        <div className="status-left">
          <div className="status-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
            </svg>
            <span>main</span>
          </div>
          <div className="status-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>All changes saved</span>
          </div>
        </div>

        <div className="status-right">
          <div className="status-item">
            <span>{notes.length} files</span>
          </div>
          <div className="status-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>Copilot</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
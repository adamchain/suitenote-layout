import React, { useState } from 'react';
import { X, FileText, MessageSquare, Folder, CheckSquare, Mic, Camera, Globe, Edit3, Scan, Grid3X3 } from 'lucide-react';
import { Note } from '../../types/Note';
import { Thread } from '../../types/Thread';
import './TabContainer.css';

export interface TabItem {
  id: string;
  type: 'note' | 'thread' | 'folder';
  title: string;
  content: Note | Thread | null;
  isModified?: boolean;
}

interface TabContainerProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  children: React.ReactNode;
}

const TabContainer: React.FC<TabContainerProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  children
}) => {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  const getTabIcon = (tab: TabItem) => {
    switch (tab.type) {
      case 'note':
        const note = tab.content as Note;
        if (!note) return <FileText size={14} />;
        switch (note.type) {
          case 'todo': return <CheckSquare size={14} />;
          case 'folder': return <Folder size={14} />;
          case 'webview': return <Globe size={14} />;
          case 'voice': return <Mic size={14} />;
          case 'sketch': return <Edit3 size={14} />;
          case 'scan': return <Scan size={14} />;
          case 'media': return <Camera size={14} />;
          case 'grid': return <Grid3X3 size={14} />;
          default: return <FileText size={14} />;
        }
      case 'thread':
        return <MessageSquare size={14} />;
      case 'folder':
        return <Folder size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const handleTabClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    if (e.button === 1) {
      // Middle click - close tab
      onTabClose(tabId);
    } else {
      // Left click - select tab
      onTabSelect(tabId);
    }
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTab(tabId);
  };

  const handleDragLeave = () => {
    setDragOverTab(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    setDraggedTab(null);
    setDragOverTab(null);

    // Implement tab reordering logic here if needed
    // For now, we'll keep it simple
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  if (tabs.length === 0) {
    return <div className="vscode-tab-container no-tabs">{children}</div>;
  }

  return (
    <div className="vscode-tab-container chatgpt-enhanced">
      <div className="vscode-tab-bar">
        <div className="vscode-tab-list" role="tablist">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`vscode-tab ${activeTabId === tab.id ? 'active' : ''} ${draggedTab === tab.id ? 'dragging' : ''
                } ${dragOverTab === tab.id ? 'drag-over' : ''}`}
              onClick={(e) => handleTabClick(e, tab.id)}
              onMouseDown={(e) => handleTabClick(e, tab.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              role="tab"
              aria-selected={activeTabId === tab.id}
              tabIndex={0}
            >
              <div className="vscode-tab-icon">
                {getTabIcon(tab)}
              </div>
              <span className="vscode-tab-title">
                {tab.isModified && <span className="vscode-tab-modified">●</span>}
                {tab.title || 'Untitled'}
              </span>
              <button
                className="vscode-tab-close"
                onClick={(e) => handleCloseClick(e, tab.id)}
                title="Close tab"
                aria-label={`Close ${tab.title || 'Untitled'}`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="vscode-tab-content">
        {children}
      </div>
    </div>
  );
};

export default TabContainer;
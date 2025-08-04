import React from 'react';
import {
  Monitor,
  Maximize,
  FileText,
  Folder,
  CheckSquare,
  Mic,
  Grid3X3
} from 'lucide-react';
import { Note } from '../../types/Note';
import './VerticalActionSidebar.css';

interface VerticalActionSidebarProps {
  onAddNote: (type: Note['type']) => Promise<Note>;
  onCreateWebView: () => Promise<void>;
  onOpenWebViewOverlay: () => void;
  showWebViewPanel: boolean;
  onToggleWebView: (show: boolean) => void;
  onOpenSpreadsheet?: () => void;
}

const VerticalActionSidebar: React.FC<VerticalActionSidebarProps> = ({
  onAddNote,
  onCreateWebView,
  onOpenWebViewOverlay,
  showWebViewPanel,
  onToggleWebView,
  onOpenSpreadsheet
}) => {
  const actionButtons = [
    {
      type: 'note' as Note['type'],
      label: 'Doc',
      icon: <FileText size={18} color="#000" />
    },
    {
      type: 'spreadsheet',
      label: 'Spreadsheet',
      icon: <span className="action-icon spreadsheet-icon">📊</span>,
      isCustom: true
    },
    {
      type: 'folder' as Note['type'],
      label: 'Folder',
      icon: <Folder size={18} color="#000" />
    },
    {
      type: 'todo' as Note['type'],
      label: 'Todo',
      icon: <CheckSquare size={18} color="#000" />
    },
    {
      type: 'voice' as Note['type'],
      label: 'Voice',
      icon: <Mic size={18} color="#000" />
    },
    {
      type: 'grid' as Note['type'],
      label: 'Grid',
      icon: <Grid3X3 size={18} color="#000" />
    }
  ];

  const handleWebViewClick = async () => {
    if (!showWebViewPanel) {
      await onCreateWebView();
      onToggleWebView(true);
    } else {
      onToggleWebView(false);
    }
  };

  return (
    <div className="vertical-action-sidebar">
      <div className="vertical-action-buttons">
        {actionButtons.map((button) => (
          <button
            key={button.type}
            className="vertical-action-btn"
            onClick={() => {
              if (button.type === 'spreadsheet' && onOpenSpreadsheet) {
                onOpenSpreadsheet();
              } else if (!button.isCustom) {
                onAddNote(button.type as Note['type']);
              }
            }}
            title={`Create ${button.label}`}
          >
            {button.icon}
            <span className="action-tooltip">{button.label}</span>
          </button>
        ))}

        {/* Separator */}
        <div className="action-separator" />

        {/* WebView buttons */}
        <button
          className={`vertical-action-btn ${showWebViewPanel ? 'active' : ''}`}
          onClick={handleWebViewClick}
          title={showWebViewPanel ? "Close WebView Panel" : "Open WebView Panel"}
        >
          <Monitor size={18} />
          <span className="action-tooltip">WebView</span>
        </button>

        <button
          className="vertical-action-btn"
          onClick={onOpenWebViewOverlay}
          title="Open Full-Screen WebView"
        >
          <Maximize size={18} />
          <span className="action-tooltip">Full Web</span>
        </button>
      </div>
    </div>
  );
};

export default VerticalActionSidebar;
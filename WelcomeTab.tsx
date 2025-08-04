import React, { useState } from 'react';
import {
  Plus,
  FileText,
  Folder,
  CheckSquare,
  MessageSquare,
  Upload,
  Download,
  BarChart3,
  Clock,
  TrendingUp,
  Activity,
  Book,
  HelpCircle,
  ExternalLink,
  Settings,
  Zap,
  Target,
  Users,
  Calendar,
  Search,
  Archive,
  Tag,
  ChevronDown,
  MoreHorizontal,
  Grid3X3,
  List,
  Mic,
  PenTool,
  Camera,
  Image,
  Monitor
} from 'lucide-react';
import { Note } from '../../types/Note';
import { Thread } from '../../types/Thread';
import './WelcomeTab.css';

interface WelcomeTabProps {
  notes: Note[];
  threads: Thread[];
  onAddNote: (type: Note['type'], position?: { x: number; y: number }, color?: Note['color']) => Promise<Note>;
  onCreateThread: (title: string, description?: string, noteIds?: string[]) => Thread;
  onSelectNote: (noteId: string) => void;
  onDeleteNotes?: (noteIds: string[]) => void;
  onShowProductivityDashboard: () => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({
  notes,
  threads,
  onAddNote,
  onCreateThread,
  onSelectNote,
  onDeleteNotes,
  onShowProductivityDashboard
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const recentNotes = notes
    .filter(note => !note.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 15);

  const folderNotes = notes.filter(note => note.type === 'folder').slice(0, 6);

  const quickActions = [
    {
      icon: <FileText size={18} color="#000" />,
      title: 'Doc',
      action: () => onAddNote('note')
    },
    {
      icon: '📊',
      title: 'Spreadsheet',
      action: () => console.log('Open spreadsheet') // Spreadsheets now open as tabs
    },
    {
      icon: <Folder size={18} color="#000" />,
      title: 'Folder',
      action: () => onAddNote('folder')
    },
    {
      icon: <CheckSquare size={18} color="#000" />,
      title: 'Todo',
      action: () => onAddNote('todo')
    },
    {
      icon: <Mic size={18} color="#000" />,
      title: 'Voice',
      action: () => onAddNote('voice')
    },
    {
      icon: <Grid3X3 size={18} color="#000" />,
      title: 'Grid',
      action: () => onAddNote('grid')
    }
  ];

  const helpActions = [
    {
      icon: <Book size={16} />,
      title: 'Documentation',
      description: 'Learn how to use Suitenote',
      action: () => window.open('https://docs.suitenote.com', '_blank')
    },
    {
      icon: <HelpCircle size={16} />,
      title: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      action: () => console.log('Show shortcuts')
    },
    {
      icon: <ExternalLink size={16} />,
      title: 'Release Notes',
      description: 'What\'s new in this version',
      action: () => console.log('Show release notes')
    },
    {
      icon: <Settings size={16} />,
      title: 'Settings',
      description: 'Configure your workspace',
      action: () => console.log('Open settings')
    }
  ];

  const getTypeIcon = (type: Note['type']) => {
    const iconProps = { size: 14 };

    switch (type) {
      case 'folder': return <Folder {...iconProps} />;
      case 'todo': return <CheckSquare {...iconProps} />;
      case 'voice': return <Mic {...iconProps} />;
      case 'sketch': return <PenTool {...iconProps} />;
      case 'scan': return <Camera {...iconProps} />;
      case 'media': return <Image {...iconProps} />;
      case 'webview': return <Monitor {...iconProps} />;
      default: return <FileText {...iconProps} />;
    }
  };

  const formatDate = (dateString: string) => {
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

  const getReasonSuggested = (note: Note) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(note.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    const timeSinceUpdate = formatDate(note.updatedAt);

    if (daysSinceUpdate === 0) return `You opened • ${timeSinceUpdate}`;
    if (daysSinceUpdate < 7) return `You opened • ${timeSinceUpdate}`;
    return `You opened • ${note.updatedAt.split('T')[0]}`;
  };

  const getLocation = (note: Note) => {
    if (note.parentId) {
      const parent = notes.find(n => n.id === note.parentId);
      return parent ? parent.content.split('\n')[0] || 'Untitled Folder' : 'My Drive';
    }
    return 'My Drive';
  };

  const getTotalWords = () => {
    return notes.reduce((total, note) => {
      return total + (note.content?.split(/\s+/).filter(word => word.length > 0).length || 0);
    }, 0);
  };

  const getCompletedTodos = () => {
    const todoNotes = notes.filter(note => note.type === 'todo');
    let completed = 0;
    let total = 0;

    todoNotes.forEach(note => {
      const lines = note.content.split('\n');
      const todoLines = lines.filter(line => line.startsWith('☐ ') || line.startsWith('☑ '));
      total += todoLines.length;
      completed += lines.filter(line => line.startsWith('☑ ')).length;
    });

    return { completed, total };
  };

  const todoStats = getCompletedTodos();
  const completionRate = todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0;

  return (
    <div className="welcome-tab">
      <div className="welcome-main">
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome to Suitenote</h1>

        </div>

        <div className="welcome-content">
          {/* Quick Actions Grid */}
          <div className="section quick-actions-section">

            <div className="quick-actions-grid">
              {quickActions.map((action, index) => (
                <button key={index} className="quick-action-card" onClick={action.action}>
                  <div className="quick-action-icon">
                    {typeof action.icon === 'string' ? (
                      <span style={{ fontSize: '18px' }}>{action.icon}</span>
                    ) : (
                      action.icon
                    )}
                  </div>
                  <div className="quick-action-content">
                    <div className="quick-action-title">{action.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Recent Files Section */}
          <div className="section files-section">

            {recentNotes.length === 0 ? (
              <div className="empty-files">
                <FileText size={48} />
                <p>No recent files</p>
                <p>Create your first doc to get started</p>
              </div>
            ) : (
              <div className="files-container">
                <div className="files-table-header">
                  <div className="column-name">Name</div>
                  <div className="column-reason">Last Modified</div>
                  <div className="column-location">Location</div>
                  <div className="column-actions"></div>
                </div>

                <div className="files-table">
                  {recentNotes.slice(0, 8).map(note => (
                    <div key={note.id} className="file-row" onClick={() => onSelectNote(note.id)}>
                      <div className="file-name-cell">
                        <div className="file-icon">
                          {getTypeIcon(note.type)}
                        </div>
                        <span className="file-name">
                          {note.content.split('\n')[0] || 'Untitled'}
                        </span>
                      </div>
                      <div className="file-reason-cell">
                        {formatDate(note.updatedAt)}
                      </div>
                      <div className="file-location-cell">
                        <Folder size={14} />
                        <span>{getLocation(note)}</span>
                      </div>
                      <div className="file-actions-cell">
                        <button className="file-actions-btn">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Productivity Stats */}
          <div className="section stats-section">
            <div className="section-header">
              <h2 className="section-title">Your Activity</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{notes.length}</div>
                <div className="stat-label">Total Docs</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{getTotalWords().toLocaleString()}</div>
                <div className="stat-label">Words Written</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{completionRate}%</div>
                <div className="stat-label">Tasks Complete</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{folderNotes.length}</div>
                <div className="stat-label">Folders</div>
              </div>
            </div>
          </div>

          {/* Help & Resources */}
          <div className="section help-section">
            <div className="section-header">
              <h2 className="section-title">Help & Resources</h2>
            </div>
            <div className="help-grid">
              {helpActions.map((action, index) => (
                <button key={index} className="help-card" onClick={action.action}>
                  <div className="help-icon">{action.icon}</div>
                  <div className="help-content">
                    <div className="help-title">{action.title}</div>
                    <div className="help-description">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default WelcomeTab;
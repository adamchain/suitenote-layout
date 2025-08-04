import React, { useState } from 'react';
import { Users, UserPlus, X, Crown, Eye, Edit, MessageCircle } from 'lucide-react';
import { Note } from '../types/Note';
import './CollaborationPanel.css';
import CollaborationPresence from './collaboration/CollaborationPresence';

interface CollaborationPanelProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onClose: () => void;
  currentWorkspaceId: string | null;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  note,
  onUpdate,
  onClose,
  currentWorkspaceId
}) => {
  const [newCollaborator, setNewCollaborator] = useState('');
  const [shareMode, setShareMode] = useState<'view' | 'edit'>('view');

  const collaborators = note.collaborators || [];
  const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner', avatar: '👨‍💼' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'editor', avatar: '👩‍💻' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'viewer', avatar: '👨‍🎨' }
  ];

  const addCollaborator = () => {
    if (newCollaborator.trim()) {
      const updatedCollaborators = [...collaborators, newCollaborator.trim()];
      onUpdate(note.id, { collaborators: updatedCollaborators });
      setNewCollaborator('');
    }
  };

  const removeCollaborator = (email: string) => {
    const updatedCollaborators = collaborators.filter(c => c !== email);
    onUpdate(note.id, { collaborators: updatedCollaborators });
  };

  const changeRole = (userId: string, newRole: string) => {
    // In a real app, this would update the user's permissions
    console.log(`Changed ${userId} role to ${newRole}`);
  };

  const generateShareLink = () => {
    const shareUrl = `${window.location.origin}/shared/${note.id}?mode=${shareMode}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  return (
    <div className="collaboration-panel-overlay" onClick={onClose}>
      <div className="collaboration-panel" onClick={(e) => e.stopPropagation()}>
        {/* Presence indicator at the top */}
        {currentWorkspaceId && (
          <div style={{ marginBottom: 16 }}>
            <CollaborationPresence workspaceId={currentWorkspaceId} />
          </div>
        )}

        <div className="panel-header">
          <div className="header-title">
            <Users size={24} />
            <h2>Share & Collaborate</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="panel-content">
          {/* Share Link Section */}
          <div className="share-section">
            <h3>Share Link</h3>
            <div className="share-controls">
              <div className="share-mode">
                <label>
                  <input
                    type="radio"
                    value="view"
                    checked={shareMode === 'view'}
                    onChange={(e) => setShareMode(e.target.value as 'view' | 'edit')}
                  />
                  <Eye size={16} />
                  View only
                </label>
                <label>
                  <input
                    type="radio"
                    value="edit"
                    checked={shareMode === 'edit'}
                    onChange={(e) => setShareMode(e.target.value as 'view' | 'edit')}
                  />
                  <Edit size={16} />
                  Can edit
                </label>
              </div>
              <button className="generate-link-btn" onClick={generateShareLink}>
                Generate Link
              </button>
            </div>
          </div>

          {/* Add Collaborator Section */}
          <div className="add-collaborator-section">
            <h3>Invite People</h3>
            <div className="add-collaborator">
              <input
                type="email"
                value={newCollaborator}
                onChange={(e) => setNewCollaborator(e.target.value)}
                placeholder="Enter email address..."
                className="collaborator-input"
                onKeyDown={(e) => e.key === 'Enter' && addCollaborator()}
              />
              <button
                className="add-btn"
                onClick={addCollaborator}
                disabled={!newCollaborator.trim()}
              >
                <UserPlus size={16} />
                Invite
              </button>
            </div>
          </div>

          {/* Current Collaborators */}
          <div className="collaborators-section">
            <h3>People with access ({mockUsers.length})</h3>
            <div className="collaborators-list">
              {mockUsers.map((user) => (
                <div key={user.id} className="collaborator-item">
                  <div className="collaborator-info">
                    <div className="collaborator-avatar">{user.avatar}</div>
                    <div className="collaborator-details">
                      <div className="collaborator-name">{user.name}</div>
                      <div className="collaborator-email">{user.email}</div>
                    </div>
                  </div>

                  <div className="collaborator-role">
                    {user.role === 'owner' ? (
                      <div className="role-badge owner">
                        <Crown size={12} />
                        Owner
                      </div>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </div>

                  {user.role !== 'owner' && (
                    <button
                      className="remove-collaborator"
                      onClick={() => removeCollaborator(user.email)}
                      title="Remove access"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="activity-section">
            <h3>Recent Activity</h3>
            <div className="activity-feed">
              <div className="activity-item">
                <MessageCircle size={14} />
                <span>Jane Smith commented 2 hours ago</span>
              </div>
              <div className="activity-item">
                <Edit size={14} />
                <span>Mike Johnson edited the note 1 day ago</span>
              </div>
              <div className="activity-item">
                <UserPlus size={14} />
                <span>You shared this note 3 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationPanel;
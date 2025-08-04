import React, { useState } from 'react';
import { X, Plus, Folder, Users, Globe, Lock } from 'lucide-react';
import './CreateWorkspaceModal.css';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreateWorkspace: (name: string, description?: string) => Promise<void>;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  onClose,
  onCreateWorkspace
}) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [template, setTemplate] = useState<'blank' | 'personal' | 'team' | 'project'>('blank');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!workspaceName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateWorkspace(workspaceName.trim(), description.trim() || undefined);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const templates = [
    {
      id: 'blank',
      name: 'Blank Workspace',
      description: 'Start with an empty workspace',
      icon: <Folder size={20} />
    },
    {
      id: 'personal',
      name: 'Personal Notes',
      description: 'Pre-configured for personal note-taking',
      icon: <Users size={20} />
    },
    {
      id: 'team',
      name: 'Team Collaboration',
      description: 'Set up for team projects and sharing',
      icon: <Users size={20} />
    },
    {
      id: 'project',
      name: 'Project Management',
      description: 'Includes project templates and workflows',
      icon: <Folder size={20} />
    }
  ];

  return (
    <div className="create-workspace-overlay" onClick={onClose}>
      <div className="create-workspace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Plus size={24} />
            <h2>Create New Workspace</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          {/* Basic Info */}
          <div className="workspace-info-section">
            <h3>Workspace Details</h3>
            
            <div className="form-group">
              <label htmlFor="workspace-name">Workspace Name *</label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="My Awesome Workspace"
                className="workspace-name-input"
                autoFocus
                maxLength={50}
              />
              <div className="input-hint">
                {workspaceName.length}/50 characters
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="workspace-description">Description (optional)</label>
              <textarea
                id="workspace-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what this workspace is for..."
                className="workspace-description-input"
                rows={3}
                maxLength={200}
              />
              <div className="input-hint">
                {description.length}/200 characters
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="privacy-section">
            <h3>Privacy Settings</h3>
            
            <div className="privacy-options">
              <div 
                className={`privacy-option ${isPrivate ? 'selected' : ''}`}
                onClick={() => setIsPrivate(true)}
              >
                <div className="privacy-icon">
                  <Lock size={20} />
                </div>
                <div className="privacy-info">
                  <div className="privacy-title">Private</div>
                  <div className="privacy-description">Only you and invited members can access</div>
                </div>
              </div>
              
              <div 
                className={`privacy-option ${!isPrivate ? 'selected' : ''}`}
                onClick={() => setIsPrivate(false)}
              >
                <div className="privacy-icon">
                  <Globe size={20} />
                </div>
                <div className="privacy-info">
                  <div className="privacy-title">Public</div>
                  <div className="privacy-description">Anyone with the link can view</div>
                </div>
              </div>
            </div>
          </div>

          {/* Templates */}
          <div className="templates-section">
            <h3>Choose a Template</h3>
            
            <div className="templates-grid">
              {templates.map(tmpl => (
                <div
                  key={tmpl.id}
                  className={`template-card ${template === tmpl.id ? 'selected' : ''}`}
                  onClick={() => setTemplate(tmpl.id as any)}
                >
                  <div className="template-icon">
                    {tmpl.icon}
                  </div>
                  <div className="template-info">
                    <div className="template-name">{tmpl.name}</div>
                    <div className="template-description">{tmpl.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-info">
            <p>You can always change these settings later in workspace preferences.</p>
          </div>
          
          <div className="footer-actions">
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="create-btn"
              onClick={handleCreate}
              disabled={!workspaceName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <div className="spinner" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Workspace
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
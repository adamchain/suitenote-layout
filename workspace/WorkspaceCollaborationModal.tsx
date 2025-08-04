import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Send, UserPlus, Crown, Edit, Eye, Copy, Settings, Shield, Clock, Link, RefreshCw, Trash2 } from 'lucide-react';
import apiService from '../../services/apiService';
import './WorkspaceCollaborationModal.css';

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
  lastActive?: string;
  avatar?: string;
}

interface PendingInvitation {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  expiresAt: string;
  invitedBy: string;
}

interface ShareSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  passwordProtected: boolean;
  expiresAt?: string;
}

interface WorkspaceCollaborationModalProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}

const WorkspaceCollaborationModal: React.FC<WorkspaceCollaborationModalProps> = ({
  workspaceId,
  workspaceName,
  onClose
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    allowComments: true,
    allowDownload: false,
    passwordProtected: false
  });
  const [shareUrl, setShareUrl] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'share' | 'members'>('invite');
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  const loadMembers = async () => {
    try {
      const data = await apiService.getWorkspaceMembers(workspaceId);
      setMembers(data.members || []);
      setPendingInvitations(data.pendingInvitations || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await apiService.inviteToWorkspace(
        workspaceId,
        inviteEmail.trim(),
        inviteRole,
        inviteMessage.trim() || undefined
      );

      setInviteEmail('');
      setInviteMessage('');
      setInviteRole('editor');
      await loadMembers(); // Reload to show pending invitation
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      alert(`Failed to send invitation: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const data = await apiService.generateShareLink(workspaceId, {
        ...shareSettings,
        password: shareSettings.passwordProtected ? sharePassword : undefined,
        expiresIn: shareSettings.expiresAt ? 30 : undefined // 30 days default
      });

      setShareUrl(data.shareUrl);
      alert('Share link generated successfully!');
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert(`Failed to generate share link: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await apiService.removeMember(workspaceId, userId);
      await loadMembers();
      alert('Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(`Failed to remove member: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await apiService.updateMemberRole(workspaceId, userId, newRole);
      await loadMembers();
      alert('Member role updated successfully');
    } catch (error) {
      console.error('Failed to update member role:', error);
      alert(`Failed to update member role: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handleResendInvitation = async (email: string) => {
    setProcessingInvitation(email);
    try {
      await apiService.resendInvitation(workspaceId, email);
      await loadMembers();
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeleteInvitation = async (email: string) => {
    if (!confirm(`Are you sure you want to delete the invitation for ${email}?`)) return;
    
    setProcessingInvitation(email);
    try {
      await apiService.deleteInvitation(workspaceId, email);
      await loadMembers();
      alert('Invitation deleted successfully');
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      alert(`Failed to delete invitation: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setProcessingInvitation(null);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown size={14} />;
      case 'admin': return <Shield size={14} />;
      case 'editor': return <Edit size={14} />;
      case 'viewer': return <Eye size={14} />;
      default: return <Eye size={14} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#ff9500';
      case 'admin': return '#ff3b30';
      case 'editor': return '#34c759';
      case 'viewer': return '#8e8e93';
      default: return '#8e8e93';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="workspace-collaboration-overlay" onClick={onClose}>
      <div className="workspace-collaboration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title">
            <Users size={24} />
            <div className="header-info">
              <h2>Share Workspace</h2>
              <p>{workspaceName}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'invite' ? 'active' : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            <UserPlus size={16} />
            Invite People
          </button>
          <button
            className={`tab-btn ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <Link size={16} />
            Share Link
          </button>
          <button
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={16} />
            Members ({members.length})
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'invite' && (
            <div className="invite-section">
              <h3>Invite People</h3>
              <p>Invite others to collaborate on this workspace</p>
              
              <div className="invite-form">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="invite-email-input"
                    disabled={isInviting}
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="role-select"
                    disabled={isInviting}
                  >
                    <option value="viewer">Viewer - Can view content</option>
                    <option value="editor">Editor - Can edit content</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Personal Message (Optional)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Add a personal message to the invitation..."
                    className="invite-message-input"
                    rows={3}
                    disabled={isInviting}
                  />
                </div>
                
                <button
                  className="invite-btn"
                  onClick={handleInvite}
                  disabled={!validateEmail(inviteEmail) || isInviting}
                >
                  {isInviting ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <Send size={16} />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>

              {pendingInvitations.length > 0 && (
                <div className="pending-invitations">
                  <h4>Pending Invitations</h4>
                  {pendingInvitations.map((invitation, index) => (
                    <div key={index} className="pending-invitation-item">
                      <div className="invitation-info">
                        <span className="invitation-email">{invitation.email}</span>
                        <div className="invitation-role-badge" style={{ color: getRoleColor(invitation.role) }}>
                          {getRoleIcon(invitation.role)}
                          <span>{invitation.role}</span>
                        </div>
                      </div>
                      <div className="invitation-meta">
                        <div className="invitation-expiry">
                          <Clock size={12} />
                          <span>Expires {formatDate(invitation.expiresAt)}</span>
                        </div>
                        <div className="invitation-invited-by">
                          <span>Invited by {invitation.invitedBy}</span>
                        </div>
                      </div>
                      <div className="invitation-actions">
                        <button
                          className="invitation-action-btn resend"
                          onClick={() => handleResendInvitation(invitation.email)}
                          disabled={processingInvitation === invitation.email}
                          title="Resend invitation"
                        >
                          {processingInvitation === invitation.email ? (
                            <div className="mini-spinner" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                        </button>
                        <button
                          className="invitation-action-btn delete"
                          onClick={() => handleDeleteInvitation(invitation.email)}
                          disabled={processingInvitation === invitation.email}
                          title="Delete invitation"
                        >
                          {processingInvitation === invitation.email ? (
                            <div className="mini-spinner" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="share-section">
              <h3>Public Share Link</h3>
              <p>Create a public link that anyone can use to access this workspace</p>

              <div className="share-settings">
                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={shareSettings.isPublic}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    <span>Make workspace public</span>
                  </label>
                  <p className="setting-description">Anyone with the link can view this workspace</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowComments}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                      disabled={!shareSettings.isPublic}
                    />
                    <span>Allow comments</span>
                  </label>
                  <p className="setting-description">Viewers can leave comments on notes</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={shareSettings.allowDownload}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, allowDownload: e.target.checked }))}
                      disabled={!shareSettings.isPublic}
                    />
                    <span>Allow downloads</span>
                  </label>
                  <p className="setting-description">Viewers can download workspace content</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={shareSettings.passwordProtected}
                      onChange={(e) => setShareSettings(prev => ({ ...prev, passwordProtected: e.target.checked }))}
                      disabled={!shareSettings.isPublic}
                    />
                    <span>Password protection</span>
                  </label>
                  <p className="setting-description">Require a password to access the workspace</p>
                </div>

                {shareSettings.passwordProtected && (
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      placeholder="Enter password"
                      className="password-input"
                    />
                  </div>
                )}
              </div>

              <div className="share-actions">
                <button
                  className="generate-link-btn"
                  onClick={handleGenerateShareLink}
                  disabled={!shareSettings.isPublic || isGeneratingLink}
                >
                  {isGeneratingLink ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <Link size={16} />
                      Generate Share Link
                    </>
                  )}
                </button>
              </div>

              {shareUrl && (
                <div className="share-link-result">
                  <label>Share Link</label>
                  <div className="share-link-container">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="share-link-input"
                    />
                    <button
                      className="copy-link-btn"
                      onClick={handleCopyShareLink}
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="members-section">
              <h3>Workspace Members</h3>
              <p>Manage who has access to this workspace</p>

              <div className="members-list">
                {members.map(member => (
                  <div key={member.id} className={`member-item ${member.role === 'owner' ? 'owner' : ''}`}>
                    <div className="member-avatar">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} />
                      ) : (
                        <span>{member.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email}</div>
                      <div className="member-meta">
                        Joined {formatDate(member.joinedAt)}
                        {member.lastActive && ` • Active ${formatDate(member.lastActive)}`}
                      </div>
                    </div>

                    <div className="member-role">
                      {member.role === 'owner' ? (
                        <div className="role-badge owner">
                          <Crown size={12} />
                          Owner
                        </div>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                          className="role-select-dropdown"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>

                    {member.role !== 'owner' && (
                      <div className="member-actions">
                        <button
                          className="remove-member-btn"
                          onClick={() => handleRemoveMember(member.userId)}
                          title="Remove member"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCollaborationModal;
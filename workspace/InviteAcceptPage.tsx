import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import './InviteAcceptPage.css';

interface InvitationDetails {
  workspace: {
    id: string;
    name: string;
    description?: string;
    owner: {
      phoneNumber: string;
      profile?: {
        name?: string;
      };
    };
    memberCount: number;
  };
  invitation: {
    email: string;
    role: string;
    expiresAt: string;
  };
}

const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://suitenote-2-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/workspace/invite/${token}`);
      const data = await response.json();

      if (response.ok) {
        setInvitation(data);
      } else {
        setError(data.error || 'Invalid invitation link');
      }
    } catch (error) {
      console.error('Failed to load invitation:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!authState.isAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?return=${returnUrl}`);
      return;
    }

    setAccepting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://suitenote-2-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/workspace/invite/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/workspace/' + invitation?.workspace.id);
        }, 2000);
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to manage workspace and members';
      case 'editor':
        return 'Can create, edit, and organize content';
      case 'viewer':
        return 'Can view and comment on content';
      default:
        return 'Basic access to workspace';
    }
  };

  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="loading-state">
            <div className="spinner-large" />
            <h2>Loading invitation...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="error-state">
            <XCircle size={64} />
            <h2>Invalid Invitation</h2>
            <p>{error}</p>
            <button
              className="home-btn"
              onClick={() => navigate('/')}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="success-state">
            <CheckCircle size={64} />
            <h2>Welcome to the team!</h2>
            <p>You've successfully joined {invitation?.workspace.name}</p>
            <p>Redirecting to workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="error-state">
            <XCircle size={64} />
            <h2>Invitation Not Found</h2>
            <p>This invitation link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.invitation.expiresAt) < new Date();

  return (
    <div className="invite-page">
      <div className="invite-container">
        <div className="invite-header">
          <div className="workspace-icon">
            <Users size={32} />
          </div>
          <h1>You're invited to join</h1>
          <h2>{invitation.workspace.name}</h2>
        </div>

        <div className="invite-details">
          {invitation.workspace.description && (
            <p className="workspace-description">{invitation.workspace.description}</p>
          )}

          <div className="invitation-info">
            <div className="info-item">
              <span className="info-label">Invited as:</span>
              <span className="info-value role-badge">
                {invitation.invitation.role.charAt(0).toUpperCase() + invitation.invitation.role.slice(1)}
              </span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Role permissions:</span>
              <span className="info-value">{getRoleDescription(invitation.invitation.role)}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Workspace owner:</span>
              <span className="info-value">
                {invitation.workspace.owner.profile?.name || invitation.workspace.owner.phoneNumber}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">Current members:</span>
              <span className="info-value">{invitation.workspace.memberCount} people</span>
            </div>

            <div className="info-item expiry">
              <Clock size={16} />
              <span className={`expiry-text ${isExpired ? 'expired' : ''}`}>
                {formatExpiryDate(invitation.invitation.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="invite-actions">
          {isExpired ? (
            <div className="expired-message">
              <XCircle size={20} />
              <span>This invitation has expired</span>
            </div>
          ) : !authState.isAuthenticated ? (
            <div className="auth-required">
              <p>You need to sign in to accept this invitation</p>
              <button
                className="sign-in-btn"
                onClick={() => {
                  const returnUrl = encodeURIComponent(window.location.pathname);
                  navigate(`/?return=${returnUrl}`);
                }}
              >
                Sign In to Accept
              </button>
            </div>
          ) : (
            <button
              className="accept-btn"
              onClick={handleAcceptInvitation}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <div className="spinner" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Accept Invitation
                </>
              )}
            </button>
          )}
        </div>

        <div className="invite-footer">
          <p>
            This invitation was sent to <strong>{invitation.invitation.email}</strong>
          </p>
          <p>
            If you don't want to join this workspace, you can safely ignore this invitation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
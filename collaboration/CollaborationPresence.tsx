import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Users, Circle } from 'lucide-react';
import './CollaborationPresence.css';

interface User {
  id: string;
  phoneNumber: string;
  profile?: {
    name?: string;
    avatar?: string;
  };
  lastSeen: string;
  status?: 'online' | 'away' | 'offline';
}

interface CollaborationPresenceProps {
  workspaceId: string;
  currentUserId?: string;
}

const CollaborationPresence: React.FC<CollaborationPresenceProps> = ({
  workspaceId,
  currentUserId
}) => {
  const { isConnected, lastMessage, joinWorkspace, leaveWorkspace } = useWebSocket();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isConnected && workspaceId) {
      joinWorkspace(workspaceId);
    }

    return () => {
      if (workspaceId) {
        leaveWorkspace(workspaceId);
      }
    };
  }, [isConnected, workspaceId, joinWorkspace, leaveWorkspace]);

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'workspace_joined':
        if (lastMessage.workspaceId === workspaceId) {
          setActiveUsers(lastMessage.activeUsers || []);
        }
        break;

      case 'user_joined':
        if (lastMessage.user && lastMessage.user.id !== currentUserId) {
          setActiveUsers(prev => {
            const exists = prev.find(u => u.id === lastMessage.user.id);
            if (!exists) {
              return [...prev, { ...lastMessage.user, status: 'online' }];
            }
            return prev;
          });
        }
        break;

      case 'user_left':
      case 'user_disconnected':
        setActiveUsers(prev => prev.filter(u => u.id !== lastMessage.userId));
        break;

      case 'presence_update':
        setActiveUsers(prev => prev.map(user => 
          user.id === lastMessage.userId 
            ? { ...user, status: lastMessage.status, lastSeen: lastMessage.lastSeen }
            : user
        ));
        break;
    }
  }, [lastMessage, workspaceId, currentUserId]);

  const getUserDisplayName = (user: User) => {
    return user.profile?.name || user.phoneNumber;
  };

  const getUserInitials = (user: User) => {
    const name = getUserDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return '#34c759';
      case 'away': return '#ff9500';
      case 'offline': return '#8e8e93';
      default: return '#34c759';
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (!isConnected) {
    return (
      <div className="collaboration-presence offline">
        <Circle size={8} fill="#8e8e93" color="#8e8e93" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="collaboration-presence">
      <div 
        className="presence-trigger"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="active-users-avatars">
          {activeUsers.slice(0, 3).map((user, index) => (
            <div 
              key={user.id} 
              className="user-avatar"
              style={{ zIndex: 10 - index }}
              title={getUserDisplayName(user)}
            >
              {user.profile?.avatar ? (
                <img src={user.profile.avatar} alt={getUserDisplayName(user)} />
              ) : (
                <span className="avatar-initials">{getUserInitials(user)}</span>
              )}
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(user.status) }}
              />
            </div>
          ))}
          
          {activeUsers.length > 3 && (
            <div className="more-users">
              +{activeUsers.length - 3}
            </div>
          )}
        </div>

        <div className="presence-info">
          <Users size={14} />
          <span className="user-count">
            {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} online
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="presence-dropdown">
          <div className="dropdown-header">
            <h4>Active in workspace</h4>
            <button 
              className="close-btn"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </button>
          </div>

          <div className="users-list">
            {activeUsers.map(user => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  {user.profile?.avatar ? (
                    <img src={user.profile.avatar} alt={getUserDisplayName(user)} />
                  ) : (
                    <span className="avatar-initials">{getUserInitials(user)}</span>
                  )}
                  <div 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  />
                </div>

                <div className="user-info">
                  <div className="user-name">{getUserDisplayName(user)}</div>
                  <div className="user-status">
                    {user.status === 'online' ? 'Active now' : formatLastSeen(user.lastSeen)}
                  </div>
                </div>
              </div>
            ))}

            {activeUsers.length === 0 && (
              <div className="no-users">
                <Users size={32} />
                <p>No one else is currently active</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationPresence;
import React, { useState } from 'react';
import { User } from 'lucide-react';
import './ProfileSetup.css';

interface ProfileSetupProps {
  onComplete: (name: string) => void;
  isLoading?: boolean;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete, isLoading = false }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete(name.trim());
    }
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <div className="profile-setup-header">
          <div className="profile-setup-icon">
            <User size={48} />
          </div>
          <h2>Welcome to Suitenote!</h2>
          <p>Let's set up your profile to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="form-group">
            <label htmlFor="name">What's your name?</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="profile-setup-button"
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
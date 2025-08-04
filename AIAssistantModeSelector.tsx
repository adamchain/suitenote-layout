import React, { useState } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { AIAssistantMode, AI_ASSISTANT_MODES } from '../types/AIAssistant';
import './AIAssistantModeSelector.css';

interface AIAssistantModeSelectorProps {
  selectedMode: AIAssistantMode;
  onModeChange: (mode: AIAssistantMode) => void;
  className?: string;
}

const AIAssistantModeSelector: React.FC<AIAssistantModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleModeSelect = (mode: AIAssistantMode) => {
    onModeChange(mode);
    setIsOpen(false);
  };

  return (
    <div className={`ai-mode-selector ${className}`}>
      <button
        className="vscode-btn mode-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="mode-icon">{selectedMode.icon}</span>
        <span className="mode-name">{selectedMode.name}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="mode-dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="mode-dropdown" role="listbox">
            <div className="dropdown-header">
              <Sparkles size={16} />
              <span>Choose AI Assistant Mode</span>
            </div>
            
            {AI_ASSISTANT_MODES.map((mode) => (
              <button
                key={mode.id}
                className={`mode-option ${selectedMode.id === mode.id ? 'selected' : ''}`}
                onClick={() => handleModeSelect(mode)}
                role="option"
                aria-selected={selectedMode.id === mode.id}
              >
                <div className="mode-option-content">
                  <div className="mode-option-header">
                    <span className="mode-option-icon">{mode.icon}</span>
                    <span className="mode-option-name">{mode.name}</span>
                    {selectedMode.id === mode.id && (
                      <Check size={14} className="selected-check" />
                    )}
                  </div>
                  <p className="mode-option-description">{mode.description}</p>
                  <div className="mode-capabilities">
                    {mode.capabilities.slice(0, 3).map((capability, index) => (
                      <span key={index} className="capability-tag">
                        {capability}
                      </span>
                    ))}
                    {mode.capabilities.length > 3 && (
                      <span className="capability-more">
                        +{mode.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistantModeSelector;
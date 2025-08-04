import React, { useState } from 'react';
import { Check, X, Eye, Edit, Search, Plus, Lightbulb, Apple } from 'lucide-react';
import { AISuggestion } from '../types/AIAssistant';
import './AISuggestionCard.css';

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: (suggestion: AISuggestion) => void;
  onReject: (suggestionId: string) => void;
  onPreview?: (suggestion: AISuggestion) => void;
  onInsertToDoc?: (text: string) => void;
  isTextNoteOpen?: boolean;
  onRequireTextNote?: () => void;
}

const AISuggestionCard: React.FC<AISuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  onPreview
  , onInsertToDoc,
  isTextNoteOpen,
  onRequireTextNote
}) => {
  const getSuggestionIcon = () => {
    switch (suggestion.type) {
      case 'edit': return <Edit size={16} />;
      case 'research': return <Search size={16} />;
      case 'review': return <Eye size={16} />;
      case 'create': return <Plus size={16} />;
      default: return <Lightbulb size={16} />;
    }
  };

  const getSuggestionTypeLabel = () => {
    switch (suggestion.type) {
      case 'edit': return 'Edit Suggestion';
      case 'research': return 'Research Finding';
      case 'review': return 'Review Comment';
      case 'create': return 'New Content';
      default: return 'Suggestion';
    }
  };

  const getConfidenceColor = () => {
    if (suggestion.confidence >= 0.8) return 'var(--vscode-success)';
    if (suggestion.confidence >= 0.6) return 'var(--vscode-warning)';
    return 'var(--vscode-text-muted)';
  };

  return (
    <div className="vscode-card ai-suggestion-card">
      <div className="suggestion-header">
        <div className="suggestion-type">
          {getSuggestionIcon()}
          <span className="type-label">{getSuggestionTypeLabel()}</span>
        </div>
        <div className="suggestion-confidence">
          <div
            className="confidence-indicator"
            style={{ backgroundColor: getConfidenceColor() }}
          />
          <span className="confidence-text">
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="suggestion-content">
        <h4 className="suggestion-title">{suggestion.title}</h4>

        {suggestion.originalContent && (
          <div className="content-diff">
            <div className="diff-section original">
              <span className="diff-label">Original:</span>
              <div className="diff-content">{suggestion.originalContent}</div>
            </div>
            <div className="diff-section suggested">
              <span className="diff-label">Suggested:</span>
              <div className="diff-content">{suggestion.content}</div>
            </div>
          </div>
        )}

        {!suggestion.originalContent && (
          <div className="suggestion-text">
            {suggestion.content}
          </div>
        )}

        {suggestion.reasoning && (
          <div className="suggestion-reasoning">
            <span className="reasoning-label">Reasoning:</span>
            <p className="reasoning-text">{suggestion.reasoning}</p>
          </div>
        )}

        {/* Insert to doc icon */}
        <div className="insert-to-doc-row">
          <button
            className="insert-to-doc-btn"
            title={isTextNoteOpen ? 'Insert this AI suggestion into your open note' : 'Open a text note to insert'}
            disabled={!isTextNoteOpen}
            onClick={() => {
              if (isTextNoteOpen && onInsertToDoc) {
                onInsertToDoc(suggestion.content);
              } else if (onRequireTextNote) {
                onRequireTextNote();
              }
            }}
          >
            <Apple size={18} style={{ marginRight: 6 }} />
            <span>{isTextNoteOpen ? 'Insert to Doc' : 'Open a text note to insert'}</span>
          </button>
        </div>
      </div>

      <div className="suggestion-actions">
        {onPreview && (
          <button
            className="vscode-btn vscode-btn-ghost"
            onClick={() => onPreview(suggestion)}
          >
            <Eye size={14} />
            Preview
          </button>
        )}
        <button
          className="vscode-btn vscode-btn-ghost"
          onClick={() => onReject(suggestion.id)}
        >
          <X size={14} />
          Dismiss
        </button>
        <button
          className="vscode-btn vscode-btn-primary"
          onClick={() => onAccept(suggestion)}
        >
          <Check size={14} />
          Accept
        </button>
      </div>
    </div>
  );
};

export default AISuggestionCard;
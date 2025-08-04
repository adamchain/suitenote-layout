import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lightbulb, Sparkles, X, Loader } from 'lucide-react';
import { htmlToPlainText } from '../utils/textUtils';
import AIAssistantModeSelector from './AIAssistantModeSelector';
import AISuggestionCard from './AISuggestionCard';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { aiService } from '../services/aiService';
import { Note } from '../types/Note';
import './AIAssistant.css';

interface AIAssistantProps {
  notes: Note[];
  onCreateNote: (content: string, type?: Note['type']) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  selectedNote?: Note | null;
  onClose: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  notes,
  onCreateNote,
  onUpdateNote,
  selectedNote,
  onClose
}) => {
  const [input, setInput] = useState('');

  // Use the AI Assistant hook
  const {
    selectedMode,
    messages: conversation,
    isLoading,
    pendingSuggestions,
    handleModeChange,
    sendMessage,
    acceptSuggestion,
    rejectSuggestion,
    clearMessages
  } = useAIAssistant();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Prepare context
    const context = {
      selectedNote: selectedNote || undefined,
      currentFileName: selectedNote ? 'Current Note' : undefined,
      currentFileContent: selectedNote?.content
    };

    // Send message using AI Assistant hook
    await sendMessage(input.trim(), context);
    setInput('');
  };

  const handleAcceptSuggestion = (suggestion: any) => {
    const acceptedSuggestion = acceptSuggestion(suggestion);

    // Apply the suggestion
    if (acceptedSuggestion.type === 'edit' && selectedNote && onUpdateNote) {
      onUpdateNote(selectedNote.id, { content: acceptedSuggestion.content });
    } else if (acceptedSuggestion.type === 'create') {
      onCreateNote(acceptedSuggestion.content);
    }
  };

  const quickActions = [
    {
      icon: <Lightbulb size={16} />,
      label: 'Generate Ideas',
      action: () => setInput(`Generate creative ideas for ${selectedNote ? 'this note' : 'my project'}`)
    },
    {
      icon: <Sparkles size={16} />,
      label: 'Summarize Notes',
      action: () => setInput(selectedNote ? 'Summarize this note' : 'Summarize my recent notes')
    }
  ];

  return (
    <div className="ai-assistant-overlay" onClick={onClose}>
      <div className="ai-assistant" onClick={(e) => e.stopPropagation()}>
        <div className="ai-header">
          <div className="ai-title">
            <Bot size={24} />
            <h2>{selectedMode.name}</h2>
            {!aiService.isAIEnabled() && (
              <span className="ai-status">Demo Mode</span>
            )}
          </div>
          <button className="ai-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* AI Mode Selector */}
        <div className="ai-mode-section">
          <AIAssistantModeSelector
            selectedMode={selectedMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div className="ai-suggestions-section">
            <div className="suggestions-header">
              <Sparkles size={16} />
              <span>AI Suggestions</span>
            </div>
            <div className="suggestions-container">
              {pendingSuggestions.map((suggestion) => (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={handleAcceptSuggestion}
                  onReject={rejectSuggestion}
                  isTextNoteOpen={!!selectedNote && selectedNote.type === 'note'}
                  onInsertToDoc={(text) => {
                    if (onUpdateNote && selectedNote && selectedNote.type === 'note') {
                      window.dispatchEvent(new CustomEvent('ai-insert-mode', { detail: { text } }));
                    }
                  }}
                  onRequireTextNote={() => {
                    alert('Please open a text note to insert the AI suggestion.');
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div className="ai-conversation" ref={conversationRef}>
          {conversation.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
              {message.type === 'ai' && (
                <button
                  className="insert-to-doc-btn"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('ai-insert-mode', { detail: { text: htmlToPlainText(message.content) } }));
                  }}
                >
                  <Sparkles size={14} />
                  Insert to Doc
                </button>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="message ai">
              <div className="message-content loading">
                <Loader size={16} className="spinner" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="ai-quick-actions">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-action"
              onClick={action.action}
              disabled={isLoading}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <form className="ai-input-form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything... (e.g., 'Generate ideas for a project', 'Summarize my docs')"
            className="ai-input"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="ai-send"
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </form>

        {!aiService.isAIEnabled() && (
          <div className="ai-setup-notice">
            <p>Add your OpenAI API key to <code>.env</code> to enable full AI features</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
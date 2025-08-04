import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Plus,
  Wand2,
  FileText,
  Search,
  PenTool,
  Brain,
  Edit3,
  X
} from 'lucide-react';
import { htmlToPlainText } from '../../utils/textUtils';
import AIAssistantModeSelector from '../AIAssistantModeSelector';
import AISuggestionCard from '../AISuggestionCard';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import AIAssistant from '../AIAssistant';
import { aiService } from '../../services/aiService';
import ProductivityDashboard from '../ProductivityDashboard';
import TagManager from '../TagManager';
import ArchiveManager from '../ArchiveManager';
import CalendarModal from '../CalendarModal';
import { Note } from '../../types/Note';
import UsageDisplay from '../usage/UsageDisplay';
import './RightPanel.css';

interface RightPanelProps {
  width: number;
  collapsed: boolean;
  sections: {
    ai: boolean;
    analytics: boolean;
    organization: boolean;
  };
  notes: Note[];
  selectedNote: Note | null;
  selectedFolder: Note | null;
  onToggleCollapse: () => void;
  onToggleSection: (section: keyof RightPanelProps['sections']) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onCreateNote: (content: string, url?: string) => void;
  onShowTagManager: () => void;
  onShowArchiveManager: () => void;
  onShowProductivityDashboard: () => void;
  currentFileName: string;
  currentFileContent: string;
  onEditFile: (newContent: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  width,
  collapsed,
  sections,
  notes,
  selectedNote,
  selectedFolder,
  onToggleCollapse,
  onToggleSection,
  onUpdateNote,
  onCreateNote,
  onShowTagManager,
  onShowArchiveManager,
  onShowProductivityDashboard,
  currentFileName,
  currentFileContent,
  onEditFile
}) => {
  console.log('[RightPanel] props', { currentFileName, currentFileContent });
  const [isResizing, setIsResizing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [pendingEdit, setPendingEdit] = useState<string | null>(null);
  const [diffPreview, setDiffPreview] = useState<{content: string, original: string} | null>(null);
  const [activeInsertButton, setActiveInsertButton] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'agent' | 'ask'>('agent');
  const [showAITools, setShowAITools] = useState(true);
  const [isProcessingAITool, setIsProcessingAITool] = useState(false);
  const [showInfoMessage, setShowInfoMessage] = useState(true);
  const [attachedDocuments, setAttachedDocuments] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<'ai' | 'usage' | 'organization'>('ai');

  // Use the new AI Assistant hook
  const {
    selectedMode,
    messages: aiMessages,
    isLoading: isAiLoading,
    pendingSuggestions,
    handleModeChange,
    sendMessage,
    acceptSuggestion,
    rejectSuggestion,
    clearMessages
  } = useAIAssistant();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth - (e.clientX - startX);
      // onResize removed, implement resize logic in parent if needed
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const archivedNotes = notes.filter(note => note.isArchived);
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  // Helper functions for Copilot features
  const getInfoMessage = () => {
    if (currentMode === 'ask') {
      return "Ask Copilot: Copilot is powered by AI, so mistakes are possible. Edit mode lets you get answers and feedback in the chat window.";
    }
    return "Ask Copilot to edit your files directly. Mistakes are possible.";
  };

  const getCurrentNoteName = () => {
    if (selectedNote) {
      const title = selectedNote.content.split('\n')[0];
      return title || 'Untitled Note';
    }
    return null;
  };

  const createDiffPreview = (original: string, updated: string) => {
    setDiffPreview({ content: updated, original });
  };

  const applyDiff = () => {
    if (diffPreview && selectedNote) {
      onUpdateNote(selectedNote.id, { content: diffPreview.content });
      setDiffPreview(null);
    }
  };

  const undoDiff = () => {
    setDiffPreview(null);
  };

  const renderDiffLines = (original: string, updated: string) => {
    const originalLines = original.split('\n');
    const updatedLines = updated.split('\n');
    const maxLines = Math.max(originalLines.length, updatedLines.length);
    
    const diffLines = [];
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const updatedLine = updatedLines[i] || '';
      
      if (originalLine !== updatedLine) {
        if (originalLine && !updatedLine) {
          diffLines.push({ type: 'removed', content: originalLine });
        } else if (!originalLine && updatedLine) {
          diffLines.push({ type: 'added', content: updatedLine });
        } else {
          diffLines.push({ type: 'removed', content: originalLine });
          diffLines.push({ type: 'added', content: updatedLine });
        }
      } else {
        diffLines.push({ type: 'unchanged', content: originalLine });
      }
    }
    
    return diffLines.slice(0, 20); // Limit to 20 lines for preview
  };

  const handleAiSend = async () => {
    console.log('[RightPanel] handleAiSend called', { aiInput, isAiLoading });
    if (!aiInput.trim() || isAiLoading) return;

    // Prepare context for AI
    const context = {
      selectedNote: selectedNote || undefined,
      currentFileName,
      currentFileContent
    };

    // Send message using the AI Assistant hook
    await sendMessage(aiInput, context);
    setAiInput('');
  };

  const handleAcceptSuggestion = (suggestion: any) => {
    const acceptedSuggestion = acceptSuggestion(suggestion);

    // Apply the suggestion based on its type
    if (acceptedSuggestion.type === 'edit' && selectedNote) {
      onUpdateNote(selectedNote.id, { content: acceptedSuggestion.content });
    } else if (acceptedSuggestion.type === 'edit' && currentFileName && currentFileContent) {
      onEditFile(acceptedSuggestion.content);
    }
  };

  const generateAiResponse = (input: string, selectedNote: Note | null, selectedFolder: Note | null, allNotes: Note[]) => {
    const lowerInput = input.toLowerCase();

    // Context-aware responses based on current selection
    if (selectedFolder) {
      const folderContents = allNotes.filter(note => note.parentId === selectedFolder.id);
      const folderName = selectedFolder.content.split('\n')[0] || 'Selected folder';

      if (lowerInput.includes('folder') || lowerInput.includes('content') || lowerInput.includes('what')) {
        return `I can see you have the "${folderName}" folder selected. It contains ${folderContents.length} items: ${folderContents.slice(0, 3).map(n => n.content.split('\n')[0] || 'Untitled').join(', ')}${folderContents.length > 3 ? '...' : ''}. How can I help you organize or work with these files?`;
      }

      if (lowerInput.includes('organize') || lowerInput.includes('sort')) {
        return `For the "${folderName}" folder, I can help you organize by: creation date, content type, or alphabetically. The folder has ${folderContents.filter(n => n.type === 'note').length} notes, ${folderContents.filter(n => n.type === 'todo').length} todos, and ${folderContents.filter(n => n.type === 'folder').length} subfolders.`;
      }
    }

    if (selectedNote) {
      const noteTitle = selectedNote.content.split('\n')[0] || 'Selected note';

      if (lowerInput.includes('summary') || lowerInput.includes('about')) {
        return `This ${selectedNote.type} titled "${noteTitle}" was created ${new Date(selectedNote.createdAt).toLocaleDateString()}. Content preview: "${selectedNote.content.substring(0, 150)}..." How can I help you work with this ${selectedNote.type}?`;
      }

      if (lowerInput.includes('enhance') || lowerInput.includes('improve')) {
        return `I can help enhance "${noteTitle}" by adding tags, creating related notes, or organizing it better. This ${selectedNote.type} could benefit from categorization or connections to other notes.`;
      }
    }

    // General responses
    if (lowerInput.includes('organize') || lowerInput.includes('tag')) {
      return `I can help you organize your notes! You have ${allNotes.length} notes total. Consider adding tags like: ${allTags.slice(0, 3).join(', ')} to improve organization.`;
    }

    if (lowerInput.includes('stat') || lowerInput.includes('count')) {
      const wordCount = allNotes.reduce((sum, note) => sum + (note.content?.split(/\s+/).length || 0), 0);
      return `Your workspace stats: ${allNotes.length} notes, ${wordCount} words written, ${allTags.length} unique tags.`;
    }

    // Contextual greeting
    const context = selectedNote ? ` I can see you're working with "${selectedNote.content.split('\n')[0] || 'a note'}".` :
      selectedFolder ? ` I can see you have "${selectedFolder.content.split('\n')[0] || 'a folder'}" selected.` : '';

    return `I'm your AI assistant.${context} I can help with note organization, content analysis, and productivity insights. Try asking about your current selection, workspace stats, or how to organize your files!`;
  };

  const handleAiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const handleInsertClick = (text: string, messageIndex: number) => {
    console.log('[RightPanel] Insert button clicked for message:', messageIndex);

    // Set this button as active (waiting for user to click somewhere)
    setActiveInsertButton(`${messageIndex}`);

    // Listen for the next document click to insert the text
    const handleDocumentClick = () => {
      const plainText = htmlToPlainText(text);
      console.log('[RightPanel] Document clicked, inserting text:', plainText);
      window.dispatchEvent(new CustomEvent('ai-insert-mode', {
        detail: { text: plainText }
      }));

      // Reset the button state
      setActiveInsertButton(null);
      document.removeEventListener('click', handleDocumentClick);
    };

    // Add event listener for document click
    setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 100); // Small delay to avoid capturing the button click itself

    // Reset button text after 5 seconds regardless
    setTimeout(() => {
      setActiveInsertButton(null);
      document.removeEventListener('click', handleDocumentClick);
    }, 5000);
  };

  // Enhanced AI Tools functions with diff preview
  const handleAIToolAction = async (action: string) => {
    if (!selectedNote || isProcessingAITool) return;

    setIsProcessingAITool(true);
    try {
      let result = '';
      const content = selectedNote.content;

      switch (action) {
        case 'format':
          result = await aiService.formatText(content);
          break;
        case 'expandAndInfo':
          // Combined expand and add info action
          const expanded = await aiService.expandText(content);
          result = await aiService.addInfoText(expanded);
          break;
        case 'outline':
          const outlineArray = await aiService.brainstorm(content);
          result = outlineArray.join('\n');
          break;
        default:
          return;
      }

      if (result && result !== content) {
        // Create diff preview instead of directly updating
        createDiffPreview(content, result);
      }
    } catch (error) {
      console.error(`AI tool ${action} error:`, error);
    } finally {
      setIsProcessingAITool(false);
    }
  };

  if (collapsed) {
    return (
      <div className="right-panel collapsed">
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          title="Expand panel"
        >
          <ChevronRightIcon size={16} />
        </button>
        <div className="collapsed-icons">
          <div className="collapsed-icon" title="AI Assistant">
            <Bot size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="right-panel" style={{ width }}>
      {/* AI Assistant at the bottom right, under threads */}
      <div className="panel-content ai-bottom-panel">
        {/* Copilot Header */}
        <div className="ai-panel-header">
          <div className="copilot-title">
            <div className="copilot-icon">🤖</div>
            <span>Copilot</span>
          </div>
          <div className="ai-mode-toggle">
            <button
              className={`mode-btn ${currentMode === 'agent' ? 'active' : ''}`}
              onClick={() => setCurrentMode('agent')}
            >
              <Bot size={14} />
              Agent
            </button>
            <button
              className={`mode-btn ${currentMode === 'ask' ? 'active' : ''}`}
              onClick={() => setCurrentMode('ask')}
            >
              <MessageSquare size={14} />
              Ask
            </button>
          </div>
          <button
            className="new-chat-btn"
            onClick={clearMessages}
            title="New Chat"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="panel-sections">
          <button 
            className={`section-tab ${activeSection === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveSection('ai')}
          >
            <Bot size={14} />
            AI
          </button>
          <button 
            className={`section-tab ${activeSection === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveSection('usage')}
          >
            📊
            Usage
          </button>
        </div>

        {/* AI Section */}
        {activeSection === 'ai' && (
          <>
            {/* Copilot Info Message */}
            {showInfoMessage && (
          <div className={`copilot-info-message ${currentMode === 'agent' ? 'warning' : ''}`}>
            {getInfoMessage()}
            <button 
              onClick={() => setShowInfoMessage(false)}
              style={{ 
                position: 'absolute', 
                top: '8px', 
                right: '8px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Note Context Display */}
        {getCurrentNoteName() && (
          <div className="copilot-note-context">
            Working on: {getCurrentNoteName()}
          </div>
        )}

        {/* Attached Documents */}
        {attachedDocuments.length > 0 && (
          <div className="copilot-attachments">
            {attachedDocuments.map((doc, index) => (
              <div key={index} className="attachment-item">
                {doc}
              </div>
            ))}
          </div>
        )}

        {/* Diff Preview */}
        {diffPreview && (
          <div className="copilot-diff-preview">
            <div className="diff-header">
              <span>Proposed Changes</span>
              <span>{getCurrentNoteName()}</span>
            </div>
            <div className="diff-content">
              {renderDiffLines(diffPreview.original, diffPreview.content).map((line, index) => (
                <div key={index} className={`diff-line ${line.type}`}>
                  {line.type === 'added' && '+ '}
                  {line.type === 'removed' && '- '}
                  {line.content || ' '}
                </div>
              ))}
            </div>
            <div className="diff-actions">
              <button className="diff-action-btn undo" onClick={undoDiff}>
                Discard
              </button>
              <button className="diff-action-btn apply" onClick={applyDiff}>
                Apply
              </button>
            </div>
          </div>
        )}

        {/* AI Tools Section - Show when in Agent mode and note is selected */}
        {currentMode === 'agent' && selectedNote && (
          <div className="ai-tools-section">
            <div className="ai-tools-header">
              <div className="tools-title">
                <Wand2 size={14} />
                <span>AI Tools</span>
              </div>
              <button
                className="toggle-tools-btn"
                onClick={() => setShowAITools(!showAITools)}
                title={showAITools ? 'Hide tools' : 'Show tools'}
              >
                <ChevronDown size={12} className={showAITools ? 'open' : ''} />
              </button>
            </div>

            {showAITools && (
              <div className="ai-tools-grid">
                <button
                  className="ai-tool-btn"
                  onClick={() => handleAIToolAction('format')}
                  disabled={isProcessingAITool}
                  title="Format and improve text structure"
                >
                  <FileText size={16} />
                  <span>Format</span>
                </button>
                <button
                  className="ai-tool-btn expand-and-info"
                  onClick={() => handleAIToolAction('expandAndInfo')}
                  disabled={isProcessingAITool}
                  title="Expand content and add relevant information"
                >
                  <Wand2 size={16} />
                  <span>Enhance</span>
                </button>
                <button
                  className="ai-tool-btn"
                  onClick={() => handleAIToolAction('outline')}
                  disabled={isProcessingAITool}
                  title="Generate outline from content"
                >
                  <Brain size={16} />
                  <span>Outline</span>
                </button>
                <button
                  className="ai-tool-btn"
                  onClick={() => {
                    const doc = selectedNote?.content.split('\n')[0] || 'Current Note';
                    setAttachedDocuments(prev => [...prev, doc]);
                  }}
                  disabled={isProcessingAITool}
                  title="Attach current document to conversation"
                >
                  <PenTool size={16} />
                  <span>Attach</span>
                </button>
              </div>
            )}

            {isProcessingAITool && (
              <div className="ai-processing-indicator">
                <div className="processing-spinner"></div>
                <span>Processing...</span>
              </div>
            )}
          </div>
        )}

        {/* Assistant Mode Selector - Show when in Ask mode */}
        {currentMode === 'ask' && (
          <div className="ai-ask-header">
            <AIAssistantModeSelector
              selectedMode={selectedMode}
              onModeChange={handleModeChange}
              className="compact"
            />
          </div>
        )}

        {/* Pending Suggestions */}
        {pendingSuggestions.length > 0 && (
          <div className="suggestions-section">
            <div className="suggestions-header">
              <span className="magic-gradient-icon">
                <Sparkles size={14} style={{ color: 'transparent' }} />
              </span>
              <span>AI Suggestions</span>
            </div>
            <div className="suggestions-list">
              {pendingSuggestions.map((suggestion) => (
                <AISuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={handleAcceptSuggestion}
                  onReject={rejectSuggestion}
                />
              ))}
            </div>
          </div>
        )}

        <div className="ai-chat-container clean-ai-chat">


          <div className="ai-chat-area clean-chat-area">
            {aiMessages.map((message, index) => (
              <div key={index} className={`ai-message ${message.type}`}>
                <div className="message-header">
                  {message.type === 'ai' ? <Bot size={12} /> : <MessageSquare size={12} />}
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="message-content">
                  {message.type === 'ai' ? (
                    <div dangerouslySetInnerHTML={{ __html: message.content }} />
                  ) : (
                    message.content
                  )}
                </div>
                {message.type === 'ai' && (
                  <button
                    className="insert-to-doc-btn"
                    onClick={() => handleInsertClick(message.content, index)}
                  >
                    <Sparkles size={14} />
                    {activeInsertButton === `${index}` ? 'Click where to add the content' : ''}
                  </button>
                )}
              </div>
            ))}
            {isAiLoading && (
              <div className="ai-message ai">
                <div className="message-content">
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div className="ai-input-area">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => {
                console.log('[RightPanel] input onChange', e.target.value);
                setAiInput(e.target.value);
              }}
              onKeyDown={(e) => {
                console.log('[RightPanel] input onKeyDown', e.key);
                handleAiKeyDown(e);
              }}
              placeholder={currentMode === 'agent' ? 'Ask your AI agent...' : `Ask your ${selectedMode.name.toLowerCase()}...`}
              className="ai-input"
              disabled={isAiLoading || isProcessingAITool}
            />
            <button
              className="ai-send"
              onClick={handleAiSend}
              disabled={!aiInput.trim() || isAiLoading || isProcessingAITool}
            >
              <Send size={16} />
            </button>
          </div>
          {pendingEdit && (
            <div className="ai-edit-review">
              <h4>AI-Suggested Edit for {currentFileName}</h4>
              <pre style={{ maxHeight: 200, overflow: 'auto', background: '#c7c7c7', padding: 8 }}>{pendingEdit}</pre>
              <button onClick={() => { onEditFile(pendingEdit); setPendingEdit(null); }}>Apply Edit</button>
              <button onClick={() => setPendingEdit(null)}>Dismiss</button>
            </div>
          )}
        </div>
          </>
        )}

        {/* Usage Section */}
        {activeSection === 'usage' && (
          <div className="usage-section">
            <UsageDisplay />
          </div>
        )}

      </div>
      <div
        className={`resize-handle vertical ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
      />

    </div>
  );
};

export default RightPanel;
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, X, Loader2 } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { Note } from '../types/Note';
import TodoNote from './TodoNote';
import { aiService } from '../services/aiService';
import '../styles/vscodeLightTheme.css';
import './BasicNote.css';

interface BasicNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onFocus?: () => void;
  fullView?: boolean;
}

const BasicNote: React.FC<BasicNoteProps> = ({
  note,
  onUpdate,
  onDelete,
  onFocus,
  fullView = false
}) => {
  // Note: AI tools moved to RightPanel
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(note.content);
  const [isFormatting, setIsFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const [insertMode, setInsertMode] = useState<{ active: boolean; text: string | null }>({ active: false, text: null });
  const updateTimeoutRef = useRef<number | undefined>(undefined);

  // Reset local state whenever we switch to a new note
  useEffect(() => {
    setLocalContent(note.content);
    setIsEditing(fullView && note.type === 'note');
    setInsertMode({ active: false, text: null });
    setIsFormatting(false);
  }, [note.id, fullView]);

  // Listen for insert mode event from AI Assistant
  useEffect(() => {
    const handler = (e: any) => {
      setInsertMode({ active: true, text: e.detail.text });
    };
    window.addEventListener('ai-insert-mode', handler);
    return () => window.removeEventListener('ai-insert-mode', handler);
  }, []);

  // Listen for AI content updates to force editor refresh
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.noteId === note.id) {
        // Force update the editor content
        const newContent = e.detail.content;
        if (newContent !== localContent) {
          setLocalContent(newContent);
          
          // Update TinyMCE editor if it exists
          if (editorRef.current && note.type === 'note') {
            editorRef.current.setContent(newContent);
          }
        }
      }
    };
    window.addEventListener('ai-content-updated', handler);
    return () => window.removeEventListener('ai-content-updated', handler);
  }, [note.id, localContent, note.type]);

  useEffect(() => {
    if (isEditing && textareaRef.current && !isTypingRef.current) {
      textareaRef.current.focus();
      // Only set cursor position when first opening, not during typing
      setTimeout(() => {
        if (textareaRef.current && !isTypingRef.current) {
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 0);
    }
  }, [isEditing]);

  // Sync local content with note content - enhanced for AI tool updates
  useEffect(() => {
    // Always sync if content changed from external source (like AI tools)
    // but only if we're not currently in the middle of typing
    if (!isTypingRef.current && localContent !== note.content) {
      setLocalContent(note.content);
      
      // Also update TinyMCE editor if it exists and content is different
      if (editorRef.current && note.type === 'note') {
        const currentEditorContent = editorRef.current.getContent();
        if (currentEditorContent !== note.content) {
          editorRef.current.setContent(note.content);
        }
      }
    }
  }, [note.content, localContent]);

  // For full view text notes, start in editing mode
  useEffect(() => {
    if (fullView && note.type === 'note' && !isEditing) {
      setIsEditing(true);
    }
  }, [fullView, note.type, isEditing]);

  // Handle AI formatting for TinyMCE
  const handleTinyMCEFormat = async (editor: any) => {
    if (isFormatting) return;

    // Get both HTML and text content for better formatting
    const htmlContent = editor.getContent();
    const textContent = editor.getContent({ format: 'text' });

    console.log('[BasicNote] Original HTML content:', htmlContent);
    console.log('[BasicNote] Original text content:', textContent);
    console.log('[BasicNote] Content lengths - HTML:', htmlContent.length, 'Text:', textContent.length);

    if (!textContent.trim()) return;

    setIsFormatting(true);
    try {
      // Always use text content for better AI processing
      console.log('[BasicNote] Sending to AI formatter:', textContent);
      const formattedContent = await aiService.formatText(textContent);

      console.log('[BasicNote] AI formatted result:', formattedContent);
      console.log('[BasicNote] Formatted content length:', formattedContent.length);

      editor.setContent(formattedContent);
      onUpdate(note.id, { content: formattedContent });
    } catch (error) {
      console.error('Format error:', error);
    } finally {
      setIsFormatting(false);
    }
  };

  // Handle AI expand for TinyMCE selected text
  const handleTinyMCEExpand = async (editor: any) => {
    if (isFormatting) return;
    const selectedText = editor.selection.getContent({ format: 'text' });
    if (!selectedText.trim()) return;

    setIsFormatting(true);
    try {
      const expanded = await aiService.expandText(selectedText);
      editor.selection.setContent(expanded);
      const content = editor.getContent();
      onUpdate(note.id, { content });
    } catch (error) {
      console.error('TinyMCE Expand error:', error);
    } finally {
      setIsFormatting(false);
    }
  };




  // Handle content changes in textarea
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Only update if content actually changed
    if (value !== localContent) {
      isTypingRef.current = true;
      setLocalContent(value);

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        onUpdate(note.id, { content: value });
        isTypingRef.current = false;
      }, 800);
    }
  };

  // Handle key down events in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow normal typing behavior
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      setIsEditing(false);
    }
  };



  const getTypeIcon = () => {
    switch (note.type) {
      case 'todo': return '☑️';
      case 'folder': return '📁';
      default: return '📝';
    }
  };

  // TinyMCE: add information to selected text
  const handleTinyMCEAddInfo = async (editor: any) => {
    if (isFormatting) return;
    const selectedText = editor.selection.getContent({ format: 'text' });
    if (!selectedText.trim()) return;
    setIsFormatting(true);
    try {
      const enriched = await aiService.addInfoText(selectedText);
      editor.selection.setContent(enriched);
      const content = editor.getContent();
      onUpdate(note.id, { content });
    } catch (error) {
      console.error('TinyMCE AddInfo error:', error);
    } finally {
      setIsFormatting(false);
    }
  };

  // TinyMCE: generate outline from content
  const handleTinyMCEOutline = async (editor: any) => {
    if (isFormatting) return;
    const textContent = editor.getContent({ format: 'text' });
    if (!textContent.trim()) return;
    setIsFormatting(true);
    try {
      const outline = await aiService.brainstorm(textContent);
      const outlineHtml = outline.map(item => `<p>${item}</p>`).join('');
      editor.setContent(outlineHtml);
      onUpdate(note.id, { content: outlineHtml });
    } catch (error) {
      console.error('TinyMCE Outline error:', error);
    } finally {
      setIsFormatting(false);
    }
  };

  // TinyMCE: add research to selected text
  const handleTinyMCEResearch = async (editor: any) => {
    if (isFormatting) return;
    const selectedText = editor.selection.getContent({ format: 'text' });
    if (!selectedText.trim()) return;
    setIsFormatting(true);
    try {
      const researched = await aiService.addResearch(selectedText);
      editor.selection.setContent(researched);
      const content = editor.getContent();
      onUpdate(note.id, { content });
    } catch (error) {
      console.error('TinyMCE Research error:', error);
    } finally {
      setIsFormatting(false);
    }
  };

  // Handle click: enter edit or insert AI suggestion
  const handleClick = (e?: React.MouseEvent) => {
    if (insertMode.active && insertMode.text) {
      if (editorRef.current) {
        editorRef.current.focus();
        editorRef.current.selection.setContent(insertMode.text);
      } else if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = localContent.substring(0, start);
        const after = localContent.substring(end);
        const newVal = before + insertMode.text + after;
        setLocalContent(newVal);
        onUpdate(note.id, { content: newVal });
      }
      setInsertMode({ active: false, text: null });
      e?.stopPropagation();
      return;
    }
    setIsEditing(true);
  };

  const renderContent = () => {

    if (isEditing) {
      return (
        <div className={`note-editor${insertMode.active ? ' insert-mode' : ''}${isFormatting ? ' formatting' : ''}`}
          title={insertMode.active ? 'Click to insert AI suggestion here' : undefined}
          style={{ position: 'relative' }}
        >
          {/* AI Formatting Overlay */}
          {isFormatting && (
            <div className="ai-formatting-overlay">
              <div className="ai-formatting-loader">
                <Loader2 size={32} className="spinner" />
                <div className="formatting-text">
                  <div className="formatting-title">Just a sec</div>
                  <div className="formatting-subtitle">Improving your content...</div>
                </div>
              </div>
            </div>
          )}

          {note.type === 'note' ? (
            <Editor
              key={note.id}
              apiKey="ilzu20bbgoj2ju8hxc61n1juj9p0ys4042lo0yc65tr07rsr"
              onInit={(_evt, editor) => {
                editorRef.current = editor;

                // Register AI Tools dropdown in TinyMCE
                editor.ui.registry.addMenuButton('aitools', {
                  text: 'AI Tools',
                  icon: 'wand',
                  tooltip: 'AI Tools: Format, Expand, Add Info, Add Research, or Outline',
                  fetch: (callback: (items: any[]) => void) => {
                    callback([
                      { type: 'menuitem', text: isFormatting ? 'Formatting...' : 'Format', onAction: () => handleTinyMCEFormat(editor), disabled: isFormatting },
                      { type: 'menuitem', text: 'Expand', onAction: () => handleTinyMCEExpand(editor), disabled: isFormatting },
                      { type: 'menuitem', text: 'Add Info', onAction: () => handleTinyMCEAddInfo(editor), disabled: isFormatting },
                      { type: 'menuitem', text: 'Add Research', onAction: () => handleTinyMCEResearch(editor), disabled: isFormatting },
                      { type: 'menuitem', text: 'Outline', onAction: () => handleTinyMCEOutline(editor), disabled: isFormatting }
                    ]);
                  }
                });
              }}
              value={localContent}
              init={{
                height: fullView ? 800 : 300,
                menubar: false,
                statusbar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'charmap',
                  'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'table', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks fontsize | ' +
                  'bold italic underline strikethrough | forecolor backcolor | ' +
                  'alignleft aligncenter alignright alignjustify | ' +
                  'bullist numlist | outdent indent | link | removeformat | aitools',
                toolbar_mode: 'sliding',
                content_style: `
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
                    font-size: 14px; 
                    line-height: 1.6; 
                    color: #032d60;
                    margin: 16px;
                  }
                  p { margin: 0 0 12px 0; }
                  h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px 0; font-weight: 600; }
                  ul, ol { margin: 8px 0; padding-left: 24px; }
                  li { margin: 4px 0; }
                `,
                placeholder: 'Start typing...',
                skin: 'oxide',
                content_css: false
              }}
              onEditorChange={(content) => {
                // Only update if content actually changed and it's from user input
                if (content !== localContent) {
                  isTypingRef.current = true;
                  setLocalContent(content);
                  if (updateTimeoutRef.current) {
                    clearTimeout(updateTimeoutRef.current);
                  }
                  updateTimeoutRef.current = setTimeout(() => {
                    onUpdate(note.id, { content });
                    isTypingRef.current = false;
                  }, 800);
                }
              }}
              onClick={handleClick}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              className={`note-textarea${insertMode.active ? ' insert-mode' : ''}`}
              placeholder="Start typing..."
              onClick={handleClick}
            />
          )}
        </div>
      );
    }

    return (
      <div className="note-content" onClick={handleClick}>
        {localContent ? (
          note.type === 'note' ? (
            <div dangerouslySetInnerHTML={{ __html: localContent }} />
          ) : (
            localContent
          )
        ) : (
          <span className="note-placeholder">Click to edit</span>
        )}
      </div>
    );
  };

  // For text notes in full view, show only content (header and footer removed)
  if (fullView && note.type === 'note') {
    return (
      <div className={`basic-note ${note.type} full-view-note`}>
        {renderContent()}
      </div>
    );
  }

  // AI tools moved to RightPanel - keep basic note functionality
  return (
    <div className={`basic-note ${note.type}${insertMode.active ? ' insert-mode' : ''}`}>

      <div className="note-header">
        <div className="note-type-info">
          <span className="note-icon">{getTypeIcon()}</span>
          <span className="note-type">{note.type}</span>
        </div>

        <div className="note-actions">
          {onFocus && (
            <button
              className="note-action focus-btn"
              onClick={onFocus}
              title="Focus mode"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            className="note-action delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete note"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="basic-note-wrapper">
        {renderContent()}
        {/* AI tools moved to RightPanel */}
      </div>

      {insertMode.active && (
        <div className="insert-mode-banner">Click anywhere in the note to insert the AI suggestion.</div>
      )}

      <div className="note-footer">
        <div className="note-meta">
          {(note.tags && note.tags.length > 0) ? (
            <div className="note-tags">
              {(note.tags || []).slice(0, 3).map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          ) : null}
          <span className="note-timestamp">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};


export default BasicNote;
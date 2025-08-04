import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Bot, X, Plus, Trash2, Calendar, MapPin, Hash } from 'lucide-react';
import { Note } from '../types/Note';
import '../styles/vscodeLightTheme.css';
import './TodoNote.css';

interface TodoNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onEnhance?: (id: string) => void;
  onFocus?: () => void;
  fullView?: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

const TodoNote: React.FC<TodoNoteProps> = ({
  note,
  onUpdate,
  onDelete,
  onEnhance,
  onFocus,
  fullView = false
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const newTodoInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse content into todos on mount and when note content changes
  useEffect(() => {
    const parseTodos = () => {
      if (!note.content) {
        setTodos([]);
        return;
      }

      const lines = note.content.split('\n').filter(line => line.trim());
      const todoItems: TodoItem[] = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Skip the first line if it doesn't start with checkbox symbols (treat as title)
        if (index === 0 && !trimmed.startsWith('☐ ') && !trimmed.startsWith('☑ ')) {
          return;
        }

        if (trimmed.startsWith('☐ ') || trimmed.startsWith('☑ ')) {
          const completed = trimmed.startsWith('☑ ');
          const text = trimmed.substring(2).trim();
          if (text) {
            todoItems.push({
              id: `todo-${index}-${Date.now()}`,
              text,
              completed
            });
          }
        } else if (trimmed && !trimmed.startsWith('#') && index > 0) {
          // Plain text becomes an uncompleted todo (but not the first line)
          todoItems.push({
            id: `todo-${index}-${Date.now()}`,
            text: trimmed,
            completed: false
          });
        }
      });

      setTodos(todoItems);
    };

    parseTodos();
  }, [note.content]);

  // Debounced update function
  const debouncedUpdate = useCallback((newTodos: TodoItem[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      // Get the title from the first line, or use default
      const existingLines = note.content.split('\n');
      const title = existingLines.length > 0 && !existingLines[0].startsWith('☐') && !existingLines[0].startsWith('☑')
        ? existingLines[0]
        : 'To-do';

      const todoContent = newTodos
        .map(todo => `${todo.completed ? '☑' : '☐'} ${todo.text}`)
        .join('\n');

      const content = title + '\n' + todoContent;
      onUpdate(note.id, { content });
    }, 300);
  }, [note.id, onUpdate, note.content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const toggleTodo = (id: string) => {
    const newTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(newTodos);
    debouncedUpdate(newTodos);
  };

  const addTodo = () => {
    if (!newTodoText.trim()) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random()}`,
      text: newTodoText.trim(),
      completed: false
    };

    const newTodos = [...todos, newTodo];
    setTodos(newTodos);
    setNewTodoText('');
    debouncedUpdate(newTodos);

    // Focus back to input after adding
    setTimeout(() => {
      newTodoInputRef.current?.focus();
    }, 0);
  };

  const deleteTodo = (id: string) => {
    const newTodos = todos.filter(todo => todo.id !== id);
    setTodos(newTodos);
    debouncedUpdate(newTodos);
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const saveEdit = () => {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      setEditingText('');
      return;
    }

    const newTodos = todos.map(todo =>
      todo.id === editingId ? { ...todo, text: editingText.trim() } : todo
    );
    setTodos(newTodos);
    debouncedUpdate(newTodos);
    setEditingId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleNewTodoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  // For full view, show iOS Reminders style
  if (fullView) {
    const listTitle = note.content.split('\n')[0] || 'To-do';
    const incompleteTodos = todos.filter(todo => !todo.completed);
    const completedTodos = todos.filter(todo => todo.completed);
    const hasCompletedTodos = completedTodos.length > 0;

    return (
      <div className="todo-note ios-style">
        {/* iOS-style header */}
        <div className="ios-header">
          <div className="ios-title-section">
            <h1 className="ios-title">{listTitle}</h1>
            <span className="ios-count">{incompleteTodos.length}</span>
          </div>
        </div>

        <div className="ios-content">
          <div className="ios-todo-list">
            {/* Incomplete todos */}
            {incompleteTodos.map(todo => (
              <div key={todo.id} className="ios-todo-item">
                <button
                  className="ios-checkbox"
                  onClick={() => toggleTodo(todo.id)}
                  aria-label="Mark as complete"
                >
                  <div className="checkbox-circle"></div>
                </button>

                {editingId === todo.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={saveEdit}
                    className="ios-todo-input editing"
                  />
                ) : (
                  <span
                    className="ios-todo-text"
                    onClick={() => startEditing(todo.id, todo.text)}
                  >
                    {todo.text}
                  </span>
                )}
              </div>
            ))}

            {/* Add new todo */}
            <div className="ios-todo-item add-item">
              <button
                className="ios-checkbox add-checkbox"
                onClick={() => newTodoInputRef.current?.focus()}
              >
                <div className="checkbox-circle">
                  <Plus size={12} className="plus-icon" />
                </div>
              </button>

              <input
                ref={newTodoInputRef}
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={handleNewTodoKeyDown}
                placeholder="Docs"
                className="ios-todo-input"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="ios-toolbar">
              <button className="ios-toolbar-btn">
                <Calendar size={16} />
                <span>Add Date</span>
              </button>

              <button className="ios-toolbar-btn">
                <MapPin size={16} />
                <span>Add Location</span>
              </button>

              <button className="ios-toolbar-btn">
                <Hash size={16} />
              </button>
            </div>
          </div>

          {/* Completed section */}
          {hasCompletedTodos && (
            <div className="ios-completed-section">
              <div className="ios-completed-header">
                <h3>Completed</h3>
                <span className="ios-completed-count">{completedTodos.length}</span>
              </div>

              {completedTodos.map(todo => (
                <div key={todo.id} className="ios-todo-item completed">
                  <button
                    className="ios-checkbox completed"
                    onClick={() => toggleTodo(todo.id)}
                    aria-label="Mark as incomplete"
                  >
                    <div className="checkbox-circle">
                      <div className="checkmark">✓</div>
                    </div>
                  </button>

                  <span className="ios-todo-text completed">
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="todo-note">
      <div className="note-header">
        <div className="note-type-info">
          <span className="note-icon">☑️</span>
          <span className="note-type">todo</span>
          {totalCount > 0 && (
            <span className="todo-count">
              {completedCount}/{totalCount}
            </span>
          )}
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
          {onEnhance && totalCount > 0 && (
            <button
              className="note-action enhance-btn"
              onClick={() => onEnhance(note.id)}
              title="Enhance with AI"
            >
              <Bot size={14} />
              Enhance
            </button>
          )}
          <button
            className="note-action delete-btn"
            onClick={() => onDelete(note.id)}
            title="Delete todo list"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="todo-content">
        <div className="todo-list">
          {todos.slice(0, 8).map(todo => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <button
                className="todo-checkbox"
                onClick={() => toggleTodo(todo.id)}
              >
                <span className="checkbox-icon">
                  {todo.completed ? '☑' : '☐'}
                </span>
              </button>
              <span className="todo-text">{todo.text}</span>
            </div>
          ))}

          {todos.length === 0 && (
            <div className="empty-todo">
              <span className="empty-text">Click to add your first task</span>
            </div>
          )}

          {todos.length > 8 && (
            <div className="todo-more">
              +{todos.length - 8} more tasks
            </div>
          )}
        </div>

        <div className="add-todo-container">
          <input
            ref={newTodoInputRef}
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleNewTodoKeyDown}
            placeholder="Add a task..."
            className="add-todo-input compact"
          />
          {newTodoText.trim() && (
            <button
              className="add-todo-btn compact"
              onClick={addTodo}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="note-footer">
        <div className="note-meta">
          {note.tags && note.tags.length > 0 && (
            <div className="note-tags">
              {note.tags.slice(0, 3).map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
          <span className="note-timestamp">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TodoNote;
import React from 'react';
import { Plus, CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { Note } from '../../types/Note';
import './TodosList.css';

interface TodosListProps {
  todoNotes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onAddNote: (type: Note['type'], position?: { x: number; y: number }, color?: Note['color']) => Promise<Note>;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
}

const TodosList: React.FC<TodosListProps> = ({
  todoNotes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onUpdateNote
}) => {
  const handleCreateTodo = async () => {
    const newTodo = await onAddNote('todo');

    // Initialize with some default tasks matching the iOS Reminders style
    if (onUpdateNote) {
      onUpdateNote(newTodo.id, {
        content: 'To-do\n☐ Mail packages\n☐ Return library books\n☐ Pick up beverages and snacks for birthday party\n☐ Drop off paperwork at Olivia\'s school\n☐ Get car washed at high school band fundraiser\n☐ Buy supplies for craft projects\n☐ Buy pet food',
        priority: 'medium'
      });
    }

    // Auto-select the new todo
    onSelectNote(newTodo.id);
  };

  const getTodoStats = (note: Note) => {
    const lines = note.content.split('\n');
    const todoLines = lines.filter(line => line.startsWith('☐ ') || line.startsWith('☑ '));
    const completed = lines.filter(line => line.startsWith('☑ ')).length;
    const total = todoLines.length;

    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority?: Note['priority']) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const sortedTodos = todoNotes.sort((a, b) => {
    // Sort by priority first, then by due date, then by update date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority || 'low'] || 1;
    const bPriority = priorityOrder[b.priority || 'low'] || 1;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="todos-list">
      <div className="todos-header">
        <button
          className="create-todo-btn"
          onClick={handleCreateTodo}
        >
          <Plus size={14} />
          New Task List
        </button>
      </div>

      <div className="todos-content">
        {todoNotes.length === 0 ? (
          <div className="empty-state">
            <CheckSquare size={24} />
            <p>No task lists yet</p>
            <span>Create a task list to start organizing your todos</span>
          </div>
        ) : (
          <div className="todos-grid">
            {sortedTodos.map(todo => {
              const stats = getTodoStats(todo);
              const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

              return (
                <div
                  key={todo.id}
                  className={`todo-item ${selectedNoteId === todo.id ? 'selected' : ''} ${isOverdue ? 'overdue' : ''}`}
                  onClick={() => onSelectNote(todo.id)}
                >
                  <div className="todo-header">
                    <div className="todo-icon">
                      <CheckSquare size={14} />
                    </div>
                    <div className="todo-title">
                      {todo.content.split('\n')[0] || 'Untitled Task List'}
                    </div>
                    {todo.priority && (
                      <div
                        className="priority-dot"
                        style={{ backgroundColor: getPriorityColor(todo.priority) }}
                      />
                    )}
                  </div>

                  <div className="todo-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {stats.completed}/{stats.total} tasks
                    </span>
                  </div>

                  <div className="todo-meta">
                    {todo.dueDate && (
                      <div className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                        <Clock size={10} />
                        <span>{formatDate(todo.dueDate)}</span>
                      </div>
                    )}
                    <span className="update-date">
                      {formatDate(todo.updatedAt)}
                    </span>
                  </div>

                  {isOverdue && (
                    <div className="overdue-indicator">
                      <AlertCircle size={12} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodosList;
// Helper to flatten tree nodes in visible order
const flattenVisibleTree = (nodes: TreeNode[]): TreeNode[] => {
  let result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.type === 'folder' && node.isExpanded && node.children.length > 0) {
      result = result.concat(flattenVisibleTree(node.children));
    }
  }
  return result;
};
import React, { useState, useCallback, useMemo } from 'react';
import { extractCleanTitle } from '../../utils/textUtils';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Edit3,
  Trash2,
  Copy,
  FileText,
  CheckSquare,
  Mic,
  PenTool,
  Camera,
  Image,
  Monitor,
  StickyNote,
  Plus,
  Search,
  X
} from 'lucide-react';
import { Note } from '../../types/Note';
import Quicknotes from '../Quicknotes';
import VerticalActionSidebar from './VerticalActionSidebar';
import './WorkspaceExplorer.css';

interface WorkspaceExplorerProps {
  notes: Note[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onAddNote: (type: Note['type'], parentId?: string) => Promise<Note>;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  workspaceName?: string;
  // VerticalActionSidebar props
  onCreateWebView?: () => Promise<void>;
  onOpenWebViewOverlay?: () => void;
  showWebViewPanel?: boolean;
  onToggleWebView?: (show: boolean) => void;
  onOpenSpreadsheet?: () => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: Note['type'];
  children: TreeNode[];
  isExpanded: boolean;
  parentId?: string;
  note?: Note;
}

const WorkspaceExplorer: React.FC<WorkspaceExplorerProps> = ({
  notes,
  selectedNoteId,
  selectedFolderId,
  onSelectNote,
  onSelectFolder,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  workspaceName = "My Desk",
  onCreateWebView,
  onOpenWebViewOverlay,
  showWebViewPanel = false,
  onToggleWebView,
  onOpenSpreadsheet
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    type: Note['type'];
  } | null>(null);
  const [renamingNode, setRenamingNode] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [lastClickedFile, setLastClickedFile] = useState<string | null>(null);



  // Filter notes based on search term
  const filteredNotes = useMemo(() => {
    if (!searchTerm.trim()) return notes;

    const searchLower = searchTerm.toLowerCase();
    return notes.filter(note => {
      const noteName = extractCleanTitle(note.content) || `Untitled ${note.type}`;
      const noteContent = note.content.toLowerCase();
      return noteName.toLowerCase().includes(searchLower) ||
        noteContent.includes(searchLower) ||
        note.type.toLowerCase().includes(searchLower);
    });
  }, [notes, searchTerm]);

  // Build hierarchical tree structure from filtered notes array
  const buildTree = useCallback((): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    const notesToUse = searchTerm.trim() ? filteredNotes : notes;

    // Create nodes for all notes
    notesToUse.forEach(note => {
      const nodeName = extractCleanTitle(note.content) || `Untitled ${note.type}`;
      const node: TreeNode = {
        id: note.id,
        name: nodeName.substring(0, 50),
        type: note.type,
        children: [],
        isExpanded: expandedFolders.has(note.id),
        parentId: note.parentId,
        note
      };
      nodeMap.set(note.id, node);
    });

    // If searching, show flat list (no hierarchy)
    if (searchTerm.trim()) {
      notesToUse.forEach(note => {
        const node = nodeMap.get(note.id);
        if (node) {
          rootNodes.push(node);
        }
      });
    } else {
      // Build hierarchy for normal view
      nodeMap.forEach(node => {
        if (node.parentId && nodeMap.has(node.parentId)) {
          nodeMap.get(node.parentId)!.children.push(node);
        } else {
          rootNodes.push(node);
        }
      });
    }

    // Sort: folders first, then by name
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  }, [notes, filteredNotes, expandedFolders, searchTerm]);

  const toggleFolder = (nodeId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, nodeId: string, type: Note['type']) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId,
      type
    });
  };

  const handleAddItem = async (type: Note['type'], parentId?: string) => {
    try {
      // Use the provided parentId or the currently selected folder
      const targetParentId = parentId || selectedFolderId || undefined;

      const newNote = await onAddNote(type, targetParentId);

      // Expand the parent folder if creating inside it
      if (targetParentId) {
        setExpandedFolders(prev => new Set(prev).add(targetParentId));
      }

      // If creating a folder, select it immediately
      if (type === 'folder') {
        onSelectFolder(newNote.id);
      }

      if (type !== 'folder') {
        onSelectNote(newNote.id);
        onSelectFolder(null);
      }

      setContextMenu(null);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleRename = (nodeId: string) => {
    setRenamingNode(nodeId);
    setContextMenu(null);
  };

  const handleRenameSubmit = (nodeId: string, newName: string) => {
    if (newName.trim() && newName.trim() !== '') {
      const note = notes.find(n => n.id === nodeId);
      if (note) {
        // For notes, update the first line as the title while preserving the rest
        if (note.type === 'note' || note.type === 'todo') {
          const lines = note.content.split('\n');
          const newContent = [newName.trim(), ...lines.slice(1)].join('\n');
          onUpdateNote(nodeId, { content: newContent });
        } else if (note.type === 'folder') {
          // For folders, just update the content to the new name
          onUpdateNote(nodeId, { content: newName.trim() });
        }
      }
    }
    setRenamingNode(null);
  };

  const handleDelete = (nodeId: string) => {
    if (selectedFiles.length > 1 && selectedFiles.includes(nodeId)) {
      selectedFiles.forEach(id => onDeleteNote(id));
      setSelectedFiles([]);
    } else {
      onDeleteNote(nodeId);
      setSelectedFiles([]);
    }
    setContextMenu(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedItem(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
  };

  const handleDragOver = (e: React.DragEvent, nodeId: string, nodeType: Note['type']) => {
    e.preventDefault();

    // Only allow dropping on folders and only if it's not the dragged item itself
    if (nodeType === 'folder' && nodeId !== draggedItem) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolder(nodeId);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedNodeId = e.dataTransfer.getData('text/plain') || draggedItem;

    if (draggedNodeId && targetFolderId && draggedNodeId !== targetFolderId) {
      // Prevent dropping a folder into its own children
      const draggedNote = notes.find(n => n.id === draggedNodeId);
      const targetFolder = notes.find(n => n.id === targetFolderId);

      if (draggedNote && targetFolder && targetFolder.type === 'folder') {
        // Check if target folder is not a descendant of dragged item
        const isDescendant = (parentId: string, childId: string): boolean => {
          const parent = notes.find(n => n.id === parentId);
          if (!parent || parent.type !== 'folder') return false;

          const children = notes.filter(n => n.parentId === parentId);
          for (const child of children) {
            if (child.id === childId || isDescendant(child.id, childId)) {
              return true;
            }
          }
          return false;
        };

        if (!isDescendant(draggedNodeId, targetFolderId)) {
          onUpdateNote(draggedNodeId, { parentId: targetFolderId });

          // Expand the target folder to show the moved item
          setExpandedFolders(prev => new Set(prev).add(targetFolderId));
        }
      }
    }

    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverFolder(null);
    setDragOverRoot(false);
  };

  const getTypeIcon = (type: Note['type'], isExpanded?: boolean) => {
    const iconProps = { size: 16 };

    switch (type) {
      case 'folder':
        return isExpanded ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
      case 'todo':
        return <CheckSquare {...iconProps} />;
      case 'voice':
        return <Mic {...iconProps} />;
      case 'sketch':
        return <PenTool {...iconProps} />;
      case 'scan':
        return <Camera {...iconProps} />;
      case 'media':
        return <Image {...iconProps} />;
      case 'webview':
        return <Monitor {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isFileSelected = selectedNoteId === node.id;
    const isFolderSelected = selectedFolderId === node.id;
    const isSelected = isFileSelected || isFolderSelected;
    const isFolder = node.type === 'folder';
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedFolders.has(node.id);
    const isDraggedOver = dragOverFolder === node.id;
    const isDragging = draggedItem === node.id;

    const handleItemClick = (e: React.MouseEvent) => {
      if (isFolder) {
        if (isFolderSelected) {
          onSelectFolder(null);
        } else {
          onSelectFolder(node.id);
          setExpandedFolders(prev => new Set(prev).add(node.id));
        }
        setSelectedFiles([]);
        setLastClickedFile(null);
      } else {
        if (e.shiftKey && lastClickedFile) {
          // Shift-click range selection using visible tree order
          const visibleNodes = flattenVisibleTree(tree);
          const anchorIndex = visibleNodes.findIndex(n => n.id === lastClickedFile);
          const currentIndex = visibleNodes.findIndex(n => n.id === node.id);
          if (anchorIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(anchorIndex, currentIndex);
            const end = Math.max(anchorIndex, currentIndex);
            const rangeIds = visibleNodes.slice(start, end + 1).map(n => n.id);
            setSelectedFiles(rangeIds);
          }
        } else if (e.ctrlKey || e.metaKey) {
          setSelectedFiles(prev =>
            prev.includes(node.id)
              ? prev.filter(id => id !== node.id)
              : [...prev, node.id]
          );
          setLastClickedFile(node.id);
        } else {
          setSelectedFiles([node.id]);
          setLastClickedFile(node.id);
        }
        onSelectNote(node.id);
        onSelectFolder(null);
      }
    };

    const isMultiSelected = selectedFiles.includes(node.id);
    return (
      <div key={node.id} className="tree-node">
        <div
          className={`tree-item ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${isFolder ? 'folder' : 'file'} ${isFolderSelected ? 'folder-selected' : ''} ${isDraggedOver && isFolder ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
          data-type={node.type}
          style={{ paddingLeft: `${depth * 8 + 4}px` }}
          draggable={true}
          onClick={handleItemClick}
          onContextMenu={(e) => handleContextMenu(e, node.id, node.type)}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id, node.type)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => isFolder ? handleDrop(e, node.id) : undefined}
          onDragEnd={handleDragEnd}
        >
          <div className="tree-item-content">
            {isFolder && hasChildren && (
              <button
                className="expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(node.id);
                }}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            {(!isFolder || !hasChildren) && <div className="expand-placeholder" />}

            <div className="tree-item-icon">
              {getTypeIcon(node.type, isExpanded)}
            </div>

            {renamingNode === node.id ? (
              <input
                type="text"
                defaultValue={node.name}
                className="rename-input"
                autoFocus
                onBlur={(e) => handleRenameSubmit(node.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit(node.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setRenamingNode(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="tree-item-label">{node.name}</span>
            )}
          </div>

          <div className="tree-item-actions">
            <button
              className="tree-action"
              onClick={(e) => {
                e.stopPropagation();
                handleRename(node.id);
              }}
              title="Rename"
            >
              <Edit3 size={12} />
            </button>
          </div>
        </div>

        {isFolder && isExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="workspace-explorer">
      {/* Vertical Action Sidebar */}
      {onCreateWebView && onOpenWebViewOverlay && onToggleWebView && (
        <VerticalActionSidebar
          onAddNote={onAddNote}
          onCreateWebView={onCreateWebView}
          onOpenWebViewOverlay={onOpenWebViewOverlay}
          showWebViewPanel={showWebViewPanel}
          onToggleWebView={onToggleWebView}
          onOpenSpreadsheet={onOpenSpreadsheet}
        />
      )}

      <div
        className={`workspace-content ${dragOverRoot ? 'drag-over-root' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          // Allow dropping on root level to move items out of folders
          if (draggedItem && e.target === e.currentTarget) {
            e.dataTransfer.dropEffect = 'move';
            setDragOverRoot(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.target === e.currentTarget) {
            setDragOverRoot(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedNodeId = e.dataTransfer.getData('text/plain') || draggedItem;

          // Check if we're dropping on the workspace content itself (not on a tree item)
          if (draggedNodeId && e.target === e.currentTarget) {
            // Move to root level (remove parent)
            onUpdateNote(draggedNodeId, { parentId: undefined });
          }

          setDraggedItem(null);
          setDragOverFolder(null);
          setDragOverRoot(false);
        }}
      >
        <div className="clean-search-container">
          <Search size={14} className="clean-search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="clean-search-input"
          />
          {searchTerm && (
            <button
              className="clean-search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {tree.length === 0 ? (
          <div className="empty-workspace">
            <p>No items in workspace</p>

          </div>
        ) : (
          <div className="tree-view">
            {tree.map(node => renderTreeNode(node))}
          </div>
        )}

        {/* Quicknotes Button */}
        <Quicknotes workspaceId={workspaceName} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="context-menu-header">
              {contextMenu.type === 'folder' ? 'Folder Options' : 'Note Options'}
            </div>

            {contextMenu.type === 'folder' && (
              <>
                <button
                  className="context-menu-item"
                  onClick={() => handleAddItem('folder', contextMenu.nodeId)}
                >
                  <Folder size={14} />
                  New Folder
                </button>
                <button
                  className="context-menu-item"
                  onClick={() => handleAddItem('note', contextMenu.nodeId)}
                >
                  <StickyNote size={14} />
                  New Doc
                </button>
                <button
                  className="context-menu-item"
                  onClick={() => handleAddItem('todo', contextMenu.nodeId)}
                >
                  <CheckSquare size={14} />
                  New Todo
                </button>
                <div className="context-menu-separator" />
              </>
            )}

            <button
              className="context-menu-item"
              onClick={() => handleRename(contextMenu.nodeId)}
            >
              <Edit3 size={14} />
              Rename
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                // Copy functionality could be implemented here
                navigator.clipboard.writeText(notes.find(n => n.id === contextMenu.nodeId)?.content || '');
                setContextMenu(null);
              }}
            >
              <Copy size={14} />
              Copy
            </button>
            <div className="context-menu-separator" />
            <button
              className="context-menu-item danger"
              onClick={() => handleDelete(contextMenu.nodeId)}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceExplorer;
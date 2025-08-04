import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Upload, Save, FileSpreadsheet } from 'lucide-react';
import jspreadsheet from 'jspreadsheet-ce';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import './SpreadsheetEditor.css';

interface SpreadsheetEditorProps {
  onSave?: (data: any[][]) => void;
  onClose?: () => void;
  initialData?: any[][];
  title?: string;
  fileName?: string;
  onFileNameChange?: (name: string) => void;
  isModal?: boolean;
}

const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  onSave,
  onClose,
  initialData,
  title = 'Spreadsheet Editor',
  fileName: propFileName,
  onFileNameChange,
  isModal = false
}) => {
  const spreadsheetRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [spreadsheetInstance, setSpreadsheetInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState(propFileName || 'Untitled Spreadsheet');

  useEffect(() => {
    if (spreadsheetRef.current) {
      // Clear any existing spreadsheet
      if (spreadsheetInstance) {
        spreadsheetInstance.destroy();
      }

      // Initialize new spreadsheet
      const data = initialData || [
        ['Sample', 'Data', 'Header', 'Column', 'Example'],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', '']
      ];

      const instance = jspreadsheet(spreadsheetRef.current, {
        data: data,
        minDimensions: [5, 10],
        allowInsertRow: true,
        allowInsertColumn: true,
        allowDeleteRow: true,
        allowDeleteColumn: true,
        allowRenameColumn: true,
        allowComments: true,
        wordWrap: true,
        csvFileName: fileName,
        columns: [
          { width: 120 },
          { width: 120 },
          { width: 120 },
          { width: 120 },
          { width: 120 }
        ]
      });

      setSpreadsheetInstance(instance);

      // Cleanup function
      return () => {
        if (instance && instance.destroy) {
          instance.destroy();
        }
      };
    }
  }, [initialData]);

  const handleSave = () => {
    if (spreadsheetInstance) {
      const data = spreadsheetInstance.getData();
      if (onSave) {
        onSave(data);
      }

      // Also save to localStorage as backup
      localStorage.setItem('spreadsheet_backup', JSON.stringify({
        data,
        fileName,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handleExportCSV = () => {
    if (spreadsheetInstance) {
      const data = spreadsheetInstance.getData();
      const csvContent = (data as any[][]).map((row: any[]) =>
        row.map((cell: any) => `"${cell || ''}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportJSON = () => {
    if (spreadsheetInstance) {
      const data = spreadsheetInstance.getData();
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name.replace(/\.[^/.]+$/, ''));

    try {
      const text = await file.text();
      let data: any[][] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n');
        data = lines.map(line => {
          // Simple CSV parsing - for production, consider using a proper CSV parser
          return line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
        }).filter(row => row.some(cell => cell !== ''));
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        data = JSON.parse(text);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON files.');
      }

      // Recreate spreadsheet with new data
      if (spreadsheetInstance) {
        spreadsheetInstance.destroy();
      }

      if (spreadsheetRef.current) {
        const instance = jspreadsheet(spreadsheetRef.current, {
          data,
          minDimensions: [Math.max(data[0]?.length || 5, 5), Math.max(data.length, 10)],
          allowInsertRow: true,
          allowInsertColumn: true,
          allowDeleteRow: true,
          allowDeleteColumn: true,
          allowRenameColumn: true,
          allowComments: true,
          wordWrap: true,
          csvFileName: fileName,
          columns: Array(Math.max(data[0]?.length || 5, 5)).fill({ width: 120 })
        });
        setSpreadsheetInstance(instance);
      }

    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadFromBackup = () => {
    const backup = localStorage.getItem('spreadsheet_backup');
    if (backup) {
      try {
        const { data, fileName: backupFileName } = JSON.parse(backup);
        setFileName(backupFileName || 'Restored Spreadsheet');

        if (spreadsheetInstance) {
          spreadsheetInstance.destroy();
        }

        if (spreadsheetRef.current) {
          const instance = jspreadsheet(spreadsheetRef.current, {
            data,
            minDimensions: [Math.max(data[0]?.length || 5, 5), Math.max(data.length, 10)],
            allowInsertRow: true,
            allowInsertColumn: true,
            allowDeleteRow: true,
            allowDeleteColumn: true,
            allowRenameColumn: true,
            allowComments: true,
            wordWrap: true,
            csvFileName: fileName,
            columns: Array(Math.max(data[0]?.length || 5, 5)).fill({ width: 120 })
          });
          setSpreadsheetInstance(instance);
        }
      } catch (error) {
        console.error('Error loading backup:', error);
        alert('Error loading backup data');
      }
    } else {
      alert('No backup data found');
    }
  };

  const containerClass = isModal ? "spreadsheet-editor-overlay" : "spreadsheet-editor-container";
  const editorClass = "spreadsheet-editor";

  const content = (
    <div className={editorClass}>
      <div className="spreadsheet-header">
        <div className="spreadsheet-title">
          <FileSpreadsheet size={20} />
          <input
            type="text"
            value={fileName}
            onChange={(e) => {
              setFileName(e.target.value);
              onFileNameChange?.(e.target.value);
            }}
            className="filename-input"
          />
        </div>

        <div className="spreadsheet-toolbar">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.json"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="toolbar-btn"
            title="Upload file"
            disabled={isLoading}
          >
            <Upload size={16} />
            Upload
          </button>

          <button
            onClick={handleExportCSV}
            className="toolbar-btn"
            title="Download as CSV"
          >
            <Download size={16} />
            CSV
          </button>

          <button
            onClick={handleExportJSON}
            className="toolbar-btn"
            title="Download as JSON"
          >
            <Download size={16} />
            JSON
          </button>

          <button
            onClick={handleSave}
            className="toolbar-btn save-btn"
            title="Save"
          >
            <Save size={16} />
            Save
          </button>

          <button
            onClick={loadFromBackup}
            className="toolbar-btn"
            title="Load from backup"
          >
            📁 Backup
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="toolbar-btn close-btn"
              title="Close"
            >
              <X size={16} />
              Close
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading file...</span>
        </div>
      )}

      <div className="spreadsheet-container">
        <div ref={spreadsheetRef} className="jspreadsheet-container" />
      </div>

      <div className="spreadsheet-footer">
        <div className="footer-info">
          <span>Use right-click for context menu • Ctrl+C/V for copy/paste • Double-click to edit cells</span>
        </div>
      </div>
    </div>
  );

  return isModal ? (
    <div className={containerClass}>
      {content}
    </div>
  ) : (
    content
  );
};

export default SpreadsheetEditor;
@@ .. @@
   return (
-    <div className="vs-layout">
+    <div className="vs-layout fade-in">
+      {/* VS Code Title Bar */}
+      <div className="vs-title-bar">
+        <div className="title-bar-content">
+          <span className="app-title">Suitenote</span>
+          <span className="workspace-indicator">
+            {currentWorkspace?.name || 'My Workspace'}
+          </span>
+          <div className="copilot-badge">
+            <div className="copilot-indicator"></div>
+            Copilot
+          </div>
+        </div>
+      </div>
+
+      {/* VS Code Activity Bar */}
+      <div className="vs-activity-bar">
+        <div 
+          className={`activity-item ${!leftPanelCollapsed ? 'active' : ''}`}
+          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
+          title="Explorer"
+        >
+          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
+            <path d="M3 3h7v2H3v14h7v2H3c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm11 4l4 4-4 4v-3H9v-2h5V7z"/>
+          </svg>
+        </div>
+        
+        <div 
+          className="activity-item"
+          title="Search"
+        >
+          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
+            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
+          </svg>
+        </div>
+
+        <div 
+          className={`activity-item ${!rightPanelCollapsed ? 'active' : ''}`}
+          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
+          title="Copilot"
+        >
+          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
+            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z"/>
+          </svg>
+        </div>
+
+        <div 
+          className="activity-item"
+          title="Extensions"
+        >
+          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
+            <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
+          </svg>
+        </div>
+      </div>

       {/* Mobile Navigation Toggle */}
@@ .. @@
       )}

+      {/* VS Code Status Bar */}
+      <div className="vs-status-bar">
+        <div className="status-left">
+          <div className="status-item">
+            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
+              <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
+            </svg>
+            <span>main</span>
+          </div>
+          <div className="status-item">
+            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
+              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
+            </svg>
+            <span>All changes saved</span>
+          </div>
+        </div>
+        
+        <div className="status-right">
+          <div className="status-item">
+            <span>{notes.length} files</span>
+          </div>
+          <div className="status-item">
+            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
+              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l6.91-1.01L12 2z"/>
+            </svg>
+            <span>Copilot</span>
+          </div>
+        </div>
+      </div>
     </div>
   );
 };
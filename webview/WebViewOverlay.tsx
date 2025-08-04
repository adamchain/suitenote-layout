import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, RotateCcw, ExternalLink, StickyNote, PanelRightClose, PanelRightOpen, Search } from 'lucide-react';
import { Note } from '../../types/Note';
import './WebViewOverlay.css';

interface WebViewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  onCreateNote: (content: string, url?: string) => void;
  initialSearchQuery?: string;
}

interface WebViewNote {
  id: string;
  content: string;
  url: string;
  timestamp: string;
  domain: string;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  displayLink: string;
  sourceType: 'academic' | 'news' | 'reference' | 'expert' | 'statistical' | 'web';
}

const WebViewOverlay: React.FC<WebViewOverlayProps> = ({
  isOpen,
  onClose,
  initialUrl = 'https://',
  onCreateNote,
  initialSearchQuery = ''
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [originalUrl, setOriginalUrl] = useState(initialUrl); // Store original URL for notes
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [webViewNotes, setWebViewNotes] = useState<WebViewNote[]>([]);
  const [showNotesPanel, setShowNotesPanel] = useState(true);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle escape key to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle initial search query
  useEffect(() => {
    if (initialSearchQuery && isOpen) {
      setSearchQuery(initialSearchQuery);
      setShowSearch(true);
      // Auto-trigger search if query is provided
      if (initialSearchQuery.trim()) {
        handleSearch(initialSearchQuery);
      }
    }
  }, [initialSearchQuery, isOpen]);

  const handleClose = () => {
    // Save any pending note before closing
    if (noteContent.trim()) {
      handleSaveNote();
    }
    onClose();
  };

  const transformUrlForIframe = (url: string): string => {
    let transformedUrl = url.trim();

    // Add protocol if missing
    if (!transformedUrl.startsWith('http://') && !transformedUrl.startsWith('https://')) {
      transformedUrl = 'https://' + transformedUrl;
    }

    // Google Services: Add embed parameter to bypass X-Frame-Options
    if (transformedUrl.includes('google.com') || transformedUrl.includes('docs.google.com') || 
        transformedUrl.includes('drive.google.com') || transformedUrl.includes('sites.google.com') ||
        transformedUrl.includes('sheets.google.com') || transformedUrl.includes('slides.google.com') ||
        transformedUrl.includes('forms.google.com')) {
      const separator = transformedUrl.includes('?') ? '&' : '?';
      transformedUrl = transformedUrl + separator + 'output=embed';
    }
    
    // Google Maps: Convert to embed format
    if (transformedUrl.includes('google.com/maps')) {
      if (!transformedUrl.includes('/embed')) {
        transformedUrl = transformedUrl.replace('/maps', '/maps/embed');
      }
    }

    // YouTube: Convert watch URLs to embed format
    if (transformedUrl.includes('youtube.com/watch?v=')) {
      transformedUrl = transformedUrl.replace('watch?v=', 'embed/');
    } else if (transformedUrl.includes('youtu.be/')) {
      const videoId = transformedUrl.split('youtu.be/')[1].split('?')[0];
      transformedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    // Twitter/X: Convert to embed format
    if (transformedUrl.includes('twitter.com/') && transformedUrl.includes('/status/')) {
      transformedUrl = transformedUrl.replace('twitter.com', 'platform.twitter.com/embed');
    } else if (transformedUrl.includes('x.com/') && transformedUrl.includes('/status/')) {
      transformedUrl = transformedUrl.replace('x.com', 'platform.twitter.com/embed');
    }

    // Instagram: Convert to embed format
    if (transformedUrl.includes('instagram.com/p/')) {
      transformedUrl = transformedUrl + 'embed/';
    }

    // Vimeo: Convert to embed format
    if (transformedUrl.includes('vimeo.com/') && !transformedUrl.includes('/player/')) {
      const videoId = transformedUrl.split('vimeo.com/')[1].split('?')[0];
      transformedUrl = `https://player.vimeo.com/video/${videoId}`;
    }

    // CodePen: Convert to embed format
    if (transformedUrl.includes('codepen.io/') && transformedUrl.includes('/pen/')) {
      transformedUrl = transformedUrl.replace('/pen/', '/embed/');
    }

    // Figma: Convert to embed format
    if (transformedUrl.includes('figma.com/file/')) {
      transformedUrl = transformedUrl.replace('/file/', '/embed?embed_host=share&url=');
    }

    // GitHub: Add embed parameter for gists
    if (transformedUrl.includes('gist.github.com')) {
      const separator = transformedUrl.includes('?') ? '&' : '?';
      transformedUrl = transformedUrl + separator + 'embed=true';
    }

    // Notion: Convert to embed format
    if (transformedUrl.includes('notion.so/') || transformedUrl.includes('notion.site/')) {
      const separator = transformedUrl.includes('?') ? '&' : '?';
      transformedUrl = transformedUrl + separator + 'embed=true';
    }

    // Airtable: Convert to embed format
    if (transformedUrl.includes('airtable.com/') && transformedUrl.includes('/shr')) {
      transformedUrl = transformedUrl.replace('/shr', '/embed/shr');
    }

    // Spotify: Convert to embed format
    if (transformedUrl.includes('open.spotify.com/')) {
      transformedUrl = transformedUrl.replace('open.spotify.com', 'open.spotify.com/embed');
    }

    return transformedUrl;
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && url !== 'https://' && url.trim()) {
      const originalUrlValue = url.trim();
      const validUrl = transformUrlForIframe(originalUrlValue);

      // Store both original and transformed URLs
      setOriginalUrl(originalUrlValue.startsWith('http') ? originalUrlValue : 'https://' + originalUrlValue);
      setCurrentUrl(validUrl);
      setIsLoading(true);
      setFrameError(null);
      setIsBlocked(false);
      
      // Clear existing timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      // Set timeout to detect blocked iframes
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          handleIframeError();
        }
      }, 10000); // 10 second timeout
      
      // Update iframe src
      if (iframeRef.current) {
        iframeRef.current.src = validUrl;
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setFrameError(null);
    setIsBlocked(false);
    
    // Clear timeout since iframe loaded successfully
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Update URL from iframe if possible (same-origin)
        try {
          const iframeUrl = iframe.contentWindow.location.href;
          if (iframeUrl && iframeUrl !== 'about:blank') {
            setUrl(iframeUrl);
            setCurrentUrl(iframeUrl);
          }
        } catch (error) {
          // Cross-origin restrictions prevent access - this is normal
          console.log('Cannot access iframe URL due to CORS - this is expected for external sites');
        }
      }
    } catch (error) {
      console.log('Error accessing iframe content:', error);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIsBlocked(true);
    
    // Check common blocking reasons
    const domain = currentUrl ? new URL(currentUrl).hostname : '';
    let errorMessage = `This website (${domain}) cannot be displayed in an iframe.`;
    
    if (domain.includes('reddit.com')) {
      errorMessage = 'Reddit blocks iframe embedding due to Content Security Policy.';
    } else if (domain.includes('facebook.com')) {
      errorMessage = 'Facebook blocks iframe embedding for security reasons.';
    } else if (domain.includes('bank') || domain.includes('secure')) {
      errorMessage = 'Secure sites often block iframe embedding for safety.';
    } else if (domain.includes('amazon.com') || domain.includes('ebay.com')) {
      errorMessage = 'E-commerce sites typically block iframe embedding.';
    } else {
      errorMessage = `${domain} has security policies that prevent iframe embedding.`;
    }
    
    setFrameError(errorMessage);
  };

  const handleGoBack = () => {
    if (iframeRef.current && canGoBack) {
      try {
        iframeRef.current.contentWindow?.history.back();
      } catch (error) {
        console.log('Cannot navigate back due to CORS');
      }
    }
  };

  const handleGoForward = () => {
    if (iframeRef.current && canGoForward) {
      try {
        iframeRef.current.contentWindow?.history.forward();
      } catch (error) {
        console.log('Cannot navigate forward due to CORS');
      }
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setFrameError(null);
      setIsBlocked(false);
      iframeRef.current.src = currentUrl;
    }
  };

  const handleOpenInNewTab = () => {
    const urlToOpen = originalUrl && originalUrl !== 'https://' ? originalUrl : currentUrl;
    if (urlToOpen && urlToOpen !== 'https://') {
      window.open(urlToOpen, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveNote = () => {
    const urlForNotes = originalUrl && originalUrl !== 'https://' ? originalUrl : currentUrl;
    if (noteContent.trim() && urlForNotes) {
      const domain = new URL(urlForNotes).hostname;
      
      // Create local note for the overlay
      const newNote: WebViewNote = {
        id: Date.now().toString(),
        content: noteContent.trim(),
        url: urlForNotes,
        timestamp: new Date().toISOString(),
        domain
      };
      
      setWebViewNotes(prev => [newNote, ...prev]);
      
      // Create actual note in the app with original URL
      onCreateNote(noteContent.trim(), urlForNotes);
      
      setNoteContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveNote();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchQuery(query);
    
    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const data = await response.json();
        const results: SearchResult[] = data.real_citations?.map((citation: any) => ({
          title: citation.title,
          url: citation.url,
          snippet: citation.snippet,
          displayLink: citation.source,
          sourceType: citation.type
        })) || [];
        
        setSearchResults(results);
      } else {
        console.error('Search failed:', response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = (resultUrl: string) => {
    const originalUrlValue = resultUrl;
    const validUrl = transformUrlForIframe(originalUrlValue);

    setOriginalUrl(originalUrlValue);
    setCurrentUrl(validUrl);
    setUrl(resultUrl);
    setShowSearch(false);
    setIsLoading(true);
    setFrameError(null);
    setIsBlocked(false);
    
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        handleIframeError();
      }
    }, 10000);
    
    if (iframeRef.current) {
      iframeRef.current.src = validUrl;
    }
  };

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'academic': return '#4CAF50';
      case 'news': return '#FF9800';
      case 'reference': return '#2196F3';
      case 'expert': return '#9C27B0';
      case 'statistical': return '#607D8B';
      default: return '#757575';
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'academic': return 'Academic';
      case 'news': return 'News';
      case 'reference': return 'Reference';
      case 'expert': return 'Expert';
      case 'statistical': return 'Statistical';
      default: return 'Web';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="webview-overlay">
      <div className="webview-container">
        {/* Header */}
        <div className="webview-header">
          <div className="webview-controls">
            {/* Navigation buttons */}
            <div className="webview-nav-buttons">
              <button
                className="webview-nav-btn"
                onClick={handleGoBack}
                disabled={!canGoBack}
                title="Go back"
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className="webview-nav-btn"
                onClick={handleGoForward}
                disabled={!canGoForward}
                title="Go forward"
              >
                <ArrowRight size={14} />
              </button>
              <button
                className="webview-nav-btn"
                onClick={handleRefresh}
                title="Refresh"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* URL bar */}
            <form onSubmit={handleUrlSubmit} className="webview-url-bar">
              {isLoading && <div className="webview-loading-indicator" />}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL... (Google, YouTube, Twitter, etc. auto-converted)"
                className="webview-url-input"
              />
            </form>

            {/* Action buttons */}
            <div className="webview-action-buttons">
              <button
                className="webview-action-btn"
                onClick={() => setShowSearch(!showSearch)}
                title={showSearch ? "Hide search" : "Show AI search"}
              >
                <Search size={14} />
                {showSearch ? 'Hide Search' : 'AI Search'}
              </button>
              <button
                className="webview-action-btn"
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                title={showNotesPanel ? "Hide notes panel" : "Show notes panel"}
              >
                {showNotesPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                {showNotesPanel ? 'Hide Notes' : 'Show Notes'}
              </button>
              <button
                className="webview-action-btn"
                onClick={handleOpenInNewTab}
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                External
              </button>
            </div>
          </div>

          <button
            className="webview-close-btn"
            onClick={handleClose}
            title="Close webview"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="webview-content">
          {/* AI Search Interface */}
          {showSearch && (
            <div className="webview-search-panel">
              <div className="webview-search-header">
                <h3>AI-Powered Web Search</h3>
                <p>Search the web with intelligent results categorization</p>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }} className="webview-search-form">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the web with AI..."
                  className="webview-search-input"
                />
                <button 
                  type="submit" 
                  className="webview-search-btn"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="webview-search-results">
                  <h4>Search Results</h4>
                  {searchResults.map((result, index) => (
                    <div 
                      key={index}
                      className="webview-search-result"
                      onClick={() => handleSearchResultClick(result.url)}
                    >
                      <div className="webview-result-header">
                        <h5 className="webview-result-title">{result.title}</h5>
                        <span 
                          className="webview-result-type"
                          style={{ backgroundColor: getSourceTypeColor(result.sourceType) }}
                        >
                          {getSourceTypeLabel(result.sourceType)}
                        </span>
                      </div>
                      <div className="webview-result-url">{result.displayLink}</div>
                      <div className="webview-result-snippet">{result.snippet}</div>
                    </div>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="webview-search-loading">
                  <div className="webview-loading-spinner"></div>
                  <span>Searching with AI...</span>
                </div>
              )}
            </div>
          )}

          {/* WebView Frame */}
          <div className="webview-frame-container">
            {currentUrl && currentUrl !== 'https://' && !isBlocked && (
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="webview-frame"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                title="WebView"
              />
            )}
            
            {frameError && (
              <div className="webview-error-container">
                <div className="webview-error-icon">🚫</div>
                <h3 className="webview-error-title">Cannot Display Website</h3>
                <p className="webview-error-message">{frameError}</p>
                <div className="webview-error-actions">
                  <button 
                    className="webview-error-btn primary"
                    onClick={handleOpenInNewTab}
                  >
                    Open in New Tab
                  </button>
                  <button 
                    className="webview-error-btn secondary"
                    onClick={handleRefresh}
                  >
                    Try Again
                  </button>
                </div>
                <div className="webview-error-info">
                  <p><strong>Why does this happen?</strong></p>
                  <ul>
                    <li>Websites use security policies to prevent iframe embedding</li>
                    <li>This protects users from clickjacking attacks</li>
                    <li>Many popular sites (Google, Reddit, etc.) block iframe access</li>
                  </ul>
                  <p><strong>Suggestion:</strong> Use "Open in New Tab" and take notes here about the content you find.</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes Panel */}
          {showNotesPanel && (
            <div className="webview-notes-panel">
            <div className="webview-notes-header">
              <h3 className="webview-notes-title">
                <StickyNote size={16} />
                Quick Notes
              </h3>
              {(originalUrl || currentUrl) && (originalUrl !== 'https://' || currentUrl !== 'https://') && (
                <div className="webview-current-url">
                  Current: {originalUrl && originalUrl !== 'https://' ? new URL(originalUrl).hostname : new URL(currentUrl).hostname}
                </div>
              )}
            </div>

            <div className="webview-notes-content">
              {/* Note Input */}
              <div className="webview-note-input">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Take docs about this page... (Cmd+Enter to save)"
                  className="webview-note-textarea"
                />
                <button
                  onClick={handleSaveNote}
                  className="webview-save-btn"
                  disabled={!noteContent.trim()}
                >
                  Save Note
                </button>
              </div>

              {/* Notes List */}
              <div className="webview-notes-list">
                {webViewNotes.map((note) => (
                  <div key={note.id} className="webview-note-item">
                    <div className="webview-note-text">{note.content}</div>
                    <div className="webview-note-meta">
                      <span className="webview-note-url">{note.domain}</span>
                      <span className="webview-note-timestamp">
                        {formatTimestamp(note.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebViewOverlay;
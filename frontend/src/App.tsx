import React, { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import SettingsModal from './components/SettingsModal';
import './App.css';
import './enhanced-features.css';

// Component interfaces
interface FileTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  path: string;
  viewState?: any;
}

interface FileTreeItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileTreeItem[];
}

interface Breadcrumb {
  name: string;
  path: string;
}

interface EditorGroup {
  id: number;
  files: FileTab[];
  activeFileId: string | null;
  width: number;
}

interface SearchResult {
  fileId: string;
  fileName: string;
  line: number;
  column: number;
  text: string;
  match: string;
}

interface CodeSnippet {
  id: string;
  prefix: string;
  body: string[];
  description: string;
  language: string;
}

interface Problem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  source: string;
}

interface ContextMenu {
  x: number;
  y: number;
  items: ContextMenuItem[];
  target?: FileTab | FileTreeItem;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  source: string;
  severity: number;
}

interface CodeAction {
  title: string;
  kind: string;
  edit?: {
    range: { startLine: number; endLine: number; startColumn: number; endColumn: number; };
    newText: string;
  };
}

interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  fontFamily: string;
  minimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  tabSize: number;
  insertSpaces: boolean;
  renderWhitespace: boolean;
  rulers: number[];
  folding: boolean;
  bracketPairColorization: boolean;
  autoClosingBrackets: boolean;
  autoClosingQuotes: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  smoothScrolling: boolean;
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  mouseWheelZoom: boolean;
  quickSuggestions: boolean;
  parameterHints: boolean;
  acceptSuggestionOnEnter: 'on' | 'off' | 'smart';
  snippets: boolean;
  wordBasedSuggestions: boolean;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentFile, setCurrentFile] = useState<FileTab | null>(null);
  const [openFiles, setOpenFiles] = useState<FileTab[]>([]);
  const [editorGroups, setEditorGroups] = useState<EditorGroup[]>([
    { id: 1, files: [], activeFileId: null, width: 100 }
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [currentDirectory, setCurrentDirectory] = useState('/my-projects/sample-project');
  const [terminalOutput, setTerminalOutput] = useState(['Welcome to CloudIDE+ Terminal']);
  const [terminalInput, setTerminalInput] = useState('');
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'extensions' | 'outline'>('explorer');
  const [dragOver, setDragOver] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [showMinimap, setShowMinimap] = useState(true);
  const [codeSnippets, setCodeSnippets] = useState<CodeSnippet[]>([]);
  const [formatOnSave, setFormatOnSave] = useState(true);
  const [showProblems, setShowProblems] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [codeIssues, setCodeIssues] = useState<CodeIssue[]>([]);
  const [isFormatting, setIsFormatting] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingBottomPanel, setIsResizingBottomPanel] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'warning' | 'error'}>>([]);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [quickOpenQuery, setQuickOpenQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [keyboardShortcutsVisible, setKeyboardShortcutsVisible] = useState(false);
  const [outlineItems, setOutlineItems] = useState<Array<{name: string, line: number, type: string}>>([]);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Fira Code, Cascadia Code, Monaco, Menlo, monospace',
    minimap: true,
    wordWrap: true,
    lineNumbers: true,
    autoSave: true,
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: false,
    rulers: [80, 120],
    folding: true,
    bracketPairColorization: true,
    autoClosingBrackets: true,
    autoClosingQuotes: true,
    formatOnPaste: true,
    formatOnType: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorStyle: 'line',
    mouseWheelZoom: true,
    quickSuggestions: true,
    parameterHints: true,
    acceptSuggestionOnEnter: 'on',
    snippets: true,
    wordBasedSuggestions: true
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState('vs-dark');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchMode, setSearchMode] = useState<'current' | 'project'>('current');
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [statusBarInfo, setStatusBarInfo] = useState({
    line: 1,
    column: 1,
    selection: '',
    encoding: 'UTF-8',
    eol: 'LF',
    spaces: 2
  });
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [activeBottomTab, setActiveBottomTab] = useState('terminal');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const editorPositionRef = useRef<{ [fileId: string]: any }>({});
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeSampleProject = () => {
    const sampleTree: FileTreeItem[] = [
      {
        id: 'my-projects',
        name: 'My Projects',
        type: 'folder',
        path: '/my-projects',
        children: [
          {
            id: 'sample-project',
            name: 'Sample Project',
            type: 'folder',
            path: '/my-projects/sample-project',
            children: [
              {
                id: 'index-html',
                name: 'index.html',
                type: 'file',
                path: '/my-projects/sample-project/index.html'
              },
              {
                id: 'style-css',
                name: 'style.css',
                type: 'file',
                path: '/my-projects/sample-project/style.css'
              },
              {
                id: 'script-js',
                name: 'script.js',
                type: 'file',
                path: '/my-projects/sample-project/script.js'
              },
              {
                id: 'readme-md',
                name: 'README.md',
                type: 'file',
                path: '/my-projects/sample-project/README.md'
              }
            ]
          }
        ]
      }
    ];
    setFileTree(sampleTree);
    setExpandedFolders(new Set(['my-projects', 'sample-project']));
  };

  const initializeCodeSnippets = () => {
    const defaultSnippets: CodeSnippet[] = [
      {
        id: 'js-function',
        prefix: 'fn',
        body: [
          'function ${1:functionName}(${2:parameters}) {',
          '  ${3:// function body}',
          '  return ${4:value};',
          '}'
        ],
        description: 'JavaScript Function',
        language: 'javascript'
      },
      {
        id: 'js-arrow',
        prefix: 'af',
        body: [
          'const ${1:functionName} = (${2:parameters}) => {',
          '  ${3:// function body}',
          '  return ${4:value};',
          '};'
        ],
        description: 'Arrow Function',
        language: 'javascript'
      },
      {
        id: 'react-component',
        prefix: 'rfc',
        body: [
          'import React from \'react\';',
          '',
          'interface ${1:ComponentName}Props {',
          '  ${2:// props}',
          '}',
          '',
          'const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ ${3:props} }) => {',
          '  return (',
          '    <div>',
          '      ${4:// component content}',
          '    </div>',
          '  );',
          '};',
          '',
          'export default ${1:ComponentName};'
        ],
        description: 'React Functional Component',
        language: 'typescript'
      },
      {
        id: 'html-boilerplate',
        prefix: 'html5',
        body: [
          '<!DOCTYPE html>',
          '<html lang="${1:en}">',
          '<head>',
          '  <meta charset="UTF-8">',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
          '  <title>${2:Document}</title>',
          '  <style>',
          '    ${3:/* CSS styles */}',
          '  </style>',
          '</head>',
          '<body>',
          '  ${4:<!-- content -->}',
          '</body>',
          '</html>'
        ],
        description: 'HTML5 Boilerplate',
        language: 'html'
      }
    ];
    setCodeSnippets(defaultSnippets);
  };

  const initializeProblems = () => {
    const initialProblems: Problem[] = [
      {
        id: '1',
        severity: 'warning',
        message: 'Unused variable \'example\'',
        file: 'script.js',
        line: 15,
        column: 7,
        source: 'eslint'
      },
      {
        id: '2',
        severity: 'error',
        message: 'Cannot find module \'missing-package\'',
        file: 'app.js',
        line: 3,
        column: 1,
        source: 'typescript'
      }
    ];
    setProblems(initialProblems);
  };



  useEffect(() => {
    // Initialize Firebase Auth check
    // This will be implemented when we add Firebase
    console.log('CloudIDE+ initializing...');

    // Mark app as loaded to hide loading screen
    document.body.classList.add('app-loaded');

    // Initialize sample project
    initializeSampleProject();

    // Initialize code snippets
    initializeCodeSnippets();

    // Initialize problem detection
    initializeProblems();

    // Close context menu on click
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);

    // Add keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            saveCurrentFile();
            break;
          case 'n':
            e.preventDefault();
            createNewFile();
            break;
          case 'w':
            e.preventDefault();
            if (currentFile) {
              closeFile(currentFile.id);
            }
            break;
          case 'p':
            e.preventDefault();
            if (e.shiftKey) {
              setCommandPaletteOpen(true);
            } else {
              setQuickOpenVisible(true);
            }
            break;
          case 'f':
            e.preventDefault();
            setSearchOpen(true);
            break;
          case 'g':
            e.preventDefault();
            showGoToLineDialog();
            break;
          case 'k':
            if (e.shiftKey) {
              e.preventDefault();
              setKeyboardShortcutsVisible(true);
            }
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(!sidebarOpen);
            break;
          case 'j':
            e.preventDefault();
            setBottomPanelOpen(!bottomPanelOpen);
            break;
          case '=':
            e.preventDefault();
            setZoomLevel(prev => Math.min(prev + 0.1, 3));
            break;
          case '-':
            e.preventDefault();
            setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
            break;
          case '0':
            e.preventDefault();
            setZoomLevel(1);
            break;
        }
      } else if (e.key === 'F1') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    } else if (e.key === 'F2') {
      e.preventDefault();
      setKeyboardShortcutsVisible(true);
    }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [currentFile]);

  // Cleanup effect for auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    };
  }, []);

  const handleLogin = () => {
    // Placeholder for Firebase Google Auth
    console.log('Login will be implemented with Firebase');
    setIsAuthenticated(true);
    setUser({ name: 'Demo User', email: 'demo@example.com' });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setOpenFiles([]);
    setCurrentFile(null);
  };

  const createNewFile = (fileName?: string, language?: string) => {
    const timestamp = Date.now();
    const defaultContent = getDefaultContent(language || 'javascript');
    const newFile: FileTab = {
      id: `file-${timestamp}`,
      name: fileName || `untitled-${timestamp}.txt`,
      content: defaultContent,
      language: language || getLanguageFromFilename(fileName || 'untitled.txt'),
      isDirty: false,
      path: `/temp/${fileName || `untitled-${timestamp}.txt`}`
    };
    setOpenFiles([...openFiles, newFile]);
    setCurrentFile(newFile);
  };

  const saveCurrentFile = () => {
    if (!currentFile) return;

    // Get current content from editor to ensure we have the latest
    const currentContent = editorRef.current?.getValue() || currentFile.content;
    const fileToSave = { ...currentFile, content: currentContent };

    saveFile(fileToSave);
  };

  const saveAllFiles = () => {
    const dirtyFiles = openFiles.filter(file => file.isDirty);
    if (dirtyFiles.length === 0) {
      console.log('No unsaved changes');
      return;
    }

    console.log('Saving all files...');
    const savedFiles = openFiles.map(file => ({ ...file, isDirty: false }));
    setOpenFiles(savedFiles);

    if (currentFile?.isDirty) {
      setCurrentFile({ ...currentFile, isDirty: false });
    }

    console.log('✅ All files saved successfully');
  };

  const openFile = (item: FileTreeItem) => {
    // Clear any pending auto-save when switching files
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    // Save current cursor position if there's a current file
    if (currentFile && editorRef.current) {
      const position = editorRef.current.getPosition();
      const selection = editorRef.current.getSelection();
      editorPositionRef.current[currentFile.id] = { position, selection };
    }

    // Check if file is already open
    const existingFile = openFiles.find(file => file.path === item.path);
    if (existingFile) {
      setCurrentFile(existingFile);
      // Restore cursor position after a brief delay to ensure editor is ready
      setTimeout(() => {
        if (editorRef.current && editorPositionRef.current[existingFile.id]) {
          const savedState = editorPositionRef.current[existingFile.id];
          if (savedState.position) {
            editorRef.current.setPosition(savedState.position);
          }
          if (savedState.selection) {
            editorRef.current.setSelection(savedState.selection);
          }
        }
      }, 50);
      return;
    }

    // Get sample content for the file
    const content = getSampleFileContent(item.name);
    const language = getLanguageFromFilename(item.name);

    const newFile: FileTab = {
      id: item.id,
      name: item.name,
      content,
      language,
      isDirty: false,
      path: item.path
    };

    setOpenFiles([...openFiles, newFile]);
    setCurrentFile(newFile);
  };

  const getSampleFileContent = (filename: string): string => {
    const sampleContents: { [key: string]: string } = {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CloudIDE+ Sample Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to CloudIDE+</h1>
        <p>Your cloud-based development environment</p>
    </header>

    <main>
        <section class="features">
            <h2>Features</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <h3>🎨 Monaco Editor</h3>
                    <p>VS Code editing experience in your browser</p>
                </div>
                <div class="feature-card">
                    <h3>☁️ Cloud Storage</h3>
                    <p>Save your projects to Google Drive</p>
                </div>
                <div class="feature-card">
                    <h3>🔥 Real-time Collaboration</h3>
                    <p>Work together with your team</p>
                </div>
            </div>
        </section>
    </main>

    <script src="script.js"></script>
</body>
</html>`,
      'style.css': `/* CloudIDE+ Sample Project Styles */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #333;
    min-height: 100vh;
}

header {
    text-align: center;
    padding: 4rem 2rem 2rem;
    color: white;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

header p {
    font-size: 1.2rem;
    opacity: 0.9;
}

main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.features {
    background: white;
    border-radius: 12px;
    padding: 3rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.features h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.feature-card {
    padding: 2rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: transform 0.3s ease, border-color 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
    border-color: #667eea;
}

.feature-card h3 {
    margin-bottom: 1rem;
    color: #667eea;
    font-size: 1.5rem;
}

.feature-card p {
    color: #666;
    line-height: 1.6;
}`,
      'script.js': `// CloudIDE+ Sample Project JavaScript

console.log('Welcome to CloudIDE+! 🚀');

// Add interactive functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');

    // Add click animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');

    featureCards.forEach(card => {
        card.addEventListener('click', function() {
            // Add a pulse animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
            }, 150);
        });

        // Add hover sound effect (placeholder)
        card.addEventListener('mouseenter', function() {
            console.log('Hovering over:', this.querySelector('h3').textContent);
        });
    });

    // Display current time
    function updateTime() {
        const now = new Date();
        console.log('Current time:', now.toLocaleTimeString());
    }

    // Update time every minute
    setInterval(updateTime, 60000);
    updateTime();

    // Simulate some API calls (placeholder for future features)
    async function initializeApp() {
        console.log('Initializing CloudIDE+ features...');

        // Placeholder for Firebase initialization
        console.log('✓ Firebase connection (placeholder)');

        // Placeholder for Google Drive API
        console.log('✓ Google Drive API (placeholder)');

        // Placeholder for Monaco Editor setup
        console.log('✓ Monaco Editor ready');

        console.log('🎉 CloudIDE+ initialized successfully!');
    }

    initializeApp();
});

// Utility functions
const utils = {
    formatDate: (date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { utils };
}`,
      'README.md': `# CloudIDE+ Sample Project

Welcome to your first project in CloudIDE+! This is a sample project that demonstrates the capabilities of our cloud-based IDE.

## 🚀 Features

- **Monaco Editor**: Full VS Code editing experience in your browser
- **Multi-language Support**: HTML, CSS, JavaScript, TypeScript, Python, and more
- **Cloud Storage**: Save and sync your projects with Google Drive
- **Real-time Collaboration**: Work together with your team (coming soon)
- **Live Preview**: See your changes instantly (coming soon)

## 📁 Project Structure

\`\`\`
sample-project/
├── index.html      # Main HTML file
├── style.css       # Stylesheet
├── script.js       # JavaScript functionality
└── README.md       # This file
\`\`\`

## 🎯 Getting Started

1. **Edit Files**: Click on any file in the explorer to open it in the Monaco Editor
2. **Create New Files**: Use the "New File" dropdown to create files in different languages
3. **Save Your Work**: Your changes are automatically saved to the cloud
4. **Collaborate**: Share your project with team members (coming soon)

## 🛠️ Technologies Used

- **Frontend**: React + TypeScript + Vite
- **Editor**: Monaco Editor (VS Code engine)
- **Backend**: Node.js + Express + TypeScript
- **Database**: Firebase Firestore
- **Storage**: Google Drive API
- **Deployment**: Google Cloud Platform

## 📖 Next Steps

- Explore the Monaco Editor features
- Try creating new files with different languages
- Check out the Firebase integration (coming soon)
- Set up Google Drive sync (coming soon)

## 🎨 Customization

Feel free to modify this project:
- Change the CSS to customize the appearance
- Add new JavaScript functionality
- Create additional HTML pages
- Experiment with different file types

## 📞 Support

Need help? Check out our documentation or contact support through the live chat widget.

---

Happy coding! 🎉

*Built with ❤️ by the CloudIDE+ team*`
    };

    return sampleContents[filename] || getDefaultContent(getLanguageFromFilename(filename));
  };

  const getFileIcon = (filename: string, isFolder: boolean = false): string => {
    if (isFolder) return '📁';

    const extension = filename.split('.').pop()?.toLowerCase();
    const baseName = filename.toLowerCase();

    // Special files by exact name
    const specialFiles: { [key: string]: string } = {
      'package.json': '📦',
      'package-lock.json': '🔒',
      'yarn.lock': '🧶',
      'readme.md': '📖',
      'license': '📜',
      'dockerfile': '🐳',
      'docker-compose.yml': '🐳',
      'docker-compose.yaml': '🐳',
      '.gitignore': '🚫',
      '.env': '🔐',
      '.env.local': '🔐',
      '.env.example': '🔐',
      'tsconfig.json': '🔷',
      'vite.config.ts': '⚡',
      'webpack.config.js': '📦',
      'babel.config.js': '🔄',
      'eslint.config.js': '🔍',
      '.eslintrc': '🔍',
      'prettier.config.js': '💅',
      '.prettierrc': '💅'
    };

    if (specialFiles[baseName]) {
      return specialFiles[baseName];
    }

    // Icons by extension
    const iconMap: { [key: string]: string } = {
      // JavaScript & TypeScript
      'js': '🟨',
      'jsx': '⚛️',
      'ts': '🔷',
      'tsx': '⚛️',
      'mjs': '🟨',
      'cjs': '🟨',

      // Web Technologies
      'html': '🌐',
      'htm': '🌐',
      'css': '🎨',
      'scss': '💅',
      'sass': '💅',
      'less': '💜',
      'vue': '💚',
      'svelte': '🧡',

      // Backend Languages
      'py': '🐍',
      'java': '☕',
      'cpp': '🔧',
      'cxx': '🔧',
      'cc': '🔧',
      'c': '🔧',
      'h': '📄',
      'hpp': '📄',
      'cs': '#️⃣',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'kt': '🟣',
      'swift': '🧡',
      'dart': '🎯',

      // Data & Config
      'json': '📋',
      'xml': '📄',
      'yaml': '⚙️',
      'yml': '⚙️',
      'toml': '⚙️',
      'ini': '⚙️',
      'cfg': '⚙️',
      'conf': '⚙️',
      'properties': '⚙️',

      // Documentation
      'md': '📝',
      'mdx': '📝',
      'txt': '📄',
      'rtf': '📄',
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',

      // Database
      'sql': '🗃️',
      'db': '🗃️',
      'sqlite': '🗃️',

      // Shell & Scripts
      'sh': '⚡',
      'bash': '⚡',
      'zsh': '⚡',
      'fish': '🐠',
      'ps1': '💙',
      'bat': '⚡',
      'cmd': '⚡',

      // Images
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🎨',
      'webp': '🖼️',
      'ico': '🖼️',

      // Archives
      'zip': '📦',
      'tar': '📦',
      'gz': '📦',
      'rar': '📦',
      '7z': '📦',

      // Others
      'lock': '🔒',
      'log': '📊',
      'csv': '📊',
      'xlsx': '📊',
      'xls': '📊'
    };

    return iconMap[extension || ''] || '📄';
  };

  const updateBreadcrumbs = (filePath: string) => {
    const pathParts = filePath.split('/').filter(part => part);
    const breadcrumbList: Breadcrumb[] = [];

    let currentPath = '';
    pathParts.forEach((part) => {
      currentPath += '/' + part;
      breadcrumbList.push({
        name: part,
        path: currentPath
      });
    });

    setBreadcrumbs(breadcrumbList);
  };

  const navigateToBreadcrumb = (breadcrumb: Breadcrumb) => {
    const item = findFileByPath(fileTree, breadcrumb.path);
    if (item && item.type === 'file') {
      openFile(item);
    }
  };

  const findFileByPath = (items: FileTreeItem[], path: string): FileTreeItem | null => {
    for (const item of items) {
      if (item.path === path) {
        return item;
      }
      if (item.children) {
        const found = findFileByPath(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const generateOutline = (content: string, language: string) => {
    const lines = content.split('\n');
    const items: Array<{name: string, line: number, type: string}> = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      if (language === 'javascript' || language === 'typescript') {
        // Functions
        if (trimmedLine.match(/^(export\s+)?(async\s+)?function\s+\w+/)) {
          const match = trimmedLine.match(/function\s+(\w+)/);
          if (match) items.push({name: match[1], line: lineNumber, type: 'function'});
        }
        // Arrow functions
        if (trimmedLine.match(/^(export\s+)?const\s+\w+\s*=\s*(\([^)]*\))?\s*=>/)) {
          const match = trimmedLine.match(/const\s+(\w+)/);
          if (match) items.push({name: match[1], line: lineNumber, type: 'function'});
        }
        // Classes
        if (trimmedLine.match(/^(export\s+)?(abstract\s+)?class\s+\w+/)) {
          const match = trimmedLine.match(/class\s+(\w+)/);
          if (match) items.push({name: match[1], line: lineNumber, type: 'class'});
        }
        // Interfaces
        if (trimmedLine.match(/^(export\s+)?interface\s+\w+/)) {
          const match = trimmedLine.match(/interface\s+(\w+)/);
          if (match) items.push({name: match[1], line: lineNumber, type: 'interface'});
        }
      } else if (language === 'html') {
        // HTML elements with IDs
        if (trimmedLine.match(/<\w+[^>]*id=['"]([^'"]+)['"]/)) {
          const match = trimmedLine.match(/id=['"]([^'"]+)['"]/);
          if (match) items.push({name: `#${match[1]}`, line: lineNumber, type: 'id'});
        }
        // Headers
        if (trimmedLine.match(/<h[1-6][^>]*>/)) {
          const match = trimmedLine.match(/<h([1-6])[^>]*>([^<]+)/);
          if (match) items.push({name: match[2].trim(), line: lineNumber, type: `h${match[1]}`});
        }
      } else if (language === 'css') {
        // CSS selectors
        if (trimmedLine.match(/^[.#]?[\w-]+\s*{/) || trimmedLine.match(/^[.#]?[\w-]+\s*,/)) {
          const match = trimmedLine.match(/([.#]?[\w-]+)/);
          if (match) items.push({name: match[1], line: lineNumber, type: 'selector'});
        }
      }
    });

    setOutlineItems(items);
  };

  const navigateToOutlineItem = (item: {name: string, line: number, type: string}) => {
    if (editorRef.current) {
      editorRef.current.setPosition({ lineNumber: item.line, column: 1 });
      editorRef.current.revealLineInCenter(item.line);
      editorRef.current.focus();
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (items: FileTreeItem[], level: number = 0): JSX.Element[] => {
    return items.map(item => (
      <div key={item.id} style={{ marginLeft: `${level * 16}px` }}>
        <div
          className={`file-item ${item.type}`}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id);
            } else {
              openFile(item);
            }
          }}
        >
          {item.type === 'folder' ? (
            <>
              <span className="folder-icon">
                {expandedFolders.has(item.id) ? '📂' : '📁'}
              </span>
              {item.name}
            </>
          ) : (
            <>
              <span className="file-icon">{getFileIcon(item.name)}</span>
              {item.name}
            </>
          )}
        </div>
        {item.type === 'folder' && expandedFolders.has(item.id) && item.children && (
          <div className="folder-children">
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const getDefaultContent = (language: string): string => {
    const templates: { [key: string]: string } = {
      'javascript': '// Welcome to CloudIDE+\nconsole.log("Hello, World!");',
      'typescript': '// Welcome to CloudIDE+\nconst message: string = "Hello, World!";\nconsole.log(message);',
      'python': '# Welcome to CloudIDE+\nprint("Hello, World!")',
      'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
      'cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
      'html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>CloudIDE+</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>',
      'css': '/* Welcome to CloudIDE+ */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}',
      'markdown': '# Welcome to CloudIDE+\n\nStart writing your markdown here!\n\n## Features\n- Monaco Editor\n- Real-time collaboration\n- Cloud storage',
      'json': '{\n  "name": "CloudIDE+ Project",\n  "version": "1.0.0",\n  "description": "Your cloud development environment"\n}'
    };
    return templates[language] || '// Welcome to CloudIDE+\n// Start coding here!';
  };

  const onEditorMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial saved content reference
    if (currentFile) {
      lastSavedContentRef.current = currentFile.content;
    }

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e: any) => {
      setStatusBarInfo(prev => ({
        ...prev,
        line: e.position.lineNumber,
        column: e.position.column
      }));
    });

    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || '';
        setStatusBarInfo(prev => ({
          ...prev,
          selection: `${selectedText.length} chars selected`
        }));
      } else {
        setStatusBarInfo(prev => ({
          ...prev,
          selection: ''
        }));
      }
    });

    // Use Monaco's built-in VS Code dark theme

    // Set up auto-completion
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = [
          {
            label: 'console.log',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'console.log(${1});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Outputs a message to the console',
            range: range,
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Function declaration',
            range: range,
          },
          {
            label: 'const',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'const ${1:name} = ${2:value};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Constant declaration',
            range: range,
          },
        ];
        return { suggestions };
      }
    });

    // Add command palette commands
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveCurrentFile()
    });

    editor.addAction({
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => setSidebarOpen(!sidebarOpen)
    });

    editor.addAction({
      id: 'command-palette',
      label: 'Show Command Palette',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP],
      run: () => setCommandPaletteOpen(true)
    });

    // Enable rich IntelliSense
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"]
    });

    // Add type declarations for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.addExtraLib(`
      declare interface Console {
        log(message?: any, ...optionalParams: any[]): void;
        error(message?: any, ...optionalParams: any[]): void;
        warn(message?: any, ...optionalParams: any[]): void;
        info(message?: any, ...optionalParams: any[]): void;
      }
      declare var console: Console;

      declare interface Document {
        getElementById(elementId: string): HTMLElement | null;
        querySelector(selectors: string): Element | null;
        querySelectorAll(selectors: string): NodeListOf<Element>;
        createElement(tagName: string): HTMLElement;
        addEventListener(type: string, listener: EventListener): void;
      }
      declare var document: Document;
    `, 'filename/global.d.ts');
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!currentFile || value === undefined) return;

    // Only update state if content actually changed
    if (currentFile.content === value) return;

    // Throttle state updates to reduce re-renders
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      const updatedFile = { ...currentFile, content: value, isDirty: true };
      setCurrentFile(updatedFile);
      setOpenFiles(files =>
        files.map(f => f.id === updatedFile.id ? updatedFile : f)
      );
      throttleTimeoutRef.current = null;
    }, 100);

    // Auto-save with proper debouncing
    if (editorSettings.autoSave) {
      // Clear existing timeout to prevent multiple saves
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout
      autoSaveTimeoutRef.current = setTimeout(() => {
        // Get current content from editor to ensure we have the latest
        const currentContent = editorRef.current?.getValue();
        if (currentContent && currentContent !== lastSavedContentRef.current) {
          const fileToSave = { ...currentFile, content: currentContent };
          saveFile(fileToSave);
          lastSavedContentRef.current = currentContent;
        }
        autoSaveTimeoutRef.current = null;
      }, 2000);
    }

    // Update live preview for HTML files
    if (currentFile?.language === 'html') {
      updatePreview(value);
    }

    // Update outline
    if (currentFile) {
      generateOutline(value, currentFile.language);
    }

    // Run linting
    if (currentFile) {
      const issues = lintCode({ ...currentFile, content: value });
      setCodeIssues(issues);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo">
            <h1>CloudIDE+</h1>
            <p>Cloud-based development environment</p>
          </div>
          <button className="login-button" onClick={handleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <div className="login-features">
            <h3>Features:</h3>
            <ul>
              <li>🎨 Monaco Editor (VS Code experience)</li>
              <li>☁️ Google Drive integration</li>
              <li>🔐 Firebase authentication</li>
              <li>💬 Live support chat</li>
              <li>🚀 Cloud deployment ready</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const updatePreview = (htmlContent: string) => {
    setPreviewContent(htmlContent);
  };

  const splitEditorHorizontally = () => {
    if (editorGroups.length >= 3) return; // Limit to 3 groups

    const newGroupId = Math.max(...editorGroups.map(g => g.id)) + 1;
    const newGroup: EditorGroup = {
      id: newGroupId,
      files: [],
      activeFileId: null,
      width: 50
    };

    // Adjust existing groups width
    const adjustedGroups = editorGroups.map(group => ({
      ...group,
      width: group.width * 0.66
    }));

    setEditorGroups([...adjustedGroups, newGroup]);
  };

  // Terminal command execution
  const executeTerminalCommand = (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add command to output
    const commandLine = `${currentDirectory}$ ${trimmedCommand}`;
    let response = '';

    // Simple command simulation
    switch (trimmedCommand.split(' ')[0]) {
      case 'ls':
        response = 'index.html  style.css  script.js  README.md';
        break;
      case 'pwd':
        response = currentDirectory;
        break;
      case 'clear':
        setTerminalOutput(['Welcome to CloudIDE+ Terminal']);
        setTerminalInput('');
        return;
      case 'cd':
        const path = trimmedCommand.split(' ')[1];
        if (path) {
          setCurrentDirectory(path.startsWith('/') ? path : `${currentDirectory}/${path}`);
          response = '';
        } else {
          response = currentDirectory;
        }
        break;
      case 'npm':
        if (trimmedCommand.includes('install')) {
          response = 'Installing packages...\n✓ Installation complete';
        } else if (trimmedCommand.includes('start')) {
          response = 'Starting development server...\n✓ Server running on http://localhost:3000';
        } else {
          response = 'npm command executed';
        }
        break;
      case 'git':
        if (trimmedCommand.includes('status')) {
          response = 'On branch main\nYour branch is up to date with \'origin/main\'.\n\nnothing to commit, working tree clean';
        } else if (trimmedCommand.includes('log')) {
          response = 'commit abc123 (HEAD -> main)\nAuthor: Developer\nDate: Today\n    Initial commit';
        } else {
          response = 'git command executed';
        }
        break;
      case 'help':
        response = 'Available commands:\n  ls - list files\n  pwd - current directory\n  cd - change directory\n  clear - clear terminal\n  npm - node package manager\n  git - version control\n  help - show this help';
        break;
      default:
        response = `Command not found: ${trimmedCommand}`;
    }

    setTerminalOutput(prev => [
      ...prev,
      commandLine,
      ...(response ? [response] : [])
    ]);
    setTerminalInput('');
  };

  const performSearch = (query: string, mode: 'current' | 'project' = 'current') => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const searchFiles = mode === 'current' && currentFile ? [currentFile] : openFiles;

    searchFiles.forEach(file => {
      const lines = file.content.split('\n');
      lines.forEach((line, lineIndex) => {
        const regex = new RegExp(query, 'gi');
        let match;
        while ((match = regex.exec(line)) !== null) {
          results.push({
            fileId: file.id,
            fileName: file.name,
            line: lineIndex + 1,
            column: match.index + 1,
            text: line.trim(),
            match: match[0]
          });
        }
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  };

  const navigateToSearchResult = (index: number) => {
    if (index < 0 || index >= searchResults.length) return;

    const result = searchResults[index];
    const file = openFiles.find(f => f.id === result.fileId);

    if (file) {
      setCurrentFile(file);
      setCurrentSearchIndex(index);

      // Navigate to line in editor
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.revealLineInCenter(result.line);
          editorRef.current.setPosition({ lineNumber: result.line, column: result.column });
          editorRef.current.focus();
        }
      }, 100);
    }
  };

  const performReplace = (findText: string, replaceText: string, replaceAll: boolean = false) => {
    if (!currentFile || !findText) return;

    let newContent = currentFile.content;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), replaceAll ? 'g' : '');

    if (replaceAll) {
      newContent = newContent.replace(regex, replaceText);
    } else {
      // Replace only the first occurrence
      newContent = newContent.replace(regex, replaceText);
    }

    const updatedFile = { ...currentFile, content: newContent, isDirty: true };
    setCurrentFile(updatedFile);
    setOpenFiles(files => files.map(f => f.id === updatedFile.id ? updatedFile : f));

    // Update search results after replace
    performSearch(searchQuery, searchMode);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const language = getLanguageFromExtension(fileExtension);

        const newFile: FileTab = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          content: content,
          language: language,
          path: `/uploaded/${file.name}`,
          isDirty: false
        };

        setOpenFiles(prev => [...prev, newFile]);
        setCurrentFile(newFile);
        updateBreadcrumbs(newFile.path);
      };
      reader.readAsText(file);
    });

    // Reset input
    event.target.value = '';
  };

  const getLanguageFromExtension = (extension: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return languageMap[extension] || 'plaintext';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const language = getLanguageFromExtension(fileExtension);

        const newFile: FileTab = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          content: content,
          language: language,
          path: `/uploaded/${file.name}`,
          isDirty: false
        };

        setOpenFiles(prev => [...prev, newFile]);
        setCurrentFile(newFile);
        updateBreadcrumbs(newFile.path);
      };
      reader.readAsText(file);
    });
  };

  const downloadFile = (file: FileTab) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCode = async () => {
    if (!currentFile) return;

    setIsFormatting(true);

    try {
      let formattedContent = currentFile.content;

      // Simple formatting based on language
      switch (currentFile.language) {
        case 'javascript':
        case 'typescript':
          formattedContent = formatJavaScript(currentFile.content);
          break;
        case 'html':
          formattedContent = formatHTML(currentFile.content);
          break;
        case 'css':
          formattedContent = formatCSS(currentFile.content);
          break;
        case 'json':
          try {
            const parsed = JSON.parse(currentFile.content);
            formattedContent = JSON.stringify(parsed, null, 2);
          } catch {
            // Keep original if invalid JSON
          }
          break;
      }

      if (formattedContent !== currentFile.content) {
        const updatedFile = { ...currentFile, content: formattedContent, isDirty: true };
        setCurrentFile(updatedFile);
        setOpenFiles(files => files.map(f => f.id === updatedFile.id ? updatedFile : f));
      }
    } finally {
      setIsFormatting(false);
    }
  };

  const formatJavaScript = (code: string): string => {
    // Basic JavaScript formatting
    return code
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/;\s*}/g, ';\n}')
      .replace(/,\s*/g, ',\n  ')
      .replace(/;\s*/g, ';\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  const formatHTML = (html: string): string => {
    // Basic HTML formatting with proper indentation
    let formatted = html;
    let indent = 0;
    const tab = '  ';

    formatted = formatted.replace(/></g, '>\n<');

    const lines = formatted.split('\n');
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      const result = tab.repeat(indent) + trimmed;

      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
        indent++;
      }

      return result;
    }).join('\n');
  };

  const formatCSS = (css: string): string => {
    // Basic CSS formatting
    return css
      .replace(/\s*{\s*/g, ' {\n  ')
      .replace(/;\s*}/g, ';\n}')
      .replace(/;\s*/g, ';\n  ')
      .replace(/,\s*/g, ',\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  const lintCode = (file: FileTab): CodeIssue[] => {
    const issues: CodeIssue[] = [];
    const lines = file.content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Common linting rules
      if (line.includes('console.log') && file.language === 'javascript') {
        issues.push({
          id: `console-${lineNumber}`,
          type: 'warning',
          message: 'Avoid using console.log in production code',
          line: lineNumber,
          column: line.indexOf('console.log') + 1,
          source: 'ESLint',
          severity: 2
        });
      }

      if (line.trim().endsWith(';') === false && line.includes('=') && file.language === 'javascript') {
        issues.push({
          id: `semicolon-${lineNumber}`,
          type: 'error',
          message: 'Missing semicolon',
          line: lineNumber,
          column: line.length,
          source: 'ESLint',
          severity: 1
        });
      }

      if (line.includes('var ') && file.language === 'javascript') {
        issues.push({
          id: `var-${lineNumber}`,
          type: 'warning',
          message: 'Use let or const instead of var',
          line: lineNumber,
          column: line.indexOf('var ') + 1,
          source: 'ESLint',
          severity: 2
        });
      }

      if (line.length > 120) {
        issues.push({
          id: `line-length-${lineNumber}`,
          type: 'info',
          message: 'Line exceeds maximum length of 120 characters',
          line: lineNumber,
          column: 121,
          source: 'Formatter',
          severity: 3
        });
      }
    });

    return issues;
  };

  const getCodeActions = (issue: CodeIssue): CodeAction[] => {
    const actions: CodeAction[] = [];

    switch (issue.id.split('-')[0]) {
      case 'console':
        actions.push({
          title: 'Remove console.log',
          kind: 'quickfix',
          edit: {
            range: { startLine: issue.line, endLine: issue.line, startColumn: 1, endColumn: 999 },
            newText: ''
          }
        });
        break;
      case 'var':
        actions.push({
          title: 'Replace var with let',
          kind: 'quickfix'
        });
        actions.push({
          title: 'Replace var with const',
          kind: 'quickfix'
        });
        break;
    }

    return actions;
  };

  const createNewFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    // For now, just log it - in a real app, this would create a folder in the file tree
    console.log('Creating folder:', folderName);
    setTerminalOutput(prev => [...prev, `mkdir ${folderName}`, `✓ Created folder: ${folderName}`]);
  };

  const showGoToLineDialog = () => {
    const lineNumber = prompt('Go to line:');
    if (lineNumber && editorRef.current) {
      const line = parseInt(lineNumber);
      if (line > 0) {
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.revealLineInCenter(line);
        editorRef.current.focus();
      }
    }
  };

  const showNotification = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const navigateToProblem = (problem: Problem) => {
    const file = openFiles.find(f => f.name === problem.file);
    if (file) {
      setCurrentFile(file);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.setPosition({ lineNumber: problem.line, column: problem.column });
          editorRef.current.revealLineInCenter(problem.line);
          editorRef.current.focus();
        }
      }, 100);
    } else {
      showNotification(`File ${problem.file} is not open`, 'warning');
    }
  };

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleBottomPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottomPanel(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(100, Math.min(500, window.innerHeight - e.clientY));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizingBottomPanel(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const quickOpenFiles = openFiles.filter(file =>
    file.name.toLowerCase().includes(quickOpenQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(quickOpenQuery.toLowerCase())
  );







  const toggleMinimap = () => {
    setShowMinimap(!showMinimap);
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: { enabled: !showMinimap }
      });
    }
  };



  const showContextMenu = (e: React.MouseEvent, target: FileTab | FileTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [];

    if ('language' in target) {
      // File tab context menu
      items.push(
        { id: 'save', label: 'Save', icon: '💾', action: () => saveFile(target) },
        { id: 'saveAs', label: 'Save As...', icon: '📄', action: () => downloadFile(target) },
        { id: 'separator1', label: '', separator: true, action: () => {} },
        { id: 'close', label: 'Close', icon: '✕', action: () => closeFile(target.id) },
        { id: 'closeOthers', label: 'Close Others', action: () => closeOtherFiles(target.id) },
        { id: 'closeAll', label: 'Close All', action: () => closeAllFiles() },
        { id: 'separator2', label: '', separator: true, action: () => {} },
        { id: 'copyPath', label: 'Copy Path', icon: '📋', action: () => navigator.clipboard.writeText(target.path) },
        { id: 'copyName', label: 'Copy Filename', icon: '📋', action: () => navigator.clipboard.writeText(target.name) }
      );
    } else {
      // File tree item context menu
      if (target.type === 'file') {
        items.push(
          { id: 'open', label: 'Open', icon: '📂', action: () => openFile(target) },
          { id: 'separator1', label: '', separator: true, action: () => {} }
        );
      }
      items.push(
        { id: 'rename', label: 'Rename', icon: '✏️', action: () => renameItem(target) },
        { id: 'delete', label: 'Delete', icon: '🗑️', action: () => deleteItem(target) },
        { id: 'separator2', label: '', separator: true, action: () => {} },
        { id: 'copyPath', label: 'Copy Path', icon: '📋', action: () => navigator.clipboard.writeText(target.path) }
      );
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      target
    });
  };

  const closeOtherFiles = (keepFileId: string) => {
    const fileToKeep = openFiles.find(f => f.id === keepFileId);
    if (fileToKeep) {
      setOpenFiles([fileToKeep]);
      setCurrentFile(fileToKeep);
    }
  };

  const closeAllFiles = () => {
    setOpenFiles([]);
    setCurrentFile(null);
  };

  const renameItem = (item: FileTreeItem) => {
    const newName = prompt('Enter new name:', item.name);
    if (newName && newName !== item.name) {
      console.log(`Renaming ${item.name} to ${newName}`);
      setTerminalOutput(prev => [...prev, `mv ${item.name} ${newName}`, `✓ Renamed: ${item.name} → ${newName}`]);
    }
  };

  const deleteItem = (item: FileTreeItem) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      console.log(`Deleting ${item.name}`);
      setTerminalOutput(prev => [...prev, `rm ${item.name}`, `✓ Deleted: ${item.name}`]);
    }
  };

  const executeCommand = (commandId: string) => {
    switch (commandId) {
      case 'save-file':
        if (currentFile) saveFile(currentFile);
        break;
      case 'save-all':
        openFiles.forEach(file => saveFile(file));
        showNotification('All files saved!', 'success');
        break;
      case 'new-file':
        createNewFile();
        break;
      case 'open-file':
        document.getElementById('file-upload')?.click();
        break;
      case 'close-file':
        if (currentFile) closeFile(currentFile.id);
        break;
      case 'close-all':
        closeAllFiles();
        break;
      case 'toggle-sidebar':
        setSidebarOpen(!sidebarOpen);
        break;
      case 'toggle-bottom-panel':
        setBottomPanelOpen(!bottomPanelOpen);
        break;
      case 'toggle-preview':
        setShowPreview(!showPreview);
        break;
      case 'zoom-in':
        setZoomLevel(prev => Math.min(prev + 0.1, 3));
        break;
      case 'zoom-out':
        setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
        break;
      case 'reset-zoom':
        setZoomLevel(1);
        break;
      case 'find':
        setFindReplaceOpen(true);
        break;
      case 'find-replace':
        setFindReplaceOpen(true);
        break;
      case 'find-in-files':
        setActiveView('search');
        setSidebarOpen(true);
        break;
      case 'go-to-line':
        showGoToLineDialog();
        break;
      case 'format-document':
        formatCode();
        break;
      case 'toggle-word-wrap':
        setEditorSettings(prev => ({ ...prev, wordWrap: !prev.wordWrap }));
        break;
      case 'toggle-minimap':
        toggleMinimap();
        break;
      case 'select-all':
        if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'editor.action.selectAll', {});
        }
        break;
      case 'copy-line':
        if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'editor.action.copyLinesDownAction', {});
        }
        break;
      case 'delete-line':
        if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'editor.action.deleteLines', {});
        }
        break;
      case 'new-terminal':
        setActiveBottomTab('terminal');
        setBottomPanelOpen(true);
        break;
      case 'clear-terminal':
        setTerminalOutput(['Welcome to CloudIDE+ Terminal']);
        break;
      case 'settings':
        setWorkspaceSettingsOpen(true);
        break;
      case 'keyboard-shortcuts':
        setKeyboardShortcutsVisible(true);
        break;
      case 'toggle-theme':
        setThemePickerOpen(true);
        break;
      case 'quick-open':
        setQuickOpenVisible(true);
        break;
      case 'git-commit':
        showNotification('Git commit functionality coming soon!', 'info');
        break;
      case 'git-push':
        showNotification('Git push functionality coming soon!', 'info');
        break;
      case 'git-pull':
        showNotification('Git pull functionality coming soon!', 'info');
        break;
      case 'start-debugging':
        showNotification('Debug functionality coming soon!', 'info');
        break;
      case 'stop-debugging':
        showNotification('Debug functionality coming soon!', 'info');
        break;
      default:
        console.log('Unknown command:', commandId);
        showNotification(`Command "${commandId}" not implemented`, 'warning');
    }
    setCommandPaletteOpen(false);
    setCommandQuery('');
  };

  const themes = [
    // Dark Themes
    {
      id: 'vs-dark',
      name: 'Dark+ (default dark)',
      description: 'Dark theme with syntax highlighting',
      type: 'dark'
    },
    {
      id: 'monokai',
      name: 'Monokai',
      description: 'Monokai color scheme',
      type: 'dark'
    },
    {
      id: 'github-dark',
      name: 'GitHub Dark',
      description: 'GitHub inspired dark theme',
      type: 'dark'
    },
    {
      id: 'dracula',
      name: 'Dracula',
      description: 'Dark theme with vibrant colors',
      type: 'dark'
    },
    {
      id: 'nord',
      name: 'Nord',
      description: 'Arctic themed dark color palette',
      type: 'dark'
    },
    {
      id: 'material-dark',
      name: 'Material Dark',
      description: 'Material Design dark theme',
      type: 'dark'
    },
    {
      id: 'one-dark-pro',
      name: 'One Dark Pro',
      description: 'Atom One Dark theme',
      type: 'dark'
    },
    {
      id: 'cobalt2',
      name: 'Cobalt2',
      description: 'Blue themed dark color scheme',
      type: 'dark'
    },

    // Light Themes
    {
      id: 'vs',
      name: 'Light+ (default light)',
      description: 'Light theme with syntax highlighting',
      type: 'light'
    },
    {
      id: 'github-light',
      name: 'GitHub Light',
      description: 'GitHub inspired light theme',
      type: 'light'
    },
    {
      id: 'solarized-light',
      name: 'Solarized Light',
      description: 'Precision colors for machines and people',
      type: 'light'
    },
    {
      id: 'material-light',
      name: 'Material Light',
      description: 'Material Design light theme',
      type: 'light'
    },
    {
      id: 'quiet-light',
      name: 'Quiet Light',
      description: 'A soft, muted light theme',
      type: 'light'
    },
    {
      id: 'winter-is-coming-light',
      name: 'Winter is Coming (Light)',
      description: 'Light variant of Winter is Coming theme',
      type: 'light'
    },

    // High Contrast Themes
    {
      id: 'hc-black',
      name: 'High Contrast',
      description: 'High contrast dark theme for better accessibility',
      type: 'hc-dark'
    },
    {
      id: 'hc-light',
      name: 'High Contrast Light',
      description: 'High contrast light theme for better accessibility',
      type: 'hc-light'
    }
  ];

  const changeTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
    setEditorSettings(prev => ({ ...prev, theme: themeId }));
    setThemePickerOpen(false);

    // Apply theme to document body for UI theming
    document.body.className = document.body.className.replace(/theme-[\w-]+/g, '');
    document.body.classList.add(`theme-${themeId}`);

    showNotification(`Theme changed to ${themes.find(t => t.id === themeId)?.name}`, 'success');
  };

  const commands = [
    {
      id: 'save-file',
      label: 'File: Save',
      icon: '💾',
      keybinding: 'Ctrl+S',
      category: 'File'
    },
    {
      id: 'save-all',
      label: 'File: Save All',
      icon: '💾',
      keybinding: 'Ctrl+K S',
      category: 'File'
    },
    {
      id: 'new-file',
      label: 'File: New File',
      icon: '📄',
      keybinding: 'Ctrl+N',
      category: 'File'
    },
    {
      id: 'open-file',
      label: 'File: Open File',
      icon: '📂',
      keybinding: 'Ctrl+O',
      category: 'File'
    },
    {
      id: 'close-file',
      label: 'File: Close',
      icon: '❌',
      keybinding: 'Ctrl+W',
      category: 'File'
    },
    {
      id: 'toggle-sidebar',
      label: 'View: Toggle Sidebar Visibility',
      icon: '📁',
      keybinding: 'Ctrl+B',
      category: 'View'
    },
    {
      id: 'toggle-bottom-panel',
      label: 'View: Toggle Panel',
      icon: '📋',
      keybinding: 'Ctrl+J',
      category: 'View'
    },
    {
      id: 'find',
      label: 'Find',
      icon: '🔍',
      keybinding: 'Ctrl+F',
      category: 'Edit'
    },
    {
      id: 'find-replace',
      label: 'Replace',
      icon: '🔄',
      keybinding: 'Ctrl+H',
      category: 'Edit'
    },
    {
      id: 'find-in-files',
      label: 'Search: Find in Files',
      icon: '🔍',
      keybinding: 'Ctrl+Shift+F',
      category: 'Search'
    },
    {
      id: 'quick-open',
      label: 'Go to File...',
      icon: '📁',
      keybinding: 'Ctrl+P',
      category: 'Go'
    },
    {
      id: 'go-to-line',
      label: 'Go to Line...',
      icon: '📍',
      keybinding: 'Ctrl+G',
      category: 'Go'
    },
    {
      id: 'format-document',
      label: 'Format Document',
      icon: '🎨',
      keybinding: 'Shift+Alt+F',
      category: 'Edit'
    },
    {
      id: 'toggle-word-wrap',
      label: 'View: Toggle Word Wrap',
      icon: '📝',
      keybinding: 'Alt+Z',
      category: 'View'
    },
    {
      id: 'toggle-minimap',
      label: 'View: Toggle Minimap',
      icon: '🗺️',
      keybinding: '',
      category: 'View'
    },
    {
      id: 'settings',
      label: 'Preferences: Open Settings',
      icon: '⚙️',
      keybinding: 'Ctrl+,',
      category: 'Preferences'
    },
    {
      id: 'keyboard-shortcuts',
      label: 'Preferences: Open Keyboard Shortcuts',
      icon: '⌨️',
      keybinding: 'Ctrl+K Ctrl+S',
      category: 'Preferences'
    },
    {
      id: 'toggle-theme',
      label: 'Preferences: Color Theme',
      icon: '🌙',
      keybinding: 'Ctrl+K Ctrl+T',
      category: 'Preferences'
    },
    {
      id: 'zoom-in',
      label: 'View: Zoom In',
      icon: '🔍',
      keybinding: 'Ctrl+=',
      category: 'View'
    },
    {
      id: 'zoom-out',
      label: 'View: Zoom Out',
      icon: '🔍',
      keybinding: 'Ctrl+-',
      category: 'View'
    },
    {
      id: 'reset-zoom',
      label: 'View: Reset Zoom',
      icon: '🔍',
      keybinding: 'Ctrl+0',
      category: 'View'
    },
    {
      id: 'new-terminal',
      label: 'Terminal: Create New Terminal',
      icon: '💻',
      keybinding: 'Ctrl+Shift+`',
      category: 'Terminal'
    },
    {
      id: 'clear-terminal',
      label: 'Terminal: Clear',
      icon: '🗑️',
      keybinding: '',
      category: 'Terminal'
    },
    {
      id: 'select-all',
      label: 'Select All',
      icon: '📄',
      keybinding: 'Ctrl+A',
      category: 'Edit'
    },
    {
      id: 'copy-line',
      label: 'Copy Line Down',
      icon: '📋',
      keybinding: 'Shift+Alt+Down',
      category: 'Edit'
    },
    {
      id: 'delete-line',
      label: 'Delete Line',
      icon: '🗑️',
      keybinding: 'Ctrl+Shift+K',
      category: 'Edit'
    },
    {
      id: 'git-commit',
      label: 'Git: Commit',
      icon: '✅',
      keybinding: '',
      category: 'Git'
    },
    {
      id: 'git-push',
      label: 'Git: Push',
      icon: '⬆️',
      keybinding: '',
      category: 'Git'
    },
    {
      id: 'git-pull',
      label: 'Git: Pull',
      icon: '⬇️',
      keybinding: '',
      category: 'Git'
    },
    {
      id: 'start-debugging',
      label: 'Debug: Start Debugging',
      icon: '🐛',
      keybinding: 'F5',
      category: 'Debug'
    },
    {
      id: 'stop-debugging',
      label: 'Debug: Stop',
      icon: '⏹️',
      keybinding: 'Shift+F5',
      category: 'Debug'
    }
  ];

  const closeFile = (fileId: string) => {
    const fileToClose = openFiles.find(f => f.id === fileId);
    if (fileToClose?.isDirty) {
      const confirmClose = window.confirm(`Do you want to save the changes to ${fileToClose.name}?`);
      if (confirmClose) {
        saveFile(fileToClose);
      }
    }

    const updatedFiles = openFiles.filter(file => file.id !== fileId);
    setOpenFiles(updatedFiles);

    if (currentFile?.id === fileId) {
      setCurrentFile(updatedFiles.length > 0 ? updatedFiles[0] : null);
    }
  };

  const saveFile = async (file: FileTab) => {
    setIsSaving(true);
    console.log('Saving file:', file.name);

    // Clear auto-save timeout when manually saving
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    try {
      // Simulate async save operation
      await new Promise(resolve => setTimeout(resolve, 300));

      const updatedFile = { ...file, isDirty: false };
      setOpenFiles(files => files.map(f => f.id === updatedFile.id ? updatedFile : f));
      if (currentFile?.id === file.id) {
        setCurrentFile(updatedFile);
      }

      // Update last saved content reference
      lastSavedContentRef.current = file.content;
      console.log('✅ File saved successfully:', file.name);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo">
            <h1>CloudIDE+</h1>
            <p>Cloud-based development environment</p>
          </div>
          <button className="login-button" onClick={handleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <div className="login-features">
            <h3>Features:</h3>
            <ul>
              <li>🎨 Monaco Editor (VS Code experience)</li>
              <li>☁️ Google Drive integration</li>
              <li>🔐 Firebase authentication</li>
              <li>💬 Live support chat</li>
              <li>🚀 Cloud deployment ready</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ide-container">
      {/* Header */}
      <header className="ide-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <span className="logo-text">CloudIDE+</span>
        </div>
        <div className="header-center">
          <div className="header-dropdown">
            <button className="header-button dropdown-trigger">
              📄 New File ▼
            </button>
            <div className="dropdown-menu">
              <button onClick={() => createNewFile()}>HTML File</button>
              <button onClick={() => createNewFile()}>CSS File</button>
              <button onClick={() => createNewFile()}>JavaScript File</button>
              <button onClick={() => createNewFile()}>TypeScript File</button>
              <button onClick={() => createNewFile()}>Python File</button>
              <button onClick={() => createNewFile()}>Java File</button>
              <button onClick={() => createNewFile()}>C++ File</button>
              <button onClick={() => createNewFile()}>Markdown File</button>
              <button onClick={() => createNewFile()}>Plain Text</button>
            </div>
          </div>
          <button className="header-button">
            📁 Open
          </button>
          <button
            className="header-button"
            onClick={() => console.log('Save file')}
            title="Save current file (Ctrl+S)"
          >
            💾 Save
          </button>
          <button
            className="header-button"
            onClick={() => console.log('Save all files')}
            title="Save all files"
          >
          💾 Save All
          </button>
        <button
          className="header-button"
          onClick={() => console.log('Format code')}
          title="Format Document (Shift+Alt+F)"
        >
          🎨 Format
        </button>
        <button
          className="header-button"
          onClick={() => currentFile && setCodeIssues(lintCode(currentFile))}
          disabled={!currentFile}
          title="Run Linter"
        >
          🔍 Lint
        </button>
      </div>
      <div className="header-right">
        <div className="problems-indicator">
          <span className="problem-count error">{codeIssues.filter(i => i.type === 'error').length}</span>
          <span className="problem-count warning">{codeIssues.filter(i => i.type === 'warning').length}</span>
          <span className="problem-count info">{codeIssues.filter(i => i.type === 'info').length}</span>
        </div>
        <div className="user-section">
          <span className="user-info">Demo User</span>
          <button className="header-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      </header>

      <div
        className={`ide-body ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Activity Bar */}
        <div className="activity-bar">
          <div className="activity-items">
            <button
              className={`activity-item ${activeView === 'explorer' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('explorer');
                setSidebarOpen(true);
              }}
              title="Explorer (Ctrl+Shift+E)"
            >
              📁
            </button>
            <button
              className={`activity-item ${activeView === 'search' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('search');
                setSidebarOpen(true);
                setFindReplaceOpen(true);
              }}
              title="Search (Ctrl+Shift+F)"
            >
              🔍
            </button>
            <button
              className={`activity-item ${activeView === 'git' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('git');
                setSidebarOpen(true);
              }}
              title="Source Control (Ctrl+Shift+G)"
            >
              🌿
            </button>
            <button
              className={`activity-item ${activeView === 'extensions' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('extensions');
                setSidebarOpen(true);
              }}
              title="Extensions (Ctrl+Shift+X)"
            >
              🧩
            </button>
            <button
              className={`activity-item ${activeView === 'outline' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('outline');
                setSidebarOpen(true);
                if (currentFile) {
                  generateOutline(currentFile.content, currentFile.language);
                }
              }}
              title="Outline"
            >
              📋
            </button>
            <button
              className="activity-item"
              onClick={() => setShowProblems(!showProblems)}
              title="Problems"
            >
              🐛
            </button>
          </div>
          <div className="activity-footer">
            <button
              className="activity-item"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              className="activity-item"
              onClick={() => setWorkspaceSettingsOpen(true)}
              title="Workspace Settings"
            >
              🏗️
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="sidebar" style={{ width: sidebarWidth }}>
            {activeView === 'explorer' && (
              <>
                <div className="sidebar-header">
                  <h3>Explorer</h3>
                  <div className="sidebar-actions">
                    <button className="sidebar-action" title="New File" onClick={() => createNewFile()}>📄</button>
                    <button className="sidebar-action" title="New Folder" onClick={createNewFolder}>📁</button>
                    <button className="sidebar-action" title="Upload File" onClick={() => document.getElementById('file-upload')?.click()}>📤</button>
                    <button className="sidebar-action" title="Format Code" onClick={formatCode}>✨</button>
                    <button className="sidebar-action" title="Toggle Minimap" onClick={toggleMinimap}>🗺️</button>
                    <button className="sidebar-action" title="Refresh">🔄</button>
                  </div>
                </div>
                <div className="sidebar-content">
                  <div className="sidebar-section">
                    <div className="file-tree">
                      {renderFileTree(fileTree)}
                    </div>
                  </div>
                  <div className="sidebar-section">
                    <h4>Open Editors</h4>
                    <div className="recent-files">
                      {openFiles.map(file => (
                        <div
                          key={file.id}
                          className={`recent-file-item ${currentFile?.id === file.id ? 'active' : ''}`}
                          onClick={() => {
                            setCurrentFile(file);
                            updateBreadcrumbs(file.path);
                          }}
                        >
                          <span className="file-icon">{getFileIcon(file.name)}</span>
                          <span className="file-name">{file.name}</span>
                          {file.isDirty && <span className="dirty-indicator">●</span>}
                          <button
                            className="file-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                            title="Download file"
                          >
                            💾
                          </button>
                        </div>
                      ))}
                      {openFiles.length === 0 && (
                        <div className="no-files">No editors open</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeView === 'search' && (
              <>
                <div className="sidebar-header">
                  <h3>Search</h3>
                </div>
                <div className="sidebar-content">
                  <div className="search-sidebar">
                    <div className="search-input-group">
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          performSearch(e.target.value, 'project');
                        }}
                      />
                    </div>
                    <div className="search-input-group">
                      <input
                        type="text"
                        placeholder="Replace"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                      />
                    </div>
                    <div className="search-results-sidebar">
                      {searchResults.length > 0 ? (
                        <div className="search-results-list">
                          {searchResults.map((result, index) => (
                            <div
                              key={`${result.fileId}-${result.line}-${result.column}`}
                              className="search-result-item"
                              onClick={() => navigateToSearchResult(index)}
                            >
                              <div className="result-file">{result.fileName}</div>
                              <div className="result-preview">{result.text}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-search-results">No results</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeView === 'git' && (
              <>
                <div className="sidebar-header">
                  <h3>Source Control</h3>
                  <div className="sidebar-actions">
                    <button className="sidebar-action" title="Refresh">🔄</button>
                  </div>
                </div>
                <div className="sidebar-content">
                  <div className="git-section">
                    <div className="git-status">
                      <div className="git-status-item">
                        <span className="git-icon">M</span>
                        <span className="git-file">src/App.tsx</span>
                      </div>
                      <div className="git-status-item">
                        <span className="git-icon">A</span>
                        <span className="git-file">components/Search.tsx</span>
                      </div>
                      <div className="git-status-item">
                        <span className="git-icon">D</span>
                        <span className="git-file">old-file.js</span>
                      </div>
                    </div>
                    <div className="git-actions">
                      <input
                        type="text"
                        placeholder="Message (Ctrl+Enter to commit)"
                        className="git-commit-input"
                      />
                      <div className="git-buttons">
                        <button className="git-button">✓ Commit</button>
                        <button className="git-button">↑ Push</button>
                        <button className="git-button">↓ Pull</button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeView === 'extensions' && (
              <>
                <div className="sidebar-header">
                  <h3>Extensions</h3>
                </div>
                <div className="sidebar-content">
                  <div className="extensions-section">
                    <div className="extensions-search">
                      <input
                        type="text"
                        placeholder="Search extensions..."
                        className="extension-search-input"
                      />
                    </div>
                    <div className="extensions-categories">
                      <button className="extension-category active">Popular</button>
                      <button className="extension-category">Themes</button>
                      <button className="extension-category">Snippets</button>
                      <button className="extension-category">Formatters</button>
                    </div>
                    <div className="extension-item installed">
                      <div className="extension-icon">🎨</div>
                      <div className="extension-info">
                        <div className="extension-name">VS Code Theme Pack</div>
                        <div className="extension-author">CloudIDE+</div>
                        <div className="extension-stats">⭐ 4.8 (1.2M downloads)</div>
                      </div>
                      <button className="extension-action">⚙️</button>
                    </div>
                    <div className="extension-item installed">
                      <div className="extension-icon">🚀</div>
                      <div className="extension-info">
                        <div className="extension-name">Monaco IntelliSense</div>
                        <div className="extension-author">CloudIDE+</div>
                        <div className="extension-stats">⭐ 4.9 (980K downloads)</div>
                      </div>
                      <button className="extension-action">⚙️</button>
                    </div>
                    <div className="extension-item installed">
                      <div className="extension-icon">✨</div>
                      <div className="extension-info">
                        <div className="extension-name">Code Formatter</div>
                        <div className="extension-author">CloudIDE+</div>
                        <div className="extension-stats">⭐ 4.7 (750K downloads)</div>
                      </div>
                      <button className="extension-action">⚙️</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">🔧</div>
                      <div className="extension-info">
                        <div className="extension-name">Prettier Code Formatter</div>
                        <div className="extension-author">Prettier</div>
                        <div className="extension-stats">⭐ 4.9 (12.5M downloads)</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">📁</div>
                      <div className="extension-info">
                        <div className="extension-name">File Utils</div>
                        <div className="extension-author">CloudIDE+</div>
                        <div className="extension-stats">⭐ 4.6 (320K downloads)</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">🌈</div>
                      <div className="extension-info">
                        <div className="extension-name">Bracket Pair Colorizer</div>
                        <div className="extension-author">CoenraadS</div>
                        <div className="extension-stats">⭐ 4.5 (8.2M downloads)</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">🎯</div>
                      <div className="extension-info">
                        <div className="extension-name">Error Lens</div>
                        <div className="extension-author">PhilHindle</div>
                        <div className="extension-stats">⭐ 4.8 (2.1M downloads)</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeView === 'outline' && (
              <>
                <div className="sidebar-header">
                  <h3>Outline</h3>
                  <div className="sidebar-actions">
                    <button
                      className="sidebar-action"
                      title="Refresh Outline"
                      onClick={() => currentFile && generateOutline(currentFile.content, currentFile.language)}
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <div className="sidebar-content">
                  <div className="outline-section">
                    {currentFile ? (
                      outlineItems.length > 0 ? (
                        <div className="outline-items">
                          {outlineItems.map((item, index) => (
                            <div
                              key={index}
                              className={`outline-item ${item.type}`}
                              onClick={() => navigateToOutlineItem(item)}
                              title={`Go to line ${item.line}`}
                            >
                              <span className="outline-icon">
                                {item.type === 'function' ? '🔧' :
                                 item.type === 'class' ? '📦' :
                                 item.type === 'interface' ? '🔗' :
                                 item.type.startsWith('h') ? '📑' :
                                 item.type === 'selector' ? '🎨' :
                                 item.type === 'id' ? '🏷️' : '📄'}
                              </span>
                              <span className="outline-name">{item.name}</span>
                              <span className="outline-line">:{item.line}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-outline">
                          <p>No symbols found in current file</p>
                          <small>Supported: JS/TS functions, classes, interfaces; HTML headers, IDs; CSS selectors</small>
                        </div>
                      )
                    ) : (
                      <div className="no-outline">
                        <p>Open a file to see its outline</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        )}

        {/* Sidebar Resize Handle */}
        {sidebarOpen && (
          <div
            className="resize-handle resize-handle-vertical"
            onMouseDown={handleSidebarResize}
          />
        )}

        {/* Main Content */}
        <main className="main-content">
          {/* Editor Area */}
          <div className="editor-area">
            {/* Tab Bar */}
            {openFiles.length > 0 && (
              <div className="tab-bar">
                <div className="tab-group">
                  {openFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`tab ${currentFile?.id === file.id ? 'active' : ''}`}
                      onClick={() => setCurrentFile(file)}
                      onContextMenu={(e) => showContextMenu(e, file)}
                    >
                      <span className="tab-icon">{getFileIcon(file.name)}</span>
                      <span className="tab-name">{file.name}</span>
                      {file.isDirty && <span className="tab-dirty">●</span>}
                      <button
                        className="tab-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeFile(file.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="tab-actions">
                  <button
                    className="tab-action-button"
                    onClick={splitEditorHorizontally}
                    title="Split Editor Right"
                  >
                    ⊞
                  </button>
                  <button
                    className="tab-action-button"
                    onClick={() => setShowPreview(!showPreview)}
                    title="Toggle Preview"
                  >
                    👁
                  </button>
                </div>
              </div>
            )}

            {/* Split Editor Container */}
            <div className="editor-container">
              {/* Breadcrumbs */}
              {currentFile && (
                <div className="breadcrumbs">
                  <div className="breadcrumb-content">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={index} className="breadcrumb-item">
                        {index > 0 && <span className="breadcrumb-separator">›</span>}
                        <button
                          className="breadcrumb-button"
                          onClick={() => navigateTo(crumb.path)}
                          title={crumb.path}
                        >
                          {getFileIcon(crumb.name, crumb.type === 'folder')}
                          <span className="breadcrumb-text">{crumb.name}</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Editor */}
              <div className="editor-pane" style={{ width: showPreview ? '50%' : '100%' }}>
                {currentFile ? (
                  <div className="editor-placeholder">
                    {/* Breadcrumbs */}
                    <div className="breadcrumbs">
                      <span className="breadcrumb-icon">📁</span>
                      {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                          <span
                            className="breadcrumb-item clickable"
                            onClick={() => navigateToBreadcrumb(crumb)}
                            title={`Navigate to ${crumb.path}`}
                          >
                            {crumb.name}
                          </span>
                          {index < breadcrumbs.length - 1 && <span className="breadcrumb-separator">▶</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="editor-header">
                      <span>{getFileIcon(currentFile.name)} {currentFile.name}</span>
                      <span className="language-badge">{currentFile.language}</span>
                    </div>
                    <div className="editor-content">
                      <Editor
                        key={currentFile.id}
                        height="100%"
                        defaultLanguage={currentFile.language}
                        language={currentFile.language}
                        value={currentFile.content}
                        theme={editorSettings.theme}
                        onChange={handleEditorChange}
                        onMount={onEditorMount}
                        options={{
                          minimap: { enabled: editorSettings.minimap },
                          fontSize: editorSettings.fontSize * zoomLevel,
                          fontFamily: editorSettings.fontFamily,
                          fontLigatures: true,
                          lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
                          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
                          tabSize: editorSettings.tabSize,
                          insertSpaces: editorSettings.insertSpaces,
                          renderWhitespace: editorSettings.renderWhitespace ? 'all' : 'none',
                          rulers: editorSettings.rulers,
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          smoothScrolling: editorSettings.smoothScrolling,
                          cursorBlinking: editorSettings.cursorBlinking,
                          cursorStyle: editorSettings.cursorStyle,
                          cursorSmoothCaretAnimation: 'on',
                          bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
                          folding: editorSettings.folding,
                          guides: {
                            bracketPairs: editorSettings.bracketPairColorization,
                            indentation: true,
                            highlightActiveIndentation: true
                          },
                          suggest: {
                            showKeywords: editorSettings.quickSuggestions,
                            showSnippets: editorSettings.snippets,
                            showFunctions: editorSettings.quickSuggestions,
                            showConstructors: editorSettings.quickSuggestions,
                            showFields: editorSettings.quickSuggestions,
                            showVariables: editorSettings.quickSuggestions,
                            showClasses: editorSettings.quickSuggestions,
                            showModules: editorSettings.quickSuggestions,
                            showProperties: editorSettings.quickSuggestions,
                            showUnits: editorSettings.quickSuggestions,
                            showValues: editorSettings.quickSuggestions,
                            showEnums: editorSettings.quickSuggestions,
                            showInterfaces: editorSettings.quickSuggestions,
                            showStructs: editorSettings.quickSuggestions,
                            showEvents: editorSettings.quickSuggestions,
                            showOperators: editorSettings.quickSuggestions,
                            showTypeParameters: editorSettings.quickSuggestions
                          },
                          quickSuggestions: editorSettings.quickSuggestions ? {
                            other: true,
                            comments: true,
                            strings: true
                          } : false,
                          quickSuggestionsDelay: 10,
                          suggestOnTriggerCharacters: editorSettings.quickSuggestions,
                          acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter,
                          tabCompletion: 'on',
                          wordBasedSuggestions: editorSettings.wordBasedSuggestions,
                          parameterHints: { enabled: editorSettings.parameterHints },
                          autoClosingBrackets: editorSettings.autoClosingBrackets ? 'always' : 'never',
                          autoClosingQuotes: editorSettings.autoClosingQuotes ? 'always' : 'never',
                          autoClosingDelete: 'always',
                          autoClosingOvertype: 'always',
                          autoSurround: 'languageDefined',
                          autoIndent: 'full',
                          formatOnPaste: editorSettings.formatOnPaste,
                          formatOnType: editorSettings.formatOnType,
                          dragAndDrop: true,
                          links: true,
                          colorDecorators: true,
                          lightbulb: { enabled: true },
                          codeActionsOnSave: {
                            'source.organizeImports': true,
                            'source.fixAll': true
                          },
                          matchBrackets: 'always',
                          glyphMargin: true,
                          lineDecorationsWidth: 10,
                          lineNumbersMinChars: 3,
                          showFoldingControls: 'mouseover',
                          foldingStrategy: 'indentation',
                          showUnused: true,
                          occurrencesHighlight: true,
                          selectionHighlight: true,
                          wordHighlight: true,
                          scrollbar: {
                            useShadows: false,
                            verticalHasArrows: true,
                            horizontalHasArrows: true,
                            verticalScrollbarSize: 14,
                            horizontalScrollbarSize: 14,
                            arrowSize: 11
                          },
                          overviewRulerBorder: false,
                          hideCursorInOverviewRuler: true,
                          mouseWheelZoom: editorSettings.mouseWheelZoom,
                          contextmenu: true,
                          copyWithSyntaxHighlighting: true,
                          multiCursorModifier: 'alt',
                          multiCursorMergeOverlapping: true,
                          selectOnLineNumbers: true,
                          selectionClipboard: false,
                          find: {
                            seedSearchStringFromSelection: 'selection',
                            autoFindInSelection: 'multiline'
                          }
                        }}
                        loading={<div className="editor-loading">Loading Monaco Editor...</div>}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="welcome-screen">
                    <div className="welcome-content">
                      <h1>Welcome to CloudIDE+</h1>
                      <p>A powerful, cloud-based development environment</p>

                      <div className="welcome-actions">
                        <button className="welcome-button" onClick={() => createNewFile()}>
                          📄 New File
                        </button>
                        <button className="welcome-button" onClick={() => document.getElementById('file-upload')?.click()}>
                          📂 Open File
                        </button>
                        <button className="welcome-button" onClick={() => setCommandPaletteOpen(true)}>
                          ⌘ Command Palette
                        </button>
                      </div>

                      <div className="recent-section">
                        <h3>Recent</h3>
                        <div className="recent-items">
                          <div className="recent-item" onClick={() => fileTree[0]?.children?.[0]?.children?.[0] && openFile(fileTree[0].children[0].children[0])}>
                            <span className="recent-icon">📄</span>
                            <span>index.html</span>
                          </div>
                          <div className="recent-item" onClick={() => fileTree[0]?.children?.[0]?.children?.[1] && openFile(fileTree[0].children[0].children[1])}>
                            <span className="recent-icon">🎨</span>
                            <span>style.css</span>
                          </div>
                        </div>
                      </div>

                      <div className="coming-soon">
                        <h3>Features:</h3>
                        <ul>
                          <li>✅ Monaco Editor (VS Code Engine)</li>
                          <li>✅ Split Editor & Live Preview</li>
                          <li>✅ Terminal Integration</li>
                          <li>✅ Multi-language Support</li>
                          <li>✅ Activity Bar & Panels</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview */}
              {showPreview && (
                <div className="preview-pane" style={{ width: '50%' }}>
                  <div className="preview-header">
                    <span>🌐 Live Preview</span>
                    <button
                      className="preview-close"
                      onClick={() => setShowPreview(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="preview-content">
                    {currentFile?.language === 'html' ? (
                      <iframe
                        srcDoc={previewContent}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Live Preview"
                      />
                    ) : (
                      <div className="preview-unavailable">
                        <div className="preview-message">
                          <h3>Preview Not Available</h3>
                          <p>Live preview is available for HTML files only.</p>
                          <p>Current file: {currentFile?.language || 'none'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Panel Resize Handle */}
      {bottomPanelOpen && (
        <div
          className="resize-handle resize-handle-horizontal"
          onMouseDown={handleBottomPanelResize}
        />
      )}

      {/* Bottom Panel */}
      {bottomPanelOpen && (
        <div className="bottom-panel" style={{ height: bottomPanelHeight }}>
          <div className="bottom-panel-tabs">
            <button
              className={`bottom-tab ${activeBottomTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('terminal')}
            >
              Terminal
            </button>
            <button
              className={`bottom-tab ${activeBottomTab === 'problems' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('problems')}
            >
              Problems
            </button>
            <button
              className={`bottom-tab ${activeBottomTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('output')}
            >
              Output
            </button>
            <button
              className={`bottom-tab ${activeBottomTab === 'debug' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('debug')}
            >
              Debug Console
            </button>
            <button className="close-bottom-panel" onClick={() => setBottomPanelOpen(false)}>×</button>
          </div>
          <div className="bottom-panel-content">
            {activeBottomTab === 'terminal' && (
              <div className="terminal">
                <div className="terminal-header">
                  <span>Terminal - CloudIDE+</span>
                  <div className="terminal-actions">
                    <button
                      className="terminal-button"
                      onClick={() => setTerminalOutput(['Welcome to CloudIDE+ Terminal'])}
                      title="Clear Terminal"
                    >
                      🗑️
                    </button>
                    <button
                      className="terminal-button"
                      onClick={() => setTerminalOutput(prev => [...prev, `${currentDirectory}$ pwd`, currentDirectory])}
                      title="Show Current Directory"
                    >
                      📁
                    </button>
                  </div>
                </div>
                <div className="terminal-content">
                  <div className="terminal-output">
                    {terminalOutput.map((line, index) => (
                      <div key={index} className="terminal-line">
                        <span
                          className={`terminal-text ${
                            line.includes('$') ? 'terminal-prompt-line' :
                            line.includes('✓') ? 'terminal-success' :
                            line.includes('Error') ? 'terminal-error' :
                            line.includes('Warning') ? 'terminal-warning' : ''
                          }`}
                        >
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="terminal-input-line">
                    <span className="terminal-prompt">{currentDirectory}$</span>
                    <input
                      type="text"
                      className="terminal-input"
                      placeholder="Type a command (ls, pwd, cd, npm, git, help)..."
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          executeTerminalCommand(terminalInput);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          // Could implement command history here
                        }
                      }}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}
            {activeBottomTab === 'problems' && (
              <div className="problems-panel">
                <div className="problems-header">
                  <span>Problems</span>
                  <div className="problems-actions">
                    <button
                      className="problems-action"
                      onClick={() => initializeProblems()}
                      title="Refresh"
                    >
                      🔄
                    </button>
                    <button
                      className="problems-action"
                      onClick={() => setProblems([])}
                      title="Clear All"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="problems-content">
                  <div className="problem-stats">
                    <span className="stat-item error">
                      <span className="stat-icon">🔴</span>
                      <span>{problems.filter(p => p.severity === 'error').length} Errors</span>
                    </span>
                    <span className="stat-item warning">
                      <span className="stat-icon">🟡</span>
                      <span>{problems.filter(p => p.severity === 'warning').length} Warnings</span>
                    </span>
                    <span className="stat-item info">
                      <span className="stat-icon">🔵</span>
                      <span>{problems.filter(p => p.severity === 'info').length} Info</span>
                    </span>
                  </div>
                  {problems.length === 0 ? (
                    <div className="no-problems">✅ No problems detected in workspace</div>
                  ) : (
                    <div className="problems-list">
                      {problems.map(problem => (
                        <div
                          key={problem.id}
                          className={`problem-item ${problem.severity}`}
                          onClick={() => navigateToProblem(problem)}
                          title={`Click to navigate to ${problem.file}:${problem.line}`}
                        >
                          <div className="problem-icon">
                            {problem.severity === 'error' ? '🔴' : problem.severity === 'warning' ? '🟡' : '🔵'}
                          </div>
                          <div className="problem-details">
                            <div className="problem-message">{problem.message}</div>
                            <div className="problem-location">
                              {problem.file}:{problem.line}:{problem.column} - {problem.source}
                            </div>
                          </div>
                          <div className="problem-actions">
                            {getCodeActions({
                              ...problem,
                              type: problem.severity,
                              id: `${problem.severity}-${problem.line}`,
                              severity: problem.severity === 'error' ? 2 : problem.severity === 'warning' ? 1 : 0
                            }).map((action, index) => (
                              <button
                                key={index}
                                className="problem-fix"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Apply fix:', action.title);
                                }}
                                title={action.title}
                              >
                                🔧
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeBottomTab === 'output' && (
              <div className="output-panel">
                <div className="output-header">Output</div>
                <div className="output-content">
                  <div className="output-line timestamp">[15:30:45] [CloudIDE+] Application started successfully</div>
                  <div className="output-line timestamp">[15:30:46] [Monaco] Editor initialized with {Object.keys(editorSettings).length} settings</div>
                  <div className="output-line timestamp">[15:30:47] [System] Ready for development 🚀</div>
                  <div className="output-line timestamp">[15:30:48] [Features] ✅ File Explorer ✅ Monaco Editor ✅ Terminal ✅ Settings</div>
                  {currentFile && (
                    <div className="output-line timestamp current">[15:30:49] [File] Opened: {currentFile.name} ({currentFile.language})</div>
                  )}
                </div>
              </div>
            )}
            {activeBottomTab === 'debug' && (
              <div className="debug">
                <div className="debug-header">
                  <span>Debug Console</span>
                  <div className="debug-actions">
                    <button className="debug-button" title="Clear Console">🗑️</button>
                    <button className="debug-button" title="Restart">🔄</button>
                  </div>
                </div>
                <div className="debug-content">
                  <div className="debug-line">🔍 Debug console ready</div>
                  <div className="debug-line">📝 Current file: {currentFile?.name || 'None'}</div>
                  <div className="debug-line">🎯 Language: {currentFile?.language || 'None'}</div>
                  <div className="debug-line">📁 Directory: {currentDirectory}</div>
                  <div className="debug-line">💾 Auto-save: {editorSettings.autoSave ? 'Enabled' : 'Disabled'}</div>
                  <div className="debug-line">💾 Saving: {isSaving ? 'In Progress' : 'Idle'}</div>
                  <div className="debug-line">🎨 Theme: {editorSettings.theme}</div>
                  <div className="debug-line">👁 Preview: {showPreview ? 'Active' : 'Hidden'}</div>
                  <div className="debug-line">📂 Open files: {openFiles.length}</div>
                  <div className="debug-line">🖥 Screen: {window.innerWidth}x{window.innerHeight}</div>
                </div>
                <div className="debug-input">
                  <span className="debug-prompt">&gt;&gt;</span>
                  <input
                    type="text"
                    className="debug-input-field"
                    placeholder="Evaluate expression..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        console.log('Debug expression:', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-indicator">
            {isSaving ? (
              <>📤 Saving...</>
            ) : isFormatting ? (
              <>🎨 Formatting...</>
            ) : (
              <>✅ Ready</>
            )}
          </span>

          <span className="branch-info clickable" onClick={() => setActiveView('git')}>
            🌿 main
          </span>

          <span className="sync-indicator clickable" title="Sync Changes">
            🔄 0↓ 0↑
          </span>

          {problems.length > 0 && (
            <span className="status-problems clickable" onClick={() => setActiveBottomTab('problems')}>
              {problems.filter(p => p.severity === 'error').length > 0 ? (
                <>❌ {problems.filter(p => p.severity === 'error').length}</>
              ) : null}
              {problems.filter(p => p.severity === 'warning').length > 0 ? (
                <>⚠️ {problems.filter(p => p.severity === 'warning').length}</>
              ) : null}
              {problems.filter(p => p.severity === 'info').length > 0 ? (
                <>ℹ️ {problems.filter(p => p.severity === 'info').length}</>
              ) : null}
            </span>
          )}

          <span className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}
              title="Zoom Out"
            >
              🔍-
            </button>
            <span className="zoom-level clickable" onClick={() => setZoomLevel(1)}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              className="zoom-btn"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 3))}
              title="Zoom In"
            >
              🔍+
            </button>
          </span>

          {currentFile && (
            <>
              <span className="file-info">
                {getFileIcon(currentFile.name)} {currentFile.name}
                {currentFile.isDirty && <span className="unsaved-indicator">●</span>}
              </span>
              <span className="cursor-position clickable" onClick={() => showGoToLineDialog()}>
                Ln {statusBarInfo.line}, Col {statusBarInfo.column}
              </span>
              {statusBarInfo.selection && (
                <span className="selection-info">
                  {statusBarInfo.selection}
                </span>
              )}
            </>
          )}
        </div>

        <div className="status-right">
          <span className="live-share clickable" title="Live Share">
            👥 Share
          </span>

          <span className="notifications clickable" onClick={() => console.log('Show notifications')}>
            🔔
          </span>

          <span className="encoding clickable" onClick={() => setWorkspaceSettingsOpen(true)} title="Select Encoding">
            {statusBarInfo.encoding}
          </span>

          <span className="eol clickable" onClick={() => setWorkspaceSettingsOpen(true)} title="Select End of Line Sequence">
            {statusBarInfo.eol}
          </span>

          <span className="indentation clickable" onClick={() => setWorkspaceSettingsOpen(true)} title="Select Indentation">
            {statusBarInfo.spaces === 2 ? 'Spaces: 2' : statusBarInfo.spaces === 4 ? 'Spaces: 4' : `Spaces: ${statusBarInfo.spaces}`}
          </span>

          <span className="language clickable" onClick={() => console.log('Language selector')} title="Select Language Mode">
            {currentFile?.language ? (
              <>
                {currentFile.language === 'javascript' ? '🟨 JavaScript' :
                 currentFile.language === 'typescript' ? '🔷 TypeScript' :
                 currentFile.language === 'html' ? '🌐 HTML' :
                 currentFile.language === 'css' ? '🎨 CSS' :
                 currentFile.language === 'json' ? '📋 JSON' :
                 currentFile.language === 'markdown' ? '📝 Markdown' :
                 currentFile.language === 'python' ? '🐍 Python' :
                 `📄 ${currentFile.language.toUpperCase()}`}
              </>
            ) : (
              '📄 Plain Text'
            )}
          </span>

          <span className="theme-indicator clickable" onClick={() => setThemePickerOpen(true)} title="Select Color Theme">
            {currentThemeId === 'vs-dark' ? '🌙 Dark+' :
             currentThemeId === 'vs' ? '☀️ Light+' :
             currentThemeId === 'monokai' ? '🎨 Monokai' :
             currentThemeId === 'github-dark' ? '⚫ GitHub Dark' :
             currentThemeId === 'github-light' ? '⚪ GitHub Light' :
             `🎨 ${themes.find(t => t.id === currentThemeId)?.name || 'Custom'}`}
          </span>

          <span className="feedback clickable" onClick={() => showNotification('Feedback feature coming soon!', 'info')} title="Send Feedback">
            😊
          </span>
        </div>
      </footer>

      {/* Enhanced Command Palette */}
      {commandPaletteOpen && (
        <div className="command-palette-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <input
                type="text"
                placeholder="Type a command..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setCommandPaletteOpen(false);
                  } else if (e.key === 'Enter') {
                    const filtered = commands.filter(cmd =>
                      cmd.label.toLowerCase().includes(commandQuery.toLowerCase())
                    );
                    if (filtered.length > 0) {
                      executeCommand(filtered[0].id);
                    }
                  }
                }}
              />
            </div>
            <div className="command-list">
              {commands
                .filter(cmd =>
                  cmd.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
                  cmd.keybinding.toLowerCase().includes(commandQuery.toLowerCase())
                )
                .slice(0, 10)
                .map((command, index) => (
                  <div
                    key={command.id}
                    className="command-item"
                    onClick={() => executeCommand(command.id)}
                  >
                    <div className="command-icon">{command.icon}</div>
                    <div className="command-label">{command.label}</div>
                    {command.keybinding && (
                      <div className="command-keybinding">{command.keybinding}</div>
                    )}
                  </div>
                ))}
              {commands.filter(cmd =>
                cmd.label.toLowerCase().includes(commandQuery.toLowerCase())
              ).length === 0 && commandQuery && (
                <div className="command-item no-results">
                  <div className="command-label">No commands found</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Theme Picker Modal */}
      {themePickerOpen && (
        <div className="modal-overlay" onClick={() => setThemePickerOpen(false)}>
          <div className="modal theme-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎨 Select Color Theme</h3>
              <button className="modal-close" onClick={() => setThemePickerOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="theme-categories">
                <div className="theme-category">
                  <h4>Dark Themes</h4>
                  <div className="theme-grid">
                    {themes.filter(theme => theme.type === 'dark').map(theme => (
                      <div
                        key={theme.id}
                        className={`theme-item ${currentThemeId === theme.id ? 'active' : ''}`}
                        onClick={() => changeTheme(theme.id)}
                      >
                        <div className={`theme-preview theme-preview-${theme.id}`}>
                          <div className="theme-preview-header"></div>
                          <div className="theme-preview-sidebar"></div>
                          <div className="theme-preview-editor">
                            <div className="theme-preview-line"></div>
                            <div className="theme-preview-line short"></div>
                            <div className="theme-preview-line"></div>
                          </div>
                        </div>
                        <div className="theme-info">
                          <div className="theme-name">{theme.name}</div>
                          <div className="theme-description">{theme.description}</div>
                        </div>
                        {currentThemeId === theme.id && (
                          <div className="theme-active-indicator">✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="theme-category">
                  <h4>Light Themes</h4>
                  <div className="theme-grid">
                    {themes.filter(theme => theme.type === 'light').map(theme => (
                      <div
                        key={theme.id}
                        className={`theme-item ${currentThemeId === theme.id ? 'active' : ''}`}
                        onClick={() => changeTheme(theme.id)}
                      >
                        <div className={`theme-preview theme-preview-${theme.id}`}>
                          <div className="theme-preview-header"></div>
                          <div className="theme-preview-sidebar"></div>
                          <div className="theme-preview-editor">
                            <div className="theme-preview-line"></div>
                            <div className="theme-preview-line short"></div>
                            <div className="theme-preview-line"></div>
                          </div>
                        </div>
                        <div className="theme-info">
                          <div className="theme-name">{theme.name}</div>
                          <div className="theme-description">{theme.description}</div>
                        </div>
                        {currentThemeId === theme.id && (
                          <div className="theme-active-indicator">✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="theme-category">
                  <h4>High Contrast Themes</h4>
                  <div className="theme-grid">
                    {themes.filter(theme => theme.type.includes('hc')).map(theme => (
                      <div
                        key={theme.id}
                        className={`theme-item ${currentThemeId === theme.id ? 'active' : ''}`}
                        onClick={() => changeTheme(theme.id)}
                      >
                        <div className={`theme-preview theme-preview-${theme.id}`}>
                          <div className="theme-preview-header"></div>
                          <div className="theme-preview-sidebar"></div>
                          <div className="theme-preview-editor">
                            <div className="theme-preview-line"></div>
                            <div className="theme-preview-line short"></div>
                            <div className="theme-preview-line"></div>
                          </div>
                        </div>
                        <div className="theme-info">
                          <div className="theme-name">{theme.name}</div>
                          <div className="theme-description">{theme.description}</div>
                        </div>
                        {currentThemeId === theme.id && (
                          <div className="theme-active-indicator">✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setThemePickerOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => setThemePickerOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search Panel */}
      {searchOpen && (
        <div className="search-panel">
          <div className="search-header">
            <span>🔍 Find and Replace</span>
            <div className="search-mode-toggle">
              <button
                className={`mode-button ${searchMode === 'current' ? 'active' : ''}`}
                onClick={() => setSearchMode('current')}
                title="Search in current file"
              >
                Current File
              </button>
              <button
                className={`mode-button ${searchMode === 'project' ? 'active' : ''}`}
                onClick={() => setSearchMode('project')}
                title="Search in all open files"
              >
                All Files
              </button>
            </div>
            <button className="close-search" onClick={() => setSearchOpen(false)}>×</button>
          </div>
          <div className="search-content">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Find (supports regex)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  performSearch(e.target.value, searchMode);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) {
                      navigateToSearchResult(currentSearchIndex - 1);
                    } else {
                      navigateToSearchResult(currentSearchIndex + 1);
                    }
                  }
                }}
                autoFocus
              />
              <span className="search-count">
                {searchResults.length > 0 ? `${currentSearchIndex + 1} of ${searchResults.length}` : 'No results'}
              </span>
            </div>
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    performReplace(searchQuery, replaceQuery, false);
                  }
                }}
              />
            </div>
            <div className="search-buttons">
              <button
                onClick={() => navigateToSearchResult(currentSearchIndex - 1)}
                disabled={searchResults.length === 0}
                title="Previous (Shift+Enter)"
              >
                ↑ Previous
              </button>
              <button
                onClick={() => navigateToSearchResult(currentSearchIndex + 1)}
                disabled={searchResults.length === 0}
                title="Next (Enter)"
              >
                ↓ Next
              </button>
              <button
                onClick={() => performReplace(searchQuery, replaceQuery, false)}
                disabled={!searchQuery || !currentFile}
                title="Replace current"
              >
                Replace
              </button>
              <button
                onClick={() => performReplace(searchQuery, replaceQuery, true)}
                disabled={!searchQuery || !currentFile}
                title="Replace all in current file"
              >
                Replace All
              </button>
            </div>
            <div className="search-options">
              <label className="search-option">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                <span>Case sensitive</span>
              </label>
              <label className="search-option">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={(e) => setWholeWord(e.target.checked)}
                />
                <span>Whole word</span>
              </label>
              <label className="search-option">
                <input
                  type="checkbox"
                  checked={useRegex}
                  onChange={(e) => setUseRegex(e.target.checked)}
                />
                <span>Use regex</span>
              </label>
            </div>
            {searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-results-header">
                  <span>Search Results ({searchResults.length})</span>
                </div>
                <div className="search-results-list">
                  {searchResults.slice(0, 100).map((result, index) => (
                    <div
                      key={`${result.fileId}-${result.line}-${result.column}`}
                      className={`search-result-item ${index === currentSearchIndex ? 'active' : ''}`}
                      onClick={() => navigateToSearchResult(index)}
                    >
                      <div className="result-file">{result.fileName}</div>
                      <div className="result-location">Line {result.line}, Col {result.column}</div>
                      <div className="result-text">
                        {result.text.substring(0, result.column - 1)}
                        <mark>{result.match}</mark>
                        {result.text.substring(result.column - 1 + result.match.length)}
                      </div>
                    </div>
                  ))}
                  {searchResults.length > 100 && (
                    <div className="search-result-overflow">
                      ... and {searchResults.length - 100} more results
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Find/Replace Modal */}
      {findReplaceOpen && (
        <div className="modal-overlay" onClick={() => setFindReplaceOpen(false)}>
          <div className="modal find-replace-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔍 Advanced Find & Replace</h3>
              <button className="modal-close" onClick={() => setFindReplaceOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="find-replace-form">
                <div className="form-group">
                  <label>Find:</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter search term..."
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Replace:</label>
                  <input
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Enter replacement..."
                    className="form-input"
                  />
                </div>
                <div className="form-options">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                    />
                    <span>Case sensitive</span>
                  </label>
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={wholeWord}
                      onChange={(e) => setWholeWord(e.target.checked)}
                    />
                    <span>Match whole word</span>
                  </label>
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={useRegex}
                      onChange={(e) => setUseRegex(e.target.checked)}
                    />
                    <span>Use regular expressions</span>
                  </label>
                </div>
                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => performSearch(searchQuery, searchMode)}
                  >
                    Find All
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => performReplace(searchQuery, replaceQuery, false)}
                  >
                    Replace
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => performReplace(searchQuery, replaceQuery, true)}
                  >
                    Replace All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snippets Manager Modal */}
      {commandPaletteOpen && (
        <div className="command-palette-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <input
                type="text"
                placeholder="Type a command or snippet..."
                autoFocus
                onChange={() => {
                  // Filter commands based on query
                }}
              />
            </div>
            <div className="command-palette-content">
              <div className="command-section">
                <div className="command-section-title">Commands</div>
                <div className="command-item">
                  <span className="command-name">Save File</span>
                  <span className="command-shortcut">Ctrl+S</span>
                </div>
                <div className="command-item">
                  <span className="command-name">Find & Replace</span>
                  <span className="command-shortcut">Ctrl+H</span>
                </div>
                <div className="command-item">
                  <span className="command-name">Format Document</span>
                  <span className="command-shortcut">Shift+Alt+F</span>
                </div>
              </div>
              <div className="command-section">
                <div className="command-section-title">Snippets</div>
                {codeSnippets.map((snippet) => (
                  <div key={snippet.id} className="command-item snippet-item">
                    <div className="snippet-info">
                      <span className="snippet-prefix">{snippet.prefix}</span>
                      <span className="snippet-description">{snippet.description}</span>
                    </div>
                    <span className="snippet-language">{snippet.language}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Open Modal */}
      {quickOpenVisible && (
        <div className="quick-open-overlay" onClick={() => setQuickOpenVisible(false)}>
          <div className="quick-open" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Search files by name..."
              value={quickOpenQuery}
              onChange={(e) => setQuickOpenQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuickOpenVisible(false);
                } else if (e.key === 'Enter' && quickOpenFiles.length > 0) {
                  setCurrentFile(quickOpenFiles[0]);
                  setQuickOpenVisible(false);
                }
              }}
              autoFocus
            />
            <div className="quick-open-results">
              {quickOpenFiles.map(file => (
                <div
                  key={file.id}
                  className="quick-open-item"
                  onClick={() => {
                    setCurrentFile(file);
                    setQuickOpenVisible(false);
                  }}
                >
                  <span className="file-icon">{getFileIcon(file.name)}</span>
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-path">{file.path}</div>
                  </div>
                </div>
              ))}
              {quickOpenQuery && quickOpenFiles.length === 0 && (
                <div className="no-results">No files found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <span className="notification-icon">
              {notification.type === 'error' ? '❌' :
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
            <button
              className="notification-close"
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {keyboardShortcutsVisible && (
        <div className="modal-overlay" onClick={() => setKeyboardShortcutsVisible(false)}>
          <div className="modal shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⌨️ Keyboard Shortcuts</h3>
              <button className="modal-close" onClick={() => setKeyboardShortcutsVisible(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="shortcuts-container">
                <div className="shortcut-section">
                  <h4>File Management</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+N</span>
                    <span className="shortcut-desc">New File</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+S</span>
                    <span className="shortcut-desc">Save File</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+W</span>
                    <span className="shortcut-desc">Close File</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+P</span>
                    <span className="shortcut-desc">Quick Open</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Navigation</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+G</span>
                    <span className="shortcut-desc">Go to Line</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+F</span>
                    <span className="shortcut-desc">Find</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+H</span>
                    <span className="shortcut-desc">Replace</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+F</span>
                    <span className="shortcut-desc">Find in Files</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Editor</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Shift+Alt+F</span>
                    <span className="shortcut-desc">Format Document</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+/</span>
                    <span className="shortcut-desc">Toggle Comment</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+D</span>
                    <span className="shortcut-desc">Add Selection to Next Find Match</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Alt+Click</span>
                    <span className="shortcut-desc">Add Cursor</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Panels</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+E</span>
                    <span className="shortcut-desc">Explorer</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+G</span>
                    <span className="shortcut-desc">Source Control</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+X</span>
                    <span className="shortcut-desc">Extensions</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+`</span>
                    <span className="shortcut-desc">Toggle Terminal</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>View</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+B</span>
                    <span className="shortcut-desc">Toggle Sidebar</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+J</span>
                    <span className="shortcut-desc">Toggle Panel</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+=</span>
                    <span className="shortcut-desc">Zoom In</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+-</span>
                    <span className="shortcut-desc">Zoom Out</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+0</span>
                    <span className="shortcut-desc">Reset Zoom</span>
                  </div>
                </div>

                <div className="shortcut-section">
                  <h4>Help</h4>
                  <div className="shortcut-item">
                    <span className="shortcut-key">F1</span>
                    <span className="shortcut-desc">Command Palette</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">F2</span>
                    <span className="shortcut-desc">Keyboard Shortcuts</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+K</span>
                    <span className="shortcut-desc">Keyboard Shortcuts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        settings={editorSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={(newSettings) => {
          setEditorSettings(newSettings);
          console.log('Settings saved:', newSettings);
        }}
      />

      {/* Workspace Settings Modal */}
      {workspaceSettingsOpen && (
        <div className="modal-overlay" onClick={() => setWorkspaceSettingsOpen(false)}>
          <div className="modal workspace-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏗️ Workspace Settings</h3>
              <button className="modal-close" onClick={() => setWorkspaceSettingsOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="workspace-settings">
                <div className="settings-group">
                  <h4>Editor Configuration</h4>
                  <div className="setting-row">
                    <label>Tab Size:</label>
                    <select
                      value={statusBarInfo.spaces}
                      onChange={(e) => setStatusBarInfo(prev => ({...prev, spaces: parseInt(e.target.value)}))}
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <label>End of Line:</label>
                    <select
                      value={statusBarInfo.eol}
                      onChange={(e) => setStatusBarInfo(prev => ({...prev, eol: e.target.value}))}
                    >
                      <option value="LF">LF (Unix)</option>
                      <option value="CRLF">CRLF (Windows)</option>
                      <option value="CR">CR (Mac)</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <label>Encoding:</label>
                    <select
                      value={statusBarInfo.encoding}
                      onChange={(e) => setStatusBarInfo(prev => ({...prev, encoding: e.target.value}))}
                    >
                      <option value="UTF-8">UTF-8</option>
                      <option value="UTF-16">UTF-16</option>
                      <option value="ASCII">ASCII</option>
                    </select>
                  </div>
                </div>

                <div className="settings-group">
                  <h4>Workspace Features</h4>
                  <div className="setting-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={formatOnSave}
                        onChange={(e) => setFormatOnSave(e.target.checked)}
                      />
                      Format on Save
                    </label>
                  </div>
                  <div className="setting-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={showProblems}
                        onChange={(e) => setShowProblems(e.target.checked)}
                      />
                      Show Problems Panel
                    </label>
                  </div>
                  <div className="setting-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={showMinimap}
                        onChange={(e) => setShowMinimap(e.target.checked)}
                      />
                      Show Minimap
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <h4>File Management</h4>
                  <div className="setting-row">
                    <label>Auto Save:</label>
                    <select
                      value={editorSettings.autoSave ? "on" : "off"}
                      onChange={(e) => setEditorSettings(prev => ({...prev, autoSave: e.target.value === "on"}))}
                    >
                      <option value="off">Off</option>
                      <option value="on">After Delay</option>
                      <option value="focus">On Focus Change</option>
                    </select>
                  </div>
                  <div className="setting-row">
                    <button className="btn btn-secondary" onClick={() => {
                      localStorage.clear();
                      console.log('Workspace reset');
                    }}>
                      Reset Workspace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Upload Input */}
      <input
        id="file-upload"
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.html,.htm,.css,.scss,.sass,.less,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.sql,.json,.xml,.yaml,.yml,.md,.txt"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.items.map((item, index) =>
            item.separator ? (
              <div key={index} className="context-menu-separator" />
            ) : (
              <div
                key={item.id}
                className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (!item.disabled) {
                    item.action();
                    setContextMenu(null);
                  }
                }}
              >
                {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                <span className="context-menu-label">{item.label}</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Drag and Drop Overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <h2>📁 Drop Files Here</h2>
            <p>Drop your files to open them in the editor</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

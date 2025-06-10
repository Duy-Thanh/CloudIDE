import React, { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import SettingsModal from './components/SettingsModal';
import './App.css';

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
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'extensions'>('explorer');
  const [dragOver, setDragOver] = useState(false);
  const [codeIssues, setCodeIssues] = useState<CodeIssue[]>([]);
  const [isFormatting, setIsFormatting] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchMode, setSearchMode] = useState<'current' | 'project'>('current');
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

  useEffect(() => {
    // Initialize Firebase Auth check
    // This will be implemented when we add Firebase
    console.log('CloudIDE+ initializing...');

    // Mark app as loaded to hide loading screen
    document.body.classList.add('app-loaded');

    // Initialize sample project
    initializeSampleProject();

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
            if (e.shiftKey) {
              e.preventDefault();
              setCommandPaletteOpen(true);
            }
            break;
          case 'f':
            e.preventDefault();
            setSearchOpen(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(!sidebarOpen);
            break;
          case 'j':
            e.preventDefault();
            setBottomPanelOpen(!bottomPanelOpen);
            break;
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
    const iconMap: { [key: string]: string } = {
      'js': '🟨',
      'jsx': '⚛️',
      'ts': '🔷',
      'tsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'cpp': '🔧',
      'c': '🔧',
      'cs': '#️⃣',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'html': '🌐',
      'css': '🎨',
      'scss': '💅',
      'json': '📋',
      'xml': '📄',
      'md': '📝',
      'sql': '🗃️',
      'sh': '⚡',
      'yaml': '⚙️',
      'yml': '⚙️',
      'gitignore': '📋',
      'env': '🔐',
      'lock': '🔒',
      'config': '⚙️'
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

    // Run linting
    if (currentFile) {
      const issues = lintCode({ ...currentFile, content: value });
      setCodeIssues(issues);
    }
  };

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
    const updatedGroups = editorGroups.map(group => ({
      ...group,
      width: group.width * 0.7
    }));

    setEditorGroups([...updatedGroups, newGroup]);
  };



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

  const executeCommand = (command: string) => {
    switch (command) {
      case 'Save File':
        saveCurrentFile();
        break;
      case 'Save All':
        saveAllFiles();
        break;
      case 'New File':
        createNewFile();
        break;
      case 'Toggle Sidebar':
        setSidebarOpen(!sidebarOpen);
        break;
      case 'Toggle Bottom Panel':
        setBottomPanelOpen(!bottomPanelOpen);
        break;
      case 'Find':
        setSearchOpen(true);
        break;
      case 'Settings':
        setSettingsOpen(true);
        break;
      default:
        console.log('Unknown command:', command);
    }
    setCommandPaletteOpen(false);
  };

  const commands = [
    'Save File',
    'Save All',
    'New File',
    'Toggle Sidebar',
    'Toggle Bottom Panel',
    'Find',
    'Settings'
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
              <button onClick={() => createNewFile('index.html', 'html')}>HTML File</button>
              <button onClick={() => createNewFile('style.css', 'css')}>CSS File</button>
              <button onClick={() => createNewFile('script.js', 'javascript')}>JavaScript File</button>
              <button onClick={() => createNewFile('app.ts', 'typescript')}>TypeScript File</button>
              <button onClick={() => createNewFile('main.py', 'python')}>Python File</button>
              <button onClick={() => createNewFile('Main.java', 'java')}>Java File</button>
              <button onClick={() => createNewFile('main.cpp', 'cpp')}>C++ File</button>
              <button onClick={() => createNewFile('README.md', 'markdown')}>Markdown File</button>
              <button onClick={() => createNewFile()}>Plain Text</button>
            </div>
          </div>
          <button className="header-button">
            📁 Open
          </button>
          <button
            className={`header-button ${isSaving ? 'saving' : ''}`}
            onClick={saveCurrentFile}
            disabled={!currentFile?.isDirty || isSaving}
            title="Save current file (Ctrl+S)"
          >
            {isSaving ? '💾 Saving...' : '💾 Save'}
          </button>
          <button
            className="header-button"
            onClick={saveAllFiles}
            disabled={!openFiles.some(f => f.isDirty)}
            title="Save all files"
          >
            💾 Save All
          Save All
        </button>
        <button
          className={`header-button ${isFormatting ? 'formatting' : ''}`}
          onClick={formatCode}
          disabled={!currentFile || isFormatting}
          title="Format Document (Shift+Alt+F)"
        >
          {isFormatting ? '⏳ Formatting...' : '🎨 Format'}
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
        <span className="user-info">{user?.name}</span>
        <button className="header-button" onClick={handleLogout}>
          Logout
        </button>
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
                setSearchOpen(true);
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
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="sidebar">
            {activeView === 'explorer' && (
              <>
                <div className="sidebar-header">
                  <h3>Explorer</h3>
                  <div className="sidebar-actions">
                    <button className="sidebar-action" title="New File" onClick={() => createNewFile()}>📄</button>
                    <button className="sidebar-action" title="New Folder" onClick={createNewFolder}>📁</button>
                    <button className="sidebar-action" title="Upload File" onClick={() => document.getElementById('file-upload')?.click()}>📤</button>
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
                    <div className="extension-item installed">
                      <div className="extension-icon">🎨</div>
                      <div className="extension-info">
                        <div className="extension-name">VS Code Theme Pack</div>
                        <div className="extension-author">CloudIDE+</div>
                      </div>
                      <button className="extension-action">⚙️</button>
                    </div>
                    <div className="extension-item installed">
                      <div className="extension-icon">🚀</div>
                      <div className="extension-info">
                        <div className="extension-name">Monaco IntelliSense</div>
                        <div className="extension-author">CloudIDE+</div>
                      </div>
                      <button className="extension-action">⚙️</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">🔧</div>
                      <div className="extension-info">
                        <div className="extension-name">Prettier Code Formatter</div>
                        <div className="extension-author">Prettier</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                    <div className="extension-item">
                      <div className="extension-icon">📁</div>
                      <div className="extension-info">
                        <div className="extension-name">File Utils</div>
                        <div className="extension-author">CloudIDE+</div>
                      </div>
                      <button className="extension-action">📥</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
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
              {/* Main Editor */}
              <div className="editor-pane" style={{ width: showPreview ? '50%' : '100%' }}>
                {currentFile ? (
                  <div className="editor-placeholder">
                    {/* Breadcrumbs */}
                    <div className="breadcrumbs">
                      <span className="breadcrumb-icon">📁</span>
                      {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                          <span className="breadcrumb-item">{crumb.name}</span>
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
                          fontSize: editorSettings.fontSize,
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
                            showEnums: editorSettings.quickSuggestions
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
                          autoIndent: 'full',
                          formatOnPaste: editorSettings.formatOnPaste,
                          formatOnType: editorSettings.formatOnType,
                          dragAndDrop: true,
                          links: true,
                          colorDecorators: true,
                          lightbulb: { enabled: true },

                          matchBrackets: 'always',
                          glyphMargin: true,
                          lineDecorationsWidth: 10,
                          lineNumbersMinChars: 3,
                          scrollbar: {
                            useShadows: false,
                            verticalHasArrows: true,
                            horizontalHasArrows: true,
                            verticalScrollbarSize: 14,
                            horizontalScrollbarSize: 14
                          },
                          mouseWheelZoom: editorSettings.mouseWheelZoom,
                          contextmenu: true,
                          copyWithSyntaxHighlighting: true
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
                      onClick={() => currentFile && setCodeIssues(lintCode(currentFile))}
                      title="Refresh"
                    >
                      🔄
                    </button>
                    <button
                      className="problems-action"
                      onClick={() => setCodeIssues([])}
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
                      <span>{codeIssues.filter(i => i.type === 'error').length} Errors</span>
                    </span>
                    <span className="stat-item warning">
                      <span className="stat-icon">🟡</span>
                      <span>{codeIssues.filter(i => i.type === 'warning').length} Warnings</span>
                    </span>
                    <span className="stat-item info">
                      <span className="stat-icon">🔵</span>
                      <span>{codeIssues.filter(i => i.type === 'info').length} Info</span>
                    </span>
                  </div>
                  {codeIssues.length === 0 ? (
                    <div className="no-problems">✅ No problems detected in workspace</div>
                  ) : (
                    <div className="problems-list">
                      {codeIssues.map(issue => (
                        <div
                          key={issue.id}
                          className={`problem-item ${issue.type}`}
                          onClick={() => {
                            if (editorRef.current) {
                              editorRef.current.revealLineInCenter(issue.line);
                              editorRef.current.setPosition({ lineNumber: issue.line, column: issue.column });
                              editorRef.current.focus();
                            }
                          }}
                        >
                          <div className="problem-icon">
                            {issue.type === 'error' ? '🔴' : issue.type === 'warning' ? '🟡' : '🔵'}
                          </div>
                          <div className="problem-details">
                            <div className="problem-message">{issue.message}</div>
                            <div className="problem-location">
                              {currentFile?.name} [{issue.line}, {issue.column}] - {issue.source}
                            </div>
                          </div>
                          <div className="problem-actions">
                            {getCodeActions(issue).map((action, index) => (
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

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span>Ready</span>
          {currentFile && <span>• {currentFile.name}</span>}
          <button className="status-button" onClick={() => setBottomPanelOpen(!bottomPanelOpen)}>
            {bottomPanelOpen ? '▼ Hide Panel' : '▲ Show Panel'}
          </button>
        </div>
        <div className="status-right">
          <span>UTF-8</span>
          <span>LF</span>
          <span className="clickable" onClick={() => console.log('Language selector')}>
            {currentFile?.language || 'Plain Text'}
          </span>
          <span className="clickable" onClick={() => setSettingsOpen(true)}>
            {editorSettings.theme === 'vs-dark' ? '🌙' : '☀️'}
          </span>
        </div>
      </footer>

      {/* Command Palette */}
      {commandPaletteOpen && (
        <div className="command-palette-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Type a command..."
              autoFocus
              onChange={() => {
                // Filter commands based on query
              }}
            />
            <div className="command-list">
              {commands.map((command, index) => (
                <div
                  key={index}
                  className="command-item"
                  onClick={() => executeCommand(command)}
                >
                  {command}
                </div>
              ))}
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

      {/* Hidden File Upload Input */}
      <input
        id="file-upload"
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.html,.htm,.css,.scss,.sass,.less,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.sql,.json,.xml,.yaml,.yml,.md,.txt"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

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

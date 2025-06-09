import React, { useState } from 'react';
import './SettingsModal.css';

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

interface SettingsModalProps {
  isOpen: boolean;
  settings: EditorSettings;
  onClose: () => void;
  onSave: (settings: EditorSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave
}) => {
  const [currentSettings, setCurrentSettings] = useState<EditorSettings>(settings);
  const [activeTab, setActiveTab] = useState('editor');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: EditorSettings = {
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
    };
    setCurrentSettings(defaultSettings);
  };

  const updateSetting = (key: keyof EditorSettings, value: any) => {
    setCurrentSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderEditorSettings = () => (
    <div className="settings-section">
      <h3>Editor Settings</h3>

      <div className="setting-group">
        <label className="setting-label">Theme</label>
        <select
          value={currentSettings.theme}
          onChange={(e) => updateSetting('theme', e.target.value)}
          className="setting-select"
        >
          <option value="vs-dark">Dark (Visual Studio)</option>
          <option value="vs-light">Light (Visual Studio)</option>
          <option value="hc-black">High Contrast</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">Font Size</label>
        <input
          type="number"
          min="8"
          max="72"
          value={currentSettings.fontSize}
          onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
          className="setting-input"
        />
      </div>

      <div className="setting-group">
        <label className="setting-label">Font Family</label>
        <select
          value={currentSettings.fontFamily}
          onChange={(e) => updateSetting('fontFamily', e.target.value)}
          className="setting-select"
        >
          <option value="Fira Code, Cascadia Code, Monaco, Menlo, monospace">Fira Code</option>
          <option value="Cascadia Code, Monaco, Menlo, monospace">Cascadia Code</option>
          <option value="Monaco, Menlo, monospace">Monaco</option>
          <option value="Consolas, monospace">Consolas</option>
          <option value="Source Code Pro, monospace">Source Code Pro</option>
          <option value="JetBrains Mono, monospace">JetBrains Mono</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">Tab Size</label>
        <input
          type="number"
          min="1"
          max="8"
          value={currentSettings.tabSize}
          onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
          className="setting-input"
        />
      </div>

      <div className="setting-group">
        <label className="setting-label">Cursor Style</label>
        <select
          value={currentSettings.cursorStyle}
          onChange={(e) => updateSetting('cursorStyle', e.target.value)}
          className="setting-select"
        >
          <option value="line">Line</option>
          <option value="block">Block</option>
          <option value="underline">Underline</option>
          <option value="line-thin">Line Thin</option>
          <option value="block-outline">Block Outline</option>
          <option value="underline-thin">Underline Thin</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">Cursor Blinking</label>
        <select
          value={currentSettings.cursorBlinking}
          onChange={(e) => updateSetting('cursorBlinking', e.target.value)}
          className="setting-select"
        >
          <option value="blink">Blink</option>
          <option value="smooth">Smooth</option>
          <option value="phase">Phase</option>
          <option value="expand">Expand</option>
          <option value="solid">Solid</option>
        </select>
      </div>

      <div className="settings-toggles">
        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.minimap}
              onChange={(e) => updateSetting('minimap', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Show Minimap
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.wordWrap}
              onChange={(e) => updateSetting('wordWrap', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Word Wrap
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.lineNumbers}
              onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Line Numbers
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.autoSave}
              onChange={(e) => updateSetting('autoSave', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Auto Save
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.insertSpaces}
              onChange={(e) => updateSetting('insertSpaces', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Insert Spaces
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.renderWhitespace}
              onChange={(e) => updateSetting('renderWhitespace', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Render Whitespace
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.folding}
              onChange={(e) => updateSetting('folding', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Code Folding
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.bracketPairColorization}
              onChange={(e) => updateSetting('bracketPairColorization', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Bracket Pair Colorization
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.autoClosingBrackets}
              onChange={(e) => updateSetting('autoClosingBrackets', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Auto Closing Brackets
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.autoClosingQuotes}
              onChange={(e) => updateSetting('autoClosingQuotes', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Auto Closing Quotes
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.formatOnPaste}
              onChange={(e) => updateSetting('formatOnPaste', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Format On Paste
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.formatOnType}
              onChange={(e) => updateSetting('formatOnType', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Format On Type
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.smoothScrolling}
              onChange={(e) => updateSetting('smoothScrolling', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Smooth Scrolling
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.mouseWheelZoom}
              onChange={(e) => updateSetting('mouseWheelZoom', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Mouse Wheel Zoom
          </label>
        </div>
      </div>
    </div>
  );

  const renderIntelliSenseSettings = () => (
    <div className="settings-section">
      <h3>IntelliSense Settings</h3>

      <div className="setting-group">
        <label className="setting-label">Accept Suggestion On Enter</label>
        <select
          value={currentSettings.acceptSuggestionOnEnter}
          onChange={(e) => updateSetting('acceptSuggestionOnEnter', e.target.value)}
          className="setting-select"
        >
          <option value="on">On</option>
          <option value="off">Off</option>
          <option value="smart">Smart</option>
        </select>
      </div>

      <div className="settings-toggles">
        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.quickSuggestions}
              onChange={(e) => updateSetting('quickSuggestions', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Quick Suggestions
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.parameterHints}
              onChange={(e) => updateSetting('parameterHints', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Parameter Hints
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.snippets}
              onChange={(e) => updateSetting('snippets', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Code Snippets
          </label>
        </div>

        <div className="setting-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={currentSettings.wordBasedSuggestions}
              onChange={(e) => updateSetting('wordBasedSuggestions', e.target.checked)}
            />
            <span className="toggle-slider"></span>
            Word Based Suggestions
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-sidebar">
            <div className="settings-tabs">
              <button
                className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                <span className="tab-icon">🎨</span>
                Editor
              </button>
              <button
                className={`settings-tab ${activeTab === 'intellisense' ? 'active' : ''}`}
                onClick={() => setActiveTab('intellisense')}
              >
                <span className="tab-icon">🧠</span>
                IntelliSense
              </button>
            </div>
          </div>

          <div className="settings-main">
            {activeTab === 'editor' && renderEditorSettings()}
            {activeTab === 'intellisense' && renderIntelliSenseSettings()}
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-button secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <div className="settings-footer-right">
            <button className="settings-button secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="settings-button primary" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

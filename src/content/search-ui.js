/**
 * Darkroom Find - Shadow DOM Search UI
 * Floating pill interface with glassmorphism, keyboard navigation,
 * options toggles, search history, and ARIA accessibility.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotlightSearchUI = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ponytail: use system font stack ('Inter', 'Segoe UI', system-ui, -apple-system, sans-serif) in content script; avoids cross-origin chrome-extension:// woff2 fetch blocked by host frame CSP/COEP.
  const SEARCH_UI_CSS = `
:host {
  all: initial;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, 'Vazirmatn', sans-serif;
  font-size: 13px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;

  /* Design Tokens - Dark (default) */
  --bg: #16171A;
  --surface: #1D1F23;
  --surface-2: #25282D;
  --border: #2E3238;
  --border-strong: #3A3F46;
  --text: #E6E8EB;
  --text-muted: #9AA1AB;
  --text-faint: #6B727C;
  --accent: #8FA8C8;
  --accent-fg: #14181D;
  --accent-soft: rgba(143, 168, 200, 0.14);
  --danger: #C97B7B;
  --r-sm: 6px;
  --r-md: 10px;
  --sf-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: light) {
  :host {
    /* Design Tokens - Light (auto) */
    --bg: #F7F7F5;
    --surface: #FFFFFF;
    --surface-2: #F0F0ED;
    --border: #E3E3DF;
    --border-strong: #D0D0CB;
    --text: #1B1D20;
    --text-muted: #5C626B;
    --text-faint: #8A9099;
    --accent: #4F6D93;
    --accent-fg: #FFFFFF;
    --accent-soft: rgba(79, 109, 147, 0.12);
    --danger: #C97B7B;
  }
}

/* Floating Search Pill Container */
.sf-search-container {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 140ms ease-out, transform 140ms ease-out;
  font-family: inherit;
  color: var(--text);
}

.sf-search-container.sf-active {
  opacity: 1;
  transform: translateY(0);
}

/* Compact Floating Pill (40px height, max 560px) */
.sf-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  max-width: 560px;
  padding: 0 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
  color: var(--text);
  box-sizing: border-box;
}

/* Brand Icon (20px flat magnifier in text-muted, no gradient, no glow) */
.sf-brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.sf-brand-icon svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
  display: block;
}

/* Search Input Area */
.sf-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 140px;
}

.sf-input {
  width: 100%;
  height: 28px;
  padding: 0 10px;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  color: var(--text);
  font-size: 14px;
  font-weight: 400;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, 'Vazirmatn', sans-serif;
  outline: none;
  box-sizing: border-box;
  transition: border-color 120ms ease-out;
  direction: auto;
  unicode-bidi: plaintext;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.sf-input:focus {
  border-color: var(--accent);
}

.sf-input::selection {
  background: var(--accent-soft);
  color: var(--text);
}

.sf-input::placeholder {
  color: var(--text-faint);
}

/* Match Counter (plain mono text, no pill background, min-width 44px) */
.sf-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 28px;
  padding: 0 4px;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--sf-font-mono);
  color: var(--text-muted);
  white-space: nowrap;
  box-sizing: border-box;
  text-align: center;
  direction: ltr;
}

.sf-badge.sf-badge-has-matches {
  color: var(--text);
}

.sf-badge.sf-badge-no-matches {
  color: var(--danger);
}

.sf-badge.sf-badge-error {
  color: var(--danger);
}

/* Button Groups */
.sf-btn-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Toggles & Icon Buttons (28x28px, radius 6px) */
.sf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--sf-font-mono);
  outline: none;
  transition: background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out;
  position: relative;
  box-sizing: border-box;
}

.sf-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.sf-btn:active {
  background: var(--border);
}

.sf-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* Active Toggle: accent-soft background, accent text & 1px accent border */
.sf-btn[aria-pressed="true"] {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}

.sf-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
  display: block;
}

/* Close button hover danger color */
.sf-btn.sf-btn-close:hover {
  color: var(--danger);
}

/* Hairline Divider */
.sf-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}

/* Tooltip on hover */
.sf-btn[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2147483647;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, 'Vazirmatn', sans-serif;
}

/* Search History Dropdown Menu */
.sf-history-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 240px;
  max-height: 220px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
  padding: 4px;
  display: none;
  flex-direction: column;
  z-index: 2147483647;
}

.sf-history-menu.sf-open {
  display: flex;
}

.sf-history-header {
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  font-family: inherit;
}

.sf-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  color: var(--text);
  font-size: 12.5px;
  cursor: pointer;
  transition: background-color 100ms ease-out;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: auto;
}

.sf-history-item:hover {
  background: var(--surface-2);
}

.sf-history-empty {
  padding: 10px;
  text-align: center;
  color: var(--text-faint);
  font-size: 11.5px;
}

.sf-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sf-search-container,
  .sf-btn,
  .sf-input,
  .sf-history-item {
    transition: none !important;
    transform: none !important;
  }
}
`;

  class SpotlightSearchUI {
    constructor(shadowRoot, options = {}) {
      this.shadowRoot = shadowRoot;
      this.options = {
        matchCase: false,
        wholeWord: false,
        useRegex: false,
        multiTerm: false,
        ...options
      };

      this.callbacks = {
        onSearch: options.onSearch || (() => {}),
        onNext: options.onNext || (() => {}),
        onPrev: options.onPrev || (() => {}),
        onClose: options.onClose || (() => {}),
        onToggleOption: options.onToggleOption || (() => {}),
        onToggleExclusion: options.onToggleExclusion || (() => {}),
        onBypassNative: options.onBypassNative || (() => {})
      };

      this.container = null;
      this.input = null;
      this.badge = null;
      this.historyMenu = null;
      this.srLive = null;
      this.debounceTimer = null;
      this.isOpen = false;
      this.previousFocusedElement = null;
      this.currentLang = options.language || 'en';
      this.pointerDownInside = false;

      this.onOutsidePointerDown = this.onOutsidePointerDown.bind(this);
      this.onOutsideClick = this.onOutsideClick.bind(this);

      this.initDOM();
      this.bindEvents();
    }

    initDOM() {
      // Synchronously inject styles into shadowRoot if not present
      if (!this.shadowRoot.querySelector('style[data-sf-styles]')) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-sf-styles', 'true');
        styleEl.textContent = SEARCH_UI_CSS;
        this.shadowRoot.appendChild(styleEl);
      }

      this.container = document.createElement('div');
      this.container.className = 'sf-search-container';
      this.container.setAttribute('role', 'dialog');
      this.container.setAttribute('aria-label', 'Darkroom In-Page Search');
      this.container.style.cssText = 'position: fixed; top: 16px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; pointer-events: auto;';

      this.container.innerHTML = `
        <div class="sf-pill">
          <!-- Spotlight Brand Icon -->
          <div class="sf-brand-icon" title="Darkroom Find">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>

          <!-- Search Input Area -->
          <div class="sf-input-wrap">
            <input
              type="text"
              class="sf-input"
              placeholder="Find in page..."
              dir="auto"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              aria-label="Search text"
            />
          </div>

          <!-- Match Counter -->
          <div class="sf-badge" aria-hidden="true" aria-live="polite">0 / 0</div>

          <!-- Option Toggles -->
          <div class="sf-btn-group">
            <button type="button" class="sf-btn sf-toggle-case" data-tooltip="Match Case (Alt+C)" aria-label="Match Case" aria-pressed="false">Aa</button>
            <button type="button" class="sf-btn sf-toggle-word" data-tooltip="Whole Word (Alt+W)" aria-label="Whole Word" aria-pressed="false">[ab]</button>
            <button type="button" class="sf-btn sf-toggle-regex" data-tooltip="Regex (Alt+R)" aria-label="Regular Expression" aria-pressed="false">.*</button>
            <button type="button" class="sf-btn sf-toggle-multi" data-tooltip="Multi-term (Alt+M)" aria-label="Multi-term Highlight" aria-pressed="false">M+</button>
          </div>

          <div class="sf-divider"></div>

          <!-- Navigation Prev/Next -->
          <div class="sf-btn-group">
            <button type="button" class="sf-btn sf-btn-prev" data-tooltip="Previous (Shift+Enter)" aria-label="Previous Match">
              <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
            </button>
            <button type="button" class="sf-btn sf-btn-next" data-tooltip="Next (Enter)" aria-label="Next Match">
              <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
            </button>
          </div>

          <div class="sf-divider"></div>

          <!-- Auxiliary Actions -->
          <div class="sf-btn-group">
            <button type="button" class="sf-btn sf-btn-history" data-tooltip="Search History" aria-label="Search History">
              <svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
            </button>
            <button type="button" class="sf-btn sf-btn-bypass" data-tooltip="Chrome Native Find (Ctrl+F twice)" aria-label="Use Chrome Native Find">
              <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            </button>
            <button type="button" class="sf-btn sf-btn-close" data-tooltip="Close (Esc)" aria-label="Close Search">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </div>

        <!-- History Dropdown Menu -->
        <div class="sf-history-menu">
          <div class="sf-history-header">Recent Searches</div>
          <div class="sf-history-list"></div>
        </div>

        <!-- Accessible Screen Reader Announcement -->
        <div class="sf-sr-only" aria-live="polite"></div>
      `;

      this.shadowRoot.appendChild(this.container);

      // References
      this.input = this.container.querySelector('.sf-input');
      this.badge = this.container.querySelector('.sf-badge');
      this.historyMenu = this.container.querySelector('.sf-history-menu');
      this.srLive = this.container.querySelector('.sf-sr-only');

      // Sync initial toggle button states
      this.setToggleState('.sf-toggle-case', this.options.matchCase);
      this.setToggleState('.sf-toggle-word', this.options.wholeWord);
      this.setToggleState('.sf-toggle-regex', this.options.useRegex);
      this.setToggleState('.sf-toggle-multi', this.options.multiTerm);

      this.setLanguage(this.currentLang);
    }

    setLanguage(lang) {
      this.currentLang = lang || 'en';
      if (!this.container) return;

      const t = (key, ...args) => {
        if (typeof SpotlightI18n !== 'undefined' && SpotlightI18n.t) {
          return SpotlightI18n.t(key, this.currentLang, ...args);
        }
        return key;
      };

      if (this.input) {
        this.input.placeholder = t('findBar.placeholder');
      }

      const setBtn = (selector, tooltipKey, ariaKey) => {
        const btn = this.container.querySelector(selector);
        if (btn) {
          btn.setAttribute('data-tooltip', t(tooltipKey));
          if (ariaKey) btn.setAttribute('aria-label', t(ariaKey));
        }
      };

      setBtn('.sf-toggle-case', 'findBar.toggleCase', 'findBar.toggleCase');
      setBtn('.sf-toggle-word', 'findBar.toggleWord', 'findBar.toggleWord');
      setBtn('.sf-toggle-regex', 'findBar.toggleRegex', 'findBar.toggleRegex');
      setBtn('.sf-toggle-multi', 'findBar.toggleMultiTerm', 'findBar.toggleMultiTerm');
      setBtn('.sf-btn-prev', 'findBar.prevMatch', 'findBar.prevMatch');
      setBtn('.sf-btn-next', 'findBar.nextMatch', 'findBar.nextMatch');
      setBtn('.sf-btn-history', 'findBar.historyBtn', 'findBar.historyBtn');
      setBtn('.sf-btn-bypass', 'findBar.nativeFindBtn', 'findBar.nativeFindBtn');
      setBtn('.sf-btn-close', 'findBar.closeBtn', 'findBar.closeBtn');

      const historyHeader = this.container.querySelector('.sf-history-header');
      if (historyHeader) {
        historyHeader.textContent = t('findBar.historyHeader');
      }
    }

    setToggleState(selector, active) {
      const btn = this.container.querySelector(selector);
      if (btn) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }

    bindEvents() {
      // Contain composed keyboard/input/clipboard events inside the shadow tree so they
      // never bubble across the shadow boundary to the host page. Without this, keystrokes
      // typed into this input are retargeted to the <div> host element and leak to site-wide
      // hotkey handlers (GitHub, YouTube, Reddit, Notion...), which then fire their own
      // shortcuts ("/" focus-search, command bar, etc.) over our overlay.
      const LEAKABLE_EVENTS = [
        'keydown', 'keyup', 'keypress',
        'input', 'beforeinput', 'textInput',
        'compositionstart', 'compositionupdate', 'compositionend',
        'paste', 'copy', 'cut'
      ];
      for (const type of LEAKABLE_EVENTS) {
        this.shadowRoot.addEventListener(type, (e) => {
          e.stopPropagation();
        });
      }

      // Input typing with ~60ms debounce
      this.input.addEventListener('input', () => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.triggerSearch();
        }, 60);
      });

      // Keyboard shortcuts in search input
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            this.callbacks.onPrev();
          } else {
            this.callbacks.onNext();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.callbacks.onNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.callbacks.onPrev();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.hide();
        } else if (e.altKey) {
          // Alt+C, Alt+W, Alt+R, Alt+M toggles
          const key = e.key.toLowerCase();
          if (key === 'c') {
            e.preventDefault();
            this.toggleOption('matchCase', '.sf-toggle-case');
          } else if (key === 'w') {
            e.preventDefault();
            this.toggleOption('wholeWord', '.sf-toggle-word');
          } else if (key === 'r') {
            e.preventDefault();
            this.toggleOption('useRegex', '.sf-toggle-regex');
          } else if (key === 'm') {
            e.preventDefault();
            this.toggleOption('multiTerm', '.sf-toggle-multi');
          }
        }
      });

      // Toggle buttons click
      this.container.querySelector('.sf-toggle-case').addEventListener('click', () => {
        this.toggleOption('matchCase', '.sf-toggle-case');
      });
      this.container.querySelector('.sf-toggle-word').addEventListener('click', () => {
        this.toggleOption('wholeWord', '.sf-toggle-word');
      });
      this.container.querySelector('.sf-toggle-regex').addEventListener('click', () => {
        this.toggleOption('useRegex', '.sf-toggle-regex');
      });
      this.container.querySelector('.sf-toggle-multi').addEventListener('click', () => {
        this.toggleOption('multiTerm', '.sf-toggle-multi');
      });

      // Navigation clicks
      this.container.querySelector('.sf-btn-prev').addEventListener('click', () => {
        this.callbacks.onPrev();
      });
      this.container.querySelector('.sf-btn-next').addEventListener('click', () => {
        this.callbacks.onNext();
      });

      // History button
      this.container.querySelector('.sf-btn-history').addEventListener('click', () => {
        this.toggleHistoryMenu();
      });

      // Bypass button
      this.container.querySelector('.sf-btn-bypass').addEventListener('click', () => {
        this.callbacks.onBypassNative();
      });

      // Close button
      this.container.querySelector('.sf-btn-close').addEventListener('click', () => {
        this.hide();
      });

      // Click outside pill to close history menu
      this.container.addEventListener('click', (e) => {
        if (!e.target.closest('.sf-btn-history') && !e.target.closest('.sf-history-menu')) {
          this.closeHistoryMenu();
        }
      });
    }

    toggleOption(optionKey, buttonSelector) {
      this.options[optionKey] = !this.options[optionKey];
      this.setToggleState(buttonSelector, this.options[optionKey]);
      this.callbacks.onToggleOption(optionKey, this.options[optionKey]);
      this.triggerSearch();
    }

    triggerSearch() {
      const query = this.input.value;
      this.callbacks.onSearch(query, {
        matchCase: this.options.matchCase,
        wholeWord: this.options.wholeWord,
        useRegex: this.options.useRegex,
        multiTerm: this.options.multiTerm
      });
    }

    async toggleHistoryMenu() {
      if (this.historyMenu.classList.contains('sf-open')) {
        this.closeHistoryMenu();
        return;
      }

      let history = [];
      if (typeof SpotlightConfig !== 'undefined') {
        const settings = await SpotlightConfig.getSettings();
        history = settings.searchHistory || [];
      }

      const listContainer = this.historyMenu.querySelector('.sf-history-list');
      listContainer.innerHTML = '';

      if (history.length === 0) {
        const emptyMsg = typeof SpotlightI18n !== 'undefined'
          ? SpotlightI18n.t('findBar.historyEmpty', this.currentLang)
          : 'No recent searches';
        listContainer.innerHTML = `<div class="sf-history-empty">${emptyMsg}</div>`;
      } else {
        history.forEach((query) => {
          const item = document.createElement('div');
          item.className = 'sf-history-item';
          item.textContent = query;
          item.addEventListener('click', () => {
            this.input.value = query;
            this.closeHistoryMenu();
            this.input.focus();
            this.triggerSearch();
          });
          listContainer.appendChild(item);
        });
      }

      this.historyMenu.classList.add('sf-open');
    }

    closeHistoryMenu() {
      if (this.historyMenu) {
        this.historyMenu.classList.remove('sf-open');
      }
    }

    /**
     * Update match counter badge & accessibility announcement
     */
    updateStatus({ current, total, capped, error }) {
      this.badge.classList.remove('sf-badge-error', 'sf-badge-has-matches', 'sf-badge-no-matches');

      const t = (key, ...args) => {
        if (typeof SpotlightI18n !== 'undefined' && SpotlightI18n.t) {
          return SpotlightI18n.t(key, this.currentLang, ...args);
        }
        return '';
      };

      if (error) {
        const errLabel = t('findBar.regexError') || 'Regex Error';
        this.badge.textContent = errLabel;
        this.badge.classList.add('sf-badge-error');
        this.badge.title = error;
        this.srLive.textContent = `${errLabel}: ${error}`;
        return;
      }

      this.badge.title = '';

      if (total === 0) {
        this.badge.textContent = '0 / 0';
        if (this.input && this.input.value && this.input.value.trim()) {
          this.badge.classList.add('sf-badge-no-matches');
        }
        this.srLive.textContent = t('findBar.noMatches') || 'No matches found';
        return;
      }

      this.badge.classList.add('sf-badge-has-matches');
      const curDisplay = current >= 0 ? current + 1 : 0;
      const totalDisplay = capped ? `${total}+` : `${total}`;

      this.badge.textContent = `${curDisplay} / ${totalDisplay}`;
      const statusText = typeof SpotlightI18n !== 'undefined'
        ? SpotlightI18n.t('findBar.matchStatus', this.currentLang, curDisplay, total, capped)
        : `Match ${curDisplay} of ${totalDisplay}`;
      this.srLive.textContent = statusText;
    }

    /**
     * Unified Obsidian Glass aesthetic is self-contained and permanent.
     * Preserved as a no-op for backward compatibility.
     */
    applyTheme() {}

    // ponytail: capture-phase window pointerdown/click handles light dismiss across shadow DOM boundary; upgrade to native popover when host elements support cross-root light dismiss cleanly.
    isEventInside(e) {
      if (e.composedPath) {
        const path = e.composedPath();
        if (path.includes(this.container)) return true;
        if (path.some((el) => el && el.classList && el.classList.contains('sf-minimap-canvas'))) return true;
      }
      return Boolean(this.container && e.target && this.container.contains(e.target));
    }

    onOutsidePointerDown(e) {
      if (!this.isOpen) return;
      if (this.isEventInside(e)) {
        this.pointerDownInside = true;
        return;
      }
      this.pointerDownInside = false;
      this.hide();
    }

    onOutsideClick(e) {
      if (!this.isOpen) return;
      if (this.pointerDownInside) {
        this.pointerDownInside = false;
        return;
      }
      if (this.isEventInside(e)) {
        return;
      }
      this.hide();
    }

    /**
     * Show search UI and capture preselected text
     */
    show(initialQuery = '', activeElement = null) {
      if (this.isOpen) {
        // If already open, select all input text
        this.input.focus();
        this.input.select();
        return;
      }

      this.isOpen = true;
      this.pointerDownInside = false;
      this.previousFocusedElement = activeElement || document.activeElement;

      this.container.classList.add('sf-active');

      window.addEventListener('pointerdown', this.onOutsidePointerDown, true);
      window.addEventListener('click', this.onOutsideClick, true);

      if (initialQuery) {
        this.input.value = initialQuery;
      }

      // Defer focus slightly to ensure smooth render
      requestAnimationFrame(() => {
        this.input.focus();
        this.input.select();
        if (this.input.value) {
          this.triggerSearch();
        }
      });
    }

    /**
     * Hide search UI and restore previous focus
     */
    hide() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.pointerDownInside = false;

      window.removeEventListener('pointerdown', this.onOutsidePointerDown, true);
      window.removeEventListener('click', this.onOutsideClick, true);

      this.closeHistoryMenu();

      this.container.classList.remove('sf-active');
      this.callbacks.onClose();

      if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
        try {
          this.previousFocusedElement.focus();
        } catch {}
      }
      this.previousFocusedElement = null;
    }

    destroy() {
      this.hide();
      if (this.container && this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }
  }

  return SpotlightSearchUI;
});

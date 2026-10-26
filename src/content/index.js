/**
 * Darkroom Find - Main Content Script Orchestrator
 * Intercepts shortcuts, coordinates Shadow DOM, Search Engine, and Spotlight Renderer.
 */

(async function () {
  'use strict';

  // Prevent multiple initializations in the same frame
  if (window.__spotlightFindInitialized) return;
  window.__spotlightFindInitialized = true;

  let settings = typeof SpotlightConfig !== 'undefined'
    ? await SpotlightConfig.getSettings()
    : {
        dimOpacity: 0.85,
        glowColor: '#E3C77A',
        currentGlowColor: '#E8956B',
        maxHighlights: 5000,
        excludedDomains: ['docs.google.com', 'vscode.dev'],
        searchHistory: [],
        lastQuery: '',
        matchCase: false,
        wholeWord: false,
        useRegex: false,
        multiTerm: false
      };

  let isHostExcluded = false;
  if (typeof SpotlightConfig !== 'undefined') {
    isHostExcluded = SpotlightConfig.isHostExcluded(location.hostname, settings.excludedDomains);
  }

  // Create isolated Shadow DOM host
  const hostElement = document.createElement('div');
  hostElement.id = 'spotlight-find-host';
  hostElement.style.cssText = 'all: initial; position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; overflow: visible !important; z-index: 2147483647 !important; pointer-events: none !important; direction: ltr !important;';
  // Across the Shadow DOM boundary, composed keyboard events and document.activeElement are
  // retargeted to this host <div>. Page hotkey handlers see event.target = this element and,
  // because it is a plain DIV, decide the user is NOT typing in a field — so they trigger
  // their own shortcuts (e.g. GitHub command bar) over our UI. Marking the host contenteditable
  // makes their "is the user typing?" guards (isContentEditable / closest('[contenteditable]'))
  // pass, as defense-in-depth on top of stopPropagation() in search-ui.js. tabindex="-1" keeps
  // it out of keyboard tab order (the host is pointer-events: none, zero-sized, and never focused).
  hostElement.setAttribute('contenteditable', 'true');
  hostElement.setAttribute('tabindex', '-1');
  (document.body || document.documentElement).appendChild(hostElement);

  const shadowRoot = hostElement.attachShadow({ mode: 'open' });

  // Load Vazirmatn at the document level so it is available inside the Shadow DOM.
  if (!document.getElementById('spotlight-find-font')) {
    const fontStyle = document.createElement('style');
    fontStyle.id = 'spotlight-find-font';
    fontStyle.textContent = `
      @font-face {
        font-family: 'Vazirmatn';
        src: url('${chrome.runtime.getURL('fonts/Vazirmatn-Medium.woff2')}') format('woff2');
        font-weight: 100 900;
        font-style: normal;
        font-display: swap;
      }
    `;
    (document.head || document.documentElement).appendChild(fontStyle);
  }

  // Inject search-ui.css into Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('src/content/search-ui.css');
  shadowRoot.appendChild(styleLink);

  // Instantiate Spotlight Renderer with minimal calm aesthetic
  const renderer = new SpotlightRenderer(shadowRoot, {
    glowColor: settings.glowColor,
    currentGlowColor: settings.currentGlowColor,
    dimOpacity: typeof settings.dimOpacity === 'number' ? settings.dimOpacity : 0.85,
    dimRgb: '11, 12, 14'
  });

  // State management
  let currentMatches = [];
  let currentMatchIndex = -1;
  let activeSearchAbortController = null;
  let lastShortcutPressTime = 0;
  let bypassNativeUntil = 0;

  // Instantiate Search UI
  const searchUI = new SpotlightSearchUI(shadowRoot, {
    language: settings.language || 'en',
    matchCase: settings.matchCase,
    wholeWord: settings.wholeWord,
    useRegex: settings.useRegex,
    multiTerm: settings.multiTerm,

    onSearch: async (query, options) => {
      // Abort previous search if still running
      if (activeSearchAbortController) {
        activeSearchAbortController.abort();
      }
      activeSearchAbortController = new AbortController();

      const result = await SpotlightSearchEngine.search(
        query,
        {
          ...options,
          maxHighlights: settings.maxHighlights
        },
        activeSearchAbortController.signal
      );

      if (result.aborted) return;

      currentMatches = result.matches || [];
      currentMatchIndex = currentMatches.length > 0 ? 0 : -1;

      // Update renderer & status UI
      renderer.updateMatches(currentMatches, currentMatchIndex);
      if (currentMatchIndex >= 0) {
        renderer.scrollToMatch(currentMatchIndex);
      }

      searchUI.updateStatus({
        current: currentMatchIndex,
        total: result.totalFound,
        capped: result.capped,
        error: result.error
      });

      // Save valid non-empty query to history
      if (query && query.trim() && !result.error && typeof SpotlightConfig !== 'undefined') {
        SpotlightConfig.addSearchHistory(query);
      }
    },

    onNext: () => {
      if (currentMatches.length === 0) return;
      currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
      renderer.setCurrentIndex(currentMatchIndex, true);
      searchUI.updateStatus({
        current: currentMatchIndex,
        total: currentMatches.length,
        capped: false,
        error: null
      });
    },

    onPrev: () => {
      if (currentMatches.length === 0) return;
      currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
      renderer.setCurrentIndex(currentMatchIndex, true);
      searchUI.updateStatus({
        current: currentMatchIndex,
        total: currentMatches.length,
        capped: false,
        error: null
      });
    },

    onClose: () => {
      renderer.hide();
    },

    onToggleOption: (optionKey, value) => {
      settings[optionKey] = value;
      if (typeof SpotlightConfig !== 'undefined') {
        SpotlightConfig.saveSettings({ [optionKey]: value });
      }
    },

    onBypassNative: () => {
      searchUI.hide();
      renderer.hide();
      bypassNativeUntil = Date.now() + 2000;
      // Guide user to press Ctrl+F for native find
    }
  });

  /**
   * Open Darkroom Find session
   */
  function openSpotlight() {
    if (isHostExcluded) return;

    // Check selected text on the page
    let queryToUse = '';
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      queryToUse = selection.toString().trim();
    } else if (settings.lastQuery) {
      queryToUse = settings.lastQuery;
    }

    renderer.show();
    searchUI.show(queryToUse, document.activeElement);
  }

  /**
   * Close Darkroom Find session
   */
  function closeSpotlight() {
    searchUI.hide();
    renderer.hide();
  }

  /**
   * Toggle Darkroom Find session
   */
  function toggleSpotlight() {
    if (searchUI.isOpen) {
      closeSpotlight();
    } else {
      openSpotlight();
    }
  }

  /**
   * Handle global shortcut interception (Ctrl+F / Cmd+F)
   */
  window.addEventListener(
    'keydown',
    (e) => {
      const isFindShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F');
      if (!isFindShortcut) return;

      // Check temporary native find bypass
      if (Date.now() < bypassNativeUntil) {
        return;
      }

      // Check per-site exclusion
      if (isHostExcluded) {
        return;
      }

      const now = Date.now();
      // Double Ctrl+F within 400ms passes through to native find
      if (searchUI.isOpen && now - lastShortcutPressTime < 400) {
        closeSpotlight();
        bypassNativeUntil = now + 1500;
        return;
      }

      lastShortcutPressTime = now;

      // Intercept Ctrl+F and launch Darkroom Find
      e.preventDefault();
      e.stopPropagation();

      openSpotlight();
    },
    true // Capture phase
  );

  // Sync settings when modified from options page or popup
  if (typeof SpotlightConfig !== 'undefined') {
    SpotlightConfig.onSettingsChanged((changes) => {
      settings = { ...settings, ...changes };

      if ('excludedDomains' in changes) {
        isHostExcluded = SpotlightConfig.isHostExcluded(location.hostname, settings.excludedDomains);
      }

      if ('language' in changes) {
        searchUI.setLanguage(changes.language);
      }

      renderer.updateConfig({
        glowColor: settings.glowColor,
        currentGlowColor: settings.currentGlowColor,
        dimOpacity: typeof settings.dimOpacity === 'number' ? settings.dimOpacity : 0.85,
        dimRgb: '11, 12, 14'
      });
    });
  }

  // Listen to messages from background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    if (message.type === 'TOGGLE_SPOTLIGHT') {
      toggleSpotlight();
      sendResponse({ success: true, isOpen: searchUI.isOpen });
    } else if (message.type === 'EXCLUSION_CHANGED') {
      if (message.hostname && location.hostname.toLowerCase().includes(message.hostname.toLowerCase())) {
        isHostExcluded = message.isExcluded;
        if (isHostExcluded && searchUI.isOpen) {
          closeSpotlight();
        }
      }
      sendResponse({ success: true });
    }
  });
})();

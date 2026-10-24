/**
 * Darkroom Find - Shared Configuration & Storage Layer
 * Universal Obsidian Glass aesthetic, unified dim opacity, per-site exclusions.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotlightConfig = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PRESET_COLORS = {
    cyan: '#00f0ff',
    green: '#39ff14',
    amber: '#ffb703',
    violet: '#b5179e',
    pink: '#ff007f',
    blue: '#00a8ff'
  };

  /**
   * Universal Obsidian Glass / Darkroom aesthetic palette.
   * Cinematic neutral backdrop with luminous borders and phosphorescent neon accents.
   */
  const OBSIDIAN_PALETTE = {
    dimRgb: '5, 7, 15',
    dimOpacityDefault: 0.85,
    cardBg: 'rgba(10, 14, 24, 0.88)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    cardText: '#f8fafc',
    cardTextMuted: '#94a3b8',
    inputBg: 'rgba(20, 27, 44, 0.85)',
    inputBorder: 'rgba(255, 255, 255, 0.14)',
    btnHover: 'rgba(255, 255, 255, 0.1)',
    activeBtnBg: 'rgba(0, 240, 255, 0.2)',
    activeBtnBorder: 'rgba(0, 240, 255, 0.6)'
  };

  const DEFAULT_SETTINGS = {
    dimOpacity: 0.85, // Single unified dim opacity (0.30 - 0.95)
    glowColor: '#00f0ff', // Match glow color
    currentGlowColor: '#ff007f', // Active match accent glow
    maxHighlights: 5000, // Max matches cap
    excludedDomains: [
      'docs.google.com',
      'vscode.dev',
      'github.dev',
      'colab.research.google.com'
    ],
    searchHistory: [], // Last 10 queries
    lastQuery: '',
    matchCase: false,
    wholeWord: false,
    useRegex: false,
    multiTerm: false,
    bypassNativeFind: false
  };

  /**
   * Safe check for chrome storage API availability
   */
  function hasStorageApi() {
    try {
      return (
        typeof chrome !== 'undefined' &&
        Boolean(chrome.storage && chrome.storage.sync)
      );
    } catch {
      return false;
    }
  }

  /**
   * Fallback in-memory storage for invalidated contexts
   */
  let memoryCache = { ...DEFAULT_SETTINGS };

  /**
   * Normalize and migrate legacy settings
   */
  function normalizeSettings(raw) {
    const result = { ...raw };
    if (typeof result.dimOpacity !== 'number') {
      if (typeof result.dimOpacityDark === 'number') {
        result.dimOpacity = result.dimOpacityDark;
      } else {
        result.dimOpacity = DEFAULT_SETTINGS.dimOpacity;
      }
    }
    delete result.themeMode;
    delete result.dimOpacityDark;
    delete result.dimOpacityLight;
    return result;
  }

  /**
   * Load settings from chrome.storage.sync with local & memory fallback
   * @returns {Promise<typeof DEFAULT_SETTINGS>}
   */
  async function getSettings() {
    if (!hasStorageApi()) {
      return { ...memoryCache };
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            // Fallback to local if sync fails or exceeds quota
            chrome.storage.local.get(DEFAULT_SETTINGS, (localItems) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve({ ...memoryCache });
              } else {
                memoryCache = normalizeSettings({ ...DEFAULT_SETTINGS, ...localItems });
                resolve(memoryCache);
              }
            });
          } else {
            memoryCache = normalizeSettings({ ...DEFAULT_SETTINGS, ...items });
            resolve(memoryCache);
          }
        });
      } catch {
        resolve({ ...memoryCache });
      }
    });
  }

  /**
   * Save partial or full settings
   * @param {Partial<typeof DEFAULT_SETTINGS>} patch
   * @returns {Promise<typeof DEFAULT_SETTINGS>}
   */
  async function saveSettings(patch) {
    memoryCache = { ...memoryCache, ...patch };

    if (!hasStorageApi()) {
      return memoryCache;
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set(patch, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            chrome.storage.local.set(patch, () => {
              resolve(memoryCache);
            });
          } else {
            resolve(memoryCache);
          }
        });
      } catch {
        resolve(memoryCache);
      }
    });
  }

  /**
   * Check if a hostname is in the exclusion list
   * Supports exact match and subdomain matching (e.g. sub.docs.google.com matches docs.google.com)
   * @param {string} hostname
   * @param {string[]} [customList]
   * @returns {boolean}
   */
  function isHostExcluded(hostname, customList) {
    if (!hostname) return false;
    const cleanHost = hostname.toLowerCase().trim();
    const list = Array.isArray(customList)
      ? customList
      : memoryCache.excludedDomains;

    return list.some((domain) => {
      const cleanDomain = domain.toLowerCase().trim();
      return (
        cleanHost === cleanDomain || cleanHost.endsWith('.' + cleanDomain)
      );
    });
  }

  /**
   * Toggle exclusion status for a given hostname
   * @param {string} hostname
   * @returns {Promise<boolean>} new exclusion status
   */
  async function toggleHostExclusion(hostname) {
    if (!hostname) return false;
    const cleanHost = hostname.toLowerCase().trim();
    const settings = await getSettings();
    const list = [...(settings.excludedDomains || [])];
    const index = list.findIndex(
      (d) => d.toLowerCase().trim() === cleanHost
    );

    let isExcludedNow = false;
    if (index >= 0) {
      list.splice(index, 1);
      isExcludedNow = false;
    } else {
      list.push(cleanHost);
      isExcludedNow = true;
    }

    await saveSettings({ excludedDomains: list });
    return isExcludedNow;
  }

  /**
   * Add query to search history (max 10 items, deduplicated)
   * @param {string} query
   * @returns {Promise<string[]>}
   */
  async function addSearchHistory(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return memoryCache.searchHistory || [];

    const settings = await getSettings();
    const history = (settings.searchHistory || []).filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase()
    );
    history.unshift(trimmed);
    const updated = history.slice(0, 10);

    await saveSettings({ searchHistory: updated, lastQuery: trimmed });
    return updated;
  }

  /**
   * Listen for real-time setting updates across tabs & popup
   * @param {function(object):void} callback
   * @returns {function():void} unsubscribe function
   */
  function onSettingsChanged(callback) {
    if (
      typeof chrome === 'undefined' ||
      !chrome.storage ||
      !chrome.storage.onChanged
    ) {
      return () => {};
    }

    const listener = (changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        const changedSettings = {};
        for (const [key, { newValue }] of Object.entries(changes)) {
          changedSettings[key] = newValue;
          memoryCache[key] = newValue;
        }
        callback(changedSettings);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  return {
    PRESET_COLORS,
    OBSIDIAN_PALETTE,
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    isHostExcluded,
    toggleHostExclusion,
    addSearchHistory,
    onSettingsChanged
  };
});

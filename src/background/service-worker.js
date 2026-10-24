/**
 * Darkroom Find - Background Service Worker
 * Handles extension lifecycle, command shortcuts, tab coordination, and badge indicators.
 */

try {
  importScripts('../common/config.js');
} catch (err) {
  console.warn('[Darkroom Find] Failed to importScripts config.js:', err);
}

/**
 * Seed default settings on initial install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      const current = await chrome.storage.sync.get(null);
      const defaults = (typeof SpotlightConfig !== 'undefined' && SpotlightConfig.DEFAULT_SETTINGS) || {
        dimOpacity: 0.85,
        glowColor: '#00f0ff',
        currentGlowColor: '#ff007f',
        maxHighlights: 5000,
        excludedDomains: ['docs.google.com', 'vscode.dev', 'github.dev', 'colab.research.google.com'],
        searchHistory: [],
        lastQuery: '',
        matchCase: false,
        wholeWord: false,
        useRegex: false,
        multiTerm: false,
        bypassNativeFind: false
      };

      const toSave = {};
      for (const [key, val] of Object.entries(defaults)) {
        if (!(key in current)) {
          toSave[key] = val;
        }
      }

      if (Object.keys(toSave).length > 0) {
        await chrome.storage.sync.set(toSave);
      }
    } catch (e) {
      console.error('[Darkroom Find] Error seeding default settings:', e);
    }
  }
});

/**
 * Handle browser keyboard commands (e.g., Alt+Shift+F secondary shortcut)
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-spotlight') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SPOTLIGHT', source: 'command' });
    } catch (err) {
      // Tab may not have content script injected yet or is a protected page
      console.warn('[Darkroom Find] Could not send command to tab:', err.message);
    }
  }
});

/**
 * Update badge state for a given tab depending on its exclusion status
 */
async function updateTabBadge(tabId, url) {
  if (!tabId || !url) return;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return;

    let excluded = false;
    if (typeof SpotlightConfig !== 'undefined') {
      const settings = await SpotlightConfig.getSettings();
      excluded = SpotlightConfig.isHostExcluded(parsed.hostname, settings.excludedDomains);
    } else {
      const data = await chrome.storage.sync.get(['excludedDomains']);
      const list = data.excludedDomains || [];
      const host = parsed.hostname.toLowerCase();
      excluded = list.some(d => host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()));
    }

    if (excluded) {
      chrome.action.setBadgeText({ text: 'OFF', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#475569', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    // Ignore invalid URLs (about:blank, data:, etc.)
  }
}

// Update badge when user changes active tab
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url) {
      await updateTabBadge(tabId, tab.url);
    }
  } catch {
    // Tab might have closed
  }
});

// Update badge on navigation/URL change
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
    updateTabBadge(tabId, tab.url);
  }
});

/**
 * Message router between popup, options, and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    try {
      switch (message.type) {
        case 'GET_CURRENT_TAB': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            sendResponse({ success: false, error: 'No active tab' });
            return;
          }
          let hostname = '';
          try {
            hostname = new URL(tab.url).hostname;
          } catch {}
          sendResponse({ success: true, tabId: tab.id, url: tab.url, hostname });
          break;
        }

        case 'TOGGLE_EXCLUSION': {
          const host = (message.hostname || '').trim();
          if (!host) {
            sendResponse({ success: false, error: 'No hostname provided' });
            return;
          }
          let newStatus = false;
          if (typeof SpotlightConfig !== 'undefined') {
            newStatus = await SpotlightConfig.toggleHostExclusion(host);
          } else {
            const data = await chrome.storage.sync.get(['excludedDomains']);
            const list = [...(data.excludedDomains || [])];
            const idx = list.findIndex(d => d.toLowerCase() === host.toLowerCase());
            if (idx >= 0) {
              list.splice(idx, 1);
              newStatus = false;
            } else {
              list.push(host);
              newStatus = true;
            }
            await chrome.storage.sync.set({ excludedDomains: list });
          }

          // Refresh badge on current tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            await updateTabBadge(tab.id, tab.url);
            // Notify active tab content script
            try {
              chrome.tabs.sendMessage(tab.id, {
                type: 'EXCLUSION_CHANGED',
                hostname: host,
                isExcluded: newStatus
              });
            } catch {}
          }

          sendResponse({ success: true, isExcluded: newStatus });
          break;
        }

        case 'CHECK_EXCLUSION': {
          const host = (message.hostname || '').trim();
          let isExcluded = false;
          if (typeof SpotlightConfig !== 'undefined') {
            const settings = await SpotlightConfig.getSettings();
            isExcluded = SpotlightConfig.isHostExcluded(host, settings.excludedDomains);
          }
          sendResponse({ success: true, isExcluded });
          break;
        }

        case 'UPDATE_BADGE': {
          if (sender && sender.tab && sender.tab.id) {
            await updateTabBadge(sender.tab.id, sender.tab.url);
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          break;
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});

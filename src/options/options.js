/**
 * Darkroom Find - Options & Popup Controller
 * Manages configuration controls, live preview, tab exclusion toggle,
 * OS-specific shortcut hero detection, and storage sync.
 */

document.addEventListener('DOMContentLoaded', async () => {
  let settings = await SpotlightConfig.getSettings();
  let currentTab = null;

  // Query DOM elements
  const primaryModKey = document.getElementById('primaryModKey');
  const primaryMainKey = document.getElementById('primaryMainKey');
  const secKey1 = document.getElementById('secKey1');
  const secKey2 = document.getElementById('secKey2');
  const secKey3 = document.getElementById('secKey3');

  const dimOpacityInput = document.getElementById('dimOpacity');
  const dimOpacityVal = document.getElementById('dimOpacityVal');
  const glowColorInput = document.getElementById('glowColorInput');
  const glowColorHex = document.getElementById('glowColorHex');
  const currentGlowInput = document.getElementById('currentGlowInput');
  const currentGlowHex = document.getElementById('currentGlowHex');
  const maxHighlightsInput = document.getElementById('maxHighlights');
  const maxHighlightsVal = document.getElementById('maxHighlightsVal');
  const domainList = document.getElementById('domainList');
  const newDomainInput = document.getElementById('newDomainInput');
  const addDomainBtn = document.getElementById('addDomainBtn');
  const resetBtn = document.getElementById('resetBtn');
  const saveIndicator = document.getElementById('saveIndicator');

  // Preview elements
  const previewBox = document.getElementById('previewBox');
  const prevMatch = document.getElementById('prevMatch');
  const prevCurrent = document.getElementById('prevCurrent');

  // Site toggle card
  const siteToggleCard = document.getElementById('siteToggleCard');
  const siteHostLabel = document.getElementById('siteHostLabel');
  const siteDescLabel = document.getElementById('siteDescLabel');
  const siteStatusDot = document.getElementById('siteStatusDot');
  const siteToggleBtn = document.getElementById('siteToggleBtn');

  let saveTimeout = null;
  function showSaved() {
    clearTimeout(saveTimeout);
    saveIndicator.classList.add('visible');
    saveTimeout = setTimeout(() => {
      saveIndicator.classList.remove('visible');
    }, 1500);
  }

  /**
   * Detect User OS and render customized keyboard shortcut badges
   */
  function setupShortcutHero() {
    let isMac = false;
    try {
      if (typeof navigator !== 'undefined') {
        const platform = (navigator.userAgentData && navigator.userAgentData.platform) ||
                         navigator.platform ||
                         navigator.userAgent ||
                         '';
        isMac = /Mac/i.test(platform);
      }
    } catch {
      isMac = false;
    }

    if (isMac) {
      // macOS: ⌘ + F and ⌥ + ⇧ + F
      primaryModKey.textContent = '⌘';
      primaryModKey.title = 'Command';
      primaryMainKey.textContent = 'F';

      secKey1.textContent = '⌥';
      secKey1.title = 'Option';
      secKey2.textContent = '⇧';
      secKey2.title = 'Shift';
      secKey3.textContent = 'F';
    } else {
      // Windows / Linux: Ctrl + F and Alt + Shift + F
      primaryModKey.textContent = 'Ctrl';
      primaryMainKey.textContent = 'F';

      secKey1.textContent = 'Alt';
      secKey2.textContent = 'Shift';
      secKey3.textContent = 'F';
    }
  }

  /**
   * Helper to convert hex color to rgba string
   */
  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(227, 199, 122, ${alpha})`;
    let clean = String(hex).replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return `rgba(227, 199, 122, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Sync active outline rings on swatches
   */
  function syncActiveSwatches() {
    const currentGlow = (glowColorInput.value || '').toLowerCase();
    const currentActiveGlow = (currentGlowInput.value || '').toLowerCase();

    document.querySelectorAll('#glowSwatches .sf-swatch').forEach((swatch) => {
      const c = (swatch.dataset.color || '').toLowerCase();
      if (c === currentGlow) {
        swatch.classList.add('sf-swatch-active');
      } else {
        swatch.classList.remove('sf-swatch-active');
      }
    });

    document.querySelectorAll('#currentSwatches .sf-swatch').forEach((swatch) => {
      const c = (swatch.dataset.color || '').toLowerCase();
      if (c === currentActiveGlow) {
        swatch.classList.add('sf-swatch-active');
      } else {
        swatch.classList.remove('sf-swatch-active');
      }
    });
  }

  /**
   * Update live preview styles according to current values
   */
  function updateLivePreview() {
    const opacity = (typeof settings.dimOpacity === 'number' ? settings.dimOpacity : 0.85);
    const rgb = '11, 12, 14'; // Neutral near-black dim layer
    previewBox.style.backgroundColor = `rgba(${rgb}, ${opacity})`;

    const matchColor = glowColorInput.value || '#E3C77A';
    const activeColor = currentGlowInput.value || '#E8956B';

    prevMatch.style.backgroundColor = hexToRgba(matchColor, 0.40);
    prevMatch.style.boxShadow = 'none';

    prevCurrent.style.backgroundColor = activeColor;
    prevCurrent.style.color = '#1A1410';
    prevCurrent.style.boxShadow = 'none';

    syncActiveSwatches();
  }

  /**
   * Render excluded domains list
   */
  function renderDomainList() {
    domainList.innerHTML = '';
    const domains = settings.excludedDomains || [];

    if (domains.length === 0) {
      domainList.innerHTML = '<div style="color:var(--text-hint);font-size:11px;padding:4px;">No excluded websites</div>';
      return;
    }

    domains.forEach((domain) => {
      const row = document.createElement('div');
      row.className = 'sf-domain-item';

      const label = document.createElement('span');
      label.textContent = domain;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'sf-domain-item-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove exclusion';
      removeBtn.addEventListener('click', async () => {
        const updated = domains.filter((d) => d.toLowerCase() !== domain.toLowerCase());
        settings = await SpotlightConfig.saveSettings({ excludedDomains: updated });
        renderDomainList();
        updateSiteToggleCard();
        showSaved();
      });

      row.appendChild(label);
      row.appendChild(removeBtn);
      domainList.appendChild(row);
    });
  }

  /**
   * Check and update the active tab quick toggle card
   */
  async function updateSiteToggleCard() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' }, resolve);
      });

      if (!response || !response.success || !response.hostname) {
        siteToggleCard.style.display = 'none';
        return;
      }

      currentTab = response;
      const host = response.hostname;
      siteHostLabel.textContent = host;

      const isExcluded = SpotlightConfig.isHostExcluded(host, settings.excludedDomains);
      if (isExcluded) {
        siteStatusDot.className = 'sf-site-status-dot disabled';
        siteDescLabel.textContent = 'Darkroom Disabled on this site';
        siteToggleBtn.textContent = 'Enable';
      } else {
        siteStatusDot.className = 'sf-site-status-dot';
        siteDescLabel.textContent = 'Darkroom Active on this site';
        siteToggleBtn.textContent = 'Disable';
      }
    } catch {
      siteToggleCard.style.display = 'none';
    }
  }

  siteToggleBtn.addEventListener('click', async () => {
    if (!currentTab || !currentTab.hostname) return;
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'TOGGLE_EXCLUSION', hostname: currentTab.hostname },
        resolve
      );
    });

    if (response && response.success) {
      settings = await SpotlightConfig.getSettings();
      renderDomainList();
      updateSiteToggleCard();
      showSaved();
    }
  });

  /**
   * Populate inputs from saved settings
   */
  function populateForm() {
    // Dim opacity slider
    const dimVal = typeof settings.dimOpacity === 'number' ? settings.dimOpacity : 0.85;
    const dimPct = Math.round(dimVal * 100);
    dimOpacityInput.value = dimPct;
    dimOpacityVal.textContent = `${dimPct}%`;

    // Glow colors
    glowColorInput.value = settings.glowColor || '#E3C77A';
    glowColorHex.textContent = glowColorInput.value;

    currentGlowInput.value = settings.currentGlowColor || '#E8956B';
    currentGlowHex.textContent = currentGlowInput.value;

    // Max highlights
    maxHighlightsInput.value = settings.maxHighlights || 5000;
    maxHighlightsVal.textContent = Number(maxHighlightsInput.value).toLocaleString();

    renderDomainList();
    updateLivePreview();
  }

  // Dim Slider Listener
  dimOpacityInput.addEventListener('input', async () => {
    const val = parseInt(dimOpacityInput.value, 10);
    dimOpacityVal.textContent = `${val}%`;
    const opacity = val / 100;
    settings.dimOpacity = opacity;
    await SpotlightConfig.saveSettings({ dimOpacity: opacity });
    updateLivePreview();
    showSaved();
  });

  // Color inputs
  glowColorInput.addEventListener('input', async () => {
    glowColorHex.textContent = glowColorInput.value;
    settings.glowColor = glowColorInput.value;
    await SpotlightConfig.saveSettings({ glowColor: glowColorInput.value });
    updateLivePreview();
    showSaved();
  });

  currentGlowInput.addEventListener('input', async () => {
    currentGlowHex.textContent = currentGlowInput.value;
    settings.currentGlowColor = currentGlowInput.value;
    await SpotlightConfig.saveSettings({ currentGlowColor: currentGlowInput.value });
    updateLivePreview();
    showSaved();
  });

  // Swatches clicks
  document.getElementById('glowSwatches').addEventListener('click', async (e) => {
    const swatch = e.target.closest('.sf-swatch');
    if (!swatch) return;
    const color = swatch.dataset.color;
    glowColorInput.value = color;
    glowColorHex.textContent = color;
    settings.glowColor = color;
    await SpotlightConfig.saveSettings({ glowColor: color });
    updateLivePreview();
    showSaved();
  });

  document.getElementById('currentSwatches').addEventListener('click', async (e) => {
    const swatch = e.target.closest('.sf-swatch');
    if (!swatch) return;
    const color = swatch.dataset.color;
    currentGlowInput.value = color;
    currentGlowHex.textContent = color;
    settings.currentGlowColor = color;
    await SpotlightConfig.saveSettings({ currentGlowColor: color });
    updateLivePreview();
    showSaved();
  });

  // Max Highlights Cap
  maxHighlightsInput.addEventListener('input', async () => {
    const val = parseInt(maxHighlightsInput.value, 10);
    maxHighlightsVal.textContent = val.toLocaleString();
    settings.maxHighlights = val;
    await SpotlightConfig.saveSettings({ maxHighlights: val });
    showSaved();
  });

  // Add Excluded Domain
  async function addDomain() {
    const domain = (newDomainInput.value || '').trim().toLowerCase();
    if (!domain) return;

    const list = [...(settings.excludedDomains || [])];
    if (!list.includes(domain)) {
      list.push(domain);
      settings = await SpotlightConfig.saveSettings({ excludedDomains: list });
      newDomainInput.value = '';
      renderDomainList();
      updateSiteToggleCard();
      showSaved();
    }
  }

  addDomainBtn.addEventListener('click', addDomain);
  newDomainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDomain();
    }
  });

  // Reset to Defaults
  resetBtn.addEventListener('click', async () => {
    if (confirm('Reset all settings to default values?')) {
      settings = await SpotlightConfig.saveSettings(SpotlightConfig.DEFAULT_SETTINGS);
      populateForm();
      updateSiteToggleCard();
      showSaved();
    }
  });

  // Initialize
  setupShortcutHero();
  populateForm();
  updateSiteToggleCard();
});

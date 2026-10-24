# Darkroom Find — Manual QA Verification Checklist

This document provides a reproducible, step-by-step verification suite for testing **Darkroom Find** across core use cases, edge cases, and Chromium platform behaviors.

---

## 📋 Test Matrix Summary

| Category | Target Scenarios | Priority |
| :--- | :--- | :--- |
| **Category 1** | Universal Obsidian Glass & Browser Theme Independence | High |
| **Category 2** | Stress & High-Load Pages (10,000+ Matches) | High |
| **Category 3** | Typography & RTL/Unicode Accuracy (Inter & Vazirmatn) | High |
| **Category 4** | Dynamic DOM & SPA Hydration (React, Vue, Svelte) | Critical |
| **Category 5** | Split Inline Tags, Shadow DOM & Iframes | High |
| **Category 6** | Shortcut Conflicts, Native Find Bypass & Site Exclusions | Critical |
| **Category 7** | Extension Popup & OS-Specific Shortcut Hero | High |

---

## 🧪 Category 1: Universal Obsidian Glass & Browser Theme Independence

### Test Case 1.1: Neutral Cinematic Obsidian Glass Aesthetic
- **Steps**:
  1. Open Chrome on any webpage with a light background (e.g. Wikipedia).
  2. Press `Ctrl+F` (`Cmd+F` on macOS) to open Darkroom Find.
  3. Verify the floating search pill displays the deep translucent Obsidian Glass aesthetic (`backdrop-filter: blur(18px)`, luminous subtle border, phosphorescent accents).
  4. Verify the viewport dimming overlay (`rgba(5, 7, 15, 0.85)`) smoothly dims the host webpage into a cinematic darkroom.
  5. Repeat test on a dark webpage (e.g. GitHub dark mode, Reddit dark theme) and on a custom Chrome browser theme (tinted window frames).
- **Expected Result**:
  - The UI remains completely neutral, self-contained, and visually stunning regardless of Chrome's browser theme or the host webpage background color.
  - No internal "Light/Dark" toggle exists in Options; the design is universally unified.

### Test Case 1.2: Dim Layer Opacity Customization
- **Steps**:
  1. Open Options popup by clicking the extension toolbar icon.
  2. Adjust the single **Darkroom Dim Intensity** slider from `85%` down to `50%` or up to `95%`.
  3. Return to any webpage and press `Ctrl+F`.
- **Expected Result**:
  - The canvas cutout overlay immediately renders with the newly configured opacity in real time.
  - Live preview box in the popup reflects the exact opacity change simultaneously.

---

## 🧪 Category 2: Stress & High-Load Pages (10,000+ Matches)

### Test Case 2.1: Massive Page Chunked Scanning & Match Cap
- **Steps**:
  1. Open a dense document (e.g., HTML specification, large log file, or Wikipedia's [List of sovereign states](https://en.wikipedia.org/wiki/List_of_sovereign_states)).
  2. Search for a single common character like `e` or `a` (thousands of occurrences).
  3. Observe input responsiveness and match counter.
- **Expected Result**:
  - Input field does not freeze or drop keystrokes (scanning yields execution every ~12ms).
  - Search counter displays `1 / 5000+` once the 5,000 max match cap is reached.
  - Page scrolling remains fluid at ~60fps without lag.

### Test Case 2.2: Rapid Keystroke Invalidation
- **Steps**:
  1. Type `the` quickly, immediately backspace, and type `search`.
- **Expected Result**:
  - In-progress scan for `the` cancels cleanly via cancellation token; only results for `search` render.

---

## 🧪 Category 3: Typography & RTL/Unicode Accuracy

### Test Case 3.1: Persian & Arabic Typography Rendering (Vazirmatn)
- **Steps**:
  1. Open a Persian or Arabic webpage (e.g., [fa.wikipedia.org](https://fa.wikipedia.org) or BBC Persian).
  2. Press `Ctrl+F` to open Darkroom Find.
  3. Type Persian text into the search input (e.g. `هوش مصنوعی`).
  4. Inspect the input font and overall UI font rendering.
- **Expected Result**:
  - The text renders cleanly with the **Vazirmatn** font stack, crisp baseline alignment, and proper Persian glyph ligatures.
  - Subpixel antialiasing (`-webkit-font-smoothing: antialiased`) ensures sharp, clean edges without blurriness.
  - Mixed English and Persian text in queries (e.g. `React هوش`) displays seamlessly with correct glyph assignment and `dir="auto"` alignment.

### Test Case 3.2: Persian & Arabic Whole Word Boundary Detection
- **Steps**:
  1. Open a Persian or Arabic webpage (e.g., [fa.wikipedia.org](https://fa.wikipedia.org)).
  2. Search for the word `نور` (light) with **Whole Word (`[ab]`)** enabled.
- **Expected Result**:
  - Matches the exact word `نور` in phrases like `این نور زیباست`.
  - Does NOT match substring in compound words like `نورانی` or `پرنور`.
  - Search input automatically switches to right-to-left alignment (`dir="auto"`).

### Test Case 3.3: Emojis and Complex Characters
- **Steps**:
  1. Search for emoji sequences (e.g., `🔍`, `✨`, or `👩‍💻`).
- **Expected Result**:
  - Highlights the multi-byte emoji correctly without misaligning start/end offsets.

---

## 🧪 Category 4: Dynamic DOM & SPA Hydration

### Test Case 4.1: React / Vue SPA DOM Integrity
- **Steps**:
  1. Open a modern React web app (e.g., Twitter/X, GitHub issues, or Notion web).
  2. Press `Ctrl+F` and search for words visible in dynamic UI components.
  3. Click buttons or tabs inside the host app while search is open.
- **Expected Result**:
  - The host app never crashes with React error `#418` / `#423` (Hydration failure) because zero `<mark>` elements were injected into the page DOM.
  - Native `CSS.highlights` and canvas overlay keep all host event listeners intact.

### Test Case 4.2: Page Layout Shifts & Scrolling
- **Steps**:
  1. Search for a term and scroll rapidly down and up.
- **Expected Result**:
  - Canvas cutout windows remain locked to matching words during scroll without jitter or drift.

---

## 🧪 Category 5: Split Inline Tags, Shadow DOM & Iframes

### Test Case 5.1: Matches Split Across Inline Elements
- **Steps**:
  1. Test against HTML containing split formatting tags:
     ```html
     <p>Welcome to <span>spot</span><b>light</b> find!</p>
     ```
  2. Search for `spotlight`.
- **Expected Result**:
  - The unified virtual block engine detects `spotlight` across the boundary and creates a seamless DOM `Range` covering both nodes.

### Test Case 5.2: Open Shadow DOM & Same-Origin Iframes
- **Steps**:
  1. Open a page using Web Components with open shadow roots (e.g., [shoelace.style](https://shoelace.style) or MDN web components examples).
  2. Search for text inside the custom component.
- **Expected Result**:
  - Text inside open shadow roots is scanned and illuminated accurately.
  - Inaccessible cross-origin iframes fail gracefully with zero console errors.

---

## 🧪 Category 6: Shortcut Conflicts, Native Find Bypass & Site Exclusions

### Test Case 6.1: Double Ctrl+F Native Find Bypass
- **Steps**:
  1. Press `Ctrl+F` to open Darkroom Find.
  2. Immediately press `Ctrl+F` a second time within 400ms.
- **Expected Result**:
  - Darkroom Find closes and bypasses interception for 1.5 seconds, allowing Chrome's native search bar to appear.

### Test Case 6.2: One-Click Domain Exclusion
- **Steps**:
  1. Visit [docs.google.com](https://docs.google.com).
  2. Click the extension toolbar icon.
  3. Verify the site toggle shows "Disable" or is already listed in Excluded Websites.
  4. Press `Ctrl+F` on Google Docs.
- **Expected Result**:
  - Darkroom Find does not intercept; Google Docs' internal find dialog or native search opens unhindered.
  - Extension icon badge displays `OFF`.

### Test Case 6.3: Secondary Shortcut Command (`Alt+Shift+F`)
- **Steps**:
  1. On any eligible page, press `Alt+Shift+F`.
- **Expected Result**:
  - Darkroom Find toggles open/closed via the secondary browser command listener.

---

## 🧪 Category 7: Extension Popup & OS-Specific Shortcut Hero

### Test Case 7.1: High-Prominence Shortcut Hero Banner
- **Steps**:
  1. Click the Darkroom Find extension icon in the Chrome toolbar.
  2. Inspect the top section of the popup interface.
- **Expected Result**:
  - A dedicated "QUICK ACTIVATION" Shortcut Hero Banner is rendered prominently at the top with luminous Obsidian Glass styling.
  - Large `<kbd>` key badges clearly display the primary shortcut.
  - On macOS, badges dynamically render `<kbd>⌘</kbd> + <kbd>F</kbd>` and `<kbd>⌥</kbd> + <kbd>⇧</kbd> + <kbd>F</kbd>`.
  - On Windows/Linux, badges dynamically render `<kbd>Ctrl</kbd> + <kbd>F</kbd>` and `<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>`.
  - The fallback command shortcut is clearly explained for sites with aggressive shortcut capture.

### Test Case 7.2: Typography in Options/Popup Interface
- **Steps**:
  1. Open the Options popup and inspect headers, labels, and text fields.
  2. Type Persian text into the "Add domain" input.
- **Expected Result**:
  - The interface displays the polished `Inter` (English) and `Vazirmatn` (Persian) typography with crisp subpixel antialiasing and unified darkroom color contrast.


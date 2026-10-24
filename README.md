# Darkroom Find — Cinematic In-Page Search (Chrome Extension Manifest V3)

> **Darkroom Find** is a production-grade, dependency-free Chrome Extension that transforms standard in-page search (`Ctrl+F` / `Cmd+F`) into a cinematic "lights-off, phosphorescent-glow" experience. When you search, the page smoothly dims into deep darkness while matching words illuminate with a neon glow, offering fluid 60fps navigation, zero DOM mutations, regex support, and full Unicode/RTL accuracy.

---

## 🌟 Key Features

- **Cinematic Obsidian Glass Aesthetic**: A single, universally elegant "Darkroom / Obsidian Glass" aesthetic (`backdrop-filter: blur(18px)`, deep translucent glass, subtle luminous border, neon phosphorescent accents). Neutral and self-contained so it looks native regardless of whether Chrome's browser frame or the host page is light, dark, or custom-themed.
- **Refined English & Persian Typography**: Modern sans-serif stack (`Inter`, system-ui) paired with dedicated **`Vazirmatn`** font integration for Persian/Arabic text, with subpixel antialiasing and automatic text direction (`dir="auto"`).
- **High-Prominence Shortcut Hero Popup**: Clicking the extension icon in the toolbar presents an unmistakable shortcut hero banner with dynamically detected OS-specific key badges (`Ctrl+F` or `⌘+F` on macOS).
- **Zero DOM Mutation**: Uses the modern native **`CSS.highlights` API** combined with a fixed hardware-accelerated `<canvas>` cutout overlay. It never wraps text in `<mark>` tags or disrupts React, Vue, or Angular SPA hydration.
- **Cross-Node Range Engine**: Finds matches split across inline HTML tags (e.g. `<span>spot</span><b>light</b>`).
- **Deep Traversals**: Scans text inside open **Shadow DOM** roots and accessible **same-origin `<iframe>` documents**.
- **Full Unicode & RTL Support**: Comprehensive Whole-Word boundary detection (`\p{L}` / `\p{N}`) for Persian, Arabic, Hebrew, CJK, Cyrillic, and emojis.
- **Async Chunked Performance**: Scans massive pages (10,000+ matches) with time-sliced async yields (~12ms) without locking the main thread.
- **Scrollbar Match Minimap**: Interactive edge minimap displaying proportional match markers and current match position with click-to-jump.
- **Double-Press Native Find Bypass**: Double-pressing `Ctrl+F` within 400ms or clicking the bypass button passes control immediately to Chrome's native search bar.
- **Per-Site Exclusion**: Exclude complex shortcut-heavy web apps (Google Docs, VS Code Web, Sheets) with a single click.

---

## 🚀 Installation Guide

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/darkroom-find.git
   ```
2. Open Google Chrome (or any Chromium-based browser like Brave, Edge, Opera, or Arc).
3. Navigate to `chrome://extensions/` in the address bar.
4. Enable **Developer mode** toggle in the top-right corner.
5. Click the **Load unpacked** button in the top-left toolbar.
6. Select the root folder of this project (`darkroom-find`).
7. Open any standard webpage (e.g. [Wikipedia](https://en.wikipedia.org)) and press `Ctrl+F` (`Cmd+F` on macOS).

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl+F` / `Cmd+F` | Anywhere on page | Opens Darkroom Find (prefills any currently selected text). |
| `Ctrl+F` twice (< 400ms) | Anywhere on page | Bypasses Darkroom Find and opens Chrome's native find bar. |
| `Alt+Shift+F` | Anywhere on page | Secondary browser command shortcut to toggle Darkroom Find. |
| `Enter` / `ArrowDown` | In Search Input | Jump to the next match. |
| `Shift+Enter` / `ArrowUp` | In Search Input | Jump to the previous match. |
| `Esc` | In Search Input | Close Darkroom Find with a smooth 200ms fade-out. |
| `Alt+C` | In Search Input | Toggle **Match Case** (case sensitive). |
| `Alt+W` | In Search Input | Toggle **Whole Word** (Unicode boundary aware). |
| `Alt+R` | In Search Input | Toggle **Regex Mode** (regular expressions). |
| `Alt+M` | In Search Input | Toggle **Multi-term Mode** (space-separated query terms). |

---

## ⚙️ Architecture & Technical Decisions

```text
Host Webpage DOM
  ├── Regular Elements (Untouched, Zero Mutation)
  └── #spotlight-find-host (Custom Element)
        └── Shadow Root (open)
              ├── <style> (search-ui.css, encapsulated)
              ├── <canvas class="sf-spotlight-canvas"> (Fixed viewport dim & cutouts)
              ├── <canvas class="sf-minimap-canvas"> (Scrollbar match ticks)
              └── <div class="sf-search-container"> (Floating search pill UI)
```

### Why Native `CSS.highlights` + Canvas Cutouts?

Traditional search extensions wrap DOM nodes in `<mark class="highlight">` elements. This approach:
- Breaks SPA virtual DOM trees (React/Vue/Svelte reconciliation errors).
- Strips or interferes with registered DOM event listeners.
- Causes severe reflow and layout thrashing when wrapping thousands of words.
- Fails or breaks layout when text spans across inline tags like `<span>foo</span><b>bar</b>`.

**Darkroom Find solves this cleanly**:
1. **`CSS.highlights`**: Styles text color and text shadow natively inside the browser rendering engine with zero DOM changes.
2. **Fixed Canvas Cutout Overlay**: Sits at `z-index: 2147483645` inside an isolated Shadow DOM. On every `requestAnimationFrame`, it dims the viewport, punches out rounded-rectangle holes (`destination-out`) around visible match rectangles (`Range.getClientRects()`), and strokes soft glowing neon rings (`source-over`).

---

## 🛡️ Known Chromium Platform Limitations

Chromium enforces strict security boundaries designed to protect users:

1. **Native Find Bar Inaccessibility**:
   The Chromium Extension API does not provide hooks to style or customize the browser's built-in `Ctrl+F` search dialog. Darkroom Find achieves its experience by intercepting keyboard events (`window.addEventListener('keydown', ..., true)`) during the **capture phase**.
2. **Restricted Pages**:
   Chrome extensions cannot run content scripts on:
   - `chrome://` internal URLs (e.g., `chrome://settings`, `chrome://extensions`).
   - The **Chrome Web Store** (`chromewebstore.google.com`).
   - Built-in PDF viewer tabs (`chrome-extension://...`).
   On these restricted pages, Chrome automatically handles `Ctrl+F` natively.
3. **Capture Overrides in Complex Web Apps**:
   Heavy web applications such as Google Docs or VS Code Web capture `Ctrl+F` on internal canvases or custom handlers. Darkroom Find provides two seamless solutions:
   - **Per-Site Exclusion**: Add domains to the Excluded List in Options to disable interception.
   - **Double-Press Shortcut**: Pressing `Ctrl+F` twice quickly (within 400ms) bypasses Darkroom Find.
   - **Secondary Command**: `Alt+Shift+F` can trigger Darkroom Find even when the page intercepts `Ctrl+F`.

---

## 🔒 Permissions Justification

Darkroom Find follows the principle of least privilege:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Persists user preferences (dim opacity, glow colors, max highlights, search history, and excluded hostnames) across sessions via `chrome.storage.sync` with local fallback. |

*No analytics, tracking, or network requests are ever made. The extension operates 100% offline and locally.*

---

## 🗺️ Roadmap

- [ ] Fuzzy matching option (Levenshtein distance tolerance for typos).
- [ ] OCR scan mode for text rendered directly inside `<canvas>` web apps.
- [ ] Export search results list (with surrounding context snippets) to Markdown/JSON.

/**
 * Darkroom Find - Search Engine & DOM Walker
 * Async chunked scanner for document, open Shadow DOMs, and same-origin iframes.
 * Generates accurate DOM Range objects for matches split across inline elements.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotlightSearchEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Tags considered block-level boundaries
  const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CANVAS', 'DD', 'DIV',
    'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN',
    'NAV', 'NOSCRIPT', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY',
    'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL', 'BR'
  ]);

  // Tags to completely skip
  const IGNORE_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS',
    'AUDIO', 'VIDEO', 'TEXTAREA', 'INPUT', 'SELECT'
  ]);

  /**
   * Escape special characters for literal RegExp construction
   */
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Test whether an element is visible in the page layout
   * @param {Element} el
   * @returns {boolean}
   */
  function isElementVisible(el) {
    if (!el || !(el instanceof Element)) return true;

    // Check modern checkVisibility API if available
    if (typeof el.checkVisibility === 'function') {
      try {
        return el.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true
        });
      } catch {
        // Fallback below
      }
    }

    // Fast check for hidden attributes
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return false;
      }
    } catch {
      // In detached/special contexts
    }

    return true;
  }

  /**
   * Build virtual text blocks for a given root container (document, shadowRoot, or iframe doc)
   * Contiguous inline text nodes are merged into single blocks to allow cross-tag matching.
   *
   * @param {Node} rootNode
   * @param {HTMLIFrameElement|null} iframeElement
   * @returns {Array<{ text: string, segments: Array<{ node: Node, start: number, end: number }>, iframe: HTMLIFrameElement|null }>}
   */
  function collectTextBlocks(rootNode, iframeElement = null) {
    const blocks = [];
    let currentBlock = { text: '', segments: [], iframe: iframeElement };

    function flushBlock() {
      if (currentBlock.text.length > 0) {
        blocks.push(currentBlock);
        currentBlock = { text: '', segments: [], iframe: iframeElement };
      }
    }

    const doc = rootNode.ownerDocument || rootNode;
    const walker = doc.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName;
            // Ignore spotlight UI host
            if (node.id === 'spotlight-find-host' || node.closest && node.closest('#spotlight-find-host')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (IGNORE_TAGS.has(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!isElementVisible(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.id === 'spotlight-find-host' || (parent.closest && parent.closest('#spotlight-find-host'))) {
              return NodeFilter.FILTER_REJECT;
            }
            if (IGNORE_TAGS.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            // Ignore empty text nodes
            if (!node.nodeValue || node.nodeValue.length === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textVal = currentNode.nodeValue;
        const start = currentBlock.text.length;
        currentBlock.text += textVal;
        currentBlock.segments.push({
          node: currentNode,
          start,
          end: start + textVal.length
        });
      }
      currentNode = walker.nextNode();
    }

    flushBlock();

    // Traverse open shadowRoots and same-origin iframes
    const elementWalker = doc.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (node.id === 'spotlight-find-host' || (node.closest && node.closest('#spotlight-find-host'))) {
            return NodeFilter.FILTER_REJECT;
          }
          if (IGNORE_TAGS.has(node.tagName) || !isElementVisible(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.shadowRoot || node.tagName === 'IFRAME') {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let specialNode = elementWalker.nextNode();
    while (specialNode) {
      // Traverse open Shadow DOM
      if (specialNode.shadowRoot) {
        try {
          const shadowBlocks = collectTextBlocks(specialNode.shadowRoot, iframeElement);
          blocks.push(...shadowBlocks);
        } catch (e) {
          // Ignore inaccessible shadow roots
        }
      }

      // Traverse same-origin iframes
      if (specialNode.tagName === 'IFRAME') {
        try {
          const iframeDoc = specialNode.contentDocument;
          if (iframeDoc && iframeDoc.body) {
            const iframeBlocks = collectTextBlocks(iframeDoc.body, specialNode);
            blocks.push(...iframeBlocks);
          }
        } catch {
          // Cross-origin iframe, silently ignored
        }
      }

      specialNode = elementWalker.nextNode();
    }

    return blocks;
  }

  /**
   * Map character start/end offsets in virtual text block to DOM Range
   */
  function createRangeFromOffsets(block, matchStart, matchEnd) {
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;

    for (let i = 0; i < block.segments.length; i++) {
      const seg = block.segments[i];

      if (!startNode && matchStart >= seg.start && matchStart < seg.end) {
        startNode = seg.node;
        startOffset = matchStart - seg.start;
      }

      if (matchEnd > seg.start && matchEnd <= seg.end) {
        endNode = seg.node;
        endOffset = matchEnd - seg.start;
        break;
      }
    }

    // Edge case if matchEnd lands exactly at the end of the last segment
    if (!endNode && block.segments.length > 0) {
      const last = block.segments[block.segments.length - 1];
      if (matchEnd >= last.end) {
        endNode = last.node;
        endOffset = last.end - last.start;
      }
    }

    if (!startNode || !endNode) return null;

    try {
      const doc = startNode.ownerDocument || document;
      const range = doc.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    } catch {
      return null;
    }
  }

  /**
   * Search query options and compiled regex builder
   */
  function buildMatchers(query, options) {
    const { matchCase, wholeWord, useRegex, multiTerm } = options;
    const flags = (matchCase ? 'g' : 'gi') + 'u';

    if (useRegex) {
      try {
        const regex = new RegExp(query, flags);
        return [{ regex, termIndex: 0 }];
      } catch (err) {
        return { error: err.message };
      }
    }

    if (multiTerm) {
      const terms = query.trim().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [];

      const matchers = [];
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        let pattern = escapeRegExp(term);
        if (wholeWord) {
          pattern = '(?<![\\p{L}\\p{N}])' + pattern + '(?![\\p{L}\\p{N}])';
        }
        matchers.push({
          regex: new RegExp(pattern, flags),
          termIndex: i
        });
      }
      return matchers;
    }

    // Standard literal query
    let pattern = escapeRegExp(query);
    if (wholeWord) {
      pattern = '(?<![\\p{L}\\p{N}])' + pattern + '(?![\\p{L}\\p{N}])';
    }

    return [{ regex: new RegExp(pattern, flags), termIndex: 0 }];
  }

  // Active search session token to cancel stale background searches
  let currentSearchToken = 0;

  /**
   * Perform asynchronous chunked search across document
   * @param {string} query
   * @param {object} options { matchCase, wholeWord, useRegex, multiTerm, maxHighlights }
   * @param {AbortSignal} [signal]
   * @returns {Promise<{ matches: Array<{ range: Range, iframe: HTMLIFrameElement|null, termIndex: number }>, totalFound: number, capped: boolean, error: string|null }>}
   */
  async function search(query, options = {}, signal = null) {
    const token = ++currentSearchToken;
    const trimmed = (query || '').trim();

    if (!trimmed) {
      return { matches: [], totalFound: 0, capped: false, error: null };
    }

    const matchersOrError = buildMatchers(query, options);
    if (matchersOrError.error) {
      return { matches: [], totalFound: 0, capped: false, error: matchersOrError.error };
    }

    const matchers = matchersOrError;
    if (matchers.length === 0) {
      return { matches: [], totalFound: 0, capped: false, error: null };
    }

    const maxHighlights = options.maxHighlights || 5000;
    const blocks = collectTextBlocks(document.body || document.documentElement);

    const matches = [];
    let capped = false;
    let lastYieldTime = performance.now();

    for (let b = 0; b < blocks.length; b++) {
      // Check cancellation
      if (token !== currentSearchToken || (signal && signal.aborted)) {
        return { matches: [], totalFound: 0, capped: false, error: null, aborted: true };
      }

      // Time slice check: yield every 12ms to keep UI thread fluid
      const now = performance.now();
      if (now - lastYieldTime > 12) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYieldTime = performance.now();
      }

      const block = blocks[b];

      for (let m = 0; m < matchers.length; m++) {
        const { regex, termIndex } = matchers[m];
        regex.lastIndex = 0;

        let match;
        while ((match = regex.exec(block.text)) !== null) {
          // Zero-length match protection
          if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
          }

          const matchStart = match.index;
          const matchEnd = match.index + match[0].length;
          const range = createRangeFromOffsets(block, matchStart, matchEnd);

          if (range) {
            matches.push({
              range,
              iframe: block.iframe,
              termIndex
            });

            if (matches.length >= maxHighlights) {
              capped = true;
              break;
            }
          }

          if (regex.lastIndex === match.index) {
            regex.lastIndex++;
          }
        }

        if (capped) break;
      }

      if (capped) break;
    }

    // Sort matches in natural document order
    matches.sort((a, b) => {
      try {
        const pos = a.range.compareBoundaryPoints(Range.START_TO_START, b.range);
        return pos;
      } catch {
        return 0;
      }
    });

    return {
      matches,
      totalFound: matches.length,
      capped,
      error: null
    };
  }

  /**
   * Cancel any in-progress search
   */
  function cancelSearch() {
    currentSearchToken++;
  }

  return {
    search,
    cancelSearch,
    isElementVisible,
    buildMatchers
  };
});

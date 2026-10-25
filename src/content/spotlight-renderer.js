/**
 * Darkroom Find - Spotlight Cutout Overlay & Highlights Renderer
 * Manages CSS.highlights, fixed viewport canvas cutout, radial vignette,
 * scrollbar minimap markers, and 60fps rAF rendering.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotlightRenderer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Support check for native CSS Custom Highlight API
  const hasCssHighlights =
    typeof CSS !== 'undefined' &&
    typeof CSS.highlights !== 'undefined' &&
    typeof Highlight !== 'undefined';

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
   * Helper to draw a rounded rectangle on a canvas context
   */
  function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  class SpotlightRenderer {
    constructor(shadowRoot, options = {}) {
      this.shadowRoot = shadowRoot;
      this.options = {
        glowColor: options.glowColor || '#E3C77A',
        currentGlowColor: options.currentGlowColor || '#E8956B',
        dimOpacity: typeof options.dimOpacity === 'number' ? options.dimOpacity : 0.85,
        dimRgb: options.dimRgb || '11, 12, 14',
        ...options
      };

      this.matches = [];
      this.currentIndex = -1;
      this.isVisible = false;
      this.rafId = null;
      this.needsRedraw = false;
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // DOM elements
      this.canvas = null;
      this.ctx = null;
      this.minimapCanvas = null;
      this.minimapCtx = null;

      // Event handler bindings
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
      this.onMinimapClick = this.onMinimapClick.bind(this);

      this.initCanvases();
      this.initCssCustomProperties();
    }

    /**
     * Set CSS custom properties on document root for native highlights
     */
    initCssCustomProperties() {
      const root = document.documentElement;
      root.style.setProperty('--sf-glow-color', this.options.glowColor);
      root.style.setProperty('--sf-match-bg', hexToRgba(this.options.glowColor, 0.40));
      root.style.setProperty('--sf-current-glow', this.options.currentGlowColor);
      root.style.setProperty('--sf-current-bg', this.options.currentGlowColor);
      root.style.setProperty('--sf-current-text', '#1A1410');
    }

    /**
     * Create canvas elements inside the shadow root
     */
    initCanvases() {
      // Main spotlight dim overlay canvas
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'sf-spotlight-canvas';
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483645;
        opacity: 0;
        transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
      `;
      this.ctx = this.canvas.getContext('2d', { alpha: true });

      // Minimap strip canvas along scrollbar edge
      this.minimapCanvas = document.createElement('canvas');
      this.minimapCanvas.className = 'sf-minimap-canvas';
      this.minimapCanvas.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 8px;
        height: 100%;
        pointer-events: auto;
        cursor: pointer;
        z-index: 2147483647;
        opacity: 0;
        transition: opacity 200ms ease;
      `;
      this.minimapCtx = this.minimapCanvas.getContext('2d', { alpha: true });
      this.minimapCanvas.addEventListener('click', this.onMinimapClick);

      this.shadowRoot.appendChild(this.canvas);
      this.shadowRoot.appendChild(this.minimapCanvas);

      this.resizeCanvases();
    }

    resizeCanvases() {
      if (!this.canvas || !this.minimapCanvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = document.documentElement.clientWidth || window.innerWidth;
      const h = document.documentElement.clientHeight || window.innerHeight;

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.minimapCanvas.width = Math.floor(8 * dpr);
      this.minimapCanvas.height = Math.floor(h * dpr);
      this.minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.needsRedraw = true;
    }

    /**
     * Show spotlight overlay and activate render loop
     */
    show() {
      if (this.isVisible) return;
      this.isVisible = true;
      this.resizeCanvases();

      this.canvas.style.opacity = '1';
      this.minimapCanvas.style.opacity = '1';

      // Capture scroll from window and all scrollable containers
      window.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });

      this.startRenderLoop();
    }

    /**
     * Hide spotlight overlay and pause render loop
     */
    hide() {
      if (!this.isVisible) return;
      this.isVisible = false;

      this.canvas.style.opacity = '0';
      this.minimapCanvas.style.opacity = '0';

      window.removeEventListener('scroll', this.onScroll, { capture: true });
      window.removeEventListener('resize', this.onResize);

      this.stopRenderLoop();
      this.clearCssHighlights();

      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      if (this.minimapCtx && this.minimapCanvas) {
        this.minimapCtx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
      }
    }

    onScroll() {
      this.needsRedraw = true;
    }

    onResize() {
      this.resizeCanvases();
      this.needsRedraw = true;
    }

    startRenderLoop() {
      if (this.rafId) return;
      this.needsRedraw = true;
      this.renderFrame();
    }

    stopRenderLoop() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    renderFrame() {
      if (!this.isVisible) return;

      if (this.needsRedraw) {
        this.drawOverlay();
        this.drawMinimap();
        this.needsRedraw = false;
      }

      this.rafId = requestAnimationFrame(this.renderFrame);
    }

    /**
     * Update match data & current match index
     */
    updateMatches(matches, currentIndex = -1) {
      this.matches = matches || [];
      this.currentIndex = currentIndex;

      this.syncCssHighlights();
      this.needsRedraw = true;
    }

    /**
     * Set active match index and trigger auto-scroll
     */
    setCurrentIndex(index, autoScroll = true) {
      if (index < 0 || index >= this.matches.length) {
        this.currentIndex = -1;
      } else {
        this.currentIndex = index;
        if (autoScroll) {
          this.scrollToMatch(index);
        }
      }

      this.syncCssHighlights();
      this.needsRedraw = true;
    }

    /**
     * Register ranges with native CSS.highlights API
     */
    syncCssHighlights() {
      if (!hasCssHighlights) return;

      try {
        const matchRanges = [];
        const currentRanges = [];
        const termRanges = new Map();

        for (let i = 0; i < this.matches.length; i++) {
          const m = this.matches[i];
          if (!m.range) continue;

          if (i === this.currentIndex) {
            currentRanges.push(m.range);
          } else {
            matchRanges.push(m.range);
          }

          if (typeof m.termIndex === 'number' && m.termIndex > 0) {
            if (!termRanges.has(m.termIndex)) {
              termRanges.set(m.termIndex, []);
            }
            termRanges.get(m.termIndex).push(m.range);
          }
        }

        CSS.highlights.set('spotlight-match', new Highlight(...matchRanges));
        CSS.highlights.set('spotlight-current', new Highlight(...currentRanges));

        // Multi-term highlight sets
        for (let t = 0; t <= 5; t++) {
          const list = termRanges.get(t);
          if (list && list.length > 0) {
            CSS.highlights.set(`spotlight-term-${t}`, new Highlight(...list));
          } else {
            CSS.highlights.delete(`spotlight-term-${t}`);
          }
        }
      } catch (err) {
        console.warn('[Darkroom Find] CSS.highlights update error:', err);
      }
    }

    /**
     * Clear all registered CSS.highlights
     */
    clearCssHighlights() {
      if (!hasCssHighlights) return;
      try {
        CSS.highlights.delete('spotlight-match');
        CSS.highlights.delete('spotlight-current');
        for (let t = 0; t <= 5; t++) {
          CSS.highlights.delete(`spotlight-term-${t}`);
        }
      } catch {}
    }

    /**
     * Draw fixed viewport canvas: Dim background, Cutouts, Radial Vignette, and Glow rings
     */
    drawOverlay() {
      const ctx = this.ctx;
      const canvasBounds = this.canvas ? this.canvas.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      const canvasOffsetX = canvasBounds.left;
      const canvasOffsetY = canvasBounds.top;
      const w = Math.ceil(canvasBounds.width || document.documentElement.clientWidth || window.innerWidth);
      const h = Math.ceil(canvasBounds.height || document.documentElement.clientHeight || window.innerHeight);

      ctx.clearRect(0, 0, w, h);

      // 1. Fill entire viewport with Obsidian Glass dim color
      const dimColor = `rgba(${this.options.dimRgb}, ${this.options.dimOpacity})`;
      ctx.fillStyle = dimColor;
      ctx.fillRect(0, 0, w, h);

      if (this.matches.length === 0) return;

      // Extract visible client rects for matches
      const visibleRects = [];
      let currentActiveCenter = null;

      for (let i = 0; i < this.matches.length; i++) {
        const item = this.matches[i];
        if (!item.range) continue;

        let rects;
        try {
          rects = item.range.getClientRects();
        } catch {
          continue;
        }

        // Offset coordinates if match is inside an iframe
        let iframeOffsetLeft = 0;
        let iframeOffsetTop = 0;
        if (item.iframe) {
          try {
            const ifRect = item.iframe.getBoundingClientRect();
            iframeOffsetLeft = ifRect.left;
            iframeOffsetTop = ifRect.top;
          } catch {}
        }

        const isCurrent = i === this.currentIndex;

        for (let r = 0; r < rects.length; r++) {
          const rect = rects[r];
          if (rect.width === 0 || rect.height === 0) continue;

          const left = rect.left + iframeOffsetLeft - canvasOffsetX;
          const top = rect.top + iframeOffsetTop - canvasOffsetY;
          const right = left + rect.width;
          const bottom = top + rect.height;

          // Check viewport intersection
          if (bottom >= -10 && top <= h + 10 && right >= -10 && left <= w + 10) {
            const visibleItem = {
              left,
              top,
              width: rect.width,
              height: rect.height,
              isCurrent
            };
            visibleRects.push(visibleItem);

            if (isCurrent && !currentActiveCenter) {
              currentActiveCenter = {
                x: left + rect.width / 2,
                y: top + rect.height / 2
              };
            }
          }
        }
      }

      // 2. Cutout holes (destination-out) so matched text shines through with full clarity
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';

      for (let i = 0; i < visibleRects.length; i++) {
        const item = visibleRects[i];
        // Zero padding for exact text fit without bleeding into adjacent characters
        drawRoundRect(
          ctx,
          item.left,
          item.top,
          item.width,
          item.height,
          2
        );
        ctx.fill();
      }
      ctx.restore();

      // 3. Render clean, flat outlines around cutouts (no glow, no animation pulse)
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < visibleRects.length; i++) {
        const item = visibleRects[i];
        const isCur = item.isCurrent;

        drawRoundRect(ctx, item.left, item.top, item.width, item.height, 2);

        if (isCur) {
          ctx.strokeStyle = this.options.currentGlowColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.strokeStyle = hexToRgba(this.options.glowColor, 0.6);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    /**
     * Draw scrollbar minimap markers
     */
    drawMinimap() {
      const ctx = this.minimapCtx;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, 8, h);

      if (this.matches.length === 0) return;

      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        h
      );

      ctx.save();
      for (let i = 0; i < this.matches.length; i++) {
        const item = this.matches[i];
        if (!item.range) continue;

        let top = 0;
        try {
          const rect = item.range.getBoundingClientRect();
          top = rect.top + window.scrollY;
        } catch {
          continue;
        }

        const minimapY = Math.min(h - 4, Math.max(2, (top / docHeight) * h));
        const isCur = i === this.currentIndex;

        if (isCur) {
          ctx.fillStyle = this.options.currentGlowColor;
          ctx.fillRect(0, minimapY - 2, 8, 4);
        } else {
          ctx.fillStyle = this.options.glowColor;
          ctx.fillRect(2, minimapY - 1, 5, 2);
        }
      }
      ctx.restore();
    }

    /**
     * Click on minimap jumps directly to proportional position
     */
    onMinimapClick(event) {
      const clickY = event.clientY;
      const h = window.innerHeight;
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        h
      );

      const targetScrollY = (clickY / h) * docHeight - h / 2;
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: this.prefersReducedMotion ? 'auto' : 'smooth'
      });
    }

    /**
     * Smoothly center the active match in the viewport
     */
    scrollToMatch(index) {
      if (index < 0 || index >= this.matches.length) return;
      const item = this.matches[index];
      if (!item || !item.range) return;

      try {
        const rect = item.range.getBoundingClientRect();
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = document.documentElement.clientHeight || window.innerHeight;
        const inView =
          rect.top >= 80 &&
          rect.bottom <= viewportH - 80 &&
          rect.left >= 0 &&
          rect.right <= viewportW;

        if (!inView) {
          const targetY = window.scrollY + rect.top - viewportH / 2 + rect.height / 2;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: this.prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      } catch (err) {
        // Fallback to element scrollIntoView
        try {
          const node = item.range.startContainer;
          const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
          if (el && el.scrollIntoView) {
            el.scrollIntoView({
              behavior: this.prefersReducedMotion ? 'auto' : 'smooth',
              block: 'center',
              inline: 'nearest'
            });
          }
        } catch {}
      }
    }

    /**
     * Update runtime settings (colors, theme, dim opacity)
     */
    updateConfig(newConfig = {}) {
      this.options = { ...this.options, ...newConfig };
      this.initCssCustomProperties();
      this.needsRedraw = true;
    }

    /**
     * Complete teardown and memory cleanup
     */
    destroy() {
      this.hide();
      if (this.canvas && this.canvas.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
      if (this.minimapCanvas && this.minimapCanvas.parentElement) {
        this.minimapCanvas.removeEventListener('click', this.onMinimapClick);
        this.minimapCanvas.parentElement.removeChild(this.minimapCanvas);
      }
      this.canvas = null;
      this.ctx = null;
      this.minimapCanvas = null;
      this.minimapCtx = null;
      this.matches = [];
    }
  }

  return SpotlightRenderer;
});

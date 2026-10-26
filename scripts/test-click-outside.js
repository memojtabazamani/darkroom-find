const assert = require('assert');
const fs = require('fs');

// Minimal mock DOM for testing SpotlightSearchUI in Node
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.classList = new Set();
    this.classList.add = (c) => this.classList[c] = true;
    this.classList.remove = (c) => delete this.classList[c];
    this.classList.contains = (c) => Boolean(this.classList[c]);
    this.style = {};
    this.children = [];
    this.parentElement = null;
    this.listeners = {};
    this.attributes = {};
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    child.parentElement = null;
  }
  querySelector(sel) {
    return this._find(sel);
  }
  querySelectorAll() { return []; }
  _find(sel) {
    const match = (el) => {
      if (sel.startsWith('.') && el.classList.contains(sel.slice(1))) return true;
      if (sel === 'input' && el.tagName === 'INPUT') return true;
      return false;
    };
    for (const child of this.children) {
      if (match(child)) return child;
      const found = child._find && child._find(sel);
      if (found) return found;
    }
    return null;
  }
  addEventListener(type, cb) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(cb);
  }
  removeEventListener(type, cb) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(l => l !== cb);
  }
  dispatchEvent(evt) {
    if (this.listeners[evt.type]) {
      this.listeners[evt.type].forEach(cb => cb(evt));
    }
  }
  focus() {}
  select() {}
}

const windowListeners = {};
global.window = {
  addEventListener(type, cb) {
    windowListeners[type] = windowListeners[type] || [];
    windowListeners[type].push(cb);
  },
  removeEventListener(type, cb) {
    if (!windowListeners[type]) return;
    windowListeners[type] = windowListeners[type].filter(l => l !== cb);
  },
  dispatchEvent(evt) {
    if (windowListeners[evt.type]) {
      [...windowListeners[evt.type]].forEach(cb => cb(evt));
    }
  }
};
global.requestAnimationFrame = (cb) => cb();
global.document = {
  activeElement: null,
  createElement(tag) { return new MockElement(tag); }
};
global.chrome = {
  runtime: { getURL: (p) => p }
};

// Load SpotlightSearchUI
const code = fs.readFileSync('src/content/search-ui.js', 'utf8');
const factory = new Function('module', 'exports', `${code}; return module.exports;`);
const mod = { exports: {} };
const SpotlightSearchUI = factory(mod, mod.exports);

// Test harness
const shadowRoot = new MockElement('shadow');
let closed = false;
const ui = new SpotlightSearchUI(shadowRoot, {
  onClose: () => { closed = true; }
});

// Test 1: Window pointerdown outside closes UI
ui.show();
assert.strictEqual(ui.isOpen, true, 'UI should be open');
assert.strictEqual(windowListeners['pointerdown'].length, 1, 'Pointerdown listener should be registered');

// Simulate click on web page (outside)
const outsidePageElement = new MockElement('p');
window.dispatchEvent({
  type: 'pointerdown',
  composedPath: () => [outsidePageElement, global.document, global.window]
});
assert.strictEqual(ui.isOpen, false, 'UI should close on outside pointerdown');
assert.strictEqual(closed, true, 'onClose should have been called');
assert.strictEqual((windowListeners['pointerdown'] || []).length, 0, 'Pointerdown listener should be unregistered');

// Test 2: Click inside UI container does NOT close
closed = false;
ui.show();
assert.strictEqual(ui.isOpen, true, 'UI reopened');

window.dispatchEvent({
  type: 'pointerdown',
  composedPath: () => [ui.input, ui.container, shadowRoot, global.window]
});
assert.strictEqual(ui.isOpen, true, 'UI stays open on inside pointerdown');
assert.strictEqual(closed, false, 'onClose not called');

window.dispatchEvent({
  type: 'click',
  composedPath: () => [ui.input, ui.container, shadowRoot, global.window]
});
assert.strictEqual(ui.isOpen, true, 'UI stays open on inside click');

// Test 3: Dragging text inside to outside does NOT close on click
window.dispatchEvent({
  type: 'pointerdown',
  composedPath: () => [ui.input, ui.container, shadowRoot, global.window]
});
// Released outside
window.dispatchEvent({
  type: 'click',
  composedPath: () => [outsidePageElement, global.window]
});
assert.strictEqual(ui.isOpen, true, 'UI stays open when drag started inside');

// Test 4: Minimap canvas click does not close
const minimap = new MockElement('canvas');
minimap.classList.add('sf-minimap-canvas');
window.dispatchEvent({
  type: 'pointerdown',
  composedPath: () => [minimap, shadowRoot, global.window]
});
assert.strictEqual(ui.isOpen, true, 'UI stays open on minimap click');

// Test 5: Outside click without pointerdown closes UI
window.dispatchEvent({
  type: 'click',
  composedPath: () => [outsidePageElement, global.window]
});
assert.strictEqual(ui.isOpen, false, 'UI closes on outside click');

console.log('All 5 click-outside tests passed successfully.');

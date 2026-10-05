const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the shipped navigation controller and its event ordering.
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const marker = source.indexOf("  const stack = document.querySelector('.float-launchers');");
const start = source.lastIndexOf('(() => {', marker);
const end = source.indexOf('\n})();', marker) + '\n})();'.length;
assert.ok(marker >= 0 && start >= 0 && end > marker, 'Shared navigation controller must exist');
const controller = source.slice(start, end);

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.document = document;
    this.parentElement = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.inert = false;
    this.hidden = false;
    this.scrollTop = 0;
    this.style = { setProperty() {}, removeProperty() {} };
    const classes = new Set();
    this.classList = {
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
      contains: (value) => classes.has(value),
      toggle(value, force) {
        const next = force === undefined ? !classes.has(value) : force;
        if (next) classes.add(value); else classes.delete(value);
        return next;
      },
      values: () => [...classes],
    };
  }

  set className(value) {
    this.classList.remove(...this.classList.values());
    this.classList.add(...value.split(/\s+/).filter(Boolean));
  }
  get className() { return this.classList.values().join(' '); }
  set id(value) { this.setAttribute('id', value); }
  get id() { return this.getAttribute('id') || ''; }
  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.firstChild; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) { return this.insertBefore(child, null); }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  insertBefore(child, before) {
    if (child.parentElement) {
      const oldChildren = child.parentElement.children;
      oldChildren.splice(oldChildren.indexOf(child), 1);
    }
    child.parentElement = this;
    const index = before ? this.children.indexOf(before) : -1;
    this.children.splice(index >= 0 ? index : this.children.length, 0, child);
    return child;
  }
  contains(item) { return item === this || this.children.some((child) => child.contains(item)); }
  closest(selector) {
    if (this.matches(selector)) return this;
    return this.parentElement?.closest(selector) || null;
  }
  matches(selector) {
    if (selector === '.lg-chip:not(.lg-main)') {
      return this.classList.contains('lg-chip') && !this.classList.contains('lg-main');
    }
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    return selector === this.tagName.toLowerCase();
  }
  querySelectorAll(selector) {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, properties = {}) {
    const event = {
      target: this, currentTarget: this, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...properties,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }
  focus(options) {
    this.document.activeElement = this;
    this.lastFocusOptions = options;
  }
}

function harness({ compact = true, missingStack = false, emptyStack = false } = {}) {
  const document = {
    listeners: new Map(), activeElement: null,
    createElement(tag) { return new FakeElement(tag, this); },
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    },
    dispatch(type, properties = {}) {
      const event = {
        defaultPrevented: false, preventDefault() { this.defaultPrevented = true; },
        ...properties,
      };
      for (const listener of this.listeners.get(type) || []) listener(event);
      return event;
    },
  };
  const stack = document.createElement('nav');
  stack.className = 'float-launchers';
  const chips = emptyStack ? [] : Array.from({ length: 4 }, (_, index) => {
    const chip = document.createElement('a');
    chip.className = 'lg-chip';
    chip.setAttribute('href', `page-${index}.html`);
    chip.setAttribute('data-label', `Page ${index}`);
    if (index === 1) chip.setAttribute('tabindex', '0');
    stack.appendChild(chip);
    return chip;
  });
  document.querySelector = (selector) => selector === '.float-launchers' && !missingStack ? stack : null;
  const media = {
    matches: compact, query: '', listeners: [],
    addEventListener(type, listener) { if (type === 'change') this.listeners.push(listener); },
    change(matches) {
      this.matches = matches;
      this.listeners.forEach((listener) => listener({ matches }));
    },
  };
  const window = {
    listeners: new Map(),
    matchMedia(query) { media.query = query; return media; },
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    },
    dispatch(type, properties = {}) {
      for (const listener of this.listeners.get(type) || []) listener(properties);
    },
  };
  vm.runInNewContext(controller, { document, window, HTMLElement: FakeElement });
  const main = stack.querySelector('.lg-main');
  return { document, window, stack, chips, media, main };
}

function assertClosed(h) {
  assert.equal(h.stack.classList.contains('is-show'), false);
  assert.equal(h.main.getAttribute('aria-expanded'), 'false');
  assert.equal(h.main.getAttribute('aria-label'), '開啟快速導覽');
  for (const chip of h.chips) {
    assert.equal(chip.inert, true);
    assert.equal(chip.getAttribute('aria-hidden'), 'true');
    assert.equal(chip.getAttribute('tabindex'), '-1');
  }
}

function assertOpen(h) {
  assert.equal(h.stack.classList.contains('is-show'), true);
  assert.equal(h.main.getAttribute('aria-expanded'), 'true');
  assert.equal(h.main.getAttribute('aria-label'), '關閉快速導覽');
  for (const chip of h.chips) {
    assert.equal(chip.inert, false);
    assert.equal(chip.getAttribute('aria-hidden'), null);
  }
  assert.equal(h.chips[0].getAttribute('tabindex'), null);
  assert.equal(h.chips[1].getAttribute('tabindex'), '0');
}

test('touch menu starts closed with a single operable trigger', () => {
  const h = harness();
  assertClosed(h);
  assert.equal(h.main.type, 'button');
  const controlled = h.main.getAttribute('aria-controls').split(/\s+/);
  assert.ok(controlled.length > 0);
  assert.equal(h.main.inert, false);
  assert.deepEqual(h.chips.map((chip) => chip.getAttribute('href')),
    ['page-0.html', 'page-1.html', 'page-2.html', 'page-3.html']);
});

test('rapid repeated toggles always expose the latest state without stale callbacks', () => {
  const h = harness();
  for (let index = 0; index < 15; index += 1) {
    h.main.dispatch('click');
    if (index % 2 === 0) assertOpen(h); else assertClosed(h);
  }
  h.main.dispatch('click');
  assertClosed(h);
});

test('outside click closes but inside link activation keeps native navigation available', () => {
  const h = harness();
  h.main.dispatch('click');
  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    const event = h.document.dispatch('click', { target: h.chips[0], ...modifier });
    assert.equal(event.defaultPrevented, false);
    assertOpen(h);
  }
  h.document.dispatch('click', { target: h.document.createElement('div') });
  assertClosed(h);
});

test('null focusout during native link activation does not make the link inert', () => {
  const h = harness();
  h.main.dispatch('click');
  h.chips[0].focus();
  h.stack.dispatch('focusout', { target: h.chips[0], relatedTarget: null });
  assertOpen(h);
  h.stack.dispatch('focusout', { target: h.chips[0], relatedTarget: h.chips[1] });
  assertOpen(h);
  h.stack.dispatch('focusout', { target: h.chips[0], relatedTarget: h.document.createElement('button') });
  assertClosed(h);
});

test('Escape closes an open touch menu and restores focus without scrolling', () => {
  const h = harness();
  h.main.dispatch('click');
  h.chips[2].focus();
  const event = h.document.dispatch('keydown', { key: 'Escape' });
  assertClosed(h);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.document.activeElement, h.main);
  assert.equal(h.main.lastFocusOptions.preventScroll, true);
  const secondEscape = h.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(secondEscape.defaultPrevented, false);
});

test('mode changes close the menu, restore link tabindex, and keep focus on visible controls', () => {
  const h = harness();
  h.main.dispatch('click');
  h.main.focus();
  h.media.change(false);
  assert.equal(h.main.getAttribute('aria-expanded'), 'false');
  assert.equal(h.stack.classList.contains('is-show'), false);
  assert.ok(h.chips.every((chip) => !chip.inert && !chip.getAttribute('aria-hidden')));
  assert.equal(h.chips[0].getAttribute('tabindex'), null);
  assert.equal(h.chips[1].getAttribute('tabindex'), '0');
  assert.equal(h.document.activeElement, h.chips[0]);
  assert.equal(h.chips[0].lastFocusOptions.preventScroll, true);
  h.media.change(true);
  assertClosed(h);
  assert.equal(h.document.activeElement, h.main);
});

test('pageshow resets restored touch state and returns focus out of hidden links', () => {
  const h = harness();
  h.main.dispatch('click');
  h.chips[3].focus();
  h.window.dispatch('pageshow', { persisted: true });
  assertClosed(h);
  assert.equal(h.document.activeElement, h.main);
});

test('normal pageshow after a slow iframe load leaves an already opened menu available', () => {
  const h = harness();
  h.main.dispatch('click');
  h.chips[2].focus();
  h.window.dispatch('pageshow', { persisted: false });
  assertOpen(h);
  assert.equal(h.document.activeElement, h.chips[2]);
});

test('desktop mode leaves native quick links available and ignores toggle clicks', () => {
  const h = harness({ compact: false });
  assert.ok(h.chips.every((chip) => !chip.inert));
  assert.equal(h.chips[0].getAttribute('tabindex'), null);
  assert.equal(h.chips[1].getAttribute('tabindex'), '0');
  const event = h.main.dispatch('click');
  assert.equal(event.defaultPrevented, false);
  assert.equal(h.stack.classList.contains('is-show'), false);
});

test('pages without quick links do not receive an empty toggle', () => {
  for (const options of [{ missingStack: true }, { emptyStack: true }]) {
    const h = harness(options);
    assert.equal(h.main, null);
    assert.equal(h.stack.classList.contains('has-menu-toggle'), false);
  }
});

test('recruitment double-tap guard allows rapid native clicks inside quick navigation', () => {
  const h = harness();
  const zoomStart = source.indexOf('  const lockMobileZoom = () => {');
  const zoomEnd = source.indexOf('  lockMobileZoom();', zoomStart) + '  lockMobileZoom();'.length;
  assert.ok(zoomStart >= 0 && zoomEnd > zoomStart);
  let now = 1000;
  vm.runInNewContext(source.slice(zoomStart, zoomEnd), {
    document: h.document, window: h.window, Element: FakeElement,
    Date: { now: () => now },
  });
  const tap = (target) => h.document.dispatch('touchend', { target, cancelable: true });
  assert.equal(tap(h.main).defaultPrevented, false);
  now += 100;
  assert.equal(tap(h.main).defaultPrevented, false);
  now += 100;
  assert.equal(tap(h.chips[0]).defaultPrevented, false);
  const outside = h.document.createElement('div');
  now += 100;
  assert.equal(tap(outside).defaultPrevented, false, 'Menu taps do not pollute the outside tap timestamp');
  now += 100;
  assert.equal(tap(outside).defaultPrevented, true, 'The existing guard still applies outside navigation');
});

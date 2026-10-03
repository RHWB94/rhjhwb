const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

// Exercise the shipped helpers, rather than a second implementation of them.
const source = fs.readFileSync(path.join(__dirname, '..', 'courses.js'), 'utf8');
const start = source.indexOf('  const createPicture =');
const end = source.indexOf('  const pickPositions =', start);
assert.ok(start >= 0 && end > start, 'Photo helpers must exist in courses.js');
const makeHelpers = new Function('window', 'document', 'state', `
  let photoLoadController = state.controller;
  let activeCard = state.card;
  const overlayRoot = state.root;
  const reducedMotion = state.reducedMotion;
  const photoSeeds = state.seeds;
  const enterTimers = [];
  ${source.slice(start, end)}
  return {
    createPicture, waitForPhoto, revealPhotos,
    setSession(controller, card) { photoLoadController = controller; activeCard = card; }
  };
`);

const flush = async () => {
  // Promise.all and decode each add microtasks before reveal is scheduled.
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

class FakeImage extends EventTarget {
  constructor(log = []) {
    super();
    this.log = log;
    this.tagName = 'IMG';
    this.complete = false;
    this.naturalWidth = 0;
    this.currentSrc = '';
    this.listeners = new Map();
  }

  addEventListener(type, listener, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    super.addEventListener(type, listener, options);
  }

  removeEventListener(type, listener, options) {
    this.listeners.get(type)?.delete(listener);
    super.removeEventListener(type, listener, options);
  }

  set src(value) {
    this._src = value;
    this.log.push({ type: 'src', value, siblings: [...(this.parentNode?.children || [])] });
  }

  get src() { return this._src; }

  load() {
    this.complete = true;
    this.naturalWidth = 360;
    this.currentSrc = this.src || '/course-photo/loaded_360.webp';
    this.dispatchEvent(new Event('load'));
  }

  fail() {
    this.complete = true;
    this.naturalWidth = 0;
    this.dispatchEvent(new Event('error'));
  }
}

const makeClassList = () => {
  const classes = new Set();
  return { add: (value) => classes.add(value), contains: (value) => classes.has(value) };
};

function harness({ reducedMotion = false, delays = [10, 30, 50] } = {}) {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const frames = new Map();
  const pictureLog = [];
  const paintReads = [];
  const window = {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame(callback) {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    getComputedStyle(item) {
      return { get transform() { paintReads.push(item); return 'matrix(1, 0, 0, 1, -1000, 0)'; } };
    },
  };
  const document = {
    createElement(tag) {
      if (tag === 'img') return new FakeImage(pictureLog);
      return {
        tagName: tag.toUpperCase(),
        children: [],
        appendChild(child) {
          child.parentNode = this;
          this.children.push(child);
          pictureLog.push({ type: 'append', tag: child.tagName });
        },
      };
    },
  };
  const controller = new AbortController();
  const card = {};
  const root = { classList: makeClassList() };
  const helpers = makeHelpers(window, document, {
    controller, card, root, reducedMotion: { matches: reducedMotion },
    seeds: delays.map((delay) => ({ delay })),
  });
  return {
    ...helpers, controller, card, root, timers, frames, pictureLog, paintReads,
    advance(milliseconds) {
      const target = now + milliseconds;
      for (;;) {
        const due = [...timers].filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        timers.delete(id);
        now = timer.at;
        timer.callback();
      }
      now = target;
    },
    frame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    },
  };
}

function photo(img = new FakeImage()) {
  return { img, hidden: false, dataset: {}, classList: makeClassList(), querySelector: () => img };
}

function layerFor(photos) {
  return { contains: (item) => photos.includes(item) };
}

test('load completes before decode starts, even if decode could resolve early', async () => {
  const h = harness();
  const img = new FakeImage();
  let decodeCalls = 0;
  img.decode = () => { decodeCalls += 1; return Promise.resolve(); };
  let outcome = 'pending';
  h.waitForPhoto(img, h.controller.signal).then((value) => { outcome = value; });
  await flush();
  assert.equal(decodeCalls, 0);
  assert.equal(outcome, 'pending');
  img.load();
  await flush();
  assert.equal(decodeCalls, 1);
  assert.equal(outcome, true);
  assert.equal(h.timers.size, 0);
  assert.equal(img.listeners.get('load').size, 0);
  assert.equal(img.listeners.get('error').size, 0);
});

test('a loaded cached image can resolve without another load event', async () => {
  const h = harness();
  const img = new FakeImage();
  img.load();
  img.decode = () => Promise.resolve();
  assert.equal(await h.waitForPhoto(img, h.controller.signal), true);
});

test('successful load is enough when image.decode is unavailable', async () => {
  const h = harness();
  const img = new FakeImage();
  const ready = h.waitForPhoto(img, h.controller.signal);
  img.load();
  assert.equal(await ready, true);
});

for (const failure of ['throws', 'rejects', 'stalls']) {
  test(`decode that ${failure} falls back only after a successful load`, async () => {
    const h = harness();
    const img = new FakeImage();
    let decodeCalls = 0;
    img.decode = () => {
      decodeCalls += 1;
      if (failure === 'throws') throw new Error('WebKit decode failure');
      if (failure === 'rejects') return Promise.reject(new Error('WebKit decode failure'));
      return new Promise(() => {});
    };
    let outcome = 'pending';
    h.waitForPhoto(img, h.controller.signal).then((value) => { outcome = value; });
    h.advance(700);
    await flush();
    assert.equal(outcome, 'pending');
    assert.equal(decodeCalls, 0);
    img.load();
    await flush();
    assert.equal(decodeCalls, 1);
    if (failure === 'stalls') {
      h.advance(599);
      await flush();
      assert.equal(outcome, 'pending');
      h.advance(1);
      await flush();
    }
    assert.equal(outcome, true);
    assert.equal(h.timers.size, 0);
  });
}

test('load error does not call decode or reveal a broken image', async () => {
  const h = harness();
  const img = new FakeImage();
  let decodeCalls = 0;
  img.decode = () => { decodeCalls += 1; return Promise.resolve(); };
  const ready = h.waitForPhoto(img, h.controller.signal);
  img.fail();
  assert.equal(await ready, false);
  assert.equal(decodeCalls, 0);
  assert.equal(h.timers.size, 0);
});

test('a load that never completes times out without starting decode', async () => {
  const h = harness();
  const img = new FakeImage();
  let decodeCalls = 0;
  img.decode = () => { decodeCalls += 1; return Promise.resolve(); };
  let outcome = 'pending';
  h.waitForPhoto(img, h.controller.signal).then((value) => { outcome = value; });
  h.advance(11999);
  await flush();
  assert.equal(outcome, 'pending');
  h.advance(1);
  await flush();
  assert.equal(outcome, false);
  assert.equal(decodeCalls, 0);
});

test('abort cancels both loading and decoding and clears their timers', async () => {
  for (const duringDecode of [false, true]) {
    const h = harness();
    const img = new FakeImage();
    img.decode = () => new Promise(() => {});
    const ready = h.waitForPhoto(img, h.controller.signal);
    if (duringDecode) { img.load(); await flush(); }
    h.controller.abort();
    assert.equal(await ready, false);
    assert.equal(h.timers.size, 0);
    img.load();
    h.advance(12000);
    assert.equal(img.listeners.get('load').size, 0);
  }
});

test('an already aborted session rejects even a cached loaded image', async () => {
  const h = harness();
  const img = new FakeImage();
  img.load();
  h.controller.abort();
  assert.equal(await h.waitForPhoto(img, h.controller.signal), false);
});

test('the whole batch waits for its slowest decode and two animation frames', async () => {
  const h = harness({ delays: [10, 30] });
  const slowDecode = deferred();
  const photos = [photo(), photo()];
  photos[1].img.decode = () => slowDecode.promise;
  const reveal = h.revealPhotos(photos, layerFor(photos), h.controller.signal);
  photos.forEach((item) => item.img.load());
  await flush();
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 1, 'Only the outstanding decode timeout remains');
  assert.ok(photos.every((item) => !item.classList.contains('is-visible')));
  slowDecode.resolve();
  await reveal;
  assert.deepEqual(h.paintReads, photos);
  assert.equal(h.frames.size, 1);
  h.frame();
  h.advance(100);
  assert.ok(photos.every((item) => !item.classList.contains('is-visible')));
  assert.equal(h.frames.size, 1);
  h.frame();
  h.advance(9);
  assert.ok(photos.every((item) => !item.classList.contains('is-visible')));
  h.advance(1);
  assert.equal(photos[0].classList.contains('is-visible'), true);
  assert.equal(photos[1].classList.contains('is-visible'), false);
  h.advance(20);
  assert.ok(photos.every((item) => item.classList.contains('is-visible')));
});

test('failed images are hidden while the remaining loaded batch animates', async () => {
  const h = harness({ delays: [0, 0] });
  const photos = [photo(), photo()];
  const reveal = h.revealPhotos(photos, layerFor(photos), h.controller.signal);
  photos[0].img.load();
  photos[1].img.fail();
  await reveal;
  assert.equal(photos[1].hidden, true);
  assert.equal(photos[1].dataset.failed, 'true');
  h.frame();
  h.frame();
  h.advance(0);
  assert.equal(photos[0].classList.contains('is-visible'), true);
  assert.equal(photos[1].classList.contains('is-visible'), false);
});

test('closing while loading prevents stale photos from scheduling a reveal', async () => {
  const h = harness();
  const photos = [photo()];
  const reveal = h.revealPhotos(photos, layerFor(photos), h.controller.signal);
  h.controller.abort();
  photos[0].img.load();
  await reveal;
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(photos[0].classList.contains('is-visible'), false);
});

test('reopening the same card cannot reveal photos from the previous session', async () => {
  for (const phase of ['before-frames', 'before-delay']) {
    const h = harness({ delays: [50] });
    const oldPhotos = [photo()];
    const oldReveal = h.revealPhotos(oldPhotos, layerFor(oldPhotos), h.controller.signal);
    oldPhotos[0].img.load();
    await oldReveal;
    if (phase === 'before-delay') { h.frame(); h.frame(); }
    // Even when a callback is already queued, session identity must prevent it
    // from targeting old nodes after the user reopens the very same card.
    const freshController = new AbortController();
    h.setSession(freshController, h.card);
    const newPhotos = [photo()];
    const newReveal = h.revealPhotos(newPhotos, layerFor(newPhotos), freshController.signal);
    newPhotos[0].img.load();
    await newReveal;
    h.frame();
    h.frame();
    h.advance(50);
    assert.equal(oldPhotos[0].classList.contains('is-visible'), false, phase);
    assert.equal(newPhotos[0].classList.contains('is-visible'), true, phase);
  }
});

test('closing after paint but before the delayed entry also cancels reveal', async () => {
  const h = harness({ delays: [50] });
  const photos = [photo()];
  const reveal = h.revealPhotos(photos, layerFor(photos), h.controller.signal);
  photos[0].img.load();
  await reveal;
  h.frame();
  h.frame();
  h.root.classList.add('is-closing');
  h.advance(50);
  assert.equal(photos[0].classList.contains('is-visible'), false);
});

test('picture sources precede src; touch tablets keep small assets even with a trackpad', () => {
  const h = harness();
  const picture = h.createPicture('course4', 7, '節奏練習');
  const [touch, large, small, img] = picture.children;
  assert.deepEqual(picture.children.map((item) => item.tagName), ['SOURCE', 'SOURCE', 'SOURCE', 'IMG']);
  assert.equal(touch.type, 'image/webp');
  assert.equal(touch.media, '(any-pointer: coarse)');
  assert.equal(touch.srcset, './course-photo/course4-7_360.webp');
  assert.equal(large.type, 'image/webp');
  assert.equal(large.srcset, './course-photo/course4-7_1200.webp');
  assert.equal(large.media, '(min-width: 1200px) and (hover: hover) and (pointer: fine)');
  assert.equal(small.srcset, './course-photo/course4-7_360.webp');
  assert.equal(small.media, undefined, 'The smaller source remains available to wide touch tablets');
  assert.equal(img.src, './course-photo/course4-7.jpg');
  assert.equal(img.loading, 'eager');
  assert.equal(img.decoding, 'async');
  const srcWrites = h.pictureLog.filter((entry) => entry.type === 'src');
  assert.equal(srcWrites.length, 1);
  assert.deepEqual(srcWrites[0].siblings, [touch, large, small, img]);
  assert.equal(h.pictureLog.at(-1), srcWrites[0]);
});

(() => {
  const grid = document.querySelector('.course-grid');
  if (!grid) return;

  const body = document.body;
  const cards = Array.from(grid.querySelectorAll('.course-card'));
  const PHOTO_POOL_SIZE = 12;
  const CLOSE_DURATION_MS = 650;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeCard = null;
  let overlayRoot = null;
  let floatingTitle = null;
  let enterTimers = [];
  let isTransitioning = false;
  let layoutFrame = null;
  let backgroundState = [];
  let hadScrollLock = false;
  let hadPageScrollLock = false;
  let scrollPosition = { x: 0, y: 0 };
  let photoSeeds = [];
  let photoIndexes = [];
  let closeAnimations = [];
  let photoLoadController = null;

  const clearTimers = () => {
    enterTimers.forEach((timerId) => window.clearTimeout(timerId));
    enterTimers = [];
    if (layoutFrame !== null) {
      window.cancelAnimationFrame(layoutFrame);
      layoutFrame = null;
    }
  };

  const isolateBackground = () => {
    backgroundState = Array.from(body.children)
      .filter((element) => element !== overlayRoot && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
      .map((element) => ({ element, inert: element.inert }));
    backgroundState.forEach(({ element }) => { element.inert = true; });
  };

  const restoreBackground = () => {
    backgroundState.forEach(({ element, inert }) => { element.inert = inert; });
    backgroundState = [];
  };

  const sampleIndexes = (count, poolSize = PHOTO_POOL_SIZE) => {
    const pool = Array.from({ length: poolSize }, (_, index) => index + 1);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (count <= pool.length) return pool.slice(0, count);

    const result = [...pool];
    while (result.length < count) {
      result.push(pool[result.length % pool.length]);
    }
    return result;
  };

  const getCardData = (card) => {
    const title = card.querySelector('.card-title')?.textContent?.trim() || '';
    const fallbackDesc = card.querySelector('.card-desc')?.textContent?.trim() || '';
    const detail = card.dataset.detail?.trim() || fallbackDesc;
    return {
      key: card.dataset.key || 'course1',
      title,
      detail,
    };
  };

  const ensureOverlay = () => {
    if (overlayRoot) return overlayRoot;

    overlayRoot = document.createElement('div');
    overlayRoot.className = 'course-experience-root';
    overlayRoot.setAttribute('hidden', '');
    overlayRoot.setAttribute('role', 'dialog');
    overlayRoot.setAttribute('tabindex', '-1');
    overlayRoot.setAttribute('aria-modal', 'true');
    overlayRoot.setAttribute('aria-labelledby', 'course-experience-title');
    overlayRoot.innerHTML = `
      <div class="course-experience-bg"></div>
      <h2 id="course-experience-title" class="sr-only"></h2>
      <div class="course-experience-stage">
        <div class="course-experience-copy">
          <div class="course-experience-title-slot" aria-hidden="true"></div>
          <div class="course-experience-body" role="region" aria-label="課程介紹內容" tabindex="0">
            <div class="course-experience-description"></div>
          </div>
        </div>
        <div class="course-experience-photos" aria-hidden="true"></div>
      </div>
    `;

    overlayRoot.addEventListener('click', (event) => {
      event.stopPropagation();
      closeOverlay();
    });
    body.appendChild(overlayRoot);
    return overlayRoot;
  };

  const createPicture = (key, index, title) => {
    const picture = document.createElement('picture');

    const touch = document.createElement('source');
    touch.type = 'image/webp';
    touch.media = '(any-pointer: coarse)';
    touch.srcset = `./course-photo/${key}-${index}_360.webp`;

    const large = document.createElement('source');
    large.type = 'image/webp';
    // Album prints are small: touch devices do not need 1200px downloads.
    large.media = '(min-width: 1200px) and (hover: hover) and (pointer: fine)';
    large.srcset = `./course-photo/${key}-${index}_1200.webp`;

    const small = document.createElement('source');
    small.type = 'image/webp';
    small.srcset = `./course-photo/${key}-${index}_360.webp`;

    const img = document.createElement('img');
    img.alt = `${title} ${index}`;
    img.loading = 'eager';
    img.decoding = 'async';

    // Keep iPads on the small source even when a trackpad is connected.
    picture.appendChild(touch);
    picture.appendChild(large);
    picture.appendChild(small);
    picture.appendChild(img);
    // Assemble <picture> before setting src, avoiding an original JPG request
    // before the browser can select the lightweight WebP source.
    img.src = `./course-photo/${key}-${index}.jpg`;
    return picture;
  };

  const waitForPhoto = (img, signal) => new Promise((resolve) => {
    let finished = false;
    let decoding = false;
    let decodeTimer = null;
    let loadTimer = null;
    const finish = (ready) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(loadTimer);
      window.clearTimeout(decodeTimer);
      img.removeEventListener('load', loaded);
      img.removeEventListener('error', failed);
      signal.removeEventListener('abort', failed);
      resolve(ready);
    };
    const failed = () => finish(false);
    const loaded = () => {
      if (finished || decoding) return;
      if (!img.naturalWidth) return failed();
      decoding = true;
      window.clearTimeout(loadTimer);
      if (typeof img.decode !== 'function') return finish(true);
      // A successful load is the fallback if WebKit stalls or rejects decode.
      // Never reveal an image merely because a decoding promise rejected.
      const loadedSuccessfully = () => finish(img.complete && img.naturalWidth > 0);
      decodeTimer = window.setTimeout(loadedSuccessfully, 600);
      Promise.resolve().then(() => img.decode()).then(loadedSuccessfully, loadedSuccessfully);
    };
    img.addEventListener('load', loaded);
    img.addEventListener('error', failed);
    signal.addEventListener('abort', failed, { once: true });
    loadTimer = window.setTimeout(failed, 12000);
    if (signal.aborted) return failed();
    if (img.complete && img.currentSrc) loaded();
  });

  const revealPhotos = async (photos, photoLayer, signal) => {
    const ready = await Promise.all(photos.map((item) => waitForPhoto(item.querySelector('img'), signal)));
    const stillOpen = () => (
      !signal.aborted && photoLoadController?.signal === signal && activeCard &&
      !overlayRoot.classList.contains('is-closing') && photoLayer.contains(photos[0])
    );
    if (!stillOpen()) return;
    photos.forEach((item, index) => {
      if (!ready[index]) {
        item.dataset.failed = 'true';
        item.hidden = true;
      }
    });
    const reveal = () => {
      if (!stillOpen()) return;
      photos.forEach((item, index) => {
        if (!ready[index]) return;
        const show = () => {
          if (stillOpen()) item.classList.add('is-visible');
        };
        if (reducedMotion.matches) show();
        else enterTimers.push(window.setTimeout(show, photoSeeds[index].delay));
      });
    };
    // Flush the starting transforms, then give WebKit a painted frame before
    // changing classes. Cached images must animate just like first-time loads.
    photos.filter((item) => !item.hidden).forEach((item) => { window.getComputedStyle(item).transform; });
    window.requestAnimationFrame(() => {
      if (!stillOpen()) return;
      window.requestAnimationFrame(reveal);
    });
  };

  const pickPositions = (titleRect, contentRect) => {
    const width = overlayRoot.clientWidth;
    const height = overlayRoot.clientHeight;
    const compact = width <= 500 && height <= 520;
    const count = compact ? 6 : PHOTO_POOL_SIZE;
    const margin = width <= 700 ? 12 : 20;
    const gap = width <= 700 ? 18 : 26;
    const blocked = {
      left: Math.min(titleRect.left, contentRect.left) - gap,
      right: Math.max(titleRect.right, contentRect.right) + gap,
      top: Math.min(titleRect.top, contentRect.top) - gap,
      bottom: Math.max(titleRect.bottom, contentRect.bottom) + gap,
    };
    const baseWidth = compact
      ? Math.min(104, width * .3)
      : width <= 700
        ? Math.min(150, width * .3)
        : height <= 520
          ? Math.min(142, height * .27)
          : Math.min(240, Math.max(160, width * .155));
    const placements = [];

    for (let index = 0; index < count; index += 1) {
      const seed = photoSeeds[index];
      const photoWidth = baseWidth * seed.size;
      const photoHeight = photoWidth * seed.aspect;
      const angle = seed.rotate * Math.PI / 180;
      const boundWidth = Math.abs(Math.cos(angle)) * photoWidth + Math.abs(Math.sin(angle)) * photoHeight;
      const boundHeight = Math.abs(Math.sin(angle)) * photoWidth + Math.abs(Math.cos(angle)) * photoHeight;
      const minX = margin + boundWidth / 2;
      const maxX = width - margin - boundWidth / 2;
      const minY = margin + boundHeight / 2;
      const maxY = height - margin - boundHeight / 2;
      let state = seed.random;
      const random = () => {
        state |= 0;
        state = state + 0x6D2B79F5 | 0;
        let value = Math.imul(state ^ state >>> 15, 1 | state);
        value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
      let best = null;
      let bestScore = -Infinity;

      // Sample the whole canvas, with no rows, columns, or repeating anchors.
      // Permit gentle overlaps between photos, while always protecting the text.
      for (const overlapLimit of [.26, .42, .58, .72]) {
        for (let attempt = 0; attempt < 150; attempt += 1) {
          const x = minX + random() * (maxX - minX);
          const y = minY + random() * (maxY - minY);
          const rect = {
            left: x - boundWidth / 2, right: x + boundWidth / 2,
            top: y - boundHeight / 2, bottom: y + boundHeight / 2,
          };
          if (rect.left < margin || rect.right > width - margin || rect.top < margin || rect.bottom > height - margin) continue;
          if (rect.left < blocked.right && rect.right > blocked.left && rect.top < blocked.bottom && rect.bottom > blocked.top) continue;

          let overlap = 0;
          let closest = 3;
          for (const other of placements) {
            const overlapWidth = Math.max(0, Math.min(rect.right, other.rect.right) - Math.max(rect.left, other.rect.left));
            const overlapHeight = Math.max(0, Math.min(rect.bottom, other.rect.bottom) - Math.max(rect.top, other.rect.top));
            const smallerArea = Math.min(boundWidth * boundHeight, other.boundWidth * other.boundHeight);
            overlap = Math.max(overlap, overlapWidth * overlapHeight / smallerArea);
            closest = Math.min(closest, Math.hypot(x - other.x, y - other.y) / ((photoWidth + other.width) / 2));
          }
          if (overlap > overlapLimit) continue;
          const score = Math.min(closest, 2) * .5 - overlap * 1.8 + random() * .85;
          if (score > bestScore) {
            bestScore = score;
            best = { x, y, rect };
          }
        }
        if (best) break;
      }
      if (!best) continue;

      placements.push({
        ...best, boundWidth, boundHeight,
        width: photoWidth, height: photoHeight,
        rotate: `${seed.rotate}deg`,
        enterRotate: `${seed.rotate - 24 - seed.x * 20}deg`,
        throwX: `${-best.x - photoWidth * 1.5 - 80}px`,
        throwY: `${seed.y * height * .3}px`,
        leaveX: `${width - best.x + photoWidth * 1.5 + 80}px`,
        leaveY: `${seed.y * 44}px`,
        delay: seed.delay,
        duration: seed.duration,
        layer: seed.layer,
      });
    }
    return placements;
  };

  const populatePhotos = (key, title) => {
    if (!overlayRoot) return;
    const photoLayer = overlayRoot.querySelector('.course-experience-photos');
    const contentBox = overlayRoot.querySelector('.course-experience-body');
    const titleSlot = overlayRoot.querySelector('.course-experience-title-slot');
    const isNewAlbum = photoLayer.children.length === 0;
    if (isNewAlbum) {
      photoIndexes.forEach((photoIndex) => {
        const item = document.createElement('div');
        item.className = 'course-experience-photo';
        item.appendChild(createPicture(key, photoIndex, title));
        photoLayer.appendChild(item);
      });
    }
    const photos = Array.from(photoLayer.children);
    const placements = pickPositions(titleSlot.getBoundingClientRect(), contentBox.getBoundingClientRect());

    placements.forEach((placement, index) => {
      const item = photos[index];
      item.hidden = item.dataset.failed === 'true';
      item.style.left = `${placement.x}px`;
      item.style.top = `${placement.y}px`;
      item.style.width = `${placement.width}px`;
      item.style.height = `${placement.height}px`;
      item.style.zIndex = placement.layer;
      item.style.setProperty('--photo-enter-duration', `${placement.duration}ms`);
      item.style.setProperty('--photo-rotate', placement.rotate);
      item.style.setProperty('--photo-enter-rotate', placement.enterRotate);
      item.style.setProperty('--photo-throw-x', placement.throwX);
      item.style.setProperty('--photo-throw-y', placement.throwY);
      item.style.setProperty('--photo-leave-x', placement.leaveX);
      item.style.setProperty('--photo-leave-y', placement.leaveY);
    });
    photos.slice(placements.length).forEach((item) => { item.hidden = true; });
    if (isNewAlbum) revealPhotos(photos, photoLayer, photoLoadController.signal);
  };

  const syncFloatingTitleToSlot = () => {
    const titleSlot = overlayRoot?.querySelector('.course-experience-title-slot');
    if (!floatingTitle || !titleSlot) return;
    const slotRect = titleSlot.getBoundingClientRect();
    floatingTitle.style.left = `${slotRect.left + slotRect.width / 2}px`;
    floatingTitle.style.top = `${slotRect.top + slotRect.height / 2}px`;
    floatingTitle.style.width = `${slotRect.width}px`;
  };

  const relayoutOverlay = () => {
    if (!activeCard || !overlayRoot?.classList.contains('is-open') || layoutFrame !== null) return;
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = null;
      if (!activeCard || !overlayRoot.classList.contains('is-open')) return;
      syncFloatingTitleToSlot();
      const { key, title } = getCardData(activeCard);
      populatePhotos(key, title);
    });
  };

  const syncFloatingTitleToSource = (sourceTitle) => {
    if (!floatingTitle || !sourceTitle) return;

    const sourceRect = sourceTitle.getBoundingClientRect();
    floatingTitle.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
    floatingTitle.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
    floatingTitle.style.width = `${Math.max(sourceRect.width + 28, 180)}px`;
  };

  const cleanupOverlay = () => {
    clearTimers();
    photoLoadController?.abort();
    photoLoadController = null;
    closeAnimations.forEach((animation) => animation.cancel());
    closeAnimations = [];
    photoSeeds = [];
    photoIndexes = [];
    if (floatingTitle) {
      floatingTitle.remove();
      floatingTitle = null;
    }

    if (overlayRoot) {
      overlayRoot.setAttribute('hidden', '');
      overlayRoot.classList.remove('is-open', 'is-closing');
      const descNode = overlayRoot.querySelector('.course-experience-description');
      const photoLayer = overlayRoot.querySelector('.course-experience-photos');
      if (descNode) descNode.innerHTML = '';
      if (photoLayer) photoLayer.innerHTML = '';
    }

    restoreBackground();
    body.classList.remove('course-experience-open');
    if (!hadPageScrollLock) document.documentElement.classList.remove('course-experience-open');
    if (!hadScrollLock) body.classList.remove('no-scroll');
    window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'instant' });

    if (activeCard) {
      activeCard.classList.remove('is-source-hidden');
      activeCard.setAttribute('aria-expanded', 'false');
      activeCard.focus({ preventScroll: true });
    }

    activeCard = null;
    isTransitioning = false;
  };

  const closeOverlay = () => {
    if (!overlayRoot || !activeCard || overlayRoot.classList.contains('is-closing')) return;
    isTransitioning = true;
    clearTimers();
    photoLoadController?.abort();

    // Capture current positions first, including photos still flying in.
    const photos = Array.from(overlayRoot.querySelectorAll('.course-experience-photo:not([hidden])'));
    const states = photos.map((photo) => {
      const style = window.getComputedStyle(photo);
      return { transform: style.transform, opacity: style.opacity };
    });
    overlayRoot.classList.add('is-closing');
    overlayRoot.classList.remove('is-open');
    if (reducedMotion.matches) {
      cleanupOverlay();
      return;
    }
    closeAnimations = photos.map((photo, index) => {
      photo.style.transition = 'none';
      const x = photo.style.getPropertyValue('--photo-leave-x');
      const y = photo.style.getPropertyValue('--photo-leave-y');
      const rotate = parseFloat(photo.style.getPropertyValue('--photo-rotate')) + 12;
      return photo.animate([
        states[index],
        { opacity: states[index].opacity, offset: .82 },
        { transform: `translate(calc(-50% + ${x}), calc(-50% + ${y})) rotate(${rotate}deg)`, opacity: 0 },
      ], {
        duration: CLOSE_DURATION_MS,
        easing: 'cubic-bezier(.55, 0, .85, .35)',
        fill: 'forwards',
      });
    });
    // Sweep every frame together, and remove the dialog only after they all finish.
    Promise.allSettled(closeAnimations.map((animation) => animation.finished)).then(cleanupOverlay);
  };

  const openOverlay = (card) => {
    if (activeCard || isTransitioning) return;

    const sourceTitle = card.querySelector('.card-title');
    if (!sourceTitle) return;

    const { key, title, detail } = getCardData(card);
    const root = ensureOverlay();
    const descNode = root.querySelector('.course-experience-description');
    const titleSlot = root.querySelector('.course-experience-title-slot');
    const accessibleTitle = root.querySelector('#course-experience-title');
    if (!descNode || !titleSlot || !accessibleTitle) return;

    clearTimers();
    isTransitioning = true;
    activeCard = card;
    photoLoadController = new AbortController();
    photoSeeds = Array.from({ length: PHOTO_POOL_SIZE }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      rotate: Math.random() * 28 - 14,
      size: .88 + Math.random() * .26,
      aspect: .68 + Math.random() * .18,
      random: Math.floor(Math.random() * 4294967296),
      delay: 35 + Math.random() * 380,
      duration: 820 + Math.random() * 330,
      layer: Math.floor(Math.random() * PHOTO_POOL_SIZE),
    }));
    photoIndexes = sampleIndexes(PHOTO_POOL_SIZE);
    card.classList.add('is-source-hidden');
    card.setAttribute('aria-expanded', 'true');
    accessibleTitle.textContent = title;

    descNode.innerHTML = '';
    detail.split('\n').filter(Boolean).forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line.trim();
      descNode.appendChild(paragraph);
    });

    hadScrollLock = body.classList.contains('no-scroll');
    hadPageScrollLock = document.documentElement.classList.contains('course-experience-open');
    scrollPosition = { x: window.scrollX, y: window.scrollY };
    document.documentElement.classList.add('course-experience-open');
    body.classList.add('course-experience-open', 'no-scroll');
    root.removeAttribute('hidden');
    root.querySelector('.course-experience-body').scrollTop = 0;
    root.focus({ preventScroll: true });
    isolateBackground();

    floatingTitle = document.createElement('div');
    floatingTitle.className = 'course-floating-title';
    floatingTitle.textContent = title;
    floatingTitle.setAttribute('aria-hidden', 'true');
    root.appendChild(floatingTitle);

    syncFloatingTitleToSource(sourceTitle);
    populatePhotos(key, title);

    requestAnimationFrame(() => {
      if (activeCard !== card || root.classList.contains('is-closing')) return;
      requestAnimationFrame(() => {
        if (activeCard !== card || root.classList.contains('is-closing')) return;
        syncFloatingTitleToSlot();
        root.classList.add('is-open');

        isTransitioning = false;
      });
    });
  };

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.course-card');
    if (!card) return;
    event.preventDefault();
    openOverlay(card);
  });

  grid.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.course-card');
    if (!card) return;
    event.preventDefault();
    openOverlay(card);
  });

  document.addEventListener('keydown', (event) => {
    if (!activeCard || !overlayRoot) return;

    if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') && event.target === overlayRoot)) {
      event.preventDefault();
      closeOverlay();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(overlayRoot.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => (
        !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
        element.getClientRects().length > 0 &&
        window.getComputedStyle(element).visibility !== 'hidden'
      ));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === overlayRoot || !overlayRoot.contains(document.activeElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !overlayRoot.contains(document.activeElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }
  });

  window.addEventListener('resize', relayoutOverlay);
  window.visualViewport?.addEventListener('resize', relayoutOverlay);

  const palette = ['41,115,255', '255,24,74', '0,198,90', '246,232,98'];
  const washOrder = sampleIndexes(4, 4).map((index) => palette[index - 1]);
  cards.forEach((card, index) => {
    const colors = [washOrder[index % 4], palette[Math.floor(Math.random() * 4)], palette[Math.floor(Math.random() * 4)]];
    colors.forEach((color, spot) => {
      card.style.setProperty(`--wash-${spot + 1}-rgb`, color);
      card.style.setProperty(`--wash-${spot + 1}-x`, `${-10 + Math.random() * 120}%`);
      card.style.setProperty(`--wash-${spot + 1}-y`, `${52 + Math.random() * 65}%`);
    });
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-expanded', 'false');
  });
})();

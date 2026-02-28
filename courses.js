(() => {
  const grid = document.querySelector('.course-grid');
  if (!grid) return;

  const body = document.body;
  const cards = Array.from(grid.querySelectorAll('.course-card'));
  const PHOTO_POOL_SIZE = 12;
  const PHOTO_COUNT_DESKTOP = 22;
  const PHOTO_COUNT_MOBILE = 20;
  const PHOTO_ENTER_BASE_DELAY = 120;
  const PHOTO_ENTER_STAGGER = 42;
  const CLOSE_DURATION_MS = 420;

  let activeCard = null;
  let overlayRoot = null;
  let floatingTitle = null;
  let closeTimer = null;
  let enterTimers = [];
  let isTransitioning = false;

  const clearTimers = () => {
    enterTimers.forEach((timerId) => window.clearTimeout(timerId));
    enterTimers = [];
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const sampleIndexes = (count) => {
    const pool = Array.from({ length: PHOTO_POOL_SIZE }, (_, index) => index + 1);
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

  const rectsOverlap = (a, b, padding = 0) => (
    a.left < b.right + padding &&
    a.right > b.left - padding &&
    a.top < b.bottom + padding &&
    a.bottom > b.top - padding
  );

  const rectArea = (rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);

  const overlapArea = (a, b) => {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
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
    overlayRoot.setAttribute('aria-modal', 'true');
    overlayRoot.innerHTML = `
      <div class="course-experience-bg"></div>
      <div class="course-experience-stage">
        <div class="course-experience-copy">
          <div class="course-experience-title-slot" aria-hidden="true"></div>
          <div class="course-experience-body">
            <div class="course-experience-description"></div>
          </div>
        </div>
        <div class="course-experience-photos" aria-hidden="true"></div>
      </div>
    `;

    body.appendChild(overlayRoot);
    return overlayRoot;
  };

  const createPicture = (key, index, title) => {
    const picture = document.createElement('picture');

    const large = document.createElement('source');
    large.type = 'image/webp';
    large.media = '(min-width: 800px)';
    large.srcset = `./course-photo/${key}-${index}_1200.webp`;

    const small = document.createElement('source');
    small.type = 'image/webp';
    small.srcset = `./course-photo/${key}-${index}_360.webp`;

    const img = document.createElement('img');
    img.src = `./course-photo/${key}-${index}.jpg`;
    img.alt = `${title} ${index}`;
    img.loading = 'lazy';
    img.decoding = 'async';

    picture.appendChild(large);
    picture.appendChild(small);
    picture.appendChild(img);
    return picture;
  };

  const insetRect = (rect, padding) => ({
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding,
  });

  const expandRect = (rect, paddings) => ({
    left: rect.left - paddings.left,
    right: rect.right + paddings.right,
    top: rect.top - paddings.top,
    bottom: rect.bottom + paddings.bottom,
  });

  const buildZones = (viewportWidth, viewportHeight, titleRect, contentRect) => {
    const isMobile = viewportWidth <= 700;
    const gutter = isMobile ? 12 : 24;
    const minZoneWidth = isMobile ? 92 : 136;
    const headerBottom = Math.max(titleRect.bottom, contentRect.top - (isMobile ? 12 : 28));
    const lowerStart = isMobile ? contentRect.bottom - 6 : contentRect.bottom + 24;

    return [
      {
        name: 'top-left',
        left: gutter,
        right: Math.max(gutter + minZoneWidth, titleRect.left - (isMobile ? 10 : 18)),
        top: gutter,
        bottom: Math.max(gutter + 84, headerBottom),
      },
      {
        name: 'top-right',
        left: Math.min(viewportWidth - gutter - minZoneWidth, titleRect.right + (isMobile ? 10 : 18)),
        right: viewportWidth - gutter,
        top: gutter,
        bottom: Math.max(gutter + 84, headerBottom),
      },
      {
        name: 'left',
        left: gutter,
        right: Math.max(gutter + minZoneWidth, contentRect.left - (isMobile ? 10 : 18)),
        top: Math.max(gutter + 72, isMobile ? titleRect.bottom + 10 : titleRect.top + 60),
        bottom: Math.min(viewportHeight - gutter, contentRect.bottom + (isMobile ? 54 : 68)),
      },
      {
        name: 'right',
        left: Math.min(viewportWidth - gutter - minZoneWidth, contentRect.right + (isMobile ? 10 : 18)),
        right: viewportWidth - gutter,
        top: Math.max(gutter + 72, isMobile ? titleRect.bottom + 10 : titleRect.top + 60),
        bottom: Math.min(viewportHeight - gutter, contentRect.bottom + (isMobile ? 54 : 68)),
      },
      {
        name: 'bottom',
        left: gutter,
        right: viewportWidth - gutter,
        top: Math.max(lowerStart, headerBottom + (isMobile ? 10 : 24)),
        bottom: viewportHeight - gutter,
      },
    ];
  };

  const pickPositions = (titleRect, contentRect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth <= 700;
    const count = isMobile ? PHOTO_COUNT_MOBILE : PHOTO_COUNT_DESKTOP;
    const safeTitleRect = isMobile
      ? expandRect(titleRect, { top: 24, right: 24, bottom: 28, left: 24 })
      : insetRect(titleRect, 14);
    const safeContentRect = isMobile
      ? expandRect(contentRect, { top: 14, right: 14, bottom: 18, left: 14 })
      : insetRect(contentRect, 18);
    const blockedRects = [safeTitleRect, safeContentRect];
    const zones = buildZones(viewportWidth, viewportHeight, safeTitleRect, safeContentRect);
    const placements = [];
    const placedRects = [];
    const pattern = isMobile
      ? ['top-left', 'top-right', 'left', 'right', 'bottom', 'top-right', 'top-left', 'left', 'right', 'bottom', 'top-left', 'top-right', 'bottom', 'left', 'right', 'bottom', 'top-right', 'top-left', 'left', 'right', 'bottom', 'bottom']
      : ['top-left', 'top-right', 'left', 'right', 'bottom', 'left', 'right', 'bottom', 'top-left', 'top-right', 'left', 'right', 'bottom', 'left', 'right', 'bottom', 'top-left', 'top-right', 'bottom', 'left', 'right', 'bottom'];

    const buildPlacement = (zone, centerX, centerY, width, height) => {
      const isHeaderZone = zone.name === 'top-left' || zone.name === 'top-right';
      const offsetX = isMobile
        ? (isHeaderZone
          ? -12 + Math.random() * 24
          : zone.name === 'bottom'
            ? -18 + Math.random() * 36
            : -16 + Math.random() * 32)
        : -44 + Math.random() * 88;
      const offsetY = isMobile
        ? (isHeaderZone
          ? 10 + Math.random() * 18
          : zone.name === 'bottom'
            ? -4 + Math.random() * 14
            : -10 + Math.random() * 26)
        : (zone.name === 'bottom' ? 30 + Math.random() * 44 : -28 + Math.random() * 56);

      return {
        zone: zone.name,
        x: centerX,
        y: centerY,
        width,
        height,
        rotate: `${(-18 + Math.random() * 36).toFixed(2)}deg`,
        offsetX: `${offsetX.toFixed(0)}px`,
        offsetY: `${offsetY.toFixed(0)}px`,
        throwX: zone.name === 'left'
          ? `${180 + Math.random() * 160}px`
          : zone.name === 'right'
            ? `${-180 - Math.random() * 160}px`
            : `${-110 + Math.random() * 220}px`,
        throwY: zone.name === 'bottom'
          ? `${-180 - Math.random() * 110}px`
          : `${110 + Math.random() * 140}px`,
        leaveX: zone.name === 'left'
          ? `${-120 - Math.random() * 140}px`
          : zone.name === 'right'
            ? `${120 + Math.random() * 140}px`
            : `${-120 + Math.random() * 240}px`,
        leaveY: `${54 + Math.random() * 120}px`,
        scale: (isMobile ? 0.94 + Math.random() * 0.12 : 0.98 + Math.random() * 0.16).toFixed(3),
      };
    };

    const canPlaceRect = (rect, allowOverlap = false, requireOverlapBand = false) => {
      if (blockedRects.some((blockedRect) => rectsOverlap(rect, blockedRect, 0))) return false;
      if (!allowOverlap) {
        return !placedRects.some((existing) => rectsOverlap(rect, existing, 0));
      }

      let hasBandOverlap = false;
      const isValid = !placedRects.some((existing) => {
        const overlap = overlapArea(rect, existing);
        if (overlap === 0) return false;
        const ratio = overlap / Math.min(rectArea(rect), rectArea(existing));
        if (ratio >= 0.1 && ratio <= 0.2) {
          hasBandOverlap = true;
        }
        return ratio > 0.2;
      });
      if (!isValid) return false;
      if (requireOverlapBand) return hasBandOverlap;
      return true;
    };

    const getSizeRange = (zoneName, densePass = false) => {
      if (zoneName === 'bottom') {
        return isMobile
          ? (densePass ? [76, 118] : [92, 138])
          : (densePass ? [120, 176] : [144, 238]);
      }

      if (zoneName === 'top-left' || zoneName === 'top-right') {
        return isMobile
          ? (densePass ? [60, 86] : [72, 102])
          : (densePass ? [92, 142] : [114, 182]);
      }

      return isMobile
        ? (densePass ? [70, 104] : [84, 124])
        : (densePass ? [110, 170] : [132, 214]);
    };

    const getAspectRatio = (zoneName) => {
      const variants = zoneName === 'bottom'
        ? [0.74, 0.82, 0.92, 1.04]
        : [0.72, 0.8, 0.9, 1.02, 1.16];
      return variants[Math.floor(Math.random() * variants.length)];
    };

    const zoneCounts = new Map();
    const incrementZoneCount = (zoneName) => {
      zoneCounts.set(zoneName, (zoneCounts.get(zoneName) || 0) + 1);
    };

    const getMobileDenseZone = (baseZoneName) => {
      if (!isMobile) return baseZoneName;
      if (baseZoneName !== 'top-left' && baseZoneName !== 'top-right') return baseZoneName;
      const leftCount = zoneCounts.get('top-left') || 0;
      const rightCount = zoneCounts.get('top-right') || 0;
      if (leftCount === rightCount) return baseZoneName;
      return leftCount < rightCount ? 'top-left' : 'top-right';
    };

    for (let i = 0; i < count; i += 1) {
      const zoneName = pattern[i % pattern.length];
      const zone = zones.find((item) => item.name === zoneName) || zones[0];
      const [minWidth, maxWidth] = getSizeRange(zone.name, false);
      const width = Math.round(minWidth + Math.random() * (maxWidth - minWidth));
      const height = Math.round(width * getAspectRatio(zone.name));

      let placed = null;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const minX = zone.left + width / 2;
        const maxX = zone.right - width / 2;
        const minY = zone.top + height / 2;
        const maxY = zone.bottom - height / 2;
        if (minX >= maxX || minY >= maxY) break;

        const centerX = minX + Math.random() * (maxX - minX);
        const centerY = minY + Math.random() * (maxY - minY);
        const rect = {
          left: centerX - width / 2,
          right: centerX + width / 2,
          top: centerY - height / 2,
          bottom: centerY + height / 2,
        };

        if (!canPlaceRect(rect, false)) continue;

        placed = buildPlacement(zone, centerX, centerY, width, height);
        placedRects.push(rect);
        placements.push(placed);
        incrementZoneCount(zone.name);
        break;
      }
    }

    if (placements.length < count) {
      for (let i = placements.length; i < count; i += 1) {
        const zoneName = getMobileDenseZone(pattern[i % pattern.length]);
        const zone = zones.find((item) => item.name === zoneName) || zones[0];
        const [minWidth, maxWidth] = getSizeRange(zone.name, true);
        const width = Math.round(minWidth + Math.random() * (maxWidth - minWidth));
        const height = Math.round(width * getAspectRatio(zone.name));

        let placed = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const minX = Math.max(zone.left + width / 2, 16 + width / 2);
          const maxX = Math.min(zone.right - width / 2, viewportWidth - 16 - width / 2);
          const minY = Math.max(zone.top + height / 2, 16 + height / 2);
          const maxY = Math.min(zone.bottom - height / 2, viewportHeight - 16 - height / 2);
          if (minX >= maxX || minY >= maxY) break;

          const centerX = minX + Math.random() * (maxX - minX);
          const centerY = minY + Math.random() * (maxY - minY);
          const rect = {
            left: centerX - width / 2,
            right: centerX + width / 2,
            top: centerY - height / 2,
            bottom: centerY + height / 2,
          };

          const requireBand = isMobile && attempt < 72;
          if (!canPlaceRect(rect, true, requireBand)) continue;

          placedRects.push(rect);
          placements.push(buildPlacement(zone, centerX, centerY, width, height));
          incrementZoneCount(zone.name);
          placed = true;
          break;
        }

        if (placed) continue;

        const progress = i / Math.max(1, count - 1);
        const angleDeg = 138 + progress * 264;
        const angle = (angleDeg * Math.PI) / 180;
        const anchorRect = {
          left: Math.min(safeTitleRect.left, safeContentRect.left),
          right: Math.max(safeTitleRect.right, safeContentRect.right),
          top: safeTitleRect.top,
          bottom: safeContentRect.bottom,
          width: Math.max(safeTitleRect.right, safeContentRect.right) - Math.min(safeTitleRect.left, safeContentRect.left),
          height: safeContentRect.bottom - safeTitleRect.top,
        };
        const radiusX = (anchorRect.width / 2) + (isMobile ? 96 : 162) + Math.random() * (isMobile ? 28 : 54);
        const radiusY = (anchorRect.height / 2) + (isMobile ? 78 : 128) + Math.random() * (isMobile ? 22 : 42);
        const centerX = Math.min(
          viewportWidth - 20,
          Math.max(20, anchorRect.left + anchorRect.width / 2 + Math.cos(angle) * radiusX),
        );
        const centerY = Math.min(
          viewportHeight - 20,
          Math.max(20, anchorRect.top + anchorRect.height / 2 + Math.sin(angle) * radiusY),
        );
        const fallbackZone = angleDeg < 200 ? zones[0] : angleDeg < 250 ? zones[2] : angleDeg < 320 ? zones[4] : zones[1];
        const fallbackWidth = Math.round((isMobile ? 82 : 124) + Math.random() * (isMobile ? 24 : 44));
        const fallbackHeight = Math.round(fallbackWidth * getAspectRatio(fallbackZone.name));
        const fallbackRect = {
          left: centerX - fallbackWidth / 2,
          right: centerX + fallbackWidth / 2,
          top: centerY - fallbackHeight / 2,
          bottom: centerY + fallbackHeight / 2,
        };
        if (!canPlaceRect(fallbackRect, true, false)) continue;

        placedRects.push(fallbackRect);
        placements.push(buildPlacement(
          fallbackZone,
          centerX,
          centerY,
          fallbackWidth,
          fallbackHeight,
        ));
        incrementZoneCount(fallbackZone.name);
      }
    }

    return placements;
  };

  const populatePhotos = (key, title) => {
    if (!overlayRoot) return;

    const photoLayer = overlayRoot.querySelector('.course-experience-photos');
    const contentBox = overlayRoot.querySelector('.course-experience-body');
    const titleSlot = overlayRoot.querySelector('.course-experience-title-slot');
    if (!photoLayer || !contentBox || !titleSlot) return;

    photoLayer.innerHTML = '';
    const contentRect = contentBox.getBoundingClientRect();
    const titleRect = titleSlot.getBoundingClientRect();
    const placements = pickPositions(titleRect, contentRect);
    const indexes = sampleIndexes(placements.length);

    placements.forEach((placement, index) => {
      const item = document.createElement('div');
      item.className = 'course-experience-photo';
      item.style.left = `${placement.x}px`;
      item.style.top = `${placement.y}px`;
      item.style.width = `${placement.width}px`;
      item.style.height = `${placement.height}px`;
      item.style.setProperty('--photo-rotate', placement.rotate);
      item.style.setProperty('--photo-offset-x', placement.offsetX);
      item.style.setProperty('--photo-offset-y', placement.offsetY);
      item.style.setProperty('--photo-throw-x', placement.throwX);
      item.style.setProperty('--photo-throw-y', placement.throwY);
      item.style.setProperty('--photo-leave-x', placement.leaveX);
      item.style.setProperty('--photo-leave-y', placement.leaveY);
      item.style.setProperty('--photo-scale', placement.scale);
      item.appendChild(createPicture(key, indexes[index] || 1, title));
      photoLayer.appendChild(item);

      const timerId = window.setTimeout(() => {
        item.classList.add('is-visible');
      }, PHOTO_ENTER_BASE_DELAY + index * PHOTO_ENTER_STAGGER);
      enterTimers.push(timerId);
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

    if (activeCard) activeCard.classList.remove('is-source-hidden');

    body.classList.remove('course-experience-open', 'no-scroll');
    activeCard = null;
    isTransitioning = false;
  };

  const closeOverlay = () => {
    if (!overlayRoot || !activeCard || isTransitioning) return;
    isTransitioning = true;
    clearTimers();

    const sourceTitle = activeCard.querySelector('.card-title');
    syncFloatingTitleToSource(sourceTitle);
    overlayRoot.querySelectorAll('.course-experience-photo').forEach((photo, index) => {
      const timerId = window.setTimeout(() => {
        photo.classList.add('is-leaving');
        photo.classList.remove('is-visible');
      }, index * 18);
      enterTimers.push(timerId);
    });
    overlayRoot.classList.add('is-closing');
    overlayRoot.classList.remove('is-open');

    closeTimer = window.setTimeout(() => {
      cleanupOverlay();
    }, CLOSE_DURATION_MS);
  };

  const openOverlay = (card) => {
    if (activeCard || isTransitioning) return;

    const sourceTitle = card.querySelector('.card-title');
    if (!sourceTitle) return;

    const { key, title, detail } = getCardData(card);
    const root = ensureOverlay();
    const descNode = root.querySelector('.course-experience-description');
    const titleSlot = root.querySelector('.course-experience-title-slot');
    if (!descNode || !titleSlot) return;

    clearTimers();
    isTransitioning = true;
    activeCard = card;
    card.classList.add('is-source-hidden');

    descNode.innerHTML = '';
    detail.split('\n').filter(Boolean).forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line.trim();
      descNode.appendChild(paragraph);
    });

    body.classList.add('course-experience-open', 'no-scroll');
    root.removeAttribute('hidden');

    floatingTitle = document.createElement('div');
    floatingTitle.className = 'course-floating-title';
    floatingTitle.textContent = title;
    root.appendChild(floatingTitle);

    syncFloatingTitleToSource(sourceTitle);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const slotRect = titleSlot.getBoundingClientRect();
        floatingTitle.style.left = `${slotRect.left + slotRect.width / 2}px`;
        floatingTitle.style.top = `${slotRect.top + slotRect.height / 2}px`;
        floatingTitle.style.width = `${slotRect.width}px`;
        root.classList.add('is-open');

        const photoTimer = window.setTimeout(() => {
          populatePhotos(key, title);
          isTransitioning = false;
        }, 180);
        enterTimers.push(photoTimer);
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
    if (event.key === 'Escape' && activeCard) {
      event.preventDefault();
      closeOverlay();
    }
  });

  window.addEventListener('resize', () => {
    if (!activeCard) return;
    if (isTransitioning) {
      cleanupOverlay();
      return;
    }
    closeOverlay();
  });

  document.addEventListener('click', (event) => {
    if (!activeCard || !overlayRoot || isTransitioning) return;
    if (!overlayRoot.contains(event.target)) return;
    closeOverlay();
  }, { capture: true });
})();

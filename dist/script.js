const yearNode = document.getElementById('y');
if (yearNode) yearNode.textContent = new Date().getFullYear();

(() => {
  const panels = document.querySelectorAll('section.panel');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealAll = () => panels.forEach((panel) => panel.classList.add('in-view'));
  if (!('IntersectionObserver' in window) || reducedMotion.matches) {
    revealAll();
    return;
  }

  // Reveal once at the leading edge so tall mobile biographies stay readable.
  const panelObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      panelObserver.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  panels.forEach((panel) => panelObserver.observe(panel));
  reducedMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    panelObserver.disconnect();
    revealAll();
  });
})();

const body = document.body;

function openOverlay(overlayId, templateId, triggerBtn) {
  const overlay = document.getElementById(overlayId);
  const template = document.getElementById(templateId);
  if (!overlay || !template || !overlay.hidden) return;

  const content = overlay.querySelector('#overlay-content');
  if (!content) return;

  content.innerHTML = '';
  content.appendChild(template.content.cloneNode(true));

  const returnFocus = triggerBtn || document.activeElement;
  const backgroundState = new Map();
  const hadModalClass = body.classList.contains('modal-open');
  let overlayBranch = overlay;
  while (overlayBranch.parentElement) {
    Array.from(overlayBranch.parentElement.children).forEach((element) => {
      if (element === overlayBranch || !(element instanceof HTMLElement)
        || element.matches('script, style, link, template')) return;
      backgroundState.set(element, element.inert);
      element.inert = true;
    });
    if (overlayBranch.parentElement === body) break;
    overlayBranch = overlayBranch.parentElement;
  }

  const closeOverlay = () => {
    overlay.hidden = true;
    if (!hadModalClass) body.classList.remove('modal-open');
    backgroundState.forEach((wasInert, element) => { element.inert = wasInert; });
    backgroundState.clear();
    if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
    overlay.onkeydown = null;
    overlay.onclick = null;
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected
      && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
  };

  overlay.hidden = false;
  body.classList.add('modal-open');
  if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');

  const closeButton = overlay.querySelector('.overlay-close');
  if (closeButton) {
    closeButton.focus({ preventScroll: true });
    closeButton.onclick = closeOverlay;
  }

  overlay.onkeydown = (event) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0
      && !element.closest('[inert], [aria-hidden="true"]')
      && getComputedStyle(element).visibility !== 'hidden');

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!focusable.includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  overlay.onclick = (event) => {
    if (event.target === overlay) closeOverlay();
  };
}

document.querySelectorAll('.more-bio').forEach((button) => {
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => openOverlay('yang-bio-overlay', 'yang-bio-template', button));
});

document.addEventListener('keydown', (event) => {
  const overlay = document.getElementById('yang-bio-overlay');
  if (!overlay || overlay.hidden) return;
  if (event.key !== 'Escape') return;

  event.preventDefault();
  const closeButton = overlay.querySelector('.overlay-close');
  if (closeButton) closeButton.click();
});

(() => {
  const root = document.documentElement;
  const bg = document.querySelector('.bg-glass');
  if (!bg) return;

  const sections = Array.from(document.querySelectorAll('section.profile-section'));
  if (sections.length === 0) return;

  const readRgbVar = (name) => {
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    const parts = value.split(',').map((part) => parseFloat(part));
    return parts.length === 3 ? parts : [41, 115, 255];
  };

  const colors = {
    yang: readRgbVar('--yang'),
    chou: readRgbVar('--chou'),
    jian: readRgbVar('--jian'),
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let centers = [];
  let measurePending = true;
  let scrollFrame = null;
  let previousColor = '';

  const computeCenters = () => {
    centers = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return {
        key: Object.hasOwn(colors, section.dataset.theme) ? section.dataset.theme : 'yang',
        center: top + rect.height / 2,
      };
    }).sort((a, b) => a.center - b.center);
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];

  const updateTheme = () => {
    scrollFrame = null;
    if (measurePending) {
      computeCenters();
      measurePending = false;
    }
    if (centers.length === 0) return;

    const viewportCenter = window.scrollY + window.innerHeight / 2;
    let color;

    if (reducedMotion.matches) {
      const nearest = centers.reduce((best, current) =>
        Math.abs(current.center - viewportCenter) < Math.abs(best.center - viewportCenter) ? current : best);
      color = colors[nearest.key];
    } else if (viewportCenter <= centers[0].center) {
      color = colors[centers[0].key];
    } else if (viewportCenter >= centers[centers.length - 1].center) {
      color = colors[centers[centers.length - 1].key];
    } else {
      for (let index = 0; index < centers.length - 1; index += 1) {
        const current = centers[index];
        const next = centers[index + 1];
        if (viewportCenter < current.center || viewportCenter > next.center) continue;

        const ratio = (viewportCenter - current.center) / Math.max(1, next.center - current.center);
        color = mix(colors[current.key], colors[next.key], ratio);
        break;
      }
    }

    if (!color) return;
    const value = color.join(',');
    if (value === previousColor) return;
    // Only the glass background needs this property; avoid recalculating the
    // inherited styles of every link and paragraph on a scroll frame.
    bg.style.setProperty('--theme-rgb', value);
    previousColor = value;
  };

  const scheduleUpdate = () => {
    if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateTheme);
  };
  const scheduleMeasure = () => {
    measurePending = true;
    scheduleUpdate();
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('pageshow', scheduleMeasure);
  document.addEventListener('load', scheduleMeasure, true);
  document.addEventListener('toggle', scheduleMeasure, true);
  reducedMotion.addEventListener('change', scheduleUpdate);
  if ('ResizeObserver' in window) {
    const layoutObserver = new ResizeObserver(scheduleMeasure);
    layoutObserver.observe(document.getElementById('main') || body);
    document.querySelectorAll('#main > section').forEach((section) => layoutObserver.observe(section));
  }
  if (document.fonts) document.fonts.ready.then(scheduleMeasure);
  scheduleUpdate();
})();

(() => {
  const stack = document.querySelector('.float-launchers');
  if (!stack) return;

  const chips = Array.from(stack.querySelectorAll('.lg-chip:not(.lg-main)'));
  if (chips.length === 0) return;

  let main = stack.querySelector('.lg-main');
  if (!main) {
    main = document.createElement('button');
    main.type = 'button';
    main.className = 'lg-chip lg-main';
    main.setAttribute('aria-label', '開啟快速導覽');
    main.setAttribute('aria-expanded', 'false');
    main.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>
      </svg>
    `;
    stack.insertBefore(main, stack.firstChild);
  }

  stack.classList.add('has-menu-toggle');
  const compactMenu = window.matchMedia('(max-width: 680px), (max-height: 480px) and (pointer: coarse)');
  const originalTabIndexes = new Map(chips.map((chip) => [chip, chip.getAttribute('tabindex')]));
  main.setAttribute('aria-controls', chips.map((chip, index) => {
    if (!chip.id) chip.id = `quick-nav-link-${index + 1}`;
    return chip.id;
  }).join(' '));

  const syncLinks = () => {
    const hidden = compactMenu.matches && !stack.classList.contains('is-show');
    chips.forEach((chip) => {
      chip.inert = hidden;
      if (hidden) {
        chip.setAttribute('aria-hidden', 'true');
        chip.setAttribute('tabindex', '-1');
      } else {
        chip.removeAttribute('aria-hidden');
        const originalTabIndex = originalTabIndexes.get(chip);
        if (originalTabIndex === null) chip.removeAttribute('tabindex');
        else chip.setAttribute('tabindex', originalTabIndex);
      }
    });
  };

  const closeAll = () => {
    if (compactMenu.matches && chips.includes(document.activeElement)) {
      main.focus({ preventScroll: true });
    }
    stack.classList.remove('is-show');
    main.setAttribute('aria-expanded', 'false');
    main.setAttribute('aria-label', '開啟快速導覽');
    syncLinks();
  };

  const openMenu = () => {
    stack.classList.add('is-show');
    main.setAttribute('aria-expanded', 'true');
    main.setAttribute('aria-label', '關閉快速導覽');
    syncLinks();
  };

  main.addEventListener('click', (event) => {
    if (!compactMenu.matches) return;
    event.preventDefault();
    if (stack.classList.contains('is-show')) {
      closeAll();
      return;
    }
    openMenu();
  });

  document.addEventListener('click', (event) => {
    if (!compactMenu.matches) return;
    if (!stack.classList.contains('is-show')) return;
    if (stack.contains(event.target)) return;
    closeAll();
  });

  stack.addEventListener('focusout', (event) => {
    // A null destination can occur during native link activation. Only close
    // when focus explicitly moves outside the menu.
    if (compactMenu.matches && event.relatedTarget && !stack.contains(event.relatedTarget)) closeAll();
  });

  // Leave navigation to the browser. Making a clicked link inert inside its
  // click handler can cancel keyboard, pointer and modifier-assisted actions.

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && compactMenu.matches && stack.classList.contains('is-show')) {
      event.preventDefault();
      closeAll();
      main.focus({ preventScroll: true });
    }
  });

  const syncMenu = () => {
    const toggleWasFocused = document.activeElement === main;
    closeAll();
    if (!compactMenu.matches && toggleWasFocused) chips[0].focus({ preventScroll: true });
  };
  compactMenu.addEventListener('change', syncMenu);
  window.addEventListener('pageshow', syncMenu);
  syncMenu();
})();


// 招生頁唯一的年度設定：招生開放時只需更新 status、formUrl，並視需要換 icon。
const recruitmentConfig = Object.freeze({
  status: 'closed', // 'open' | 'closed'
  route: 'recruit.html',
  formUrl: 'https://docs.google.com/forms/d/1TRbRIq3yUMgCvv11WHweR-EsLDQaE9vymkrnpuAv37g/viewform?edit_requested=true',
  floatingIcon: {
    image: 'assets/recruit.png',
    alt: '新生招生報名入口',
    desktop: { top: '170px', left: '160px', width: '150px' },
    mobile: { top: '96px', left: '10px', width: '120px' },
  },
});

window.RHWB_RECRUITMENT = recruitmentConfig;

// 招生 icon：僅在招生開放時顯示。
(() => {
  const config = {
    enabled: recruitmentConfig.status === 'open',
    href: recruitmentConfig.route,
    image: recruitmentConfig.floatingIcon.image,
    alt: recruitmentConfig.floatingIcon.alt,
    desktop: recruitmentConfig.floatingIcon.desktop,
    mobile: recruitmentConfig.floatingIcon.mobile,
  };

  if (!config.enabled || !document.body) return;
  if (document.body.classList.contains('recruit-page')) return;

  const entry = document.createElement('a');
  entry.className = 'recruit-float-entry';
  entry.setAttribute('aria-label', config.alt);
  entry.href = config.href;

  const image = document.createElement('img');
  image.src = config.image;
  image.alt = config.alt;
  image.loading = 'eager';
  image.decoding = 'async';
  image.addEventListener('error', () => entry.remove(), { once: true });

  entry.appendChild(image);

  if (window.location.pathname.toLowerCase().endsWith('/recruit.html') || window.location.pathname.toLowerCase().endsWith('recruit.html')) {
    entry.href = '#top';
  }

  const applyPosition = () => {
    const mode = window.innerWidth <= 768 ? config.mobile : config.desktop;
    entry.style.setProperty('--recruit-top', mode.top);
    entry.style.setProperty('--recruit-left', mode.left);
    entry.style.setProperty('--recruit-width', mode.width);
  };

  applyPosition();
  window.addEventListener('resize', applyPosition, { passive: true });
  document.body.appendChild(entry);
})();

(() => {
  const page = document.body;
  if (!page || !page.classList.contains('recruit-page')) return;

  page.dataset.recruitStatus = recruitmentConfig.status;

  const lockMobileZoom = () => {
    if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;

    const preventGesture = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    const preventMultiTouch = (event) => {
      if (event.touches && event.touches.length > 1 && event.cancelable) event.preventDefault();
    };

    document.addEventListener('touchmove', preventMultiTouch, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, preventGesture, { passive: false });
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300 && event.cancelable) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
  };

  lockMobileZoom();

  const bindEmbed = (selector, src, emptyText) => {
    const host = document.querySelector(selector);
    if (!host) return;

    if (!src) {
      host.innerHTML = `<div class="recruit-embed-placeholder"><p>${emptyText}</p></div>`;
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'recruit-embed-frame';
    iframe.src = src;
    iframe.loading = 'lazy';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    host.innerHTML = '';
    host.appendChild(iframe);
  };

  bindEmbed(
    '[data-recruit-video]',
    page.dataset.recruitYoutubeUrl || '',
    '\u8acb\u5728 recruit.html \u7684 body \u6a19\u7c64\u586b\u5165 data-recruit-youtube\uff0c\u9019\u88e1\u5c31\u6703\u986f\u793a\u6bd4\u8cfd\u5f71\u7247\u3002'
  );

  if (recruitmentConfig.status === 'open') {
    bindEmbed(
      '[data-recruit-form]',
      recruitmentConfig.formUrl,
      '尚未設定報名表單連結。'
    );
  }
})();

(() => {
  if (window.RHWB_RECRUITMENT?.status !== 'open') return;

  const gallery = document.querySelector('[data-recruit-gallery]');
  if (!gallery) return;

  const track = gallery.querySelector('[data-gallery-track]');
  const dots = gallery.querySelector('[data-gallery-dots]');
  const status = gallery.querySelector('[data-gallery-status]');
  const prevButton = gallery.querySelector('[data-gallery-prev]');
  const nextButton = gallery.querySelector('[data-gallery-next]');
  if (!track || !dots || !status || !prevButton || !nextButton) return;

  const basePath = gallery.dataset.basePath || 'assets';
  const prefix = gallery.dataset.filePrefix || 'DM';
  const extension = gallery.dataset.fileExt || 'jpg';
  const maxCount = Number.parseInt(gallery.dataset.max || '10', 10);

  const loadImage = (src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

  const buildItem = (src, index) => {
    const item = document.createElement('article');
    item.className = 'recruit-gallery-item';

    const figure = document.createElement('figure');
    figure.className = 'recruit-gallery-figure';

    const image = document.createElement('img');
    image.src = src;
    image.alt = `DM ${index + 1}`;
    image.loading = 'lazy';
    image.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.textContent = `招生 DM ${index + 1}`;

    figure.appendChild(image);
    figure.appendChild(caption);
    item.appendChild(figure);
    return item;
  };

  const sources = [];
  let currentIndex = 0;
  const normalizeIndex = (index) => {
    if (sources.length === 0) return 0;
    return (index + sources.length) % sources.length;
  };

  const init = async () => {
    for (let index = 1; index <= maxCount; index += 1) {
      const src = `${basePath}/${prefix}${index}.${extension}`;
      const exists = await loadImage(src);
      if (!exists) break;
      sources.push(src);
    }

    if (sources.length === 0) {
      gallery.innerHTML = '<div class="recruit-gallery-empty">目前尚未放入招生 DM。請將檔案命名為 DM1.jpg、DM2.jpg 後放進 assets 資料夾。</div>';
      return;
    }

    track.innerHTML = '';
    dots.innerHTML = '';

    sources.forEach((src, index) => {
      track.appendChild(buildItem(src, index));

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'recruit-gallery-dot';
      dot.setAttribute('aria-label', `查看第 ${index + 1} 張 DM`);
      dot.addEventListener('click', () => goTo(index));
      dots.appendChild(dot);
    });

    update(0);
  };

  const goTo = (index) => {
    if (sources.length === 0) return;
    update(normalizeIndex(index));
  };

  const update = (index) => {
    const safeIndex = normalizeIndex(index);
    const total = sources.length;
    currentIndex = safeIndex;
    status.textContent = `${safeIndex + 1} / ${total}`;

    Array.from(track.children).forEach((item, itemIndex) => {
      let offset = (itemIndex - safeIndex + total) % total;
      if (offset > total / 2) offset -= total;

      let state = 'far-next';

      if (offset === 0) {
        state = 'active';
      } else if (offset === -1) {
        state = 'prev';
      } else if (offset === 1) {
        state = 'next';
      } else if (total % 2 === 0 && offset === total / 2) {
        state = 'opposite';
      } else if (offset < -1) {
        state = 'far-prev';
      } else {
        state = 'far-next';
      }

      item.className = 'recruit-gallery-item';
      if (state === 'active') item.classList.add('is-active');
      else if (state === 'prev') item.classList.add('is-prev');
      else if (state === 'next') item.classList.add('is-next');
      else if (state === 'far-prev') item.classList.add('is-far-prev');
      else if (state === 'far-next') item.classList.add('is-far-next');
      else if (state === 'opposite') item.classList.add('is-opposite');
    });

    Array.from(dots.children).forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === safeIndex);
    });

    const singleSlide = sources.length <= 1;
    prevButton.disabled = singleSlide;
    nextButton.disabled = singleSlide;
  };

  const bindNavButton = (button, delta) => {
    let suppressClickUntil = 0;

    button.addEventListener('pointerdown', (event) => {
      if (button.disabled) return;
      event.preventDefault();
      goTo(currentIndex + delta);
      suppressClickUntil = Date.now() + 320;
    });

    button.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        return;
      }
      if (button.disabled) return;
      goTo(currentIndex + delta);
    });
  };

  bindNavButton(prevButton, -1);
  bindNavButton(nextButton, 1);

  init();
})();

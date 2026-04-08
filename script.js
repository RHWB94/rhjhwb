const yearNode = document.getElementById('y');
if (yearNode) yearNode.textContent = new Date().getFullYear();

const panelObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
    else entry.target.classList.remove('in-view');
  });
}, { root: null, threshold: 0.3, rootMargin: '-15% 0px -15% 0px' });

document.querySelectorAll('section.panel').forEach((section) => panelObserver.observe(section));

const body = document.body;

function openOverlay(overlayId, templateId, triggerBtn) {
  const overlay = document.getElementById(overlayId);
  const template = document.getElementById(templateId);
  if (!overlay || !template) return;

  const content = overlay.querySelector('#overlay-content');
  if (!content) return;

  content.innerHTML = '';
  content.appendChild(template.content.cloneNode(true));

  const closeOverlay = () => {
    overlay.hidden = true;
    body.classList.remove('modal-open');
    if (triggerBtn) triggerBtn.focus();
  };

  overlay.hidden = false;
  body.classList.add('modal-open');

  const closeButton = overlay.querySelector('.overlay-close');
  if (closeButton) {
    closeButton.focus();
    closeButton.onclick = closeOverlay;
  }

  overlay.onclick = (event) => {
    if (event.target === overlay) closeOverlay();
  };
}

document.querySelectorAll('.more-bio').forEach((button) => {
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

  let centers = [];

  const computeCenters = () => {
    centers = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return {
        key: section.dataset.theme || 'yang',
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
    if (centers.length === 0) return;

    const viewportCenter = window.scrollY + window.innerHeight / 2;

    if (viewportCenter <= centers[0].center) {
      root.style.setProperty('--theme-rgb', colors[centers[0].key].join(','));
      return;
    }

    if (viewportCenter >= centers[centers.length - 1].center) {
      root.style.setProperty('--theme-rgb', colors[centers[centers.length - 1].key].join(','));
      return;
    }

    for (let index = 0; index < centers.length - 1; index += 1) {
      const current = centers[index];
      const next = centers[index + 1];
      if (viewportCenter < current.center || viewportCenter > next.center) continue;

      const ratio = (viewportCenter - current.center) / (next.center - current.center);
      root.style.setProperty('--theme-rgb', mix(colors[current.key], colors[next.key], ratio).join(','));
      break;
    }
  };

  let scrollFrame = null;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateTheme();
      scrollFrame = null;
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    computeCenters();
    updateTheme();
  });

  computeCenters();
  updateTheme();

  if (window.innerHeight < 420) {
    document.querySelectorAll('.panel .hero-content, .panel .profile').forEach((element) => {
      element.classList.add('in-view');
      element.style.opacity = '1';
      if (element.classList.contains('hero-content')) {
        element.style.transform = 'translateY(var(--home-hero-nudge))';
      } else {
        element.style.transform = 'none';
      }
    });
  }
})();

(() => {
  const stack = document.querySelector('.float-launchers');
  if (!stack) return;

  const chips = Array.from(stack.querySelectorAll('.lg-chip'));
  if (chips.length === 0) return;

  const supportsTouch =
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
    ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0) ||
    ('ontouchstart' in window);

  if (!supportsTouch) return;

  let main = stack.querySelector('.lg-main');
  if (!main) {
    main = document.createElement('button');
    main.type = 'button';
    main.className = 'lg-chip lg-main';
    main.setAttribute('aria-label', 'Open quick navigation');
    main.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>
      </svg>
    `;
    stack.insertBefore(main, stack.firstChild);
  }

  const closeAll = () => {
    stack.classList.remove('is-show', 'is-closing');
    chips.forEach((chip) => {
      chip.classList.remove('is-open');
      chip.__armed = false;
    });
  };

  const openMenu = () => {
    stack.classList.add('is-show');
  };

  main.addEventListener('click', (event) => {
    event.preventDefault();
    if (stack.classList.contains('is-show')) {
      closeAll();
      return;
    }
    openMenu();
  });

  document.addEventListener('click', (event) => {
    if (!stack.classList.contains('is-show')) return;
    if (event.target.closest('.float-launchers')) return;
    closeAll();
  });

  chips.forEach((chip) => {
    chip.__armed = false;
    chip.addEventListener('click', (event) => {
      if (!stack.classList.contains('is-show')) {
        event.preventDefault();
        openMenu();
        return;
      }

      if (chip.__armed) {
        chip.__armed = false;
        closeAll();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openMenu();

      chips.forEach((otherChip) => {
        if (otherChip === chip) return;
        otherChip.__armed = false;
        otherChip.classList.remove('is-open');
      });

      chip.classList.add('is-open');
      chip.__armed = true;
    }, { passive: false });
  });
})();


//vrecruit開關這在，true是開false是關，href是連結，image是圖片路徑，alt是替代文字，desktop和mobile分別是桌面和行動裝置的樣式設定
(() => {
  const config = {
    enabled: false,
    href: 'recruit.html',
    image: 'assets/recruit.png',
    alt: '新生招生報名入口',
    desktop: {
      top: '170px',
      left: '160px',
      width: '112px',
    },
    mobile: {
      top: '96px',
      left: '10px',
      width: '84px',
    },
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

  bindEmbed(
    '[data-recruit-form]',
    page.dataset.recruitFormUrl || '',
    '\u8acb\u5728 recruit.html \u7684 body \u6a19\u7c64\u586b\u5165 data-recruit-form\uff0c\u9019\u88e1\u5c31\u6703\u5d4c\u5165 Google Form\u3002'
  );
})();

(() => {
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

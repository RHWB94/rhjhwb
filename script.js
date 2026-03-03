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

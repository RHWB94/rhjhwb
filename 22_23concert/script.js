const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxTitle = document.querySelector("#lightbox-title");
const originalLink = document.querySelector("#lightbox-open-original");
const closeButton = document.querySelector(".lightbox-close");
const scrollArea = document.querySelector(".lightbox-scroll");
const zoomInButton = document.querySelector("#zoom-in");
const zoomOutButton = document.querySelector("#zoom-out");
const zoomFitButton = document.querySelector("#zoom-fit");
const zoomLevel = document.querySelector("#zoom-level");

let fitWidth = 0;
let scale = 1;
let startScale = 1;
let dragStart = null;
const activePointers = new Map();
let pinchStart = null;

function pointerDistance() {
  const [first, second] = [...activePointers.values()];
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function applyZoom(nextScale, keepCenter = true) {
  const previousWidth = lightboxImage.getBoundingClientRect().width || fitWidth;
  const centerX = scrollArea.scrollLeft + scrollArea.clientWidth / 2;
  const centerY = scrollArea.scrollTop + scrollArea.clientHeight / 2;
  const ratioX = previousWidth ? centerX / previousWidth : 0.5;
  const ratioY = lightboxImage.offsetHeight ? centerY / lightboxImage.offsetHeight : 0.5;

  scale = Math.min(4, Math.max(1, nextScale));
  lightboxImage.style.width = `${Math.round(fitWidth * scale)}px`;
  zoomLevel.value = `${Math.round(scale * 100)}%`;

  if (keepCenter) {
    requestAnimationFrame(() => {
      scrollArea.scrollLeft = ratioX * lightboxImage.offsetWidth - scrollArea.clientWidth / 2;
      scrollArea.scrollTop = ratioY * lightboxImage.offsetHeight - scrollArea.clientHeight / 2;
    });
  }
}

function openLightbox(trigger) {
  const {
    lightboxSrc,
    lightboxAlt,
    lightboxTitle: title,
    lightboxScale = "1",
  } = trigger.dataset;

  lightboxImage.alt = lightboxAlt;
  lightboxTitle.textContent = title;
  originalLink.href = lightboxSrc;
  lightbox.showModal();
  lightboxImage.addEventListener("load", () => {
    fitWidth = scrollArea.clientWidth;
    startScale = Number(lightboxScale);
    applyZoom(startScale, false);
    scrollArea.scrollLeft = (lightboxImage.offsetWidth - scrollArea.clientWidth) / 2;
    scrollArea.scrollTop = 0;
  }, { once: true });
  lightboxImage.src = lightboxSrc;
  closeButton.focus();
}

function closeLightbox() {
  lightbox.close();
  activePointers.clear();
  pinchStart = null;
  dragStart = null;
  scrollArea.classList.remove("is-dragging");
  lightboxImage.removeAttribute("src");
  lightboxImage.removeAttribute("style");
  lightboxImage.alt = "";
  scrollArea.scrollTo(0, 0);
}

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => openLightbox(trigger));
});

closeButton.addEventListener("click", closeLightbox);
zoomInButton.addEventListener("click", () => applyZoom(scale + 0.25));
zoomOutButton.addEventListener("click", () => applyZoom(scale - 0.25));
zoomFitButton.addEventListener("click", () => applyZoom(1));

scrollArea.addEventListener("pointerdown", (event) => {
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  scrollArea.setPointerCapture(event.pointerId);

  if (activePointers.size === 2) {
    dragStart = null;
    pinchStart = {
      distance: pointerDistance(),
      scale,
    };
    return;
  }

  dragStart = {
    x: event.clientX,
    y: event.clientY,
    left: scrollArea.scrollLeft,
    top: scrollArea.scrollTop,
  };
  scrollArea.classList.add("is-dragging");
});

scrollArea.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (activePointers.size === 2 && pinchStart) {
    event.preventDefault();
    applyZoom(pinchStart.scale * (pointerDistance() / pinchStart.distance));
    return;
  }

  if (!dragStart) return;
  event.preventDefault();
  scrollArea.scrollLeft = dragStart.left - (event.clientX - dragStart.x);
  scrollArea.scrollTop = dragStart.top - (event.clientY - dragStart.y);
});

function endDrag(event) {
  activePointers.delete(event.pointerId);
  if (scrollArea.hasPointerCapture(event.pointerId)) {
    scrollArea.releasePointerCapture(event.pointerId);
  }

  pinchStart = null;

  if (activePointers.size === 1) {
    const [remaining] = activePointers.values();
    dragStart = {
      x: remaining.x,
      y: remaining.y,
      left: scrollArea.scrollLeft,
      top: scrollArea.scrollTop,
    };
    return;
  }

  dragStart = null;
  scrollArea.classList.remove("is-dragging");
}

scrollArea.addEventListener("pointerup", endDrag);
scrollArea.addEventListener("pointercancel", endDrag);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

lightbox.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.open) {
    event.preventDefault();
    closeLightbox();
  }
});

document.querySelectorAll(".video-wrap").forEach((videoWrap) => {
  const video = videoWrap.querySelector("video");
  video.addEventListener("play", () => videoWrap.classList.add("is-playing"));
});

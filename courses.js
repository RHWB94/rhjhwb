// === courses.js | Single-open delegation + strict modal locks (with head/tail click guard) ===
(() => {
  let __busy = false;          // true while opening/closing
  let __activeCard = null;     // currently opened card
  let __lockUntil = 0;         // head/tail cooldown to block rapid taps
  const now = () => (performance?.now ? performance.now() : Date.now());

  const grid = document.querySelector('.course-grid');
  if (!grid) return;

  // Prepare overlay root once
  let overlayRoot = document.querySelector('.overlay-root');
  if (!overlayRoot){
    overlayRoot = document.createElement('div');
    overlayRoot.className = 'overlay-root';
    overlayRoot.innerHTML = `
      <div class="overlay-bg"></div>
      <div class="overlay-clickout" aria-label="關閉"></div>
      <div class="photo-stage" aria-hidden="true"></div>
    `;
    document.body.appendChild(overlayRoot);
  }
  const overlayBg = overlayRoot.querySelector('.overlay-bg');
  const overlayClickout = overlayRoot.querySelector('.overlay-clickout');
  const photoStage = overlayRoot.querySelector('.photo-stage');

  // Utility
  const area = r => Math.max(0, r.w) * Math.max(0, r.h);
  const overlapArea = (a,b)=>{
    const x = Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
    return x*y;
  };

  // Scatter photos around the centered card (enter returns Promise; exit returns Promise)
  function scatterOutside(card, key, title, count = 12){
    photoStage.innerHTML = '';

    const vw = window.innerWidth, vh = window.innerHeight;
    const r = card.getBoundingClientRect();
    const cx = Math.round(vw/2), cy = Math.round(vh/2);
    const finalRect = { x: Math.round(cx - r.width/2), y: Math.round(cy - r.height/2), w: Math.round(r.width), h: Math.round(r.height) };
    const exclude = { x: finalRect.x - 12, y: finalRect.y - 12, w: finalRect.w + 24, h: finalRect.h + 24 };

    const RAND = (a,b) => a + Math.random()*(b-a);
    const placed = [];

    const isPhone = vw <= 600;
    const baseMinVW = isPhone ? 0.26 : 0.13;
    const baseMaxVW = isPhone ? 0.36 : 0.20;
    const MIN_W = isPhone ? 110 : 90;
    const MIN_H = isPhone ?  82 : 68;

    const total = count;
    const base = Math.floor(total / 4);
    const quota = { left: base, top: base, right: base, bottom: base };
    ['left','top','right','bottom'].slice(0, total % 4).forEach(s => quota[s]++);
    const cycle = ['left','top','right','bottom']; let cursor = 0;

    function pickOnSide(side, w, h){
      if (side==='left'   && exclude.x - w - 20 > 8) return { x: Math.round(RAND(8, exclude.x - w - 20)), y: Math.round(RAND(8, vh - h - 8)) };
      if (side==='right'){
        const free = vw - (exclude.x + exclude.w);
        if (free - w - 20 > 8) return { x: Math.round(RAND(exclude.x + exclude.w + 20, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
      }
      if (side==='top'    && exclude.y - h - 20 > 8) return { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, exclude.y - h - 20)) };
      if (side==='bottom'){
        const free = vh - (exclude.y + exclude.h);
        if (free - h - 20 > 8) return { x: Math.round(RAND(exclude.y + exclude.h + 20, vh - h - 8)), y: Math.round(RAND(8, vw - w - 8)) };
      }
      return null;
    }

    let maxEnterDelay = 0;
    while (placed.length < count){
      let w = Math.round(Math.max(vw * RAND(baseMinVW, baseMaxVW), isPhone ? 128 : 90));
      let h = Math.round(w * RAND(0.72, 0.90));

      let side = null, pos = null, tried = 0;
      while (tried++ < 4){
        const s = cycle[cursor++ % 4];
        if (quota[s] <= 0) continue;
        pos = pickOnSide(s, w, h);
        if (pos){ side = s; break; }
      }
      if (!pos) pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };

      let attempts = 0;
      while (attempts++ < 180){
        const box = { x: pos.x, y: pos.y, w, h };
        if (overlapArea(box, exclude) > 0){
          pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
          continue;
        }
        const ok = placed.every(p=>{
          const a = overlapArea(box, p);
          return a === 0 || (a/area(box) <= 0.2 && a/area(p) <= 0.2);
        });
        if (ok){
          placed.push(box); if (side) quota[side]--;
          const item = document.createElement('div');
          item.className = 'photo-item is-enter';
          item.style.left   = box.x + 'px';
          item.style.top    = box.y + 'px';
          item.style.width  = w + 'px';
          item.style.height = h + 'px';

          const rotStart = (RAND(-22,22)).toFixed(1)+'deg';
          const rotEnd   = (RAND(-8,8)).toFixed(1)+'deg';
          const rotExit  = (RAND(20,46)).toFixed(1)+'deg';
          const scale    = RAND(0.92,1.08).toFixed(3);
          const driftY   = Math.round(RAND(-120,140))+'px';
          item.style.setProperty('--rotStart', rotStart);
          item.style.setProperty('--rotEnd',   rotEnd);
          item.style.setProperty('--rotExit',  rotExit);
          item.style.setProperty('--scale',    scale);
          item.style.setProperty('--driftY',   driftY);

          const idx = ((placed.length-1)%12) + 1;
          const pic = document.createElement('picture');
          const srcLarge = document.createElement('source');
          srcLarge.type = 'image/webp';
          srcLarge.srcset = `./course-photo/${key}-${idx}_1200.webp`;
          srcLarge.media = '(min-width: 800px)';
          const srcSmall = document.createElement('source');
          srcSmall.type = 'image/webp';
          srcSmall.srcset = `./course-photo/${key}-${idx}_360.webp`;
          const img = document.createElement('img');
          img.src = `./course-photo/${key}-${idx}.jpg`;
          img.alt = `${title} 圖片 ${idx}`;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.fetchPriority = 'low';
          img.onerror = ()=> item.remove();
          pic.appendChild(srcLarge);
          pic.appendChild(srcSmall);
          pic.appendChild(img);
          item.appendChild(pic);
          photoStage.appendChild(item);

          const delay = (isPhone ? 140 : 100) + placed.length*75;
          if (delay + 460 > maxEnterDelay) maxEnterDelay = delay + 460;
          setTimeout(()=>{ item.classList.remove('is-enter'); item.classList.add('is-in'); item.style.opacity='1'; }, delay);
          break;
        }else{
          w = Math.max(MIN_W, Math.round(w * RAND(0.90, 0.94)));
          h = Math.max(MIN_H, Math.round(h * RAND(0.90, 0.94)));
          pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
        }
      }
    }

    const entered = new Promise(res => setTimeout(res, maxEnterDelay + 20));
    return {
      entered,
      exit(){
        const items = Array.from(photoStage.querySelectorAll('.photo-item'));
        items.forEach((el,i)=> setTimeout(()=>{
          el.classList.remove('is-in'); el.classList.add('is-exit'); el.style.opacity='0';
        }, i*24));
        // Return a promise that resolves after the last item should be done animating
        const totalDelay = (items.length-1)*24 + 460 + 40;
        return new Promise(res => setTimeout(res, Math.max(0,totalDelay)));
      },
      clean(){ photoStage.innerHTML = ''; }
    };
  }

  // Open / Close with strict locks and head/tail cooldowns
  function openCard(card) {
    if (__activeCard && __activeCard !== card) return;
    if (__busy || card.classList.contains('is-active')) return;
    if (now() < __lockUntil) return; // head guard

    __busy = true;
    __activeCard = card;
    __lockUntil = now() + 600;       // opening head cooldown

    document.body.classList.add('modal-strict'); // lock during move-in
    document.body.classList.add('modal-lock');
    try { grid.setAttribute('inert',''); grid.setAttribute('aria-hidden','true'); } catch(e){}

    const rect = card.getBoundingClientRect();
    const ph = document.createElement('div');
    ph.className = 'card-placeholder';
    ph.style.width = rect.width + 'px';
    ph.style.height= rect.height + 'px';
    grid.insertBefore(ph, card.nextSibling);

    Object.assign(card.style, {
      position:'fixed', width:rect.width+'px', height:rect.height+'px',
      left:rect.left+'px', top:rect.top+'px', zIndex:'1001', transform:'translate(0,0)'
    });
    card.classList.add('is-floating','is-active');
    grid.classList.add('is-faded');

    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw>0) document.body.style.paddingRight = sbw + 'px';
    document.body.classList.add('no-scroll');
    overlayRoot.classList.add('is-on');

    const dx = Math.round(window.innerWidth/2 - (rect.left + rect.width/2));
    const dy = Math.round(window.innerHeight/2 - (rect.top  + rect.height/2));
    card.style.willChange = 'transform';
    card.style.backfaceVisibility = 'hidden';
    card.style.transition = 'transform 420ms cubic-bezier(.22,.61,.36,1)';
    requestAnimationFrame(()=> card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`);

    const key = card.getAttribute('data-key') || 'course';
    const title = card.querySelector('.card-title')?.textContent || '課程';

    const onCentered = () => {
      card.removeEventListener('transitionend', onCentered);

      const scatterCtl = scatterOutside(card, key, title, 12);

      scatterCtl.entered.then(()=>{
        // Opening animations fully done; allow close interactions
        __busy = false;
        document.body.classList.remove('modal-strict'); // allow close clicks

        const face = card.querySelector('.card-face');
        const onFaceClick = (ev)=>{ ev.preventDefault(); beginClose(); };
        const onOverlayClick = (ev)=>{
          if (!card.classList.contains('is-active')) return;
          const inCard = ev.target.closest && ev.target.closest('.course-card.is-floating');
          if (inCard) return;
          ev.preventDefault();
          beginClose();
        };
        const onEsc = (e)=>{ if (e.key==='Escape'){ e.preventDefault(); beginClose(); } };

        if (face){ face.style.pointerEvents = 'auto'; face.addEventListener('click', onFaceClick); }
        overlayRoot.addEventListener('click', onOverlayClick);
        overlayBg && overlayBg.addEventListener('click', onOverlayClick);
        overlayClickout && overlayClickout.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onEsc);

        function beginClose(){
          if (!card.classList.contains('is-active')) return;
          if (__busy && __activeCard !== card) return;

          __busy = true;
          __lockUntil = now() + 900;        // closing head cooldown
          document.body.classList.add('modal-strict'); // lock during move-out

          // 1) Photos exit (Promise)
          const exitPhotosDone = (scatterCtl && scatterCtl.exit) ? scatterCtl.exit() : Promise.resolve();

          // 2) Card back to original position (Promise)
          const cardBackDone = new Promise(resolve=>{
            requestAnimationFrame(()=>{
              card.style.transition = 'transform 360ms cubic-bezier(.22,.61,.36,1)';
              card.style.transform = 'translate3d(0,0,0)';
            });
            const onBack = ()=>{ card.removeEventListener('transitionend', onBack); resolve(); };
            card.addEventListener('transitionend', onBack, { once:true });
            setTimeout(resolve, 800); // fallback
          });

          // Wait for both, then cleanup and tail cooldown
          Promise.all([exitPhotosDone, cardBackDone]).then(()=>{
            try { scatterCtl && scatterCtl.clean && scatterCtl.clean(); } catch(e){}

            if (face){ face.removeEventListener('click', onFaceClick); face.style.pointerEvents = ''; }
            overlayRoot.removeEventListener('click', onOverlayClick);
            overlayBg && overlayBg.removeEventListener('click', onOverlayClick);
            overlayClickout && overlayClickout.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onEsc);

            grid.classList.remove('is-faded');
            card.classList.remove('is-floating','is-active');
            Object.assign(card.style, { position:'', width:'', height:'', left:'', top:'', zIndex:'', transform:'', transition:'', willChange:'', backfaceVisibility:'' });
            ph.remove();

            document.body.classList.remove('no-scroll');
            document.body.style.paddingRight = '';
            overlayRoot.classList.remove('is-on');
            try { grid.removeAttribute('inert'); grid.removeAttribute('aria-hidden'); } catch(e){}

            __activeCard = null;
            __busy = false;
            document.body.classList.remove('modal-lock');
            document.body.classList.remove('modal-strict');

            // Tail cooldown to prevent immediate re-open glitches
            __lockUntil = now() + 200;
          });
        }
      });
    };

    card.addEventListener('transitionend', onCentered, { once:true });
  }

  // === Event delegation (single-open guard) ===
  function handleCardActivate(target){
    const card = target.closest && target.closest('.course-card');
    if (!card) return;
    if (document.body.classList.contains('modal-lock')) return; // already open/closing
    if (__activeCard && __activeCard !== card) return;
    if (__busy) return;
    if (now() < __lockUntil) return; // head/tail guard
    openCard(card);
  }

  // Delegate click & keyboard from grid
  grid.addEventListener('click', (e)=> handleCardActivate(e.target), { passive:true });
  grid.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      handleCardActivate(e.target);
    }
  });

  // Prevent any clicks during strict lock at capture phase (extra insurance)
  document.addEventListener('click', (e)=>{
    if (document.body.classList.contains('modal-strict')){
      e.stopPropagation();
      e.preventDefault();
    }
  }, { capture:true });

})();
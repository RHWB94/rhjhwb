
// === courses.js | 嚴謹模式：白卡置中後才左側撒入、關閉時風向右撤，照片必定 12 張（覆蓋≤20%），關閉後不亂排 ===
(() => {
  
// --- Animation lock (avoid fast switching & click-through) ---
let __busy = false;
let __activeCard = null;
const grid = document.querySelector('.course-grid');
  if (!grid) return;

  const cards = Array.from(document.querySelectorAll('.course-card'));
  const centerHint = document.querySelector('.center-hint');

  // 確保 overlay 存在（放卡片外圍的舞台）
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

  const getSBW = () => window.innerWidth - document.documentElement.clientWidth;

  // 幾何工具
  const area = r => Math.max(0, r.w) * Math.max(0, r.h);
  const overlapArea = (a,b)=>{
    const x = Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
    return x*y;
  };

  // === REPLACE: scatterOutside (平均四側 + 手機放大 + 左進右出) ===
  function scatterOutside(card, key, title, count = 12){
    photoStage.innerHTML = '';

    const vw = window.innerWidth, vh = window.innerHeight;
    const r = card.getBoundingClientRect();
    const cx = Math.round(vw/2), cy = Math.round(vh/2);
    const finalRect = { x: Math.round(cx - r.width/2), y: Math.round(cy - r.height/2), w: Math.round(r.width), h: Math.round(r.height) };
    const exclude = { x: finalRect.x - 12, y: finalRect.y - 12, w: finalRect.w + 24, h: finalRect.h + 24 };

    const RAND = (a,b) => a + Math.random()*(b-a);
    const placed = [];
    const MAX_TRY = 800;

    // ---- 尺寸策略：手機放大 + 下限 ----
    const isPhone = vw <= 600;
    const baseMinVW = isPhone ? 0.26 : 0.13;   // 手機 26–36vw、桌機 13–20vw
    const baseMaxVW = isPhone ? 0.36 : 0.20;
    const MIN_W = isPhone ? 110 : 90;
    const MIN_H = isPhone ? 82  : 68;

    // ---- 四側平均配額（12張 → 預設每側3張，餘數輪流配）----
    const total = count;
    const base = Math.floor(total / 4);
    const quota = { left: base, top: base, right: base, bottom: base };
    ['left','top','right','bottom'].slice(0, total % 4).forEach(s => quota[s]++);

    const cycle = ['left','top','right','bottom']; // 輪轉順序
    let cursor = 0;

    const area = r => Math.max(0, r.w) * Math.max(0, r.h);
    const overlapArea = (a,b)=>{
      const x = Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x));
      const y = Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
      return x*y;
    };

    function pickOnSide(side, w, h){
      if (side==='left'   && exclude.x - w - 20 > 8) return { x: Math.round(RAND(8, exclude.x - w - 20)), y: Math.round(RAND(8, vh - h - 8)) };
      if (side==='right'){
        const free = vw - (exclude.x + exclude.w);
        if (free - w - 20 > 8) return { x: Math.round(RAND(exclude.x + exclude.w + 20, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
      }
      if (side==='top'    && exclude.y - h - 20 > 8) return { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, exclude.y - h - 20)) };
      if (side==='bottom'){
        const free = vh - (exclude.y + exclude.h);
        if (free - h - 20 > 8) return { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(exclude.y + exclude.h + 20, vh - h - 8)) };
      }
      return null;
    }

    let tries = 0;
    while (placed.length < count && tries < MAX_TRY){
      tries++;

      // 依畫面設定初始尺寸
      let w = Math.round(Math.max(vw * RAND(baseMinVW, baseMaxVW), isPhone ? 128 : 90));
      let h = Math.round(w * RAND(0.72, 0.90));

      // 找側邊（輪轉 + 配額）
      let side = null, pos = null, sideTried = 0;
      while (sideTried < 4){
        const s = cycle[cursor % 4]; cursor++; sideTried++;
        if (quota[s] <= 0) continue;
        pos = pickOnSide(s, w, h);
        if (pos){ side = s; break; }
      }
      // 全側暫時塞不下 → 退回全域隨機（仍要避開白卡與覆蓋限制）
      if (!pos) pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };

      // 位置/尺寸嘗試（雙向 20% 覆蓋率；放不下就微縮重試，但不低於下限）
      let attempts = 0;
      while (attempts++ < 180){
        const box = { x: pos.x, y: pos.y, w, h };
        if (overlapArea(box, exclude) > 0){
          pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
          continue;
        }
        const ok = placed.every(p=>{
          const a = overlapArea(box, p);
          if (a === 0) return true;
          return (a/area(box) <= 0.2) && (a/area(p) <= 0.2);
        });
        if (ok){
          placed.push(box);
          if (side) quota[side]--; // 真正放下才扣配額

          const item = document.createElement('div');
          item.className = 'photo-item is-enter';
          item.style.left   = box.x + 'px';
          item.style.top    = box.y + 'px';
          item.style.width  = w + 'px';
          item.style.height = h + 'px';

          // 角度/飄移（進場→就位→退場）
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

          const img = document.createElement('img');
          const idx = ((placed.length-1)%12) + 1;
          img.src = `./course-photo/${key}-${idx}.jpg`;
          img.alt = `${title} 圖片 ${idx}`;
          img.loading = 'lazy';
          img.onerror = ()=> item.remove();
          item.appendChild(img);
          photoStage.appendChild(item);

          // 階梯延遲：左側進場 → 就位
          const delay = (isPhone ? 140 : 100) + placed.length*75;
          setTimeout(()=>{ item.classList.remove('is-enter'); item.classList.add('is-in'); item.style.opacity='1'; }, delay);

          break;
        }else{
          w = Math.max(MIN_W, Math.round(w * RAND(0.90, 0.94)));
          h = Math.max(MIN_H, Math.round(h * RAND(0.90, 0.94)));
          pos = { x: Math.round(RAND(8, vw - w - 8)), y: Math.round(RAND(8, vh - h - 8)) };
        }
      }
    }

    return {
      exit(){
        const items = Array.from(photoStage.querySelectorAll('.photo-item'));
        items.forEach((el,i)=>{
          setTimeout(()=>{ el.classList.remove('is-in'); el.classList.add('is-exit'); el.style.opacity='0'; }, i*24);
        });
      },
      clean(){ photoStage.innerHTML = ''; }
    };
  }

  // ===== 開關狀態機：避免失效/閃退，完整復原 =====
  let busy = false;

  function openCard(card) {

// 防重：若另一張卡正在浮動或全域上鎖，直接略過
  if (document.body.classList.contains('modal-lock') && __activeCard && __activeCard !== card) return;

if (__busy || (card && card.classList && card.classList.contains('is-active'))) return;
__busy = true;
__activeCard = card;
document.body.classList.add('modal-lock');
// 在 modal 期間讓整個 grid 失效（避免鍵盤啟動其他卡）
try { grid.setAttribute('inert',''); grid.setAttribute('aria-hidden','true'); } catch(e){}

const grid = document.querySelector('.course-grid');
const overlayRoot = document.querySelector('.overlay-root');
const overlayBg = overlayRoot && overlayRoot.querySelector('.overlay-bg');
const overlayClickout = overlayRoot && overlayRoot.querySelector('.overlay-clickout');
const photoStage = overlayRoot && overlayRoot.querySelector('.photo-stage');

if (!grid || !overlayRoot) { __busy = false; __activeCard = null; document.body.classList.remove('modal-lock'); return; }

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


const onOpened = () => {
  card.removeEventListener('transitionend', onOpened);
  let scatterCtl = null;
  try {
    if (typeof scatterOutside === 'function') {
      scatterCtl = scatterOutside(card, key, title, 12);
    } else if (typeof window.scatterOutside === 'function') {
      scatterCtl = window.scatterOutside(card, key, title, 12);
    }
  } catch(e){}

  // === 強化關閉機制（除了 overlay-bg / overlay-clickout 以外，整個 overlay-root 點擊也可關閉） ===
  // 1) 將 overlayRoot 本身掛上 click（避免子元素層級或事件被吃掉時無法關閉）
  const overlayRootClick = (ev) => {
    // 若未開啟或非本卡，略過
    if (!card.classList.contains('is-active')) return;
    // 若點擊到卡片本體（雖然卡片預設 pointer-events:none），仍保留保險判斷
    const inCard = ev.target.closest && ev.target.closest('.course-card.is-floating');
    if (inCard) return;
    ev.preventDefault();
    close();
  };
  overlayRoot.addEventListener('click', overlayRootClick);

  // 2) 允許點擊卡片正面關閉（使用者「再次點擊」的直覺）
  const face = card.querySelector('.card-face');
  const onFaceClick = (ev) => {
    ev.preventDefault();
    close();
  };
  if (face){
    // 只在浮動期間短暫允許 face 接收事件
    face.style.pointerEvents = 'auto';
    face.addEventListener('click', onFaceClick);
  }

  const close = () => {
    if (!card.classList.contains('is-active')) return;
    if (__busy && __activeCard !== card) return;
    __busy = true;

    try { scatterCtl && scatterCtl.exit && scatterCtl.exit(); } catch(e){}

    requestAnimationFrame(()=>{
      card.style.transition = 'transform 360ms cubic-bezier(.22,.61,.36,1)';
      card.style.transform = 'translate3d(0,0,0)';
    });

    const cleanup = () => {
      card.removeEventListener('transitionend', cleanup);
      try { scatterCtl && scatterCtl.clean && scatterCtl.clean(); } catch(e){}

      // 還原 face 綁定
      if (face){
        face.removeEventListener('click', onFaceClick);
        face.style.pointerEvents = '';
      }
      overlayRoot.removeEventListener('click', overlayRootClick);

      grid.classList.remove('is-faded');
      card.classList.remove('is-floating','is-active');
      card.style.position=''; card.style.width=''; card.style.height='';
      card.style.left=''; card.style.top=''; card.style.zIndex=''; card.style.transform=''; card.style.transition=''; card.style.willChange=''; card.style.backfaceVisibility='';

      ph.remove();
      grid.classList.remove('is-faded');
      document.body.classList.remove('no-scroll');
      document.body.style.paddingRight='';

      overlayRoot.classList.remove('is-on');

      // 解除 grid 的 inert/aria-hidden
      try { grid.removeAttribute('inert'); grid.removeAttribute('aria-hidden'); } catch(e){}

      __activeCard = null;
      __busy = false;
      document.body.classList.remove('modal-lock');

      overlayClickout && overlayClickout.removeEventListener('click', close);
      overlayBg && overlayBg.removeEventListener('click', close);
      document.removeEventListener('keydown', onEsc);
    };
    card.addEventListener('transitionend', cleanup, { once:true });
    setTimeout(cleanup, 800);
  };
  const onEsc = (e)=>{ if (e.key==='Escape'){ e.preventDefault(); close(); } };
  overlayClickout && overlayClickout.addEventListener('click', close);
  overlayBg && overlayBg.addEventListener('click', close);
  document.addEventListener('keydown', onEsc);

  __busy = false;
};

card.addEventListener('transitionend', onOpened, { once:true });

}


  cards.forEach(card=>{
    card.addEventListener('click', ()=> { if (__activeCard) return; openCard(card); });
    card.addEventListener('keydown', e=>{
      if (e.key==='Enter' || e.key===' '){ e.preventDefault(); if (__activeCard) return; openCard(card); }
    });
  });
})();

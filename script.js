// 年份
const y = document.getElementById('y');
if (y) y.textContent = new Date().getFullYear();

// IntersectionObserver：加進場動畫
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if (e.isIntersecting) e.target.classList.add('in-view');
    else e.target.classList.remove('in-view');
  });
}, { root: null, threshold: 0.3, rootMargin: '-15% 0px -15% 0px' });

document.querySelectorAll('section.panel').forEach(sec => io.observe(sec));

// ===== Bio 覆蓋層：以「完整經歷」按鈕觸發 =====
const body = document.body;
function openOverlay(overlayId, templateId, triggerBtn){
  const overlay = document.getElementById(overlayId);
  const tpl = document.getElementById(templateId);
  if (!overlay || !tpl) return;

  // 注入內容
  const target = overlay.querySelector('#overlay-content');
  target.innerHTML = '';
  target.appendChild(tpl.content.cloneNode(true));

  // 顯示
  overlay.hidden = false;
  body.classList.add('modal-open');

  // 聚焦返回
  const closeBtn = overlay.querySelector('.overlay-close');
  if (closeBtn){
    closeBtn.focus();
    closeBtn.onclick = () => {
      overlay.hidden = true;
      body.classList.remove('modal-open');
      if (triggerBtn) triggerBtn.focus();
    };
  }

  // 阻止點背景關閉（需按「返回」才關閉）
  overlay.addEventListener('click', (ev)=>{
    if (ev.target === overlay) {
      // do nothing
      ev.stopPropagation();
    }
  });
}

// 綁定楊老師的「完整經歷」
document.querySelectorAll('.more-bio').forEach(btn=>{
  btn.addEventListener('click', ()=> openOverlay('yang-bio-overlay','yang-bio-template', btn));
});

// 鍵盤操作：在覆蓋層內阻止 ESC 關閉（需按返回）
document.addEventListener('keydown', (e)=>{
  const overlay = document.getElementById('yang-bio-overlay');
  if (!overlay || overlay.hidden) return;
  if (e.key === 'Escape'){
    // 阻止預設行為，使「返回」成為唯一路徑
    e.preventDefault();
  }
});


// ===== 背景主題色：依捲動線性內插 =====
(() => {
  const docEl = document.documentElement;
  const bg = document.querySelector('.bg-glass');
  if (!bg) return;

  // 以 data-theme 標記的區域為斷點
  const sections = Array.from(document.querySelectorAll('section.profile-section'));
  if (sections.length === 0) return;

  // 將 CSS 變數讀成 RGB 陣列
  const getVarRGB = (name) => {
    const s = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    // s 可能是 "41,115,255"
    const parts = s.split(',').map(v => parseFloat(v));
    return parts.length === 3 ? parts : [41,115,255];
  };

  const COLORS = {
    yang: getVarRGB('--yang'),
    chou: getVarRGB('--chou'),
    jian: getVarRGB('--jian')
  };

  // 計算每個區域的中心位置（相對於整頁 scrollY）
  let centers = [];
  const computeCenters = () => {
    centers = sections.map(sec => {
      const rect = sec.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const center = top + rect.height / 2;
      const key = sec.dataset.theme || 'yang';
      return { key, center };
    }).sort((a,b)=>a.center-b.center);
  };

  const lerp = (a,b,t)=> a + (b-a)*t;
  const mix = (c1, c2, t)=> [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];

  const updateTheme = () => {
    const y = window.scrollY + window.innerHeight/2; // 視窗中心
    // 邊界：在第一個之前/最後一個之後
    if (y <= centers[0].center){
      const c = COLORS[centers[0].key];
      docEl.style.setProperty('--theme-rgb', c.join(','));
      return;
    }
    if (y >= centers[centers.length-1].center){
      const c = COLORS[centers[centers.length-1].key];
      docEl.style.setProperty('--theme-rgb', c.join(','));
      return;
    }
    // 找到相鄰兩中心
    for (let i=0;i<centers.length-1;i++){
      const a = centers[i], b = centers[i+1];
      if (y >= a.center && y <= b.center){
        const t = (y - a.center) / (b.center - a.center); // 0~1
        const c1 = COLORS[a.key], c2 = COLORS[b.key];
        const c = mix(c1, c2, t);
        docEl.style.setProperty('--theme-rgb', c.join(','));
        break;
      }
    }
  };

  const onScroll = () => {
    updateTheme();
    rAF = null;
  };

  let rAF = null;
  window.addEventListener('scroll', () => {
    if (rAF) return;
    rAF = requestAnimationFrame(onScroll);
  }, { passive: true });

  window.addEventListener('resize', () => {
    computeCenters();
    updateTheme();
  });

  // 初始
  computeCenters();
  updateTheme();

  // 手機橫向高度過小，強制顯示內容避免 IO 觸發不到
  if (window.innerHeight < 420){
    document.querySelectorAll('.panel .hero-content, .panel .profile').forEach(el => {
      el.classList.add('in-view');
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }
})();

// ===== Liquid Glass 按鈕：觸控展開/收合 =====
(() => {
  const chips = Array.from(document.querySelectorAll('.lg-chip'));
  if (!chips.length) return;

  // 觸控／滑鼠皆可；滑鼠 hover 已由 CSS 處理，這裡只補「點擊切換」
  const toggle = (chip) => {
    const isOpen = chip.classList.toggle('is-open');
    // 關其他
    if (isOpen) {
      chips.forEach(c => { if (c !== chip) c.classList.remove('is-open'); });
    }
  };

  chips.forEach(chip => {
    chip.addEventListener('click', (e)=>{
      // 若是鍵盤 Enter/Space 也走 click，無障礙 OK
      // 連結預設會導頁；想要「點一下先展開，再點第二下才導頁」可這樣處理：
      if (!chip.classList.contains('is-open')) {
        e.preventDefault();
        toggle(chip);
      }
    });
  });

  // 點頁面其他處關閉
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if (!t.closest('.lg-chip')){
      chips.forEach(c => c.classList.remove('is-open'));
    }
  }, true);

  // 捲動時自動收起，避免遮擋
  let raf = null;
  window.addEventListener('scroll', ()=>{
    if (raf) return;
    raf = requestAnimationFrame(()=>{
      chips.forEach(c => c.classList.remove('is-open'));
      raf = null;
    });
  }, { passive: true });
})();

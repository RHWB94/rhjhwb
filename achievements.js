// achievements.js | 將頁內資料與渲染外移，維持原有功能並補強可用性
(() => {
  // === 資料 ===
  const DATA = {
    "113學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "優等",
        "木管五重奏": "優等"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "優等",
        "木管五重奏": "優等"
      }
    },
    "112學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "優等",
        "木管五重奏": "甲等"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "甲等",
        "木管五重奏": "甲等"
      }
    },
    "111學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "特優",
        "行進管樂": "無",
        "銅管五重奏": "甲等",
        "木管五重奏": "甲等"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "優等",
        "木管五重奏": "甲等"
      }
    }
  };

  const BADGE_CLASS = {
    '特優': 'b-特優',
    '優等': 'b-優等',
    '甲等': 'b-甲等',
    '無': 'b-無',
    '尚未出賽': 'b-尚未出賽'
  };

  // === DOM 參照 ===
  const cards = document.getElementById('cards');
  const filtersWrap = document.getElementById('year-filters');
  if (!cards || !filtersWrap) return;

  // 年度排序（與原本相同，使用中文數字比較）
  const order = Object.keys(DATA).sort((a, b) => b.localeCompare(a, 'zh-Hant-u-nu-hanidec'));

  // === 元件 ===
  const makeBadge = (text) => {
    const span = document.createElement('span');
    span.className = `badge ${BADGE_CLASS[text] || 'b-無'}`;
    span.innerHTML = `<span class="dot" aria-hidden="true"></span>${text}`;
    return span;
  };

  const makeCard = (year, y) => {
    const card = document.createElement('div');
    card.className = 'card pad year-card';

    const hd = document.createElement('div');
    hd.className = 'hd';
    const h3 = document.createElement('h3'); h3.textContent = year;
    const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = '桃園市／全國';
    hd.appendChild(h3); hd.appendChild(desc);
    card.appendChild(hd);

    const blocks = document.createElement('div');
    blocks.className = 'blocks';

    Object.keys(y).forEach(scope => {
      const block = document.createElement('div');
      block.className = 'block';
      const h4 = document.createElement('h4'); h4.textContent = scope; block.appendChild(h4);

      const rows = document.createElement('div');
      rows.className = 'rows';

      Object.keys(y[scope]).forEach(item => {
        const row = document.createElement('div'); row.className = 'row';
        const left = document.createElement('div'); left.className = 'label'; left.textContent = item;
        const right = document.createElement('div'); right.appendChild(makeBadge(y[scope][item]));
        row.appendChild(left); row.appendChild(right);
        rows.appendChild(row);
      });

      block.appendChild(rows);
      blocks.appendChild(block);
    });

    card.appendChild(blocks);
    return card;
  };

  // === 渲染 ===
  const animateIn = (container) => {
    container.classList.add('anim-enter');
    const list = Array.from(container.children);
    list.forEach((el, i) => setTimeout(() => el.classList.add('anim-in'), 60 * i));
    setTimeout(() => container.classList.remove('anim-enter'), 60 * list.length + 400);
  };

  const render = (filter = 'all') => {
    const frag = document.createDocumentFragment();
    for (const year of order) {
      if (filter !== 'all' && filter !== year) continue;
      frag.appendChild(makeCard(year, DATA[year]));
    }
    cards.innerHTML = '';
    cards.appendChild(frag);
    animateIn(cards);
  };

  // === 篩選器：由資料自動產生 + ARIA + 鍵盤巡航 ===
  const buildFilters = () => {
    const years = order;
    const btnAll = document.createElement('button');
    btnAll.className = 'btn';
    btnAll.dataset.filter = 'all';
    btnAll.setAttribute('aria-pressed', 'true');
    btnAll.textContent = '全部年度';
    filtersWrap.appendChild(btnAll);

    years.forEach(y => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.dataset.filter = y;
      b.setAttribute('aria-pressed', 'false');
      b.textContent = y;
      filtersWrap.appendChild(b);
    });

    const buttons = Array.from(filtersWrap.querySelectorAll('.btn'));

    const setActive = (btn) => {
      buttons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      const f = btn.dataset.filter;
      render(f);
      // 同步網址 hash（深連結）
      if (f === 'all') {
        history.replaceState(null, '', location.pathname);
      } else {
        location.hash = encodeURIComponent(f);
      }
      // 將焦點帶回列表（與原行為一致）
      cards.setAttribute('tabindex', '-1');
      cards.focus();
      cards.removeAttribute('tabindex');
    };

    // 點擊
    buttons.forEach(b => b.addEventListener('click', () => setActive(b)));

    // 鍵盤左右巡航
    filtersWrap.addEventListener('keydown', (e) => {
      const idx = buttons.indexOf(document.activeElement);
      if (idx === -1) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const n = buttons[(idx + 1) % buttons.length];
        n.focus(); setActive(n);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const p = buttons[(idx - 1 + buttons.length) % buttons.length];
        p.focus(); setActive(p);
      }
    });

    // 從 hash 還原
    const fromHash = decodeURIComponent(location.hash.replace('#', ''));
    if (fromHash && years.includes(fromHash)) {
      const target = buttons.find(b => b.dataset.filter === fromHash);
      if (target) setActive(target);
    } else {
      render('all');
    }
  };

  // 初始化
  buildFilters();

  // 年份顯示（頁尾）
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();
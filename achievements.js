// achievements.js | 緞帶獎章、同項目成績對照與年度篩選
(() => {
  // === 資料 ===
  const DATA = {
    "114學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "特優(90.14)",
        "行進管樂": "特優(91.91)",
        "銅管五重奏": "優等(89.87)",
        "木管五重奏": "優等(86.7)"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "特優",
        "行進管樂": "特優",
        "銅管五重奏": "特優",
        "木管五重奏": "甲等"
      }
    },
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
    },
    "110學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "未出賽",
        "行進管樂": "優等",
        "銅管五重奏": "優等",
        "木管五重奏": "甲等"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "優等",
        "行進管樂": "特優",
        "銅管五重奏": "優等",
        "木管五重奏": "甲等"
      }
    },
    "109學年度": {
      "桃園市學生音樂比賽": {
        "管樂合奏": "未出賽",
        "行進管樂": "優等",
        "銅管五重奏": "未出賽",
        "木管五重奏": "優等"
      },
      "全國學生音樂比賽": {
        "管樂合奏": "疫情停辦",
        "行進管樂": "疫情停辦",
        "銅管五重奏": "疫情停辦",
        "木管五重奏": "疫情停辦"
      }
    }
  };

  const MEDAL_CLASS = {
    '特優': 'is-gold',
    '優等': 'is-silver',
    '甲等': 'is-bronze'
  };
  const SCOPE_LABEL = {
    '桃園市學生音樂比賽': '桃園市',
    '全國學生音樂比賽': '全國'
  };

  // === DOM 參照 ===
  const cards = document.getElementById('cards');
  const filtersWrap = document.getElementById('year-filters');
  const filterStatus = document.getElementById('achievement-filter-status');
  if (!cards || !filtersWrap) return;

  // 年度排序（與原本相同，使用中文數字比較）
  const order = Object.keys(DATA).sort((a, b) => b.localeCompare(a, 'zh-Hant-u-nu-hanidec'));

  // === 元件 ===
  const makeAward = (scope, text) => {
    const award = document.createElement('div');
    award.className = 'achievement-award';
    award.setAttribute('role', 'img');
    award.setAttribute('aria-label', `${scope}：${text}`);

    const scopeLabel = document.createElement('div');
    scopeLabel.className = 'achievement-scope';
    scopeLabel.setAttribute('aria-hidden', 'true');
    scopeLabel.textContent = SCOPE_LABEL[scope] || scope;
    award.appendChild(scopeLabel);

    const match = text.match(/^(特優|優等|甲等)(\([^)]*\))?$/);
    const disc = document.createElement('div');
    disc.className = `achievement-disc ${match ? MEDAL_CLASS[match[1]] : 'is-noaward'}`;
    disc.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'achievement-award-label';
    if (text === '疫情停辦') {
      label.append('疫情', document.createElement('br'), '停辦');
    } else {
      label.textContent = match ? match[1] : text;
    }
    disc.appendChild(label);

    if (match) {
      // 分數獨立定位，不影響獎項大字在圓章中央的位置。
      const score = document.createElement('small');
      score.className = 'achievement-score';
      score.textContent = match[2] || '';
      disc.appendChild(score);
      const ribbon = document.createElement('div');
      ribbon.className = 'achievement-rosette';
      ribbon.setAttribute('aria-hidden', 'true');
      ribbon.appendChild(disc);
      award.appendChild(ribbon);
    } else {
      award.appendChild(disc);
    }
    return award;
  };


  const makeCard = (year, y) => {
    const card = document.createElement('section');
    card.className = 'achievement-year';

    const hd = document.createElement('div');
    hd.className = 'achievement-year-heading';
    const h3 = document.createElement('h3'); h3.textContent = year;
    h3.id = `achievement-year-${year.replace(/\D/g, '')}`;
    card.setAttribute('aria-labelledby', h3.id);
    const desc = document.createElement('p');
    desc.className = 'achievement-year-description';
    desc.append('桃園市 / 全國', document.createElement('br'), '學生音樂比賽');
    hd.appendChild(h3); hd.appendChild(desc);
    card.appendChild(hd);

    const items = document.createElement('div');
    items.className = 'achievement-items';
    const scopes = Object.keys(y);
    const itemNames = [...new Set(scopes.flatMap(scope => Object.keys(y[scope])))];
    itemNames.forEach(item => {
      const article = document.createElement('article');
      article.className = 'achievement-item';
      article.setAttribute('aria-label', item);
      const h4 = document.createElement('h4');
      h4.textContent = item;
      const pair = document.createElement('div');
      pair.className = 'achievement-pair';
      scopes.forEach(scope => pair.appendChild(makeAward(scope, y[scope][item] ?? '—')));
      article.append(h4, pair);
      items.appendChild(article);
    });

    card.appendChild(items);
    return card;
  };

  // === 渲染 ===
  const animateIn = (container) => {
    // 延遲只屬於當次建立的卡片，快速切換不留下舊計時器。
    Array.from(container.children).forEach((el, i) => {
      el.style.setProperty('--achievement-delay', `${60 * i}ms`);
    });
  };

  const render = (filter = 'all') => {
    const frag = document.createDocumentFragment();
    for (const year of order) {
      if (filter !== 'all' && filter !== year) continue;
      frag.appendChild(makeCard(year, DATA[year]));
    }
    cards.innerHTML = '';
    cards.appendChild(frag);
    if (filterStatus) {
      filterStatus.textContent = filter === 'all'
        ? `${order.at(-1).replace('學年度', '')}–${order[0]} · 共 ${order.length} 屆`
        : filter;
    }
    animateIn(cards);
  };

  // === 篩選器：由資料自動產生 + ARIA + 鍵盤巡航 ===
  const buildFilters = () => {
    const years = order;
    const btnAll = document.createElement('button');
    btnAll.type = 'button';
    btnAll.className = 'achievement-filter is-all';
    btnAll.dataset.filter = 'all';
    btnAll.setAttribute('aria-pressed', 'true');
    btnAll.textContent = '全部年度';
    filtersWrap.appendChild(btnAll);

    years.forEach(y => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'achievement-filter';
      b.dataset.filter = y;
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', y);
      const yearNumber = document.createElement('span');
      yearNumber.textContent = y.replace('學年度', '');
      const suffix = document.createElement('small');
      suffix.textContent = '學年度';
      b.append(yearNumber, suffix);
      filtersWrap.appendChild(b);
    });

    const buttons = Array.from(filtersWrap.querySelectorAll('.achievement-filter'));
    let currentFilter = null;

    const setActive = (btn, { updateUrl = true, focusCards = true } = {}) => {
      buttons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      const f = btn.dataset.filter;
      if (f !== currentFilter) {
        render(f);
        currentFilter = f;
      }
      // 同步網址 hash（深連結）
      if (updateUrl) {
        const hash = f === 'all' ? '' : `#${encodeURIComponent(f)}`;
        if (location.hash !== hash) {
          history.pushState(null, '', `${location.pathname}${location.search}${hash}`);
        }
      }
      // 將焦點帶回列表（與原行為一致）
      if (focusCards) {
        cards.focus();
      }
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
        n.focus(); setActive(n, { focusCards: false });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const p = buttons[(idx - 1 + buttons.length) % buttons.length];
        p.focus(); setActive(p, { focusCards: false });
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const target = e.key === 'Home' ? buttons[0] : buttons.at(-1);
        target.focus(); setActive(target, { focusCards: false });
      }
    });

    // 從深連結與瀏覽紀錄還原，不移動使用者目前的焦點。
    const syncFromHash = () => {
      let fromHash = '';
      try {
        fromHash = decodeURIComponent(location.hash.slice(1));
      } catch {
        // 無效的網址片段仍可正常顯示全部年度。
      }
      const filter = years.includes(fromHash) ? fromHash : 'all';
      const target = buttons.find(b => b.dataset.filter === filter);
      setActive(target, { updateUrl: false, focusCards: false });
    };
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    syncFromHash();
  };

  // 初始化
  buildFilters();

  // 年份顯示（頁尾）
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();

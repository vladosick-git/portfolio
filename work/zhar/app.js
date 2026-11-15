(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';

  // детерминированный рандом, чтобы зёрна и карта были одинаковыми при каждой загрузке
  const rng = (seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)(42);

  /* ---- шкала кислотности ---- */
  $$('.dots').forEach(d => {
    const v = +d.dataset.v;
    d.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < v ? '' : 'off'}"></i>`).join('');
  });

  /* ---- зёрна вокруг пачки на первом экране (координаты в rem от левого края макета) ---- */
  const beans = [
    [56.7, 2, 20], [58.7, 3.2, -40], [61.2, 1.2, 70], [59.2, 4.9, 10], [56.7, 12.2, -20], [58.5, 14.4, 55],
    [61, 11.9, -70], [59.5, 17.4, 30], [57.5, 16.9, -50], [62.7, 13.4, 15], [63.7, 16.9, -30], [64.7, 21.4, 60],
    [78.2, -0.2, -15], [81, 1.2, 40], [84.5, .2, -60], [80, 3.7, 25], [82, 4.2, -35], [79.2, 6.7, 80],
    [82, 7.2, 5], [80, 9.2, -55], [83, 9.7, 35], [79, 10.7, -10], [82, 12.4, 65], [80, 14.2, -25],
    [84.5, 19.2, 45], [85, 20.7, -65], [85, -1.3, 20], [55.3, 7.5, 35], [86.8, 22.8, 10]
  ];
  const beanBox = $('#heroBeans');
  // спрайты вырезаны из 02_beans.png, размеры в px исходника
  const BEAN_SIZES = [[102, 98], [118, 100], [110, 101], [102, 93], [77, 119], [95, 88], [104, 93], [108, 122], [113, 101], [110, 97], [82, 100], [89, 110], [78, 95], [103, 116], [92, 108], [109, 92], [85, 89], [104, 74], [89, 109], [108, 94], [108, 132], [116, 109], [74, 105], [113, 106], [97, 94], [109, 98], [80, 106], [102, 111], [100, 88], [101, 86]];
  if (beanBox) {
    beanBox.innerHTML = beans.map(([x, y, r], i) => {
      const k = i % BEAN_SIZES.length, [w] = BEAN_SIZES[k];
      return `<img src="assets/beans/b${String(k).padStart(2, '0')}.png" alt="" style="left:${x}rem;top:${y + 5}rem;width:${(w * .022).toFixed(2)}rem;transform:rotate(${r}deg)">`;
    }).join('');
  }

  /* ---- бегущая лента: дублируем содержимое для бесшовной прокрутки ---- */
  const track = $('#tickerTrack');
  if (track) {
    const chunk = track.innerHTML;
    track.innerHTML = chunk.repeat(6);
  }

  /* ---- фильтры каталога ---- */
  const cards = $('#cards');
  $$('#filters .pill').forEach(p => p.addEventListener('click', () => {
    $$('#filters .pill').forEach(x => x.classList.toggle('is-active', x === p));
    const f = p.dataset.f;
    let shown = 0;
    $$('.card', cards).forEach(c => {
      const ok = f === 'all' || c.dataset.tags.split(' ').includes(f);
      c.classList.toggle('is-hidden', !ok);
      shown += ok;
    });
    cards.classList.toggle('is-empty', !shown);
  }));

  /* ---- зерно / молотый ---- */
  $$('.grind').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', g).forEach(x => x.classList.toggle('is-active', x === b));
  }));

  /* ---- корзина ---- */
  const count = $('#cartCount');
  $$('.add').forEach(btn => btn.addEventListener('click', () => {
    count.textContent = +count.textContent + 1;
    count.classList.add('bump');
    setTimeout(() => count.classList.remove('bump'), 200);
    btn.classList.add('is-added');
    btn.textContent = 'Добавлено ✓';
    setTimeout(() => { btn.classList.remove('is-added'); btn.textContent = 'В корзину'; }, 1400);
  }));

  /* ---- калькулятор подписки ---- */
  const base = { 250: 800, 500: 1600, 1000: 3000 };
  const fmt = n => n.toLocaleString('ru-RU') + ' ₽';
  const calc = () => {
    const w = $('#segWeight .is-active').dataset.w;
    const n = +$('#segFreq .is-active').dataset.n;
    const full = base[w] * n;
    $('#subPrice').textContent = fmt(Math.round(full * .85 / 10) * 10) + '/мес';
    $('#subOld').textContent = fmt(full);
  };
  $$('.seg').forEach(s => s.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', s).forEach(x => x.classList.toggle('is-active', x === b));
    calc();
  }));

  /* ---- карта Казани в стиле бренда ---- */
  const map = $('#map');
  if (map) {
    const W = 846, H = 256;
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent && parent.appendChild(n);
      return n;
    };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice' });
    const defs = el('defs', {}, svg);
    el('rect', { width: W, height: H, fill: '#EFE3CD' }, svg);

    // районы: сетка из неровных четырёхугольников, в каждом своя сетка улиц
    const COLS = 7, ROWS = 3, cw = W / COLS, ch = H / ROWS;
    const pts = [];
    for (let r = 0; r <= ROWS; r++) {
      pts[r] = [];
      for (let c = 0; c <= COLS; c++) {
        const edge = r === 0 || r === ROWS || c === 0 || c === COLS;
        pts[r][c] = [c * cw + (edge && (c === 0 || c === COLS) ? 0 : (rng() - .5) * cw * .5),
                     r * ch + (edge && (r === 0 || r === ROWS) ? 0 : (rng() - .5) * ch * .5)];
      }
    }
    const streets = el('g', { stroke: '#D9BE99', 'stroke-width': 1, fill: 'none' }, svg);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const q = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
      const id = `dc${r}_${c}`;
      el('path', { d: 'M' + q.map(p => p.join(' ')).join('L') + 'Z' }, el('clipPath', { id }, defs));
      const g = el('g', { 'clip-path': `url(#${id})` }, streets);
      const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
      const gg = el('g', { transform: `rotate(${(rng() - .5) * 70} ${cx} ${cy})` }, g);
      const st = 8 + rng() * 6;
      for (let x = cx - 200; x < cx + 200; x += st * (.7 + rng() * .7)) el('line', { x1: x, y1: cy - 200, x2: x + (rng() - .5) * 8, y2: cy + 200 }, gg);
      for (let y = cy - 200; y < cy + 200; y += st * (.9 + rng() * .9)) el('line', { x1: cx - 200, y1: y, x2: cx + 200, y2: y + (rng() - .5) * 8 }, gg);
      // границы районов - улицы покрупнее
      el('path', { d: 'M' + q.map(p => p.join(' ')).join('L') + 'Z', stroke: '#CFA97A', 'stroke-width': 1.6 }, streets);
    }
    // парки поверх сетки
    const parks2 = el('g', { fill: '#B7BC8B' }, svg);
    for (let i = 0; i < 34; i++) {
      const x = rng() * W, y = rng() * H, w = 10 + rng() * 34, h = 7 + rng() * 20;
      el('rect', { x, y, width: w, height: h, rx: 3, opacity: .55 + rng() * .4, transform: `rotate(${(rng() - .5) * 50} ${x} ${y})` }, parks2);
    }

    // река Казанка
    const river = 'M0 104C40 96 90 104 130 120S200 110 250 124 330 150 380 152 470 170 520 186 600 214 650 236L690 256H560C520 236 470 226 420 220S330 214 280 204 170 214 120 206 40 192 0 200Z';
    el('path', { d: river, fill: '#9EA25C', opacity: .9 }, svg);
    el('path', { d: river, fill: 'none', stroke: '#7E8240', 'stroke-width': 1.4, opacity: .7 }, svg);
    // кремль и центр: плотные кварталы у реки
    const kr = el('g', { fill: '#C9C795', stroke: '#9EA25C', 'stroke-width': .8 }, svg);
    for (let i = 0; i < 24; i++) el('rect', { x: 452 + (i % 8) * 13, y: 150 + Math.floor(i / 8) * 11, width: 10, height: 8, rx: 1.2 }, kr);

    // магистрали
    const roads = [
      'M640 0C620 80 600 150 560 256',
      'M0 236C200 228 420 240 846 200',
      'M120 0C150 60 170 100 210 152',
      'M360 0C350 50 340 100 330 130',
      'M846 70C720 80 640 95 540 120 440 145 300 120 190 90 100 70 40 72 0 80',
      'M700 0C720 80 760 150 846 160',
      'M420 256C440 210 470 180 520 160'
    ];
    roads.forEach(d => {
      el('path', { d, fill: 'none', stroke: '#C68D58', 'stroke-width': 4.5, 'stroke-linecap': 'round' }, svg);
      el('path', { d, fill: 'none', stroke: '#EBCB9D', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg);
    });
    // мост
    el('path', { d: 'M600 120 640 256', stroke: '#A97B52', 'stroke-width': 3, 'stroke-dasharray': '1 0' }, svg);

    const t = (txt, attrs) => { const n = el('text', attrs, svg); n.textContent = txt; return n; };
    t('р. Казанка', { x: 150, y: 168, transform: 'rotate(10 150 168)', 'font-family': 'Golos Text', 'font-style': 'italic', 'font-size': 15, fill: '#4F5226' });
    t('Казань', { x: 160, y: 246, 'font-family': 'Golos Text', 'font-weight': 500, 'font-size': 22, fill: '#2B1A12' });

    // метки-пламя
    const pin = (x, y) => {
      const g = el('g', { transform: `translate(${x} ${y})` }, svg);
      el('ellipse', { cx: 0, cy: 22, rx: 11, ry: 3.5, fill: '#2B1A12', opacity: .25 }, g);
      el('rect', { x: -19, y: -28, width: 38, height: 44, rx: 7, fill: '#FFF6EC', stroke: '#2B1A12', 'stroke-width': 1.2, opacity: .95 }, g);
      el('use', { href: '#flame', x: -12, y: -24, width: 24, height: 34, color: '#FF5A1F', style: '--flame-in:#FFF6EC' }, g);
    };
    pin(414, 96);
    pin(594, 152);

    t('Здесь', { x: 740, y: 156, transform: 'rotate(-10 740 156)', 'font-family': 'Caveat', 'font-weight': 600, 'font-size': 24, fill: '#2B1A12' });
    t('хороший', { x: 740, y: 182, transform: 'rotate(-10 740 182)', 'font-family': 'Caveat', 'font-weight': 600, 'font-size': 24, fill: '#2B1A12' });
    t('кофе', { x: 752, y: 212, transform: 'rotate(-10 752 212)', 'font-family': 'Caveat', 'font-weight': 600, 'font-size': 24, fill: '#2B1A12' });
    el('path', { d: 'M796 206c14-2 24-8 32-18m-11 0 11-1 1 11', fill: 'none', stroke: '#2B1A12', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);

    map.appendChild(svg);
  }
})();

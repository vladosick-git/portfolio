/* Страница: что показывать на каждом шаге прокрутки.
   Сцена частиц живёт в swarm.js, фигуры в shapes.js, тексты и работы в data.js. */
import { Swarm } from './swarm.js';
import * as S from './shapes.js';
import { Pieces } from './pieces.js';
import { Devices } from './devices.js';

const D = document.documentElement, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const SITE = window.SITE, WORKS = SITE.works, NW = WORKS.length;
const calm = D.classList.contains('calm');
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const c01 = x => Math.max(0, Math.min(1, x));
const sm = (a, b, x) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- контакты ---------- */
const tg = SITE.telegram ? 'https://t.me/' + SITE.telegram.replace(/^@/, '') : '';
$$('[data-contact]').forEach(a => {
  a.target = '_blank'; a.rel = 'noopener';
  if (tg) a.href = tg; else { a.href = SITE.github; a.textContent = 'Написать через GitHub'; }
});
$$('[data-github]').forEach(a => { if (!tg) return a.remove(); a.href = SITE.github; a.target = '_blank'; a.rel = 'noopener'; });
$('#year').textContent = new Date().getFullYear();
$$('#stepsList p').forEach(p => { p.innerHTML = `<span>${p.innerHTML}</span>`; });

/* ---------- зерно ---------- */
(function () {
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'), d = g.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  $('.grain').style.backgroundImage = `url(${c.toDataURL()})`;
})();

/* ---------- работы: разметка ---------- */
const secs = { hero: $('#hero'), about: $('#about'), works: $('#works'), steps: $('#steps'), contact: $('#contact') };
secs.works.style.height = NW * 170 + 100 + 'vh';
const variant = (src, k) => src.replace(/\.(jpg|png|webp)$/, `-${k}.$1`);
$('#scr').innerHTML = WORKS.map(w => `<img src="${esc(w.img)}" alt="Сайт «${esc(w.title)}» на компьютере">`).join('');
$('#phScr').innerHTML = WORKS.map(w => `<img src="${esc(variant(w.img, 'm'))}" alt="Сайт «${esc(w.title)}» на телефоне">`).join('');
$('#total').textContent = pad(NW);
const scrImgs = $$('#scr img'), phImgs = $$('#phScr img'), info = $('#info'), device = $('#device');
let curWork = -1;
function showWork(k) {
  if (k === curWork) return;
  curWork = k;
  const w = WORKS[k];
  scrImgs.forEach((im, i) => im.classList.toggle('is-on', i === k));
  phImgs.forEach((im, i) => im.classList.toggle('is-on', i === k));
  const meta = [
    w.price && `<span class="is-price">Цена такого проекта<b>${esc(w.price)}</b></span>`,
    w.term && `<span>Срок<b>${esc(w.term)}</b></span>`,
  ].filter(Boolean).join('');
  const preview = fine && innerWidth > 860;
  const parts = [
    `<p class="info__kind">${esc(w.kind)}, демо-проект</p>`,
    `<h3 class="info__title">${esc(w.title)}</h3>`,
    `<p class="info__lead">${esc(w.lead)}</p>`,
    `<ul class="info__points">${w.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`,
    w.stack && `<p class="info__stack">${esc(w.stack)}</p>`,
    meta && `<div class="info__meta">${meta}</div>`,
    `<div class="actions">${preview ? `<button class="btn btn--line" type="button" data-v="${k}">Предпросмотр</button>` : ''}<a class="btn" href="${esc(w.link)}" target="_blank" rel="noopener">Открыть сайт</a></div>`
  ].filter(Boolean);
  info.classList.remove('is-in');
  info.innerHTML = parts.map((p, i) => p.replace(/^<(\w+)/, `<$1 style="--i:${i}"`)).join('');
  info.offsetWidth;
  info.classList.add('is-in');
  $('#cur').textContent = pad(k + 1);
  $('#prev').disabled = k === 0; $('#next').disabled = k === NW - 1;
  $('#bar').style.setProperty('--p', ((k + 1) / NW).toFixed(3));
}

/* ---------- предпросмотр ---------- */
const viewer = $('#viewer'), vFrame = $('#vFrame'), vStage = $('#vStage');
function setDev(d) { vStage.className = 'viewer__stage ' + d; $$('#vDev button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === d)); }
function openV(k) {
  const w = WORKS[k]; if (!w) return;
  vFrame.src = w.link; $('#vTitle').textContent = `${w.title}, ${w.kind.toLowerCase()}`; $('#vOpen').href = w.link;
  setDev(''); viewer.hidden = false; document.body.style.overflow = 'hidden'; window.LEN?.stop(); $('#vClose').focus();
}
function closeV() {
  if (viewer.hidden) return;
  viewer.hidden = true; vFrame.src = 'about:blank'; document.body.style.overflow = ''; window.LEN?.start();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) openV(+b.dataset.v); });
$('#vDev').onclick = e => { const b = e.target.closest('button'); if (b) setDev(b.dataset.d); };
$('#vClose').onclick = closeV;

/* ---------- меню на телефоне ---------- */
const burger = $('#burger');
const setMenu = o => { D.classList.toggle('mopen', o); burger.setAttribute('aria-expanded', o); burger.textContent = o ? 'Закрыть' : 'Меню'; };
burger.onclick = () => setMenu(!D.classList.contains('mopen'));

/* ---------- точки остановки: в каком месте прокрутки какая фигура собрана ---------- */
const order = ['hero', 'a1', 'a2', 'a3', ...WORKS.flatMap((w, k) => ['o' + k, 's' + k]), 'n0', 'n1', 'n2', 'n3', 'plane'];
const I_WORK = 4, I_STEP = 4 + NW * 2;
let stops = [];
function measure() {
  const H = innerHeight, top = e => e.offsetTop, span = e => Math.max(1, e.offsetHeight - H), max = D.scrollHeight - H;
  stops = [{ y: 0, hold: 0.2 }];
  [0.1, 0.5, 0.9].forEach(f => stops.push({ y: top(secs.about) + span(secs.about) * f, hold: 0.25 }));
  WORKS.forEach((w, k) => {
    stops.push({ y: top(secs.works) + (span(secs.works) * (k + 0.12)) / NW, hold: 0.22 });
    stops.push({ y: top(secs.works) + (span(secs.works) * (k + 0.5)) / NW, hold: 0.5 });
  });
  [0.08, 0.36, 0.64, 0.92].forEach(f => stops.push({ y: top(secs.steps) + span(secs.steps) * f, hold: 0.25 }));
  stops.push({ y: Math.min(max, top(secs.contact)), hold: 0 });
}
function state(y) {
  let i = 0;
  while (i < stops.length - 2 && y >= stops[i + 1].y) i++;
  const a = stops[i], b = stops[i + 1], t = c01((y - a.y) / Math.max(1, b.y - a.y));
  return { i, t, e: sm(a.hold, 1, t) };
}
const scrollToY = (y, dur = 1.4) => { if (window.LEN) window.LEN.scrollTo(y, { duration: dur }); else scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' }); };
const workY = k => { const a = stops[I_WORK + k * 2 + 1], b = stops[I_WORK + k * 2 + 2]; return a.y + (b.y - a.y) * 0.2; };
$('#prev').onclick = () => scrollToY(workY(Math.max(0, curWork - 1)));
$('#next').onclick = () => scrollToY(workY(Math.min(NW - 1, curWork + 1)));
const anchors = { '#hero': () => 0, '#about': () => stops[1].y, '#works': () => workY(0), '#steps': () => stops[I_STEP].y, '#contact': () => stops[stops.length - 1].y };
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const f = anchors[a.getAttribute('href')]; if (!f) return;
  e.preventDefault(); setMenu(false); scrollToY(f(), 1.8);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeV(); setMenu(false); return; }
  if (!viewer.hidden) return;
  const r = secs.works.getBoundingClientRect();
  if (r.top > 10 || r.bottom < innerHeight - 10) return;
  if (e.key === 'ArrowRight') $('#next').click();
  if (e.key === 'ArrowLeft') $('#prev').click();
});

/* ---------- страница следует за прокруткой ---------- */
const heroText = $('#heroText'), hint = $('#hint'), skills = $$('#skills li'), stepLis = $$('#stepsList li'), navLinks = $$('#nav a');
let sw = null, pieces = null, devices = null, mode = 'intro';
function sync({ i, t }) {
  const y = scrollY, H = innerHeight;
  if (mode === 'scroll') {
    const h = c01(y / (H * 0.45));
    heroText.style.opacity = (1 - h).toFixed(3);
    heroText.style.transform = h ? `translate3d(0,${(-h * 60).toFixed(1)}px,0)` : '';
    heroText.style.filter = h > 0.02 && h < 1 ? `blur(${(h * 8).toFixed(1)}px)` : '';
    heroText.style.visibility = h >= 1 ? 'hidden' : '';
    hint.style.opacity = h > 0 ? Math.max(0, 1 - h * 3).toFixed(2) : '';
  }
  const ai = i === 0 ? 0 : i === 1 ? (t < 0.62 ? 0 : 1) : i === 2 ? (t < 0.62 ? 1 : 2) : 2;
  skills.forEach((li, k) => li.classList.toggle('is-on', k === ai));

  const p = i - I_WORK + t, k = Math.max(0, Math.min(NW - 1, Math.floor((p + 0.5) / 2))), q = p - (2 * k + 1);
  const sharp = sw ? (q < 0 ? sm(-0.07, 0, q) : 1 - sm(0.34, 0.48, q)) : 1;
  device.style.setProperty('--sharp', devices ? '0' : sharp.toFixed(3));
  devices?.show(k, sharp);
  showWork(k);

  const step = Math.max(0, Math.min(3, Math.round(i - I_STEP + t)));
  stepLis.forEach((li, n) => li.classList.toggle('is-on', n === step));
  const r = secs.steps.getBoundingClientRect(), paper = Math.min(sm(H * 0.75, H * 0.2, r.top), sm(H * 0.25, H * 0.8, r.bottom));
  D.style.setProperty('--paper', paper.toFixed(3));
  D.classList.toggle('light', paper > 0.5 && !D.classList.contains('mopen'));
  if (sw) { sw.fog = 1 - paper; sw.par = devices ? 1 : 1 - sharp; sw.scroll = y / H; }

  const mid = y + H * 0.5;
  let here = '';
  ['about', 'works', 'steps', 'contact'].forEach(id => { if (mid >= secs[id].offsetTop) here = '#' + id; });
  navLinks.forEach(a => a.classList.toggle('is-here', a.getAttribute('href') === here));
  /* с какой стороны экрана сейчас текст: там потоки пыли приглушаются */
  if (sw) sw.side = here === '#works' || here === '#steps' ? 1 : here === '#contact' ? (innerWidth > 860 ? 0 : 1) : -1;
}

/* ---------- фигуры роя ---------- */
function defineBuilders(imgs, imgsM) {
  const N = sw.N, B = sw.builders;
  const wide = () => sw.W > 860;
  const box = () => ({ x0: sw.wx(-sw.W * 0.15), x1: sw.wx(sw.W * 1.15), y0: sw.wy(sw.H * 1.12), y1: sw.wy(-sw.H * 0.12), z0: -7, z1: 3.6 });
  const fallbackImg = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 10; const g = c.getContext('2d'); g.fillStyle = '#2a2520'; g.fillRect(0, 0, 16, 10); return c; })();
  /* экран + остаток частиц уходит в пыль; возвращает число столбцов сетки */
  const scr = (t, ix, from, n, img, R, o, pal = S.PAL_DARK) => {
    const r = S.screen(t, ix, from, n, img || fallbackImg, R, o);
    if (n > r.used) S.dust(t, ix, from + r.used, n - r.used, box(), pal);
    return r.cols;
  };
  const scrRect = () => {
    const s = $('#worksStick').getBoundingClientRect(), el = $('#scr'), r = el.getBoundingClientRect(), b = el.clientLeft;
    return { x: r.left - s.left + b, y: r.top - s.top + b, w: r.width - 2 * b, h: r.height - 2 * b };
  };

  B.dust0 = t => { S.dust(t, S.perm(N), 0, N, box(), S.PAL_DARK); t.size = 2.2; };

  B.name = t => {
    const ix = S.perm(N), n = Math.round(N * 0.86), w = sw.W * (wide() ? 0.6 : 0.88) * sw.u;
    S.fromCanvas(t, ix, 0, n, S.textCanvas(SITE.name, 1400, 320), { cx: 0, cy: 0, w, h: (w * 320) / 1400 }, { depth: 0.12 });
    S.dust(t, ix, n, N - n, box(), S.PAL_DARK);
    t.size = 2.1; t.wave = 0.05;
  };

  /* первый экран: сайт работы k крупно, два следующих в глубине, название работы пылью позади */
  WORKS.forEach((w0, k) => {
    B['h' + k] = t => {
      const ix = S.perm(N), u = sw.u, W = sw.W, H = sw.H, im = j => imgs[(k + j) % NW];
      let from = 0, C;
      if (wide()) {
        const w = W * 0.52 * u, n1 = Math.round(N * 0.62), n2 = Math.round(N * 0.1), n3 = Math.round(N * 0.075), n4 = Math.round(N * 0.085);
        C = [sw.wx(W * 0.7), sw.wy(H * 0.49), 0];
        const cols = scr(t, ix, 0, n1, im(0), { cx: C[0], cy: C[1], w, h: w / 1.6, z: 0 }, { dissolve: true, ry: -0.36, rx: 0.1, rz: -0.05 });
        t.size = (w / u / cols) * 1.3; from = n1;
        const w2 = W * 0.22 * u;
        scr(t, ix, from, n2, im(1), { cx: sw.wx(W * 0.47) * 1.2, cy: sw.wy(H * 0.15) * 1.2, w: w2, h: w2 / 1.6, z: -2 }, { dissolve: true, ry: -0.3, rx: 0.12, rz: 0.04 }); from += n2;
        const w3 = W * 0.19 * u;
        scr(t, ix, from, n3, im(2), { cx: sw.wx(W * 0.95) * 1.3, cy: sw.wy(H * 0.2) * 1.3, w: w3, h: w3 / 1.6, z: -3 }, { dissolve: true, ry: -0.42, rx: 0.1, rz: -0.08 }); from += n3;
        const tw = W * 0.6 * u;
        S.fromCanvas(t, ix, from, n4, S.textCanvas(w0.title, 1500, 360, 900), { cx: sw.wx(W * 0.69) * 1.25, cy: sw.wy(H * 0.885) * 1.25, w: tw, h: (tw * 360) / 1500, z: -2.5 }, { tint: [168, 104, 54], speck: 0.18, depth: 0.1 }); from += n4;
      } else {
        const w = W * 1.02 * u, n1 = Math.round(N * 0.8);
        C = [sw.wx(W * 0.56), sw.wy(H * 0.78), 0];
        const cols = scr(t, ix, 0, n1, im(0), { cx: C[0], cy: C[1], w, h: w / 1.6, z: 0 }, { dissolve: true, ry: -0.3, rx: 0.08, rz: -0.06 });
        t.size = (w / u / cols) * 1.3; from = n1;
      }
      S.dust(t, ix, from, N - from, box(), S.PAL_DARK);
      t.wave = 0.07; t.sq = 1; t.center = C; t.wob = 0.045;
    };
  });

  /* область справа (на телефоне снизу), где рой показывает «что я делаю» */
  const stage = () => wide()
    ? { cx: sw.wx(sw.W * 0.72), cy: sw.wy(sw.H * 0.52), w: sw.W * 0.48 * sw.u, h: sw.H * 0.6 * sw.u }
    : { cx: sw.wx(sw.W * 0.5), cy: sw.wy(sw.H * 0.74), w: sw.W * 0.9 * sw.u, h: sw.H * 0.34 * sw.u };

  B.a1 = t => {
    const ix = S.perm(N), n = Math.round(N * 0.88), R = stage(), w = Math.min(R.w * 0.92, (R.h * 640) / 420);
    S.fromCanvas(t, ix, 0, n, S.siteCanvas(), { cx: R.cx, cy: R.cy, w, h: (w * 420) / 640 }, { ry: -0.32, rx: 0.06, depth: 0.05 });
    S.dust(t, ix, n, N - n, box(), S.PAL_DARK);
    t.size = 2.3; t.wave = 0.04;
  };

  B.a2 = t => {
    const ix = S.perm(N), n = Math.round(N * 0.92), R = stage();
    S.chaosTable(t, ix, 0, n, { cx: R.cx - (wide() ? sw.W * 0.05 * sw.u : 0), cy: R.cy, w: R.w * 1.12, h: R.h });
    S.dust(t, ix, n, N - n, box(), S.PAL_DARK);
    t.size = 2.3;
  };

  const paperPlane = (t, C, s, big) => {
    const ix = S.perm(N), n = Math.round(N * 0.5), nt = Math.round(N * 0.38), o = { ry: -0.7, rx: 0.38, rz: 0.3 };
    S.obj(t, ix, 0, n, S.plane, C, s, o);
    const tail = S.rot([-1, 0, 0], o.ry, o.rx, o.rz), dir = S.rot([1, 0, 0], o.ry, o.rx, o.rz);
    S.trail(t, ix, n, nt, [C[0] + tail[0] * s, C[1] + tail[1] * s, C[2] + tail[2] * s], dir, s * (big ? 4.2 : 1.9));
    S.dust(t, ix, n + nt, N - n - nt, box(), S.PAL_DARK);
    t.center = C; t.wob = 0.22; t.size = 2.4;
  };
  B.a3 = t => { const R = stage(); paperPlane(t, [R.cx, R.cy, 0], Math.min(R.w * 0.36, R.h * 0.5)); };
  B.plane = t => paperPlane(t, [sw.wx(sw.W * 0.52), sw.wy(sw.H * (wide() ? 0.29 : 0.27)), 0], Math.min(sw.W * (wide() ? 0.19 : 0.34), sw.H * 0.27) * sw.u, true);

  const OBJ = { bean: [S.mound, { ry: 0.3, rx: 0.34 }, 0.22], tyre: [S.tyre, { ry: -0.55, rx: 0.15 }, 0.6], house: [S.house, { ry: 0.6, rx: 0.22 }, 0.5] };
  WORKS.forEach((w, k) => {
    B['o' + k] = t => {
      const ix = S.perm(N), n = Math.round(N * 0.86), r = scrRect(), u = sw.u;
      const C = [sw.wx(r.x + r.w / 2), sw.wy(r.y + r.h / 2), 0], s = (wide() ? Math.min(r.h * 0.62, r.w * 0.4) : r.h * 0.46) * u;
      if (w.object === 'phone') { const o = { ry: -0.45, rx: 0.1 }; S.phone(t, ix, 0, n, imgsM[k] || imgs[k] || fallbackImg, C, s * 1.45, o); t.wob = 0.45; pieces?.place(k, C, s * 1.45, o, t.wob); }
      else { const [fn, o, wob] = OBJ[w.object] || OBJ.bean, sc = w.object === 'bean' ? s * 1.02 : s; S.obj(t, ix, 0, n, fn, C, sc, o); t.wob = wob; pieces?.place(k, C, sc, o, wob); }
      S.dust(t, ix, n, N - n, box(), S.PAL_DARK);
      t.center = C; t.size = 2.3;
    };
    /* работа открыта: рой рисует всё, чего нет у твёрдых устройств — кромки, подставку, осыпь и предметы рядом */
    B['s' + k] = t => {
      const ix = S.perm(N), u = sw.u, P = devices.layout(scrRect()), M = P.mon, F = P.ph;
      const nM = Math.round(N * 0.5), nP = Math.round(N * 0.08), nE = Math.round(N * 0.085), nE2 = Math.round(N * 0.03), nS = Math.round(N * 0.03), nF = Math.round(N * 0.09), nG = Math.round(N * 0.022);
      let from = 0;
      const cols = scr(t, ix, from, nM, imgs[k], { cx: M.C[0], cy: M.C[1], z: M.C[2], w: M.w, h: M.h }, M.rot); from += nM;
      scr(t, ix, from, nP, imgsM[k] || imgs[k], { cx: F.C[0], cy: F.C[1], z: F.C[2], w: F.w, h: F.h }, F.rot); from += nP;
      S.frame(t, ix, from, nE, M, M.w * 0.014); from += nE;
      S.frame(t, ix, from, nE2, F, F.w * 0.04); from += nE2;
      S.stand(t, ix, from, nS, M); from += nS;
      S.fall(t, ix, from, nF, M); from += nF;
      /* рядом с устройствами парят предметы этой работы */
      const fn = { bean: S.bean, tyre: S.tyre, house: S.house }[w.object];
      if (fn) [[0.6, 0.6, 0.085, 0.5], [-0.46, -0.7, 0.06, -0.8], [0.72, -0.62, 0.04, 1.4]].forEach(([dx, dy, sc, a]) => {
        S.obj(t, ix, from, nG, fn, [M.C[0] + M.w * dx, M.C[1] + M.h * dy, 0.3], M.h * sc * (w.object === 'bean' ? 1 : 0.8), { ry: a, rx: 0.4, rz: a * 0.7 }); from += nG;
      });
      S.dust(t, ix, from, N - from, box(), S.PAL_DARK);
      t.size = (M.w / u / cols) * 1.3; t.sq = 1;
    };
  });

  for (let k = 0; k < 4; k++) {
    B['n' + k] = t => {
      const ix = S.perm(N), n = Math.round(N * 0.9), u = sw.u, W = sw.W, H = sw.H;
      const h = (wide() ? Math.min(H * 0.6, W * 0.34) : Math.min(H * 0.26, W * 0.62)) * u, w = h * 1.3;
      S.fromCanvas(t, ix, 0, n, S.textCanvas('0' + (k + 1), 780, 600, 900), { cx: sw.wx(W * (wide() ? 0.27 : 0.5)), cy: sw.wy(H * (wide() ? 0.56 : 0.34)), w, h },
        { tint: [38, 34, 31], speck: 0.04, blow: true, depth: 0.25 });
      S.dust(t, ix, n, N - n, box(), S.PAL_LIGHT);
      t.size = 2.4;
    };
  }
}

/* ---------- запуск ---------- */
const loadImg = src => new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const tween = (fn, ms, at, cb) => new Promise(res => {
  const t0 = performance.now(); let fired = false;
  const step = now => {
    const k = c01((now - t0) / ms); fn(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    if (cb && !fired && k >= at) { fired = true; cb(); }
    if (k < 1) requestAnimationFrame(step); else res();
  };
  requestAnimationFrame(step);
});

let pairA = 'dust0', pairB = 'dust0', introMix = 0;
let heroCur = 0, heroNext = 0, heroMix = 0, heroAt = 0, heroT0 = 0, cycling = false;
const reveal = () => { D.classList.add('go'); D.classList.remove('lock'); setTimeout(() => heroText.classList.add('is-live'), 1400); };

function startLenis() {
  if (calm || !fine) return;
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';
  s.onload = () => {
    if (!window.Lenis) return;
    const L = (window.LEN = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, prevent: n => !!n.closest?.('.viewer,.mnav') }));
    const raf = t => { L.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  };
  document.head.append(s);
}

async function boot() {
  measure();
  const small = innerWidth < 860, cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  const count = small ? 60000 : cores >= 8 && mem >= 8 ? 180000 : 130000;
  if (!calm) {
    try {
      sw = new Swarm($('#swarm'), count, !small);
      /* если видеокарта не выдержала, показываем обычную страницу, а не чёрный экран */
      $('#swarm').addEventListener('webglcontextlost', e => { e.preventDefault(); sw = null; pieces = null; devices = null; mode = 'scroll'; D.classList.add('nogl'); reveal(); });
    } catch (e) { console.warn('3D недоступно', e); D.classList.add('nogl'); }
  }
  const t0 = performance.now();
  let slow = 0, frames = 0, last = t0;
  const frame = now => {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const st = state(scrollY);
    sync(st);
    if (!sw) return;
    /* если кадры идут медленно, снижаем чёткость */
    if (mode === 'scroll' && now - last < 200) {
      slow += now - last;
      if (++frames === 90) {
        const ms = slow / 90; window.__frameMs = +ms.toFixed(1);
        if (ms > 22 && sw.glow && sw.glow.visible) sw.glow.visible = false;
        else if (ms > 22 && sw.maxDpr > 1) { sw.maxDpr = 1; sw.resize(); }
        frames = 0; slow = 0;
      }
    }
    last = now;
    const T = (now - t0) / 1000;
    if (pieces) {
      /* детали появляются, когда предмет из пыли собрался, и разлетаются, когда он начинает превращаться в экран */
      const p = mode === 'scroll' ? st.i - I_WORK + st.t : -9;
      pieces.frame(T, k => (p < 2 * k ? sm(2 * k - 0.16, 2 * k - 0.01, p) : 1 - sm(2 * k + 0.2, 2 * k + 0.42, p)));
    }
    if (mode !== 'scroll') { sw.setPair(pairA, pairB); sw.render(T, introMix); return; }
    if (st.i > 0) { heroAt = now; sw.setPair(order[st.i], order[st.i + 1]); sw.render(T, st.e); return; }
    /* страница стоит наверху: первый экран сам пересыпается из работы в работу */
    if (st.t < 0.01) {
      if (!cycling && now - heroAt > 5200 && NW > 1 && sw.has('h' + ((heroCur + 1) % NW))) { cycling = true; heroNext = (heroCur + 1) % NW; heroT0 = now; }
      if (cycling) {
        const k = c01((now - heroT0) / 2800);
        heroMix = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        if (k >= 1) { cycling = false; heroCur = heroNext; heroAt = now; heroMix = 0; }
      }
    } else if (cycling) { cycling = false; heroCur = heroNext; heroMix = 0; heroAt = now; }
    else heroAt = now;
    if (cycling) { sw.setPair('h' + heroCur, 'h' + heroNext); sw.render(T, heroMix); }
    else { sw.setPair('h' + heroCur, order[1]); sw.render(T, st.e); }
  };

  if (!sw) { mode = 'scroll'; reveal(); requestAnimationFrame(frame); return; }

  /* настоящий счётчик загрузки */
  const num = $('#ldN');
  let done = 0;
  const srcs = [...WORKS.map(w => w.img), ...WORKS.map(w => variant(w.img, 'm'))], total = srcs.length + 1;
  const tick = p => p.then(v => { done++; return v; });
  const all = Promise.all(srcs.map(s => tick(loadImg(s))));
  const fonts = tick(Promise.race([document.fonts ? Promise.all([document.fonts.load('800 80px Onest', SITE.name), document.fonts.load('900 80px Onest', '0123')]).catch(() => {}) : Promise.resolve(), wait(2200)]));
  let shown = 0;
  const cnt = setInterval(() => { shown += ((done / total) * 100 - shown) * 0.25; num.textContent = Math.round(shown); }, 50);

  const full = D.classList.contains('intro');
  sw.builders.dust0 = t => { S.dust(t, S.perm(sw.N), 0, sw.N, { x0: sw.wx(-sw.W * 0.15), x1: sw.wx(sw.W * 1.15), y0: sw.wy(sw.H * 1.12), y1: sw.wy(-sw.H * 0.12), z0: -7, z1: 3.6 }, S.PAL_DARK); t.size = 2.2; };
  requestAnimationFrame(frame);
  await fonts;
  const loaded = await Promise.race([all, wait(9000).then(() => null)]) || [];
  /* твёрдые детали поверх предметов из пыли: дом из кирпичей, шина из блоков, телефон из плиток */
  devices = new Devices(sw, loaded.slice(0, NW), loaded.slice(NW));
  pieces = new Pieces(sw);
  pieces.loadMatcaps('img/matcap');
  WORKS.forEach((w, k) => { if (Pieces.has(w.object)) pieces.add(k, w.object, w.object === 'phone' ? loaded[NW + k] : null); });
  defineBuilders(loaded.slice(0, NW), loaded.slice(NW));
  if (full) { pairB = 'name'; await tween(v => (introMix = v), 1500); await wait(450); }
  clearInterval(cnt); num.textContent = 100;
  sw.target('h0');
  pairA = full ? 'name' : 'dust0'; pairB = 'h0'; introMix = 0;
  await tween(v => (introMix = v), full ? 2300 : 1300, 0.55, reveal);
  mode = 'scroll'; heroAt = performance.now();
  try { sessionStorage.setItem('roy-intro', '1'); } catch (e) {}
  startLenis();

  /* остальные фигуры считаем заранее, по одной, чтобы прокрутка не дёргалась */
  const keys = [...WORKS.map((w, k) => 'h' + k), ...order.slice(1)];
  let pi = 0;
  const pre = () => { while (pi < keys.length && sw.has(keys[pi])) pi++; if (pi < keys.length) { sw.target(keys[pi]); setTimeout(pre, 40); } };
  setTimeout(pre, 300);

  let lw = innerWidth, lh = innerHeight, rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      sw.resize(); measure();
      if (innerWidth !== lw || Math.abs(innerHeight - lh) > 120) { lw = innerWidth; lh = innerHeight; sw.invalidate(); cycling = false; curWork = -1; pi = 0; setTimeout(pre, 300); }
    }, 180);
  });
  addEventListener('pointermove', e => sw.pointer(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', e => sw.pointer(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') setTimeout(() => sw.pointerOff(), 500); }, { passive: true });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) sw.pointerOff(); });
}

addEventListener('resize', () => { if (!sw) measure(); });
/* Вкладка может открыться в фоне с нулевым размером окна: ждём настоящий размер.
   Если сцена всё же не запустилась, показываем обычную страницу, а не чёрный экран. */
(async function start() {
  while (!(innerWidth > 0 && innerHeight > 0)) await wait(120);
  try { await boot(); }
  catch (e) { console.warn('сцена не запустилась', e); sw = null; pieces = null; devices = null; mode = 'scroll'; D.classList.add('nogl'); reveal(); }
})();

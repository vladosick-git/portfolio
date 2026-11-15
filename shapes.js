/* Генераторы точек: каждая функция заполняет часть цели координатами и цветами частиц.
   Цвет хранит ещё и «твёрдость»: альфа выше 178 это твёрдая частица, ниже это пыль, которая плавает. */

const rnd = Math.random;

export const PAL_DARK = [[214, 138, 74], [214, 138, 74], [242, 234, 219], [140, 131, 119], [140, 131, 119], [240, 83, 28]];
export const PAL_LIGHT = [[38, 34, 31], [38, 34, 31], [84, 76, 68], [120, 110, 100], [214, 138, 74]];

/* случайная перестановка: чтобы при превращении частицы летели вперемешку, а не строем */
export function perm(n) {
  const a = new Uint32Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  for (let i = n - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

export function put(t, i, x, y, z, r, g, b, a) {
  const p = i * 3, c = i * 4;
  t.pos[p] = x; t.pos[p + 1] = y; t.pos[p + 2] = z;
  t.col[c] = r; t.col[c + 1] = g; t.col[c + 2] = b; t.col[c + 3] = a;
}

export function rot(p, ry, rx, rz) {
  let x = p[0], y = p[1], z = p[2], s, c, t;
  if (rz) { s = Math.sin(rz); c = Math.cos(rz); t = x * c - y * s; y = x * s + y * c; x = t; }
  if (ry) { s = Math.sin(ry); c = Math.cos(ry); t = x * c + z * s; z = -x * s + z * c; x = t; }
  if (rx) { s = Math.sin(rx); c = Math.cos(rx); t = y * c - z * s; z = y * s + z * c; y = t; }
  p[0] = x; p[1] = y; p[2] = z;
  return p;
}

/* картинка, уменьшенная до сетки cols×rows: один пиксель на одну частицу */
const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
export function sample(img, cols, rows) {
  cv.width = cols; cv.height = rows;
  const asp = cols / rows;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  let sw = iw, sh = sw / asp, sx = 0;
  if (sh > ih) { sh = ih; sw = sh * asp; sx = (iw - sw) / 2; }
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, sx, 0, sw, sh, 0, 0, cols, rows);
  return cx.getImageData(0, 0, cols, rows).data;
}

/* экран сайта: прямоугольник R={cx,cy,w,h,z}, частицы несут цвета скриншота */
export function screen(t, ix, from, n, img, R, o = {}) {
  const asp = R.w / R.h;
  const cols = Math.max(2, Math.floor(Math.sqrt(n * asp))), rows = Math.max(2, Math.floor(n / cols));
  const d = sample(img, cols, rows), p = [0, 0, 0], used = cols * rows;
  for (let j = 0; j < used; j++) {
    const gx = j % cols, gy = (j / cols) | 0, u = (gx + 0.5) / cols, v = (gy + 0.5) / rows;
    p[0] = (u - 0.5) * R.w; p[1] = (0.5 - v) * R.h; p[2] = 0;
    let a = 255;
    if (o.dissolve) {
      /* правый край рассыпается в поток */
      const k = (u - 0.68) / 0.32;
      if (k > 0 && rnd() < k * k * 0.97) {
        const q = rnd(), q2 = rnd();
        p[0] += q * R.w * (0.12 + 0.85 * q2);
        p[1] += (Math.sin(q * 2.6 + v * 3) * 0.16 + q * q * 0.55 - (q2 - 0.5) * 0.3 * q) * R.h;
        p[2] += (rnd() - 0.5) * 2.4 * q;
        a = q > 0.4 ? 150 : 230;
      }
    }
    rot(p, o.ry, o.rx, o.rz);
    const c = j * 4;
    put(t, ix[from + j], p[0] + R.cx, p[1] + R.cy, p[2] + (R.z || 0), d[c], d[c + 1], d[c + 2], a);
  }
  return { used, cols };
}

export function dust(t, ix, from, n, B, pal) {
  for (let j = 0; j < n; j++) {
    const c = pal[(rnd() * pal.length) | 0];
    put(t, ix[from + j], B.x0 + rnd() * (B.x1 - B.x0), B.y0 + rnd() * (B.y1 - B.y0), B.z0 + rnd() * (B.z1 - B.z0), c[0], c[1], c[2], 36 + rnd() * 68);
  }
}

/* точки по закрашенным пикселям холста: текст, цифры, схема сайта */
export function fromCanvas(t, ix, from, n, c, R, o = {}) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, px = [];
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 90) px.push(i);
  const p = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    const k = px.length ? px[(rnd() * px.length) | 0] : 0, x = k % w, y = (k / w) | 0;
    const u = (x + rnd()) / w, v = (y + rnd()) / h;
    p[0] = (u - 0.5) * R.w; p[1] = (0.5 - v) * R.h; p[2] = (rnd() - 0.5) * (o.depth || 0);
    let a = 240;
    if (o.blow && u > 0.5 && v < 0.55) {
      /* правый верхний угол сдувает */
      const kk = Math.min(1, (u - 0.5) / 0.5) * Math.min(1, (0.55 - v) / 0.55);
      if (rnd() < kk * 0.9) {
        const q = rnd();
        p[0] += q * R.w * 0.3; p[1] += q * q * R.h * 0.42 + (rnd() - 0.5) * q * R.h * 0.16; p[2] += (rnd() - 0.5) * q * 2;
        a = 140;
      }
    }
    rot(p, o.ry, o.rx, o.rz);
    const ci = k * 4;
    let r = d[ci], g = d[ci + 1], b = d[ci + 2];
    if (o.tint) { r = o.tint[0]; g = o.tint[1]; b = o.tint[2]; }
    if (o.speck && rnd() < o.speck) { r = 214; g = 138; b = 74; }
    put(t, ix[from + j], p[0] + R.cx, p[1] + R.cy, p[2] + (R.z || 0), r, g, b, a);
  }
}

export function textCanvas(txt, w, h, weight = 800, family = 'Onest') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  let fs = h;
  const font = s => `${weight} ${s}px ${family}, Arial, sans-serif`;
  g.font = font(fs);
  if ('letterSpacing' in g) g.letterSpacing = family === 'Onest' ? '-0.03em' : '0em';
  fs = Math.min(h * 0.96, (fs * w * 0.97) / g.measureText(txt).width);
  g.font = font(fs);
  g.fillStyle = '#f2eadb'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, w / 2, h / 2 + fs * 0.04);
  return c;
}

/* схема сайта: шапка, заголовок, кнопка, картинка, три карточки */
export function siteCanvas() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 420;
  const g = c.getContext('2d'), I = '#f2eadb', C = '#d68a4a', D = '#8c8377', S = '#f0531c';
  g.strokeStyle = I; g.lineWidth = 4; g.strokeRect(4, 4, 632, 412);
  g.fillStyle = I; g.fillRect(4, 44, 632, 3);
  g.fillStyle = S; g.beginPath(); g.arc(26, 25, 6, 0, 7); g.fill();
  g.fillStyle = C; g.beginPath(); g.arc(46, 25, 6, 0, 7); g.fill();
  g.fillStyle = D; g.beginPath(); g.arc(66, 25, 6, 0, 7); g.fill();
  g.fillStyle = D; [420, 475, 530, 585].forEach(x => g.fillRect(x, 21, 36, 7));
  g.fillStyle = I; g.fillRect(34, 86, 250, 26); g.fillRect(34, 124, 196, 26);
  g.fillStyle = D; g.fillRect(34, 172, 230, 8); g.fillRect(34, 190, 210, 8); g.fillRect(34, 208, 150, 8);
  g.fillStyle = S; g.fillRect(34, 236, 118, 34);
  const gr = g.createLinearGradient(330, 80, 606, 276);
  gr.addColorStop(0, C); gr.addColorStop(1, S);
  g.fillStyle = gr; g.fillRect(330, 80, 276, 196);
  g.fillStyle = '#14110e'; g.beginPath(); g.moveTo(350, 256); g.lineTo(430, 160); g.lineTo(480, 216); g.lineTo(520, 180); g.lineTo(590, 256); g.fill();
  [34, 232, 430].forEach(x => { g.fillStyle = C; g.fillRect(x, 306, 176, 58); g.fillStyle = I; g.fillRect(x, 374, 120, 8); g.fillStyle = D; g.fillRect(x, 390, 84, 6); });
  return c;
}

/* хаос слева проходит сквозь линию и выходит справа таблицей */
export function chaosTable(t, ix, from, n, R) {
  const nc = Math.round(n * 0.44), nl = Math.round(n * 0.03), p = [0, 0, 0];
  const lineX = R.cx - R.w * 0.045, len = R.w * 0.46;
  let j = 0;
  /* хаос: несколько клубящихся языков пыли, которые тянутся к линии и сужаются у неё */
  for (; j < nc; j++) {
    const k = (rnd() * 6) | 0, u = Math.pow(rnd(), 0.75), c = PAL_DARK[(rnd() * PAL_DARK.length) | 0];
    const y0 = (k / 5 - 0.5) * R.h * 0.78, sway = Math.sin(u * 5 + k * 1.9) * R.h * 0.1 * u + Math.sin(u * 11 + k) * R.h * 0.035 * u;
    const th = R.h * (0.016 + 0.1 * u * (0.5 + 0.5 * Math.sin(u * 7 + k * 2.3)));
    const g = (rnd() + rnd() + rnd() - 1.5) / 1.5;
    put(t, ix[from + j], lineX - u * len, R.cy + y0 * (1 - 0.25 * u) + sway + g * th, g * th * 3 + (rnd() - 0.5) * 0.3 * u, c[0], c[1], c[2], rnd() < 0.72 ? 232 : 130);
  }
  /* линия, сквозь которую проходит пыль */
  for (; j < nc + nl; j++) put(t, ix[from + j], lineX + (rnd() - 0.5) * R.w * 0.008, R.cy + (rnd() - 0.5) * R.h * 1.02, (rnd() - 0.5) * 0.2, 255, 232, 196, 250);
  /* таблица: светящаяся сетка, шапка и часть ячеек залиты; дальний край ещё собирается */
  const C = 10, Rw = 13, tw = R.w * 0.5, th2 = R.h * 0.94;
  for (; j < n; j++) {
    let x, y, c, al = 235;
    if (rnd() < 0.36) {
      if (rnd() < 0.5) { x = ((rnd() * (C + 1)) | 0) / C; y = rnd(); } else { y = ((rnd() * (Rw + 1)) | 0) / Rw; x = rnd(); }
      c = [236, 176, 112];
    } else {
      const col = (rnd() * C) | 0, row = (rnd() * Rw) | 0, h = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453, hh = h - Math.floor(h);
      x = (col + 0.06 + rnd() * 0.88) / C; y = (row + 0.1 + rnd() * 0.8) / Rw;
      c = row === 0 ? [242, 226, 200] : hh > 0.8 ? [240, 110, 40] : hh > 0.66 ? [150, 138, 124] : [58, 38, 24];
    }
    p[0] = x * tw; p[1] = (0.5 - y) * th2; p[2] = 0;
    if (x > 0.86 && rnd() < (x - 0.86) * 5) { const q = rnd(); p[0] += q * tw * 0.25; p[1] += (rnd() - 0.5) * q * th2 * 0.3; p[2] += (rnd() - 0.5) * q * 2; al = 150; }
    rot(p, -0.5, 0.06, 0);
    put(t, ix[from + j], p[0] + lineX + R.w * 0.008, p[1] + R.cy, p[2], c[0], c[1], c[2], al);
  }
}

/* объёмный предмет: fn пишет в q точку и цвет, C центр, s масштаб */
export function obj(t, ix, from, n, fn, C, s, o = {}) {
  const q = [0, 0, 0, 0, 0, 0];
  for (let j = 0; j < n; j++) {
    fn(q); rot(q, o.ry, o.rx, o.rz);
    put(t, ix[from + j], q[0] * s + C[0], q[1] * s + C[1], q[2] * s + C[2], q[3], q[4], q[5], 245);
  }
}

export function bean(q) {
  const u = rnd() * 2 - 1, a = rnd() * 6.2832, s = Math.sqrt(1 - u * u);
  const x = s * Math.cos(a), y = u, z = s * Math.sin(a), ax = 0.62, ay = 1, az = 0.46;
  let nx = x / ax, ny = y / ay, nz = z / az;
  const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  let px = x * ax, py = y * ay, pz = z * az, g = 0;
  if (z > 0) { const d = (px - 0.09 * Math.sin(py * 2.8)) / 0.075; g = Math.exp(-d * d) * Math.min(1, (1 - Math.abs(y)) * 3); pz -= g * 0.2; }
  const L = Math.max(0, nx * -0.45 + ny * 0.55 + nz * 0.7), l = 0.22 + 0.9 * L * L * (1 - g * 0.85) + (rnd() - 0.5) * 0.12;
  q[0] = px; q[1] = py; q[2] = pz; q[3] = 58 + 150 * l; q[4] = 30 + 88 * l; q[5] = 14 + 42 * l;
}

/* россыпь под горкой зёрен: светится в щелях, когда зёрна раздвигают */
export function mound(q) {
  const r = Math.sqrt(rnd()) * 0.92, a = rnd() * 6.2832, top = -0.42 + 0.95 * Math.pow(Math.max(0, 1 - r * r), 0.75);
  const l = 0.5 + rnd() * 0.5;
  q[0] = r * Math.cos(a); q[1] = -0.42 + (top + 0.42) * Math.pow(rnd(), 0.45) * 0.7; q[2] = r * Math.sin(a);
  q[3] = 214 * l; q[4] = 118 * l; q[5] = 52 * l;
}

export function tyre(q) {
  const R = 0.72, r = 0.3;
  if (rnd() < 0.74) {
    const a = rnd() * 6.2832, b = rnd() * 6.2832;
    let cr = Math.cos(b), sr = Math.sin(b);
    cr = Math.sign(cr) * Math.pow(Math.abs(cr), 0.55); sr = Math.sign(sr) * Math.pow(Math.abs(sr), 0.55);
    let rad = R + r * cr * 0.8, tread = 0;
    const ax = r * sr * 1.05;
    if (cr > 0.75) {
      const blk = ((a * 30) / 6.2832 + (ax > 0 ? 0.5 : 0)) % 1, gy = Math.abs(ax) / (r * 1.05);
      tread = blk < 0.22 || (gy > 0.28 && gy < 0.36) ? 1 : 0;
      rad -= tread * 0.04;
    }
    const nx = cr * Math.cos(a), ny = cr * Math.sin(a), nz = sr;
    const L = Math.max(0, nx * -0.4 + ny * 0.6 + nz * 0.7), l = 0.1 + 0.5 * L - tread * 0.07 + (rnd() - 0.5) * 0.06, v = 26 + 170 * Math.max(0, l);
    q[0] = rad * Math.cos(a); q[1] = rad * Math.sin(a); q[2] = ax; q[3] = v; q[4] = v * 0.97; q[5] = v * 0.93;
  } else {
    const a = rnd() * 6.2832, lim = R - r * 0.8 - 0.02;
    let rr = 0.1 + rnd() * (lim - 0.1);
    if (!(Math.abs(Math.sin(a * 2.5)) > 0.62 || rr < 0.2 || rr > lim - 0.07)) rr = lim - 0.07 + rnd() * 0.07;
    const v = 150 + 90 * Math.abs(Math.sin(a * 2.5 + rr * 6)) * (0.6 + rnd() * 0.4);
    q[0] = rr * Math.cos(a); q[1] = rr * Math.sin(a); q[2] = 0.05 + (rnd() - 0.5) * 0.1; q[3] = v; q[4] = v * 0.96; q[5] = v * 0.9;
  }
}

function brick(u, v) {
  const row = Math.floor(v * 13), m = (v * 13) % 1 < 0.16 || (((u * 4.5 + (row % 2) * 0.5) % 1) + 1) % 1 < 0.07, n = rnd() * 30;
  return m ? [196, 186, 170] : [168 + n, 80 + n * 0.5, 50 + n * 0.3];
}

export function house(q) {
  const f = rnd() * 7.2;
  let x, y, z, sh, c;
  if (f < 2.55) {
    const front = f < 1.275;
    x = (rnd() - 0.5) * 1.5; y = -0.6 + rnd() * 0.85; z = front ? 0.55 : -0.55; sh = front ? 1 : 0.5; c = brick(x + 0.75, y + 0.6);
    if (front) {
      if (Math.abs(x + 0.36) < 0.13 && y < -0.14) c = [52, 36, 28];
      else if (Math.abs(x - 0.3) < 0.2 && Math.abs(y + 0.12) < 0.16) c = Math.abs(x - 0.3) < 0.012 || Math.abs(y + 0.12) < 0.012 ? [60, 44, 34] : [255, 206, 120];
    }
  } else if (f < 4.42) {
    const right = f < 3.485;
    z = (rnd() - 0.5) * 1.1; y = -0.6 + rnd() * 0.85; x = right ? 0.75 : -0.75; sh = right ? 0.72 : 0.6; c = brick(z + 0.55, y + 0.6);
    if (right && Math.abs(z) < 0.17 && Math.abs(y + 0.12) < 0.16) c = [255, 206, 120];
  } else if (f < 4.97) {
    const right = f < 4.695;
    let a = rnd(), b = rnd();
    if (a + b > 1) { a = 1 - a; b = 1 - b; }
    z = -0.55 + a * 1.1 + b * 0.55; y = 0.25 + b * 0.5; x = right ? 0.75 : -0.75; sh = right ? 0.72 : 0.6; c = brick(z + 0.55, y + 0.6);
  } else {
    const fr = f < 6.085, s = rnd(), n = rnd() * 18;
    x = (rnd() - 0.5) * 1.62; y = 0.78 - s * 0.56; z = fr ? s * 0.62 : -s * 0.62; sh = fr ? 0.9 : 0.45;
    c = (s * 9) % 1 < 0.14 ? [38, 32, 30] : [84 + n, 66 + n, 60 + n];
  }
  q[0] = x; q[1] = y - 0.08; q[2] = z; q[3] = c[0] * sh; q[4] = c[1] * sh; q[5] = c[2] * sh;
}

/* телефон: на лицевой стороне настоящий скриншот приложения */
export function phone(t, ix, from, n, img, C, s, o = {}) {
  const nf = Math.round(n * 0.7), sw = 0.58, sh = 1.24, W = 0.66, H = 1.34, D = 0.07;
  const cols = Math.floor(Math.sqrt(nf * (sw / sh))), rows = Math.floor(nf / cols), d = sample(img, cols, rows), p = [0, 0, 0];
  let j = 0;
  for (; j < cols * rows; j++) {
    const gx = j % cols, gy = (j / cols) | 0, c = j * 4;
    p[0] = ((gx + 0.5) / cols - 0.5) * sw; p[1] = (0.5 - (gy + 0.5) / rows) * sh; p[2] = D / 2 + 0.002;
    rot(p, o.ry, o.rx, o.rz);
    put(t, ix[from + j], p[0] * s + C[0], p[1] * s + C[1], p[2] * s + C[2], d[c], d[c + 1], d[c + 2], 250);
  }
  for (; j < n; j++) {
    const k = rnd();
    let l;
    if (k < 0.45) { p[0] = (rnd() - 0.5) * W; p[1] = (rnd() - 0.5) * H; p[2] = -D / 2; l = 38 + rnd() * 14; }
    else if (k < 0.7) {
      p[0] = (rnd() - 0.5) * W; p[1] = (rnd() - 0.5) * H;
      if (Math.abs(p[0]) < sw / 2 && Math.abs(p[1]) < sh / 2) {
        if (rnd() < 0.5) p[0] = (p[0] < 0 ? -1 : 1) * (sw / 2 + (rnd() * (W - sw)) / 2);
        else p[1] = (p[1] < 0 ? -1 : 1) * (sh / 2 + (rnd() * (H - sh)) / 2);
      }
      p[2] = D / 2; l = 24 + rnd() * 10;
    } else {
      const per = rnd() * (2 * W + 2 * H);
      if (per < W) { p[0] = per - W / 2; p[1] = H / 2; }
      else if (per < 2 * W) { p[0] = per - W - W / 2; p[1] = -H / 2; }
      else if (per < 2 * W + H) { p[0] = W / 2; p[1] = per - 2 * W - H / 2; }
      else { p[0] = -W / 2; p[1] = per - 2 * W - H - H / 2; }
      p[2] = (rnd() - 0.5) * D; l = 90 + rnd() * 60;
    }
    rot(p, o.ry, o.rx, o.rz);
    put(t, ix[from + j], p[0] * s + C[0], p[1] * s + C[1], p[2] * s + C[2], l, l * 0.96, l * 0.92, 245);
  }
}

/* бумажный самолётик: два крыла и киль */
const PL = [
  [[1.1, 0, 0], [-1, 0, 0.16], [-1, 0.14, 0.9], 0.98],
  [[1.1, 0, 0], [-1, 0, -0.16], [-1, 0.14, -0.9], 0.76],
  [[1.1, 0, 0], [-1, 0, 0.16], [-1, -0.42, 0], 0.55],
  [[1.1, 0, 0], [-1, 0, -0.16], [-1, -0.42, 0], 0.42]
];
export function plane(q) {
  const k = rnd(), T = PL[k < 0.36 ? 0 : k < 0.72 ? 1 : k < 0.86 ? 2 : 3];
  let a = rnd(), b = rnd();
  if (a + b > 1) { a = 1 - a; b = 1 - b; }
  /* часть пыли жмётся к рёбрам: они горят оранжевым, как на макете */
  if (rnd() < 0.3) { const e = rnd() * 0.035; if (rnd() < 0.5) a = e; else b = e; }
  const c = 1 - a - b;
  for (let i = 0; i < 3; i++) q[i] = T[0][i] * c + T[1][i] * a + T[2][i] * b;
  const edge = Math.min(a, b, c) < 0.035, g = 0.5 + rnd() * 0.7, sh = T[3];
  if (edge) { q[3] = 255; q[4] = 150 + rnd() * 70; q[5] = 50 + rnd() * 50; }
  else if (sh > 0.7) { q[3] = 246 * g; q[4] = 226 * g; q[5] = 196 * g; }
  else { q[3] = 236 * g * (0.55 + sh * 0.5); q[4] = 150 * g * (0.55 + sh * 0.5); q[5] = 70 * g * (0.55 + sh * 0.5); }
}

/* шлейф за самолётиком: плотная светящаяся лента, которая волной уходит назад и редеет */
export function trail(t, ix, from, n, P, dir, len) {
  for (let j = 0; j < n; j++) {
    const s = Math.pow(rnd(), 0.8), c = PAL_DARK[(rnd() * PAL_DARK.length) | 0];
    const wdt = len * (0.012 + 0.11 * s), g = (rnd() + rnd() + rnd() - 1.5) / 1.5, wave = Math.sin(s * 5.2) * len * 0.07 * s;
    put(t, ix[from + j], P[0] - dir[0] * len * s + g * wdt * 0.5, P[1] - dir[1] * len * s - s * s * len * 0.2 + wave + g * wdt, P[2] + g * wdt * 2 + (rnd() - 0.5) * wdt,
      c[0], c[1], c[2], Math.abs(g) < 0.5 && s < 0.75 ? 236 : 120 + (1 - s) * 50);
  }
}

/* светящаяся кромка вокруг устройства D={C,w,h,rot}: пыль жмётся к краю и редеет наружу */
export function frame(t, ix, from, n, D, bw) {
  const p = [0, 0, 0], hw = D.w / 2, hh = D.h / 2, per = 2 * (D.w + D.h);
  for (let j = 0; j < n; j++) {
    const s = rnd() * per;
    let x, y, nx, ny;
    if (s < D.w) { x = s - hw; y = hh; nx = 0; ny = 1; }
    else if (s < 2 * D.w) { x = s - D.w - hw; y = -hh; nx = 0; ny = -1; }
    else if (s < 2 * D.w + D.h) { x = hw; y = s - 2 * D.w - hh; nx = 1; ny = 0; }
    else { x = -hw; y = s - 2 * D.w - D.h - hh; nx = -1; ny = 0; }
    const d = bw * (-Math.log(1 - rnd() * 0.97) * 0.5 + 0.3);
    p[0] = x + nx * d + (rnd() - 0.5) * bw * 0.4; p[1] = y + ny * d + (rnd() - 0.5) * bw * 0.4; p[2] = (rnd() - 0.5) * bw * 1.4 + bw * 0.4;
    rot(p, D.rot.ry, D.rot.rx, D.rot.rz);
    const c = rnd() < 0.25 ? [255, 236, 200] : rnd() < 0.6 ? [236, 150, 80] : [240, 96, 34];
    put(t, ix[from + j], p[0] + D.C[0], p[1] + D.C[1], p[2] + D.C[2], c[0], c[1], c[2], d > bw * 1.6 ? 150 : 240);
  }
}

/* осыпь: пыль сыплется с нижнего края и её относит влево */
export function fall(t, ix, from, n, D) {
  const p = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    const q = -Math.log(1 - rnd() * 0.98) * 0.22, c = PAL_DARK[(rnd() * PAL_DARK.length) | 0];
    p[0] = (rnd() - 0.5) * D.w * 1.05 - q * D.h * 0.9 * (0.3 + rnd()); p[1] = -D.h / 2 - q * D.h * (0.5 + rnd() * 0.5); p[2] = (rnd() - 0.5) * q * 3;
    rot(p, D.rot.ry, D.rot.rx, D.rot.rz);
    put(t, ix[from + j], p[0] + D.C[0], p[1] + D.C[1], p[2] + D.C[2], c[0], c[1], c[2], q < 0.22 ? 232 : 140);
  }
}

/* подставка монитора: искры по краям ножки и по ободу основания (сами ножка и основание твёрдые, см. devices.js).
   G = { neck, bw, bd, tilt }: высота ножки в долях высоты экрана, ширина и глубина основания в долях ширины, наклон основания */
export function stand(t, ix, from, n, D, G) {
  const p = [0, 0, 0], ct = Math.cos(G.tilt), st = Math.sin(G.tilt);
  for (let j = 0; j < n; j++) {
    if (rnd() < 0.3) { p[0] = (rnd() < 0.5 ? -1 : 1) * D.w * 0.05 + (rnd() - 0.5) * D.w * 0.008; p[1] = -D.h / 2 - rnd() * D.h * G.neck; p[2] = -0.02; }
    else {
      /* обод основания: стадион, точки жмутся к краю */
      const a = rnd() * 6.2832, r = 1 - rnd() * rnd() * 0.5, hw = D.w * G.bw / 2, hd = D.w * G.bd / 2;
      const px = Math.cos(a) * r * (hw - hd) + Math.sign(Math.cos(a)) * Math.min(1, Math.abs(Math.cos(a)) * 2.2) * hd * r, py = Math.sin(a) * r * hd;
      p[0] = px; p[1] = -D.h / 2 - D.h * G.neck + py * ct; p[2] = 0.02 + py * st;
    }
    rot(p, D.rot.ry, D.rot.rx, D.rot.rz);
    const hot = rnd() < 0.3, l = 0.55 + rnd() * 0.45;
    put(t, ix[from + j], p[0] + D.C[0], p[1] + D.C[1], p[2] + D.C[2], hot ? 244 : 150 * l, hot ? 160 : 96 * l, hot ? 84 : 58 * l, 238);
  }
}

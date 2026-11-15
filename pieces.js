/* Твёрдые детали: предметы, собранные не из пыли, а из кирпичей, блоков, плиток и зёрен.
   Каждая деталь сидит на своей пружине: курсор её выталкивает, она возвращается с лёгким качанием.
   Детали стоят оболочкой поверх того же предмета из частиц, поэтому из щелей светит пыль. */
import * as THREE from 'three';
import { rot } from './shapes.js?v=2';

const VERT = `
attribute vec3 aDir; attribute vec4 aRnd; attribute vec3 aCol; attribute vec4 aUv; attribute vec4 aMat; attribute vec4 aDyn; attribute vec4 aTint;
uniform float uShow,uSpin,uScale; uniform vec3 uC; uniform mat3 uBake;
varying vec3 vW,vCol,vLocal,vSize,vAx,vAy,vAz,vN; varying vec4 vMat,vTint; varying vec2 vUv; varying float vE,vFront;
mat3 ry(float a){float s=sin(a),c=cos(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 axisRot(vec3 ax,float a){float s=sin(a),c=cos(a),t=1.-c;
  return mat3(t*ax.x*ax.x+c,t*ax.x*ax.y+s*ax.z,t*ax.x*ax.z-s*ax.y, t*ax.x*ax.y-s*ax.z,t*ax.y*ax.y+c,t*ax.y*ax.z+s*ax.x, t*ax.x*ax.z+s*ax.y,t*ax.y*ax.z-s*ax.x,t*ax.z*ax.z+c);}
void main(){
  mat3 M=ry(uSpin)*uBake, I=mat3(instanceMatrix);
  vec3 sz=vec3(length(I[0]),length(I[1]),length(I[2]));
  vec3 wc=M*instanceMatrix[3].xyz*uScale+uC;
  /* сборка: детали прилетают по ветру по одной и вырастают на месте */
  float k=smoothstep(aRnd.x*.55,aRnd.x*.55+.45,uShow), away=1.-k;
  wc+=aDyn.xyz*k;
  wc+=away*(normalize(M*aDir)*(1.2+aRnd.z*2.2)+vec3(1.,.3,0.)*(.6+aRnd.w)*1.4)*uScale;
  mat3 R=axisRot(normalize(aRnd.xyz-.5+vec3(.001)),aDyn.w*(aRnd.w-.5)*1.5+away*(3.+aRnd.y*4.));
  mat3 A=R*M*mat3(I[0]/sz.x,I[1]/sz.y,I[2]/sz.z);
  vec3 wp=wc+A*(position*sz)*uScale*k;
  vW=wp; vLocal=position; vSize=sz; vAx=A[0]; vAy=A[1]; vAz=A[2]; vN=A*normal;
  vCol=aCol; vMat=aMat; vTint=aTint; vE=clamp(aDyn.w*1.6+away,0.,1.)*step(-.5,aUv.w);
  vUv=aUv.xy+uv*aUv.zw; vFront=step(.5,normal.z)*step(.0001,aUv.z);
  gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);
}`;

const FRAG = `
uniform sampler2D uTex,uMc; uniform vec3 uC; uniform float uTexOn,uMcOn;
varying vec3 vW,vCol,vLocal,vSize,vAx,vAy,vAz,vN; varying vec4 vMat,vTint; varying vec2 vUv; varying float vE,vFront;
void main(){
  vec3 n; vec3 base=vCol; float groove=0.;
#ifdef BEAN
  n=normalize(vN);
  /* бороздка зерна нарисована прямо в материале */
  float gx=(vLocal.x-.1*sin(vLocal.y*2.6))/.085;
  groove=exp(-gx*gx)*step(0.,vLocal.z)*smoothstep(1.,.7,abs(vLocal.y)); base*=1.-groove*.82;
#else
  /* скруглённые грани: у рёбер нормаль плавно заворачивается на соседнюю сторону */
  vec3 p=vLocal*vSize, dd=vSize*.5-abs(p);
  vec3 w=clamp(1.-dd/vMat.w,0.,1.); w*=w;
  vec3 nl=sign(p)*w; n=normalize(vAx*nl.x+vAy*nl.y+vAz*nl.z);
#endif
  float gloss=vMat.x, metal=vMat.y;
  bool pic=uTexOn>.5&&vFront>.5;
  if(pic) base=texture2D(uTex,vUv).rgb;
  vec3 V=normalize(cameraPosition-vW), L1=normalize(vec3(-.5,.75,.55)), L2=normalize(vec3(.8,-.15,.45));
  float d1=max(dot(n,L1),0.), d2=max(dot(n,L2),0.);
  float spec=pow(max(dot(n,normalize(L1+V)),0.),mix(10.,130.,gloss))*(.12+gloss*1.4)*(1.-groove);
  float fres=pow(1.-max(dot(n,V),0.),3.);
  /* отражение окружения: тёмная комната, мягкий верхний свет и медная полоса сбоку */
  vec3 Rr=reflect(-V,n);
  vec3 env=mix(vec3(.015,.01,.008),vec3(.5,.27,.12),smoothstep(-.3,.9,Rr.y))
    +vec3(1.,.9,.78)*pow(max(dot(Rr,L1),0.),18.)*1.1
    +vec3(1.,.45,.16)*smoothstep(.8,1.,dot(Rr,normalize(vec3(.9,.05,.35))))*.7;
  vec3 c;
  if(uMcOn>.5){
    /* шарик материала: цвет и блик берём с картинки студийного шара по направлению нормали к зрителю */
    vec3 nv=normalize((viewMatrix*vec4(n,0.)).xyz);
    float idx=floor(vTint.a+.5);
    vec3 mc=texture2D(uMc,(vec2(mod(idx,4.),1.-floor(idx/4.))+nv.xy*.47+.5)/vec2(4.,2.)).rgb;
    c=pic?base*.95+mc*.38:mc*vTint.rgb*(1.-groove*.8);
  }else{
    c=pic?base*.96:base*(.09+d1*vec3(1.,.96,.9)+d2*.34*vec3(1.,.62,.38))*(1.-metal*.75);
    c+=env*(fres*(.18+gloss*.62)+metal*.55)*mix(vec3(1.),base*1.7,metal);
    c+=vec3(1.,.95,.88)*spec;
  }
  c+=vCol*vMat.z;
  /* грани, повёрнутые внутрь, греются светом изнутри, когда деталь выдвинута */
  c+=vec3(1.,.48,.14)*max(dot(n,normalize(uC-vW)),0.)*vE*1.1;
  gl_FragColor=vec4(c,1.);
}`;

const PI2 = Math.PI * 2, rnd = Math.random;
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/* ---------- дом ---------- */
function houseItems() {
  const it = [], t = 0.07, Y0 = -0.68, rows = 9, rh = 0.85 / rows, B = [0.3, 0, 0, 0.011];
  const brick = () => { const n = rnd() * 34, d = rnd() < 0.12 ? 0.72 : 1; return [(150 + n) * d, (72 + n * 0.5) * d, (46 + n * 0.3) * d]; };
  for (const sg of [1, -1]) {
    for (let r = 0; r < rows; r++) {
      const n = 8, len = 1.5 / n, off = (r % 2) * len / 2, y = Y0 + (r + 0.5) * rh, yy = y + 0.08;
      for (let i = 0; i <= n; i++) {
        const x0 = Math.max(-0.75, -0.75 + i * len - off), x1 = Math.min(0.75, -0.75 + (i + 1) * len - off);
        if (x1 - x0 < 0.03) continue;
        const x = (x0 + x1) / 2;
        if (sg > 0 && ((Math.abs(x + 0.36) < 0.17 && yy < -0.14) || (Math.abs(x - 0.3) < 0.22 && Math.abs(yy + 0.12) < 0.17))) continue;
        it.push({ p: [x, y, sg * 0.55], s: [(x1 - x0) * 0.93, rh * 0.86, t], d: [0, 0, sg], c: brick(), m: B, mc: 3 });
      }
      const m = 6, ln = 1.1 / m, of2 = ((r + 1) % 2) * ln / 2;
      for (let i = 0; i <= m; i++) {
        const z0 = Math.max(-0.55, -0.55 + i * ln - of2), z1 = Math.min(0.55, -0.55 + (i + 1) * ln - of2);
        if (z1 - z0 < 0.03) continue;
        const z = (z0 + z1) / 2;
        if (sg > 0 && Math.abs(z) < 0.19 && Math.abs(yy + 0.12) < 0.17) continue;
        it.push({ p: [sg * 0.75, y, z], s: [t, rh * 0.86, (z1 - z0) * 0.93], d: [sg, 0, 0], c: brick(), m: B, mc: 3 });
      }
    }
    for (let r = 0; r < 5; r++) {
      const y = 0.17 + (r + 0.5) * 0.1, hw = 0.55 * (1 - (r + 0.5) / 5), n = Math.max(1, Math.round((hw * 2) / 0.2)), len = (hw * 2) / n;
      for (let i = 0; i < n; i++) it.push({ p: [sg * 0.75, y, -hw + (i + 0.5) * len], s: [t, 0.086, len * 0.93], d: [sg, 0, 0], c: brick(), m: B, mc: 3 });
    }
    /* черепица внахлёст */
    const L = Math.hypot(0.56, 0.62), a = (Math.atan2(0.56, 0.62) + 0.07) * sg;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) {
      const s = (r + 0.45) / 7, n = rnd() * 18;
      it.push({ p: [-0.83 + (c + 0.5) * 0.166 + ((r % 2) - 0.5) * 0.08, 0.735 - s * 0.6, sg * s * 0.665], s: [0.156, 0.03, (L / 7) * 1.25], r: [a, 0, 0], d: [0, 0.62 / L, (sg * 0.56) / L], c: [66 + n, 54 + n, 52 + n], m: [0.55, 0, 0, 0.012], mc: 4 });
    }
  }
  /* конёк, фундамент, дверь, окна, труба */
  for (let c = 0; c < 9; c++) it.push({ p: [-0.74 + c * 0.185, 0.745, 0], s: [0.178, 0.045, 0.11], d: [0, 1, 0], c: [50, 42, 40], m: [0.6, 0, 0, 0.018], mc: 4 });
  for (const [x, z, sx, sz] of [[0, 0.57, 1.62, 0.1], [0, -0.57, 1.62, 0.1], [0.77, 0, 0.1, 1.04], [-0.77, 0, 0.1, 1.04]]) it.push({ p: [x, -0.72, z], s: [sx, 0.07, sz], d: [0, -1, 0], c: [118, 112, 104], m: [0.2, 0, 0, 0.014], mc: 4 });
  for (let i = 0; i < 3; i++) it.push({ p: [-0.445 + i * 0.085, -0.455, 0.56], s: [0.08, 0.44, 0.03], d: [0, 0, 1], c: [104 - i * 9, 66 - i * 6, 40 - i * 4], m: [0.45, 0, 0, 0.01], mc: 5 });
  it.push({ p: [-0.3, -0.46, 0.585], s: [0.022, 0.022, 0.03], d: [0, 0, 1], c: [226, 180, 96], m: [0.95, 1, 0.15, 0.008] });
  const win = (px, pz, ax) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const u = (i - 0.5) * 0.19, v = -0.2 + (j - 0.5) * 0.15;
      it.push({ p: ax ? [px, v, pz + u] : [px + u, v, pz], s: ax ? [0.02, 0.135, 0.17] : [0.17, 0.135, 0.02], d: ax ? [1, 0, 0] : [0, 0, 1], c: [255, 196, 104], m: [0.95, 0, 0.95, 0.006], uv: [0, 0, 0, -1] });
    }
    it.push({ p: ax ? [px + 0.012, -0.2, pz] : [px, -0.2, pz + 0.012], s: ax ? [0.03, 0.33, 0.022] : [0.022, 0.33, 0.03], d: ax ? [1, 0, 0] : [0, 0, 1], c: [70, 46, 30], m: [0.4, 0, 0, 0.008], mc: 5 });
    it.push({ p: ax ? [px + 0.012, -0.2, pz] : [px, -0.2, pz + 0.012], s: ax ? [0.03, 0.022, 0.4] : [0.4, 0.022, 0.03], d: ax ? [1, 0, 0] : [0, 0, 1], c: [70, 46, 30], m: [0.4, 0, 0, 0.008], mc: 5 });
  };
  win(0.3, 0.555, false); win(0.755, 0, true);
  for (let r = 0; r < 4; r++) for (const [x, z] of [[0.36, -0.26], [0.47, -0.26], [0.36, -0.15], [0.47, -0.15]]) it.push({ p: [x + ((r % 2) - 0.5) * 0.012, 0.52 + r * 0.086, z], s: [0.1, 0.078, 0.1], d: norm([x - 0.415, 0.5, z + 0.205]), c: brick(), m: B, mc: 3 });
  it.push({ p: [0.415, 0.88, -0.205], s: [0.27, 0.035, 0.27], d: [0, 1, 0], c: [58, 50, 48], m: [0.5, 0, 0, 0.012], mc: 4 });
  return it;
}

/* ---------- шина ---------- */
function tyreItems() {
  const it = [], R = 0.72, r = 0.3;
  const rubber = k => { const n = rnd() * 10; return [(30 + n) * k, (30 + n) * k, (31 + n) * k]; }, metal = k => { const n = rnd() * 16; return [(206 + n) * k, (204 + n) * k, (198 + n) * k]; };
  /* блок на поверхности шины: угол a по кругу, угол b по профилю */
  const block = (a, bd, th, tl, pw, c, m, lift = 0) => {
    const b = (bd * Math.PI) / 180, cb = Math.cos(b), sb = Math.sin(b);
    const sc = Math.sign(cb) * Math.pow(Math.abs(cb), 0.6), ss = Math.sign(sb) * Math.pow(Math.abs(sb), 0.6);
    const rad = R + r * sc * 0.82 + lift, ax = r * ss * 1.05, X = [cb * Math.cos(a), cb * Math.sin(a), sb], Y = [-Math.sin(a), Math.cos(a), 0];
    it.push({ p: [rad * Math.cos(a), rad * Math.sin(a), ax], s: [th, ((PI2 * rad) / tl[0]) * tl[1], pw], basis: [X, Y, cross(X, Y)], d: X, c, m, mc: 1 });
  };
  /* протектор: четыре ряда шашек со сдвигом, между ними канавки */
  [-30, -10, 10, 30].forEach((bd, row) => { for (let i = 0; i < 40; i++) block(((i + (row % 2) * 0.5) / 40) * PI2, bd, 0.085, [40, 0.74], 0.092, rubber(1.2), [0.22, 0, 0, 0.014], 0.012); });
  [-52, 52].forEach(bd => { for (let i = 0; i < 40; i++) block(((i + 0.25) / 40) * PI2, bd, 0.07, [40, 0.86], 0.125, rubber(1.05), [0.3, 0, 0, 0.016]); });
  [-76, 76, -100, 100, -121, 121].forEach(bd => { for (let i = 0; i < 30; i++) block((i / 30) * PI2, bd, 0.045, [30, 0.965], Math.abs(bd) > 110 ? 0.11 : 0.142, rubber(0.92), [0.42, 0, 0, 0.012]); });
  /* диск: обод, бортик, спицы, колпак, болты */
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * PI2, X = [Math.cos(a), Math.sin(a), 0], Y = [-Math.sin(a), Math.cos(a), 0];
    it.push({ p: [0.465 * X[0], 0.465 * X[1], 0], s: [0.035, 0.108, 0.5], basis: [X, Y, [0, 0, 1]], d: [-X[0], -X[1], 0], c: metal(0.8), m: [0.9, 1, 0, 0.012], uv: [0, 0, 0, -1] });
    it.push({ p: [0.49 * X[0], 0.49 * X[1], 0.262], s: [0.06, 0.112, 0.04], basis: [X, Y, [0, 0, 1]], d: [0, 0, 1], c: metal(1), m: [0.95, 1, 0, 0.014], uv: [0, 0, 0, -1] });
  }
  for (let i = 0; i < 5; i++) for (const off of [-0.2, 0.2]) {
    const a = (i / 5) * PI2 + 0.3, a2 = a + off, X = [Math.cos(a2), Math.sin(a2), 0], Y = [-Math.sin(a2), Math.cos(a2), 0];
    const mx = 0.29 * Math.cos(a) + 0.045 * Math.cos(a2 + (off > 0 ? 1.57 : -1.57)), my = 0.29 * Math.sin(a) + 0.045 * Math.sin(a2 + (off > 0 ? 1.57 : -1.57));
    it.push({ p: [mx, my, 0.17], s: [0.34, 0.052, 0.06], basis: [X, Y, [0, 0, 1]], d: [0, 0, 1], c: metal(1), m: [0.95, 1, 0, 0.016], uv: [0, 0, 0, -1] });
  }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * PI2, X = [Math.cos(a), Math.sin(a), 0]; it.push({ p: [0.1 * X[0], 0.1 * X[1], 0.19], s: [0.07, 0.066, 0.07], basis: [X, [-X[1], X[0], 0], [0, 0, 1]], d: [0, 0, 1], c: metal(0.92), m: [0.95, 1, 0, 0.016], uv: [0, 0, 0, -1] }); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * PI2 + 0.93; it.push({ p: [0.185 * Math.cos(a), 0.185 * Math.sin(a), 0.2], s: [0.04, 0.04, 0.04], d: [0, 0, 1], c: [40, 38, 36], m: [0.8, 1, 0, 0.012], uv: [0, 0, 0, -1] }); }
  it.push({ p: [0, 0, 0.215], s: [0.085, 0.085, 0.05], d: [0, 0, 1], c: [214, 138, 74], m: [0.95, 1, 0.12, 0.02], uv: [0, 0, 0, -1] });
  return it;
}

/* ---------- телефон ---------- */
function phoneItems() {
  const it = [], sw = 0.58, sh = 1.24, C = 5, R = 11;
  it.push({ p: [0, 0, -0.012], s: [0.67, 1.35, 0.06], d: [0, 0, -1], c: [58, 56, 58], m: [0.85, 0.9, 0, 0.03], uv: [0, 0, 0, -1] });
  for (const y of [0.3, 0.16]) it.push({ p: [0.338, y, -0.012], s: [0.012, 0.1, 0.022], d: [1, 0, 0], c: [96, 94, 96], m: [0.9, 1, 0, 0.005], uv: [0, 0, 0, -1] });
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++)
    it.push({ p: [((i + 0.5) / C - 0.5) * sw, (0.5 - (j + 0.5) / R) * sh, 0.035], s: [(sw / C) * 0.972, (sh / R) * 0.972, 0.02], d: [0, 0, 1], c: [26, 24, 24], m: [0.95, 0, 0, 0.006], uv: [i / C, 1 - (j + 1) / R, 1 / C, 1 / R], mc: 6 });
  return it;
}

/* ---------- горка кофейных зёрен ---------- */
const FLOOR = -0.42, moundTop = r => FLOOR + 0.95 * Math.pow(Math.max(0, 1 - r * r), 0.75);
function beanItems() {
  const n = 440, P = [];
  for (let i = 0; i < n; i++) { const r = Math.sqrt(rnd()) * 0.98, a = rnd() * PI2; P.push([r * Math.cos(a), FLOOR + (moundTop(r) - FLOOR) * Math.pow(rnd(), 0.28), r * Math.sin(a)]); }
  /* раздвигаем зёрна, которые легли друг в друга, и возвращаем убежавшие под форму горки */
  for (let k = 0; k < 14; k++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = P[i], b = P[j], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz) || 1e-3;
      if (d < 0.16) { const f = (0.16 - d) / d / 2; a[0] -= dx * f; a[1] -= dy * f; a[2] -= dz * f; b[0] += dx * f; b[1] += dy * f; b[2] += dz * f; }
    }
    for (const p of P) { let r = Math.hypot(p[0], p[2]); if (r > 1) { p[0] /= r; p[2] /= r; r = 1; } p[1] = Math.max(FLOOR, Math.min(moundTop(r) + 0.04, p[1])); }
  }
  return P.map(p => {
    const sc = 0.112 + rnd() * 0.03, v = rnd(), k = 0.75 + v * 0.5;
    return { p, s: [sc, sc, sc], r: [rnd() * PI2, rnd() * PI2, rnd() * PI2], d: norm([p[0], p[1] - FLOOR + 0.5, p[2]]), c: [92 * k, 50 * k, 26 * k], m: [0.42 + v * 0.25, 0, 0, 0], uv: [0, 0, 0, 0], mc: 2 };
  });
}
function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 18, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let z = p.getZ(i) * 0.46; if (z > 0) z *= 0.62; p.setXYZ(i, p.getX(i) * 0.62, p.getY(i), z); }
  g.computeVertexNormals();
  return g;
}

const KINDS = { house: houseItems, tyre: tyreItems, phone: phoneItems, bean: beanItems };
/* средний цвет каждого шарика: по нему считается, насколько деталь светлее или темнее своего материала */
const REF = [[0.8, 0.8, 0.78], [0.13, 0.13, 0.13], [0.36, 0.2, 0.1], [0.65, 0.31, 0.2], [0.27, 0.23, 0.22], [0.4, 0.26, 0.16], [0.1, 0.1, 0.1]];
const MC_FILES = ['chrome', 'rubber', 'bean', 'brick', 'slate', 'wood'];
/* седьмой шарик, «стекло», необязательный: пока файла img/matcap/glass.jpg нет, он рисуется здесь же */
function glassBall(g, x, y, S) {
  const c = S / 2;
  g.save(); g.beginPath(); g.arc(x + c, y + c, c, 0, 7); g.clip();
  g.fillStyle = '#060505'; g.fillRect(x, y, S, S);
  let gr = g.createRadialGradient(x + S * 0.3, y + S * 0.26, 0, x + S * 0.3, y + S * 0.26, S * 0.2);
  gr.addColorStop(0, 'rgba(255,250,240,.95)'); gr.addColorStop(0.55, 'rgba(255,250,240,.22)'); gr.addColorStop(1, 'rgba(255,250,240,0)');
  g.fillStyle = gr; g.fillRect(x, y, S, S);
  gr = g.createLinearGradient(x + S * 0.84, 0, x + S * 0.99, 0);
  gr.addColorStop(0, 'rgba(255,130,50,0)'); gr.addColorStop(0.6, 'rgba(255,130,50,.85)'); gr.addColorStop(1, 'rgba(255,130,50,0)');
  g.fillStyle = gr; g.fillRect(x + S * 0.8, y + S * 0.18, S * 0.2, S * 0.64);
  g.restore();
}

export class Pieces {
  constructor(sw) { this.sw = sw; this.objs = new Map(); this.pt = 0; this.MC = { value: null }; this.MCon = { value: 0 }; this.kickK = 0; }

  /* щелчок: детали рядом с курсором получают толчок и разлетаются, пружины потом возвращают их на место */
  kick() { this.kickK = 1; }

  /* шарики материалов складываются в одну текстуру 4×2; пока она не загрузилась, свет считается формулой */
  loadMatcaps(dir) {
    Promise.all([...MC_FILES, 'glass'].map(n => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = `${dir}/${n}.jpg`; }))).then(imgs => {
      if (imgs.slice(0, MC_FILES.length).some(i => !i)) return;
      const c = document.createElement('canvas'), S = 512; c.width = S * 4; c.height = S * 2;
      const g = c.getContext('2d');
      imgs.forEach((im, i) => { const x = (i % 4) * S, y = Math.floor(i / 4) * S; if (im) g.drawImage(im, x, y, S, S); else glassBall(g, x, y, S); });
      const t = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
      this.MC.value = t; this.MCon.value = 1;
    });
  }

  static has(kind) { return kind in KINDS; }

  add(key, kind, image) {
    const items = KINDS[kind](), n = items.length, heap = kind === 'bean', g = heap ? beanGeometry() : new THREE.BoxGeometry(1, 1, 1);
    const dir = new Float32Array(n * 3), col = new Float32Array(n * 3), rn = new Float32Array(n * 4), uv = new Float32Array(n * 4), mat = new Float32Array(n * 4), lc = new Float32Array(n * 3), tint = new Float32Array(n * 4);
    const U = { uShow: { value: 0 }, uSpin: { value: 0 }, uScale: { value: 1 }, uC: { value: new THREE.Vector3() }, uBake: { value: new THREE.Matrix3() }, uTex: { value: null }, uTexOn: { value: 0 }, uMc: this.MC, uMcOn: this.MCon };
    if (image) { const t = new THREE.Texture(image); t.needsUpdate = true; U.uTex.value = t; U.uTexOn.value = 1; }
    const mesh = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ uniforms: U, defines: heap ? { BEAN: 1 } : {}, vertexShader: VERT, fragmentShader: FRAG }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), bm = new THREE.Matrix4();
    items.forEach((it, i) => {
      if (it.basis) q.setFromRotationMatrix(bm.makeBasis(new THREE.Vector3(...it.basis[0]), new THREE.Vector3(...it.basis[1]), new THREE.Vector3(...it.basis[2])));
      else { e.set(...(it.r || [0, 0, 0])); q.setFromEuler(e); }
      mesh.setMatrixAt(i, m.compose(P.fromArray(it.p), q, Sc.fromArray(it.s)));
      lc.set(it.p, i * 3); dir.set(it.d, i * 3); col.set(it.c.map(v => v / 255), i * 3);
      uv.set(it.uv || [0, 0, 0, 0], i * 4); mat.set(it.m || [0.3, 0, 0, 0.012], i * 4);
      rn.set([rnd(), rnd(), rnd(), rnd()], i * 4);
      const mc = it.mc || 0, ref = REF[mc];
      tint.set([Math.min(2, it.c[0] / 255 / ref[0]), Math.min(2, it.c[1] / 255 / ref[1]), Math.min(2, it.c[2] / 255 / ref[2]), mc], i * 4);
    });
    const dyn = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    dyn.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aDir', new THREE.InstancedBufferAttribute(dir, 3));
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(col, 3));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rn, 4));
    g.setAttribute('aUv', new THREE.InstancedBufferAttribute(uv, 4));
    g.setAttribute('aMat', new THREE.InstancedBufferAttribute(mat, 4));
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 4));
    g.setAttribute('aDyn', dyn);
    mesh.frustumCulled = false; mesh.visible = false;
    this.sw.scene.add(mesh);
    this.objs.set(key, { mesh, U, n, heap, lc, dir, rn, dyn, x: new Float32Array(n * 3), v: new Float32Array(n * 3), bake: [1, 0, 0, 0, 1, 0, 0, 0, 1], C: [0, 0, 0], s: 1, lift: 0.3, wob: 0 });
  }

  /* место, размер и поворот берём те же, что у предмета из частиц */
  place(key, C, s, o, wob) {
    const ob = this.objs.get(key); if (!ob) return;
    const cx = rot([1, 0, 0], o.ry, o.rx, o.rz), cy = rot([0, 1, 0], o.ry, o.rx, o.rz), cz = rot([0, 0, 1], o.ry, o.rx, o.rz);
    ob.bake = [cx[0], cy[0], cz[0], cx[1], cy[1], cz[1], cx[2], cy[2], cz[2]];
    ob.U.uBake.value.set(...ob.bake);
    ob.C = C; ob.s = s * 1.015; ob.lift = s * (ob.heap ? 0.3 : 0.2); ob.wob = wob;
    ob.U.uC.value.fromArray(C); ob.U.uScale.value = ob.s;
  }

  frame(t, show) {
    const dt = Math.min(0.033, Math.max(0.001, t - this.pt)); this.pt = t;
    for (const [key, ob] of this.objs) {
      const v = show(key), spin = ob.wob * Math.sin(t * 0.6);
      ob.mesh.visible = v > 0.002;
      ob.U.uShow.value = v; ob.U.uSpin.value = spin;
      if (ob.mesh.visible) this.simulate(ob, t, dt, spin);
    }
    this.kickK = 0;
  }

  /* пружины: курсор выталкивает деталь, она возвращается и качается; в покое по предмету пробегает волна */
  simulate(ob, t, dt, spin) {
    const U = this.sw.U, mx = U.uMouse.value.x, my = U.uMouse.value.y, on = U.uMouseOn.value, R2 = Math.pow(U.uRad.value * 1.45, 2);
    const ca = Math.cos(spin), sa = Math.sin(spin), b = ob.bake, s = ob.s, C = ob.C, lift = ob.lift, K = 120, D = 11;
    const M = [ca * b[0] + sa * b[6], ca * b[1] + sa * b[7], ca * b[2] + sa * b[8], b[3], b[4], b[5], -sa * b[0] + ca * b[6], -sa * b[1] + ca * b[7], -sa * b[2] + ca * b[8]];
    const ph = (t % 6) / 1.5, wpos = ph < 1 ? -1.5 + ph * 3 : 9, wamp = (1 - on) * 0.42, kick = this.kickK * lift * 26;
    const { lc, dir, rn, x, v, n } = ob, d = ob.dyn.array;
    for (let i = 0; i < n; i++) {
      const j = i * 3, lx = lc[j], ly = lc[j + 1], lz = lc[j + 2];
      const ox = M[0] * lx + M[1] * ly + M[2] * lz, oy = M[3] * lx + M[4] * ly + M[5] * lz;
      const dx = ox * s + C[0] - mx, dy = oy * s + C[1] - my, f = on * Math.exp(-(dx * dx + dy * dy) / R2);
      const wave = wamp * Math.exp(-Math.pow(ox - wpos, 2) / 0.07), idle = 0.02 * Math.sin(t * 1.3 + rn[i * 4] * 40);
      const wxd = M[0] * dir[j] + M[1] * dir[j + 1] + M[2] * dir[j + 2], wyd = M[3] * dir[j] + M[4] * dir[j + 1] + M[5] * dir[j + 2], wzd = M[6] * dir[j] + M[7] * dir[j + 1] + M[8] * dir[j + 2];
      let tx, ty, tz;
      if (ob.heap) {
        /* зёрна расталкиваются от курсора в стороны и к зрителю */
        const l = Math.hypot(dx, dy) + 1e-4, a = f * lift * 1.5, w = (wave + idle) * lift;
        tx = (dx / l) * a + wxd * w; ty = (dy / l) * a + wyd * w; tz = a * 0.7 + wzd * w;
      } else {
        const a = lift * (f * (0.6 + rn[i * 4 + 1] * 0.9) + wave + idle);
        tx = wxd * a; ty = wyd * a; tz = wzd * a;
      }
      if (kick) {
        const g = kick * Math.exp(-(dx * dx + dy * dy) / (R2 * 2.6)) * (0.5 + rn[i * 4 + 2]), l = Math.hypot(dx, dy) + 1e-4;
        if (ob.heap) { v[j] += (dx / l) * g; v[j + 1] += (dy / l) * g + g * 0.3; v[j + 2] += g * 0.8; } else { v[j] += wxd * g; v[j + 1] += wyd * g; v[j + 2] += wzd * g; }
      }
      v[j] += (K * (tx - x[j]) - D * v[j]) * dt; v[j + 1] += (K * (ty - x[j + 1]) - D * v[j + 1]) * dt; v[j + 2] += (K * (tz - x[j + 2]) - D * v[j + 2]) * dt;
      x[j] += v[j] * dt; x[j + 1] += v[j + 1] * dt; x[j + 2] += v[j + 2] * dt;
      const k4 = i * 4;
      d[k4] = x[j]; d[k4 + 1] = x[j + 1]; d[k4 + 2] = x[j + 2];
      d[k4 + 3] = Math.min(1, Math.hypot(x[j], x[j + 1], x[j + 2]) / lift);
    }
    ob.dyn.needsUpdate = true;
  }
}

/* Монитор и телефон в сцене работ: стоят под углом в том же пространстве, что и частицы.
   Экран резкий (настоящий скриншот текстурой), корпус и подставка тёмные со светящейся кромкой,
   а осыпь и искры вокруг дорисовывает рой (см. сборку цели s* в main.js).
   Под курсором экран крошится: плитки выпадают, и в дыре видно пыль, из которой он собран. */
import * as THREE from 'three';

const VS = 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const RR = 'float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}';
/* та же борозда от курсора и то же кольцо от щелчка, что у частиц (swarm.js) */
const HOLE = `uniform vec3 uTr[8];uniform float uMR,uHeat;uniform vec4 uPulse;uniform vec2 uGrid;varying vec3 vW;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float hole(){float R=uMR*(1.+.14*uHeat),keep=1.;for(int i=0;i<8;i++){vec2 dd=vW.xy-uTr[i].xy;keep*=1.-uTr[i].z*exp(-dot(dd,dd)/(R*R));}return 1.-keep;}
float ring(){vec2 dp=vW.xy-uPulse.xy;float pk=1.-uPulse.z;return exp(-pow((length(dp)-uPulse.z*uPulse.w)/(uMR*.5),2.))*pk*pk*step(.0005,uPulse.z);}`;
const SCREEN_F = `uniform sampler2D uTex;uniform float uK,uAsp,uRad;varying vec2 vUv;${RR}${HOLE}
void main(){vec2 p=(vUv-.5)*vec2(uAsp,1.);float m=1.-smoothstep(-.003,.003,rr(p,vec2(uAsp,1.)*.5,uRad));
  float f=hole(),rg=ring(),n=h1(floor(vUv*uGrid));
  /* плитка выпадает, когда борозда дошла до её порога; у каждой плитки порог свой, поэтому край рваный */
  float cut=max(step(.3+n*.45,f),step(.5+n*.45,rg));
  float a=uK*m*(1.-cut);if(a<.004)discard;
  float warm=max(smoothstep(.1,.5,f)*(.3+uHeat*.6),rg*.8)*n;
  vec3 c=texture2D(uTex,vUv).rgb;c=mix(c,c*.5+vec3(1.,.42,.12)*.8,min(1.,warm));
  gl_FragColor=vec4(c*a,a);}`;
const BODY_F = `uniform float uK,uAsp,uRad;varying vec2 vUv;${RR}${HOLE}
void main(){vec2 p=(vUv-.5)*vec2(uAsp,1.);float d=rr(p,vec2(uAsp,1.)*.5,uRad);float m=1.-smoothstep(-.003,.003,d);
  float f=hole(),rg=ring(),n=h1(floor(vUv*uGrid));
  float cut=max(step(.34+n*.4,f),step(.55+n*.4,rg));
  /* кромка корпуса светится медью */
  vec3 c=vec3(.05,.042,.037)+vec3(1.,.5,.2)*exp(d*34.)*.95;float a=uK*m*(1.-cut);if(a<.004)discard;gl_FragColor=vec4(c*a,a);}`;
/* ножка и основание подставки: тёмный металл, медный свет по краям */
const NECK_F = `uniform float uK;varying vec2 vUv;
void main(){float x=abs(vUv.x-.5)*2.;vec3 c=mix(vec3(.022,.018,.016),vec3(.085,.07,.06),vUv.y*vUv.y)+vec3(1.,.5,.2)*(pow(x,7.)*.5+pow(vUv.y,9.)*.12);gl_FragColor=vec4(c*uK,uK);}`;
const BASE_F = `uniform float uK,uAsp,uRad;varying vec2 vUv;${RR}
void main(){vec2 p=(vUv-.5)*vec2(uAsp,1.);float d=rr(p,vec2(uAsp,1.)*.5,uRad);float m=1.-smoothstep(-.012,.012,d);
  vec3 c=mix(vec3(.03,.025,.022),vec3(.1,.082,.07),smoothstep(.5,-.5,p.y))+vec3(1.,.5,.2)*exp(d*16.)*.9;float a=uK*m;if(a<.004)discard;gl_FragColor=vec4(c*a,a);}`;
const HALO_F = `uniform float uK;varying vec2 vUv;
void main(){float d=length((vUv-.5)*2.);float a=pow(max(0.,1.-d),2.1)*uK;gl_FragColor=vec4(vec3(1.,.42,.14)*a*.36,0.);}`;

const PREMULT = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
/* основание подставки лежит почти плашмя, чуть наклонено к зрителю, чтобы была видна его верхняя грань */
export const BASE_TILT = -Math.PI / 2 + 0.36, NECK = 0.25, BASE_W = 0.42, BASE_D = 0.2;

export class Devices {
  constructor(sw, imgs, imgsM) {
    this.sw = sw;
    const aniso = sw.r.capabilities.getMaxAnisotropy(), quad = new THREE.PlaneGeometry(1, 1);
    const tex = im => { if (!im) return null; const t = new THREE.Texture(im); t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; };
    this.tex = imgs.map(tex); this.texM = imgsM.map(tex);
    this.K = { value: 0 };
    const SU = sw.U;
    const part = (frag, order, extra = {}) => {
      const U = { uK: this.K, uAsp: { value: 1 }, uRad: { value: 0.03 }, uTex: { value: null }, uGrid: { value: new THREE.Vector2(120, 75) }, uTr: SU.uTr, uMR: SU.uRad, uHeat: SU.uHeat, uPulse: SU.uPulse };
      const m = new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: frag, ...PREMULT, ...extra }));
      m.renderOrder = order; m.frustumCulled = false; m.U = U;
      return m;
    };
    const device = () => {
      const g = new THREE.Group(), body = part(BODY_F, 0.2), screen = part(SCREEN_F, 0.3);
      screen.position.z = 0.012; g.add(body, screen); g.body = body; g.screen = screen; g.visible = false;
      sw.scene.add(g);
      return g;
    };
    this.mon = device(); this.ph = device();
    this.neck = part(NECK_F, 0.12); this.base = part(BASE_F, 0.1);
    this.mon.add(this.neck, this.base);
    this.halo = part(HALO_F, -0.5, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false });
    this.halo.visible = false; sw.scene.add(this.halo);
    this.cur = -1;
  }

  /* где стоят устройства: считаем от места, которое им отведено в вёрстке (r, в пикселях) */
  layout(r) {
    const sw = this.sw, u = sw.u, wide = sw.W > 860;
    const w = r.w * u * (wide ? 1.1 : 0.84), h = w / 1.6, C = [sw.wx(r.x + r.w * (wide ? 0.56 : 0.47)), sw.wy(r.y + r.h * (wide ? 0.4 : 0.46)), 0];
    const ph = h * (wide ? 0.72 : 0.72), pw = (ph * 390) / 844;
    const P = {
      mon: { C, w, h, rot: { ry: 0.3, rx: -0.03, rz: -0.035 } },
      ph: { C: [C[0] + w * 0.47, C[1] - h * 0.3, 0.6], w: pw, h: ph, rot: { ry: -0.3, rx: 0.02, rz: 0.13 } }
    };
    const set = (g, D, pad, rad) => {
      g.position.fromArray(D.C); g.rotation.set(D.rot.rx, D.rot.ry, D.rot.rz, 'XYZ');
      g.screen.scale.set(D.w, D.h, 1); g.screen.U.uAsp.value = D.w / D.h; g.screen.U.uRad.value = rad;
      g.body.scale.set(D.w + pad * 2, D.h + pad * 2, 1); g.body.U.uAsp.value = (D.w + pad * 2) / (D.h + pad * 2); g.body.U.uRad.value = rad * 1.6;
    };
    set(this.mon, P.mon, w * 0.016, 0.024); set(this.ph, P.ph, pw * 0.045, 0.05);
    this.neck.visible = this.base.visible = wide;
    this.neck.scale.set(w * 0.1, h * NECK, 1); this.neck.position.set(0, -h / 2 - h * NECK * 0.5 + h * 0.012, -0.03);
    this.base.scale.set(w * BASE_W, w * BASE_D, 1); this.base.position.set(0, -h / 2 - h * NECK, 0.02); this.base.rotation.x = BASE_TILT;
    this.base.U.uAsp.value = BASE_W / BASE_D; this.base.U.uRad.value = 0.5;
    this.halo.position.set(C[0] + w * 0.08, C[1] - h * 0.05, -1.2); this.halo.scale.set(w * 2.3, h * 2.6, 1);
    this.P = P;
    return P;
  }

  /* размер плитки экрана равен одной частице: выпавшая плитка и вылетевшая частица совпадают */
  grid(cols, colsM) {
    const P = this.P; if (!P) return;
    this.mon.screen.U.uGrid.value.set(cols, Math.round((cols * P.mon.h) / P.mon.w));
    this.mon.body.U.uGrid.value.set(cols * 0.5, Math.round((cols * 0.5 * P.mon.h) / P.mon.w));
    this.ph.screen.U.uGrid.value.set(colsM, Math.round((colsM * P.ph.h) / P.ph.w));
    this.ph.body.U.uGrid.value.set(colsM * 0.6, Math.round((colsM * 0.6 * P.ph.h) / P.ph.w));
  }

  show(k, a) {
    const on = a > 0.004 && !!this.tex[k];
    this.mon.visible = this.ph.visible = this.halo.visible = on;
    this.K.value = a;
    if (on && k !== this.cur) { this.cur = k; this.mon.screen.U.uTex.value = this.tex[k]; this.ph.screen.U.uTex.value = this.texM[k] || this.tex[k]; }
  }
}

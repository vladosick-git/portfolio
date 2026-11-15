/* Монитор и телефон в сцене работ: стоят под углом в том же пространстве, что и частицы.
   Экран резкий (настоящий скриншот текстурой), корпус тёмный со светящейся кромкой,
   а края, подставку и осыпь вокруг дорисовывает рой (см. сборку цели s* в main.js). */
import * as THREE from 'three';

const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const RR = 'float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}';
const SCREEN_F = `uniform sampler2D uTex;uniform float uK,uAsp,uRad;varying vec2 vUv;${RR}
void main(){vec2 p=(vUv-.5)*vec2(uAsp,1.);float m=1.-smoothstep(-.003,.003,rr(p,vec2(uAsp,1.)*.5,uRad));
  float a=uK*m;gl_FragColor=vec4(texture2D(uTex,vUv).rgb*a,a);}`;
const BODY_F = `uniform float uK,uAsp,uRad;varying vec2 vUv;${RR}
void main(){vec2 p=(vUv-.5)*vec2(uAsp,1.);float d=rr(p,vec2(uAsp,1.)*.5,uRad);float m=1.-smoothstep(-.003,.003,d);
  /* кромка корпуса светится медью */
  vec3 c=vec3(.05,.042,.037)+vec3(1.,.5,.2)*exp(d*34.)*.95;float a=uK*m;gl_FragColor=vec4(c*a,a);}`;
const HALO_F = `uniform float uK;varying vec2 vUv;
void main(){float d=length((vUv-.5)*2.);float a=pow(max(0.,1.-d),2.1)*uK;gl_FragColor=vec4(vec3(1.,.42,.14)*a*.36,0.);}`;

const PREMULT = { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };

export class Devices {
  constructor(sw, imgs, imgsM) {
    this.sw = sw;
    const aniso = sw.r.capabilities.getMaxAnisotropy(), quad = new THREE.PlaneGeometry(1, 1);
    const tex = im => { if (!im) return null; const t = new THREE.Texture(im); t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; };
    this.tex = imgs.map(tex); this.texM = imgsM.map(tex);
    this.K = { value: 0 };
    const part = (frag, order, extra = {}) => {
      const U = { uK: this.K, uAsp: { value: 1 }, uRad: { value: 0.03 }, uTex: { value: null } };
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
    this.halo = part(HALO_F, -0.5, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false });
    this.halo.visible = false; sw.scene.add(this.halo);
    this.cur = -1;
  }

  /* где стоят устройства: считаем от места, которое им отведено в вёрстке (r, в пикселях) */
  layout(r) {
    const sw = this.sw, u = sw.u, wide = sw.W > 860;
    const w = r.w * u * (wide ? 0.9 : 0.84), h = w / 1.6, C = [sw.wx(r.x + r.w * (wide ? 0.5 : 0.47)), sw.wy(r.y + r.h * (wide ? 0.4 : 0.46)), 0];
    const ph = h * (wide ? 0.7 : 0.72), pw = (ph * 390) / 844;
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
    this.halo.position.set(C[0] + w * 0.08, C[1] - h * 0.05, -1.2); this.halo.scale.set(w * 2.3, h * 2.6, 1);
    this.P = P;
    return P;
  }

  show(k, a) {
    const on = a > 0.004 && !!this.tex[k];
    this.mon.visible = this.ph.visible = this.halo.visible = on;
    this.K.value = a;
    if (on && k !== this.cur) { this.cur = k; this.mon.screen.U.uTex.value = this.tex[k]; this.ph.screen.U.uTex.value = this.texM[k] || this.tex[k]; }
  }
}

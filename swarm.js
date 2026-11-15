/* Рой: одно облако частиц на весь сайт.
   У каждой частицы две цели, A и B. Шейдер ведёт её из A в B по ветру,
   страница только говорит, между какими двумя состояниями мы сейчас и на какой доле пути.
   Под частицами течёт дымка из медной пыли, поверх лежит свечение. */
import * as THREE from 'three';

const FOV = 30, DIST = 10, TAN = Math.tan((FOV * Math.PI) / 360);

const NOISE = `float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h1(i),h1(i+vec2(1.,0.)),f.x),mix(h1(i+vec2(0.,1.)),h1(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*ns(p);p=m*p;a*=.5;}return v;}`;

const VQ = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

/* дымка: тёплая пыль, которую несёт ветром слева направо; под курсором она расступается и теплеет */
const FOG = `varying vec2 vUv;uniform float uT,uWide,uH;uniform vec2 uRes,uM;${NOISE}
void main(){
  float asp=uRes.x/uRes.y; vec2 p=(vUv-.5)*vec2(asp,1.);
  vec2 m=uM*vec2(asp,1.); float md=length(p-m); p+=(p-m)*.2*exp(-md*2.6);
  float t=uT*.035;
  vec2 q=vec2(fbm(p*1.1+vec2(-t,0.)),fbm(p*1.1+vec2(3.1,1.7)+t*.8));
  vec2 r=vec2(fbm(p*1.25+2.2*q+vec2(1.7,9.2)-t*1.3),fbm(p*1.25+2.2*q+vec2(8.3,2.8)+t));
  float f=fbm(p+2.6*r+vec2(-t*2.,0.));
  float streak=pow(.5+.5*sin((p.y*2.2-p.x*.5)*2.4+f*7.-t*3.),4.);
  vec3 c=mix(vec3(.012,.008,.006),vec3(.17,.075,.028),smoothstep(.25,.75,f));
  c=mix(c,vec3(.5,.24,.085),smoothstep(.55,.95,f)*.62);
  c+=vec3(.9,.45,.18)*streak*smoothstep(.4,.9,f)*.13;
  c+=vec3(.55,.22,.07)*exp(-md*3.2)*(.2+uH*.35);
  float lit=uWide>.5?smoothstep(.12,.82,vUv.x)*(.72+.28*(1.-abs(vUv.y-.5)*1.5)):smoothstep(.15,.9,1.-vUv.y);
  gl_FragColor=vec4(c*mix(.2,1.,lit),1.);
}`;

const OUT = `varying vec2 vUv;uniform sampler2D uTex;uniform float uT,uK;uniform vec2 uRes;
float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 c=texture2D(uTex,vUv).rgb;c+=(h1(vUv*uRes+fract(uT*7.)*91.)-.5)*.022;gl_FragColor=vec4(max(c,0.)*uK,uK);}`;

const VERT = `
attribute vec3 aA; attribute vec3 aB; attribute vec4 cA; attribute vec4 cB; attribute vec4 aR;
uniform float uMix,uT,uWT,uPr,uU,uMouseOn,uRad,uSpinA,uSpinB,uSA,uSB,uWind,uWA,uWB,uQA,uQB,uBX,uGlow,uHeat;
uniform vec2 uMouse,uVel; uniform vec3 uCA,uCB; uniform vec3 uTr[8]; uniform vec4 uPulse;
varying vec3 vC; varying float vA; varying float vQ;
vec3 spin(vec3 p,vec3 c,float a){p-=c;float s=sin(a),k=cos(a);return vec3(p.x*k+p.z*s,p.y,-p.x*s+p.z*k)+c;}
void main(){
  float e=clamp((uMix-aR.x*.5)/.5,0.,1.); e=e*e*(3.-2.*e);
  vec3 A=spin(aA,uCA,uSpinA), B=spin(aB,uCB,uSpinB);
  A.z+=sin(A.x*1.4+uT*.7)*uWA; B.z+=sin(B.x*1.4+uT*.7)*uWB;
  vec3 p=mix(A,B,e);
  float arc=sin(e*3.14159);
  /* в полёте частицу несёт ветер и закручивает */
  vec3 w=vec3(1.,.3,0.)*(.3+aR.y*1.3)
    +vec3(sin(aR.z*40.+uT*.6+p.y*1.2),cos(aR.w*37.+uT*.5+p.x),sin(aR.y*31.+uT*.4)*1.6)*(.25+aR.z*.5);
  p+=w*arc*uWind;
  vec4 c=mix(cA,cB,e);
  float dustK=1.-smoothstep(.55,.72,c.a);
  /* пыль всё время плавает, и её сносит ветром через весь экран */
  p+=vec3(sin(uT*.21+aR.z*6.283),cos(uT*.17+aR.w*6.283),sin(uT*.13+aR.x*6.283))*.22*dustK;
  /* ветром сносит только свободную пыль; потоки и следы остаются на месте */
  float windK=1.-smoothstep(.42,.47,c.a);
  float wx=mod(p.x+uWT*(.08+aR.y*.26)+uBX,2.*uBX)-uBX; p.x=mix(p.x,wx,windK);
  float sqB=mix(uQA,uQB,e)*(1.-arc);
  p.xy+=vec2(sin(uT*1.3+aR.z*50.),cos(uT*1.1+aR.w*50.))*uU*.7*(1.-sqB);
  /* курсор: за рукой остаётся борозда, которая затягивается не сразу */
  float R=uRad*(1.+.14*uHeat), keep=1.; vec2 ps=vec2(0.);
  for(int i=0;i<8;i++){vec2 dd=p.xy-uTr[i].xy; float l2=dot(dd,dd), g=uTr[i].z*exp(-l2/(R*R)); ps+=dd*inversesqrt(l2+1e-6)*g; keep*=1.-g;}
  float f=1.-keep;
  p.xy+=ps/(length(ps)+1e-4)*f*R*(.55+aR.y*.9); p.z+=f*(aR.x-.35)*(1.2+uHeat*.8);
  /* по ходу движения пыль тянется за рукой и закручивается по бокам */
  vec2 d=p.xy-uMouse; float dl=length(d), fh=uMouseOn*exp(-dl*dl/(R*R*2.4));
  float side=sign(uVel.x*d.y-uVel.y*d.x);
  p.xy+=uVel*fh*(.12+aR.z*.7)+vec2(-uVel.y,uVel.x)*side*fh*(1.-fh)*1.3*aR.w;
  /* щелчок: по пыли расходится кольцо */
  vec2 dp=p.xy-uPulse.xy; float pl=length(dp), pk=1.-uPulse.z;
  float ring=exp(-pow((pl-uPulse.z*uPulse.w)/(uRad*.5),2.))*pk*pk*step(.0005,uPulse.z);
  p.xy+=dp/(pl+1e-4)*ring*uRad*(.5+aR.y*.9); p.z+=ring*(aR.x-.3)*1.1;
  /* кромка борозды и гребень кольца раскалены */
  float hot=4.*f*(1.-f)*(.16+uHeat*.95)+ring*1.1;
#ifdef GLOW
  if(c.a<.7||(aR.w<.955&&hot*aR.z<.4)){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
#endif
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  if(c.a<.7) gl_Position.z=gl_Position.w*.9995;
#ifdef GLOW
  gl_PointSize=min(mix(uSA,uSB,e)*(10./-mv.z)*7.,18.)*uPr;
  vC=mix(c.rgb,vec3(1.,.5,.2),min(1.,hot)); vA=.11*uGlow*(1.+arc*2.+hot*1.6); vQ=0.;
#else
  /* пыль не в фокусе: чем дальше от плоскости сцены, тем крупнее и прозрачнее */
  float dof=dustK*min(2.,abs(p.z)*.4);
  /* экраны сайтов собраны из квадратных частиц встык, всё остальное из круглых разного размера */
  float sq=sqB*(1.-min(1.,f*4.));
  gl_PointSize=clamp(mix(uSA,uSB,e)*(10./-mv.z)*mix(.85+aR.z*.4,1.,sq)*(1.+arc*.5)*(1.+dof*.95)*(1.+min(1.,hot)*.3*aR.z),1.,14.)*uPr;
  vC=c.rgb*(.95+aR.w*.1)+vec3(1.,.45,.15)*arc*.25*aR.w; vC=mix(vC,vec3(1.,.5,.14)+vC*.25,min(.85,hot*(.2+aR.w*.8))*mix(1.,.6,dustK)); vA=c.a/(1.+dof*dof*.9); vQ=sq;
#endif
}`;

const FRAG = `
varying vec3 vC; varying float vA; varying float vQ;
void main(){
  vec2 q=gl_PointCoord-.5; float d=dot(q,q);
#ifdef GLOW
  float r=1.-min(1.,sqrt(d)*2.); gl_FragColor=vec4(vC*r*r*vA,0.);
#else
  if(d>.25&&vQ<.5) discard;
  float a=vA>.7?vA:vA*smoothstep(.25,.05,d);
  gl_FragColor=vec4(vC*a,a);
#endif
}`;

/* потоки: светящиеся ленты пыли, которые тянутся через весь экран и изгибаются.
   На тёмном фоне они складываются светом, на светлом становятся графитовой крошкой. */
const RIB_V = `
attribute vec4 aR;
uniform float uT,uWT,uPr,uBX,uBY,uMouseOn,uRad,uPaper,uScroll,uWide,uSide,uHeat; uniform vec2 uMouse; uniform vec3 uTr[8]; uniform vec4 uPulse;
varying vec3 vC; varying float vA;
void main(){
  float rib=floor(aR.w*5.), h=rib*1.73+.37;
  float s=fract(aR.x+uWT*(.02+.018*fract(h*.37))*(.6+.8*fract(aR.y*7.3)));
  float x=(s*2.-1.)*uBX*1.2;
  float ph=uT*.1+h*2.1+uScroll*.9;
  float cy=uBY*((fract(h*.618)-.5)*1.5+.2*sin(x*.5+ph)+.1*sin(x*1.25-ph*1.6+h))+x*.16;
  float w=uBY*(.022+.07*(.5+.5*sin(x*.7+ph*.7+h*2.)));
  float gy=aR.y*2.-1.; gy=gy*gy*gy;
  vec3 p=vec3(x,cy+w*gy*2.2,-1.2+rib*.5+(aR.z*2.-1.)*.6);
  p.y+=sin(x*3.+uT*.6+aR.z*20.)*w*.25;
  float R=uRad*(1.+.14*uHeat), keep=1.; vec2 ps=vec2(0.);
  for(int i=0;i<8;i++){vec2 dd=p.xy-uTr[i].xy; float l2=dot(dd,dd), g=uTr[i].z*exp(-l2/(R*R)); ps+=dd*inversesqrt(l2+1e-6)*g; keep*=1.-g;}
  float f=1.-keep; p.xy+=ps/(length(ps)+1e-4)*f*R*.8;
  vec2 dp=p.xy-uPulse.xy; float pl=length(dp), pk=1.-uPulse.z;
  float ring=exp(-pow((pl-uPulse.z*uPulse.w)/(uRad*.5),2.))*pk*pk*step(.0005,uPulse.z);
  p.xy+=dp/(pl+1e-4)*ring*uRad*.8;
  float hot=4.*f*(1.-f)*(.2+uHeat)+ring;
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  float core=1.-abs(gy), edge=smoothstep(0.,.08,s)*smoothstep(1.,.92,s);
  /* там, где на экране текст, потоки приглушены */
  float side=uWide>.5?mix(1.,mix(.22,1.,smoothstep(-.55,.25,-sign(uSide)*x/uBX)),abs(uSide))
    :mix(1.,mix(.2,1.,smoothstep(.2,-.4,-sign(uSide)*p.y/uBY)),abs(uSide))*.75;
  float big=step(.94,aR.z);
  gl_PointSize=min((1.1+aR.z*1.7+big*5.)*(10./-mv.z),9.)*uPr;
  vA=(.22+.78*core*core)*edge*side*(1.-big*.8)*mix(1.,1.15,uPaper)*(1.+hot*.9);
  vec3 warm=mix(vec3(.84,.5,.25),vec3(1.,.36,.1),fract(aR.x*13.7)); warm=mix(warm,vec3(1.,.9,.75),step(.9,fract(aR.y*31.)));
  vec3 dark=mix(vec3(.13,.115,.1),vec3(.75,.45,.22),step(.93,fract(aR.y*17.)));
  vC=mix(warm,dark,uPaper);
}`;
const RIB_F = `
uniform float uPaper; varying vec3 vC; varying float vA;
void main(){vec2 q=gl_PointCoord-.5;float d=dot(q,q);if(d>.25)discard;float a=min(1.,vA)*smoothstep(.25,.02,d);gl_FragColor=vec4(vC*a,a*uPaper);}`;

/* искры: вылетают из-под курсора, их сносит ветром, они остывают и гаснут */
const EMB_V = `
attribute vec2 aL; uniform float uPr; varying float vL;
void main(){
  vL=aL.x; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=step(.001,aL.x)*(1.6+aL.y*4.6)*(.35+.65*aL.x)*(10./-mv.z)*uPr;
}`;
const EMB_F = `
uniform float uPaper; varying float vL;
void main(){
  float d=length(gl_PointCoord-.5)*2.; if(d>1.||vL<=0.) discard;
  float core=1.-d; core*=core;
  vec3 c=mix(mix(vec3(.9,.2,.03),vec3(1.,.55,.16),smoothstep(0.,.5,vL)),vec3(1.,.93,.78),smoothstep(.55,1.,vL));
  c=mix(c,vec3(.16,.13,.11),uPaper);
  float a=core*min(1.,vL*3.)*mix(1.,.8,uPaper);
  gl_FragColor=vec4(c*a,a*uPaper);
}`;
const EN = 360;

export class Swarm {
  constructor(canvas, count, glow = true) {
    this.N = count;
    this.maxDpr = 1.25;
    this.builders = {};
    this.targets = new Map();
    this.fog = 1;        // 1 на тёмных экранах, 0 на светлом
    this.par = 1;        // сила параллакса; 0, когда частицы должны точно совпасть с экраном монитора
    this.nx = 0; this.ny = 0; this.ax = 0; this.ay = 0;
    const r = (this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' }));
    r.setClearColor(0x000000, 0);
    r.autoClear = false;
    this.cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    this.cam.position.z = DIST;
    this.scene = new THREE.Scene();

    /* дымка рисуется в маленькую текстуру и растягивается: так она почти ничего не стоит */
    this.flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.PlaneGeometry(2, 2);
    this.rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
    const FU = (this.FU = { uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uM: { value: new THREE.Vector2() }, uWide: { value: 1 }, uH: { value: 0 } });
    this.fogScene = new THREE.Scene();
    this.fogScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: FU, vertexShader: VQ, fragmentShader: FOG, depthTest: false, depthWrite: false })));
    this.OU = { uTex: { value: this.rt.texture }, uT: FU.uT, uRes: FU.uRes, uK: { value: 1 } };
    this.outScene = new THREE.Scene();
    this.outScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({
      uniforms: this.OU, vertexShader: VQ, fragmentShader: OUT, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    })));

    const g = (this.geo = new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const R = new Float32Array(count * 4);
    for (let i = 0; i < R.length; i++) R[i] = Math.random();
    g.setAttribute('aR', new THREE.BufferAttribute(R, 4));

    const U = (this.U = {
      uMix: { value: 0 }, uT: { value: 0 }, uPr: { value: 1 }, uU: { value: 0.01 },
      uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 }, uRad: { value: 0.5 },
      uCA: { value: new THREE.Vector3() }, uCB: { value: new THREE.Vector3() },
      uSpinA: { value: 0 }, uSpinB: { value: 0 }, uSA: { value: 2 }, uSB: { value: 2 },
      uWA: { value: 0 }, uWB: { value: 0 }, uQA: { value: 0 }, uQB: { value: 0 },
      uWind: { value: 0.8 }, uBX: { value: 4 }, uGlow: { value: 1 },
      uWT: { value: 0 }, uHeat: { value: 0 }, uVel: { value: new THREE.Vector2() },
      uTr: { value: Array.from({ length: 8 }, () => new THREE.Vector3(99, 99, 0)) },
      uPulse: { value: new THREE.Vector4(99, 99, 0, 1) }
    });
    const m = new THREE.ShaderMaterial({
      uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true,
      depthTest: true, depthWrite: true, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    this.pts = new THREE.Points(g, m);
    this.pts.frustumCulled = false;
    this.scene.add(this.pts);

    if (glow) {
      const gm = new THREE.ShaderMaterial({
        uniforms: U, defines: { GLOW: 1 }, vertexShader: VERT, fragmentShader: FRAG, transparent: true,
        depthTest: true, depthWrite: false, blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor
      });
      this.glow = new THREE.Points(g, gm);
      this.glow.frustumCulled = false;
      this.glow.renderOrder = 2;
      this.scene.add(this.glow);
    }
    /* потоки пыли */
    const RN = count > 100000 ? 60000 : 16000, rg = new THREE.BufferGeometry(), rr = new Float32Array(RN * 4);
    for (let i = 0; i < rr.length; i++) rr[i] = Math.random();
    rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RN * 3), 3));
    rg.setAttribute('aR', new THREE.BufferAttribute(rr, 4));
    this.RU = { uT: U.uT, uWT: U.uWT, uPr: U.uPr, uBX: U.uBX, uBY: { value: 1 }, uMouse: U.uMouse, uMouseOn: U.uMouseOn, uRad: U.uRad, uHeat: U.uHeat, uTr: U.uTr, uPulse: U.uPulse, uPaper: { value: 0 }, uScroll: { value: 0 }, uSide: { value: -1 }, uWide: FU.uWide };
    this.rib = new THREE.Points(rg, new THREE.ShaderMaterial({
      uniforms: this.RU, vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    }));
    this.rib.frustumCulled = false; this.rib.renderOrder = -1;
    this.scene.add(this.rib);
    this.scroll = 0; this.side = -1;
    this.mouseT = 0;
    /* искры */
    const eg = new THREE.BufferGeometry();
    this.em = { pos: new Float32Array(EN * 3).fill(99), vel: new Float32Array(EN * 3), life: new Float32Array(EN), max: new Float32Array(EN).fill(1), l: new Float32Array(EN * 2), i: 0, carry: 0 };
    eg.setAttribute('position', new THREE.BufferAttribute(this.em.pos, 3).setUsage(THREE.DynamicDrawUsage));
    eg.setAttribute('aL', new THREE.BufferAttribute(this.em.l, 2).setUsage(THREE.DynamicDrawUsage));
    this.emb = new THREE.Points(eg, new THREE.ShaderMaterial({
      uniforms: { uPr: U.uPr, uPaper: this.RU.uPaper }, vertexShader: EMB_V, fragmentShader: EMB_F, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    }));
    this.emb.frustumCulled = false; this.emb.renderOrder = 3;
    this.scene.add(this.emb);
    /* курсор: где он был в прошлом кадре, с какой скоростью идёт, сколько в нём «жара» */
    this.pm = new THREE.Vector2(99, 99); this.vel = new THREE.Vector2(); this.heat = 0; this.drop = 1; this.pt = 0; this.pScroll = 0; this.gust = 0; this.pulseT = -9;
    this.resize();
  }

  spark(x, y, vx, vy, speed, life) {
    const e = this.em, i = e.i, a = Math.random() * 6.2832, s = speed * (0.25 + Math.random());
    e.i = (i + 1) % EN;
    e.pos[i * 3] = x; e.pos[i * 3 + 1] = y; e.pos[i * 3 + 2] = (Math.random() - 0.3) * 0.5;
    e.vel[i * 3] = vx + Math.cos(a) * s; e.vel[i * 3 + 1] = vy + Math.sin(a) * s; e.vel[i * 3 + 2] = (Math.random() - 0.4) * s;
    e.life[i] = e.max[i] = life * (0.5 + Math.random()); e.l[i * 2 + 1] = Math.random();
  }

  /* щелчок или касание: кольцо по пыли и сноп искр */
  pulse(px, py) {
    const x = this.wx(px), y = this.wy(py), R = this.U.uRad.value;
    this.U.uPulse.value.set(x, y, 0.001, Math.max(this.W, this.H) * 0.42 * this.u);
    this.pulseT = this.pt;
    for (let k = 0; k < 46; k++) this.spark(x, y, 0, R * 0.4, R * 4.2, 1.1);
  }

  /* всё, что зависит от движения курсора и прокрутки: борозда, скорость, жар, искры, порывы ветра */
  motion(t) {
    const U = this.U, dt = Math.min(0.05, Math.max(0.001, t - this.pt)); this.pt = t;
    const m = U.uMouse.value, R = U.uRad.value, on = U.uMouseOn.value, tr = U.uTr.value;
    const fresh = this.pm.x > 90 || m.x > 90, dx = fresh ? 0 : m.x - this.pm.x, dy = fresh ? 0 : m.y - this.pm.y, dist = Math.hypot(dx, dy);
    this.pm.copy(m);
    const k = 1 - Math.exp(-dt * 14);
    this.vel.x += (dx / dt - this.vel.x) * k; this.vel.y += (dy / dt - this.vel.y) * k;
    const sp = this.vel.length(), sn = Math.min(1, sp / (R * 9));
    this.heat += (sn - this.heat) * (sn > this.heat ? 0.22 : 0.04);
    U.uHeat.value = this.heat * on;
    const lim = Math.min(1, (R * 0.85) / (sp * 0.05 + 1e-5));
    U.uVel.value.set(this.vel.x * 0.05 * lim * on, this.vel.y * 0.05 * lim * on);
    /* борозда: голова там, где курсор, за ней точки, которые гаснут примерно за секунду */
    const fade = Math.exp(-dt * 3.1);
    for (let i = 1; i < 8; i++) tr[i].z *= fade;
    tr[0].set(m.x, m.y, on);
    const last = tr[this.drop];
    if (on > 0.05 && Math.hypot(m.x - last.x, m.y - last.y) > R * 0.42) { this.drop = (this.drop % 7) + 1; tr[this.drop].set(m.x, m.y, on * 0.82); }
    /* искры сыплются тем гуще, чем быстрее ведут рукой */
    const e = this.em;
    if (on > 0.2 && dist > 0) {
      e.carry += (dist / (R * 0.16)) * (0.25 + this.heat);
      let n = Math.min(10, e.carry | 0); e.carry -= e.carry | 0;
      while (n-- > 0) { const q = Math.random(); this.spark(m.x - dx * q + (Math.random() - 0.5) * R * 0.5, m.y - dy * q + (Math.random() - 0.5) * R * 0.5, this.vel.x * 0.22, this.vel.y * 0.22, R * 1.3, 0.95); }
    }
    const drag = Math.exp(-dt * 1.9), wind = R * 1.5 * dt, lift = R * 0.5 * dt;
    for (let i = 0; i < EN; i++) {
      if (e.life[i] <= 0) continue;
      const j = i * 3;
      e.life[i] -= dt;
      if (e.life[i] <= 0) { e.pos[j] = e.pos[j + 1] = 99; e.l[i * 2] = 0; continue; }
      e.vel[j] = e.vel[j] * drag + wind; e.vel[j + 1] = e.vel[j + 1] * drag + lift; e.vel[j + 2] *= drag;
      e.pos[j] += e.vel[j] * dt; e.pos[j + 1] += e.vel[j + 1] * dt; e.pos[j + 2] += e.vel[j + 2] * dt;
      e.l[i * 2] = e.life[i] / e.max[i];
    }
    this.emb.geometry.attributes.position.needsUpdate = true; this.emb.geometry.attributes.aL.needsUpdate = true;
    /* кольцо от щелчка расходится чуть меньше секунды */
    const pa = (t - this.pulseT) / 0.95;
    U.uPulse.value.z = pa >= 1 ? 0 : Math.max(0.001, 1 - Math.pow(1 - pa, 2.2));
    /* прокрутка поднимает ветер: вниз пыль несёт быстрее, вверх её тянет обратно */
    const sv = (this.scroll - this.pScroll) / dt; this.pScroll = this.scroll;
    this.gust += (Math.max(-3, Math.min(5, sv * 1.6)) - this.gust) * 0.07;
    U.uWT.value += dt * (1 + this.gust * 2.2);
  }

  resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, this.maxDpr);
    this.r.setPixelRatio(dpr);
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.W = w; this.H = h;
    this.u = (2 * DIST * TAN) / h;            // мировых единиц в одном пикселе на плоскости z=0
    this.U.uU.value = this.u;
    this.U.uPr.value = dpr;
    this.U.uRad.value = Math.min(w, h) * 0.11 * this.u;
    this.U.uWind.value = 0.15 * h * this.u;
    this.U.uBX.value = w * 0.66 * this.u;
    this.RU.uBY.value = h * 0.5 * this.u;
    const k = Math.min(0.5, 640 / Math.max(w, 1));
    this.rt.setSize(Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k)));
    this.FU.uRes.value.set(w, h);
    this.FU.uWide.value = w > 860 ? 1 : 0;
  }

  /* пиксели экрана → мир (плоскость z=0) */
  wx(px) { return (px - this.W / 2) * this.u; }
  wy(py) { return (this.H / 2 - py) * this.u; }

  target(key) {
    let t = this.targets.get(key);
    if (!t) {
      const N = this.N;
      t = { pos: new Float32Array(N * 3), col: new Uint8ClampedArray(N * 4), center: [0, 0, 0], wob: 0, rot: 0, size: 2, wave: 0, sq: 0 };
      this.builders[key](t, this);
      t.pa = new THREE.BufferAttribute(t.pos, 3);
      t.ca = new THREE.BufferAttribute(t.col, 4, true);
      this.targets.set(key, t);
    }
    return t;
  }

  has(key) { return this.targets.has(key); }

  /* после смены размера окна все цели пересчитываются заново */
  invalidate() {
    this.targets.clear();
    this.ka = this.kb = null;
  }

  setPair(a, b) {
    if (a === this.ka && b === this.kb) return;
    const A = this.target(a), B = this.target(b), g = this.geo, U = this.U;
    g.setAttribute('aA', A.pa); g.setAttribute('aB', B.pa);
    g.setAttribute('cA', A.ca); g.setAttribute('cB', B.ca);
    U.uCA.value.fromArray(A.center); U.uCB.value.fromArray(B.center);
    U.uSA.value = A.size; U.uSB.value = B.size;
    U.uWA.value = A.wave; U.uWB.value = B.wave;
    U.uQA.value = A.sq; U.uQB.value = B.sq;
    this.A = A; this.B = B; this.ka = a; this.kb = b;
  }

  pointer(px, py) {
    this.U.uMouse.value.set(this.wx(px), this.wy(py));
    this.nx = px / this.W - 0.5; this.ny = py / this.H - 0.5;
    this.mouseT = 1;
    /* курсор замер: дыра затягивается */
    clearTimeout(this.idle);
    this.idle = setTimeout(() => (this.mouseT = 0), 2600);
  }

  pointerOff() { this.mouseT = 0; }

  render(t, mix) {
    const U = this.U, r = this.r;
    if (!this.A) return;
    U.uMix.value = mix;
    U.uT.value = t;
    U.uSpinA.value = this.A.wob * Math.sin(t * 0.6) + this.A.rot * t;
    U.uSpinB.value = this.B.wob * Math.sin(t * 0.6) + this.B.rot * t;
    U.uMouseOn.value += (this.mouseT - U.uMouseOn.value) * 0.08;
    this.motion(t);
    U.uGlow.value = this.fog;
    this.RU.uPaper.value = 1 - this.fog; this.RU.uScroll.value = this.scroll; this.RU.uSide.value += (this.side - this.RU.uSide.value) * 0.05;
    /* сцена чуть поворачивается за курсором */
    this.ax += (this.nx - this.ax) * 0.04; this.ay += (this.ny - this.ay) * 0.04;
    this.cam.position.set(this.ax * 0.7 * this.par, -this.ay * 0.45 * this.par, DIST);
    this.cam.lookAt(0, 0, 0);
    r.clear();
    if (this.fog > 0.004) {
      this.FU.uT.value = t; this.FU.uH.value = U.uHeat.value; this.FU.uM.value.set(this.ax, -this.ay); this.OU.uK.value = this.fog;
      r.setRenderTarget(this.rt); r.render(this.fogScene, this.flat); r.setRenderTarget(null);
      r.render(this.outScene, this.flat);
    }
    r.render(this.scene, this.cam);
  }
}

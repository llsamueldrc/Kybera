/* KYBERA — configurator-page.js — REALISMO EXTREMO */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */
const CRYSTAL_COLORS = {
  blue:   { hex: '#00ccff' },
  green:  { hex: '#00ff66' },
  purple: { hex: '#ee66ff' },
  white:  { hex: '#ffffff' },
  red:    { hex: '#ff0000' },
  yellow: { hex: '#ffcc00' }
};
const HILT_SLEEVES = {
  brushedSteel: { name: 'Brushed Steel', metalness: 0.95, roughness: 0.18, color: 0x888888 },
  darkBronzed:  { name: 'Dark Bronzed',  metalness: 0.88, roughness: 0.3,  color: 0x8c5a2b },
  ancientStone: { name: 'Ancient Stone', metalness: 0.15, roughness: 0.85, color: 0x555555 }
};

/* ══════════════════════════════════════════════════════════════
   ANIMATOR (sin TWEEN)
   ══════════════════════════════════════════════════════════════ */
class Animator {
  constructor() { this.tweens = []; }
  tween(target, props, duration, easing = 'easeInOutCubic', onComplete = null) {
    const start = {}, end = {};
    for (const key in props) { start[key] = target[key]; end[key] = props[key]; }
    this.tweens.push({ target, start, end, duration, elapsed: 0, easing, onComplete });
  }
  update(delta) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const t = this.tweens[i];
      t.elapsed += delta;
      const p = Math.min(t.elapsed / t.duration, 1);
      const e = this.ease(p, t.easing);
      for (const k in t.end) t.target[k] = t.start[k] + (t.end[k] - t.start[k]) * e;
      if (p >= 1) { if (t.onComplete) t.onComplete(); this.tweens.splice(i, 1); }
    }
  }
  ease(t, type) {
    switch (type) {
      case 'easeInOutCubic': return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      case 'easeOutCubic': return 1 - Math.pow(1-t,3);
      case 'easeInCubic': return t*t*t;
      default: return t;
    }
  }
  get isAnimating() { return this.tweens.length > 0; }
}

/* ══════════════════════════════════════════════════════════════
    STATE
    ══════════════════════════════════════════════════════════════ */
let currentSleeve = 'brushedSteel';
let currentCrystal = 'blue';
let bladeActive = false;
let isAssembled = false;
const animator = new Animator();

function saveConfig() {
  localStorage.setItem('kybera_config', JSON.stringify({ sleeve: currentSleeve, crystal: currentCrystal }));
}

saveConfig();

// Sonido del sable de luz
const saberSound = new Audio('/models/Sonido sable/light-saber.mp3');

/* ══════════════════════════════════════════════════════════════
   RENDERER + SCENE + CAMERA
   ══════════════════════════════════════════════════════════════ */
const container = document.getElementById('canvas-container');

// Móvil: menor pixel ratio + bloom más suave para que cargue fluido.
// Desktop: conserva la máxima calidad.
const IS_MOBILE = window.matchMedia('(max-width: 767px)').matches || (navigator.maxTouchPoints > 0);
const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1 : 2);

function showWebGLError(msg) {
  const el = document.getElementById('webgl-error');
  if (el) {
    el.style.display = 'flex';
    const p = el.querySelector('p.text-gray-400');
    if (p && msg) p.textContent = msg;
  }
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  console.error('WebGL init failed:', e);
  showWebGLError('Tu navegador no pudo iniciar WebGL (necesario para el 3D). Actualiza el navegador o prueba desde otro dispositivo.');
  throw e;
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(PIXEL_RATIO);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  showWebGLError('La gráfica se reinició (contexto WebGL perdido). Recarga la página.');
});
renderer.domElement.addEventListener('webglcontextrestored', () => {
  const el = document.getElementById('webgl-error');
  if (el) el.style.display = 'none';
});

const scene = new THREE.Scene();

/* ══════════════════════════════════════════════════════════════
   FONDO: imagen de identidad con recorte tipo CSS "cover".
   Se pre-recorta al aspecto de la ventana y se pinta como
   CanvasTexture -> nunca deforma ni deja el fondo en negro.
   ══════════════════════════════════════════════════════════════ */
const BG_URL = '/models/wallpapers/capa 1,2,3.jpeg';
const bgImage = new Image();
let bgTexture = null;
let coverTimer = null;

function renderCoverBackground() {
  if (!bgImage.naturalWidth) return;
  const iw = bgImage.naturalWidth;
  const ih = bgImage.naturalHeight;
  const vw = Math.max(1, window.innerWidth);
  const vh = Math.max(1, window.innerHeight);
  const imgRatio = iw / ih;
  const viewRatio = vw / vh;

  let sx, sy, sw, sh;
  if (imgRatio > viewRatio) {
    sw = iw;
    sh = Math.round(iw / viewRatio);
    sx = 0;
    sy = Math.round((ih - sh) / 2);
  } else {
    sh = ih;
    sw = Math.round(ih * viewRatio);
    sy = 0;
    sx = Math.round((iw - sw) / 2);
  }

  const canvas = document.createElement('canvas');
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, vw, vh);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (bgTexture) bgTexture.dispose();
  bgTexture = tex;
  scene.background = tex;
}

function scheduleCoverBackground() {
  clearTimeout(coverTimer);
  coverTimer = setTimeout(renderCoverBackground, 180);
}

bgImage.onload = () => {
  renderCoverBackground();
  window.addEventListener('resize', scheduleCoverBackground);
  window.addEventListener('orientationchange', () => setTimeout(scheduleCoverBackground, 250));
};
bgImage.src = BG_URL;

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(7.2, 4.5, 9);

/* ══════════════════════════════════════════════════════════════
   CONTROLES
   ══════════════════════════════════════════════════════════════ */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 45;
controls.target.set(0, 0, 0);
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.85;
controls.enablePan = false;
let isUserInteracting = false;
controls.addEventListener('start', () => { isUserInteracting = true; });
controls.addEventListener('end', () => { isUserInteracting = false; });

/* ══════════════════════════════════════════════════════════════
   ILUMINACION REALISTA (8 luces)
   ══════════════════════════════════════════════════════════════ */
scene.add(new THREE.AmbientLight(0x1a2030, 2.2));
scene.add(new THREE.HemisphereLight(0x4488cc, 0x0a0a15, 1.4));

const keyLight = new THREE.DirectionalLight(0x88bbdd, 3.0);
keyLight.position.set(6, 12, 6);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xddaa66, 1.8);
fillLight.position.set(-6, 5, -4);
scene.add(fillLight);

const backFill = new THREE.DirectionalLight(0x5577aa, 1.2);
backFill.position.set(4, 3, -8);
scene.add(backFill);

const frontFill = new THREE.DirectionalLight(0x99bbcc, 0.9);
frontFill.position.set(0, 4, 10);
scene.add(frontFill);

const studioLight = new THREE.RectAreaLight(0x446688, 2.0, 6, 4);
studioLight.position.set(0, 8, 0);
studioLight.lookAt(0, 0, 0);
scene.add(studioLight);

const crystalLight = new THREE.PointLight(new THREE.Color(CRYSTAL_COLORS.blue.hex), 4.0, 14, 2);
crystalLight.position.set(0, 0, 0);
scene.add(crystalLight);

const emitterGlow = new THREE.PointLight(0x00ffff, 3.0, 10, 2);
emitterGlow.position.set(-2.5, 0, 0);
scene.add(emitterGlow);

const rimLight = new THREE.PointLight(0xaa00ff, 0.6, 18, 2);
rimLight.position.set(0, -2, 3);
scene.add(rimLight);

/* ══════════════════════════════════════════════════════════════
   POST-PROCESSING (Bloom realista)
   ══════════════════════════════════════════════════════════════ */
const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType
});
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), IS_MOBILE ? 1.2 : 2.0, 0.8, 0.4);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ══════════════════════════════════════════════════════════════
   MATERIALES PBR REALISTAS (8 materiales)
   ══════════════════════════════════════════════════════════════ */
const darkChrome = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, metalness: 0.99, roughness: 0.03, clearcoat: 1.0, clearcoatRoughness: 0.05 });
const brushedSteel = new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.95, roughness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.1 });
const anodizedMetal = new THREE.MeshPhysicalMaterial({ color: 0x444444, metalness: 0.88, roughness: 0.18, clearcoat: 0.3 });
const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.75, roughness: 0.45 });
const accentMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.92, roughness: 0.05, clearcoat: 0.8 });
const housingMat = new THREE.MeshPhysicalMaterial({ color: 0x666666, metalness: 0.90, roughness: 0.1, clearcoat: 0.6 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.2, side: THREE.DoubleSide });

/* ══════════════════════════════════════════════════════════════
   GRUPOS
   ══════════════════════════════════════════════════════════════ */
const emitterGroup = new THREE.Group();
const crystalGroup = new THREE.Group();
const sleeveGroup = new THREE.Group();
const gripGroup = new THREE.Group();

/* ══════════════════════════════════════════════════════════════
    EMITOR CAMPANADO (bell-shaped emitter, 25+ piezas)
    ══════════════════════════════════════════════════════════════ */
// Base bell - cono truncado grande (campana)
const emBell = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 1.0, 1.2, 48),
  darkChrome.clone()
);
emBell.rotation.z = Math.PI / 2;
emitterGroup.add(emBell);

// Campana inferior - aro de refuerzo
const emBellBaseRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.0, 0.06, 16, 64),
  anodizedMetal.clone()
);
emBellBaseRing.rotation.y = Math.PI / 2;
emBellBaseRing.position.x = 0.6;
emitterGroup.add(emBellBaseRing);

// Aro de transicion
const emTransitionRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.85, 0.04, 12, 48),
  brushedSteel.clone()
);
emTransitionRing.rotation.y = Math.PI / 2;
emTransitionRing.position.x = 0.2;
emitterGroup.add(emTransitionRing);

// Cuerpo emisor - cilindro de conexion
const emBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.4, 0.7, 0.8, 48),
  darkChrome.clone()
);
emBody.rotation.z = Math.PI / 2;
emBody.position.x = -0.1;
emitterGroup.add(emBody);

// Ranuras de ventilacion - 16 placas finas en espiral
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * Math.PI * 2;
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.005, 0.025),
    accentMat.clone()
  );
  const yPos = Math.cos(angle) * 0.85;
  const zPos = Math.sin(angle) * 0.85;
  fin.position.set(0.15, yPos, zPos);
  fin.rotation.y = -angle;
  fin.rotation.x = angle * 0.3;
  emitterGroup.add(fin);
}

// Anillo superior - aro de acoplamiento
const emUpperRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.65, 0.04, 12, 48),
  anodizedMetal.clone()
);
emUpperRing.rotation.y = Math.PI / 2;
emUpperRing.position.x = -0.35;
emitterGroup.add(emUpperRing);

// Detalle anillo medio
const emMidRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.5, 0.025, 10, 48),
  brushedSteel.clone()
);
emMidRing.rotation.y = Math.PI / 2;
emMidRing.position.x = -0.5;
emitterGroup.add(emMidRing);

// Socket del cristal
const emSocket = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.5, 0.4, 48),
  housingMat.clone()
);
emSocket.rotation.z = Math.PI / 2;
emSocket.position.x = -0.7;
emitterGroup.add(emSocket);

// Anillo del socket
const emSocketRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.52, 0.03, 10, 48),
  accentMat.clone()
);
emSocketRing.rotation.y = Math.PI / 2;
emSocketRing.position.x = -0.52;
emitterGroup.add(emSocketRing);

// Detalle anillo superior
const emTopDetailRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.35, 0.015, 8, 48),
  accentMat.clone()
);
emTopDetailRing.rotation.y = Math.PI / 2;
emTopDetailRing.position.x = -0.85;
emitterGroup.add(emTopDetailRing);

// Punta del emisor - cono estrecho
const emTip = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.3, 0.3, 32),
  accentMat.clone()
);
emTip.rotation.z = Math.PI / 2;
emTip.position.x = -0.95;
emitterGroup.add(emTip);

// Emitter glow - luz desde el socket
const emGlow = new THREE.PointLight(0x00ffff, 4.0, 8, 2);
emGlow.position.set(-0.4, 0, 0);
emitterGroup.add(emGlow);

/* ══════════════════════════════════════════════════════════════
   CRYSTAL HOUSING REALISTA (10+ piezas)
   ══════════════════════════════════════════════════════════════ */
// Housing body
const housingBody = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.82, 0.6, 48), housingMat.clone());
housingBody.rotation.z = Math.PI / 2;
crystalGroup.add(housingBody);

// Housing top ring
const housingTopRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.025, 12, 48), darkChrome.clone());
housingTopRing.rotation.y = Math.PI / 2;
housingTopRing.position.x = 0.3;
crystalGroup.add(housingTopRing);

// Housing bottom ring
const housingBotRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.025, 12, 48), darkChrome.clone());
housingBotRing.rotation.y = Math.PI / 2;
housingBotRing.position.x = -0.3;
crystalGroup.add(housingBotRing);

// Window
const housingWindow = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.42, 48, 1, true), windowMat.clone());
housingWindow.rotation.z = Math.PI / 2;
crystalGroup.add(housingWindow);

// Window frame rings
const winFrame1 = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.012, 10, 48), accentMat.clone());
winFrame1.rotation.y = Math.PI / 2;
winFrame1.position.x = 0.22;
crystalGroup.add(winFrame1);

const winFrame2 = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.012, 10, 48), accentMat.clone());
winFrame2.rotation.y = Math.PI / 2;
winFrame2.position.x = -0.22;
crystalGroup.add(winFrame2);

// Internal ring
const housingInternal = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.01, 8, 48), accentMat.clone());
housingInternal.rotation.y = Math.PI / 2;
crystalGroup.add(housingInternal);

// Crystal
const crystalColor = CRYSTAL_COLORS[currentCrystal];
let crystalMat;
if (currentCrystal === 'white') {
  crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 15.0,
    metalness: 0.0,
    roughness: 0.15
  });
} else {
  crystalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(crystalColor.hex),
    emissive: new THREE.Color(crystalColor.hex),
    emissiveIntensity: 5.0,
    metalness: 0.1,
    roughness: 0.02,
    transmission: 0.2,
    thickness: 1.5,
    transparent: true,
    opacity: 0.95,
    ior: 2.0
  });
}
const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), crystalMat);
crystalMesh.scale.set(1, 1.8, 1);
crystalMesh.position.x = -0.8;
crystalGroup.add(crystalMesh);

const innerCrystal = new THREE.Mesh(
  new THREE.TetrahedronGeometry(0.3, 0),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(crystalColor.hex),
    emissive: new THREE.Color(crystalColor.hex),
    emissiveIntensity: currentCrystal === 'white' ? 20.0 : 8.0,
    metalness: 0.0,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6
  })
);
innerCrystal.scale.set(1, 1.5, 1);
innerCrystal.position.x = -0.8;
crystalGroup.add(innerCrystal);

const crystalGlowRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.65, 0.015, 8, 48),
  new THREE.MeshStandardMaterial({ color: new THREE.Color(crystalColor.hex), emissive: new THREE.Color(crystalColor.hex), emissiveIntensity: 6.0, transparent: true, opacity: 0.7 })
);
crystalGlowRing.rotation.y = Math.PI / 2;
crystalGlowRing.position.x = -0.8;
crystalGroup.add(crystalGlowRing);

const orbitRing1 = new THREE.Mesh(
  new THREE.TorusGeometry(0.72, 0.008, 8, 48),
  new THREE.MeshStandardMaterial({ color: new THREE.Color(crystalColor.hex), emissive: new THREE.Color(crystalColor.hex), emissiveIntensity: 3.0, transparent: true, opacity: 0.4 })
);
orbitRing1.rotation.x = Math.PI / 3;
orbitRing1.position.x = -0.8;
crystalGroup.add(orbitRing1);

const orbitRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.72, 0.008, 8, 48),
  new THREE.MeshStandardMaterial({ color: new THREE.Color(crystalColor.hex), emissive: new THREE.Color(crystalColor.hex), emissiveIntensity: 3.0, transparent: true, opacity: 0.4 })
);
orbitRing2.rotation.x = -Math.PI / 3;
orbitRing2.position.x = -0.8;
crystalGroup.add(orbitRing2);

crystalGroup.add(crystalLight);

/* ══════════════════════════════════════════════════════════════
   SLEEVE REALISTA (16+ piezas)
   ══════════════════════════════════════════════════════════════ */
const sleeveHilt = HILT_SLEEVES[currentSleeve];
const sleeveMat = new THREE.MeshStandardMaterial({
  color: sleeveHilt.color, metalness: sleeveHilt.metalness, roughness: sleeveHilt.roughness
});

// Main body
const sleeveBody = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.7, 8.5, 48), sleeveMat.clone());
sleeveBody.rotation.z = Math.PI / 2;
sleeveGroup.add(sleeveBody);

// Top collar
const sleeveTopCollar = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.04, 12, 48), darkChrome.clone());
sleeveTopCollar.rotation.y = Math.PI / 2;
sleeveTopCollar.position.x = 3.95;
sleeveGroup.add(sleeveTopCollar);

// Bottom collar
const sleeveBotCollar = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.03, 12, 48), darkChrome.clone());
sleeveBotCollar.rotation.y = Math.PI / 2;
sleeveBotCollar.position.x = -3.95;
sleeveGroup.add(sleeveBotCollar);

// 10 grip rings
for (let i = 0; i < 10; i++) {
  const t = i / 9;
  const radius = 0.9 - t * 0.17;
  const gripRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.02, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.35 })
  );
  gripRing.rotation.y = Math.PI / 2;
  gripRing.position.x = -3.5 + i * 0.78;
  sleeveGroup.add(gripRing);
}

// Side panels
const sidePanel1 = new THREE.Mesh(
  new THREE.BoxGeometry(3.2, 0.015, 0.22),
  accentMat.clone()
);
sidePanel1.position.set(0, 0.88, 0);
sleeveGroup.add(sidePanel1);

const sidePanel2 = sidePanel1.clone();
sidePanel2.position.set(0, -0.88, 0);
sleeveGroup.add(sidePanel2);

// Detail strips
for (let i = 0; i < 4; i++) {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.01, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0f0f0f, metalness: 0.85, roughness: 0.2 })
  );
  strip.position.set(-1.5 + i * 1.0, 0, 0.92);
  sleeveGroup.add(strip);
}

// Accent ring
const sleeveAccent = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.008, 8, 48), anodizedMetal.clone());
sleeveAccent.rotation.y = Math.PI / 2;
sleeveAccent.position.x = 0;
sleeveGroup.add(sleeveAccent);

const sleeveMeshes = [sleeveBody];

/* ══════════════════════════════════════════════════════════════
GRIP DETALLADO (helical grooves + control box + pommel)
     ══════════════════════════════════════════════════════════════ */
  // Connector
  const gripConn = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.5, 48), darkChrome.clone());
  gripConn.rotation.z = Math.PI / 2;
  gripConn.position.x = 1.5;
  gripGroup.add(gripConn);

  // Grip base principal
  const gripBase = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 3.0, 48), gripMat.clone());
  gripBase.rotation.z = Math.PI / 2;
  gripGroup.add(gripBase);

  // Ranuras helicoidales de agarre (8 espirales)
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    const gripAngle = t * Math.PI * 6;
    const grooveLen = 2.2;
    const groove = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.025, grooveLen),
      accentMat.clone()
    );
    const x = -1.2 + t * 2.4;
    const y = Math.cos(gripAngle) * 0.55;
    const z = Math.sin(gripAngle) * 0.55;
    groove.position.set(x, y, z);
    groove.rotation.y = -gripAngle;
    groove.rotation.x = 0.15;
    gripGroup.add(groove);
  }

  // Anillo de transicion grip-emisor
  const gripEmRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.03, 12, 48),
    anodizedMetal.clone()
  );
  gripEmRing.rotation.y = Math.PI / 2;
  gripEmRing.position.x = -1.0;
  gripGroup.add(gripEmRing);

  // Anillo de transicion grip-pommel
  const gripPommelRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.035, 12, 48),
    brushedSteel.clone()
  );
  gripPommelRing.rotation.y = Math.PI / 2;
  gripPommelRing.position.x = 0.8;
  gripGroup.add(gripPommelRing);

  // Caja de control lateral
  const controlBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.5, 0.25),
    darkChrome.clone()
  );
  controlBox.position.set(0.3, 0.4, 0.85);
  controlBox.rotation.y = Math.PI / 4;
  gripGroup.add(controlBox);

  // Boton de control
  const controlButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
    accentMat.clone()
  );
  controlButton.position.set(0.55, 0.5, 0.92);
  controlButton.rotation.y = Math.PI / 4;
  controlButton.rotation.z = Math.PI / 2;
  gripGroup.add(controlButton);

  // Detalle caja - panel
  const controlPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.4, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.6 })
  );
  controlPanel.position.set(0.3, 0.4, 0.98);
  gripGroup.add(controlPanel);

  // Pomo inferior - esfera pesada
  const pommelBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 32),
    darkChrome.clone()
  );
  pommelBody.scale.set(1, 0.7, 1);
  pommelBody.position.set(-1.8, 0, 0);
  gripGroup.add(pommelBody);

  // Anillo de anclaje del pomo
  const pommelAnchor = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.05, 12, 48),
    brushedSteel.clone()
  );
  pommelAnchor.rotation.y = Math.PI / 2;
  pommelAnchor.position.set(-1.35, 0, 0);
  gripGroup.add(pommelAnchor);

  // Tapa del pomo
  const pommelCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.55, 0.3, 32),
    accentMat.clone()
  );
  pommelCap.rotation.z = Math.PI / 2;
  pommelCap.position.set(-2.1, 0, 0);
  gripGroup.add(pommelCap);

  // Detalle pomo - linea decorativa
  const pommelDetail = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.02, 8, 32),
    anodizedMetal.clone()
  );
  pommelDetail.rotation.y = Math.PI / 2;
  pommelDetail.position.set(-1.8, 0, 0);
  gripGroup.add(pommelDetail);

  const gripMeshes = [gripBase, gripConn, controlBox];

  /* ══════════════════════════════════════════════════════════════
     BLADE (hidden) - REALISMO EXTREMO
     ══════════════════════════════════════════════════════════════ */
const bladeColor = new THREE.Color(crystalColor.hex);

// Blade principal - pivote en base
const bladeGeo = new THREE.CylinderGeometry(0.72, 0.48, 18.0, 24);
bladeGeo.translate(0, 12.8, 0);
const bladeMesh = new THREE.Mesh(
  bladeGeo,
  new THREE.MeshPhysicalMaterial({
    color: bladeColor, emissive: bladeColor,
    emissiveIntensity: 9.0, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
    roughness: 0.05, metalness: 0.1,
    depthWrite: true, depthTest: true,
    transmission: 0.3, thickness: 2.0
  })
);
bladeMesh.rotation.z = Math.PI / 2;
bladeMesh.scale.set(1, 0, 1);
bladeMesh.position.x = 0.0;
emitterGroup.add(bladeMesh);

// Blade glow - pivote en base
const glowGeo = new THREE.CylinderGeometry(1.2, 0.9, 18.0, 24);
glowGeo.translate(0, 12.8, 0);
const bladeGlow = new THREE.Mesh(
  glowGeo,
  new THREE.MeshBasicMaterial({
    color: bladeColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
    depthWrite: true, depthTest: true
  })
);
bladeGlow.rotation.z = Math.PI / 2;
bladeGlow.scale.set(1, 0, 1);
bladeGlow.position.x = 0.0;
emitterGroup.add(bladeGlow);

// Blade core - pivote en base
const coreGeo = new THREE.CylinderGeometry(0.18, 0.12, 18.0, 12);
coreGeo.translate(0, 12.8, 0);
const bladeCore = new THREE.Mesh(
  coreGeo,
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: true, depthTest: true })
);
bladeCore.rotation.z = Math.PI / 2;
bladeCore.scale.set(1, 0, 1);
bladeCore.position.x = 0.0;
emitterGroup.add(bladeCore);

// Blade PointLight - iluminación real
const bladeLight = new THREE.PointLight(bladeColor, 12.0, 25, 2);
bladeLight.position.x = -20.0;
emitterGroup.add(bladeLight);

// Función para cambiar estilo de hoja
function setBladeStyle(colorKey) {
  const c = new THREE.Color(CRYSTAL_COLORS[colorKey].hex);

  bladeMesh.geometry.dispose();
  const newBladeGeo = new THREE.CylinderGeometry(0.72, 0.48, 18.0, 24);
  newBladeGeo.translate(0, 12.8, 0);
  bladeMesh.geometry = newBladeGeo;
  bladeMesh.material.color.copy(c);
  bladeMesh.material.emissive.copy(c);
  bladeMesh.material.emissiveIntensity = 9.0;
  bladeMesh.material.roughness = 0.05;
  bladeMesh.material.metalness = 0.1;
  bladeMesh.material.depthWrite = true;
  bladeMesh.material.depthTest = true;
  bladeMesh.material.needsUpdate = true;

  bladeGlow.geometry.dispose();
  const newGlowGeo = new THREE.CylinderGeometry(1.2, 0.9, 18.0, 24);
  newGlowGeo.translate(0, 12.8, 0);
  bladeGlow.geometry = newGlowGeo;
  bladeGlow.material.color.copy(c);
  bladeGlow.material.opacity = 0.25;

  bladeCore.geometry.dispose();
  const newCoreGeo = new THREE.CylinderGeometry(0.18, 0.12, 18.0, 12);
  newCoreGeo.translate(0, 12.8, 0);
  bladeCore.geometry = newCoreGeo;
  bladeCore.material.color.set(0xffffff);
  bladeCore.material.opacity = 0.9;

  bladeLight.color.copy(c);
  bladeLight.intensity = 12.0;

  innerCrystal.material.color.copy(c);
  innerCrystal.material.emissive.copy(c);
  innerCrystal.material.emissiveIntensity = colorKey === 'white' ? 20.0 : 8.0;
  innerCrystal.material.opacity = 0.6;

  crystalGlowRing.material.color.copy(c);
  crystalGlowRing.material.emissive.copy(c);
  crystalGlowRing.material.emissiveIntensity = colorKey === 'white' ? 15.0 : 6.0;

  orbitRing1.material.color.copy(c);
  orbitRing1.material.emissive.copy(c);
  orbitRing1.material.emissiveIntensity = colorKey === 'white' ? 12.0 : 3.0;

  orbitRing2.material.color.copy(c);
  orbitRing2.material.emissive.copy(c);
  orbitRing2.material.emissiveIntensity = colorKey === 'white' ? 12.0 : 3.0;
}

/* ══════════════════════════════════════════════════════════════
    PARTICLES
    ══════════════════════════════════════════════════════════════ */
const particleCount = 200;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  particlePositions[i * 3] = (Math.random() - 0.5) * 10;
  particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  particleSizes[i] = Math.random() * 2 + 0.5;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
const particleMat = new THREE.PointsMaterial({
  color: 0x00ffff,
  size: 0.03,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);
const energyRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.01, 12, 64),
  new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2.5, transparent: true, opacity: 0, side: THREE.DoubleSide })
);
energyRing.rotation.y = Math.PI / 2;
emitterGroup.add(energyRing);

const energyRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.008, 10, 48),
  new THREE.MeshStandardMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 2.0, transparent: true, opacity: 0, side: THREE.DoubleSide })
);
energyRing2.rotation.y = Math.PI / 2;
emitterGroup.add(energyRing2);

/* ══════════════════════════════════════════════════════════════
   ADD TO SCENE + EXPLODED POSITIONS (cristal separado)
   ══════════════════════════════════════════════════════════════ */
const saberGroup = new THREE.Group();
saberGroup.add(emitterGroup);
saberGroup.add(crystalGroup);
saberGroup.add(sleeveGroup);
saberGroup.add(gripGroup);
saberGroup.position.y = 0;
scene.add(saberGroup);

const EXPLODED = {
  emitter: new THREE.Vector3(-6.0, 0, 0),
  crystal: new THREE.Vector3(-2.5, 0, 0),
  sleeve:  new THREE.Vector3(4.0, 0, 0),
  grip:    new THREE.Vector3(7.0, 0, 0)
};
const ASSEMBLED = {
  emitter: new THREE.Vector3(0, 0, 0),
  crystal: new THREE.Vector3(0.4, 0, 0),
  sleeve:  new THREE.Vector3(0, 0, 0),
  grip:    new THREE.Vector3(0, 0, 0)
};

emitterGroup.position.copy(EXPLODED.emitter);
crystalGroup.position.copy(EXPLODED.crystal);
sleeveGroup.position.copy(EXPLODED.sleeve);
gripGroup.position.copy(EXPLODED.grip);

let bladeTarget = 0, bladeScale = 0;

/* ══════════════════════════════════════════════════════════════
   UI HANDLERS
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('[data-sleeve]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (animator.isAnimating) return;
    currentSleeve = btn.dataset.sleeve;
    document.querySelectorAll('[data-sleeve]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const s = HILT_SLEEVES[currentSleeve];
    sleeveMeshes[0].material.color.set(s.color);
    sleeveMeshes[0].material.metalness = s.metalness;
    sleeveMeshes[0].material.roughness = s.roughness;
    sleeveMeshes[0].material.needsUpdate = true;
    saveConfig();
  });
});

document.querySelectorAll('[data-crystal]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (animator.isAnimating) return;
    currentCrystal = btn.dataset.crystal;
    document.querySelectorAll('[data-crystal]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const c = new THREE.Color(CRYSTAL_COLORS[currentCrystal].hex);
    crystalMesh.material.color.copy(c);
    crystalMesh.material.emissive.copy(c);
    crystalLight.color.copy(c);
    if (bladeActive) {
      setBladeStyle(currentCrystal);
    }
    saveConfig();
  });
});

/* ══════════════════════════════════════════════════════════════
   ASSEMBLE / DISASSEMBLE
   ══════════════════════════════════════════════════════════════ */
document.getElementById('btn-power').addEventListener('click', () => {
  if (animator.isAnimating) return;
  const label = document.getElementById('power-label');
  const btn = document.getElementById('btn-power');
  const status = document.getElementById('config-status');
  const completeBtn = document.getElementById('btn-complete-order');

  if (!isAssembled) {
    label.textContent = 'ENSAMBLANDO...';
    btn.style.pointerEvents = 'none';
    const dur = 1800;
    animator.tween(emitterGroup.position, { x: ASSEMBLED.emitter.x }, dur, 'easeInOutCubic');
    animator.tween(crystalGroup.position, { x: ASSEMBLED.crystal.x }, dur, 'easeInOutCubic');
    animator.tween(sleeveGroup.position, { x: ASSEMBLED.sleeve.x }, dur, 'easeInOutCubic');
    animator.tween(gripGroup.position, { x: ASSEMBLED.grip.x }, dur, 'easeInOutCubic', () => {
      isAssembled = true;
      bladeActive = true;
      bladeTarget = 1;
      setBladeStyle(currentCrystal);
      bloomPass.strength = 2.2;
      crystalLight.intensity = 6.0;
      emitterGlow.intensity = 5.0;
      energyRing.material.opacity = 0.5;
      energyRing2.material.opacity = 0.3;
      label.textContent = 'DESARMAR / EDITAR';
      btn.style.pointerEvents = 'auto';
      status.innerHTML = '<p class="text-[0.65rem] text-gray-400 tracking-widest">KYBER CORE ACTIVE.</p><p class="text-[0.65rem] text-neon-cyan tracking-widest">' + CRYSTAL_COLORS[currentCrystal].hex.toUpperCase() + ' HARMONY.</p>';
      completeBtn.style.display = 'inline-block';
      // Sonido del sable de luz
      saberSound.currentTime = 0;
      saberSound.play().catch(() => {});
    });
  } else {
    bladeActive = false;
    bladeTarget = 0;
    bloomPass.strength = 1.6;
    crystalLight.intensity = 4.0;
    emitterGlow.intensity = 3.0;
    energyRing.material.opacity = 0;
    energyRing2.material.opacity = 0;
    completeBtn.style.display = 'none';
    const dur = 1400;
    animator.tween(emitterGroup.position, { x: EXPLODED.emitter.x }, dur, 'easeInOutCubic');
    animator.tween(crystalGroup.position, { x: EXPLODED.crystal.x }, dur, 'easeInOutCubic');
    animator.tween(sleeveGroup.position, { x: EXPLODED.sleeve.x }, dur, 'easeInOutCubic');
    animator.tween(gripGroup.position, { x: EXPLODED.grip.x }, dur, 'easeInOutCubic', () => {
      isAssembled = false;
      label.textContent = 'FINISH & ENSAMBLAR';
      status.innerHTML = '<p class="text-[0.65rem] text-gray-400 tracking-widest">COMPONENTS DETONATED.</p><p class="text-[0.65rem] text-neon-cyan tracking-widest">SELECT MATERIALS & CRYSTAL.</p>';
    });
  }
});

/* ══════════════════════════════════════════════════════════════
   ANIMATE
   ══════════════════════════════════════════════════════════════ */
function animate() {
  requestAnimationFrame(animate);
  animator.update(16);
  const t = performance.now() * 0.001;

  // Floating
  const floatY = Math.sin(t * 0.7) * 0.03;
  if (!animator.isAnimating) {
    if (isAssembled) {
      saberGroup.position.y = floatY;
    } else {
      emitterGroup.position.y = floatY;
      crystalGroup.position.y = floatY;
      sleeveGroup.position.y = floatY;
      gripGroup.position.y = floatY;
    }
  }

  // Crystal effects
  crystalMesh.material.emissiveIntensity = 1.5 + Math.sin(t * 2.5) * 0.5;
  crystalMesh.rotation.y = t * 0.4;

  // Crystal light pulsing
  if (!isAssembled) {
    crystalLight.intensity = 4.0;
  } else {
    crystalLight.intensity = 6.0;
  }

  // Blade animation
  const diff = bladeTarget - bladeScale;
  if (Math.abs(diff) > 0.001) {
    bladeScale += diff * 0.05;
    const s = Math.max(0, bladeScale);
    bladeMesh.scale.set(s, 1, s);
    bladeGlow.scale.set(s, 1, s);
    bladeCore.scale.set(s, 1, s);
    if (bladeScale > 0.99 && bladeTarget === 1) {
      bladeScale = 1;
      bladeMesh.scale.set(1, 1, 1);
      bladeGlow.scale.set(1, 1, 1);
      bladeCore.scale.set(1, 1, 1);
    }
  }

  // Blade hum
  if (bladeActive && bladeScale > 0.99) {
    const s = Math.sin(t * 7) * 0.012 + 1;
    bladeMesh.scale.y = s;
    bladeGlow.scale.y = s;
    bladeCore.scale.y = s;
  }

  // Energy rings
  if (bladeActive) {
    energyRing.rotation.x = -t * 0.8;
    energyRing.material.opacity = 0.3 + Math.sin(t * 2.0) * 0.12;
    energyRing2.rotation.x = t * 0.6;
    energyRing2.material.opacity = 0.18 + Math.sin(t * 3.0) * 0.08;
  }

  // Emitter glow pulsing
  emitterGlow.intensity = isAssembled ? 5.0 + Math.sin(t * 2) * 0.8 : 3.0;

  // Particles rotation
  particles.rotation.y += 0.001;
  particles.rotation.x += 0.0005;

  // Auto rotate
  if (!isUserInteracting && !animator.isAnimating) {
    if (isAssembled) {
      saberGroup.rotation.y = Math.sin(t * 0.25) * 0.12;
    } else {
      const rot = Math.sin(t * 0.25) * 0.08;
      emitterGroup.rotation.y = rot;
      crystalGroup.rotation.y = rot;
      sleeveGroup.rotation.y = rot;
      gripGroup.rotation.y = rot;
    }
  }

  controls.update();
  composer.render();
}
animate();

/* ══════════════════════════════════════════════════════════════
   RESIZE
   ══════════════════════════════════════════════════════════════ */
function resize() {
  const pr = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1 : 2);
  renderer.setPixelRatio(pr);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

if (IS_MOBILE) {
  const hint = document.getElementById('drag-hint-text');
  if (hint) hint.textContent = 'ARRASTRA PARA ROTAR • PINZA PARA ACERCAR';
}

/* --------------------------------------------------------------
   ORDER: Save config to localStorage before navigating
   -------------------------------------------------------------- */
document.getElementById('btn-complete-order').addEventListener('click', () => {
  saveConfig();
});

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

// Sonido del sable de luz
const saberSound = new Audio('/Sonido sable/light-saber.mp3');

/* ══════════════════════════════════════════════════════════════
   RENDERER + SCENE + CAMERA
   ══════════════════════════════════════════════════════════════ */
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
new THREE.TextureLoader().load('/wallpapers/capa 1,2,3.jpeg', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
});

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(4, 2, 8);

/* ══════════════════════════════════════════════════════════════
   CONTROLES
   ══════════════════════════════════════════════════════════════ */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 25;
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
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.6, 0.7, 0.6);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ══════════════════════════════════════════════════════════════
   MATERIALES PBR REALISTAS (8 materiales)
   ══════════════════════════════════════════════════════════════ */
const darkChrome = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.99, roughness: 0.05 });
const brushedSteel = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.95, roughness: 0.18 });
const anodizedMetal = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.88, roughness: 0.22 });
const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.75, roughness: 0.45 });
const accentMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.92, roughness: 0.08 });
const housingMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.90, roughness: 0.12 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, metalness: 0.4, roughness: 0.1, transparent: true, opacity: 0.2, side: THREE.DoubleSide });

/* ══════════════════════════════════════════════════════════════
   GRUPOS
   ══════════════════════════════════════════════════════════════ */
const emitterGroup = new THREE.Group();
const crystalGroup = new THREE.Group();
const sleeveGroup = new THREE.Group();
const gripGroup = new THREE.Group();

/* ══════════════════════════════════════════════════════════════
   EMITTER REALISTA (18+ piezas)
   ══════════════════════════════════════════════════════════════ */
// Outer ring
const emOuterRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 16, 64), darkChrome.clone());
emOuterRing.rotation.y = Math.PI / 2;
emitterGroup.add(emOuterRing);

// Base cone
const emBaseCone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.68, 0.4, 48), darkChrome.clone());
emBaseCone.rotation.z = Math.PI / 2;
emitterGroup.add(emBaseCone);

// Inner cone
const emInnerCone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.35, 48), brushedSteel.clone());
emInnerCone.rotation.z = Math.PI / 2;
emInnerCone.position.x = 0.18;
emitterGroup.add(emInnerCone);

// Top cap
const emTopCap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.25, 48), anodizedMetal.clone());
emTopCap.rotation.z = Math.PI / 2;
emTopCap.position.x = 0.42;
emitterGroup.add(emTopCap);

// Emitter tip
const emTip = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.15, 48), accentMat.clone());
emTip.rotation.z = Math.PI / 2;
emTip.position.x = 0.58;
emitterGroup.add(emTip);

// Glow ring
const emGlowRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.5, 0.02, 12, 64),
  new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 5.0, transparent: true, opacity: 0.95 })
);
emGlowRing.rotation.y = Math.PI / 2;
emitterGroup.add(emGlowRing);

// Inner glow ring
const emInnerGlow = new THREE.Mesh(
  new THREE.TorusGeometry(0.35, 0.015, 12, 48),
  new THREE.MeshStandardMaterial({ color: 0x00eeff, emissive: 0x00eeff, emissiveIntensity: 4.0, transparent: true, opacity: 0.8 })
);
emInnerGlow.rotation.y = Math.PI / 2;
emInnerGlow.position.x = 0.18;
emitterGroup.add(emInnerGlow);

// 12 ventilation fins
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.006, 0.035),
    accentMat.clone()
  );
  fin.position.set(0.08, Math.cos(angle) * 0.55, Math.sin(angle) * 0.55);
  fin.rotation.x = angle;
  emitterGroup.add(fin);
}

// Detail ring 1
const emDetailRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 10, 48), anodizedMetal.clone());
emDetailRing1.rotation.y = Math.PI / 2;
emDetailRing1.position.x = -0.1;
emitterGroup.add(emDetailRing1);

// Detail ring 2
const emDetailRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.015, 10, 48), anodizedMetal.clone());
emDetailRing2.rotation.y = Math.PI / 2;
emDetailRing2.position.x = -0.18;
emitterGroup.add(emDetailRing2);

// Socket ring
const emSocketRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 10, 48), darkChrome.clone());
emSocketRing.rotation.y = Math.PI / 2;
emSocketRing.position.x = -0.22;
emitterGroup.add(emSocketRing);

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
const crystalMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.48, 0),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(crystalColor.hex),
    emissive: new THREE.Color(crystalColor.hex),
    emissiveIntensity: 4.0,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.95
  })
);
crystalMesh.scale.set(1, 1.5, 1);
crystalMesh.position.x = -0.8;
crystalGroup.add(crystalMesh);

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
   GRIP REALISTA (12+ piezas)
   ══════════════════════════════════════════════════════════════ */
// Connector
const gripConn = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, 0.4, 48), darkChrome.clone());
gripConn.rotation.z = Math.PI / 2;
gripConn.position.x = 1.5;
gripGroup.add(gripConn);

// Grip base
const gripBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 2.8, 48), gripMat.clone());
gripBase.rotation.z = Math.PI / 2;
gripGroup.add(gripBase);

// 6 grip rings
for (let i = 0; i < 6; i++) {
  const r = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.035, 10, 48),
    anodizedMetal.clone()
  );
  r.rotation.y = Math.PI / 2;
  r.position.x = -1.3 + i * 0.52;
  gripGroup.add(r);
}

// 4 detail bands
for (let i = 0; i < 4; i++) {
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.01, 8, 48),
    accentMat.clone()
  );
  band.rotation.y = Math.PI / 2;
  band.position.x = -0.78 + i * 0.52;
  gripGroup.add(band);
}

// Pommel cone
const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.98, 0.55, 48), darkChrome.clone());
pommel.rotation.z = Math.PI / 2;
pommel.position.x = -1.6;
gripGroup.add(pommel);

// Pommel ring
const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 12, 48), brushedSteel.clone());
pommelRing.rotation.y = Math.PI / 2;
pommelRing.position.x = -1.6;
gripGroup.add(pommelRing);

// Pommel cap
const pommelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.82, 0.18, 48), accentMat.clone());
pommelCap.rotation.z = Math.PI / 2;
pommelCap.position.x = -1.92;
gripGroup.add(pommelCap);

/* ══════════════════════════════════════════════════════════════
   BLADE (hidden) - REALISMO EXTREMO
   ══════════════════════════════════════════════════════════════ */
const bladeColor = new THREE.Color(crystalColor.hex);

// Blade principal - pivote en base
const bladeGeo = new THREE.CylinderGeometry(0.72, 0.48, 15.0, 24);
bladeGeo.translate(0, 11.8, 0);
const bladeMesh = new THREE.Mesh(
  bladeGeo,
  new THREE.MeshStandardMaterial({
    color: bladeColor, emissive: bladeColor,
    emissiveIntensity: 8.0, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
    roughness: 0.1, metalness: 0.0,
    depthWrite: true, depthTest: true
  })
);
bladeMesh.rotation.z = Math.PI / 2;
bladeMesh.scale.set(1, 0, 1);
bladeMesh.position.x = 0.0;
emitterGroup.add(bladeMesh);

// Blade glow - pivote en base
const glowGeo = new THREE.CylinderGeometry(1.2, 0.9, 15.0, 24);
glowGeo.translate(0, 11.8, 0);
const bladeGlow = new THREE.Mesh(
  glowGeo,
  new THREE.MeshBasicMaterial({
    color: bladeColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    depthWrite: true, depthTest: true
  })
);
bladeGlow.rotation.z = Math.PI / 2;
bladeGlow.scale.set(1, 0, 1);
bladeGlow.position.x = 0.0;
emitterGroup.add(bladeGlow);

// Blade core - pivote en base
const coreGeo = new THREE.CylinderGeometry(0.18, 0.12, 15.0, 12);
coreGeo.translate(0, 11.8, 0);
const bladeCore = new THREE.Mesh(
  coreGeo,
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: true, depthTest: true })
);
bladeCore.rotation.z = Math.PI / 2;
bladeCore.scale.set(1, 0, 1);
bladeCore.position.x = 0.0;
emitterGroup.add(bladeCore);

// Blade PointLight - iluminación real
const bladeLight = new THREE.PointLight(bladeColor, 10.0, 20, 2);
bladeLight.position.x = -15.0;
emitterGroup.add(bladeLight);

// Función para cambiar estilo de hoja
function setBladeStyle(colorKey) {
  const c = new THREE.Color(CRYSTAL_COLORS[colorKey].hex);

  // ═══ STANDARD: colores tradicionales con BRILLO ═══
  bladeMesh.geometry.dispose();
  const newBladeGeo = new THREE.CylinderGeometry(0.72, 0.48, 15.0, 24);
  newBladeGeo.translate(0, 11.8, 0);
  bladeMesh.geometry = newBladeGeo;
  bladeMesh.material.color.copy(c);
  bladeMesh.material.emissive.copy(c);
  bladeMesh.material.emissiveIntensity = 8.0;
  bladeMesh.material.roughness = 0.1;
  bladeMesh.material.metalness = 0.0;
  bladeMesh.material.depthWrite = true;
  bladeMesh.material.depthTest = true;
  bladeMesh.material.needsUpdate = true;

  // Glow del color - más visible
  bladeGlow.geometry.dispose();
  const newGlowGeo = new THREE.CylinderGeometry(1.2, 0.9, 15.0, 24);
  newGlowGeo.translate(0, 11.8, 0);
  bladeGlow.geometry = newGlowGeo;
  bladeGlow.material.color.copy(c);
  bladeGlow.material.opacity = 0.3;

  // Core blanco brillante
  bladeCore.geometry.dispose();
  const newCoreGeo = new THREE.CylinderGeometry(0.18, 0.12, 15.0, 12);
  newCoreGeo.translate(0, 11.8, 0);
  bladeCore.geometry = newCoreGeo;
  bladeCore.material.color.set(0xffffff);
  bladeCore.material.opacity = 0.9;

  // Light del color - intenso
  bladeLight.color.copy(c);
  bladeLight.intensity = 10.0;
}

/* ══════════════════════════════════════════════════════════════
   ENERGY EFFECTS
   ══════════════════════════════════════════════════════════════ */
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
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------------------------------------------------
   ORDER: Save config to localStorage before navigating
   -------------------------------------------------------------- */
document.getElementById('btn-complete-order').addEventListener('click', () => {
  localStorage.setItem('kybera_config', JSON.stringify({
    sleeve: currentSleeve,
    crystal: currentCrystal
  }));
});

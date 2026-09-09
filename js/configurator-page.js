/* KYBERA — configurator-page.js (standalone for /configurator route) */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const { TWEEN } = window;

const CRYSTAL_COLORS = {
  blue:   { hex: '#0088ff' },
  green:  { hex: '#00ff66' },
  purple: { hex: '#aa00ff' },
  white:  { hex: '#ffffff' }
};
const HILT_SLEEVES = {
  brushedSteel: { name: 'Brushed Steel', metalness: 0.9, roughness: 0.2, color: 0xaaaaaa },
  darkBronzed:  { name: 'Dark Bronzed',  metalness: 0.8, roughness: 0.35, color: 0x8c5a2b },
  ancientStone: { name: 'Ancient Stone', metalness: 0.1, roughness: 0.9, color: 0x444444 }
};

let currentSleeve = 'brushedSteel';
let currentCrystal = 'blue';
let bladeActive = false;
let isAssembled = false;
let isAnimating = false;

const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b14, 0.008);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(4, 3, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.target.set(0, 1.5, 0);
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI;
controls.enablePan = false;
let isUserInteracting = false;
controls.addEventListener('start', () => { isUserInteracting = true; });
controls.addEventListener('end', () => { isUserInteracting = false; });

// Lights
scene.add(new THREE.AmbientLight(0x334455, 1.8));
scene.add(new THREE.HemisphereLight(0x4488cc, 0x221122, 1.0));
const keyLight = new THREE.DirectionalLight(0x6699cc, 2.0);
keyLight.position.set(5, 10, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xcc8844, 1.2);
fillLight.position.set(-5, 4, -3);
scene.add(fillLight);
const backFill = new THREE.DirectionalLight(0x6688aa, 0.8);
backFill.position.set(3, 2, -6);
scene.add(backFill);
const frontFill = new THREE.DirectionalLight(0xaabbcc, 0.6);
frontFill.position.set(0, 3, 8);
scene.add(frontFill);

const crystalLight = new THREE.PointLight(new THREE.Color(CRYSTAL_COLORS.blue.hex), 1.5, 10, 2);
crystalLight.position.set(0, 1.5, 0);
scene.add(crystalLight);
const emitterLight = new THREE.PointLight(0x00ffff, 0.3, 6, 2);
emitterLight.position.set(-3.5, 1.5, 0);
scene.add(emitterLight);
const rimLight = new THREE.PointLight(0xaa00ff, 0.2, 12, 2);
rimLight.position.set(0, -1, 2);
scene.add(rimLight);

// Floor
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(20, 64),
  new THREE.MeshStandardMaterial({ color: 0x111a24, metalness: 0.7, roughness: 0.4 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
scene.add(floor);

const ringMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.2 });
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.08, 16, 64), ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);
const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.04, 16, 64), ringMat.clone());
outerRing.material.emissiveIntensity = 0.2;
outerRing.rotation.x = -Math.PI / 2;
outerRing.position.y = 0.01;
scene.add(outerRing);

const gridHelper = new THREE.GridHelper(20, 40, 0x0a2a3a, 0x0a1a2a);
gridHelper.position.y = 0.02;
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ── Build saber components (horizontal, exploded) ──
const saberGroup = new THREE.Group();
const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.25 });

// Component groups for exploded state
const emitterGroup = new THREE.Group();
const crystalGroup = new THREE.Group();
const sleeveGroup = new THREE.Group();
const gripGroup = new THREE.Group();

// ── Emitter (leftmost) ──
emitterGroup.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.48, 0.25, 32), metalMat.clone()), { position: new THREE.Vector3(0, 0, 0) }));
const emTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.3, 32), metalMat.clone());
emTop.material.color.set(0x777777); emTop.position.y = 0.28; emitterGroup.add(emTop);
const emRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 }));
emRing.rotation.x = Math.PI / 2; emRing.position.y = 0.42; emitterGroup.add(emRing);

// ── Crystal Housing + Crystal ──
crystalGroup.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.4, 32), metalMat.clone()), { position: new THREE.Vector3(0, 0, 0) }));
const winMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
crystalGroup.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 32, 1, true), winMat), { position: new THREE.Vector3(0, 0, 0) }));

const crystalColor = CRYSTAL_COLORS[currentCrystal];
const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(crystalColor.hex), emissive: new THREE.Color(crystalColor.hex), emissiveIntensity: 2.5, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.9 }));
crystalMesh.scale.set(1, 1.3, 1);
crystalGroup.add(crystalMesh);

// ── Sleeve / Body ──
const sleeveHilt = HILT_SLEEVES[currentSleeve];
const sleeveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 2.0, 32), new THREE.MeshStandardMaterial({ color: sleeveHilt.color, metalness: sleeveHilt.metalness, roughness: sleeveHilt.roughness }));
sleeveGroup.add(sleeveMesh);

const srTop = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.035, 8, 32), metalMat.clone());
srTop.rotation.x = Math.PI / 2; srTop.position.y = 0.9; sleeveGroup.add(srTop);
const srBot = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 8, 32), metalMat.clone());
srBot.rotation.x = Math.PI / 2; srBot.position.y = -0.9; sleeveGroup.add(srBot);

for (let i = 0; i < 8; i++) {
  const g = new THREE.Mesh(new THREE.TorusGeometry(0.58 - (i / 8) * 0.12, 0.012, 6, 32), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 }));
  g.rotation.x = Math.PI / 2; g.position.y = -0.8 + i * 0.22;
  sleeveGroup.add(g);
}

const sleeveMeshes = [sleeveMesh];

// ── Grip + Pommel (rightmost) ──
const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 0.25, 32), metalMat.clone());
conn.position.y = 0.7; gripGroup.add(conn);

const gripBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 1.2, 32), metalMat.clone());
gripBase.material.color.set(0x666666);
gripBase.position.y = 0; gripGroup.add(gripBase);

for (let i = 0; i < 5; i++) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.03, 8, 32), metalMat.clone());
  r.rotation.x = Math.PI / 2;
  r.position.y = -0.5 + i * 0.18;
  gripGroup.add(r);
}

gripGroup.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 32), metalMat.clone()), { position: new THREE.Vector3(0, -0.9, 0) }));
gripGroup.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 32), metalMat.clone()), { position: new THREE.Vector3(0, -0.75, 0), rotation: new THREE.Euler(Math.PI / 2, 0, 0) }));

// ── Blade (hidden, at emitter position) ──
const bladeColor = new THREE.Color(crystalColor.hex);
const bladeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 6.0, 16), new THREE.MeshStandardMaterial({ color: bladeColor, emissive: bladeColor, emissiveIntensity: 3.0, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
bladeMesh.scale.set(1, 0, 1);
emitterGroup.add(bladeMesh);
const bladeGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 6.0, 16), new THREE.MeshBasicMaterial({ color: bladeColor, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
bladeGlow.scale.set(1, 0, 1);
emitterGroup.add(bladeGlow);

// ── Energy rings (hidden, around emitter) ──
const energyRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.015, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2, transparent: true, opacity: 0, side: THREE.DoubleSide }));
energyRing1.rotation.x = Math.PI / 2;
emitterGroup.add(energyRing1);
const energyRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.01, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5, transparent: true, opacity: 0, side: THREE.DoubleSide }));
energyRing2.rotation.x = Math.PI / 2;
emitterGroup.add(energyRing2);

// Add groups to saberGroup
saberGroup.add(emitterGroup);
saberGroup.add(crystalGroup);
saberGroup.add(sleeveGroup);
saberGroup.add(gripGroup);

// Rotate entire saber to horizontal
saberGroup.rotation.z = Math.PI / 2;
saberGroup.position.y = 1.5;
scene.add(saberGroup);

// ── Exploded positions ──
const EXPLODED = {
  emitter:  new THREE.Vector3(-3.5, 1.5, 0),
  crystal:  new THREE.Vector3(-1.2, 1.5, 0),
  sleeve:   new THREE.Vector3(1.2, 1.5, 0),
  grip:     new THREE.Vector3(3.5, 1.5, 0)
};
const ASSEMBLED = {
  emitter:  new THREE.Vector3(0, 1.5, 0),
  crystal:  new THREE.Vector3(0, 1.5, 0),
  sleeve:   new THREE.Vector3(0, 1.5, 0),
  grip:     new THREE.Vector3(0, 1.5, 0)
};

// Set initial exploded state
emitterGroup.position.copy(EXPLODED.emitter);
crystalGroup.position.copy(EXPLODED.crystal);
sleeveGroup.position.copy(EXPLODED.sleeve);
gripGroup.position.copy(EXPLODED.grip);

// Blade position relative to emitter (extends leftward in horizontal)
bladeMesh.position.set(-0.6, 0, 0);
bladeGlow.position.set(-0.6, 0, 0);

let bladeTarget = 0, bladeScale = 0;

// ── UI Events ──
document.querySelectorAll('[data-sleeve]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isAnimating) return;
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
    if (isAnimating) return;
    currentCrystal = btn.dataset.crystal;
    document.querySelectorAll('[data-crystal]').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const c = new THREE.Color(CRYSTAL_COLORS[currentCrystal].hex);
    crystalMesh.material.color.copy(c);
    crystalMesh.material.emissive.copy(c);
    crystalLight.color.copy(c);
    if (bladeActive) {
      bladeMesh.material.color.copy(c);
      bladeMesh.material.emissive.copy(c);
      bladeGlow.material.color.copy(c);
    }
  });
});

// ── Assemble / Disassemble ──
document.getElementById('btn-power').addEventListener('click', () => {
  if (isAnimating) return;

  const label = document.getElementById('power-label');
  const btn = document.getElementById('btn-power');
  const status = document.getElementById('config-status');
  const completeBtn = document.getElementById('btn-complete-order');

  if (!isAssembled) {
    // ASSEMBLE
    isAnimating = true;
    label.textContent = 'ENSAMBLANDO...';
    btn.style.pointerEvents = 'none';

    const duration = 1500;
    const easing = TWEEN.Easing.Quadratic.InOut;

    new TWEEN.Tween(emitterGroup.position)
      .to({ x: ASSEMBLED.emitter.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(crystalGroup.position)
      .to({ x: ASSEMBLED.crystal.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(sleeveGroup.position)
      .to({ x: ASSEMBLED.sleeve.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(gripGroup.position)
      .to({ x: ASSEMBLED.grip.x }, duration)
      .easing(easing)
      .onComplete(() => {
        isAssembled = true;
        isAnimating = false;
        bladeActive = true;
        bladeTarget = 1;

        const c = new THREE.Color(CRYSTAL_COLORS[currentCrystal].hex);
        bladeMesh.material.color.copy(c);
        bladeMesh.material.emissive.copy(c);
        bladeGlow.material.color.copy(c);

        bloomPass.strength = 1.8;
        crystalLight.intensity = 4;
        emitterLight.intensity = 1;

        energyRing1.material.opacity = 0.6;
        energyRing2.material.opacity = 0.4;

        label.textContent = 'DESARMAR / EDITAR';
        btn.style.pointerEvents = 'auto';
        status.innerHTML = `<p class="text-[0.65rem] text-gray-400 tracking-widest">KYBER CORE ACTIVE.</p><p class="text-[0.65rem] text-neon-cyan tracking-widest">${CRYSTAL_COLORS[currentCrystal].hex.toUpperCase()} HARMONY.</p>`;
        completeBtn.style.display = 'inline-block';
      })
      .start();

  } else {
    // DISASSEMBLE
    isAnimating = true;
    bladeActive = false;
    bladeTarget = 0;
    bloomPass.strength = 0.8;
    crystalLight.intensity = 1.5;
    emitterLight.intensity = 0.3;
    energyRing1.material.opacity = 0;
    energyRing2.material.opacity = 0;
    completeBtn.style.display = 'none';

    const duration = 1200;
    const easing = TWEEN.Easing.Quadratic.InOut;

    new TWEEN.Tween(emitterGroup.position)
      .to({ x: EXPLODED.emitter.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(crystalGroup.position)
      .to({ x: EXPLODED.crystal.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(sleeveGroup.position)
      .to({ x: EXPLODED.sleeve.x }, duration)
      .easing(easing)
      .start();

    new TWEEN.Tween(gripGroup.position)
      .to({ x: EXPLODED.grip.x }, duration)
      .easing(easing)
      .onComplete(() => {
        isAssembled = false;
        isAnimating = false;
        label.textContent = 'FINISH & ENSAMBLAR';
        status.innerHTML = `<p class="text-[0.65rem] text-gray-400 tracking-widest">COMPONENTS DETONATED.</p><p class="text-[0.65rem] text-neon-cyan tracking-widest">SELECT MATERIALS & CRYSTAL.</p>`;
      })
      .start();
  }
});

// ── Animate ──
function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();

  const t = performance.now() * 0.001;

  // Idle floating
  const floatY = 1.5 + Math.sin(t * 0.8) * 0.05;
  if (!isAnimating) {
    if (isAssembled) {
      saberGroup.position.y = floatY;
    } else {
      emitterGroup.position.y = floatY;
      crystalGroup.position.y = floatY;
      sleeveGroup.position.y = floatY;
      gripGroup.position.y = floatY;
    }
  }

  // Crystal pulsing
  crystalMesh.material.emissiveIntensity = 2.0 + Math.sin(t * 3) * 0.3 + 1.0;
  crystalMesh.rotation.y = t * 0.5;

  // Blade animation
  const diff = bladeTarget - bladeScale;
  if (Math.abs(diff) > 0.001) {
    bladeScale += diff * 0.06;
    bladeMesh.scale.set(1, Math.max(0, bladeScale), 1);
    bladeGlow.scale.set(1, Math.max(0, bladeScale), 1);
    if (bladeScale > 0.99 && bladeTarget === 1) {
      bladeScale = 1;
      bladeMesh.scale.set(1, 1, 1);
      bladeGlow.scale.set(1, 1, 1);
    }
  }

  // Blade shimmer
  if (bladeActive && bladeScale > 0.99) {
    const s = Math.sin(t * 8) * 0.02 + 1;
    bladeMesh.scale.x = s;
    bladeGlow.scale.x = s;
  }

  // Energy rings rotation
  if (bladeActive) {
    energyRing1.rotation.z = t * 1.5;
    energyRing2.rotation.z = -t * 1.0;
    energyRing1.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
    energyRing2.material.opacity = 0.2 + Math.sin(t * 2.5) * 0.1;
  }

  // Idle rotation
  if (!isUserInteracting && !isAnimating) {
    if (isAssembled) {
      saberGroup.rotation.y = Math.sin(t * 0.3) * 0.15;
    } else {
      const idleRot = Math.sin(t * 0.3) * 0.1;
      emitterGroup.rotation.y = idleRot;
      crystalGroup.rotation.y = idleRot;
      sleeveGroup.rotation.y = idleRot;
      gripGroup.rotation.y = idleRot;
    }
  }

  controls.update();
  composer.render();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

/* KYBERA — configurator-page.js (standalone for /configurator route) */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const CRYSTAL_COLORS = {
  blue:   { hex: '#00ccff' },
  green:  { hex: '#00ff66' },
  purple: { hex: '#ee66ff' },
  white:  { hex: '#ffffff' },
  red:    { hex: '#ff4444' },
  black:  { hex: '#333333' },
  yellow: { hex: '#ffcc00' }
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
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
new THREE.TextureLoader().load('/wallpapers/capa 1,2,3.jpeg', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
});

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(3, 2.5, 6);

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
crystalLight.position.set(0, 0, 0);
const emitterLight = new THREE.PointLight(0x00ffff, 0.3, 6, 2);
emitterLight.position.set(-3.5, 1.5, 0);
scene.add(emitterLight);
const rimLight = new THREE.PointLight(0xaa00ff, 0.2, 12, 2);
rimLight.position.set(0, -1, 2);
scene.add(rimLight);


const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const metalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.25 });

const emitterGroup = new THREE.Group();
const crystalGroup = new THREE.Group();
const sleeveGroup = new THREE.Group();
const gripGroup = new THREE.Group();

/* ── Emitter ── */
const emBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 0.375, 32), metalMat.clone());
emBase.rotation.z = Math.PI / 2;
emitterGroup.add(emBase);

const emTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.45, 32), metalMat.clone());
emTop.material.color.set(0x777777);
emTop.rotation.z = Math.PI / 2;
emTop.position.x = 0.42;
emitterGroup.add(emTop);

const emRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.045, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 }));
emRing.rotation.y = Math.PI / 2;
emRing.position.x = 0.63;
emitterGroup.add(emRing);

/* ── Crystal Housing + Crystal ── */
const housingMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.93, 0.6, 32), metalMat.clone());
housingMesh.rotation.z = Math.PI / 2;
crystalGroup.add(housingMesh);

const winMat = new THREE.MeshStandardMaterial({ color: 0x112233, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
const windowMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.375, 32, 1, true), winMat);
windowMesh.rotation.z = Math.PI / 2;
crystalGroup.add(windowMesh);
windowMesh.visible = false;
housingMesh.visible = false;

const crystalColor = CRYSTAL_COLORS[currentCrystal];
const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(crystalColor.hex), emissive: new THREE.Color(crystalColor.hex), emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.9 }));
crystalMesh.scale.set(1, 1.3, 1);
crystalGroup.add(crystalMesh);

/* Lightning rays for black crystal */
const lightningRays = [];
for (let i = 0; i < 6; i++) {
  const ray = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  );
  ray.rotation.z = Math.PI / 2;
  crystalGroup.add(ray);
  lightningRays.push(ray);

crystalGroup.add(crystalLight);
}


/* ── Sleeve / Body ── */
const sleeveHilt = HILT_SLEEVES[currentSleeve];
const sleeveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.675, 3.9, 32), new THREE.MeshStandardMaterial({ color: sleeveHilt.color, metalness: sleeveHilt.metalness, roughness: sleeveHilt.roughness }));
sleeveMesh.rotation.z = Math.PI / 2;
sleeveGroup.add(sleeveMesh);

const srTop = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.0525, 8, 32), metalMat.clone());
srTop.rotation.y = Math.PI / 2;
srTop.position.x = 1.755;
sleeveGroup.add(srTop);

const srBot = new THREE.Mesh(new THREE.TorusGeometry(0.705, 0.0525, 8, 32), metalMat.clone());
srBot.rotation.y = Math.PI / 2;
srBot.position.x = -1.755;
sleeveGroup.add(srBot);

for (let i = 0; i < 8; i++) {
  const g = new THREE.Mesh(new THREE.TorusGeometry(0.87 - (i / 8) * 0.18, 0.018, 6, 32), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.5 }));
  g.rotation.y = Math.PI / 2;
  g.position.x = -1.56 + i * 0.429;
  sleeveGroup.add(g);
}

const sleeveMeshes = [sleeveMesh];

/* ── Grip + Pommel ── */
const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.525, 0.72, 0.375, 32), metalMat.clone());
conn.rotation.z = Math.PI / 2;
conn.position.x = 1.365;
gripGroup.add(conn);

const gripBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 2.34, 32), metalMat.clone());
gripBase.material.color.set(0x666666);
gripBase.rotation.z = Math.PI / 2;
gripGroup.add(gripBase);

for (let i = 0; i < 5; i++) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 8, 32), metalMat.clone());
  r.rotation.y = Math.PI / 2;
  r.position.x = -0.975 + i * 0.351;
  gripGroup.add(r);
}

const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.825, 0.975, 0.525, 32), metalMat.clone());
pommel.rotation.z = Math.PI / 2;
pommel.position.x = -1.755;
gripGroup.add(pommel);

const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 8, 32), metalMat.clone());
pommelRing.rotation.y = Math.PI / 2;
pommelRing.position.x = -1.4625;
gripGroup.add(pommelRing);

/* ── Blade (hidden, extends left from emitter) ── */
const bladeColor = new THREE.Color(crystalColor.hex);
const bladeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 9.0, 16), new THREE.MeshStandardMaterial({ color: bladeColor, emissive: bladeColor, emissiveIntensity: 3.0, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
bladeMesh.rotation.z = Math.PI / 2;
bladeMesh.scale.set(1, 0, 1);
bladeMesh.position.x = -5.25;
emitterGroup.add(bladeMesh);

const bladeGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 9.0, 16), new THREE.MeshBasicMaterial({ color: bladeColor, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
bladeGlow.rotation.z = Math.PI / 2;
bladeGlow.scale.set(1, 0, 1);
bladeGlow.position.x = -5.25;
emitterGroup.add(bladeGlow);

/* ── Energy rings (hidden) ── */
const energyRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.0225, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2, transparent: true, opacity: 0, side: THREE.DoubleSide }));
energyRing1.rotation.y = Math.PI / 2;
emitterGroup.add(energyRing1);

const energyRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.015, 8, 32), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5, transparent: true, opacity: 0, side: THREE.DoubleSide }));
energyRing2.rotation.y = Math.PI / 2;
emitterGroup.add(energyRing2);

/* ── Add to scene ── */
const saberGroup = new THREE.Group();
saberGroup.add(emitterGroup);
saberGroup.add(crystalGroup);
saberGroup.add(sleeveGroup);
saberGroup.add(gripGroup);
saberGroup.position.y = 1.5;
scene.add(saberGroup);

/* ── Exploded positions (along X axis) ── */
const EXPLODED = {
  emitter:  new THREE.Vector3(-3.5, 0, 0),
  crystal:  new THREE.Vector3(-1.2, 0, 0),
  sleeve:   new THREE.Vector3(1.5, 0, 0),
  grip:     new THREE.Vector3(3.8, 0, 0)
};
const ASSEMBLED = {
  emitter:  new THREE.Vector3(0, 0, 0),
  crystal:  new THREE.Vector3(0, 0, 0),
  sleeve:   new THREE.Vector3(0, 0, 0),
  grip:     new THREE.Vector3(0, 0, 0)
};

emitterGroup.position.copy(EXPLODED.emitter);
crystalGroup.position.copy(EXPLODED.crystal);
sleeveGroup.position.copy(EXPLODED.sleeve);
gripGroup.position.copy(EXPLODED.grip);

let bladeTarget = 0, bladeScale = 0;

/* ── UI: Sleeve buttons ── */
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

/* ── UI: Crystal buttons ── */
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

/* ── Assemble / Disassemble ── */
const TWEEN = window.TWEEN;
document.getElementById('btn-power').addEventListener('click', () => {
  if (isAnimating || !TWEEN) return;

  const label = document.getElementById('power-label');
  const btn = document.getElementById('btn-power');
  const status = document.getElementById('config-status');
  const completeBtn = document.getElementById('btn-complete-order');

  if (!isAssembled) {
    isAnimating = true;
    label.textContent = 'ENSAMBLANDO...';
    btn.style.pointerEvents = 'none';

    const duration = 1500;
    const easing = TWEEN.Easing.Quadratic.InOut;

    new TWEEN.Tween(emitterGroup.position)
      .to({ x: ASSEMBLED.emitter.x }, duration).easing(easing).start();
    new TWEEN.Tween(crystalGroup.position)
      .to({ x: ASSEMBLED.crystal.x }, duration).easing(easing).start();
    new TWEEN.Tween(sleeveGroup.position)
      .to({ x: ASSEMBLED.sleeve.x }, duration).easing(easing).start();
    new TWEEN.Tween(gripGroup.position)
      .to({ x: ASSEMBLED.grip.x }, duration).easing(easing)
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
        housingMesh.visible = true;
        windowMesh.visible = true;
      }).start();

  } else {
    isAnimating = true;
    bladeActive = false;
    bladeTarget = 0;
    bloomPass.strength = 0.8;
    crystalLight.intensity = 2.5;
    emitterLight.intensity = 0.3;
    energyRing1.material.opacity = 0;
    energyRing2.material.opacity = 0;
    completeBtn.style.display = 'none';

    const duration = 1200;
    const easing = TWEEN.Easing.Quadratic.InOut;

    new TWEEN.Tween(emitterGroup.position)
      .to({ x: EXPLODED.emitter.x }, duration).easing(easing).start();
    new TWEEN.Tween(crystalGroup.position)
      .to({ x: EXPLODED.crystal.x }, duration).easing(easing).start();
    new TWEEN.Tween(sleeveGroup.position)
      .to({ x: EXPLODED.sleeve.x }, duration).easing(easing).start();
    new TWEEN.Tween(gripGroup.position)
      .to({ x: EXPLODED.grip.x }, duration).easing(easing)
      .onComplete(() => {
        isAssembled = false;
        isAnimating = false;
        label.textContent = 'FINISH & ENSAMBLAR';
        status.innerHTML = `<p class="text-[0.65rem] text-gray-400 tracking-widest">COMPONENTS DETONATED.</p><p class="text-[0.65rem] text-neon-cyan tracking-widest">SELECT MATERIALS & CRYSTAL.</p>`;
        housingMesh.visible = false;
        windowMesh.visible = false;
      }).start();
  }
});

/* ── Animate ── */
function animate() {
  requestAnimationFrame(animate);
  if (TWEEN) TWEEN.update();

  const t = performance.now() * 0.001;

  const floatY = Math.sin(t * 0.8) * 0.05;
  if (!isAnimating) {
    if (isAssembled) {
      saberGroup.position.y = 1.5 + floatY;
    } else {
      emitterGroup.position.y = floatY;
      crystalGroup.position.y = floatY;
      sleeveGroup.position.y = floatY;
      gripGroup.position.y = floatY;
    }
  }

  crystalMesh.material.emissiveIntensity = 1.0 + Math.sin(t * 3) * 0.2;
  crystalMesh.rotation.y = t * 0.5;

  /* Crystal light lightning effect for black */
  if (currentCrystal === 'black') {
    crystalLight.intensity = 3.0 + Math.sin(t * 15) * 2.0 + Math.random() * 1.5;
  } else if (!isAssembled) {
    crystalLight.intensity = 2.5;
  } else {
    crystalLight.intensity = 4.0;
  }


  /* Lightning effect for black crystal */
  if (currentCrystal === 'black') {
    lightningRays.forEach((ray, i) => {
      ray.material.opacity = 0.4 + Math.sin(t * 12 + i * 1.5) * 0.4;
      ray.rotation.y = t * 3 + (i / 6) * Math.PI * 2;
      ray.scale.set(1, 0.3 + Math.sin(t * 10 + i) * 0.3, 1);
    });
  } else {
    lightningRays.forEach(ray => { ray.material.opacity = 0; });
  }


  const diff = bladeTarget - bladeScale;
  if (Math.abs(diff) > 0.001) {
    bladeScale += diff * 0.06;
    const s = Math.max(0, bladeScale);
    bladeMesh.scale.set(s, 1, s);
    bladeGlow.scale.set(s, 1, s);
    if (bladeScale > 0.99 && bladeTarget === 1) {
      bladeScale = 1;
      bladeMesh.scale.set(1, 1, 1);
      bladeGlow.scale.set(1, 1, 1);
    }
  }

  if (bladeActive && bladeScale > 0.99) {
    const s = Math.sin(t * 8) * 0.02 + 1;
    bladeMesh.scale.y = s;
    bladeGlow.scale.y = s;
  }

  if (bladeActive) {
    energyRing1.rotation.x = t * 1.5;
    energyRing2.rotation.x = -t * 1.0;
    energyRing1.material.opacity = 0.3 + Math.sin(t * 2) * 0.15;
    energyRing2.material.opacity = 0.2 + Math.sin(t * 2.5) * 0.1;
  }

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

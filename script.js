import * as THREE from 'https://esm.sh/three@0.160.0';

const canvas = document.getElementById('bg');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

let renderer = null;
if (window.WebGLRenderingContext) {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    renderer = null;
  }
}

if (renderer) init();

function init() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c7cf0';

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  // ── Geometric form ────────────────────────────────────────────
  // To change the form, replace the next two lines with another
  // THREE primitive (e.g. IcosahedronGeometry, BoxGeometry).
  const geometry = new THREE.TorusGeometry(1, 0.32, 16, 80);
  const wire = new THREE.WireframeGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(accent),
    transparent: true,
    opacity: 0.55,
  });
  const torus = new THREE.LineSegments(wire, material);
  const baseRotX = 0.55;
  const baseRotY = -0.2;
  torus.rotation.x = baseRotX;
  torus.rotation.y = baseRotY;
  scene.add(torus);

  let basePosX = 0, basePosY = 0;

  function layout() {
    const mobile = window.innerWidth < 768;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Anchor torus to upper-left region, sized so the hole reads on screen
    const halfH = camera.position.z * Math.tan((camera.fov * Math.PI / 180) / 2);
    const halfW = halfH * camera.aspect;
    basePosX = -halfW * 0.55;
    basePosY = halfH * 0.35;
    torus.position.set(basePosX, basePosY, 0);
    torus.scale.setScalar(mobile ? 2.8 : 3.8);

    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  layout();

  canvas.classList.add('active');

  // ── Reduced motion: single static frame ───────────────────────
  if (reducedMotion) {
    renderer.render(scene, camera);
    window.addEventListener('resize', () => {
      layout();
      renderer.render(scene, camera);
    });
    return;
  }

  // ── Motion state — iOS-wallpaper-style position parallax ─────
  const MAX_OFFSET = 0.07; // world units
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  if (!isCoarsePointer) {
    // Desktop: mouse shifts the torus opposite to cursor direction
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = -nx * MAX_OFFSET;
      targetY = ny * MAX_OFFSET;
    }, { passive: true });
  }

  // ── Resize ────────────────────────────────────────────────────
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(layout, 100);
  });

  // ── Page Visibility ───────────────────────────────────────────
  let visible = !document.hidden;
  let rafId = null;
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && rafId == null) {
      rafId = requestAnimationFrame(loop);
    }
  });

  const start = performance.now();

  function loop() {
    rafId = null;
    if (!visible) return;

    // Slow eased drift (linear rotation + sine wobble for organic speed variation)
    const t = (performance.now() - start) / 1000;
    const linearAngle = (t / 420) * Math.PI * 2;
    const eased = Math.sin(t / 45 * Math.PI * 2) * 0.06;
    torus.rotation.y = baseRotY + linearAngle + eased;

    // Position parallax — target is 0 until input arrives
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;
    torus.position.set(basePosX + currentX, basePosY + currentY, 0);

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

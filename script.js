// Raw WebGL wireframe torus. No library.
// Procedural geometry, hand-written shaders, manual matrix math.

const canvas = document.getElementById('bg');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

const gl = canvas && canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
if (gl) bootstrap();
// If gl is null (no WebGL or context creation failed), the canvas stays
// transparent and the html background shows through.

function bootstrap() {
  const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c7cf0';
  const [aR, aG, aB] = hexToRgb(accentHex);
  const ALPHA = 0.55;

  // ── Shaders ───────────────────────────────────────────────────
  const vs = `
    attribute vec3 a_pos;
    uniform mat4 u_proj;
    uniform mat4 u_mv;
    void main() {
      gl_Position = u_proj * u_mv * vec4(a_pos, 1.0);
    }
  `;
  const fs = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      // premultiplied alpha for correct compositing with the page background
      gl_FragColor = vec4(u_color.rgb * u_color.a, u_color.a);
    }
  `;
  const prog = makeProgram(gl, vs, fs);
  if (!prog) return;
  gl.useProgram(prog);

  // ── Geometric form ────────────────────────────────────────────
  // To change the form, replace makeTorusWireframe with another
  // procedural generator returning {positions, indices}.
  const { positions, indices } = makeTorusWireframe(1, 0.32, 16, 80);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  const uProj = gl.getUniformLocation(prog, 'u_proj');
  const uMV = gl.getUniformLocation(prog, 'u_mv');
  const uColor = gl.getUniformLocation(prog, 'u_color');

  gl.uniform4f(uColor, aR, aG, aB, ALPHA);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ── Scene constants ───────────────────────────────────────────
  const FOV = 30 * Math.PI / 180;
  const CAMERA_Z = 10;
  const NEAR = 0.1, FAR = 100;
  const baseRotX = 0.55;
  const baseRotY = -0.2;

  let basePosX = 0, basePosY = 0;
  let scale = 1;
  let projection;

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const aspect = window.innerWidth / window.innerHeight;
    const halfH = CAMERA_Z * Math.tan(FOV / 2);
    const halfW = halfH * aspect;
    basePosX = -halfW * 0.55;
    basePosY = halfH * 0.35;

    scale = window.innerWidth < 768 ? 2.8 : 3.8;

    projection = perspective(FOV, aspect, NEAR, FAR);
    gl.uniformMatrix4fv(uProj, false, projection);
  }
  layout();

  function drawFrame(rotX, rotY, posX, posY) {
    gl.uniformMatrix4fv(uMV, false, modelView(posX, posY, 0, rotX, rotY, scale, CAMERA_Z));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  // ── Reduced motion: single static frame ───────────────────────
  if (reducedMotion) {
    drawFrame(baseRotX, baseRotY, basePosX, basePosY);
    window.addEventListener('resize', () => {
      layout();
      drawFrame(baseRotX, baseRotY, basePosX, basePosY);
    });
    return;
  }

  // ── Motion state — iOS-wallpaper-style position parallax ─────
  const MAX_OFFSET = 0.07; // world units
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  // The first observed cursor position becomes the parallax origin —
  // so the torus starts at base and only shifts in response to how
  // far the cursor moves *from* that point. Avoids any first-load
  // jump from "torus at base" to "torus at parallax-offset-for-cursor".
  let originX = null, originY = null;

  if (!isCoarsePointer) {
    window.addEventListener('mousemove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (originX === null) {
        originX = nx;
        originY = ny;
        return; // first move just anchors the reference; no offset yet
      }
      // Delta from origin, clamped so saturation matches the
      // original mouse-anywhere-on-viewport range.
      const dx = Math.max(-1, Math.min(1, nx - originX));
      const dy = Math.max(-1, Math.min(1, ny - originY));
      targetX = -dx * MAX_OFFSET;
      targetY = dy * MAX_OFFSET;
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
    if (visible && rafId == null) rafId = requestAnimationFrame(loop);
  });

  function loop() {
    rafId = null;
    if (!visible) return;

    // Wall-clock time so the rotation continues across page reloads
    // instead of resetting to baseRotY on every load.
    const t = Date.now() / 1000;
    const linearAngle = (t / 420) * Math.PI * 2;
    const eased = Math.sin(t / 45 * Math.PI * 2) * 0.06;
    const rotY = baseRotY + linearAngle + eased;

    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;

    drawFrame(baseRotX, rotY, basePosX + currentX, basePosY + currentY);

    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
}

// ── WebGL helpers ───────────────────────────────────────────────

function makeProgram(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
  return s;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

// Wireframe torus: vertices on the surface + line indices that mirror
// what three.js WireframeGeometry produces from a triangulated mesh
// (right edge, down edge, diagonal per quad).
function makeTorusWireframe(R, r, radialSegs, tubularSegs) {
  const positions = new Float32Array(radialSegs * tubularSegs * 3);
  const indices = new Uint16Array(radialSegs * tubularSegs * 6);
  let p = 0;
  for (let i = 0; i < radialSegs; i++) {
    const v = (i / radialSegs) * Math.PI * 2;
    const cv = Math.cos(v), sv = Math.sin(v);
    for (let j = 0; j < tubularSegs; j++) {
      const u = (j / tubularSegs) * Math.PI * 2;
      const cu = Math.cos(u), su = Math.sin(u);
      positions[p++] = (R + r * cv) * cu;
      positions[p++] = (R + r * cv) * su;
      positions[p++] = r * sv;
    }
  }
  let q = 0;
  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < tubularSegs; j++) {
      const a = i * tubularSegs + j;
      const b = i * tubularSegs + ((j + 1) % tubularSegs);
      const c = ((i + 1) % radialSegs) * tubularSegs + j;
      const d = ((i + 1) % radialSegs) * tubularSegs + ((j + 1) % tubularSegs);
      indices[q++] = a; indices[q++] = b;
      indices[q++] = a; indices[q++] = c;
      indices[q++] = a; indices[q++] = d;
    }
  }
  return { positions, indices };
}

// 4×4 perspective matrix in column-major flat form (WebGL convention).
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

// Composed view × translate × rotateY × rotateX × uniformScale matrix,
// flattened column-major. Avoids stacking generic mat4 multiplies.
function modelView(tx, ty, tz, rotX, rotY, s, cameraZ) {
  const ca = Math.cos(rotX), sa = Math.sin(rotX);
  const cb = Math.cos(rotY), sb = Math.sin(rotY);
  return new Float32Array([
    s * cb,        0,       -s * sb,            0,
    s * sa * sb,   s * ca,   s * sa * cb,       0,
    s * ca * sb,  -s * sa,   s * ca * cb,       0,
    tx,            ty,       tz - cameraZ,      1,
  ]);
}

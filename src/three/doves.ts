import * as THREE from 'three';

export interface CelestialDoveFlockHandle {
  group: THREE.Group;
  update: (elapsed: number, proximity: number, localProgress: number) => void;
  dispose: () => void;
}

interface DoveInstance {
  root: THREE.Group;
  leftInnerPivot: THREE.Group;
  leftOuterPivot: THREE.Group;
  rightInnerPivot: THREE.Group;
  rightOuterPivot: THREE.Group;
  tailMesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  scale: number;
  wingSpeed: number;
  phase: number;
  glideFactor: number;
  soarOffset: number;
}

/**
 * Procedurally paints a Renaissance oil-brushwork wing plumage texture on an
 * offscreen canvas: overlapping warm-ivory & alabaster covert feathers, subtle
 * dove-grey/taupe secondary wing-bars, individual notched primary flight feathers
 * with slate-grey tips, and fine rachis/barb striations.
 *
 * UV layout: u = 0 (shoulder) -> 1 (primary wingtips), v = 0 (trailing edge) -> 1 (leading edge)
 */
function createWingPlumageTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, w, h);

    // Helper to draw a single oil-painted feather with rachis & barb brushwork
    const drawFeather = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      halfWidth: number,
      baseColor: string,
      shadowColor: string,
      tipColor: string,
      notchTip = false,
    ) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(x0, y0);
      ctx.rotate(angle);

      // Feather vane silhouette
      ctx.beginPath();
      ctx.moveTo(0, -halfWidth * 0.55);
      ctx.quadraticCurveTo(len * 0.45, -halfWidth, len * 0.88, -halfWidth * 0.68);
      if (notchTip) {
        ctx.quadraticCurveTo(len * 0.99, -halfWidth * 0.28, len, 0);
        ctx.quadraticCurveTo(len * 0.96, halfWidth * 0.34, len * 0.85, halfWidth * 0.72);
      } else {
        ctx.quadraticCurveTo(len * 1.02, 0, len * 0.88, halfWidth * 0.68);
      }
      ctx.quadraticCurveTo(len * 0.45, halfWidth, 0, halfWidth * 0.55);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, -halfWidth, len, halfWidth * 0.6);
      grad.addColorStop(0.0, shadowColor);
      grad.addColorStop(0.42, baseColor);
      grad.addColorStop(0.78, baseColor);
      grad.addColorStop(1.0, tipColor);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle dark oil edge outline for individual feather separation
      ctx.strokeStyle = 'rgba(112, 98, 84, 0.36)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Fine angled feather barb brushwork striations
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 252, 244, 0.34)';
      ctx.lineWidth = 1.0;
      for (let t = 0.14; t < 0.94; t += 0.065) {
        const bx = len * t;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + len * 0.055, -halfWidth * 0.85);
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + len * 0.055, halfWidth * 0.85);
        ctx.stroke();
      }

      // Central ivory rachis (quill shaft)
      ctx.strokeStyle = 'rgba(253, 248, 236, 0.78)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.93, 0);
      ctx.stroke();

      ctx.restore();
    };

    // 1. Primary Flight Feathers (outer half u: 0.46 -> 1.0, trailing edge toward bottom)
    const primaryCount = 10;
    for (let i = primaryCount - 1; i >= 0; i--) {
      const f = i / (primaryCount - 1); // 0 = inner primary, 1 = outermost wingtip primary
      const rootX = 210 + f * 72;
      const rootY = 128 + f * 18;
      const tipX = 305 + f * 198;
      const tipY = 472 - f * 310;
      const hw = 25 - f * 7.5;
      const tipTone = f > 0.35 ? '#6d6967' : '#8d867f';
      drawFeather(
        rootX,
        rootY,
        tipX,
        tipY,
        hw,
        '#efe6d5',
        '#c7baa6',
        tipTone,
        true,
      );
    }

    // 2. Secondary Flight Feathers (inner half u: 0.0 -> 0.50)
    const secondaryCount = 11;
    for (let i = secondaryCount - 1; i >= 0; i--) {
      const f = i / (secondaryCount - 1);
      const rootX = 18 + f * 200;
      const rootY = 148 - f * 16;
      const tipX = 24 + f * 265;
      const tipY = 486 - f * 16;
      drawFeather(
        rootX,
        rootY,
        tipX,
        tipY,
        24,
        '#f4ecdd',
        '#cfc2ae',
        '#b8ac9c',
        false,
      );
    }

    // 3. Greater & Median Wing Coverts with subtle dove-grey / taupe wing-bars
    for (let i = 11; i >= 0; i--) {
      const f = i / 11;
      const rootX = 14 + f * 260;
      const rootY = 98 + f * 26;
      const tipX = rootX + 42 + f * 58;
      const tipY = 278 + (1 - f) * 18 - f * 26;
      const barTint = i < 8 ? '#9a9188' : '#b7ab9c';
      drawFeather(
        rootX,
        rootY,
        tipX,
        tipY,
        21,
        '#f6efe2',
        '#d7cbb8',
        barTint,
        false,
      );
    }

    // 4. Lesser Coverts & Leading-Edge Alabaster Plumage (top edge v near 1.0 -> canvas y ~ 20..180)
    for (let i = 13; i >= 0; i--) {
      const f = i / 13;
      const rootX = 8 + f * 285;
      const rootY = 38 + f * 48;
      const tipX = rootX + 26 + f * 42;
      const tipY = 172 + (1 - f) * 18 - f * 18;
      drawFeather(
        rootX,
        rootY,
        tipX,
        tipY,
        18,
        '#fbf6ec',
        '#e3d8c6',
        '#d1c4b2',
        false,
      );
    }

    // Leading-edge warm ivory impasto blend across shoulder/wrist
    const edgeGrad = ctx.createLinearGradient(0, 12, 340, 110);
    edgeGrad.addColorStop(0, 'rgba(252, 247, 236, 0.92)');
    edgeGrad.addColorStop(0.65, 'rgba(244, 235, 219, 0.72)');
    edgeGrad.addColorStop(1, 'rgba(244, 235, 219, 0)');
    ctx.fillStyle = edgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(185, 16, 360, 108);
    ctx.lineTo(310, 150);
    ctx.quadraticCurveTo(150, 95, 0, 110);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedurally paints a 12-feather fanned tail texture with Renaissance oil
 * brushwork, ivory/alabaster barbs, and a subtle dove-grey subterminal band.
 */
function createTailPlumageTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const rootX = size * 0.5;
    const rootY = 12;
    const featherCount = 12;

    for (let i = 0; i < featherCount; i++) {
      // Paint from outer rectrices inward so center feathers overlap naturally
      const order = i % 2 === 0 ? i / 2 : featherCount - 1 - Math.floor(i / 2);
      const t = order / (featherCount - 1) - 0.5; // -0.5 .. +0.5
      const spreadAngle = Math.PI * 0.5 + t * 0.92;
      const len = 216 - Math.abs(t) * 26;
      const tipX = rootX + Math.cos(spreadAngle) * len;
      const tipY = rootY + Math.sin(spreadAngle) * len;

      ctx.save();
      ctx.translate(rootX, rootY);
      ctx.rotate(spreadAngle);

      const hw = 17;
      ctx.beginPath();
      ctx.moveTo(0, -hw * 0.45);
      ctx.quadraticCurveTo(len * 0.6, -hw, len * 0.96, -hw * 0.65);
      ctx.quadraticCurveTo(len * 1.03, 0, len * 0.96, hw * 0.65);
      ctx.quadraticCurveTo(len * 0.6, hw, 0, hw * 0.45);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, len, 0);
      grad.addColorStop(0.0, '#ddd1be');
      grad.addColorStop(0.45, '#f6efe2');
      grad.addColorStop(0.78, '#8d857d'); // subtle dove-grey subterminal band
      grad.addColorStop(0.92, '#ede3d2');
      grad.addColorStop(1.0, '#d8ccba');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(110, 96, 82, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 250, 240, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.94, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedurally paints the avian body/neck/head oil-paint plumage texture:
 * warm ivory breast, alabaster back, subtle rose-taupe neck iridescence,
 * crisp dark eyes, and muted warm-horn beak.
 */
function createBodyPlumageTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base gradient from tail-base (bottom of canvas, v=0) to beak tip (top of canvas, v=1)
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0.0, '#ddd0bc');
    grad.addColorStop(0.28, '#f6efe2');
    grad.addColorStop(0.55, '#fbf6ec');
    grad.addColorStop(0.73, '#dfd5c6'); // subtle dove neck collar tone
    grad.addColorStop(0.84, '#f5ede0');
    grad.addColorStop(0.91, '#ede3d1');
    grad.addColorStop(0.94, '#b8946a'); // beak base
    grad.addColorStop(1.0, '#7d6146'); // beak tip
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Painterly feather brushstroke texture across torso
    for (let i = 0; i < 420; i++) {
      const bx = ((i * 73) % w);
      const by = 45 + ((i * 137) % (h - 75));
      ctx.fillStyle =
        i % 3 === 0
          ? 'rgba(255, 252, 245, 0.28)'
          : i % 3 === 1
            ? 'rgba(214, 200, 180, 0.22)'
            : 'rgba(176, 164, 152, 0.14)';
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle dark Renaissance eyes on both sides of the head (v ~ 0.87 -> canvas y ~ 66)
    const drawEye = (ex: number, ey: number) => {
      ctx.fillStyle = 'rgba(138, 122, 106, 0.45)';
      ctx.beginPath();
      ctx.arc(ex, ey, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#231b16';
      ctx.beginPath();
      ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 246, 224, 0.85)';
      ctx.beginPath();
      ctx.arc(ex - 1.2, ey - 1.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    };
    drawEye(w * 0.25, h * 0.13);
    drawEye(w * 0.75, h * 0.13);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds an anatomically sculpted avian body (tail base, plump pigeon breast,
 * slender arched S-curve neck, rounded head, and pointed beak).
 */
function createAvianBodyGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.24), // tail base tip
    new THREE.Vector2(0.026, -0.18), // rump
    new THREE.Vector2(0.056, -0.09), // lower back
    new THREE.Vector2(0.084, 0.01), // mid torso
    new THREE.Vector2(0.094, 0.08), // plump pigeon breast
    new THREE.Vector2(0.072, 0.15), // upper breast / base of neck
    new THREE.Vector2(0.044, 0.2), // slender arched neck
    new THREE.Vector2(0.04, 0.24), // upper neck
    new THREE.Vector2(0.048, 0.275), // rounded dove head
    new THREE.Vector2(0.036, 0.305), // crown / forehead
    new THREE.Vector2(0.015, 0.325), // beak base
    new THREE.Vector2(0.0, 0.365), // pointed beak tip
  ];

  const geo = new THREE.LatheGeometry(pts, 20);
  // Orient lengthwise along +Z
  geo.rotateX(Math.PI * 0.5);

  // Sculpt realistic avian dorsal flatness, plump dropped breast, and arched neck/head S-curve
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);

    // Narrow lateral profile slightly so body isn't circular
    const nx = x * 0.86;

    // Breast drops slightly downward (-Y) around z = 0.04..0.14
    const breastBulge = Math.exp(-Math.pow((z - 0.06) / 0.11, 2)) * (y < 0 ? 0.022 : 0.006);
    y -= breastBulge;

    // Arch neck & head gracefully upward (+Y) for z > 0.14
    if (z > 0.14) {
      const t = Math.min(1, (z - 0.14) / 0.22);
      y += Math.sin(t * Math.PI * 0.72) * 0.068;
    }

    pos.setXYZ(i, nx, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a cambered, sculpted feather-card plane for either the inner wing
 * (shoulder -> wrist/carpal joint) or outer primary wing (wrist -> primary tips).
 */
function createCamberedWingCardGeometry(
  side: -1 | 1,
  part: 'inner' | 'outer',
): THREE.PlaneGeometry {
  const width = part === 'inner' ? 0.24 : 0.3;
  const chord = part === 'inner' ? 0.23 : 0.25;
  const segX = 12;
  const segY = 8;

  const geo = new THREE.PlaneGeometry(width, chord, segX, segY);
  // Rotate from XY to XZ so leading edge (v=1, +Y) faces +Z (forward) and notched tips (v=0) trail -Z
  geo.rotateX(Math.PI * 0.5);

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const rawU = uv.getX(i); // 0..1 along local plane width
    const v = uv.getY(i); // 0 (trailing edge) -> 1 (leading edge)

    // Span fraction 0 at joint -> 1 at outer edge
    const spanT = rawU;
    const x = side * spanT * width;

    // Map UV cleanly to inner or outer portion of the wing plumage texture
    const texU =
      part === 'inner'
        ? spanT * 0.49
        : 0.47 + spanT * 0.53;
    uv.setXY(i, texU, v);

    // Aerodynamic backward sweep along outer wing + subtle upward airfoil camber
    const sweepBack =
      part === 'inner'
        ? spanT * 0.035
        : spanT * spanT * 0.11 + (1 - v) * 0.025;
    const camberY = Math.sin(v * Math.PI) * (part === 'inner' ? 0.022 : 0.015) * (1 - spanT * 0.4);
    const z = (v - 0.5) * chord - sweepBack;

    pos.setXYZ(i, x, camberY, z);
  }

  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a wedge-shaped fanned tail card with 12 fluted feather ridge undulations.
 */
function createFannedTailGeometry(): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.28, 0.24, 24, 6);
  geo.rotateX(-Math.PI * 0.5);

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i); // 0..1 left-to-right across tail fan
    const v = uv.getY(i); // 0 (tip) -> 1 (rump attachment)
    const fanRatio = 1 - v; // 0 at rump -> 1 at wide fanned tip
    const spreadX = (u - 0.5) * (0.06 + fanRatio * 0.25);
    const z = -fanRatio * 0.24;

    // 12 subtle overlapping feather ridge undulations + gentle downward lift camber
    const ridgeY = Math.abs(Math.sin(u * Math.PI * 12)) * 0.004 * fanRatio;
    const camberY = Math.sin(fanRatio * Math.PI) * 0.012 + ridgeY;

    pos.setXYZ(i, spreadX, camberY, z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a lifelike flock of 13 Renaissance oil-painted white doves/pigeons
 * with articulated two-joint wings, layered painterly feather cards, and
 * natural flight + soar kinematics beside the Chapter II chariot.
 */
export function buildCelestialDoveFlock(): CelestialDoveFlockHandle {
  const group = new THREE.Group();

  const wingTex = createWingPlumageTexture();
  const tailTex = createTailPlumageTexture();
  const bodyTex = createBodyPlumageTexture();

  const bodyGeo = createAvianBodyGeometry();
  const leftInnerGeo = createCamberedWingCardGeometry(-1, 'inner');
  const leftOuterGeo = createCamberedWingCardGeometry(-1, 'outer');
  const rightInnerGeo = createCamberedWingCardGeometry(1, 'inner');
  const rightOuterGeo = createCamberedWingCardGeometry(1, 'outer');
  const tailGeo = createFannedTailGeometry();

  // Fresco-matched Renaissance oil-paint materials (NormalBlending, depthWrite: true, alphaTest: 0.12)
  const bodyMat = new THREE.MeshStandardMaterial({
    map: bodyTex,
    roughness: 0.76,
    metalness: 0.0,
    envMapIntensity: 0.45,
    transparent: true,
    opacity: 1.0,
  });

  const wingCardMat = new THREE.MeshStandardMaterial({
    map: wingTex,
    roughness: 0.74,
    metalness: 0.0,
    envMapIntensity: 0.42,
    alphaTest: 0.12,
    depthWrite: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const tailCardMat = new THREE.MeshStandardMaterial({
    map: tailTex,
    roughness: 0.75,
    metalness: 0.0,
    envMapIntensity: 0.42,
    alphaTest: 0.12,
    depthWrite: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const doveCount = 13;
  const doves: DoveInstance[] = [];

  for (let i = 0; i < doveCount; i++) {
    const root = new THREE.Group();

    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    const tailMesh = new THREE.Mesh(tailGeo, tailCardMat);
    tailMesh.position.set(0, 0.015, -0.18);
    tailMesh.rotation.x = -0.18;

    // Two-joint articulated left wing (shoulder -> wrist/carpal -> primary feather tips)
    const leftInnerPivot = new THREE.Group();
    leftInnerPivot.position.set(-0.052, 0.048, 0.055);
    const leftInnerCard = new THREE.Mesh(leftInnerGeo, wingCardMat);
    leftInnerPivot.add(leftInnerCard);

    const leftOuterPivot = new THREE.Group();
    leftOuterPivot.position.set(-0.225, 0.008, -0.025);
    const leftOuterCard = new THREE.Mesh(leftOuterGeo, wingCardMat);
    leftOuterPivot.add(leftOuterCard);
    leftInnerPivot.add(leftOuterPivot);

    // Two-joint articulated right wing
    const rightInnerPivot = new THREE.Group();
    rightInnerPivot.position.set(0.052, 0.048, 0.055);
    const rightInnerCard = new THREE.Mesh(rightInnerGeo, wingCardMat);
    rightInnerPivot.add(rightInnerCard);

    const rightOuterPivot = new THREE.Group();
    rightOuterPivot.position.set(0.225, 0.008, -0.025);
    const rightOuterCard = new THREE.Mesh(rightOuterGeo, wingCardMat);
    rightOuterPivot.add(rightOuterCard);
    rightInnerPivot.add(rightOuterPivot);

    root.add(bodyMesh, tailMesh, leftInnerPivot, rightInnerPivot);
    root.renderOrder = 16;

    // Balanced diagonal flock flanking the chariot on right & left
    const flank = i < 8 ? 1 : -1;
    const slot = i < 8 ? i : i - 8;
    const baseX =
      flank === 1
        ? 1.55 + (slot % 4) * 0.44 + Math.sin(slot * 1.45) * 0.18
        : -1.95 - (slot % 3) * 0.44;
    const baseY = 1.02 - slot * 0.21 + (slot % 2) * 0.18;
    const baseZ = 0.55 + (slot % 4) * 0.34 - (flank === -1 ? 0.18 : 0);

    const scale = 0.78 + ((i * 29) % 10) * 0.038;
    root.scale.setScalar(scale);

    group.add(root);
    doves.push({
      root,
      leftInnerPivot,
      leftOuterPivot,
      rightInnerPivot,
      rightOuterPivot,
      tailMesh,
      baseX,
      baseY,
      baseZ,
      scale,
      wingSpeed: 7.4 + (i % 4) * 0.85,
      phase: i * 1.23,
      glideFactor: 0.82 + (i % 4) * 0.16,
      soarOffset: i * 1.7,
    });
  }

  const update = (elapsed: number, proximity: number, localProgress: number) => {
    const visible = proximity > 0.01;
    group.visible = visible;
    if (!visible) return;

    bodyMat.opacity = proximity;
    wingCardMat.opacity = proximity;
    tailCardMat.opacity = proximity;

    const p = Math.max(0, Math.min(1, localProgress));
    const smoothP = p * p * (3 - 2 * p);

    for (let i = 0; i < doves.length; i++) {
      const d = doves[i];

      // Scroll-synchronized downward & diagonal glide beside the chariot
      const descentY = -smoothP * 1.32 * d.glideFactor;
      const forwardShiftX = -smoothP * 0.92 * d.glideFactor;
      const depthSweepZ = Math.sin(smoothP * Math.PI) * 0.52;

      // Gentle air currents
      const airX = Math.sin(elapsed * 0.75 + d.phase) * 0.11;
      const airY = Math.cos(elapsed * 1.05 + d.phase * 1.3) * 0.08;
      const airZ = Math.sin(elapsed * 0.58 + d.phase * 0.7) * 0.07;

      d.root.position.set(
        d.baseX + forwardShiftX + airX,
        d.baseY + descentY + airY,
        d.baseZ + depthSweepZ + airZ,
      );

      // Natural glide-and-soar cadence: smooth envelope pauses wingbeats briefly to soar
      const soarWave = Math.sin(elapsed * 0.9 + d.soarOffset);
      const flapEnvelope = THREE.MathUtils.smoothstep(soarWave, -0.65, 0.15);
      const cycle = elapsed * d.wingSpeed + d.phase + smoothP * 7.5;

      // Two-joint wing-beat: inner wing heaves cleanly; outer primary feathers flex with lag
      const innerFlap = Math.sin(cycle) * 0.48 * flapEnvelope + (1 - flapEnvelope) * 0.12;
      const outerFlex = Math.sin(cycle - 0.62) * 0.42 * flapEnvelope - (1 - flapEnvelope) * 0.08;
      const wingTwist = Math.cos(cycle) * 0.14 * flapEnvelope;

      d.leftInnerPivot.rotation.set(wingTwist, Math.sin(cycle) * 0.08 * flapEnvelope, -innerFlap);
      d.leftOuterPivot.rotation.set(0, -0.06, -outerFlex);

      d.rightInnerPivot.rotation.set(wingTwist, -Math.sin(cycle) * 0.08 * flapEnvelope, innerFlap);
      d.rightOuterPivot.rotation.set(0, 0.06, outerFlex);

      // Subtle tail pitch lift counterbalancing downstroke
      d.tailMesh.rotation.x = -0.18 + Math.sin(cycle) * 0.07 * flapEnvelope;

      // Natural banking orientation along descending flight direction
      d.root.rotation.set(
        0.16 + Math.sin(elapsed * 1.0 + d.phase) * 0.05,
        -0.66 + Math.sin(elapsed * 0.48 + d.phase) * 0.07,
        0.14 + Math.cos(elapsed * 0.85 + d.phase) * 0.07,
      );
    }
  };

  const dispose = () => {
    bodyGeo.dispose();
    leftInnerGeo.dispose();
    leftOuterGeo.dispose();
    rightInnerGeo.dispose();
    rightOuterGeo.dispose();
    tailGeo.dispose();
    bodyMat.dispose();
    wingCardMat.dispose();
    tailCardMat.dispose();
    wingTex.dispose();
    tailTex.dispose();
    bodyTex.dispose();
  };

  return { group, update, dispose };
}

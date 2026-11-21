import * as THREE from 'three';
import { auToSimRadius, keplerOmega } from '../data/solarSystem';

function hash1(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function hash3(x: number, y: number, z: number, seed: number): number {
  const d = x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19;
  const s = Math.sin(d) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Generates an irregular fractured asteroid geometry using Voronoi-like impact facets
 * and multi-octave spatial displacement along vertex normals.
 */
function createFracturedAsteroidGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  // Deterministic crater centers on unit sphere
  const craters: Array<{ dir: THREE.Vector3; radius: number; depth: number }> = [];
  for (let c = 0; c < 6; c++) {
    const theta = hash1(seed * 17 + c * 3.1) * Math.PI * 2;
    const phi = Math.acos(2 * hash1(seed * 23 + c * 5.7) - 1);
    craters.push({
      dir: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ),
      radius: 0.32 + hash1(seed * 29 + c * 7.3) * 0.36,
      depth: 0.16 + hash1(seed * 31 + c * 9.1) * 0.16,
    });
  }

  const v = new THREE.Vector3();
  const sx = 0.78 + hash1(seed * 3 + 1) * 0.48;
  const sy = 0.62 + hash1(seed * 3 + 2) * 0.42;
  const sz = 0.74 + hash1(seed * 3 + 3) * 0.48;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();

    // Multi-octave angular ridge noise
    const r1 = hash3(Math.round(n.x * 3), Math.round(n.y * 3), Math.round(n.z * 3), seed);
    const r2 = Math.sin(n.x * 4.3 + seed) * Math.cos(n.y * 3.9 - seed * 0.7) * Math.sin(n.z * 4.7);
    let disp = 0.88 + r1 * 0.22 + r2 * 0.12;

    // Voronoi crater bowls with sharp raised rims
    for (let c = 0; c < craters.length; c++) {
      const dist = n.distanceTo(craters[c].dir);
      if (dist < craters[c].radius) {
        const u = dist / craters[c].radius;
        if (u < 0.78) {
          const bowl = 1 - (u / 0.78) * (u / 0.78);
          disp -= bowl * craters[c].depth;
        } else {
          const rim = Math.sin(((u - 0.78) / 0.22) * Math.PI);
          disp += rim * craters[c].depth * 0.35;
        }
      }
    }

    pos.setXYZ(i, n.x * disp * sx, n.y * disp * sy, n.z * disp * sz);
  }

  geo.computeVertexNormals();
  return geo;
}

interface AsteroidState {
  classIndex: 0 | 1 | 2;
  instanceIndex: number;
  baseRadius: number;
  baseY: number;
  angle: number;
  omega: number;
  scale: number;
  rot: THREE.Euler;
  rotSpeed: THREE.Vector3;
  // Perturbation offset & velocity for Verlet gravitational tractor physics
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
}

export interface AsteroidsAndCometSystem {
  group: THREE.Group;
  update: (
    dt: number,
    elapsed: number,
    timeScale: number,
    cursorEcliptic: THREE.Vector3 | null,
    blackHolePull: number,
    annihilateFactor: number,
    sunPos: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

export function createAsteroidsAndCometSystem(): AsteroidsAndCometSystem {
  const group = new THREE.Group();

  // 3 spectral classes: C-type (Carbonaceous), S-type (Stony Silicate), M-type (Metallic Nickel-Iron)
  const geometries = [
    createFracturedAsteroidGeometry(11),
    createFracturedAsteroidGeometry(27),
    createFracturedAsteroidGeometry(43),
  ];

  const materials = [
    new THREE.MeshStandardMaterial({
      color: 0x575049,
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x9b8a76,
      roughness: 0.76,
      metalness: 0.22,
      flatShading: true,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xb6bdc8,
      roughness: 0.34,
      metalness: 0.86,
      flatShading: true,
    }),
  ];

  // Counts: 180 C-type, 180 S-type, 135 M-type = 495 fractured asteroids
  const counts: [number, number, number] = [180, 180, 135];
  const meshes: [THREE.InstancedMesh, THREE.InstancedMesh, THREE.InstancedMesh] = [
    new THREE.InstancedMesh(geometries[0], materials[0], counts[0]),
    new THREE.InstancedMesh(geometries[1], materials[1], counts[1]),
    new THREE.InstancedMesh(geometries[2], materials[2], counts[2]),
  ];
  meshes.forEach((m) => {
    m.frustumCulled = false;
    group.add(m);
  });

  const asteroids: AsteroidState[] = [];
  const classCounters = [0, 0, 0];
  const totalCount = counts[0] + counts[1] + counts[2];

  for (let i = 0; i < totalCount; i++) {
    const classIndex: 0 | 1 | 2 =
      i < counts[0] ? 0 : i < counts[0] + counts[1] ? 1 : 2;
    const instanceIndex = classCounters[classIndex]++;

    // 78% in Main Belt (2.12 - 3.26 AU avoiding Kirkwood gaps), 22% in Kuiper Belt (32.5 - 42 AU)
    const isKuiper = i % 5 === 4;
    let au: number;
    if (isKuiper) {
      au = 32.5 + hash1(i * 7.1 + 3) * 9.5;
    } else {
      // Sample around Kirkwood resonance gaps at ~2.50, ~2.82, ~3.28 AU
      let rawAu = 2.12 + hash1(i * 5.3 + 2) * 1.12;
      if (Math.abs(rawAu - 2.5) < 0.045) rawAu += rawAu < 2.5 ? -0.06 : 0.06;
      if (Math.abs(rawAu - 2.82) < 0.045) rawAu += rawAu < 2.82 ? -0.06 : 0.06;
      au = rawAu;
    }

    const baseRadius = auToSimRadius(au);
    const scale = isKuiper
      ? 0.09 + hash1(i * 11.7) * 0.24
      : 0.055 + Math.pow(hash1(i * 13.1), 1.8) * 0.24;

    asteroids.push({
      classIndex,
      instanceIndex,
      baseRadius,
      baseY: (hash1(i * 19.3) - 0.5) * (isKuiper ? 4.8 : 2.1),
      angle: hash1(i * 3.7) * Math.PI * 2,
      omega: keplerOmega(au) * (0.94 + hash1(i * 29.1) * 0.12),
      scale,
      rot: new THREE.Euler(
        hash1(i * 2.1) * Math.PI,
        hash1(i * 2.9) * Math.PI,
        hash1(i * 4.3) * Math.PI,
      ),
      rotSpeed: new THREE.Vector3(
        (hash1(i * 31.1) - 0.5) * 1.4,
        (hash1(i * 37.3) - 0.5) * 1.4,
        (hash1(i * 41.7) - 0.5) * 1.4,
      ),
      px: 0,
      py: 0,
      pz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      mass: 0.6 + scale * 3.0,
    });
  }

  // Micro-sparkle dust trails emitted by asteroids deflected by the cursor gravitational field
  const trailCount = 280;
  const trailPositions = new Float32Array(trailCount * 3);
  const trailColors = new Float32Array(trailCount * 3);
  const trailLife = new Float32Array(trailCount);
  let trailCursor = 0;

  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  const trailMat = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const trailPoints = new THREE.Points(trailGeo, trailMat);
  trailPoints.frustumCulled = false;
  group.add(trailPoints);

  // Halley-type Eccentric Comet
  const cometGroup = new THREE.Group();
  group.add(cometGroup);

  const nucleusGeo = createFracturedAsteroidGeometry(77);
  const nucleusMat = new THREE.MeshStandardMaterial({
    color: 0xcbe3f5,
    roughness: 0.72,
    metalness: 0.15,
    emissive: 0x164e63,
    emissiveIntensity: 0.45,
  });
  const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
  nucleusMesh.scale.setScalar(0.22);
  cometGroup.add(nucleusMesh);

  // Radial glow texture for coma
  const comaCanvas = document.createElement('canvas');
  comaCanvas.width = 128;
  comaCanvas.height = 128;
  const cCtx = comaCanvas.getContext('2d')!;
  const cGrad = cCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
  cGrad.addColorStop(0, 'rgba(235, 252, 255, 1)');
  cGrad.addColorStop(0.28, 'rgba(103, 232, 249, 0.72)');
  cGrad.addColorStop(0.65, 'rgba(14, 165, 233, 0.18)');
  cGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 128, 128);
  const comaTex = new THREE.CanvasTexture(comaCanvas);
  const comaSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: comaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  comaSprite.scale.set(2.3, 2.3, 1);
  cometGroup.add(comaSprite);

  // Straight cyan-blue plasma ion tail (strictly anti-solar)
  const ionGeo = new THREE.ConeGeometry(0.45, 7.5, 16, 1, true);
  ionGeo.translate(0, -3.75, 0);
  ionGeo.rotateX(Math.PI / 2); // Tip at origin, flares along -Z (we orient +Z toward Sun or away)
  const ionMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ionTail = new THREE.Mesh(ionGeo, ionMat);
  cometGroup.add(ionTail);

  // Curved yellowish dust tail (points particle ribbon slightly lagging velocity + anti-solar)
  const dustCount = 120;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const t = i / (dustCount - 1);
    dustColors[i * 3] = 0.98;
    dustColors[i * 3 + 1] = 0.84 - t * 0.25;
    dustColors[i * 3 + 2] = 0.45 - t * 0.25;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dustTailPoints = new THREE.Points(dustGeo, dustMat);
  dustTailPoints.frustumCulled = false;
  group.add(dustTailPoints);

  // Scratch objects to avoid per-frame GC allocations
  const dummy = new THREE.Object3D();
  const antiSolarDir = new THREE.Vector3();
  const velDir = new THREE.Vector3();
  const cometPos = new THREE.Vector3();
  const cometPrevPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  let cometMeanAnomaly = 0.85;

  const update = (
    dt: number,
    elapsed: number,
    timeScale: number,
    cursorEcliptic: THREE.Vector3 | null,
    blackHolePull: number,
    annihilateFactor: number,
    sunPos: THREE.Vector3,
  ) => {
    const visibility = Math.max(0, 1 - annihilateFactor);
    group.visible = visibility > 0.01;
    if (!group.visible) return;

    const simDt = dt * (timeScale >= 1000 ? 6.5 : timeScale >= 100 ? 2.2 : 0.45);
    const verletDt = Math.min(0.05, dt);

    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      a.angle += a.omega * simDt;

      const keplerX = Math.cos(a.angle) * a.baseRadius;
      const keplerZ = Math.sin(a.angle) * a.baseRadius;
      const keplerY = a.baseY;

      let wx = keplerX + a.px;
      let wy = keplerY + a.py;
      let wz = keplerZ + a.pz;

      // Cursor gravitational tractor well on ecliptic plane
      if (cursorEcliptic && blackHolePull < 0.25) {
        const dx = cursorEcliptic.x - wx;
        const dy = cursorEcliptic.y - wy;
        const dz = cursorEcliptic.z - wz;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 110) {
          const invDist = 1 / Math.sqrt(distSq + 2.4);
          const accel = (34.0 / a.mass) * invDist * invDist;
          // Tangential swirl + radial deflection
          a.vx += (dx * invDist * accel - dz * invDist * accel * 0.45) * verletDt;
          a.vy += dy * invDist * accel * 0.5 * verletDt;
          a.vz += (dz * invDist * accel + dx * invDist * accel * 0.45) * verletDt;

          if (i % 4 === 0 && Math.random() < 0.35) {
            const idx = trailCursor % trailCount;
            trailCursor++;
            trailPositions[idx * 3] = wx;
            trailPositions[idx * 3 + 1] = wy;
            trailPositions[idx * 3 + 2] = wz;
            trailColors[idx * 3] = 0.25;
            trailColors[idx * 3 + 1] = 0.85;
            trailColors[idx * 3 + 2] = 0.98;
            trailLife[idx] = 1.0;
          }
        }
      }

      // Spring restoration toward Kepler orbit + velocity damping (Verlet step)
      const spring = 1.8;
      const damp = Math.exp(-2.4 * verletDt);
      a.vx = (a.vx - a.px * spring * verletDt) * damp;
      a.vy = (a.vy - a.py * spring * verletDt) * damp;
      a.vz = (a.vz - a.pz * spring * verletDt) * damp;

      a.px += a.vx * verletDt;
      a.py += a.vy * verletDt;
      a.pz += a.vz * verletDt;

      // Black hole Roche spiral pull during singularity phase (85%-95%)
      let s = a.scale * visibility;
      if (blackHolePull > 0.001) {
        const shrink = Math.max(0.02, 1 - blackHolePull * 0.92);
        const spiralAngle = blackHolePull * (6.5 + (i % 7) * 0.4);
        const cosS = Math.cos(spiralAngle);
        const sinS = Math.sin(spiralAngle);
        const rx = (wx * cosS - wz * sinS) * shrink;
        const rz = (wx * sinS + wz * cosS) * shrink;
        wx = rx;
        wy *= shrink;
        wz = rz;
        s *= Math.max(0, 1 - Math.max(0, blackHolePull - 0.65) * 2.8);
      } else {
        wx = keplerX + a.px;
        wy = keplerY + a.py;
        wz = keplerZ + a.pz;
      }

      a.rot.x += a.rotSpeed.x * dt;
      a.rot.y += a.rotSpeed.y * dt;
      a.rot.z += a.rotSpeed.z * dt;

      dummy.position.set(wx, wy, wz);
      dummy.rotation.copy(a.rot);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshes[a.classIndex].setMatrixAt(a.instanceIndex, dummy.matrix);
    }

    meshes[0].instanceMatrix.needsUpdate = true;
    meshes[1].instanceMatrix.needsUpdate = true;
    meshes[2].instanceMatrix.needsUpdate = true;

    // Fade perturbation sparkle trails
    for (let t = 0; t < trailCount; t++) {
      if (trailLife[t] > 0) {
        trailLife[t] = Math.max(0, trailLife[t] - dt * 1.4);
        trailColors[t * 3] *= 0.96;
        trailColors[t * 3 + 1] *= 0.96;
        trailColors[t * 3 + 2] *= 0.96;
      }
    }
    (trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (trailGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    // Update Halley-type comet Keplerian orbit (a ~ 3.9 AU, e = 0.68, inc = 16 deg)
    const evalComet = (M: number, out: THREE.Vector3) => {
      const a = auToSimRadius(3.85);
      const e = 0.66;
      let E = M;
      for (let k = 0; k < 4; k++) {
        E -= (E - e * Math.sin(E) - M) / Math.max(1e-4, 1 - e * Math.cos(E));
      }
      const xOrb = a * (Math.cos(E) - e);
      const zOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);
      const inc = (16 * Math.PI) / 180;
      out.set(xOrb, zOrb * Math.sin(inc), zOrb * Math.cos(inc));
    };

    evalComet(cometMeanAnomaly - 0.02, cometPrevPos);
    cometMeanAnomaly += keplerOmega(3.85) * simDt * 1.45;
    evalComet(cometMeanAnomaly, cometPos);

    if (blackHolePull > 0.001) {
      cometPos.multiplyScalar(Math.max(0.05, 1 - blackHolePull * 0.92));
    }

    cometGroup.position.copy(cometPos);
    cometGroup.scale.setScalar(visibility);
    nucleusMesh.rotation.y = elapsed * 0.8;

    // Anti-solar unit vector
    antiSolarDir.subVectors(cometPos, sunPos).normalize();
    velDir.subVectors(cometPos, cometPrevPos).normalize();

    // Solar proximity intensifies coma & ion tail
    const sunDist = Math.max(6, cometPos.distanceTo(sunPos));
    const activity = Math.min(1.6, 26 / sunDist);
    comaSprite.scale.setScalar(1.6 + activity * 1.4);
    ionTail.scale.set(1, 1, 0.7 + activity * 0.9);
    ionMat.opacity = Math.min(0.55, 0.22 + activity * 0.22) * visibility;

    // Orient ion tail so -Z aligns with antiSolarDir (cone base points away from Sun)
    lookTarget.copy(cometPos).sub(antiSolarDir);
    ionTail.lookAt(lookTarget);

    // Update curved dust tail points
    for (let i = 0; i < dustCount; i++) {
      const frac = i / (dustCount - 1);
      const len = frac * (4.5 + activity * 4.5);
      const spread = (hash1(i * 19.1) - 0.5) * (0.15 + frac * 1.15);
      const spreadY = (hash1(i * 23.7) - 0.5) * (0.12 + frac * 0.8);
      // Curve smoothly between anti-solar direction and backward orbital velocity
      const bend = frac * 0.58;
      dustPositions[i * 3] =
        cometPos.x + (antiSolarDir.x * (1 - bend) - velDir.x * bend) * len + spread;
      dustPositions[i * 3 + 1] =
        cometPos.y + (antiSolarDir.y * (1 - bend) - velDir.y * bend) * len + spreadY;
      dustPositions[i * 3 + 2] =
        cometPos.z + (antiSolarDir.z * (1 - bend) - velDir.z * bend) * len + spread;
    }
    (dustGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    dustMat.opacity = 0.55 * visibility;
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    trailGeo.dispose();
    trailMat.dispose();
    nucleusGeo.dispose();
    nucleusMat.dispose();
    comaTex.dispose();
    comaSprite.material.dispose();
    ionGeo.dispose();
    ionMat.dispose();
    dustGeo.dispose();
    dustMat.dispose();
  };

  return { group, update, dispose };
}

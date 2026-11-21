import * as THREE from 'three';
import { EXHIBITION_CHAPTERS } from '../data/chapters';

export interface GoldenSpearHandle {
  group: THREE.Group;
  update: (
    elapsed: number,
    globalProgress: number,
    pointerX: number,
    pointerY: number,
  ) => void;
  dispose: () => void;
}

const _forward = new THREE.Vector3(1, 0, 0);
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _trailPos = new THREE.Vector3();
const _trailDummy = new THREE.Object3D();

// Chapter V exact unchanged endpoints relative to Chapter V center
const _ch5Start = new THREE.Vector3(-7.5, -4.2, 1.08);
const _ch5End = new THREE.Vector3(7.5, 4.2, 1.08);
const _ch5Dir = new THREE.Vector3().subVectors(_ch5End, _ch5Start).normalize();
const _ch5DiagQuat = new THREE.Quaternion().setFromUnitVectors(_forward, _ch5Dir);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function smootherstep(x: number): number {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function evalQuadraticBezier(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number,
  outPos: THREE.Vector3,
  outDir: THREE.Vector3,
) {
  const mt = 1 - t;
  outPos
    .set(0, 0, 0)
    .addScaledVector(p0, mt * mt)
    .addScaledVector(p1, 2 * mt * t)
    .addScaledVector(p2, t * t);

  outDir
    .set(0, 0, 0)
    .addScaledVector(p1, 2 * mt)
    .addScaledVector(p0, -2 * mt)
    .addScaledVector(p2, 2 * t)
    .addScaledVector(p1, -2 * t)
    .normalize();
}

function evalCubicBezier(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  outPos: THREE.Vector3,
  outDir: THREE.Vector3,
) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  outPos
    .set(0, 0, 0)
    .addScaledVector(p0, mt2 * mt)
    .addScaledVector(p1, 3 * mt2 * t)
    .addScaledVector(p2, 3 * mt * t2)
    .addScaledVector(p3, t2 * t);

  outDir
    .set(0, 0, 0)
    .addScaledVector(p1, 3 * mt2)
    .addScaledVector(p0, -3 * mt2)
    .addScaledVector(p2, 6 * mt * t)
    .addScaledVector(p1, -6 * mt * t)
    .addScaledVector(p3, 3 * t2)
    .addScaledVector(p2, -3 * t2)
    .normalize();
}

// Pre-allocated chapter curve waypoints (local to each chapter anchor)
const _ch2P0 = new THREE.Vector3(7.8, 4.6, 1.35);
const _ch2P1 = new THREE.Vector3(1.2, 1.6, 1.55);
const _ch2P2 = new THREE.Vector3(-7.8, -4.4, 1.35);

const _ch3P0 = new THREE.Vector3(0.0, 5.2, 5.2);
const _ch3P1 = new THREE.Vector3(0.0, -5.0, 3.8);

const _ch4P0 = new THREE.Vector3(8.0, 0.3, 1.75);
const _ch4P1 = new THREE.Vector3(2.8, 0.95, 1.75);
const _ch4P2 = new THREE.Vector3(-3.2, -0.65, 1.75);
const _ch4P3 = new THREE.Vector3(-6.8, -4.4, 1.75);

const _ch6P0 = new THREE.Vector3(7.6, -4.2, 1.55);
const _ch6TargetEnd = new THREE.Vector3(-5.8, 3.4, 1.55);

function sampleChapterSpearPose(
  chapterIdx: number,
  u: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
  outPos: THREE.Vector3,
  outDir: THREE.Vector3,
): { opacity: number; scale: number; afterglowBoost: number } {
  const chPos = EXHIBITION_CHAPTERS[chapterIdx].position;

  if (chapterIdx === 0) {
    // Chapter I (0% - 16%): Stands poised on Helios's right side (replacing wooden stick),
    // then ascends straight upward (y: -0.3 -> +4.8) with intensifying golden afterglow.
    const riseT = Math.pow(clamp01(u), 1.42);
    const y = THREE.MathUtils.lerp(-0.3, 4.8, riseT);
    outPos.set(
      chPos[0] + 1.75 + pointerX * 0.08,
      chPos[1] + y + pointerY * 0.06 + (1 - riseT) * Math.sin(elapsed * 1.4) * 0.025,
      chPos[2] + 0.65,
    );
    outDir.set(0.025 * (1 - riseT), 1.0, 0.0).normalize();
    const exitFade = 1 - smoothstep(0.86, 0.99, u);
    return {
      opacity: exitFade,
      scale: 0.92,
      afterglowBoost: 0.65 + riseT * 1.1,
    };
  }

  if (chapterIdx === 1) {
    // Chapter II (16% - 33%): Top-right (7.8, 4.6) -> bottom-left (-7.8, -4.4)
    // along gentle quadratic Bezier arc (control: 1.2, 1.6)
    const t = smootherstep(u);
    evalQuadraticBezier(_ch2P0, _ch2P1, _ch2P2, t, outPos, outDir);
    outPos.x += chPos[0] + pointerX * 0.12;
    outPos.y += chPos[1] + pointerY * 0.08;
    outPos.z += chPos[2];
    const env = smoothstep(0.03, 0.16, u) * (1 - smoothstep(0.84, 0.98, u));
    return { opacity: env, scale: 1.0, afterglowBoost: 1.05 };
  }

  if (chapterIdx === 2) {
    // Chapter III (33% - 50%): Top-front (0, 5.2, 5.2) -> bottom-center (0, -5.0, 3.8)
    // diving gracefully right between Sol and Luna
    const t = smootherstep(u);
    outPos.lerpVectors(_ch3P0, _ch3P1, t);
    outPos.x += pointerX * 0.09;
    outPos.y += chPos[1] + pointerY * 0.06;
    outPos.z += chPos[2];
    outDir.subVectors(_ch3P1, _ch3P0).normalize();
    const env = smoothstep(0.03, 0.14, u) * (1 - smoothstep(0.86, 0.98, u));
    return { opacity: env, scale: 0.68, afterglowBoost: 1.15 };
  }

  if (chapterIdx === 3) {
    // Chapter IV (50% - 66%): Middle-right (8.0, 0.3) -> center (0.0, -0.4) -> bottom-left (-6.8, -4.4)
    // along smooth cubic S-curve beneath Olympus dome
    const t = smootherstep(u);
    evalCubicBezier(_ch4P0, _ch4P1, _ch4P2, _ch4P3, t, outPos, outDir);
    outPos.x += chPos[0] + pointerX * 0.12;
    outPos.y += pointerY * 0.08;
    outPos.z += chPos[2];
    const env = smoothstep(0.03, 0.16, u) * (1 - smoothstep(0.84, 0.98, u));
    return { opacity: env, scale: 0.98, afterglowBoost: 1.05 };
  }

  if (chapterIdx === 4) {
    // Chapter V (66% - 83%): UNCHANGED straight diagonal (-7.5, -4.2) -> (+7.5, +4.2)
    const smoothT = u * u * (3 - 2 * u);
    const halfSpan = 8.58;
    const travelX = THREE.MathUtils.lerp(-halfSpan, halfSpan, smoothT);
    outPos.set(
      chPos[0] + pointerX * 0.14 + _ch5Dir.x * travelX,
      chPos[1] + pointerY * 0.1 + _ch5Dir.y * travelX,
      chPos[2] + 1.08,
    );
    outDir.copy(_ch5Dir);
    const fadeEnv =
      smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
    return {
      opacity: 0.42 + 0.58 * fadeEnv,
      scale: 1.1,
      afterglowBoost: 1.0,
    };
  }

  // Chapter VI (83% - 100%): Bottom-right (7.6, -4.2) -> diagonally upward toward top-left (-5.8, 3.4),
  // decelerating gracefully to hover in the visible upper-left sky near CONTACT NOW!
  const decelT = 1 - Math.pow(1 - clamp01(u), 2.75);
  const pathFraction = decelT * 0.768; // Lands cleanly at (-2.69, +1.64) inside top-left safe quadrant
  outPos.lerpVectors(_ch6P0, _ch6TargetEnd, pathFraction);
  const hoverBob = smoothstep(0.65, 1.0, u) * Math.sin(elapsed * 1.45) * 0.042;
  outPos.x += chPos[0] + pointerX * 0.1;
  outPos.y += chPos[1] + pointerY * 0.07 + hoverBob;
  outPos.z += chPos[2];
  outDir.subVectors(_ch6TargetEnd, _ch6P0).normalize();
  const enterFade = smoothstep(0.02, 0.14, u);
  return {
    opacity: enterFade,
    scale: THREE.MathUtils.lerp(1.04, 0.86, decelT),
    afterglowBoost: THREE.MathUtils.lerp(1.15, 0.82, decelT),
  };
}

/**
 * Builds the streamlined rocket-like 3D Golden Spear with volumetric afterglow
 * and choreographs it continuously across all 6 chapters (0% -> 100%).
 * Chapter V preserves its exact straight diagonal trajectory and volumetric sunlight shaft.
 */
export function buildGoldenSpear(): GoldenSpearHandle {
  const group = new THREE.Group();

  // 1. Chapter V Unchanged Directional Ray of Sunlight streaming along exact diagonal axis
  const ch5Anchor = new THREE.Group();
  const ch5Base = EXHIBITION_CHAPTERS[4].position;
  ch5Anchor.position.set(ch5Base[0], ch5Base[1], ch5Base[2] + 1.08);
  ch5Anchor.quaternion.copy(_ch5DiagQuat);
  group.add(ch5Anchor);

  const sunRayGeo = new THREE.PlaneGeometry(18.0, 2.1);
  const sunRayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uSpearU: { value: 0.5 },
      uWarmColor: { value: new THREE.Color('#ffcf6e') },
      uCoreColor: { value: new THREE.Color('#fff5d6') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSpearU;
      uniform vec3 uWarmColor;
      uniform vec3 uCoreColor;
      varying vec2 vUv;

      void main() {
        float yDist = abs(vUv.y - 0.5) * 2.0;
        if (yDist >= 0.98) discard;

        float coreBeam = exp(-yDist * 7.2) * 0.72;
        float softBeam = exp(-yDist * 2.6) * 0.34;
        float edgeY = smoothstep(0.96, 0.25, yDist);

        float aheadBoost = exp(-abs(vUv.x - uSpearU) * 3.8) * 0.75;
        float forwardStream = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
        float flowShimmer = 0.84 + 0.16 * sin(vUv.x * 26.0 - uTime * 6.5);

        float lum = (coreBeam + softBeam) * (0.45 + aheadBoost) * forwardStream * edgeY * flowShimmer * uIntensity;
        if (lum < 0.004) discard;

        float compressed = lum / (1.0 + lum * 0.65);
        vec3 col = mix(uWarmColor, uCoreColor, clamp(coreBeam * 1.15, 0.0, 1.0));
        gl_FragColor = vec4(col * compressed, clamp(compressed, 0.0, 1.0));
      }
    `,
  });

  const sunRayMesh = new THREE.Mesh(sunRayGeo, sunRayMat);
  sunRayMesh.position.set(0, 0, -0.14);
  sunRayMesh.renderOrder = 18;
  ch5Anchor.add(sunRayMesh);

  // 2. Rocket-like Celestial Golden Spear (tangent-aligned across all 6 chapters)
  const spearRoot = new THREE.Group();
  const spearBody = new THREE.Group();
  spearRoot.add(spearBody);
  group.add(spearRoot);

  const polishedGoldMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd578,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    emissive: new THREE.Color(0xc88022),
    emissiveIntensity: 0.24,
    transparent: true,
    opacity: 1.0,
  });

  const burnishedGoldMat = new THREE.MeshPhysicalMaterial({
    color: 0xb88232,
    metalness: 0.88,
    roughness: 0.38,
    emissive: new THREE.Color(0x6e410f),
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 1.0,
  });

  // Elongated sleek 4-fluted rocket lance spearhead (+X)
  const tipGeo = new THREE.ConeGeometry(0.068, 0.72, 4);
  tipGeo.rotateZ(-Math.PI * 0.5);
  tipGeo.scale(1.0, 0.72, 0.72);
  tipGeo.translate(1.48, 0, 0);
  const tipMesh = new THREE.Mesh(tipGeo, polishedGoldMat);

  // Streamlined lathe neck collar joining lance head to shaft
  const collarPoints = [
    new THREE.Vector2(0.022, 0.0),
    new THREE.Vector2(0.05, 0.06),
    new THREE.Vector2(0.036, 0.15),
    new THREE.Vector2(0.044, 0.22),
    new THREE.Vector2(0.024, 0.28),
  ];
  const collarGeo = new THREE.LatheGeometry(collarPoints, 16);
  collarGeo.rotateZ(-Math.PI * 0.5);
  collarGeo.translate(0.92, 0, 0);
  const collarMesh = new THREE.Mesh(collarGeo, burnishedGoldMat);

  // Long streamlined tapered cylindrical shaft
  const shaftGeo = new THREE.CylinderGeometry(0.024, 0.008, 2.35, 16);
  shaftGeo.rotateZ(-Math.PI * 0.5);
  shaftGeo.translate(-0.24, 0, 0);
  const shaftMesh = new THREE.Mesh(shaftGeo, polishedGoldMat);

  // Sculpted metallic rings along fuselage
  const ringGeo = new THREE.TorusGeometry(0.029, 0.006, 8, 18);
  ringGeo.rotateY(Math.PI * 0.5);
  const ringA = new THREE.Mesh(ringGeo, burnishedGoldMat);
  ringA.position.set(0.32, 0, 0);
  const ringB = new THREE.Mesh(ringGeo, burnishedGoldMat);
  ringB.position.set(-0.35, 0, 0);

  // Sleek rocket tail spire
  const tailSpireGeo = new THREE.ConeGeometry(0.02, 0.28, 12);
  tailSpireGeo.rotateZ(Math.PI * 0.5);
  tailSpireGeo.translate(-1.54, 0, 0);
  const tailSpireMesh = new THREE.Mesh(tailSpireGeo, polishedGoldMat);

  spearBody.add(tipMesh, collarMesh, shaftMesh, ringA, ringB, tailSpireMesh);

  // 3. Radiant volumetric golden afterglow plasma wake behind the spear
  const wakeGeo = new THREE.PlaneGeometry(4.6, 0.62);
  wakeGeo.translate(-1.45, 0, 0);
  const wakeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color('#ffda82') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float along = smoothstep(0.0, 0.78, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        float cDist = abs(vUv.y - 0.5) * 2.0;
        float core = exp(-cDist * 4.8);
        float pulse = 0.86 + 0.14 * sin(vUv.x * 24.0 - uTime * 11.0);
        float alpha = along * core * pulse * uOpacity * 0.54;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor * alpha * 1.12, alpha);
      }
    `,
  });

  const wakeMeshA = new THREE.Mesh(wakeGeo, wakeMat);
  const wakeMeshB = new THREE.Mesh(wakeGeo, wakeMat);
  wakeMeshB.rotation.x = Math.PI * 0.5;

  // Soft radiant solar halo enveloping spearhead
  const headHaloGeo = new THREE.PlaneGeometry(1.4, 1.4);
  const headHaloMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color('#ffe8a6') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5)) * 2.0;
        float glow = exp(-d * 4.1) * (1.0 - smoothstep(0.7, 0.96, d));
        float alpha = glow * 0.34 * uOpacity;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(uColor * alpha * 1.05, alpha);
      }
    `,
  });
  const headHaloMesh = new THREE.Mesh(headHaloGeo, headHaloMat);
  headHaloMesh.position.set(1.38, 0, 0);

  spearBody.add(wakeMeshA, wakeMeshB, headHaloMesh);

  // 4. Curved Golden Sunlight Ember Trail following the spline path behind the spear
  const trailCount = 22;
  const trailGeo = new THREE.PlaneGeometry(0.24, 0.24);
  const trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uOpacity: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = distance(vUv, vec2(0.5)) * 2.0;
        float a = exp(-d * 3.6) * (1.0 - smoothstep(0.66, 0.96, d)) * uOpacity * 0.45;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vec3(0.98, 0.8, 0.42) * a * 1.1, a);
      }
    `,
  });
  const trailInstanced = new THREE.InstancedMesh(trailGeo, trailMat, trailCount);
  trailInstanced.frustumCulled = false;
  trailInstanced.renderOrder = 20;
  group.add(trailInstanced);

  spearRoot.renderOrder = 21;

  const update = (
    elapsed: number,
    globalProgress: number,
    pointerX: number,
    pointerY: number,
  ) => {
    const count = EXHIBITION_CHAPTERS.length;
    const clampedP = clamp01(globalProgress);
    const scaled = clampedP * count;
    const chapterIdx = Math.min(count - 1, Math.floor(scaled));
    const localU = clamp01(scaled - chapterIdx);

    const { opacity, scale, afterglowBoost } = sampleChapterSpearPose(
      chapterIdx,
      localU,
      elapsed,
      pointerX,
      pointerY,
      _pos,
      _dir,
    );

    const visible = opacity > 0.01;
    spearRoot.visible = visible;
    trailInstanced.visible = visible;

    if (visible) {
      spearRoot.position.copy(_pos);
      _quat.setFromUnitVectors(_forward, _dir);
      spearRoot.quaternion.copy(_quat);
      spearRoot.scale.setScalar(scale);

      // Sleek axial roll along flight tangent
      spearBody.rotation.x = elapsed * 2.1 + clampedP * Math.PI * 18.0;

      polishedGoldMat.opacity = opacity;
      burnishedGoldMat.opacity = opacity;
      wakeMat.uniforms.uTime.value = elapsed;
      wakeMat.uniforms.uOpacity.value = opacity * afterglowBoost;
      headHaloMat.uniforms.uOpacity.value = opacity * afterglowBoost;
      trailMat.uniforms.uOpacity.value = opacity * afterglowBoost;

      // Populate curved trailing afterglow embers slightly behind spear along active chapter curve
      for (let i = 0; i < trailCount; i++) {
        const lagFrac = (i + 1) / trailCount;
        const sampleU = Math.max(0, localU - lagFrac * 0.14);
        sampleChapterSpearPose(
          chapterIdx,
          sampleU,
          elapsed,
          pointerX,
          pointerY,
          _trailPos,
          _dir,
        );
        // Offset along tail vector slightly so embers stream out from behind the shaft
        const jitterAngle = elapsed * 2.5 + i * 1.9;
        const spread = lagFrac * 0.09;
        _trailDummy.position.set(
          _trailPos.x - _dir.x * (0.85 + lagFrac * 1.2) + Math.cos(jitterAngle) * spread,
          _trailPos.y - _dir.y * (0.85 + lagFrac * 1.2) + Math.sin(jitterAngle) * spread,
          _trailPos.z - _dir.z * (0.85 + lagFrac * 1.2),
        );
        const s = (1 - lagFrac * 0.78) * scale;
        _trailDummy.scale.setScalar(Math.max(0.05, s));
        _trailDummy.updateMatrix();
        trailInstanced.setMatrixAt(i, _trailDummy.matrix);
      }
      trailInstanced.instanceMatrix.needsUpdate = true;
    }

    // Chapter V directional sunlight beam (kept completely faithful to Chapter V)
    const ch5Focus =
      smoothstep(3.86, 4.1, scaled) * (1 - smoothstep(4.9, 5.14, scaled));
    ch5Anchor.visible = ch5Focus > 0.01;
    if (ch5Anchor.visible) {
      ch5Anchor.position.set(
        ch5Base[0] + pointerX * 0.14,
        ch5Base[1] + pointerY * 0.1,
        ch5Base[2] + 1.08,
      );
      const ch5U = clamp01(scaled - 4);
      const smoothCh5U = ch5U * ch5U * (3 - 2 * ch5U);
      sunRayMat.uniforms.uTime.value = elapsed;
      sunRayMat.uniforms.uSpearU.value = smoothCh5U;
      sunRayMat.uniforms.uIntensity.value = ch5Focus * 0.45;
    }
  };

  const dispose = () => {
    tipGeo.dispose();
    collarGeo.dispose();
    shaftGeo.dispose();
    ringGeo.dispose();
    tailSpireGeo.dispose();
    wakeGeo.dispose();
    headHaloGeo.dispose();
    trailGeo.dispose();
    sunRayGeo.dispose();
    polishedGoldMat.dispose();
    burnishedGoldMat.dispose();
    wakeMat.dispose();
    headHaloMat.dispose();
    trailMat.dispose();
    sunRayMat.dispose();
  };

  return { group, update, dispose };
}

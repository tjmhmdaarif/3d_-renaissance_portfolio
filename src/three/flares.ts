import * as THREE from 'three';
import type { FlareArchetype } from '../data/chapters';

export interface HeavenlyFlareHandle {
  group: THREE.Group;
  update: (
    elapsed: number,
    proximity: number,
    scrollVelocity: number,
    localProgress: number,
  ) => void;
  dispose: () => void;
}

interface FlareLayerPreset {
  color: string;
  coreColor: string;
  position: [number, number, number];
  rotationZ?: number;
  scale: [number, number];
  renderOrder: number;
  baseIntensity: number;
  coreSharpness: number;
  rayCount: number;
  rayStrength: number;
  raySpeed: number;
  streakStrength: number;
  beamAngle: number;
  beamSharpness: number;
  isVolumetricSunrays?: boolean;
}

let sharedUnitPlane: THREE.PlaneGeometry | null = null;
function getSharedUnitPlane(): THREE.PlaneGeometry {
  if (!sharedUnitPlane) {
    sharedUnitPlane = new THREE.PlaneGeometry(1, 1);
  }
  return sharedUnitPlane;
}

/**
 * Chapter I: Crisp golden-white sculpted chakra rays behind Helios's head/crown.
 * Rotated directly via mesh.rotation.z from scroll progress + gentle drift.
 */
function createRotatingChakraMaterial(
  preset: FlareLayerPreset,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(preset.color) },
      uCoreColor: { value: new THREE.Color(preset.coreColor) },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uVelocity: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uVelocity;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r >= 0.96) discard;

        float outerEnvelope = smoothstep(0.92, 0.24, r);
        float angle = atan(p.y, p.x);

        // Crisp 18-spoke golden-white chakra rays anchored to mesh local angle
        float mainRays = pow(0.5 + 0.5 * sin(angle * 18.0), 3.6);
        float subRays = pow(0.5 + 0.5 * sin(angle * 9.0 + 0.6), 2.4);
        float chakraRing = exp(-pow((r - 0.56) * 14.0, 2.0)) * 0.34;

        float radialDecay = exp(-r * 2.15) * smoothstep(0.08, 0.28, r);
        float shimmer = 0.9 + 0.1 * sin(uTime * 1.8 + angle * 6.0);
        float rays = (mainRays * 0.62 + subRays * 0.3 + chakraRing) * radialDecay * shimmer;

        float corona = exp(-r * 4.1) * 0.32 + exp(-r * 7.8) * 0.22;
        float lum = (rays * 0.78 + corona) * outerEnvelope * uIntensity;
        if (lum < 0.004) discard;

        float compressed = lum / (1.0 + lum * 0.88);
        vec3 col = mix(uColor, uCoreColor, clamp(mainRays * 0.55 + corona * 0.6, 0.0, 1.0));
        gl_FragColor = vec4(col * compressed, clamp(compressed, 0.0, 1.0));
      }
    `,
  });
}

function createOptimizedFlareMaterial(
  preset: FlareLayerPreset,
): THREE.ShaderMaterial {
  if (preset.isVolumetricSunrays) {
    return createRotatingChakraMaterial(preset);
  }

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(preset.color) },
      uCoreColor: { value: new THREE.Color(preset.coreColor) },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uVelocity: { value: 0 },
      uCoreSharpness: { value: preset.coreSharpness },
      uRayCount: { value: preset.rayCount },
      uRayStrength: { value: preset.rayStrength },
      uRaySpeed: { value: preset.raySpeed },
      uStreakStrength: { value: preset.streakStrength },
      uBeamAngle: { value: preset.beamAngle },
      uBeamSharpness: { value: preset.beamSharpness },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uCoreColor;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uVelocity;
      uniform float uCoreSharpness;
      uniform float uRayCount;
      uniform float uRayStrength;
      uniform float uRaySpeed;
      uniform float uStreakStrength;
      uniform float uBeamAngle;
      uniform float uBeamSharpness;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r >= 0.98) discard;

        float edgeFade = smoothstep(0.92, 0.26, r);
        float softHalo = exp(-r * 3.8) * 0.38;
        float hotCore = exp(-r * uCoreSharpness) * 0.4;

        float rayPattern = 0.0;
        if (uRayStrength > 0.005 && uRayCount > 0.5) {
          float angle = atan(p.y, p.x);
          float phase = uTime * uRaySpeed + uVelocity * 1.6;
          float raysA = sin(angle * uRayCount + phase) * 0.5 + 0.5;
          float raysB = sin(angle * (uRayCount * 0.5) - phase * 0.7) * 0.5 + 0.5;
          rayPattern = pow(raysA * 0.68 + raysB * 0.32, 2.4) * exp(-r * 2.4) * uRayStrength;
        }

        float anamorphic = 0.0;
        if (uStreakStrength > 0.005) {
          anamorphic = exp(-abs(p.y) * 18.0) * exp(-abs(p.x) * 2.3) * uStreakStrength;
        }

        float dirBeam = 0.0;
        if (uBeamSharpness > 0.01) {
          float ca = cos(uBeamAngle);
          float sa = sin(uBeamAngle);
          vec2 rp = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);
          float forwardMask = smoothstep(-0.1, 0.28, rp.x);
          float spread = 1.0 / (0.14 + max(0.0, rp.x) * 0.38);
          dirBeam = exp(-abs(rp.y) * spread * uBeamSharpness) * forwardMask * exp(-r * 1.05);
        }

        float lum = (softHalo + hotCore + rayPattern + anamorphic + dirBeam * 0.72) * edgeFade;
        lum *= uIntensity * (1.0 + min(0.28, uVelocity * 1.1));

        if (lum < 0.004) discard;

        float compressed = lum / (1.0 + lum * 0.86);
        vec3 tint = mix(uColor, uCoreColor, clamp(hotCore * 1.05, 0.0, 1.0));
        gl_FragColor = vec4(tint * compressed, clamp(compressed, 0.0, 1.0));
      }
    `,
  });
}

const _coolColor = new THREE.Color('#c8e1ff');
const _coolCore = new THREE.Color('#f4f9ff');
const _warmColor = new THREE.Color('#f5bc58');
const _warmCore = new THREE.Color('#fff2cf');

function getSceneFlarePresets(archetype: FlareArchetype): FlareLayerPreset[] {
  switch (archetype) {
    case 'corona':
      // Scene I (Helios): Centered right behind his head/crown at (-0.03, +0.46, -0.35)
      return [
        {
          color: '#eab24b',
          coreColor: '#fff1cc',
          position: [-0.03, 0.46, -0.35],
          scale: [6.0, 6.0],
          renderOrder: 2,
          baseIntensity: 0.43,
          coreSharpness: 7.4,
          rayCount: 18,
          rayStrength: 0.54,
          raySpeed: 0.12,
          streakStrength: 0.1,
          beamAngle: 0,
          beamSharpness: 0,
          isVolumetricSunrays: true,
        },
      ];

    case 'sweep':
      return [
        {
          color: '#edc06b',
          coreColor: '#ffefd0',
          position: [1.1, 0.78, -0.95],
          scale: [6.8, 5.2],
          renderOrder: 1,
          baseIntensity: 0.27,
          coreSharpness: 5.8,
          rayCount: 6,
          rayStrength: 0.18,
          raySpeed: 0.09,
          streakStrength: 0.24,
          beamAngle: -2.55,
          beamSharpness: 0.42,
        },
      ];

    case 'dual':
      // Chapter III: gentle cool-to-warm atmospheric sweep
      return [
        {
          color: '#b8d7f8',
          coreColor: '#edf5ff',
          position: [1.85, 0.32, -0.78],
          scale: [5.4, 4.8],
          renderOrder: 1,
          baseIntensity: 0.25,
          coreSharpness: 5.6,
          rayCount: 0,
          rayStrength: 0,
          raySpeed: 0,
          streakStrength: 0.16,
          beamAngle: 0,
          beamSharpness: 0,
        },
      ];

    case 'cupola':
      // Chapter IV: soft descending oculus god-ray shafts preserving cloud shadow depth
      return [
        {
          color: '#f2c679',
          coreColor: '#fff3d8',
          position: [0.0, 0.78, -0.25],
          scale: [7.0, 7.2],
          renderOrder: 16,
          baseIntensity: 0.29,
          coreSharpness: 6.4,
          rayCount: 10,
          rayStrength: 0.2,
          raySpeed: 0.06,
          streakStrength: 0.08,
          beamAngle: -Math.PI * 0.5,
          beamSharpness: 1.1,
        },
        {
          color: '#f5d292',
          coreColor: '#fff6e2',
          position: [-0.25, 0.65, 0.15],
          scale: [5.6, 6.4],
          renderOrder: 17,
          baseIntensity: 0.2,
          coreSharpness: 7.4,
          rayCount: 0,
          rayStrength: 0,
          raySpeed: 0,
          streakStrength: 0.04,
          beamAngle: -Math.PI * 0.42,
          beamSharpness: 1.4,
        },
        {
          color: '#f0c476',
          coreColor: '#fff1d4',
          position: [0.28, 0.65, 0.15],
          scale: [5.6, 6.4],
          renderOrder: 17,
          baseIntensity: 0.2,
          coreSharpness: 7.4,
          rayCount: 0,
          rayStrength: 0,
          raySpeed: 0,
          streakStrength: 0.04,
          beamAngle: -Math.PI * 0.58,
          beamSharpness: 1.4,
        },
      ];

    case 'beam':
      // Scene V (Solar Decree): gentle warm aura behind pointing figure
      return [
        {
          color: '#eab554',
          coreColor: '#ffefd0',
          position: [-1.05, 0.56, -0.78],
          scale: [5.0, 5.0],
          renderOrder: 1,
          baseIntensity: 0.22,
          coreSharpness: 6.6,
          rayCount: 8,
          rayStrength: 0.15,
          raySpeed: 0.09,
          streakStrength: 0.1,
          beamAngle: 0,
          beamSharpness: 0,
        },
      ];

    case 'spark':
      // Scene VI (Creation of Adam): delicate warm depth behind converging reliefs
      return [
        {
          color: '#edc06b',
          coreColor: '#fff0d1',
          position: [0.0, 0.0, -0.95],
          scale: [7.0, 4.8],
          renderOrder: 1,
          baseIntensity: 0.17,
          coreSharpness: 4.8,
          rayCount: 0,
          rayStrength: 0,
          raySpeed: 0,
          streakStrength: 0.1,
          beamAngle: 0,
          beamSharpness: 0,
        },
      ];
  }
}

export function buildHeavenlyFlareGroup(
  archetype: FlareArchetype,
): HeavenlyFlareHandle {
  const group = new THREE.Group();
  const presets = getSceneFlarePresets(archetype);
  const unitGeo = getSharedUnitPlane();
  const materials: THREE.ShaderMaterial[] = [];
  const meshes: THREE.Mesh[] = [];

  for (const preset of presets) {
    const mat = createOptimizedFlareMaterial(preset);
    const mesh = new THREE.Mesh(unitGeo, mat);
    mesh.position.set(...preset.position);
    if (preset.rotationZ) mesh.rotation.z = preset.rotationZ;
    mesh.scale.set(preset.scale[0], preset.scale[1], 1);
    mesh.renderOrder = preset.renderOrder;
    mesh.visible = false;
    group.add(mesh);
    materials.push(mat);
    meshes.push(mesh);
  }

  const update = (
    elapsed: number,
    proximity: number,
    scrollVelocity: number,
    localProgress: number,
  ) => {
    const active = proximity > 0.01;
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      mesh.visible = active;
      if (!active) continue;

      const preset = presets[i];
      const mat = materials[i];
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uVelocity.value = scrollVelocity;

      let sceneMultiplier = 1.0;

      if (archetype === 'corona') {
        // Scroll-driven chakra rotation synchronized with extracted Helios sunburst wheel
        mesh.rotation.z = -(localProgress * Math.PI * 1.2 + elapsed * 0.14);
      } else if (archetype === 'dual') {
        const t = Math.max(0, Math.min(1, localProgress));
        const smoothT = t * t * (3 - 2 * t);
        mesh.position.x = THREE.MathUtils.lerp(2.1, -2.1, smoothT);
        mesh.position.y = 0.26 + Math.sin(smoothT * Math.PI) * 0.14;
        mat.uniforms.uColor.value.copy(_coolColor).lerp(_warmColor, smoothT);
        mat.uniforms.uCoreColor.value.copy(_coolCore).lerp(_warmCore, smoothT);
        sceneMultiplier = 0.85 + 0.25 * Math.sin(smoothT * Math.PI);
      } else if (archetype === 'cupola') {
        sceneMultiplier = 0.85 + 0.15 * Math.sin(elapsed * 0.7 + i * 1.4);
      }

      mat.uniforms.uIntensity.value =
        proximity * preset.baseIntensity * sceneMultiplier;
    }
  };

  const dispose = () => {
    for (const m of materials) m.dispose();
  };

  return { group, update, dispose };
}

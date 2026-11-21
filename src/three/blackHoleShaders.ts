import * as THREE from 'three';

/**
 * Kerr Spinning Black Hole Accretion Disk with relativistic Doppler beaming:
 * - Approaching plasma side shifts hotter blue-white and beams brighter
 * - Receding plasma side shifts deeper crimson-amber
 */
export function createAccretionDiskMaterial(): {
  material: THREE.ShaderMaterial;
  uTime: { value: number };
  uOpacity: { value: number };
} {
  const uTime = { value: 0 };
  const uOpacity = { value: 0 };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime, uOpacity },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;
      void main() {
        vUv = uv;
        vLocalPos = position;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vLocalPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 p = vLocalPos.xy;
        float r = length(p);
        // Normalized disk span from ISCO (r=2.1) to outer edge (r=11.0)
        float rn = (r - 2.1) / 8.9;
        if (rn < 0.0 || rn > 1.0) discard;

        float angle = atan(p.y, p.x);
        float keplerSpin = uTime * (1.8 / pow(max(0.25, rn + 0.15), 1.3));
        float spiral = noise2(vec2(rn * 12.0, angle * 3.0 + keplerSpin * 0.45));
        float fineSpiral = noise2(vec2(rn * 28.0 - uTime * 0.4, angle * 6.0 + keplerSpin * 0.7));

        // Relativistic Doppler beaming based on tangent velocity vs camera view vector
        vec3 tangentLocal = normalize(vec3(-p.y, p.x, 0.0));
        vec3 tangentWorld = normalize(mat3(modelMatrix) * tangentLocal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float doppler = dot(tangentWorld, viewDir); // +1 approaching, -1 receding
        float beaming = pow(clamp(1.0 + doppler * 0.45, 0.35, 1.65), 2.4);

        vec3 hotInner = vec3(0.78, 0.92, 1.0);
        vec3 approachingTint = vec3(0.92, 0.96, 1.0);
        vec3 recedingTint = vec3(0.95, 0.28, 0.06);
        vec3 midAmber = vec3(1.0, 0.62, 0.18);

        vec3 tempColor = mix(midAmber, hotInner, exp(-rn * 3.2));
        vec3 dopplerColor = mix(recedingTint, approachingTint, smoothstep(-0.7, 0.7, doppler));
        vec3 col = mix(tempColor, dopplerColor, 0.55) * beaming;

        float radialEnvelope = smoothstep(0.0, 0.08, rn) * pow(1.0 - rn, 1.6);
        float density = (0.45 + 0.55 * (spiral * 0.6 + fineSpiral * 0.4)) * radialEnvelope;

        gl_FragColor = vec4(col * density * 1.35, density * uOpacity);
      }
    `,
  });

  return { material, uTime, uOpacity };
}

/**
 * Gravitational Lensing Einstein Ring & Photon Sphere halo warping background light
 * around the Kerr Black Hole's Event Horizon shadow.
 */
export function createGravitationalLensMaterial(): {
  material: THREE.ShaderMaterial;
  uTime: { value: number };
  uOpacity: { value: number };
} {
  const uTime = { value: 0 };
  const uOpacity = { value: 0 };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime, uOpacity },
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
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float angle = atan(p.y, p.x);

        // Razor-sharp photon sphere ring at r = 0.36
        float photonRing = exp(-pow((r - 0.36) * 26.0, 2.0)) * 1.45;
        // Upper and lower bent lensed accretion arches
        float einsteinArc = exp(-pow((r - 0.44) * 9.5, 2.0)) * (0.55 + 0.45 * abs(sin(angle)));
        // Relativistic star-warping shimmer
        float shimmer = 0.85 + 0.15 * sin(angle * 7.0 - uTime * 2.2);

        vec3 col = mix(vec3(1.0, 0.55, 0.18), vec3(0.82, 0.93, 1.0), smoothstep(0.55, 0.35, r));
        float lum = (photonRing + einsteinArc * 0.65) * shimmer * smoothstep(1.0, 0.6, r);

        gl_FragColor = vec4(col * lum, clamp(lum, 0.0, 1.0) * uOpacity);
      }
    `,
  });

  return { material, uTime, uOpacity };
}

/**
 * Expanding multi-wavelength Big Bang CMB & Plasma Shockwave sphere.
 */
export function createBigBangShockwaveMaterial(): {
  material: THREE.ShaderMaterial;
  uTime: { value: number };
  uProgress: { value: number };
  uOpacity: { value: number };
} {
  const uTime = { value: 0 };
  const uProgress = { value: 0 };
  const uOpacity = { value: 0 };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime, uProgress, uOpacity },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vLocalPos;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vLocalPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uProgress;
      uniform float uOpacity;
      varying vec3 vNormalW;
      varying vec3 vLocalPos;

      float hash3(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise3(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
              mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
              mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
          f.z
        );
      }

      void main() {
        float cmb = noise3(vLocalPos * 7.5 + vec3(uTime * 0.25)) * 0.6 +
                    noise3(vLocalPos * 16.0 - vec3(uTime * 0.4)) * 0.4;
        // Multi-wavelength CMB acoustic spectrum (cyan-blue cold pockets, gold-crimson hot plasma)
        vec3 cold = vec3(0.18, 0.65, 0.98);
        vec3 hot = vec3(1.0, 0.68, 0.22);
        vec3 planckWhite = vec3(1.0, 0.98, 0.94);

        vec3 col = mix(cold, hot, smoothstep(0.32, 0.72, cmb));
        col = mix(planckWhite, col, smoothstep(0.0, 0.55, uProgress));

        gl_FragColor = vec4(col * 1.4, (0.45 + 0.55 * cmb) * uOpacity);
      }
    `,
  });

  return { material, uTime, uProgress, uOpacity };
}

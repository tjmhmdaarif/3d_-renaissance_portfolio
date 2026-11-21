import * as THREE from 'three';

/**
 * Shared GLSL snippet for Roche limit spaghettification toward the Kerr Black Hole.
 * Projects vertices along `uTidalDir` with radial elongation + transverse necking
 * when `uTidalStretch > 0`.
 */
const TIDAL_VERTEX_CHUNK = `
  uniform vec3 uTidalDir;
  uniform float uTidalStretch;
`;

const TIDAL_TRANSFORM_CHUNK = `
  if (uTidalStretch > 0.001) {
    float proj = dot(transformed, uTidalDir);
    vec3 perp = transformed - uTidalDir * proj;
    transformed = uTidalDir * (proj * (1.0 + uTidalStretch * 2.4)) + perp * (1.0 / (1.0 + uTidalStretch * 0.55));
  }
`;

export interface TidalUniformTarget {
  uTidalDir: { value: THREE.Vector3 };
  uTidalStretch: { value: number };
}

/**
 * Earth Surface PBR material extended with dark-side city night-lights
 * computed dynamically from the Sun direction vector + Roche tidal stretching.
 */
export function createEarthSurfaceMaterial(
  albedoMap: THREE.Texture,
  bumpMap: THREE.Texture,
  specularMap: THREE.Texture,
  nightMap: THREE.Texture,
): { material: THREE.MeshStandardMaterial; uniforms: TidalUniformTarget & { uSunPos: { value: THREE.Vector3 } } } {
  const uniforms = {
    uNightMap: { value: nightMap },
    uSunPos: { value: new THREE.Vector3(0, 0, 0) },
    uTidalDir: { value: new THREE.Vector3(1, 0, 0) },
    uTidalStretch: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    map: albedoMap,
    bumpMap,
    bumpScale: 0.035,
    roughnessMap: specularMap,
    roughness: 0.85,
    metalness: 0.14,
    envMapIntensity: 0.9,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNightMap = uniforms.uNightMap;
    shader.uniforms.uSunPos = uniforms.uSunPos;
    shader.uniforms.uTidalDir = uniforms.uTidalDir;
    shader.uniforms.uTidalStretch = uniforms.uTidalStretch;

    shader.vertexShader =
      TIDAL_VERTEX_CHUNK +
      `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vEarthUv;
      \n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      ${TIDAL_TRANSFORM_CHUNK}
      vEarthUv = uv;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `,
    );

    shader.fragmentShader =
      `
      uniform sampler2D uNightMap;
      uniform vec3 uSunPos;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec2 vEarthUv;
      \n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      vec3 sunDir = normalize(uSunPos - vWorldPos);
      float ndotl = dot(normalize(vWorldNormal), sunDir);
      float nightMask = smoothstep(0.10, -0.22, ndotl);
      vec3 cityGlow = texture2D(uNightMap, vEarthUv).rgb * nightMask * 1.85;
      totalEmissiveRadiance += cityGlow;
      `,
    );
  };

  return { material, uniforms };
}

/**
 * Standard planet PBR material with Roche limit tidal stretching support
 * and optional Jupiter differential latitudinal jet-stream shearing.
 */
export function createPlanetSurfaceMaterial(
  albedoMap: THREE.Texture,
  options: {
    bumpMap?: THREE.Texture;
    bumpScale?: number;
    roughness?: number;
    metalness?: number;
    differentialShear?: boolean;
  } = {},
): {
  material: THREE.MeshStandardMaterial;
  uniforms: TidalUniformTarget & { uTime: { value: number } };
} {
  const uniforms = {
    uTidalDir: { value: new THREE.Vector3(1, 0, 0) },
    uTidalStretch: { value: 0 },
    uTime: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    map: albedoMap,
    bumpMap: options.bumpMap,
    bumpScale: options.bumpScale ?? 0.025,
    roughness: options.roughness ?? 0.8,
    metalness: options.metalness ?? 0.04,
    envMapIntensity: 0.45,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTidalDir = uniforms.uTidalDir;
    shader.uniforms.uTidalStretch = uniforms.uTidalStretch;
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader =
      TIDAL_VERTEX_CHUNK +
      `varying vec2 vPlanetUv;\n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      ${TIDAL_TRANSFORM_CHUNK}
      vPlanetUv = uv;
      `,
    );

    if (options.differentialShear) {
      shader.fragmentShader =
        `
        uniform float uTime;
        varying vec2 vPlanetUv;
        \n` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #ifdef USE_MAP
          float latShear = sin(vPlanetUv.y * 22.0) * 0.018 * sin(uTime * 0.25);
          vec4 sampledDiffuseColor = texture2D(map, vec2(fract(vPlanetUv.x + latShear), vPlanetUv.y));
          diffuseColor *= sampledDiffuseColor;
        #endif
        `,
      );
    }
  };

  return { material, uniforms };
}

/**
 * Rayleigh / Fresnel atmospheric scattering halo around planets.
 */
export function createAtmosphereHaloMaterial(
  colorHex: string,
  power = 3.2,
  intensity = 0.85,
): { material: THREE.ShaderMaterial; uSunPos: { value: THREE.Vector3 } } {
  const uSunPos = { value: new THREE.Vector3(0, 0, 0) };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uPower: { value: power },
      uIntensity: { value: intensity },
      uSunPos,
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      uniform vec3 uSunPos;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosW);
        vec3 sunDir = normalize(uSunPos - vPosW);
        float rim = pow(clamp(0.68 - dot(vNormalW, -viewDir), 0.0, 1.0), uPower);
        float daySide = smoothstep(-0.35, 0.55, dot(vNormalW, sunDir));
        float alpha = rim * uIntensity * (0.22 + 0.78 * daySide);
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
  });

  return { material, uSunPos };
}

/**
 * Saturn & Uranus ring shader featuring real-time ray-sphere planetary shadow
 * cast across the translucent ice-particle rings.
 */
export function createPlanetaryRingMaterial(
  ringTex: THREE.Texture,
  planetRadius: number,
  oblateness: number,
  tintHex = '#ffffff',
  opacity = 0.94,
): {
  material: THREE.ShaderMaterial;
  uPlanetPos: { value: THREE.Vector3 };
  uSunPos: { value: THREE.Vector3 };
} {
  const uPlanetPos = { value: new THREE.Vector3() };
  const uSunPos = { value: new THREE.Vector3(0, 0, 0) };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uRingMap: { value: ringTex },
      uPlanetPos,
      uSunPos,
      uPlanetRadius: { value: planetRadius },
      uOblate: { value: oblateness },
      uTint: { value: new THREE.Color(tintHex) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uRingMap;
      uniform vec3 uPlanetPos;
      uniform vec3 uSunPos;
      uniform float uPlanetRadius;
      uniform float uOblate;
      uniform vec3 uTint;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vec4 tex = texture2D(uRingMap, vec2(vUv.x, 0.5));
        if (tex.a < 0.02) discard;

        // Ray-sphere intersection from ring point toward Sun against oblate Saturn
        vec3 toSun = normalize(uSunPos - vWorldPos);
        vec3 oc = (vWorldPos - uPlanetPos) / vec3(1.0, uOblate, 1.0);
        vec3 dir = normalize(toSun / vec3(1.0, uOblate, 1.0));
        float b = dot(oc, dir);
        float c = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
        float disc = b * b - c;
        float shadow = 1.0;
        if (disc > 0.0 && b < 0.0) {
          float penumbra = smoothstep(0.0, uPlanetRadius * 0.14, sqrt(disc));
          shadow = mix(1.0, 0.08, penumbra);
        }

        gl_FragColor = vec4(tex.rgb * uTint * shadow, tex.a * uOpacity);
      }
    `,
  });

  return { material, uPlanetPos, uSunPos };
}

/**
 * The Sun (Sol): Multi-octave animated photosphere granulation + magnetic sunspot pairs
 * + solar limb darkening.
 */
export function createSunPhotosphereMaterial(): {
  material: THREE.ShaderMaterial;
  uTime: { value: number };
} {
  const uTime = { value: 0 };
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vLocalPos = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;

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

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise3(p);
          p = p * 2.08 + vec3(0.17, 0.31, 0.23);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 p = vLocalPos * 5.2 + vec3(uTime * 0.04, -uTime * 0.03, uTime * 0.02);
        float gran = fbm(p * 2.6);
        float superGran = fbm(vLocalPos * 3.0 - vec3(uTime * 0.015));

        // Magnetic sunspot pairs near solar equatorial belts
        float spotField = fbm(vLocalPos * 4.5 + vec3(0.0, uTime * 0.01, 0.0));
        float eqMask = exp(-abs(vLocalPos.y) * 4.5);
        float sunspot = smoothstep(0.72, 0.82, spotField * (0.65 + 0.45 * eqMask));

        vec3 coreWhite = vec3(1.0, 0.96, 0.82);
        vec3 photosphereGold = vec3(1.0, 0.62, 0.14);
        vec3 deepUmbra = vec3(0.32, 0.06, 0.01);

        vec3 col = mix(photosphereGold, coreWhite, smoothstep(0.38, 0.78, gran * 0.65 + superGran * 0.35));
        col = mix(col, deepUmbra, sunspot * 0.82);

        // Solar limb darkening
        float ndotv = clamp(dot(normalize(vNormal), normalize(vViewPos)), 0.0, 1.0);
        float limb = pow(ndotv, 0.45);
        col *= 0.55 + 0.65 * limb;

        gl_FragColor = vec4(col * 1.45, 1.0);
      }
    `,
  });
  return { material, uTime };
}

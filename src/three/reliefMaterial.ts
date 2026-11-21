import * as THREE from 'three';

export interface ReliefMaterialHandle {
  material: THREE.MeshStandardMaterial;
  setReliefStrength: (strength: number) => void;
  setOpacity: (opacity: number) => void;
  setTime: (t: number) => void;
  setTexture: (tex: THREE.Texture, aspect: number) => void;
}

/**
 * Creates a concave spherical 3D vault/cupola geometry for Chapter IV (Council of Olympus)
 * so the ceiling fresco recesses genuinely overhead like an architectural Baroque dome,
 * with forward-curving outer cloud rings and zero UV pole distortion.
 */
export function createConcaveVaultGeometry(
  width: number,
  height: number,
  segX = 180,
  segY = 180,
  domeDepth = 1.65,
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);
    // Center the dome cavity near the cupola oculus (u=0.5, v=0.68)
    const dx = (u - 0.5) * 2.0;
    const dy = (v - 0.64) * 2.0;
    const r2 = Math.min(1.35, dx * dx * 0.72 + dy * dy * 0.85);
    const bowl = Math.max(0, 1.0 - r2 / 1.2);
    // Deep recessed dome at center (-Z) curving forward toward outer cloud tiers (+Z)
    const z = -domeDepth * Math.pow(bowl, 1.35) + (1.0 - bowl) * 0.42;
    pos.setZ(i, z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Cleanly sculpted 3D foreground relief shader:
 * - Outer transparent vertices remain at z = 0.0 (zero stretched edge triangles)
 * - Fragment shader discards pixels where texel.a < 0.14
 * - Forward Z-extrusion modulated smoothly via smoothstep(0.14, 0.86, texel.a)
 *   so extracted figures swell organically out of the clouds with golden rim lighting.
 */
export function createFrescoReliefMaterial(
  initialMap: THREE.Texture,
  initialStrength = 0.85,
): ReliefMaterialHandle {
  const uniforms = {
    uReliefMap: { value: initialMap },
    uReliefStrength: { value: initialStrength },
    uOpacity: { value: 1.0 },
    uTexelSize: { value: new THREE.Vector2(1 / 1024, 1 / 768) },
    uTime: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    map: initialMap,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: true,
    side: THREE.DoubleSide,
    roughness: 0.64,
    metalness: 0.06,
    envMapIntensity: 0.36,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReliefMap = uniforms.uReliefMap;
    shader.uniforms.uReliefStrength = uniforms.uReliefStrength;
    shader.uniforms.uOpacity = uniforms.uOpacity;
    shader.uniforms.uTexelSize = uniforms.uTexelSize;
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader =
      `
      uniform sampler2D uReliefMap;
      uniform float uReliefStrength;
      uniform vec2 uTexelSize;
      varying float vReliefLuma;
      varying float vReliefContrast;
      varying float vCutoutBevel;

      vec4 sampleRelief(vec2 p) {
        return texture2D(uReliefMap, clamp(p, 0.002, 0.998));
      }

      float reliefHeight(vec2 p, out float alphaOut) {
        vec4 s = sampleRelief(p);
        alphaOut = s.a;
        return dot(s.rgb, vec3(0.299, 0.587, 0.114)) * s.a;
      }
      \n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      float aC, aL, aR, aD, aU;
      float hC = reliefHeight(uv, aC);
      float hL = reliefHeight(uv - vec2(uTexelSize.x * 2.5, 0.0), aL);
      float hR = reliefHeight(uv + vec2(uTexelSize.x * 2.5, 0.0), aR);
      float hD = reliefHeight(uv - vec2(0.0, uTexelSize.y * 2.5), aD);
      float hU = reliefHeight(uv + vec2(0.0, uTexelSize.y * 2.5), aU);

      float aFarL, aFarR, aFarD, aFarU;
      float hFarL = reliefHeight(uv - vec2(uTexelSize.x * 8.0, 0.0), aFarL);
      float hFarR = reliefHeight(uv + vec2(uTexelSize.x * 8.0, 0.0), aFarR);
      float hFarD = reliefHeight(uv - vec2(0.0, uTexelSize.y * 8.0), aFarD);
      float hFarU = reliefHeight(uv + vec2(0.0, uTexelSize.y * 8.0), aFarU);

      float edgeBevel = clamp((aC + aL + aR + aD + aU + aFarL + aFarR + aFarD + aFarU) / 9.0, 0.0, 1.0);
      float localAvg = (hL + hR + hD + hU) * 0.25;
      float contrast = clamp(abs(hC - localAvg) * 4.2, 0.0, 1.0);

      float dX = ((hL - hR) * 2.1 + (hFarL - hFarR) * 0.95 + (aL - aR) * 1.15) * uReliefStrength;
      float dY = ((hD - hU) * 2.1 + (hFarD - hFarU) * 0.95 + (aD - aU) * 1.15) * uReliefStrength;
      objectNormal = normalize(vec3(objectNormal.x + dX, objectNormal.y + dY, objectNormal.z));

      vReliefLuma = hC;
      vReliefContrast = contrast;
      vCutoutBevel = edgeBevel;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec4 centerSample = sampleRelief(uv);
      float alphaLift = smoothstep(0.14, 0.86, centerSample.a);
      vec2 centered = (uv - 0.5) * 2.0;
      float anatomicalBulge = max(0.0, 1.0 - dot(centered, centered) * 0.5);
      float heightMap = 0.22 + vReliefLuma * 0.44 + vReliefContrast * 0.22 + anatomicalBulge * 0.28;
      transformed.z += heightMap * alphaLift * uReliefStrength;
      `,
    );

    shader.fragmentShader =
      `
      uniform float uReliefStrength;
      uniform float uOpacity;
      uniform float uTime;
      varying float vReliefLuma;
      varying float vReliefContrast;
      varying float vCutoutBevel;
      \n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      if (diffuseColor.a < 0.14) discard;

      float rimBevelHighlight = (1.0 - smoothstep(0.38, 0.94, vCutoutBevel)) * 0.055 * clamp(uReliefStrength, 0.0, 1.0);
      float microSculpt = 1.0 + (vReliefLuma - 0.5) * 0.06 + vReliefContrast * 0.1;
      float reliefLift = mix(1.0, clamp(microSculpt, 0.9, 1.12), clamp(uReliefStrength, 0.0, 1.0));
      diffuseColor.rgb = diffuseColor.rgb * reliefLift + vec3(0.9, 0.72, 0.42) * rimBevelHighlight;
      diffuseColor.a *= uOpacity;
      `,
    );
  };

  material.customProgramCacheKey = () => 'fresco-clean-extrusion-v6';

  return {
    material,
    setReliefStrength: (strength: number) => {
      uniforms.uReliefStrength.value = strength;
    },
    setOpacity: (opacity: number) => {
      uniforms.uOpacity.value = opacity;
    },
    setTime: (t: number) => {
      uniforms.uTime.value = t;
    },
    setTexture: (tex: THREE.Texture, aspect: number) => {
      material.map = tex;
      uniforms.uReliefMap.value = tex;
      uniforms.uTexelSize.value.set(
        1 / 1024,
        1 / Math.max(512, Math.round(1024 / aspect)),
      );
      material.needsUpdate = true;
    },
  };
}

export interface CloudBackdropHandle {
  material: THREE.ShaderMaterial;
  setTexture: (tex: THREE.Texture) => void;
  setParallax: (x: number, y: number, time: number, scrollBoost: number) => void;
}

export function createCloudBackdropMaterial(
  initialMap: THREE.Texture,
): CloudBackdropHandle {
  const uniforms = {
    uMap: { value: initialMap },
    uParallax: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uScrollBoost: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uParallax;
      uniform float uTime;
      uniform float uScrollBoost;
      varying vec2 vUv;

      void main() {
        vec2 uv = (vUv - 0.5) * 0.86 + 0.5;
        uv += uParallax * 0.032;
        uv.x += sin(uTime * 0.06) * 0.008;
        uv.y += cos(uTime * 0.045) * 0.005;
        uv = clamp(uv, 0.002, 0.998);

        vec4 tex = texture2D(uMap, uv);

        float dist = distance(vUv, vec2(0.5, 0.48));
        float vig = smoothstep(0.38, 1.04, dist);
        vec3 warmShadow = vec3(0.09, 0.07, 0.052);
        vec3 col = mix(tex.rgb * 0.94, tex.rgb * 0.72 + warmShadow * 0.28, vig * 0.42);

        float sunGlow = exp(-distance(vUv, vec2(0.51, 0.64)) * 3.1);
        col += vec3(0.095, 0.068, 0.032) * sunGlow * (0.8 + 0.15 * sin(uTime * 0.5) + uScrollBoost * 0.35);

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  return {
    material,
    setTexture: (tex: THREE.Texture) => {
      uniforms.uMap.value = tex;
    },
    setParallax: (x: number, y: number, time: number, scrollBoost: number) => {
      uniforms.uParallax.value.set(x, y);
      uniforms.uTime.value = time;
      uniforms.uScrollBoost.value = scrollBoost;
    },
  };
}

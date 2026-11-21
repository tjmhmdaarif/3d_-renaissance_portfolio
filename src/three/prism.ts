import * as THREE from 'three';

export interface CreationLightPrismHandle {
  group: THREE.Group;
  update: (elapsed: number, proximity: number, localProgress: number) => void;
  dispose: () => void;
}

/**
 * Radiant Ethereal Light Prism igniting at the exact fingertip contact point
 * during Chapter VI's finale (92% -> 100%):
 * - Crystalline diamond octahedron core with iridescent Fresnel refraction
 * - Spectral dispersion rays fanning subtle gold, rose, cyan & pearl-white beams
 * - Expanding warm heavenly volumetric corona
 */
export function buildCreationLightPrism(): CreationLightPrismHandle {
  const group = new THREE.Group();

  // 1. Crystalline Diamond Core (translucent iridescent Fresnel)
  const diamondGeo = new THREE.OctahedronGeometry(0.18, 0);
  diamondGeo.scale(0.85, 1.35, 0.85);
  const diamondMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        vLocalPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewDir);
        float fresnel = pow(1.0 - abs(dot(N, V)), 1.8);
        float phase = vLocalPos.y * 8.0 + vLocalPos.x * 6.0 + uTime * 2.4;

        // Subtle spectral prism palette (gold, rose, cyan, pearl)
        vec3 gold = vec3(1.0, 0.88, 0.56);
        vec3 rose = vec3(1.0, 0.72, 0.82);
        vec3 cyan = vec3(0.66, 0.92, 1.0);
        vec3 spectral = mix(gold, mix(rose, cyan, 0.5 + 0.5 * sin(phase)), 0.45);

        vec3 col = mix(vec3(1.0, 0.98, 0.94), spectral, clamp(fresnel * 1.1, 0.0, 1.0));
        float alpha = clamp((0.28 + fresnel * 0.72) * uIntensity, 0.0, 1.0);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col * alpha * 0.95, alpha);
      }
    `,
  });

  const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
  diamondMesh.renderOrder = 24;
  group.add(diamondMesh);

  // 2. Concentrated Prismatic Spectral Refraction Rays & Jewel-Like Corona
  const prismPlaneGeo = new THREE.PlaneGeometry(4.1, 4.1);
  const prismRayMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
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
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        if (r >= 0.98) discard;

        float outerFade = smoothstep(0.88, 0.16, r);
        float angle = atan(p.y, p.x);

        // Diamond 4-point star flare + delicate spectral dispersion spikes
        float crossH = exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 2.8) * 0.78;
        float crossV = exp(-abs(p.x) * 24.0) * exp(-abs(p.y) * 2.8) * 0.78;
        float diagA = exp(-abs(p.x - p.y) * 18.0) * exp(-r * 2.8) * 0.42;
        float diagB = exp(-abs(p.x + p.y) * 18.0) * exp(-r * 2.8) * 0.42;

        float rays = pow(0.5 + 0.5 * sin(angle * 12.0 + uTime * 0.45), 3.0) * exp(-r * 3.0) * 0.38;
        float core = exp(-r * 11.5) * 0.86 + exp(-r * 4.2) * 0.28;

        // Subtle chromatic angle dispersion (gold / rose / cyan / pearl)
        vec3 gold = vec3(1.0, 0.88, 0.58);
        vec3 rose = vec3(0.98, 0.72, 0.82);
        vec3 cyan = vec3(0.68, 0.91, 1.0);
        vec3 pearl = vec3(1.0, 0.98, 0.94);

        float hueWave = sin(angle * 3.0 - uTime * 0.6);
        vec3 prismTint = mix(gold, mix(rose, cyan, 0.5 + 0.5 * hueWave), smoothstep(0.06, 0.48, r) * 0.56);
        vec3 finalCol = mix(pearl, prismTint, clamp(r * 1.45, 0.0, 1.0));

        float lum = (core + crossH + crossV + diagA + diagB + rays) * outerFade * uIntensity * 0.76;
        if (lum < 0.004) discard;

        float compressed = lum / (1.0 + lum * 0.85);
        gl_FragColor = vec4(finalCol * compressed, clamp(compressed, 0.0, 1.0));
      }
    `,
  });

  const prismRayMesh = new THREE.Mesh(prismPlaneGeo, prismRayMat);
  prismRayMesh.position.set(0, 0, -0.02);
  prismRayMesh.renderOrder = 23;
  group.add(prismRayMesh);

  group.position.set(0, 0, 0.42);
  group.visible = false;

  const update = (elapsed: number, proximity: number, localProgress: number) => {
    // Ignite prism smoothly as fingertips converge (localProgress ~ 0.53 -> 1.0, i.e. 92% -> 100%)
    const touchWindow = THREE.MathUtils.smoothstep(localProgress, 0.52, 0.86);
    const intensity = proximity * touchWindow;
    const active = intensity > 0.008;
    group.visible = active;
    if (!active) return;

    const breathe = 0.94 + 0.08 * Math.sin(elapsed * 2.4);
    const scale = (0.45 + 0.68 * touchWindow) * breathe;

    diamondMesh.rotation.y = elapsed * 0.85;
    diamondMesh.rotation.z = Math.sin(elapsed * 0.5) * 0.25;
    diamondMesh.scale.setScalar(0.55 + 0.55 * touchWindow);

    prismRayMesh.scale.setScalar(scale);

    diamondMat.uniforms.uTime.value = elapsed;
    diamondMat.uniforms.uIntensity.value = intensity;
    prismRayMat.uniforms.uTime.value = elapsed;
    prismRayMat.uniforms.uIntensity.value = intensity;
  };

  const dispose = () => {
    diamondGeo.dispose();
    diamondMat.dispose();
    prismPlaneGeo.dispose();
    prismRayMat.dispose();
  };

  return { group, update, dispose };
}

import { type MutableRefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  PLANET_SPECS,
  type PlanetId,
  type PlanetSpec,
  auToSimRadius,
  keplerOmega,
  solveKeplerPosition,
} from '../data/solarSystem';
import { createAsteroidsAndCometSystem } from './asteroidsAndComet';
import {
  createAccretionDiskMaterial,
  createBigBangShockwaveMaterial,
  createGravitationalLensMaterial,
} from './blackHoleShaders';
import {
  type TidalUniformTarget,
  createAtmosphereHaloMaterial,
  createEarthSurfaceMaterial,
  createPlanetSurfaceMaterial,
  createPlanetaryRingMaterial,
  createSunPhotosphereMaterial,
} from './planetShaders';
import { buildAllPlanetTextures } from './proceduralTextures';

interface SolarSystemCanvasProps {
  targetProgressRef: MutableRefObject<number>;
  timeScale: 1 | 100 | 1000;
  showOrbits: boolean;
  onSyncProgress: (smoothedProgress: number) => void;
  onReady: () => void;
}

function makeRadialSpriteTexture(
  innerColor: string,
  midColor: string,
  outerColor: string,
  size = 128,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.32, midColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeShadowDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(3, 4, 8, 0.94)');
  grad.addColorStop(0.55, 'rgba(5, 6, 10, 0.65)');
  grad.addColorStop(1, 'rgba(5, 6, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function createIrregularMoonGeo(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      0.84 +
      0.16 * Math.sin(v.x * 3.7 + v.y * 2.1) +
      0.1 * Math.cos(v.z * 4.5 - v.x * 2.3);
    v.multiplyScalar(n);
    v.x *= 1.28;
    v.y *= 0.86;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

interface MoonAssembly {
  spec: PlanetSpec['moons'][number];
  orbitPivot: THREE.Group;
  mesh: THREE.Mesh;
  phase: number;
  halo?: THREE.Mesh;
}

interface PlanetAssembly {
  spec: PlanetSpec;
  root: THREE.Group;
  tiltGroup: THREE.Group;
  surfaceMesh: THREE.Mesh;
  meanAnomaly: number;
  tidalUniforms: TidalUniformTarget;
  timeUniform?: { value: number };
  sunUniforms: Array<{ value: THREE.Vector3 }>;
  cloudPrimary?: THREE.Mesh;
  cloudSecondary?: THREE.Mesh;
  cloudShadow?: THREE.Mesh;
  ringPlanetUniform?: { value: THREE.Vector3 };
  ringMat?: THREE.ShaderMaterial;
  saturnIceParticles?: THREE.Points;
  moons: MoonAssembly[];
  worldPos: THREE.Vector3;
}

export function SolarSystemCanvas({
  targetProgressRef,
  timeScale,
  showOrbits,
  onSyncProgress,
  onReady,
}: SolarSystemCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const timeScaleRef = useRef<1 | 100 | 1000>(timeScale);
  const showOrbitsRef = useRef<boolean>(showOrbits);
  const onSyncProgressRef = useRef(onSyncProgress);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    timeScaleRef.current = timeScale;
  }, [timeScale]);

  useEffect(() => {
    showOrbitsRef.current = showOrbits;
  }, [showOrbits]);

  useEffect(() => {
    onSyncProgressRef.current = onSyncProgress;
  }, [onSyncProgress]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // Probe software WebGL (SwiftShader / llvmpipe) to pace GPU fence synchronization
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererString = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(rendererString);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1400);
    camera.position.set(0, 12, 185);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.22;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // ResizeObserver for crisp canvas sizing
    const updateSize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    // Lighting: True heliocentric point light casting sharp planet/moon terminators + subtle fill
    const sunPos = new THREE.Vector3(0, 0, 0);
    const sunLight = new THREE.PointLight(0xfff4e0, 3.4, 0, 0);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const galacticFill = new THREE.AmbientLight(0x141b2d, 0.35);
    scene.add(galacticFill);

    // 1. DEEP COSMIC STARFIELD + MILKY WAY BAND
    const starCount = 3400;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const spectralColors = [
      new THREE.Color(0x9bb8ff), // O/B blue-white
      new THREE.Color(0xcad8ff), // A white
      new THREE.Color(0xf8f7ff), // F crisp white
      new THREE.Color(0xfff4e8), // G yellow-white
      new THREE.Color(0xffd2a1), // K amber
      new THREE.Color(0xffb56c), // M orange-red
    ];
    for (let i = 0; i < starCount; i++) {
      const inBand = i < 1500;
      const u = Math.sin(i * 12.9898) * 43758.5453;
      const r1 = u - Math.floor(u);
      const v = Math.sin(i * 78.233) * 43758.5453;
      const r2 = v - Math.floor(v);
      const w = Math.sin(i * 45.164) * 43758.5453;
      const r3 = w - Math.floor(w);

      const theta = r1 * Math.PI * 2;
      const phi = inBand
        ? Math.PI / 2 + (r2 - 0.5) * 0.42
        : Math.acos(2 * r2 - 1);
      const dist = 360 + r3 * 220;

      let x = dist * Math.sin(phi) * Math.cos(theta);
      let y = dist * Math.cos(phi);
      let z = dist * Math.sin(phi) * Math.sin(theta);

      if (inBand) {
        // Tilt Milky Way plane by 34 degrees
        const tilt = 0.59;
        const ny = y * Math.cos(tilt) - z * Math.sin(tilt);
        const nz = y * Math.sin(tilt) + z * Math.cos(tilt);
        y = ny;
        z = nz;
      }

      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;

      const c = spectralColors[i % spectralColors.length];
      const lum = 0.55 + r3 * 0.45;
      starCol[i * 3] = c.r * lum;
      starCol[i * 3 + 1] = c.g * lum;
      starCol[i * 3 + 2] = c.b * lum;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.25,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 2. THE SUN (SOL): Photosphere Shader + 3D CME Plasma Loops + Solar Wind + Corona
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    const sunRadius = 4.7;
    const sunGeo = new THREE.SphereGeometry(sunRadius, 64, 64);
    const sunShader = createSunPhotosphereMaterial();
    const sunMesh = new THREE.Mesh(sunGeo, sunShader.material);
    sunGroup.add(sunMesh);

    const coronaTex = makeRadialSpriteTexture(
      'rgba(255, 248, 220, 0.92)',
      'rgba(255, 165, 45, 0.36)',
      'rgba(255, 95, 15, 0)',
      256,
    );
    const coronaSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coronaTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    coronaSprite.scale.set(22, 22, 1);
    sunGroup.add(coronaSprite);

    // 5 arching 3D CME magnetic plasma prominence loops
    const cmeLoops: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
    const cmeGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + 0.4;
      const lat = (i % 2 === 0 ? 1 : -1) * (0.25 + i * 0.08);
      const span = 0.34;
      const archH = sunRadius * (1.28 + (i % 3) * 0.14);
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 12; s++) {
        const t = s / 12;
        const a = ang + (t - 0.5) * span;
        const r = sunRadius * 0.96 + Math.sin(t * Math.PI) * (archH - sunRadius);
        const y = Math.sin(lat + (t - 0.5) * 0.12) * r;
        const horiz = Math.cos(lat) * r;
        pts.push(new THREE.Vector3(Math.cos(a) * horiz, y, Math.sin(a) * horiz));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.11, 8, false);
      cmeGeos.push(tubeGeo);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff9f43 : 0xff6b2b,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      sunGroup.add(tubeMesh);
      cmeLoops.push({ mesh: tubeMesh, mat: tubeMat, phase: i * 1.3 });
    }

    // Outward streaming solar wind particles
    const windCount = 900;
    const windPositions = new Float32Array(windCount * 3);
    const windDirs = new Float32Array(windCount * 3);
    const windProgress = new Float32Array(windCount);
    for (let i = 0; i < windCount; i++) {
      const th = (i * 2.39996) % (Math.PI * 2);
      const ph = Math.acos(1 - (2 * (i + 0.5)) / windCount);
      windDirs[i * 3] = Math.sin(ph) * Math.cos(th);
      windDirs[i * 3 + 1] = Math.cos(ph) * 0.55;
      windDirs[i * 3 + 2] = Math.sin(ph) * Math.sin(th);
      windProgress[i] = (i % 97) / 97;
    }
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
    const windMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0xffc875,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const windPoints = new THREE.Points(windGeo, windMat);
    sunGroup.add(windPoints);

    // 3. BUILD ALL 8 PLANETS, MOONS & KEPLERIAN ORBITS
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const textures = buildAllPlanetTextures(maxAnisotropy);
    const sphereHighGeo = new THREE.SphereGeometry(1, 64, 48);
    const moonSphereGeo = new THREE.SphereGeometry(1, 28, 20);
    const irregularMoonGeo = createIrregularMoonGeo();
    const shadowDiscTex = makeShadowDiscTexture();
    const shadowDiscGeo = new THREE.PlaneGeometry(0.42, 0.42);

    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);

    // Ecliptic radial coordinate grid
    const gridCircles: THREE.LineLoop[] = [];
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.36,
    });
    [10, 20, 40, 80, 140].forEach((r) => {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s < 128; s++) {
        const a = (s / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const loop = new THREE.LineLoop(g, gridMat);
      orbitsGroup.add(loop);
      gridCircles.push(loop);
    });

    const planetAssemblies = new Map<PlanetId, PlanetAssembly>();
    const disposableMaterials: THREE.Material[] = [];
    const disposableGeometries: THREE.BufferGeometry[] = [
      sphereHighGeo,
      moonSphereGeo,
      irregularMoonGeo,
      shadowDiscGeo,
      sunGeo,
      starGeo,
      windGeo,
      ...cmeGeos,
    ];
    const disposableTextures: THREE.Texture[] = [coronaTex, shadowDiscTex];

    Object.values(textures).forEach((set) => {
      if (set.albedo) disposableTextures.push(set.albedo);
      if (set.bump) disposableTextures.push(set.bump);
      if (set.specular) disposableTextures.push(set.specular);
      if (set.nightLights) disposableTextures.push(set.nightLights);
      if (set.clouds) disposableTextures.push(set.clouds);
      if (set.cloudsSecondary) disposableTextures.push(set.cloudsSecondary);
      if (set.rings) disposableTextures.push(set.rings);
    });

    // Jupiter Galilean shadow transit discs
    const jupiterShadowDiscs: THREE.Mesh[] = [];
    const jupiterShadowMat = new THREE.MeshBasicMaterial({
      map: shadowDiscTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    disposableMaterials.push(jupiterShadowMat);

    const tmpPos = { x: 0, y: 0, z: 0 };

    PLANET_SPECS.forEach((spec) => {
      // Keplerian Elliptical Orbit Line
      const orbitPts: THREE.Vector3[] = [];
      for (let s = 0; s < 192; s++) {
        const M = (s / 192) * Math.PI * 2;
        solveKeplerPosition(
          spec.semiMajorAu,
          spec.eccentricity,
          spec.inclinationDeg,
          spec.ascendingNodeDeg,
          M,
          tmpPos,
        );
        orbitPts.push(new THREE.Vector3(tmpPos.x, tmpPos.y, tmpPos.z));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineBasicMaterial({
        color: spec.orbitColor,
        transparent: true,
        opacity: 0.34,
      });
      disposableGeometries.push(orbitGeo);
      disposableMaterials.push(orbitMat);
      orbitsGroup.add(new THREE.LineLoop(orbitGeo, orbitMat));

      const root = new THREE.Group();
      scene.add(root);

      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(spec.axialTiltDeg);
      root.add(tiltGroup);

      const texSet = textures[spec.id];
      const sunUniforms: Array<{ value: THREE.Vector3 }> = [];

      let surfaceMat: THREE.MeshStandardMaterial;
      let tidalUniforms: TidalUniformTarget;
      let timeUniform: { value: number } | undefined;

      if (spec.id === 'earth' && texSet.bump && texSet.specular && texSet.nightLights) {
        const earthRes = createEarthSurfaceMaterial(
          texSet.albedo,
          texSet.bump,
          texSet.specular,
          texSet.nightLights,
        );
        surfaceMat = earthRes.material;
        tidalUniforms = earthRes.uniforms;
        sunUniforms.push(earthRes.uniforms.uSunPos);
      } else {
        const pRes = createPlanetSurfaceMaterial(texSet.albedo, {
          bumpMap: texSet.bump,
          bumpScale: spec.id === 'mercury' ? 0.045 : spec.id === 'mars' ? 0.038 : 0.015,
          roughness: spec.id === 'mercury' ? 0.94 : spec.id === 'mars' ? 0.88 : 0.72,
          differentialShear: spec.id === 'jupiter',
        });
        surfaceMat = pRes.material;
        tidalUniforms = pRes.uniforms;
        timeUniform = pRes.uniforms.uTime;
      }
      disposableMaterials.push(surfaceMat);

      const surfaceMesh = new THREE.Mesh(sphereHighGeo, surfaceMat);
      surfaceMesh.scale.set(spec.radius, spec.radius * spec.oblateness, spec.radius);
      tiltGroup.add(surfaceMesh);

      let cloudPrimary: THREE.Mesh | undefined;
      let cloudSecondary: THREE.Mesh | undefined;
      let cloudShadow: THREE.Mesh | undefined;

      if (spec.id === 'earth' && texSet.clouds) {
        // Subtle dark cloud drop-shadow layer just above surface
        const shadowMat = new THREE.MeshStandardMaterial({
          map: texSet.clouds,
          color: 0x060912,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          roughness: 1,
        });
        disposableMaterials.push(shadowMat);
        cloudShadow = new THREE.Mesh(sphereHighGeo, shadowMat);
        cloudShadow.scale.setScalar(spec.radius * 1.006);
        cloudShadow.rotation.y = 0.015;
        tiltGroup.add(cloudShadow);

        // Independent drifting cumulus cloud deck
        const cloudMat = new THREE.MeshStandardMaterial({
          map: texSet.clouds,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
          roughness: 0.9,
        });
        disposableMaterials.push(cloudMat);
        cloudPrimary = new THREE.Mesh(sphereHighGeo, cloudMat);
        cloudPrimary.scale.setScalar(spec.radius * 1.018);
        tiltGroup.add(cloudPrimary);
      }

      if (spec.id === 'venus' && texSet.clouds && texSet.cloudsSecondary) {
        const deckAMat = new THREE.MeshStandardMaterial({
          map: texSet.clouds,
          transparent: true,
          opacity: 0.92,
          roughness: 0.75,
        });
        const deckBMat = new THREE.MeshStandardMaterial({
          map: texSet.cloudsSecondary,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
          roughness: 0.65,
        });
        disposableMaterials.push(deckAMat, deckBMat);
        cloudPrimary = new THREE.Mesh(sphereHighGeo, deckAMat);
        cloudPrimary.scale.setScalar(spec.radius * 1.014);
        tiltGroup.add(cloudPrimary);

        cloudSecondary = new THREE.Mesh(sphereHighGeo, deckBMat);
        cloudSecondary.scale.setScalar(spec.radius * 1.028);
        tiltGroup.add(cloudSecondary);
      }

      // Rayleigh / Fresnel atmospheric scattering halos
      const haloConfig: Partial<Record<PlanetId, { color: string; power: number; intensity: number; scale: number }>> = {
        earth: { color: '#38bdf8', power: 3.1, intensity: 0.95, scale: 1.07 },
        venus: { color: '#fbbf24', power: 2.6, intensity: 0.85, scale: 1.075 },
        mars: { color: '#f97352', power: 3.5, intensity: 0.58, scale: 1.055 },
        jupiter: { color: '#fdba74', power: 3.6, intensity: 0.45, scale: 1.045 },
        saturn: { color: '#fde68a', power: 3.6, intensity: 0.4, scale: 1.045 },
        uranus: { color: '#67e8f9', power: 3.2, intensity: 0.62, scale: 1.055 },
        neptune: { color: '#3b82f6', power: 3.0, intensity: 0.78, scale: 1.06 },
      };
      const hc = haloConfig[spec.id];
      if (hc) {
        const halo = createAtmosphereHaloMaterial(hc.color, hc.power, hc.intensity);
        disposableMaterials.push(halo.material);
        sunUniforms.push(halo.uSunPos);
        const haloMesh = new THREE.Mesh(sphereHighGeo, halo.material);
        haloMesh.scale.set(
          spec.radius * hc.scale,
          spec.radius * spec.oblateness * hc.scale,
          spec.radius * hc.scale,
        );
        tiltGroup.add(haloMesh);
      }

      // Saturn Rings: Cassini/Encke shader ring + 10,500 ice-particle ring field
      let ringPlanetUniform: { value: THREE.Vector3 } | undefined;
      let ringMat: THREE.ShaderMaterial | undefined;
      let saturnIceParticles: THREE.Points | undefined;

      if (spec.id === 'saturn' && texSet.rings) {
        const innerR = spec.radius * 1.24;
        const outerR = spec.radius * 2.38;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 1);
        // Remap UVs radially (u = 0 inner, u = 1 outer)
        const pos = ringGeo.attributes.position as THREE.BufferAttribute;
        const uv = ringGeo.attributes.uv as THREE.BufferAttribute;
        const rv = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          rv.fromBufferAttribute(pos, i);
          const u = (rv.length() - innerR) / (outerR - innerR);
          uv.setXY(i, Math.max(0, Math.min(1, u)), 0.5);
        }
        ringGeo.rotateX(-Math.PI / 2);
        disposableGeometries.push(ringGeo);

        const rRes = createPlanetaryRingMaterial(
          texSet.rings,
          spec.radius,
          spec.oblateness,
          '#fff6e5',
          0.95,
        );
        ringMat = rRes.material;
        ringPlanetUniform = rRes.uPlanetPos;
        sunUniforms.push(rRes.uSunPos);
        disposableMaterials.push(ringMat);

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        tiltGroup.add(ringMesh);

        // 10,500 physical ice-particle ring grains respecting Cassini & Encke gaps
        const iceCount = 10500;
        const icePos = new Float32Array(iceCount * 3);
        const iceCol = new Float32Array(iceCount * 3);
        for (let i = 0; i < iceCount; i++) {
          const s1 = Math.sin(i * 12.9898) * 43758.5453;
          let frac = s1 - Math.floor(s1);
          // Skip Cassini Division (0.56..0.635) and Encke Gap (0.84..0.855)
          if (frac >= 0.56 && frac <= 0.635) frac = frac < 0.598 ? 0.54 : 0.65;
          if (frac >= 0.84 && frac <= 0.855) frac = 0.82;
          const r = innerR + frac * (outerR - innerR);
          const s2 = Math.sin(i * 78.233) * 43758.5453;
          const ang = (s2 - Math.floor(s2)) * Math.PI * 2;
          const s3 = Math.sin(i * 39.425) * 43758.5453;
          const yOff = (s3 - Math.floor(s3) - 0.5) * 0.045;

          icePos[i * 3] = Math.cos(ang) * r;
          icePos[i * 3 + 1] = yOff;
          icePos[i * 3 + 2] = Math.sin(ang) * r;

          const bright = 0.72 + (frac > 0.22 && frac < 0.56 ? 0.28 : 0.14);
          iceCol[i * 3] = 0.94 * bright;
          iceCol[i * 3 + 1] = 0.88 * bright;
          iceCol[i * 3 + 2] = 0.78 * bright;
        }
        const iceGeo = new THREE.BufferGeometry();
        iceGeo.setAttribute('position', new THREE.BufferAttribute(icePos, 3));
        iceGeo.setAttribute('color', new THREE.BufferAttribute(iceCol, 3));
        const iceMat = new THREE.PointsMaterial({
          size: 0.036,
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        });
        disposableGeometries.push(iceGeo);
        disposableMaterials.push(iceMat);
        saturnIceParticles = new THREE.Points(iceGeo, iceMat);
        tiltGroup.add(saturnIceParticles);
      }

      // Uranus: 13 faint vertical rings aligned with 97.77 deg axial tilt
      if (spec.id === 'uranus') {
        const uMat = new THREE.LineBasicMaterial({
          color: 0xbae6fd,
          transparent: true,
          opacity: 0.24,
        });
        disposableMaterials.push(uMat);
        for (let rIdx = 0; rIdx < 13; rIdx++) {
          const r = spec.radius * (1.38 + rIdx * 0.055);
          const rPts: THREE.Vector3[] = [];
          for (let s = 0; s < 72; s++) {
            const a = (s / 72) * Math.PI * 2;
            rPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
          }
          const g = new THREE.BufferGeometry().setFromPoints(rPts);
          disposableGeometries.push(g);
          tiltGroup.add(new THREE.LineLoop(g, uMat));
        }
      }

      // Neptune: Faint Adams / Le Verrier ring arcs
      if (spec.id === 'neptune') {
        const nMat = new THREE.LineBasicMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0.22,
        });
        disposableMaterials.push(nMat);
        [1.52, 1.78, 1.98].forEach((mult, idx) => {
          const r = spec.radius * mult;
          const arcPts: THREE.Vector3[] = [];
          const steps = idx === 2 ? 28 : 72;
          const span = idx === 2 ? Math.PI * 0.75 : Math.PI * 2;
          for (let s = 0; s <= steps; s++) {
            const a = (s / steps) * span;
            arcPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
          }
          const g = new THREE.BufferGeometry().setFromPoints(arcPts);
          disposableGeometries.push(g);
          tiltGroup.add(idx === 2 ? new THREE.Line(g, nMat) : new THREE.LineLoop(g, nMat));
        });
      }

      // Jupiter: 4 Galilean shadow-transit umbra discs
      if (spec.id === 'jupiter') {
        for (let m = 0; m < 4; m++) {
          const disc = new THREE.Mesh(shadowDiscGeo, jupiterShadowMat);
          disc.visible = false;
          root.add(disc);
          jupiterShadowDiscs.push(disc);
        }
      }

      // Build Moons
      const moons: MoonAssembly[] = spec.moons.map((mSpec) => {
        const orbitPivot = new THREE.Group();
        orbitPivot.rotation.z = THREE.MathUtils.degToRad(mSpec.inclinationDeg);
        root.add(orbitPivot);

        const mMat = new THREE.MeshStandardMaterial({
          map: mSpec.id === 'luna' ? textures.luna.albedo : undefined,
          color: mSpec.id === 'luna' ? 0xffffff : mSpec.color,
          roughness: mSpec.id === 'europa' || mSpec.id === 'enceladus' ? 0.35 : 0.85,
          metalness: 0.05,
        });
        disposableMaterials.push(mMat);

        const mMesh = new THREE.Mesh(
          mSpec.irregular ? irregularMoonGeo : moonSphereGeo,
          mMat,
        );
        mMesh.scale.setScalar(mSpec.radius);
        orbitPivot.add(mMesh);

        let halo: THREE.Mesh | undefined;
        if (mSpec.id === 'titan') {
          const tHalo = createAtmosphereHaloMaterial('#f59e0b', 2.8, 0.7,);
          disposableMaterials.push(tHalo.material);
          sunUniforms.push(tHalo.uSunPos);
          halo = new THREE.Mesh(moonSphereGeo, tHalo.material);
          halo.scale.setScalar(mSpec.radius * 1.14);
          mMesh.add(halo);
        }

        return {
          spec: mSpec,
          orbitPivot,
          mesh: mMesh,
          phase: mSpec.initialPhase,
          halo,
        };
      });

      planetAssemblies.set(spec.id, {
        spec,
        root,
        tiltGroup,
        surfaceMesh,
        meanAnomaly: spec.initialMeanAnomaly,
        tidalUniforms,
        timeUniform,
        sunUniforms,
        cloudPrimary,
        cloudSecondary,
        cloudShadow,
        ringPlanetUniform,
        ringMat,
        saturnIceParticles,
        moons,
        worldPos: new THREE.Vector3(),
      });
    });

    // 4. ASTEROIDS (495 FRACTURED C/S/M) + HALLEY COMET + GRAVITATIONAL TRACTOR
    const asteroidsAndComet = createAsteroidsAndCometSystem();
    scene.add(asteroidsAndComet.group);

    // 5. KERR BLACK HOLE, LOGARITHMIC ACCRETION DEBRIS & BIG BANG SINGULARITY
    const bhGroup = new THREE.Group();
    bhGroup.visible = false;
    scene.add(bhGroup);

    const horizonGeo = new THREE.SphereGeometry(2.05, 48, 48);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    bhGroup.add(horizonMesh);

    const lensGeo = new THREE.PlaneGeometry(14.5, 14.5);
    const lensShader = createGravitationalLensMaterial();
    const lensMesh = new THREE.Mesh(lensGeo, lensShader.material);
    bhGroup.add(lensMesh);

    const diskGeo = new THREE.RingGeometry(2.1, 11.2, 128, 8);
    const diskShader = createAccretionDiskMaterial();
    const diskMesh = new THREE.Mesh(diskGeo, diskShader.material);
    diskMesh.rotation.x = THREE.MathUtils.degToRad(74);
    diskMesh.rotation.z = THREE.MathUtils.degToRad(-12);
    bhGroup.add(diskMesh);

    // Twin relativistic polar plasma jets
    const jetGeo = new THREE.ConeGeometry(0.95, 19, 24, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const jetNorth = new THREE.Mesh(jetGeo, jetMat);
    jetNorth.position.y = 10.5;
    jetNorth.rotation.x = Math.PI;
    const jetSouth = new THREE.Mesh(jetGeo, jetMat);
    jetSouth.position.y = -10.5;
    const jetPivot = new THREE.Group();
    jetPivot.rotation.x = THREE.MathUtils.degToRad(-16);
    jetPivot.rotation.z = THREE.MathUtils.degToRad(-12);
    jetPivot.add(jetNorth, jetSouth);
    bhGroup.add(jetPivot);

    // 600 Logarithmic spiral tidal debris particles feeding into the Kerr Horizon
    const debrisCount = 600;
    const debrisPos = new Float32Array(debrisCount * 3);
    const debrisCol = new Float32Array(debrisCount * 3);
    const debrisGeo = new THREE.BufferGeometry();
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));
    debrisGeo.setAttribute('color', new THREE.BufferAttribute(debrisCol, 3));
    const debrisMat = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const debrisPoints = new THREE.Points(debrisGeo, debrisMat);
    debrisPoints.frustumCulled = false;
    bhGroup.add(debrisPoints);

    // Big Bang Singularity Implosion Flash & Expanding CMB Shockwave
    const bangGroup = new THREE.Group();
    bangGroup.visible = false;
    scene.add(bangGroup);

    const flashSpriteTex = makeRadialSpriteTexture(
      'rgba(255, 255, 255, 1)',
      'rgba(186, 230, 253, 0.85)',
      'rgba(6, 182, 212, 0)',
      256,
    );
    const flashSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flashSpriteTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    bangGroup.add(flashSprite);

    const shockGeo = new THREE.SphereGeometry(1, 64, 48);
    const shockShader = createBigBangShockwaveMaterial();
    const shockMesh = new THREE.Mesh(shockGeo, shockShader.material);
    bangGroup.add(shockMesh);

    // 6. PRIMORDIAL VOID (95%-100%): 450 Quantum-Fluctuating Bioluminescent Vacuum Particles
    const voidCount = 450;
    const voidPos = new Float32Array(voidCount * 3);
    const voidCol = new Float32Array(voidCount * 3);
    const voidBase = new Float32Array(voidCount * 3);
    for (let i = 0; i < voidCount; i++) {
      const s1 = Math.sin(i * 19.31) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 47.73) * 43758.5453;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 83.17) * 43758.5453;
      const r3 = s3 - Math.floor(s3);

      const theta = r1 * Math.PI * 2;
      const phi = Math.acos(2 * r2 - 1);
      const rad = 6 + r3 * 36;
      const vx = rad * Math.sin(phi) * Math.cos(theta);
      const vy = rad * Math.cos(phi) * 0.72;
      const vz = rad * Math.sin(phi) * Math.sin(theta);

      voidBase[i * 3] = vx;
      voidBase[i * 3 + 1] = vy;
      voidBase[i * 3 + 2] = vz;
      voidPos[i * 3] = vx;
      voidPos[i * 3 + 1] = vy;
      voidPos[i * 3 + 2] = vz;

      // Bioluminescent cyan-emerald-indigo quantum palette
      voidCol[i * 3] = i % 3 === 0 ? 0.15 : 0.42;
      voidCol[i * 3 + 1] = 0.72 + (i % 5) * 0.05;
      voidCol[i * 3 + 2] = 0.96;
    }
    const voidGeo = new THREE.BufferGeometry();
    voidGeo.setAttribute('position', new THREE.BufferAttribute(voidPos, 3));
    voidGeo.setAttribute('color', new THREE.BufferAttribute(voidCol, 3));
    const voidMat = new THREE.PointsMaterial({
      size: 0.34,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const voidPoints = new THREE.Points(voidGeo, voidMat);
    voidPoints.visible = false;
    scene.add(voidPoints);

    disposableGeometries.push(horizonGeo, lensGeo, diskGeo, jetGeo, debrisGeo, shockGeo, voidGeo);
    disposableMaterials.push(
      horizonMat,
      lensShader.material,
      diskShader.material,
      jetMat,
      debrisMat,
      shockShader.material,
      voidMat,
      starMat,
      windMat,
      gridMat,
      sunShader.material,
      coronaSprite.material,
      flashSprite.material,
    );
    disposableTextures.push(flashSpriteTex);

    // Cursor Ecliptic Raycaster + Smooth Mouse Parallax
    const raycaster = new THREE.Raycaster();
    const eclipticPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointerNdc = new THREE.Vector2(0, 0);
    const cursorEcliptic = new THREE.Vector3();
    let pointerActive = false;
    const parallaxOffset = new THREE.Vector2(0, 0);
    const targetParallax = new THREE.Vector2(0, 0);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetParallax.set(pointerNdc.x, pointerNdc.y);
      pointerActive = true;
    };
    const handlePointerLeave = () => {
      pointerActive = false;
      targetParallax.set(0, 0);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    // Scratch vectors for camera spline & Jupiter shadow transits (zero per-frame GC)
    const camTargetPos = new THREE.Vector3();
    const camTargetLook = new THREE.Vector3();
    const camPosA = new THREE.Vector3();
    const camLookA = new THREE.Vector3();
    const camPosB = new THREE.Vector3();
    const camLookB = new THREE.Vector3();
    const dirVec = new THREE.Vector3();
    const rayDir = new THREE.Vector3();
    const localRayOrigin = new THREE.Vector3();
    const localRayDir = new THREE.Vector3();
    const localHit = new THREE.Vector3();
    const worldHit = new THREE.Vector3();
    const moonWorldPos = new THREE.Vector3();
    const jupInvMat = new THREE.Matrix4();
    const normalHit = new THREE.Vector3();

    const getCameraPoseForStage = (
      stageKey: string,
      outPos: THREE.Vector3,
      outLook: THREE.Vector3,
    ) => {
      if (stageKey === 'belt') {
        const beltR = auToSimRadius(2.7);
        outPos.set(beltR * 0.72, 13.5, beltR * 1.15);
        outLook.set(beltR * 0.55, 0, beltR * 0.15);
        return;
      }
      if (stageKey === 'sun') {
        outPos.set(9.5, 4.2, 17.5);
        outLook.set(0, 0, 0);
        return;
      }
      if (stageKey === 'blackhole') {
        outPos.set(11.5, 4.8, 22.0);
        outLook.set(0, 0, 0);
        return;
      }
      if (stageKey === 'bigbang') {
        outPos.set(0, 4.5, 29.0);
        outLook.set(0, 0, 0);
        return;
      }
      if (stageKey === 'void') {
        outPos.set(0, 2.0, 24.0);
        outLook.set(0, 0, 0);
        return;
      }

      const p = planetAssemblies.get(stageKey as PlanetId);
      if (!p) {
        outPos.set(0, 12, 185);
        outLook.set(0, 0, 0);
        return;
      }
      const wp = p.worldPos;
      // Frame planet from sunlit 3/4 side so day-side, Rayleigh rim, and dark-side night lights are visible
      const radialLen = Math.max(0.01, Math.hypot(wp.x, wp.z));
      const rx = wp.x / radialLen;
      const rz = wp.z / radialLen;
      const dist = p.spec.radius * (p.spec.id === 'saturn' ? 4.4 : 3.6);
      // Offset slightly sunward & tangential for dramatic crescent/three-quarter lighting
      const tx = -rz;
      const tz = rx;
      outPos.set(
        wp.x - rx * dist * 0.48 + tx * dist * 0.92,
        wp.y + p.spec.radius * 0.95,
        wp.z - rz * dist * 0.48 + tz * dist * 0.92,
      );
      outLook.copy(wp);
    };

    const stageWaypoints: Array<{ p: number; key: string }> = [
      { p: 0.0, key: 'neptune' },
      { p: 0.09, key: 'uranus' },
      { p: 0.17, key: 'saturn' },
      { p: 0.26, key: 'jupiter' },
      { p: 0.37, key: 'belt' },
      { p: 0.45, key: 'mars' },
      { p: 0.52, key: 'earth' },
      { p: 0.59, key: 'venus' },
      { p: 0.65, key: 'mercury' },
      { p: 0.72, key: 'sun' },
      { p: 0.83, key: 'blackhole' },
      { p: 0.935, key: 'bigbang' },
      { p: 0.97, key: 'void' },
      { p: 1.0, key: 'void' },
    ];

    let currentProgress = targetProgressRef.current;
    let lastTime = performance.now();
    let elapsed = 0;
    let rafId = 0;
    let readyFired = false;
    let lastFrameDone = true;
    let lastRenderTimestamp = 0;

    const smoothedLook = new THREE.Vector3(0, 0, 0);

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);

      // Software WebGL guard: throttle ~25fps and skip overlapping frames when GPU fence busy
      if (isSoftwareGl && (!lastFrameDone || now - lastRenderTimestamp < 38)) {
        return;
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      // Smoothly ease progress
      const targetP = targetProgressRef.current;
      currentProgress += (targetP - currentProgress) * (1 - Math.exp(-8.5 * dt));
      if (Math.abs(targetP - currentProgress) < 0.0002) currentProgress = targetP;
      onSyncProgressRef.current(currentProgress);

      // Compute singularity, black hole, Big Bang, and annihilation factors
      const bhReveal = THREE.MathUtils.smoothstep(currentProgress, 0.81, 0.85);
      const rochePull = THREE.MathUtils.smoothstep(currentProgress, 0.85, 0.92);
      const bangWindow = THREE.MathUtils.smoothstep(currentProgress, 0.92, 0.935);
      const annihilateFactor = THREE.MathUtils.smoothstep(currentProgress, 0.942, 0.954);
      const voidFactor = THREE.MathUtils.smoothstep(currentProgress, 0.954, 0.975);

      const scaleMul = timeScaleRef.current;
      const orbitSimDt = dt * (scaleMul === 1000 ? 6.5 : scaleMul === 100 ? 2.0 : 0.35);
      const spinSimDt = dt * (scaleMul === 1000 ? 4.2 : scaleMul === 100 ? 1.8 : 0.7);

      // Toggle Keplerian elliptical orbit telemetry
      orbitsGroup.visible = showOrbitsRef.current && annihilateFactor < 0.99;
      gridMat.opacity = 0.36 * (1 - annihilateFactor);

      // Update Sun
      const sunAlive = Math.max(0, 1 - THREE.MathUtils.smoothstep(currentProgress, 0.82, 0.88));
      sunGroup.visible = sunAlive > 0.01;
      if (sunGroup.visible) {
        sunGroup.scale.setScalar(sunAlive);
        sunShader.uTime.value = elapsed;
        sunMesh.rotation.y += 0.05 * spinSimDt;
        const pulse = 22 + Math.sin(elapsed * 2.1) * 0.9;
        coronaSprite.scale.set(pulse, pulse, 1);

        cmeLoops.forEach((loop, idx) => {
          const wave = 0.45 + 0.55 * Math.sin(elapsed * 1.8 + loop.phase);
          loop.mat.opacity = (0.35 + wave * 0.48) * sunAlive;
          loop.mesh.scale.setScalar(0.96 + wave * 0.08 + idx * 0.004);
        });

        // Update radial solar wind particles
        for (let i = 0; i < windCount; i++) {
          windProgress[i] = (windProgress[i] + dt * (0.22 + (i % 5) * 0.04)) % 1;
          const r = sunRadius * 1.08 + windProgress[i] * 14.5;
          windPositions[i * 3] = windDirs[i * 3] * r;
          windPositions[i * 3 + 1] = windDirs[i * 3 + 1] * r;
          windPositions[i * 3 + 2] = windDirs[i * 3 + 2] * r;
        }
        (windGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        windMat.opacity = 0.42 * sunAlive;
      }

      // Update Planets & Moons
      planetAssemblies.forEach((p) => {
        const planetVisibility = Math.max(0, 1 - annihilateFactor);
        p.root.visible = planetVisibility > 0.01;
        if (!p.root.visible) return;

        // Keplerian advancement
        p.meanAnomaly += keplerOmega(p.spec.semiMajorAu) * orbitSimDt;
        solveKeplerPosition(
          p.spec.semiMajorAu,
          p.spec.eccentricity,
          p.spec.inclinationDeg,
          p.spec.ascendingNodeDeg,
          p.meanAnomaly,
          tmpPos,
        );

        // Roche limit spiral inward toward Black Hole during 85%-92%
        if (rochePull > 0.001) {
          const inward = Math.max(0.04, 1 - rochePull * 0.94);
          const swirl = rochePull * (4.2 + (p.spec.semiMajorAu < 3 ? 2.5 : 1.0));
          const cs = Math.cos(swirl);
          const sn = Math.sin(swirl);
          const rx = (tmpPos.x * cs - tmpPos.z * sn) * inward;
          const rz = (tmpPos.x * sn + tmpPos.z * cs) * inward;
          p.worldPos.set(rx, tmpPos.y * inward, rz);
        } else {
          p.worldPos.set(tmpPos.x, tmpPos.y, tmpPos.z);
        }
        p.root.position.copy(p.worldPos);
        p.root.scale.setScalar(planetVisibility);

        // Sidereal spin
        const spinDir = p.spec.retrogradeSpin ? -1 : 1;
        p.surfaceMesh.rotation.y += p.spec.rotationSpeed * spinDir * spinSimDt;

        // Venus 60x super-rotating counter-rotating sulfuric cloud decks
        if (p.spec.id === 'venus' && p.cloudPrimary && p.cloudSecondary) {
          p.cloudPrimary.rotation.y -= p.spec.rotationSpeed * 60 * spinSimDt;
          p.cloudSecondary.rotation.y += p.spec.rotationSpeed * 38 * spinSimDt;
        }
        // Earth drifting cumulus cloud deck + subtle drop-shadow offset
        if (p.spec.id === 'earth' && p.cloudPrimary && p.cloudShadow) {
          p.cloudPrimary.rotation.y += p.spec.rotationSpeed * 1.28 * spinSimDt;
          p.cloudShadow.rotation.y = p.cloudPrimary.rotation.y - 0.018;
        }

        // Shader uniforms (Sun position, tidal Roche spaghettification, Jupiter shear)
        if (p.timeUniform) p.timeUniform.value = elapsed;
        for (let u = 0; u < p.sunUniforms.length; u++) {
          p.sunUniforms[u].value.copy(sunPos);
        }
        if (p.ringPlanetUniform) {
          p.ringPlanetUniform.value.copy(p.worldPos);
        }

        // Roche limit tidal stretch toward Kerr Black Hole at origin
        const distFromBh = p.worldPos.length();
        if (rochePull > 0.02) {
          const rocheFactor = THREE.MathUtils.clamp(
            rochePull * (1.2 + 12 / Math.max(2, distFromBh)),
            0,
            1.4,
          );
          dirVec.copy(p.worldPos).negate().normalize();
          p.tidalUniforms.uTidalDir.value.copy(dirVec);
          p.tidalUniforms.uTidalStretch.value = rocheFactor;
        } else {
          p.tidalUniforms.uTidalStretch.value = 0;
        }

        // Update Moons (including Jupiter 1:2:4 Laplace resonance & Luna 5.14 deg inclination)
        p.moons.forEach((m) => {
          const mDir = m.spec.retrograde ? -1 : 1;
          m.phase += m.spec.orbitalSpeed * mDir * spinSimDt * 0.7;
          m.mesh.position.set(
            Math.cos(m.phase) * m.spec.orbitRadius,
            0,
            Math.sin(m.phase) * m.spec.orbitRadius,
          );
          // Tidally locked face toward parent planet
          m.mesh.rotation.y = -m.phase;
        });
      });

      // Compute Jupiter's 4 Galilean Moon real-time umbra shadow transits
      const jup = planetAssemblies.get('jupiter');
      if (jup && jup.root.visible) {
        jup.root.updateMatrixWorld(true);
        jupInvMat.copy(jup.surfaceMesh.matrixWorld).invert();
        const jupR = jup.spec.radius;

        jup.moons.forEach((m, idx) => {
          const disc = jupiterShadowDiscs[idx];
          if (!disc) return;
          m.mesh.getWorldPosition(moonWorldPos);
          // Only cast shadow if moon is closer to Sun than Jupiter
          if (moonWorldPos.lengthSq() >= jup.worldPos.lengthSq()) {
            disc.visible = false;
            return;
          }
          rayDir.subVectors(moonWorldPos, sunPos).normalize();
          localRayOrigin.copy(moonWorldPos).applyMatrix4(jupInvMat);
          localRayDir.copy(rayDir).transformDirection(jupInvMat).normalize();

          // Intersect unit sphere (since jupInvMat includes Jupiter's radius & oblateness)
          const b = localRayOrigin.dot(localRayDir);
          const c = localRayOrigin.lengthSq() - 1.0;
          const d2 = b * b - c;
          if (d2 > 0 && b < 0) {
            const tHit = -b - Math.sqrt(d2);
            if (tHit > 0) {
              localHit.copy(localRayOrigin).addScaledVector(localRayDir, tHit);
              normalHit.copy(localHit).normalize();
              localHit.multiplyScalar(1.006);
              worldHit.copy(localHit).applyMatrix4(jup.surfaceMesh.matrixWorld);
              disc.position.copy(worldHit).sub(jup.worldPos);
              disc.lookAt(worldHit.clone().add(normalHit));
              const umbraScale = 0.5 + m.spec.radius * 3.8;
              disc.scale.setScalar(umbraScale * (jupR / 2.82));
              disc.visible = true;
              return;
            }
          }
          disc.visible = false;
        });
      }

      // Compute cursor ecliptic intersection for Asteroid Gravitational Tractor
      let tractorHit: THREE.Vector3 | null = null;
      if (pointerActive && currentProgress < 0.85) {
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(eclipticPlane, cursorEcliptic)) {
          tractorHit = cursorEcliptic;
        }
      }

      // Update 495 Fractured Asteroids & Comet
      asteroidsAndComet.update(
        dt,
        elapsed,
        scaleMul,
        tractorHit,
        rochePull,
        annihilateFactor,
        sunPos,
      );

      // Update Kerr Black Hole (82%-95%)
      const bhActive = bhReveal * (1 - annihilateFactor);
      bhGroup.visible = bhActive > 0.01;
      if (bhGroup.visible) {
        const bhScale = (0.35 + bhReveal * 0.95) * (1 - annihilateFactor * 0.92);
        bhGroup.scale.setScalar(bhScale);
        diskShader.uTime.value = elapsed;
        diskShader.uOpacity.value = bhActive;
        lensShader.uTime.value = elapsed;
        lensShader.uOpacity.value = bhActive;
        lensMesh.lookAt(camera.position);
        jetMat.opacity = 0.34 * bhActive;

        // Logarithmic accretion debris spiraling into the Event Horizon during Roche disruption
        const debrisAlpha = Math.max(rochePull, bhReveal * 0.45) * (1 - annihilateFactor);
        debrisMat.opacity = debrisAlpha * 0.88;
        for (let i = 0; i < debrisCount; i++) {
          const speed = 0.55 + (i % 9) * 0.08;
          const phase = ((elapsed * speed + (i * 0.017)) % 1);
          const r = 13.5 * Math.pow(0.16, phase);
          const theta = phase * 14.0 + i * 0.42;
          const ySpread = (Math.sin(i * 3.1) * 0.45) * (1 - phase);
          debrisPos[i * 3] = Math.cos(theta) * r;
          debrisPos[i * 3 + 1] = ySpread;
          debrisPos[i * 3 + 2] = Math.sin(theta) * r;

          // Hotter cyan-white closer to ISCO, orange-gold further out
          debrisCol[i * 3] = 1.0 - phase * 0.2;
          debrisCol[i * 3 + 1] = 0.55 + phase * 0.38;
          debrisCol[i * 3 + 2] = 0.18 + phase * 0.8;
        }
        (debrisGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (debrisGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }

      // Update Singularity Flash & Expanding Big Bang CMB Shockwave (92%-95.5%)
      const bangActive = bangWindow * (1 - voidFactor);
      bangGroup.visible = bangActive > 0.01;
      if (bangGroup.visible) {
        const pBang = THREE.MathUtils.clamp((currentProgress - 0.92) / 0.032, 0, 1);
        // Sharp Planck implosion flash peaking at pBang ~ 0.18
        const flashPeak = Math.exp(-Math.pow((pBang - 0.16) * 5.2, 2));
        flashSprite.scale.setScalar(4 + flashPeak * 38);
        flashSprite.material.opacity = flashPeak * (1 - voidFactor);

        const shockR = 0.5 + Math.pow(pBang, 0.85) * 44;
        shockMesh.scale.setScalar(shockR);
        shockShader.uTime.value = elapsed;
        shockShader.uProgress.value = pBang;
        shockShader.uOpacity.value = Math.sin(pBang * Math.PI) * 0.95;
      }

      // Fade cosmic starfield into clean vacuum during annihilation -> subtly return dim stars or keep pure void
      starMat.opacity = 0.92 * (1 - annihilateFactor);
      starField.visible = starMat.opacity > 0.01;

      // Update Primordial Void Quantum-Fluctuating Bioluminescent Particles (95%-100%)
      voidPoints.visible = voidFactor > 0.01;
      if (voidPoints.visible) {
        voidMat.opacity = voidFactor * 0.9;
        for (let i = 0; i < voidCount; i++) {
          const bx = voidBase[i * 3];
          const by = voidBase[i * 3 + 1];
          const bz = voidBase[i * 3 + 2];
          const ph = elapsed * 0.75 + i * 0.37;
          voidPos[i * 3] = bx + Math.sin(ph) * 0.55;
          voidPos[i * 3 + 1] = by + Math.cos(ph * 0.85) * 0.45;
          voidPos[i * 3 + 2] = bz + Math.sin(ph * 1.15) * 0.55;

          const shimmer = 0.45 + 0.55 * Math.sin(elapsed * 2.2 + i * 1.13);
          voidCol[i * 3] = (i % 3 === 0 ? 0.14 : 0.42) * shimmer;
          voidCol[i * 3 + 1] = (0.72 + (i % 5) * 0.05) * shimmer;
          voidCol[i * 3 + 2] = 0.98 * shimmer;
        }
        (voidGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (voidGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }

      // Camera Spline Evaluation along 0% -> 100%
      let idxA = 0;
      for (let i = 0; i < stageWaypoints.length - 1; i++) {
        if (currentProgress >= stageWaypoints[i].p && currentProgress <= stageWaypoints[i + 1].p) {
          idxA = i;
          break;
        }
      }
      const wpA = stageWaypoints[idxA];
      const wpB = stageWaypoints[Math.min(stageWaypoints.length - 1, idxA + 1)];
      const segSpan = Math.max(1e-4, wpB.p - wpA.p);
      const localT = THREE.MathUtils.smoothstep(
        (currentProgress - wpA.p) / segSpan,
        0,
        1,
      );

      getCameraPoseForStage(wpA.key, camPosA, camLookA);
      getCameraPoseForStage(wpB.key, camPosB, camLookB);

      camTargetPos.lerpVectors(camPosA, camPosB, localT);
      camTargetLook.lerpVectors(camLookA, camLookB, localT);

      // Smooth cursor parallax offset
      parallaxOffset.lerp(targetParallax, 1 - Math.exp(-5.0 * dt));
      camTargetPos.x += parallaxOffset.x * 0.9;
      camTargetPos.y += parallaxOffset.y * 0.65;

      const camLerp = 1 - Math.exp(-7.5 * dt);
      camera.position.lerp(camTargetPos, camLerp);
      smoothedLook.lerp(camTargetLook, camLerp);
      camera.lookAt(smoothedLook);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        lastRenderTimestamp = performance.now();
        const sync = (gl as WebGL2RenderingContext).fenceSync(
          (gl as WebGL2RenderingContext).SYNC_GPU_COMMANDS_COMPLETE,
          0,
        );
        if (sync) {
          lastFrameDone = false;
          const checkFence = () => {
            const res = (gl as WebGL2RenderingContext).clientWaitSync(sync, 0, 0);
            if (
              res === (gl as WebGL2RenderingContext).ALREADY_SIGNALED ||
              res === (gl as WebGL2RenderingContext).CONDITION_SATISFIED
            ) {
              (gl as WebGL2RenderingContext).deleteSync(sync);
              lastFrameDone = true;
            } else {
              setTimeout(checkFence, 4);
            }
          };
          setTimeout(checkFence, 2);
        }
      }

      if (!readyFired) {
        readyFired = true;
        onReadyRef.current();
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      asteroidsAndComet.dispose();
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      disposableTextures.forEach((t) => t.dispose());
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [targetProgressRef]);

  return (
    <div
      ref={mountRef}
      className="relative h-full w-full overflow-hidden bg-[#050608]"
      aria-label="Origin Interactive 3D Solar System and Singularity Simulation"
    />
  );
}

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CLOUD_BACKDROP_URL,
  EXHIBITION_CHAPTERS,
  type ExhibitionChapter,
} from '../data/chapters';
import { buildCelestialDoveFlock, type CelestialDoveFlockHandle } from './doves';
import { buildHeavenlyFlareGroup, type HeavenlyFlareHandle } from './flares';
import { buildCreationLightPrism, type CreationLightPrismHandle } from './prism';
import {
  createCloudBackdropMaterial,
  createConcaveVaultGeometry,
  createFrescoReliefMaterial,
  type ReliefMaterialHandle,
} from './reliefMaterial';
import { buildGoldenSpear, type GoldenSpearHandle } from './spear';
import {
  buildHeroTypographyGroup,
  type HeroTypographyHandle,
} from './heroTypography';
import {
  createCloudWispTexture,
  createNeutralFallbackTexture,
  createSparkTexture,
  loadArtworkTexture,
  loadCreationSplitTextures,
  loadHeliosSplitTextures,
} from './textures';

export interface ExhibitionStageProps {
  targetProgressRef: React.MutableRefObject<number>;
  isPlayingRef: React.MutableRefObject<boolean>;
  reliefMode: 'subtle' | 'sculpted';
  frameMode: '16:9' | 'full';
  activeChapter: ExhibitionChapter;
  onSyncProgress?: (smoothedProgress: number) => void;
  onReady?: () => void;
  children?: React.ReactNode;
}

// Pre-allocated scratch math objects (zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 0.32, 0);
const _pA = new THREE.Vector3();
const _lA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _lB = new THREE.Vector3();
const _keyTargetColor = new THREE.Color();
const _rimTargetColor = new THREE.Color();
const _sweepCoolColor = new THREE.Color('#d2e6ff');
const _sweepWarmColor = new THREE.Color('#ffcb6e');
const _dummy = new THREE.Object3D();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function smootherstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function computeChapterFocus(progress: number, idx: number): number {
  const count = EXHIBITION_CHAPTERS.length;
  const floatIdx = Math.max(0, Math.min(count, progress * count));
  const enter = idx === 0 ? 1.0 : smoothstep(idx - 0.14, idx + 0.1, floatIdx);
  const exit =
    idx === count - 1 ? 1.0 : 1.0 - smoothstep(idx + 0.9, idx + 1.14, floatIdx);
  return enter * exit;
}

function getZonePose(
  c: ExhibitionChapter,
  localU: number,
  posOut: THREE.Vector3,
  lookOut: THREE.Vector3,
) {
  const [bx, by, bz] = c.position;
  if (c.index === 0) {
    // Zone 1: Helios Rising framed cleanly with 7.8u upper-sky welcome line & 6.2u foreground signature
    posOut.set(
      bx + Math.sin(localU * Math.PI) * 0.18,
      by - 0.14 + localU * 0.12,
      bz + 8.35 - localU * 0.6,
    );
    lookOut.set(bx, by - 0.02, bz);
  } else if (c.index === 1) {
    // Zone 2: Celestial Chariot + Ethereal Dove Flock
    const sweep = smootherstep(localU);
    posOut.set(-0.32 + sweep * 0.55, -0.15 + sweep * 0.22, bz + 7.6 - sweep * 0.65);
    lookOut.set(-0.45 + sweep * 0.85, -0.18 + sweep * 0.36, bz);
  } else if (c.index === 2) {
    // Zone 3 (UNCHANGED): Sol & Luna (right-to-left light sweep)
    const drift = Math.sin((localU - 0.5) * Math.PI);
    posOut.set(bx - 0.3 + drift * 0.22, by + 0.04, bz + 7.5 - localU * 0.55);
    lookOut.set(bx * 0.65, by, bz);
  } else if (c.index === 3) {
    // Zone 4 (UNCHANGED): Council of Olympus (upward architectural perspective beneath concave cupola)
    const pitch = smootherstep(localU);
    posOut.set(
      bx + Math.sin(localU * Math.PI) * 0.28,
      -0.65 - pitch * 0.32,
      bz + 6.9 - pitch * 1.15,
    );
    lookOut.set(bx, 0.62 + pitch * 0.52, bz - 0.5);
  } else if (c.index === 4) {
    // Zone 5: Solar Decree + Diagonal Bottom-Left -> Top-Right Rocket Spear
    const pan = smootherstep(localU);
    posOut.set(bx + 0.18 + pan * 0.34, by - 0.05 + pan * 0.1, bz + 7.75 - pan * 0.52);
    lookOut.set(bx * 0.4 + pan * 0.32, by + 0.06, bz);
  } else {
    // Zone 6: Spark of Creation (wide enough to frame diagonal convergence, zooming slightly as prism ignites)
    const convergeZoom = smootherstep(localU);
    posOut.set(bx, by + 0.02, bz + 9.2 - convergeZoom * 1.65);
    lookOut.set(bx, by, bz);
  }
}

function sampleFlightCamera(
  progress: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
) {
  const count = EXHIBITION_CHAPTERS.length;
  const clamped = Math.max(0, Math.min(0.99999, progress));
  const seg = 1 / count;
  const idx = Math.min(count - 1, Math.floor(clamped / seg));
  const u = (clamped - idx * seg) / seg;

  const curr = EXHIBITION_CHAPTERS[idx];
  const next = EXHIBITION_CHAPTERS[Math.min(count - 1, idx + 1)];

  const dwellEnd = idx === count - 1 ? 1.0 : 0.78;
  if (u <= dwellEnd) {
    getZonePose(curr, u / dwellEnd, outPos, outLook);
  } else {
    const trans = smootherstep((u - dwellEnd) / (1 - dwellEnd));
    getZonePose(curr, 1.0, _pA, _lA);
    getZonePose(next, 0.0, _pB, _lB);

    const arc = Math.sin(trans * Math.PI) * (idx % 2 === 0 ? 0.72 : -0.72);
    outPos.lerpVectors(_pA, _pB, trans);
    outPos.x += arc;
    outPos.y += Math.sin(trans * Math.PI) * 0.2;
    outLook.lerpVectors(_lA, _lB, trans);
  }
}

export function ExhibitionStage({
  targetProgressRef,
  reliefMode,
  frameMode,
  activeChapter,
  onSyncProgress,
  onReady,
  children,
}: ExhibitionStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reliefModeRef = useRef(reliefMode);
  const onSyncRef = useRef(onSyncProgress);
  const onReadyRef = useRef(onReady);
  const reliefRecordsRef = useRef<
    Array<{ handle: ReliefMaterialHandle; multiplier: number }>
  >([]);
  const [contextLost, setContextLost] = useState(false);
  const [webglUnsupported, setWebglUnsupported] = useState(false);

  useEffect(() => {
    reliefModeRef.current = reliefMode;
    const baseStrength = reliefMode === 'sculpted' ? 0.88 : 0.42;
    for (const rec of reliefRecordsRef.current) {
      rec.handle.setReliefStrength(baseStrength * rec.multiplier);
    }
  }, [reliefMode]);

  useEffect(() => {
    onSyncRef.current = onSyncProgress;
  }, [onSyncProgress]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl) return;

    const isSoftwareGl = (() => {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initW = Math.max(1, mountEl.clientWidth);
    const initH = Math.max(1, mountEl.clientHeight);
    renderer.setSize(initW, initH);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountEl.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16120e);
    scene.fog = new THREE.FogExp2(0x1b1510, 0.0095);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, initW / initH, 0.1, 160);
    camera.position.set(0, 0.18, 7.6);
    camera.lookAt(0, 0.32, 0);

    const hemiLight = new THREE.HemisphereLight(0xbcd8f5, 0x3b2c1d, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe0a3, 1.15);
    keyLight.position.set(4.2, 3.3, 7.6);
    scene.add(keyLight);
    scene.add(keyLight.target);

    const fillLight = new THREE.DirectionalLight(0xd4e6fa, 0.45);
    fillLight.position.set(-4.2, -1.6, 6.2);
    scene.add(fillLight);
    scene.add(fillLight.target);

    const rimLight = new THREE.DirectionalLight(0xf2b150, 0.55);
    rimLight.position.set(-5.2, 2.6, -3.5);
    scene.add(rimLight);
    scene.add(rimLight.target);

    const sweepLight = new THREE.PointLight(0xd2e6ff, 0, 14, 1.5);
    scene.add(sweepLight);

    const disposables: Array<{ dispose: () => void }> = [envRT];
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const fallbackTex = createNeutralFallbackTexture();
    const cloudWispTex = createCloudWispTexture(256);
    const sparkTex = createSparkTexture(64);
    disposables.push(fallbackTex, cloudWispTex, sparkTex);

    // 1. Constant Cloud Sky Canopy deep behind all chapters
    const cloudBackdropHandle = createCloudBackdropMaterial(fallbackTex);
    const cloudBackdropGeo = new THREE.PlaneGeometry(46, 26);
    const cloudBackdropMesh = new THREE.Mesh(
      cloudBackdropGeo,
      cloudBackdropHandle.material,
    );
    cloudBackdropMesh.renderOrder = -30;
    cloudBackdropMesh.frustumCulled = false;
    scene.add(cloudBackdropMesh);
    disposables.push(cloudBackdropGeo, cloudBackdropHandle.material);

    // 2. Build 6 Foreground 3D Sculpted Chapters
    const reliefRecords: Array<{ handle: ReliefMaterialHandle; multiplier: number }> = [];
    const flareHandles: HeavenlyFlareHandle[] = [];
    let heliosChakraMesh: THREE.Mesh | null = null;
    let heliosChakraRelief: ReliefMaterialHandle | null = null;
    let heroTypoHandle: HeroTypographyHandle | null = null;
    let doveFlockHandle: CelestialDoveFlockHandle | null = null;
    const goldenSpearHandle: GoldenSpearHandle = buildGoldenSpear();
    scene.add(goldenSpearHandle.group);

    // Chapter VI split Adam & God converging groups + Light Prism
    let adamGroup: THREE.Group | null = null;
    let godGroup: THREE.Group | null = null;
    let godReliefHandle: ReliefMaterialHandle | null = null;
    let creationPrismHandle: CreationLightPrismHandle | null = null;

    // Chapter IV (UNCHANGED): Foreground cloud wisps inside concave cupola
    const cupolaForeWisps: Array<{
      mesh: THREE.Mesh;
      basePos: [number, number, number];
      phase: number;
    }> = [];
    const cupolaWispMat = new THREE.MeshBasicMaterial({
      map: cloudWispTex,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      color: 0xf7ead6,
    });
    const cupolaWispGeo = new THREE.PlaneGeometry(3.8, 2.4);
    disposables.push(cupolaWispMat, cupolaWispGeo);

    const chamberRecords: Array<{
      group: THREE.Group;
      mesh: THREE.Mesh;
      reliefHandle: ReliefMaterialHandle;
      flareHandle: HeavenlyFlareHandle;
      chapter: ExhibitionChapter;
    }> = [];

    EXHIBITION_CHAPTERS.forEach((chapter) => {
      const chamberGroup = new THREE.Group();
      chamberGroup.position.set(...chapter.position);
      chamberGroup.rotation.set(...chapter.restRotation);
      scene.add(chamberGroup);

      const baseStrength = reliefModeRef.current === 'sculpted' ? 0.88 : 0.42;

      if (chapter.index === 0) {
        // CHAPTER I: Dual-layer Helios (Back rotating sunburst chakra + upright foreground bust at z+0.08)
        const targetH = 4.25;
        const targetW = targetH * 1.5;
        const bustGeo = new THREE.PlaneGeometry(targetW, targetH, 220, 220);
        const bustHandle = createFrescoReliefMaterial(
          fallbackTex,
          baseStrength * chapter.reliefMultiplier,
        );
        const bustMesh = new THREE.Mesh(bustGeo, bustHandle.material);
        bustMesh.position.set(0, 0, 0.16);
        bustMesh.renderOrder = 14;
        chamberGroup.add(bustMesh);

        const chakraSize = targetH * 0.91;
        const chakraGeo = new THREE.PlaneGeometry(chakraSize, chakraSize, 160, 160);
        const chakraHandle = createFrescoReliefMaterial(
          fallbackTex,
          baseStrength * 0.65,
        );
        const chakraMesh = new THREE.Mesh(chakraGeo, chakraHandle.material);
        chakraMesh.position.set(-0.03, 0.46, -0.14);
        chakraMesh.renderOrder = 12;
        chamberGroup.add(chakraMesh);

        heliosChakraMesh = chakraMesh;
        heliosChakraRelief = chakraHandle;

        heroTypoHandle = buildHeroTypographyGroup(maxAnisotropy);
        chamberGroup.add(heroTypoHandle.group);

        const flareHandle = buildHeavenlyFlareGroup(chapter.flareArchetype);
        chamberGroup.add(flareHandle.group);

        reliefRecords.push(
          { handle: bustHandle, multiplier: chapter.reliefMultiplier },
          { handle: chakraHandle, multiplier: 0.65 },
        );
        flareHandles.push(flareHandle);
        disposables.push(bustGeo, bustHandle.material, chakraGeo, chakraHandle.material);
        chamberRecords.push({
          group: chamberGroup,
          mesh: bustMesh,
          reliefHandle: bustHandle,
          flareHandle,
          chapter,
        });

        loadHeliosSplitTextures(
          chapter.imageUrl,
          maxAnisotropy,
          chapter.extraction,
        )
          .then(
            ({
              bustTexture,
              chakraTexture,
              aspect,
              chakraOffsetU,
              chakraOffsetV,
              chakraSizeNormH,
            }) => {
              disposables.push(bustTexture, chakraTexture);
              bustHandle.setTexture(bustTexture, aspect);
              chakraHandle.setTexture(chakraTexture, 1.0);

              const exactW = targetH * aspect;
              bustMesh.scale.set(exactW / targetW, 1, 1);

              const exactChakraSize = targetH * chakraSizeNormH;
              chakraMesh.scale.set(
                exactChakraSize / chakraSize,
                exactChakraSize / chakraSize,
                1,
              );
              chakraMesh.position.set(
                chakraOffsetU * exactW,
                chakraOffsetV * targetH,
                -0.14,
              );
            },
          )
          .catch(() => {});
        return;
      }

      if (chapter.index === 5) {
        // CHAPTER VI: Two independent 220x220 3D sculpted reliefs (Adam bottom-left + God top-right)
        // converging along diagonal to meet at fingertip contact & ignite the Light Prism!
        const targetH = 3.55;
        const initFullAspect = 2.31;
        const initSplitU = 0.421;
        const initFullW = targetH * initFullAspect;
        const initLeftW = initFullW * initSplitU;
        const initRightW = initFullW * (1 - initSplitU);

        const adamLocalGroup = new THREE.Group();
        const godLocalGroup = new THREE.Group();
        chamberGroup.add(adamLocalGroup, godLocalGroup);

        const adamGeo = new THREE.PlaneGeometry(initLeftW, targetH, 220, 220);
        // Anchor Adam's fingertip (right edge of left slice, y = +0.18) near (0,0,0)
        adamGeo.translate(-initLeftW * 0.5, -(0.5 - 0.45) * targetH, 0);

        const godGeo = new THREE.PlaneGeometry(initRightW, targetH, 220, 220);
        // Anchor God's fingertip (left edge of right slice, y = +0.18) near (0,0,0)
        godGeo.translate(initRightW * 0.5, -(0.5 - 0.45) * targetH, 0);

        const adamHandle = createFrescoReliefMaterial(
          fallbackTex,
          baseStrength * chapter.reliefMultiplier,
        );
        const godHandle = createFrescoReliefMaterial(
          fallbackTex,
          baseStrength * chapter.reliefMultiplier,
        );

        const adamMesh = new THREE.Mesh(adamGeo, adamHandle.material);
        adamMesh.renderOrder = 17;
        adamLocalGroup.add(adamMesh);

        const godMesh = new THREE.Mesh(godGeo, godHandle.material);
        godMesh.renderOrder = 18;
        godLocalGroup.add(godMesh);

        adamGroup = adamLocalGroup;
        godGroup = godLocalGroup;
        godReliefHandle = godHandle;

        const flareHandle = buildHeavenlyFlareGroup(chapter.flareArchetype);
        chamberGroup.add(flareHandle.group);

        creationPrismHandle = buildCreationLightPrism();
        chamberGroup.add(creationPrismHandle.group);

        reliefRecords.push(
          { handle: adamHandle, multiplier: chapter.reliefMultiplier },
          { handle: godHandle, multiplier: chapter.reliefMultiplier },
        );
        flareHandles.push(flareHandle);
        disposables.push(
          adamGeo,
          adamHandle.material,
          godGeo,
          godHandle.material,
        );

        chamberRecords.push({
          group: chamberGroup,
          mesh: adamMesh,
          reliefHandle: adamHandle,
          flareHandle,
          chapter,
        });

        loadCreationSplitTextures(chapter.imageUrl, maxAnisotropy)
          .then(({ leftTexture, rightTexture, fullAspect, splitU }) => {
            disposables.push(leftTexture, rightTexture);
            const exactFullW = targetH * fullAspect;
            const exactLeftW = exactFullW * splitU;
            const exactRightW = exactFullW * (1 - splitU);

            adamHandle.setTexture(leftTexture, exactLeftW / targetH);
            godHandle.setTexture(rightTexture, exactRightW / targetH);

            adamMesh.scale.set(exactLeftW / initLeftW, 1, 1);
            godMesh.scale.set(exactRightW / initRightW, 1, 1);
          })
          .catch(() => {});
        return;
      }

      // CHAPTERS II, III (unchanged), IV (unchanged), V
      const initialAspect = 1.5;
      const targetH = chapter.isConcaveVault ? 4.95 : 4.25;
      const targetW = targetH * initialAspect;

      const reliefGeo = chapter.isConcaveVault
        ? createConcaveVaultGeometry(targetW, targetH, 180, 180, 1.75)
        : new THREE.PlaneGeometry(targetW, targetH, 220, 220);

      const reliefHandle = createFrescoReliefMaterial(
        fallbackTex,
        baseStrength * chapter.reliefMultiplier,
      );
      const reliefMesh = new THREE.Mesh(reliefGeo, reliefHandle.material);
      reliefMesh.renderOrder = 12 + chapter.index;
      chamberGroup.add(reliefMesh);

      const flareHandle = buildHeavenlyFlareGroup(chapter.flareArchetype);
      chamberGroup.add(flareHandle.group);

      // Chapter II: Ethereal translucent Fresnel 3D dove flock beside chariot
      if (chapter.index === 1) {
        doveFlockHandle = buildCelestialDoveFlock();
        chamberGroup.add(doveFlockHandle.group);
      }

      // Chapter IV (UNCHANGED): Floating foreground 3D cloud wisps around cupola
      if (chapter.isConcaveVault) {
        const wispLayout: Array<[number, number, number, number]> = [
          [-2.35, -1.35, 1.05, 1.15],
          [2.45, -1.25, 1.15, 1.1],
          [-2.75, 0.45, 0.85, 0.92],
          [2.75, 0.55, 0.9, 0.95],
          [0.0, -1.85, 1.35, 1.25],
        ];
        wispLayout.forEach(([wx, wy, wz, ws], idx) => {
          const wMesh = new THREE.Mesh(cupolaWispGeo, cupolaWispMat);
          wMesh.position.set(wx, wy, wz);
          wMesh.scale.setScalar(ws);
          wMesh.renderOrder = 19;
          chamberGroup.add(wMesh);
          cupolaForeWisps.push({
            mesh: wMesh,
            basePos: [wx, wy, wz],
            phase: idx * 1.4,
          });
        });
      }

      // Chapter V directional sun ray & spear are driven globally via goldenSpearHandle

      reliefRecords.push({
        handle: reliefHandle,
        multiplier: chapter.reliefMultiplier,
      });
      flareHandles.push(flareHandle);
      disposables.push(reliefGeo, reliefHandle.material);
      chamberRecords.push({
        group: chamberGroup,
        mesh: reliefMesh,
        reliefHandle,
        flareHandle,
        chapter,
      });

      loadArtworkTexture(
        chapter.imageUrl,
        maxAnisotropy,
        chapter.cropArtworkOnly,
        chapter.extraction,
      )
        .then(({ texture, aspect }) => {
          disposables.push(texture);
          reliefHandle.setTexture(texture, aspect);

          const exactW = targetH * aspect;
          reliefMesh.scale.set(exactW / targetW, 1, 1);
        })
        .catch(() => {});
    });

    reliefRecordsRef.current = reliefRecords;

    loadArtworkTexture(CLOUD_BACKDROP_URL, maxAnisotropy, false)
      .then(({ texture }) => {
        disposables.push(texture);
        cloudBackdropHandle.setTexture(texture);
        onReadyRef.current?.();
      })
      .catch(() => {
        onReadyRef.current?.();
      });

    // 3. Midground Volumetric Cloud Mist Layers behind each foreground relief
    const wispGeo = new THREE.PlaneGeometry(8.8, 5.4);
    const wispMat = new THREE.MeshBasicMaterial({
      map: cloudWispTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      color: 0xf2dcc0,
    });
    const wispCount = 30;
    const wispInstanced = new THREE.InstancedMesh(wispGeo, wispMat, wispCount);
    wispInstanced.frustumCulled = false;
    wispInstanced.renderOrder = 4;
    const wispSeeds: Array<{
      x: number;
      y: number;
      z: number;
      s: number;
      phase: number;
      side: number;
    }> = [];
    for (let i = 0; i < wispCount; i++) {
      const chIdx = Math.floor(i / 5);
      const localSlot = i % 5;
      const chZ = EXHIBITION_CHAPTERS[chIdx].position[2];
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (1.8 + localSlot * 0.95);
      const y = ((localSlot % 3) - 1) * 1.15;
      const z = chZ - (2.8 + localSlot * 0.58);
      const s = 0.95 + (localSlot % 3) * 0.32;
      wispSeeds.push({ x, y, z, s, phase: i * 1.37, side });
      _dummy.position.set(x, y, z);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      wispInstanced.setMatrixAt(i, _dummy.matrix);
    }
    wispInstanced.instanceMatrix.needsUpdate = true;
    scene.add(wispInstanced);
    disposables.push(wispGeo, wispMat);

    // 4. Instanced Golden Dust Motes
    const moteGeo = new THREE.PlaneGeometry(0.088, 0.088);
    const moteMat = new THREE.MeshBasicMaterial({
      map: sparkTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moteCount = 260;
    const moteInstanced = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
    moteInstanced.frustumCulled = false;
    moteInstanced.renderOrder = 22;

    const moteSeeds: Array<{
      x: number;
      y: number;
      z: number;
      speed: number;
      amp: number;
      phase: number;
      scale: number;
    }> = [];
    for (let i = 0; i < moteCount; i++) {
      const isCreationSpark = i >= moteCount - 36;
      const x = isCreationSpark
        ? (Math.random() - 0.5) * 0.65
        : (Math.random() - 0.5) * 12.5;
      const y = isCreationSpark
        ? (Math.random() - 0.5) * 0.5
        : (Math.random() - 0.5) * 6.8;
      const z = isCreationSpark
        ? -120 + 0.65 + (Math.random() - 0.5) * 0.35
        : 6 - Math.random() * 134;
      moteSeeds.push({
        x,
        y,
        z,
        speed: 0.4 + Math.random() * 0.75,
        amp: isCreationSpark ? 0.07 : 0.18 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        scale: isCreationSpark ? 0.9 + Math.random() * 0.95 : 0.55 + Math.random() * 1.15,
      });
    }
    scene.add(moteInstanced);
    disposables.push(moteGeo, moteMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const pointerTarget = { x: 0, y: 0 };
    const pointerSmoothed = { x: 0, y: 0 };
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handlePointerMove = (e: PointerEvent) => {
      if (prefersReducedMotion) return;
      const rect = mountEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerTarget.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mountEl);

    let smoothedProgress = targetProgressRef.current;
    let prevProgress = smoothedProgress;
    let smoothedVelocity = 0;
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, clock.getDelta()));
      const elapsed = clock.elapsedTime;

      const dampFactor = prefersReducedMotion ? 1 : 1 - Math.exp(-6.0 * dt);
      prevProgress = smoothedProgress;
      smoothedProgress = THREE.MathUtils.lerp(
        smoothedProgress,
        targetProgressRef.current,
        dampFactor,
      );

      const rawVelocity = Math.abs(smoothedProgress - prevProgress) / dt;
      smoothedVelocity = THREE.MathUtils.lerp(
        smoothedVelocity,
        Math.min(1.0, rawVelocity * 1.8),
        1 - Math.exp(-8.0 * dt),
      );

      onSyncRef.current?.(smoothedProgress);

      const pDamp = 1 - Math.exp(-5.0 * dt);
      pointerSmoothed.x = THREE.MathUtils.lerp(pointerSmoothed.x, pointerTarget.x, pDamp);
      pointerSmoothed.y = THREE.MathUtils.lerp(pointerSmoothed.y, pointerTarget.y, pDamp);

      sampleFlightCamera(smoothedProgress, _camTargetPos, _camTargetLook);
      const pxOffset = prefersReducedMotion ? 0 : pointerSmoothed.x * 0.62;
      const pyOffset = prefersReducedMotion ? 0 : pointerSmoothed.y * 0.36;
      _camTargetPos.x += pxOffset;
      _camTargetPos.y += pyOffset;

      const camDamp = prefersReducedMotion ? 1 : 1 - Math.exp(-7.0 * dt);
      camera.position.lerp(_camTargetPos, camDamp);
      _currentLook.lerp(_camTargetLook, camDamp);
      camera.lookAt(_currentLook);

      cloudBackdropMesh.position.set(
        camera.position.x * 0.65,
        camera.position.y * 0.65,
        camera.position.z - 25.5,
      );
      cloudBackdropHandle.setParallax(
        pointerSmoothed.x + camera.position.x * 0.16,
        pointerSmoothed.y + camera.position.y * 0.16,
        elapsed,
        smoothedVelocity,
      );

      const activeFloat = smoothedProgress * (EXHIBITION_CHAPTERS.length - 1);
      const activeIdx = Math.min(
        EXHIBITION_CHAPTERS.length - 1,
        Math.max(0, Math.round(activeFloat)),
      );
      const activeCh = EXHIBITION_CHAPTERS[activeIdx];
      _keyTargetColor.set(activeCh.keyColor);
      _rimTargetColor.set(activeCh.rimColor);
      keyLight.color.lerp(_keyTargetColor, 1 - Math.exp(-4.0 * dt));
      rimLight.color.lerp(_rimTargetColor, 1 - Math.exp(-4.0 * dt));

      // Grazing 35° golden-hour key light relative to active chapter target
      keyLight.position.set(
        camera.position.x + 4.2,
        camera.position.y + 3.3,
        camera.position.z + 1.8,
      );
      keyLight.target.position.copy(_currentLook);

      fillLight.position.set(
        camera.position.x - 4.2,
        camera.position.y - 1.6,
        camera.position.z + 2.4,
      );
      fillLight.target.position.copy(_currentLook);

      rimLight.position.set(
        camera.position.x - 5.2,
        camera.position.y + 2.6,
        camera.position.z - 10.2,
      );
      rimLight.target.position.copy(_currentLook);

      let ch3Focus = 0;
      let ch3LocalU = 0;

      for (const rec of chamberRecords) {
        const { chapter, group, reliefHandle, flareHandle } = rec;
        const focus = computeChapterFocus(smoothedProgress, chapter.index);

        group.visible = focus > 0.008;
        reliefHandle.setOpacity(focus);
        reliefHandle.setTime(elapsed);

        const localU = Math.max(
          0,
          Math.min(1, smoothedProgress * EXHIBITION_CHAPTERS.length - chapter.index),
        );

        let baseX = chapter.position[0];
        let baseY = chapter.position[1];
        const baseZ = chapter.position[2];
        let bankRoll = chapter.restRotation[2];
        let bankYaw = chapter.restRotation[1];

        if (chapter.index === 1) {
          const s = smootherstep(localU);
          baseX = -0.95 + s * 1.65;
          baseY = -0.34 + s * 0.62;
          bankRoll = 0.08 - s * 0.13;
          bankYaw = 0.1 - s * 0.2;
        } else if (chapter.index === 2) {
          ch3Focus = focus;
          ch3LocalU = localU;
        }

        const hX = prefersReducedMotion
          ? 0
          : Math.sin(elapsed * 0.42 + chapter.index * 1.7) * 0.07;
        const hY = prefersReducedMotion
          ? 0
          : Math.cos(elapsed * 0.58 + chapter.index * 1.3) * 0.08;
        const hZ = prefersReducedMotion
          ? 0
          : Math.sin(elapsed * 0.35 + chapter.index * 2.1) * 0.07;
        const hRx = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.48 + chapter.index) * 0.015;
        const hRy = prefersReducedMotion ? 0 : Math.cos(elapsed * 0.39 + chapter.index) * 0.022;
        const hRz = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.31 + chapter.index) * 0.01;

        const exitLift = (1 - focus) * 0.35;
        const tiltScale = chapter.isConcaveVault ? 1.45 : 1.0;

        group.position.set(baseX + hX, baseY + hY + exitLift, baseZ + hZ);
        group.rotation.set(
          chapter.restRotation[0] +
            hRx -
            (prefersReducedMotion ? 0 : pointerSmoothed.y * 0.065 * focus * tiltScale),
          bankYaw +
            hRy +
            (prefersReducedMotion ? 0 : pointerSmoothed.x * 0.095 * focus * tiltScale),
          bankRoll + hRz,
        );

        flareHandle.update(elapsed, focus, smoothedVelocity, localU);

        // CHAPTER I: Scroll-driven divine chakra Z-rotation + 3D Hero Typography
        if (chapter.index === 0 && heliosChakraMesh && heliosChakraRelief) {
          heliosChakraRelief.setOpacity(focus);
          heliosChakraRelief.setTime(elapsed);
          heliosChakraMesh.rotation.z = -(localU * Math.PI * 1.2 + elapsed * 0.14);
          heroTypoHandle?.update(elapsed, focus, localU);
        }

        // CHAPTER II: Ethereal translucent 3D dove flock beside chariot
        if (chapter.index === 1 && doveFlockHandle) {
          doveFlockHandle.update(elapsed, focus, localU);
        }

        // CHAPTER IV (UNCHANGED): Foreground 3D cloud wisps around cupola
        if (chapter.isConcaveVault && group.visible) {
          cupolaWispMat.opacity = focus * 0.44;
          for (const w of cupolaForeWisps) {
            w.mesh.position.set(
              w.basePos[0] + Math.sin(elapsed * 0.25 + w.phase) * 0.25,
              w.basePos[1] + Math.cos(elapsed * 0.2 + w.phase) * 0.14,
              w.basePos[2],
            );
          }
        }

        // CHAPTER VI: Extracted Adam (bottom-left) & God (top-right) converge diagonally
        // across 83% -> 100%, meeting at fingertip contact and igniting the Light Prism!
        if (
          chapter.index === 5 &&
          adamGroup &&
          godGroup &&
          godReliefHandle &&
          creationPrismHandle
        ) {
          godReliefHandle.setOpacity(focus);
          godReliefHandle.setTime(elapsed);

          // Converge from corners (83%) cleanly into fingertip touch by ~94% (localU = 0.68)
          const convergeT = smootherstep(Math.min(1, localU / 0.68));
          const finalTouch = THREE.MathUtils.smoothstep(localU, 0.55, 0.88);
          const meetGap = THREE.MathUtils.lerp(0.06, -0.015, finalTouch);

          adamGroup.position.set(
            THREE.MathUtils.lerp(-4.8, -meetGap, convergeT),
            THREE.MathUtils.lerp(-2.4, 0.0, convergeT),
            THREE.MathUtils.lerp(2.2, 0.0, convergeT),
          );
          adamGroup.rotation.z = THREE.MathUtils.lerp(0.06, 0.0, convergeT);

          godGroup.position.set(
            THREE.MathUtils.lerp(4.8, meetGap, convergeT),
            THREE.MathUtils.lerp(2.4, 0.0, convergeT),
            THREE.MathUtils.lerp(2.2, 0.0, convergeT),
          );
          godGroup.rotation.z = THREE.MathUtils.lerp(-0.06, 0.0, convergeT);

          creationPrismHandle.update(elapsed, focus, localU);
        }
      }

      // Chapter III: gentle cool-silver to warm-amber directional light sweep without glare
      if (ch3Focus > 0.01) {
        const smoothSweep = smootherstep(ch3LocalU);
        sweepLight.intensity = ch3Focus * 1.85;
        sweepLight.color.copy(_sweepCoolColor).lerp(_sweepWarmColor, smoothSweep);
        sweepLight.position.set(
          THREE.MathUtils.lerp(3.2, -3.2, smoothSweep),
          0.45 + Math.sin(smoothSweep * Math.PI) * 0.35,
          EXHIBITION_CHAPTERS[2].position[2] + 2.4,
        );
      } else {
        sweepLight.intensity = 0;
      }

      // Continuous 6-chapter 3D Golden Spear trajectory (active in both Portfolio & Pure Art modes)
      goldenSpearHandle.update(
        elapsed,
        smoothedProgress,
        pointerSmoothed.x,
        pointerSmoothed.y,
      );

      // Midground cloud mist planes
      for (let i = 0; i < wispCount; i++) {
        const w = wispSeeds[i];
        const dz = w.z - camera.position.z;
        const proximity = Math.max(0, 1 - Math.abs(dz) / 14);
        const parting = w.side * proximity * 2.2;
        const lensFade = smoothstep(0.8, 4.5, Math.abs(dz));

        _dummy.position.set(
          w.x + parting + Math.sin(elapsed * 0.14 + w.phase) * 0.4,
          w.y + Math.cos(elapsed * 0.1 + w.phase) * 0.22,
          w.z,
        );
        _dummy.scale.setScalar(w.s * (0.4 + 0.6 * lensFade));
        _dummy.rotation.set(0, 0, Math.sin(elapsed * 0.06 + w.phase) * 0.1);
        _dummy.updateMatrix();
        wispInstanced.setMatrixAt(i, _dummy.matrix);
      }
      wispInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < moteCount; i++) {
        const m = moteSeeds[i];
        _dummy.position.set(
          m.x + Math.sin(elapsed * m.speed + m.phase) * m.amp,
          m.y + Math.cos(elapsed * m.speed * 0.8 + m.phase) * m.amp,
          m.z,
        );
        _dummy.quaternion.copy(camera.quaternion);
        const twinkle = m.scale * (0.75 + 0.35 * Math.sin(elapsed * 2.2 + m.phase));
        _dummy.scale.setScalar(twinkle);
        _dummy.updateMatrix();
        moteInstanced.setMatrixAt(i, _dummy.matrix);
      }
      moteInstanced.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      for (const fh of flareHandles) fh.dispose();
      heroTypoHandle?.dispose();
      doveFlockHandle?.dispose();
      goldenSpearHandle.dispose();
      creationPrismHandle?.dispose();
      for (const item of disposables) item.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, [targetProgressRef]);

  return (
    <div
      className={
        frameMode === '16:9'
          ? 'relative mx-auto aspect-video w-full max-w-[min(98vw,calc(98vh*16/9))] overflow-hidden rounded-sm bg-[#12100E] shadow-2xl ring-1 ring-[#EBE2D0]/12'
          : 'relative h-full w-full overflow-hidden bg-[#12100E]'
      }
    >
      <div ref={containerRef} className="h-full w-full" />

      {(webglUnsupported || contextLost) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#12100E]">
          <img
            src={activeChapter.imageUrl}
            alt={activeChapter.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      )}

      {children}
    </div>
  );
}

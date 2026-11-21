import * as THREE from 'three';
import type { ExtractionConfig } from '../data/chapters';

export interface LoadedArtworkTexture {
  texture: THREE.Texture;
  aspect: number;
}

export interface HeliosSplitTextures {
  bustTexture: THREE.Texture;
  chakraTexture: THREE.Texture;
  aspect: number;
  /** Center of sunburst relative to normalized image width/height (centered at 0,0) */
  chakraOffsetU: number;
  chakraOffsetV: number;
  chakraSizeNormH: number;
}

export interface CreationSplitTextures {
  leftTexture: THREE.Texture;
  rightTexture: THREE.Texture;
  fullAspect: number;
  splitU: number;
  fingertipV: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function featherAlphaBuffer(
  alphaBuf: Float32Array,
  w: number,
  h: number,
  radius = 3,
): Float32Array {
  const total = w * h;
  const tempAlpha = new Float32Array(total);
  const outAlpha = new Float32Array(total);
  const kernel = [1, 2, 3, 4, 3, 2, 1];
  const kRad = Math.min(3, radius);

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -kRad; k <= kRad; k++) {
        const sx = Math.max(0, Math.min(w - 1, x + k));
        acc += alphaBuf[rowOff + sx] * kernel[k + 3];
      }
      tempAlpha[rowOff + x] = acc / 16;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -kRad; k <= kRad; k++) {
        const sy = Math.max(0, Math.min(h - 1, y + k));
        acc += tempAlpha[sy * w + x] * kernel[k + 3];
      }
      outAlpha[y * w + x] = clamp01(acc / 255 / 16) * 255;
    }
  }
  return outAlpha;
}

function buildMaskCanvasFromAlpha(
  alphaBuf: Float32Array,
  w: number,
  h: number,
): HTMLCanvasElement {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const ctx = maskCanvas.getContext('2d');
  if (!ctx) return maskCanvas;
  const imgData = ctx.createImageData(w, h);
  const out = imgData.data;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    out[p] = 255;
    out[p + 1] = 255;
    out[p + 2] = 255;
    out[p + 3] = Math.round(clamp01(alphaBuf[i] / 255) * 255);
  }
  ctx.putImageData(imgData, 0, 0);
  return maskCanvas;
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Computes a fast non-blocking segmentation alpha mask at max 768px resolution.
 * Chapters II, III, IV, V preserve their targeted extraction rules cleanly.
 */
function buildSegmentationMaskCanvas(
  sourceCanvas: HTMLCanvasElement,
  cfg: ExtractionConfig,
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const maxDim = 768;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(32, Math.round(srcW * scale));
  const h = Math.max(32, Math.round(srcH * scale));

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const ctx = maskCanvas.getContext('2d');
  if (!ctx) return maskCanvas;

  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;

  const alphaBuf = new Float32Array(total);
  alphaBuf.fill(255);

  if (cfg.mode === 'cupola') {
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        const u = (x + 0.5) / w;
        const edgeX = smoothstep(0.0, 0.055, Math.min(u, 1 - u));
        const edgeY = smoothstep(0.0, 0.045, Math.min(v, 1 - v));
        const cornerDist = Math.hypot((u - 0.5) * 1.9, (v - 0.5) * 1.9);
        const cornerSoft = 1 - smoothstep(0.96, 1.32, cornerDist);
        alphaBuf[rowOff + x] = clamp01(edgeX * edgeY * cornerSoft) * 255;
      }
    }
  } else {
    const sectorSamples: Array<{ r: number; g: number; b: number; count: number }> =
      Array.from({ length: 8 }, () => ({ r: 0, g: 0, b: 0, count: 0 }));

    const borderBand = 4;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (
          x >= borderBand &&
          x < w - borderBand &&
          y >= borderBand &&
          y < h - borderBand
        ) {
          continue;
        }
        const sector =
          (y < h * 0.33 ? 0 : y < h * 0.66 ? 1 : 2) * 3 +
          (x < w * 0.33 ? 0 : x < w * 0.66 ? 1 : 2);
        const sIdx = Math.min(7, sector);
        const p = (y * w + x) * 4;
        sectorSamples[sIdx].r += data[p];
        sectorSamples[sIdx].g += data[p + 1];
        sectorSamples[sIdx].b += data[p + 2];
        sectorSamples[sIdx].count++;
      }
    }

    const borderSeeds = sectorSamples
      .filter((s) => s.count > 0)
      .map((s) => [s.r / s.count, s.g / s.count, s.b / s.count] as const);

    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let qHead = 0;
    let qTail = 0;

    const isBackgroundPixel = (idx: number): number => {
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const maxC = Math.max(rn, gn, bn);
      const minC = Math.min(rn, gn, bn);
      const luma = 0.299 * rn + 0.587 * gn + 0.114 * bn;
      const sat = maxC > 0.01 ? (maxC - minC) / maxC : 0;

      let minDist = 999;
      for (let k = 0; k < borderSeeds.length; k++) {
        const sr = borderSeeds[k][0];
        const sg = borderSeeds[k][1];
        const sb = borderSeeds[k][2];
        const dist = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
        if (dist < minDist) minDist = dist;
      }

      const x = idx % w;
      const y = (idx - x) / w;
      const u = x / w;
      const v = y / h;

      const dx = (u - cfg.focusCenterX) / cfg.protectRadiusX;
      const dy = (v - cfg.focusCenterY) / cfg.protectRadiusY;
      const insideFocus = Math.sqrt(dx * dx + dy * dy) < 1.0;

      const isWarmFleshOrGold =
        rn > gn * 1.04 && gn > bn * 1.08 && sat > 0.2 && luma > 0.18 && luma < 0.86;
      const isRichPigment = sat > 0.32 && luma > 0.14;

      if (insideFocus && (isWarmFleshOrGold || isRichPigment)) {
        return 0;
      }

      let modeScore = 0;
      if (cfg.mode === 'parchment') {
        const isPaleParchment = luma > 0.5 && sat < 0.37;
        const isDarkCornerWash =
          luma < 0.4 && sat < 0.35 && (u < 0.24 || u > 0.76 || v < 0.28);
        if (isPaleParchment || isDarkCornerWash) modeScore = 0.88;
      } else if (cfg.mode === 'skyBlue') {
        const blueDom = bn - rn;
        if (blueDom > 0.055 && luma > 0.32) modeScore = 0.96;
        else if (minDist < cfg.colorTolerance && luma > 0.4 && !isWarmFleshOrGold)
          modeScore = 0.82;
      } else if (cfg.mode === 'darkSmoke') {
        if (luma < 0.44 && sat < 0.24) modeScore = 0.92;
      } else if (cfg.mode === 'plaster') {
        if (sat < 0.26 && luma > 0.24 && luma < 0.78 && !isWarmFleshOrGold) {
          modeScore = 0.88;
        }
      }

      const distScore =
        1 - smoothstep(cfg.colorTolerance * 0.52, cfg.colorTolerance * 1.48, minDist);
      return clamp01(Math.max(modeScore * distScore, distScore * 0.95));
    };

    for (let x = 0; x < w; x++) {
      const topIdx = x;
      const botIdx = (h - 1) * w + x;
      visited[topIdx] = 1;
      queue[qTail++] = topIdx;
      if (!visited[botIdx]) {
        visited[botIdx] = 1;
        queue[qTail++] = botIdx;
      }
    }
    for (let y = 1; y < h - 1; y++) {
      const leftIdx = y * w;
      const rightIdx = y * w + (w - 1);
      if (!visited[leftIdx]) {
        visited[leftIdx] = 1;
        queue[qTail++] = leftIdx;
      }
      if (!visited[rightIdx]) {
        visited[rightIdx] = 1;
        queue[qTail++] = rightIdx;
      }
    }

    while (qHead < qTail) {
      const idx = queue[qHead++];
      const bgScore = isBackgroundPixel(idx);

      if (bgScore > 0.34) {
        alphaBuf[idx] = Math.round((1 - smoothstep(0.34, 0.7, bgScore)) * 255);

        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0 && !visited[idx - 1]) {
          visited[idx - 1] = 1;
          queue[qTail++] = idx - 1;
        }
        if (x < w - 1 && !visited[idx + 1]) {
          visited[idx + 1] = 1;
          queue[qTail++] = idx + 1;
        }
        if (y > 0 && !visited[idx - w]) {
          visited[idx - w] = 1;
          queue[qTail++] = idx - w;
        }
        if (y < h - 1 && !visited[idx + w]) {
          visited[idx + w] = 1;
          queue[qTail++] = idx + w;
        }
      }
    }

    if (cfg.mode === 'skyBlue') {
      for (let y = 2; y < h - 2; y++) {
        const v = y / h;
        for (let x = 2; x < w - 2; x++) {
          const idx = y * w + x;
          if (alphaBuf[idx] < 128) continue;
          const u = x / w;
          const p = idx * 4;
          const rn = data[p] / 255;
          const gn = data[p + 1] / 255;
          const bn = data[p + 2] / 255;
          const maxC = Math.max(rn, gn, bn);
          const minC = Math.min(rn, gn, bn);
          const luma = 0.299 * rn + 0.587 * gn + 0.114 * bn;
          if (bn - rn > 0.1 && luma > 0.42 && Math.hypot(u - 0.42, v - 0.42) > 0.23) {
            alphaBuf[idx] = 0;
          }
          void minC;
          void maxC;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      const bottomMist = 1 - smoothstep(0.86, 0.995, v);
      const topFade = smoothstep(0.0, 0.025, v);
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        const u = (x + 0.5) / w;
        const sideFade = smoothstep(0.0, 0.025, Math.min(u, 1 - u));
        alphaBuf[rowOff + x] *= bottomMist * topFade * sideFade;
      }
    }
  }

  const feathered = featherAlphaBuffer(alphaBuf, w, h, 3);
  return buildMaskCanvasFromAlpha(feathered, w, h);
}

/**
 * Chapter I: Splits sunburst-figure.png into two aligned 3D layers:
 * 1) bustTexture: Helios's head, laurel crown, neck, chest, shoulders, drape, and staff
 * 2) chakraTexture: Square 360-degree golden sunburst chakra centered directly behind his head/crown
 */
export function loadHeliosSplitTextures(
  url: string,
  maxAnisotropy: number,
  extraction: ExtractionConfig,
): Promise<HeliosSplitTextures> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w;
      srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) {
        reject(new Error('Canvas 2D unavailable'));
        return;
      }
      srcCtx.drawImage(img, 0, 0, w, h);

      // Heal vertical wooden staff/stick across Helios's shoulder, drape, and hand (u: 0.648..0.706, v: 0.64..0.99)
      // so the live 3D Golden Spear cleanly replaces the painted staff without leaving a scar on his shoulder/torso.
      const srcImg = srcCtx.getImageData(0, 0, w, h);
      const sp = srcImg.data;
      const healY0 = Math.floor(h * 0.635);
      const healY1 = h - 1;
      const healXLeft = Math.floor(w * 0.646);
      const healXRight = Math.ceil(w * 0.708);
      for (let y = healY0; y <= healY1; y++) {
        const vNorm = y / h;
        // Slightly narrower heal over fingers/palm (v > 0.77) vs upper shoulder drape
        const padLeft = Math.max(0, healXLeft - Math.round(w * 0.012));
        const padRight = Math.min(w - 1, healXRight + Math.round(w * 0.012));
        for (let x = healXLeft; x <= healXRight; x++) {
          const t = (x - healXLeft) / Math.max(1, healXRight - healXLeft);
          const lIdx = (y * w + padLeft) * 4;
          const rIdx = (y * w + padRight) * 4;
          // Bias toward left shoulder/robe tone near bottom edge so drape folds stay continuous
          const blendW = vNorm > 0.82 ? t * 0.62 : t;
          const dstIdx = (y * w + x) * 4;
          sp[dstIdx] = Math.round(sp[lIdx] * (1 - blendW) + sp[rIdx] * blendW);
          sp[dstIdx + 1] = Math.round(sp[lIdx + 1] * (1 - blendW) + sp[rIdx + 1] * blendW);
          sp[dstIdx + 2] = Math.round(sp[lIdx + 2] * (1 - blendW) + sp[rIdx + 2] * blendW);
        }
      }
      srcCtx.putImageData(srcImg, 0, 0);

      // Base parchment mask for clean figure + ray extraction
      const baseMaskCanvas = buildSegmentationMaskCanvas(srcCanvas, extraction);
      const maskCtx = baseMaskCanvas.getContext('2d');
      const mw = baseMaskCanvas.width;
      const mh = baseMaskCanvas.height;
      const maskData = maskCtx ? maskCtx.getImageData(0, 0, mw, mh).data : null;

      // Sunburst center in normalized image coordinates (center behind Helios's eyes/laurel)
      const cxNorm = 0.495;
      const cyNorm = 0.39;

      // 1. Build Foreground Bust Alpha (Helios head/crown + clean shoulders/torso, zero painted staff)
      const bustAlpha = new Float32Array(mw * mh);
      const srcSmallCanvas = document.createElement('canvas');
      srcSmallCanvas.width = mw;
      srcSmallCanvas.height = mh;
      const smallCtx = srcSmallCanvas.getContext('2d');
      smallCtx?.drawImage(srcCanvas, 0, 0, mw, mh);
      const smallPixels = smallCtx?.getImageData(0, 0, mw, mh).data;

      for (let y = 0; y < mh; y++) {
        const v = (y + 0.5) / mh;
        for (let x = 0; x < mw; x++) {
          const u = (x + 0.5) / mw;
          const idx = y * mw + x;
          const baseA = maskData ? maskData[idx * 4 + 3] : 255;

          const p = idx * 4;
          const rn = smallPixels ? smallPixels[p] / 255 : 0.5;
          const gn = smallPixels ? smallPixels[p + 1] / 255 : 0.5;
          const bn = smallPixels ? smallPixels[p + 2] / 255 : 0.5;
          const luma = 0.299 * rn + 0.587 * gn + 0.114 * bn;

          // Head & laurel crown silhouette ellipse (including raised top loop ornament)
          const headDist = Math.hypot((u - 0.492) / 0.132, (v - 0.395) / 0.215);
          const crownLoopDist = Math.hypot((u - 0.492) / 0.055, (v - 0.245) / 0.095);
          const neckDist = Math.hypot((u - 0.492) / 0.095, (v - 0.58) / 0.14);

          // Torso, shoulders, & billowing drape below v = 0.54
          const torsoSlope = 1 - smoothstep(0.54, 0.72, v);
          const torsoEnv =
            v > 0.54
              ? 1 -
                smoothstep(
                  0.12 + (v - 0.54) * 1.15,
                  0.22 + (v - 0.54) * 1.28,
                  Math.abs(u - 0.505),
                )
              : 0;

          // Mask out the upper vertical staff & finial + outer right parchment sky (u: 0.625..0.85, v < 0.66)
          const inUpperStaff =
            u > 0.622 && u < 0.735 && v < 0.668
              ? smoothstep(0.622, 0.642, u) *
                (1 - smoothstep(0.71, 0.735, u)) *
                (1 - smoothstep(0.64, 0.668, v))
              : 0;
          const inRightSkyPocket =
            u >= 0.72 && u <= 0.85 && v >= 0.12 && v <= 0.65
              ? 1 - smoothstep(0.58, 0.65, v)
              : 0;

          const inHead = 1 - smoothstep(0.76, 1.05, Math.min(headDist, crownLoopDist, neckDist));
          const bustKeep =
            Math.max(inHead, torsoEnv * (1 - torsoSlope * 0.25)) *
            (1 - Math.max(inUpperStaff, inRightSkyPocket));

          // Also discard pale parchment inside lower ray gaps
          const isPaleBackground = luma > 0.65 && v < 0.66 && inHead < 0.2;
          const keep = isPaleBackground ? 0 : bustKeep;
          bustAlpha[idx] = baseA * clamp01(keep);
        }
      }

      const bustFeathered = featherAlphaBuffer(bustAlpha, mw, mh, 3);
      const bustMaskCanvas = buildMaskCanvasFromAlpha(bustFeathered, mw, mh);

      const bustCanvas = document.createElement('canvas');
      bustCanvas.width = w;
      bustCanvas.height = h;
      const bustCtx = bustCanvas.getContext('2d');
      if (bustCtx) {
        bustCtx.drawImage(srcCanvas, 0, 0);
        bustCtx.globalCompositeOperation = 'destination-in';
        bustCtx.imageSmoothingEnabled = true;
        bustCtx.imageSmoothingQuality = 'high';
        bustCtx.drawImage(bustMaskCanvas, 0, 0, w, h);
      }

      // 2. Build Square 360-degree Sunburst Chakra Canvas centered at (cxNorm, cyNorm)
      const chakraSize = 512;
      const chakraCanvas = document.createElement('canvas');
      chakraCanvas.width = chakraSize;
      chakraCanvas.height = chakraSize;
      const chCtx = chakraCanvas.getContext('2d');
      if (chCtx && smallPixels) {
        const outImg = chCtx.createImageData(chakraSize, chakraSize);
        const out = outImg.data;
        const radiusPx = h * 0.455; // Covers sunburst outer halo ring & tips cleanly
        const cxPx = cxNorm * mw;
        const cyPx = cyNorm * mh;
        const rMaxSmall = radiusPx * (mh / h);

        const sampleSrc = (sx: number, sy: number) => {
          const ix = Math.max(0, Math.min(mw - 1, Math.round(sx)));
          const iy = Math.max(0, Math.min(mh - 1, Math.round(sy)));
          const p = (iy * mw + ix) * 4;
          return [smallPixels[p], smallPixels[p + 1], smallPixels[p + 2]] as const;
        };

        for (let py = 0; py < chakraSize; py++) {
          const ny = (py + 0.5) / chakraSize - 0.5;
          for (let px = 0; px < chakraSize; px++) {
            const nx = (px + 0.5) / chakraSize - 0.5;
            const rNorm = Math.hypot(nx, ny) * 2.0; // 0 at center -> 1.0 at circle edge
            if (rNorm >= 0.99) continue;

            // Mirror bottom/staff-occluded angles to clean upper hemisphere rays so the chakra
            // forms an unbroken 360-degree fresco sunburst wheel when spinning
            let sx = cxPx + nx * 2.0 * rMaxSmall;
            let sy = cyPx + ny * 2.0 * rMaxSmall;
            const inTorsoSector = sy > mh * 0.54 && Math.abs(sx - mw * 0.5) < mw * 0.28;
            const inStaffSector = Math.abs(sx - mw * 0.674) < mw * 0.036;
            if (inTorsoSector) {
              sy = cyPx - Math.abs(ny) * 2.0 * rMaxSmall;
            }
            if (inStaffSector) {
              sx = cxPx - Math.abs(nx) * 2.0 * rMaxSmall;
            }
            if (sy < 2) sy = cyPx + Math.abs(cyPx - sy);

            const [r, g, b] = sampleSrc(sx, sy);
            const rn = r / 255;
            const gn = g / 255;
            const bn = b / 255;
            const maxC = Math.max(rn, gn, bn);
            const minC = Math.min(rn, gn, bn);
            const luma = 0.299 * rn + 0.587 * gn + 0.114 * bn;
            const sat = maxC > 0.01 ? (maxC - minC) / maxC : 0;

            // Extract rich golden rays & outer halo ring while keying pale parchment gaps
            const rayChroma = clamp01((sat - 0.2) * 3.4);
            const rayShade = clamp01((0.76 - luma) * 3.6);
            const innerCoreGlow = 1 - smoothstep(0.18, 0.44, rNorm);
            const outerFade = 1 - smoothstep(0.84, 0.985, rNorm);

            // Blend warm golden-ivory behind Helios's head so no dark shadow peeks behind
            const cr = Math.round(r * (1 - innerCoreGlow * 0.72) + 252 * (innerCoreGlow * 0.72));
            const cg = Math.round(g * (1 - innerCoreGlow * 0.72) + 216 * (innerCoreGlow * 0.72));
            const cb = Math.round(b * (1 - innerCoreGlow * 0.72) + 128 * (innerCoreGlow * 0.72));

            const alpha = clamp01(Math.max(rayChroma * rayShade * 1.15, innerCoreGlow * 0.92)) * outerFade;
            const op = (py * chakraSize + px) * 4;
            out[op] = cr;
            out[op + 1] = cg;
            out[op + 2] = cb;
            out[op + 3] = Math.round(alpha * 255);
          }
        }
        chCtx.putImageData(outImg, 0, 0);
      }

      resolve({
        bustTexture: finalizeTexture(bustCanvas, maxAnisotropy),
        chakraTexture: finalizeTexture(chakraCanvas, maxAnisotropy),
        aspect: w / Math.max(1, h),
        chakraOffsetU: cxNorm - 0.5,
        chakraOffsetV: 0.5 - cyNorm,
        chakraSizeNormH: 0.91,
      });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Chapter VI: Crops Creation of Adam cleanly inside inner Sistine bounds
 * (x: 3.0%-95.5%, y: 16.5%-78.0%), heals corner UI badge, removes surrounding
 * cream/limestone plaster background completely via border-seeded flood-fill,
 * and slices cleanly at the central fingertip gap into two independent 3D meshes.
 */
export function loadCreationSplitTextures(
  url: string,
  maxAnisotropy: number,
): Promise<CreationSplitTextures> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const sx = Math.round(img.naturalWidth * 0.03);
      const sy = Math.round(img.naturalHeight * 0.165);
      const sw = Math.round(img.naturalWidth * (0.955 - 0.03));
      const sh = Math.round(img.naturalHeight * (0.78 - 0.165));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D unavailable'));
        return;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // Heal only the small top-left rounded square UI badge before flood-fill
      const scaleX = img.naturalWidth / 887;
      const scaleY = img.naturalHeight / 577;
      const badgeX = Math.round(10 * scaleX);
      const badgeY = Math.round(0 * scaleY);
      const badgeW = Math.round(42 * scaleX);
      const badgeH = Math.round(40 * scaleY);
      const sampleX = Math.round(58 * scaleX);
      const sampleY = Math.round(4 * scaleY);

      ctx.save();
      ctx.beginPath();
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
      ctx.clip();
      ctx.filter = 'blur(1.5px)';
      ctx.drawImage(
        cropCanvas,
        sampleX,
        sampleY,
        badgeW,
        badgeH,
        badgeX,
        badgeY,
        badgeW,
        badgeH,
      );
      ctx.restore();

      // Run border-seeded BFS flood-fill specifically tuned to remove cream/limestone
      // plaster while keeping 100% of Adam, earth mound, God, angels, cloak & hands intact
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const pixels = imgData.data;
      const total = sw * sh;
      const alphaBuf = new Float32Array(total);
      alphaBuf.fill(255);

      const visited = new Uint8Array(total);
      const queue = new Int32Array(total);
      let qHead = 0;
      let qTail = 0;

      const bgConfidence = (idx: number): number => {
        const p = idx * 4;
        const r = pixels[p];
        const g = pixels[p + 1];
        const b = pixels[p + 2];

        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const maxC = Math.max(rn, gn, bn);
        const minC = Math.min(rn, gn, bn);
        const luma = 0.299 * rn + 0.587 * gn + 0.114 * bn;
        const sat = maxC > 0.01 ? (maxC - minC) / maxC : 0;
        const warmSpread = rn - bn;

        const x = idx % sw;
        const y = (idx - x) / sw;
        const u = x / sw;
        const v = y / sh;

        // Protect warm flesh, Adam's sunlit shoulder/arm, God's hands/robe, crimson mantle & dark earth
        const isWarmFlesh = warmSpread > 0.165 && sat > 0.22;
        const isCrimsonOrEarth = luma < 0.65;
        const isInsideMantle =
          Math.hypot((u - 0.72) / 0.25, (v - 0.42) / 0.34) < 1.0;

        if (isWarmFlesh || isCrimsonOrEarth || isInsideMantle) {
          return 0;
        }

        // Cream / limestone plaster sky has high luma (>0.67), low saturation (<0.22), low warm spread
        if (luma > 0.66 && sat < 0.22 && warmSpread < 0.165) {
          const lScore = smoothstep(0.66, 0.78, luma);
          const sScore = 1 - smoothstep(0.14, 0.23, sat);
          return clamp01(lScore * sScore);
        }

        return 0;
      };

      const seedPoint = (idx: number) => {
        if (!visited[idx]) {
          visited[idx] = 1;
          queue[qTail++] = idx;
        }
      };

      // Seed perimeter + center-bottom limestone wedge pocket
      for (let x = 0; x < sw; x++) {
        seedPoint(x);
        seedPoint((sh - 1) * sw + x);
      }
      for (let y = 1; y < sh - 1; y++) {
        seedPoint(y * sw);
        seedPoint(y * sw + (sw - 1));
      }
      // Also seed pale plaster gap between Adam's leg & God's extended robe
      seedPoint(Math.round(sh * 0.88) * sw + Math.round(sw * 0.49));
      seedPoint(Math.round(sh * 0.2) * sw + Math.round(sw * 0.38));

      while (qHead < qTail) {
        const idx = queue[qHead++];
        const conf = bgConfidence(idx);
        if (conf > 0.28) {
          alphaBuf[idx] = Math.round((1 - smoothstep(0.28, 0.68, conf)) * 255);
          const x = idx % sw;
          const y = (idx - x) / sw;
          if (x > 0) seedPoint(idx - 1);
          if (x < sw - 1) seedPoint(idx + 1);
          if (y > 0) seedPoint(idx - sw);
          if (y < sh - 1) seedPoint(idx + sw);
        }
      }

      // Soft outer safety edge dissolve (2.5%) so no flat rectangular edges ever show
      for (let y = 0; y < sh; y++) {
        const v = (y + 0.5) / sh;
        const vFade =
          smoothstep(0.0, 0.025, v) * (1 - smoothstep(0.96, 1.0, v));
        const rowOff = y * sw;
        for (let x = 0; x < sw; x++) {
          const u = (x + 0.5) / sw;
          const uFade = smoothstep(0.0, 0.025, Math.min(u, 1 - u));
          alphaBuf[rowOff + x] *= vFade * uFade;
        }
      }

      const feathered = featherAlphaBuffer(alphaBuf, sw, sh, 3);
      const maskCanvas = buildMaskCanvasFromAlpha(feathered, sw, sh);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(maskCanvas, 0, 0, sw, sh);
      ctx.restore();

      // Slice cleanly along the central fingertip gap (splitU = 0.421 in cropped canvas)
      const splitU = 0.421;
      const fingertipV = 0.45;
      const splitPx = Math.round(sw * splitU);

      const leftCanvas = document.createElement('canvas');
      leftCanvas.width = splitPx;
      leftCanvas.height = sh;
      const lCtx = leftCanvas.getContext('2d');
      lCtx?.drawImage(cropCanvas, 0, 0, splitPx, sh, 0, 0, splitPx, sh);

      const rightW = sw - splitPx;
      const rightCanvas = document.createElement('canvas');
      rightCanvas.width = rightW;
      rightCanvas.height = sh;
      const rCtx = rightCanvas.getContext('2d');
      rCtx?.drawImage(cropCanvas, splitPx, 0, rightW, sh, 0, 0, rightW, sh);

      resolve({
        leftTexture: finalizeTexture(leftCanvas, maxAnisotropy),
        rightTexture: finalizeTexture(rightCanvas, maxAnisotropy),
        fullAspect: sw / Math.max(1, sh),
        splitU,
        fingertipV,
      });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Standard loader for Chapters II, III, IV, V & cloud backdrop.
 */
export function loadArtworkTexture(
  url: string,
  maxAnisotropy: number,
  cropArtworkOnly = false,
  extraction?: ExtractionConfig,
): Promise<LoadedArtworkTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const fullCanvas = document.createElement('canvas');
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      fullCanvas.width = width;
      fullCanvas.height = height;
      const ctx = fullCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      void cropArtworkOnly;

      if (extraction) {
        const maskCanvas = buildSegmentationMaskCanvas(fullCanvas, extraction);
        if (ctx) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-in';
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(maskCanvas, 0, 0, width, height);
          ctx.restore();
        }
      }

      resolve({
        texture: finalizeTexture(fullCanvas, maxAnisotropy),
        aspect: width / Math.max(1, height),
      });
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export function createNeutralFallbackTexture(): THREE.DataTexture {
  const data = new Uint8Array([128, 120, 108, 0]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCloudWispTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const puffs = [
      { x: 0.5, y: 0.52, r: 0.45, a: 0.36, c: '252, 238, 214' },
      { x: 0.34, y: 0.56, r: 0.34, a: 0.28, c: '238, 218, 188' },
      { x: 0.67, y: 0.48, r: 0.35, a: 0.3, c: '254, 244, 224' },
      { x: 0.52, y: 0.37, r: 0.29, a: 0.24, c: '242, 228, 208' },
    ];
    for (const p of puffs) {
      const cx = p.x * size;
      const cy = p.y * size;
      const rad = p.r * size;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(${p.c}, ${p.a})`);
      grad.addColorStop(0.52, `rgba(${p.c}, ${p.a * 0.42})`);
      grad.addColorStop(1, `rgba(${p.c}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSparkTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255, 250, 232, 1)');
    grad.addColorStop(0.28, 'rgba(244, 204, 128, 0.82)');
    grad.addColorStop(0.65, 'rgba(212, 168, 83, 0.24)');
    grad.addColorStop(1, 'rgba(212, 168, 83, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

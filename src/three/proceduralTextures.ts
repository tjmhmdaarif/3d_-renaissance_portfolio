import * as THREE from 'three';

export interface PlanetTextureSet {
  albedo: THREE.CanvasTexture;
  bump?: THREE.CanvasTexture;
  specular?: THREE.CanvasTexture;
  nightLights?: THREE.CanvasTexture;
  clouds?: THREE.CanvasTexture;
  cloudsSecondary?: THREE.CanvasTexture;
  rings?: THREE.CanvasTexture;
}

// Fast deterministic PRNG + periodic longitude noise grid for seamless 2048px equirectangular maps
function hash2(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function periodicFbm(
  u: number,
  v: number,
  freqX: number,
  freqY: number,
  octaves: number,
  seed: number,
): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = freqX;
  let fy = freqY;
  for (let o = 0; o < octaves; o++) {
    const px = ((u * fx) % fx + fx) % fx;
    const py = Math.max(0, Math.min(fy - 0.001, v * fy));
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = (x0 + 1) % fx;
    const y1 = Math.min(fy, y0 + 1);
    const tx = px - x0;
    const ty = py - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);

    const n00 = hash2(x0, y0, seed + o * 31);
    const n10 = hash2(x1, y0, seed + o * 31);
    const n01 = hash2(x0, y1, seed + o * 31);
    const n11 = hash2(x1, y1, seed + o * 31);

    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    sum += (nx0 + (nx1 - nx0) * sy) * amp;
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return sum / norm;
}

/**
 * Generates a 512x256 seamless scalar noise field and smoothly scales to a
 * 2048x1024 offscreen canvas, then stamps crisp vector craters/canyons/eddies/cities
 * at full 2048x1024 resolution.
 */
function buildNoiseBaseCanvas(
  w: number,
  h: number,
  maxAnisotropy: number,
  isColor: boolean,
  paintPixel: (u: number, v: number, n1: number, n2: number, out: [number, number, number, number]) => void,
  seed: number,
  freqX = 8,
  freqY = 4,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
  const gw = 512;
  const gh = 256;
  const lowCanvas = document.createElement('canvas');
  lowCanvas.width = gw;
  lowCanvas.height = gh;
  const lCtx = lowCanvas.getContext('2d')!;
  const img = lCtx.createImageData(gw, gh);
  const d = img.data;
  const rgba: [number, number, number, number] = [0, 0, 0, 255];

  for (let y = 0; y < gh; y++) {
    const v = (y + 0.5) / gh;
    for (let x = 0; x < gw; x++) {
      const u = (x + 0.5) / gw;
      const n1 = periodicFbm(u, v, freqX, freqY, 5, seed);
      const n2 = periodicFbm(u + n1 * 0.08, v + n1 * 0.04, freqX * 2, freqY * 2, 4, seed + 177);
      paintPixel(u, v, n1, n2, rgba);
      const idx = (y * gw + x) * 4;
      d[idx] = rgba[0];
      d[idx + 1] = rgba[1];
      d[idx + 2] = rgba[2];
      d[idx + 3] = rgba[3];
    }
  }
  lCtx.putImageData(img, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(lowCanvas, 0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return { canvas, ctx, tex };
}

function stampCrater(
  ctx: CanvasRenderingContext2D,
  bumpCtx: CanvasRenderingContext2D | null,
  cx: number,
  cy: number,
  r: number,
  rays = false,
  w = 2048,
) {
  const drawAt = (ox: number) => {
    const x = cx + ox;
    if (rays) {
      ctx.save();
      ctx.strokeStyle = 'rgba(225, 222, 215, 0.14)';
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + (cx % 1);
        ctx.lineWidth = Math.max(1, r * 0.08);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * r * 0.9, cy + Math.sin(ang) * r * 0.9);
        ctx.lineTo(x + Math.cos(ang) * r * 4.5, cy + Math.sin(ang) * r * 4.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    const grad = ctx.createRadialGradient(x, cy, r * 0.1, x, cy, r * 1.15);
    grad.addColorStop(0, 'rgba(58, 56, 54, 0.55)');
    grad.addColorStop(0.75, 'rgba(92, 89, 85, 0.35)');
    grad.addColorStop(0.92, 'rgba(205, 200, 194, 0.45)');
    grad.addColorStop(1, 'rgba(120, 118, 115, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fill();

    if (bumpCtx) {
      const bGrad = bumpCtx.createRadialGradient(x, cy, 0, x, cy, r * 1.15);
      bGrad.addColorStop(0, 'rgba(30, 30, 30, 0.65)');
      bGrad.addColorStop(0.78, 'rgba(70, 70, 70, 0.4)');
      bGrad.addColorStop(0.92, 'rgba(240, 240, 240, 0.72)');
      bGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      bumpCtx.fillStyle = bGrad;
      bumpCtx.beginPath();
      bumpCtx.arc(x, cy, r * 1.15, 0, Math.PI * 2);
      bumpCtx.fill();
    }
  };

  drawAt(0);
  if (cx - r * 2 < 0) drawAt(w);
  if (cx + r * 2 > w) drawAt(-w);
}

export function buildAllPlanetTextures(
  maxAnisotropy: number,
): Record<string, PlanetTextureSet> {
  const W = 2048;
  const H = 1024;
  const sets: Record<string, PlanetTextureSet> = {};

  // 1. MERCURY: High-contrast Caloris impact basins, ray systems & regolith bump
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, _v, n1, n2, out) => {
        const g = 88 + Math.round(n1 * 88 + n2 * 38);
        out[0] = g + 4;
        out[1] = g + 1;
        out[2] = g - 3;
        out[3] = 255;
      },
      101,
    );
    const bmp = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      false,
      (_u, _v, n1, n2, out) => {
        const g = Math.round((n1 * 0.65 + n2 * 0.35) * 200);
        out[0] = g;
        out[1] = g;
        out[2] = g;
        out[3] = 255;
      },
      101,
    );
    // Caloris-scale ringed impact basin
    stampCrater(alb.ctx, bmp.ctx, 640, 420, 145, true, W);
    stampCrater(alb.ctx, bmp.ctx, 640, 420, 95, false, W);
    for (let i = 0; i < 160; i++) {
      const cx = hash2(i, 1, 55) * W;
      const cy = 100 + hash2(i, 2, 55) * (H - 200);
      const r = 8 + hash2(i, 3, 55) * 46;
      stampCrater(alb.ctx, bmp.ctx, cx, cy, r, i % 15 === 0, W);
    }
    alb.tex.needsUpdate = true;
    bmp.tex.needsUpdate = true;
    sets.mercury = { albedo: alb.tex, bump: bmp.tex };
  }

  // 2. VENUS: Volcanic crust + dual counter-rotating sulfuric acid cloud decks
  {
    const surf = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, _v, n1, n2, out) => {
        const v = n1 * 0.65 + n2 * 0.35;
        out[0] = 145 + Math.round(v * 85);
        out[1] = 88 + Math.round(v * 68);
        out[2] = 42 + Math.round(v * 35);
        out[3] = 255;
      },
      202,
    );
    const cloudA = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const band = Math.sin(v * Math.PI * 9 + n1 * 4.5) * 0.5 + 0.5;
        const swirl = n1 * 0.55 + n2 * 0.25 + band * 0.2;
        out[0] = 212 + Math.round(swirl * 38);
        out[1] = 172 + Math.round(swirl * 48);
        out[2] = 98 + Math.round(swirl * 52);
        out[3] = 215;
      },
      212,
      6,
      5,
    );
    const cloudB = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const streak = Math.cos(v * Math.PI * 14 + n2 * 5.0) * 0.5 + 0.5;
        const a = Math.max(0, Math.min(255, Math.round((n1 * 0.6 + streak * 0.4) * 195)));
        out[0] = 244;
        out[1] = 215;
        out[2] = 152;
        out[3] = a;
      },
      229,
      8,
      6,
    );
    sets.venus = {
      albedo: surf.tex,
      clouds: cloudA.tex,
      cloudsSecondary: cloudB.tex,
    };
  }

  // 3. EARTH: Tectonic continents, bathymetric oceans, specular mask, city night-lights & cumulus clouds
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const lat = Math.abs(v - 0.5) * 2;
        const elev = n1 * 0.72 + n2 * 0.28;
        const polarIce = lat + (n2 - 0.5) * 0.14 > 0.87;
        if (polarIce) {
          out[0] = 236;
          out[1] = 242;
          out[2] = 248;
        } else if (elev < 0.52) {
          // Bathymetric ocean depth
          const depth = elev / 0.52;
          out[0] = 12 + Math.round(depth * 22);
          out[1] = 44 + Math.round(depth * 62);
          out[2] = 98 + Math.round(depth * 86);
        } else {
          // Tectonic continents -> forests, savannas, arid highlands, snow peaks
          const land = (elev - 0.52) / 0.48;
          if (land > 0.78) {
            out[0] = 225;
            out[1] = 228;
            out[2] = 232;
          } else if (land > 0.52) {
            out[0] = 138 + Math.round(land * 45);
            out[1] = 122 + Math.round(land * 35);
            out[2] = 92;
          } else {
            const arid = Math.max(0, 1 - Math.abs(lat - 0.28) * 4.5) * n2;
            out[0] = 44 + Math.round(arid * 115);
            out[1] = 98 + Math.round(arid * 45);
            out[2] = 46 + Math.round(arid * 25);
          }
        }
        out[3] = 255;
      },
      303,
      6,
      4,
    );

    const spec = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      false,
      (_u, v, n1, n2, out) => {
        const lat = Math.abs(v - 0.5) * 2;
        const elev = n1 * 0.72 + n2 * 0.28;
        const polarIce = lat + (n2 - 0.5) * 0.14 > 0.87;
        const val = !polarIce && elev < 0.52 ? 235 : 14;
        out[0] = val;
        out[1] = val;
        out[2] = val;
        out[3] = 255;
      },
      303,
      6,
      4,
    );

    const bmp = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      false,
      (_u, _v, n1, n2, out) => {
        const elev = n1 * 0.72 + n2 * 0.28;
        const val = elev < 0.52 ? 25 : Math.round(50 + ((elev - 0.52) / 0.48) * 205);
        out[0] = val;
        out[1] = val;
        out[2] = val;
        out[3] = 255;
      },
      303,
      6,
      4,
    );

    const night = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const lat = Math.abs(v - 0.5) * 2;
        const elev = n1 * 0.72 + n2 * 0.28;
        const isCoast = elev >= 0.52 && elev < 0.64 && lat < 0.72;
        const hub = isCoast && n2 > 0.56 ? (n2 - 0.56) * 2.2 : 0;
        const intensity = Math.min(255, Math.round(hub * 255));
        out[0] = intensity;
        out[1] = Math.round(intensity * 0.74);
        out[2] = Math.round(intensity * 0.34);
        out[3] = 255;
      },
      303,
      6,
      4,
    );
    // Crisp urban light pinpoints along coastal continents
    night.ctx.fillStyle = 'rgba(255, 205, 115, 0.9)';
    for (let i = 0; i < 420; i++) {
      const cx = hash2(i, 4, 303) * W;
      const cy = 220 + hash2(i, 5, 303) * (H - 440);
      const px = night.ctx.getImageData(Math.floor(cx), Math.floor(cy), 1, 1).data;
      if (px[0] > 40) {
        for (let j = 0; j < 6; j++) {
          const jx = cx + (hash2(i * 11 + j, 1, 99) - 0.5) * 26;
          const jy = cy + (hash2(i * 11 + j, 2, 99) - 0.5) * 16;
          night.ctx.fillRect(jx, jy, 2.2, 2.2);
        }
      }
    }
    night.tex.needsUpdate = true;

    const clouds = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, _v, n1, n2, out) => {
        const c = n1 * 0.55 + n2 * 0.45;
        const a = Math.max(0, Math.min(255, Math.round((c - 0.46) * 520)));
        out[0] = 248;
        out[1] = 250;
        out[2] = 253;
        out[3] = a;
      },
      355,
      8,
      5,
    );

    sets.earth = {
      albedo: alb.tex,
      specular: spec.tex,
      bump: bmp.tex,
      nightLights: night.tex,
      clouds: clouds.tex,
    };
  }

  // 4. MARS: Iron-oxide crust, Valles Marineris canyon, Olympus Mons & dry-ice polar caps
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const lat = Math.abs(v - 0.5) * 2;
        if (lat + (n2 - 0.5) * 0.08 > 0.89) {
          // Seasonal dry-ice polar caps
          out[0] = 238;
          out[1] = 234;
          out[2] = 232;
        } else {
          const v2 = n1 * 0.65 + n2 * 0.35;
          out[0] = 148 + Math.round(v2 * 78);
          out[1] = 64 + Math.round(v2 * 52);
          out[2] = 36 + Math.round(v2 * 30);
        }
        out[3] = 255;
      },
      404,
      7,
      4,
    );
    const bmp = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      false,
      (_u, _v, n1, n2, out) => {
        const g = Math.round((n1 * 0.6 + n2 * 0.4) * 210);
        out[0] = g;
        out[1] = g;
        out[2] = g;
        out[3] = 255;
      },
      404,
      7,
      4,
    );
    // Valles Marineris tectonic canyon scar
    alb.ctx.save();
    alb.ctx.strokeStyle = 'rgba(72, 26, 16, 0.72)';
    alb.ctx.lineWidth = 22;
    alb.ctx.lineCap = 'round';
    alb.ctx.beginPath();
    alb.ctx.moveTo(760, 540);
    alb.ctx.bezierCurveTo(920, 565, 1080, 520, 1240, 555);
    alb.ctx.stroke();
    alb.ctx.restore();

    bmp.ctx.save();
    bmp.ctx.strokeStyle = 'rgba(18, 18, 18, 0.85)';
    bmp.ctx.lineWidth = 26;
    bmp.ctx.lineCap = 'round';
    bmp.ctx.beginPath();
    bmp.ctx.moveTo(760, 540);
    bmp.ctx.bezierCurveTo(920, 565, 1080, 520, 1240, 555);
    bmp.ctx.stroke();
    bmp.ctx.restore();

    // Olympus Mons shield volcano profile
    const omGrad = alb.ctx.createRadialGradient(540, 415, 8, 540, 415, 78);
    omGrad.addColorStop(0, 'rgba(222, 134, 88, 0.85)');
    omGrad.addColorStop(0.25, 'rgba(195, 104, 62, 0.65)');
    omGrad.addColorStop(1, 'rgba(160, 78, 45, 0)');
    alb.ctx.fillStyle = omGrad;
    alb.ctx.beginPath();
    alb.ctx.arc(540, 415, 78, 0, Math.PI * 2);
    alb.ctx.fill();

    const omBmp = bmp.ctx.createRadialGradient(540, 415, 6, 540, 415, 78);
    omBmp.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    omBmp.addColorStop(0.5, 'rgba(200, 200, 200, 0.6)');
    omBmp.addColorStop(1, 'rgba(128, 128, 128, 0)');
    bmp.ctx.fillStyle = omBmp;
    bmp.ctx.beginPath();
    bmp.ctx.arc(540, 415, 78, 0, Math.PI * 2);
    bmp.ctx.fill();

    alb.tex.needsUpdate = true;
    bmp.tex.needsUpdate = true;
    sets.mars = { albedo: alb.tex, bump: bmp.tex };
  }

  // 5. JUPITER: Zonal belts, eddies & Great Red Spot anticyclone
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const warp = v + (n1 - 0.5) * 0.05 + (n2 - 0.5) * 0.02;
        const belt = Math.sin(warp * Math.PI * 16) * 0.5 + 0.5;
        const fine = Math.cos(warp * Math.PI * 34 + n2 * 3.0) * 0.5 + 0.5;
        const mixT = belt * 0.7 + fine * 0.3;
        out[0] = 178 + Math.round(mixT * 64);
        out[1] = 128 + Math.round(mixT * 78);
        out[2] = 92 + Math.round(mixT * 68);
        out[3] = 255;
      },
      505,
      10,
      6,
    );
    // Great Red Spot anticyclone oval in southern tropical belt
    const grsGrad = alb.ctx.createRadialGradient(1180, 625, 10, 1180, 625, 92);
    grsGrad.addColorStop(0, 'rgba(186, 68, 42, 0.95)');
    grsGrad.addColorStop(0.55, 'rgba(210, 96, 58, 0.85)');
    grsGrad.addColorStop(0.85, 'rgba(228, 178, 132, 0.45)');
    grsGrad.addColorStop(1, 'rgba(228, 178, 132, 0)');
    alb.ctx.save();
    alb.ctx.translate(1180, 625);
    alb.ctx.scale(1.45, 0.82);
    alb.ctx.translate(-1180, -625);
    alb.ctx.fillStyle = grsGrad;
    alb.ctx.beginPath();
    alb.ctx.arc(1180, 625, 92, 0, Math.PI * 2);
    alb.ctx.fill();
    alb.ctx.restore();
    alb.tex.needsUpdate = true;
    sets.jupiter = { albedo: alb.tex };
  }

  // 6. SATURN: Golden-ochre zonal bands, north-pole hexagon & Cassini/Encke Ring Map
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (u, v, n1, n2, out) => {
        // North pole hexagonal jet stream near v < 0.1
        if (v < 0.11) {
          const hexAngle = u * Math.PI * 2 * 6;
          const hexR = v + Math.cos(hexAngle) * 0.012;
          const hexTone = hexR < 0.075 ? 0.35 : 0.72;
          out[0] = Math.round(135 + hexTone * 65);
          out[1] = Math.round(132 + hexTone * 58);
          out[2] = Math.round(118 + hexTone * 45);
        } else {
          const band = Math.sin(v * Math.PI * 18 + (n1 - 0.5) * 0.8) * 0.5 + 0.5;
          const t = band * 0.75 + n2 * 0.25;
          out[0] = 195 + Math.round(t * 46);
          out[1] = 168 + Math.round(t * 48);
          out[2] = 115 + Math.round(t * 48);
        }
        out[3] = 255;
      },
      606,
      8,
      6,
    );

    // 1D Radial Ring Canvas (1024x32) encoding C, B, Cassini Division, A, Encke Gap, F rings
    const rCanvas = document.createElement('canvas');
    rCanvas.width = 1024;
    rCanvas.height = 32;
    const rCtx = rCanvas.getContext('2d')!;
    const rImg = rCtx.createImageData(1024, 32);
    for (let x = 0; x < 1024; x++) {
      const r = x / 1023; // 0 = inner edge, 1 = outer edge
      let alpha = 0;
      let tint = 0.85;
      if (r > 0.05 && r < 0.22) {
        // C Ring (faint dusky)
        alpha = 0.25 + 0.12 * Math.sin(r * 190);
        tint = 0.68;
      } else if (r >= 0.22 && r < 0.56) {
        // B Ring (bright dense icy bands)
        alpha = 0.78 + 0.18 * Math.sin(r * 240) * Math.cos(r * 75);
        tint = 0.96;
      } else if (r >= 0.56 && r < 0.635) {
        // Cassini Division (sharp dark gap)
        alpha = 0.04;
        tint = 0.4;
      } else if (r >= 0.635 && r < 0.91) {
        // A Ring with Encke Gap at 0.84..0.855
        if (r > 0.84 && r < 0.855) {
          alpha = 0.05;
        } else {
          alpha = 0.56 + 0.14 * Math.sin(r * 290);
          tint = 0.86;
        }
      } else if (r >= 0.945 && r < 0.962) {
        // Narrow F Ring
        alpha = 0.48;
        tint = 0.92;
      }
      const cr = Math.round(234 * tint);
      const cg = Math.round(214 * tint);
      const cb = Math.round(176 * tint);
      const ca = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
      for (let y = 0; y < 32; y++) {
        const idx = (y * 1024 + x) * 4;
        rImg.data[idx] = cr;
        rImg.data[idx + 1] = cg;
        rImg.data[idx + 2] = cb;
        rImg.data[idx + 3] = ca;
      }
    }
    rCtx.putImageData(rImg, 0, 0);
    const ringTex = new THREE.CanvasTexture(rCanvas);
    ringTex.colorSpace = THREE.SRGBColorSpace;
    ringTex.anisotropy = maxAnisotropy;
    ringTex.needsUpdate = true;

    sets.saturn = { albedo: alb.tex, rings: ringTex };
  }

  // 7. URANUS: Pale cyan methane atmosphere with subtle latitudinal bands
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, _n2, out) => {
        const band = Math.sin(v * Math.PI * 10) * 0.5 + 0.5;
        const t = band * 0.45 + n1 * 0.55;
        out[0] = 136 + Math.round(t * 42);
        out[1] = 206 + Math.round(t * 32);
        out[2] = 222 + Math.round(t * 25);
        out[3] = 255;
      },
      707,
    );
    sets.uranus = { albedo: alb.tex };
  }

  // 8. NEPTUNE: Deep cobalt-azure methane bands, Great Dark Spot & white cirrus streaks
  {
    const alb = buildNoiseBaseCanvas(
      W,
      H,
      maxAnisotropy,
      true,
      (_u, v, n1, n2, out) => {
        const band = Math.sin(v * Math.PI * 14 + n1 * 1.4) * 0.5 + 0.5;
        const t = band * 0.6 + n2 * 0.4;
        out[0] = 28 + Math.round(t * 38);
        out[1] = 74 + Math.round(t * 64);
        out[2] = 185 + Math.round(t * 62);
        out[3] = 255;
      },
      808,
    );
    // Great Dark Spot + bright white high-altitude methane cirrus streaks
    const gds = alb.ctx.createRadialGradient(890, 580, 12, 890, 580, 82);
    gds.addColorStop(0, 'rgba(14, 34, 108, 0.9)');
    gds.addColorStop(0.7, 'rgba(22, 52, 138, 0.55)');
    gds.addColorStop(1, 'rgba(35, 82, 195, 0)');
    alb.ctx.save();
    alb.ctx.translate(890, 580);
    alb.ctx.scale(1.5, 0.8);
    alb.ctx.translate(-890, -580);
    alb.ctx.fillStyle = gds;
    alb.ctx.beginPath();
    alb.ctx.arc(890, 580, 82, 0, Math.PI * 2);
    alb.ctx.fill();
    alb.ctx.restore();

    alb.ctx.strokeStyle = 'rgba(224, 240, 255, 0.72)';
    for (let i = 0; i < 18; i++) {
      const sx = hash2(i, 1, 88) * W;
      const sy = 240 + hash2(i, 2, 88) * (H - 480);
      alb.ctx.lineWidth = 2 + hash2(i, 3, 88) * 4;
      alb.ctx.beginPath();
      alb.ctx.moveTo(sx, sy);
      alb.ctx.lineTo(sx + 65 + hash2(i, 4, 88) * 140, sy);
      alb.ctx.stroke();
    }
    alb.tex.needsUpdate = true;
    sets.neptune = { albedo: alb.tex };
  }

  // 9. LUNA (Moon) cratered regolith
  {
    const alb = buildNoiseBaseCanvas(
      1024,
      512,
      maxAnisotropy,
      true,
      (_u, _v, n1, n2, out) => {
        const mare = n1 < 0.44 ? 0.68 : 1.0;
        const g = Math.round((115 + n2 * 75) * mare);
        out[0] = g;
        out[1] = g;
        out[2] = g + 2;
        out[3] = 255;
      },
      909,
    );
    for (let i = 0; i < 90; i++) {
      stampCrater(
        alb.ctx,
        null,
        hash2(i, 1, 91) * 1024,
        60 + hash2(i, 2, 91) * 392,
        5 + hash2(i, 3, 91) * 22,
        i % 12 === 0,
        1024,
      );
    }
    alb.tex.needsUpdate = true;
    sets.luna = { albedo: alb.tex };
  }

  return sets;
}

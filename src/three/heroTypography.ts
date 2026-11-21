import * as THREE from 'three';

export interface HeroTypographyHandle {
  group: THREE.Group;
  update: (elapsed: number, focus: number, localU: number) => void;
  dispose: () => void;
}

function createExtrudedTextMaterial(
  texture: THREE.CanvasTexture,
  extrudeDepth: number,
  colorHex: number,
  emissiveHex: number,
  emissiveIntensity: number,
  metalness: number,
  roughness: number,
): {
  material: THREE.MeshStandardMaterial;
  setOpacity: (opacity: number) => void;
} {
  const uniforms = {
    uTextMap: { value: texture },
    uExtrudeDepth: { value: extrudeDepth },
    uOpacity: { value: 1.0 },
  };

  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    map: texture,
    emissive: new THREE.Color(emissiveHex),
    emissiveIntensity,
    metalness,
    roughness,
    envMapIntensity: 0.48,
    transparent: true,
    alphaTest: 0.14,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTextMap = uniforms.uTextMap;
    shader.uniforms.uExtrudeDepth = uniforms.uExtrudeDepth;
    shader.uniforms.uOpacity = uniforms.uOpacity;

    shader.vertexShader =
      `
      uniform sampler2D uTextMap;
      uniform float uExtrudeDepth;
      varying float vGlyphLuma;
      \n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      vec2 stepUv = vec2(1.0 / 1024.0, 1.0 / 512.0);
      float aC = texture2D(uTextMap, uv).a;
      float aL = texture2D(uTextMap, uv - vec2(stepUv.x, 0.0)).a;
      float aR = texture2D(uTextMap, uv + vec2(stepUv.x, 0.0)).a;
      float aD = texture2D(uTextMap, uv - vec2(0.0, stepUv.y)).a;
      float aU = texture2D(uTextMap, uv + vec2(0.0, stepUv.y)).a;
      objectNormal = normalize(vec3(
        objectNormal.x + (aL - aR) * 1.9,
        objectNormal.y + (aD - aU) * 1.9,
        objectNormal.z
      ));
      vGlyphLuma = aC;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float glyphLift = smoothstep(0.16, 0.85, vGlyphLuma);
      transformed.z += glyphLift * uExtrudeDepth;
      `,
    );

    shader.fragmentShader =
      `
      uniform float uOpacity;
      \n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      if (diffuseColor.a < 0.14) discard;
      diffuseColor.a *= uOpacity;
      `,
    );
  };

  material.customProgramCacheKey = () => `hero-3d-typo-${extrudeDepth.toFixed(2)}`;

  return {
    material,
    setOpacity: (opacity: number) => {
      uniforms.uOpacity.value = opacity;
    },
  };
}

function drawWelcomeCanvas(canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Crisp umber/bronze drop shadow inside texture so antique gold feels engraved
  ctx.shadowColor = 'rgba(24, 15, 7, 0.78)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  // Single horizontal line: WELCOME TO MY PORTFOLIO (comfortably padded inside texture width)
  ctx.font =
    '700 96px "Cormorant Garamond", Georgia, "Times New Roman", serif';
  const grad = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
  grad.addColorStop(0, '#FAF0D7');
  grad.addColorStop(0.4, '#E8C57B');
  grad.addColorStop(0.78, '#C5923A');
  grad.addColorStop(1, '#855817');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(130, 88, 28, 0.65)';
  ctx.lineWidth = 2.2;

  drawTrackedText(ctx, 'WELCOME TO MY PORTFOLIO', w * 0.5, h * 0.52, 13, true);
}

function drawSignatureCanvas(canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Deep umber/bronze drop shadow for engraved foreground legibility
  ctx.shadowColor = 'rgba(14, 9, 4, 0.92)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  ctx.font =
    '700 104px "Cormorant Garamond", Georgia, "Times New Roman", serif';
  const grad = ctx.createLinearGradient(0, h * 0.18, 0, h * 0.8);
  grad.addColorStop(0, '#FAF6EE');
  grad.addColorStop(0.45, '#EED6A4');
  grad.addColorStop(0.82, '#D3A34E');
  grad.addColorStop(1, '#9E6E22');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(145, 98, 32, 0.62)';
  ctx.lineWidth = 2.2;

  drawTrackedText(ctx, 'MUHAMMADH AARIF T J', w * 0.5, h * 0.46, 14, true);

  // Subtle gilt hairline flourish beneath signature
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = 'rgba(216, 174, 96, 0.68)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.8);
  ctx.lineTo(w * 0.78, h * 0.8);
  ctx.stroke();
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  tracking: number,
  withStroke: boolean,
) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((acc, cw) => acc + cw, 0) +
    tracking * Math.max(0, chars.length - 1);

  let cursorX = centerX - totalWidth * 0.5;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cw = widths[i];
    const cx = cursorX + cw * 0.5;
    ctx.fillText(ch, cx, y);
    if (withStroke) {
      ctx.strokeText(ch, cx, y);
    }
    cursorX += cw + tracking;
  }
}

export function buildHeroTypographyGroup(
  maxAnisotropy: number,
): HeroTypographyHandle {
  const group = new THREE.Group();

  // 1. Single-line "WELCOME TO MY PORTFOLIO" high in the upper sky behind Helios's sunburst halo
  const welcomeCanvas = document.createElement('canvas');
  welcomeCanvas.width = 2048;
  welcomeCanvas.height = 384;
  drawWelcomeCanvas(welcomeCanvas);

  const welcomeTex = new THREE.CanvasTexture(welcomeCanvas);
  welcomeTex.colorSpace = THREE.SRGBColorSpace;
  welcomeTex.anisotropy = maxAnisotropy;
  welcomeTex.minFilter = THREE.LinearMipmapLinearFilter;
  welcomeTex.magFilter = THREE.LinearFilter;
  welcomeTex.needsUpdate = true;

  const welcomeGroup = new THREE.Group();
  welcomeGroup.position.set(0, 2.15, -0.78);
  group.add(welcomeGroup);

  const welcomeGeo = new THREE.PlaneGeometry(7.8, 1.46, 200, 40);
  const welcomeFront = createExtrudedTextMaterial(
    welcomeTex,
    0.14,
    0xf5dca6,
    0x9e6c1e,
    0.12,
    0.46,
    0.42,
  );
  const welcomeFrontMesh = new THREE.Mesh(welcomeGeo, welcomeFront.material);
  welcomeFrontMesh.renderOrder = 10;

  // Warm dark-umber / bronze bevel shadow behind front face for engraved sculptural relief
  const welcomeBack = createExtrudedTextMaterial(
    welcomeTex,
    0.04,
    0x2b1a0c,
    0x180e06,
    0.03,
    0.28,
    0.76,
  );
  const welcomeBackMesh = new THREE.Mesh(welcomeGeo, welcomeBack.material);
  welcomeBackMesh.position.set(0.02, -0.026, -0.062);
  welcomeBackMesh.renderOrder = 9;

  welcomeGroup.add(welcomeBackMesh, welcomeFrontMesh);

  // 2. Heavy bold foreground "MUHAMMADH AARIF T J" on top Z-layer strictly in front of Helios
  const sigCanvas = document.createElement('canvas');
  sigCanvas.width = 2048;
  sigCanvas.height = 384;
  drawSignatureCanvas(sigCanvas);

  const sigTex = new THREE.CanvasTexture(sigCanvas);
  sigTex.colorSpace = THREE.SRGBColorSpace;
  sigTex.anisotropy = maxAnisotropy;
  sigTex.minFilter = THREE.LinearMipmapLinearFilter;
  sigTex.magFilter = THREE.LinearFilter;
  sigTex.needsUpdate = true;

  const signatureGroup = new THREE.Group();
  signatureGroup.position.set(0, -2.05, 0.84);
  group.add(signatureGroup);

  const sigGeo = new THREE.PlaneGeometry(6.2, 1.16, 170, 32);
  const sigFront = createExtrudedTextMaterial(
    sigTex,
    0.11,
    0xf7efdf,
    0xaa7828,
    0.11,
    0.36,
    0.44,
  );
  const sigFrontMesh = new THREE.Mesh(sigGeo, sigFront.material);
  sigFrontMesh.renderOrder = 26;

  // Warm dark-umber / bronze bevel slab directly behind foreground engraved face
  const sigBack = createExtrudedTextMaterial(
    sigTex,
    0.03,
    0x21140a,
    0x120a04,
    0.03,
    0.25,
    0.78,
  );
  const sigBackMesh = new THREE.Mesh(sigGeo, sigBack.material);
  sigBackMesh.position.set(0.022, -0.028, -0.056);
  sigBackMesh.renderOrder = 25;

  signatureGroup.add(sigBackMesh, sigFrontMesh);

  // Re-render canvas textures cleanly once web fonts finish loading
  let disposed = false;
  if (typeof document !== 'undefined' && 'fonts' in document) {
    document.fonts.ready.then(() => {
      if (disposed) return;
      drawWelcomeCanvas(welcomeCanvas);
      welcomeTex.needsUpdate = true;
      drawSignatureCanvas(sigCanvas);
      sigTex.needsUpdate = true;
    });
  }

  const update = (elapsed: number, focus: number, localU: number) => {
    const visible = focus > 0.01;
    group.visible = visible;
    if (!visible) return;

    const u = Math.max(0, Math.min(1, localU));
    const smoothU = u * u * (3 - 2 * u);

    // Upper-sky Welcome text rises gently & recedes into cloud mist as Chapter I scrolls out
    const welcomeFade =
      focus * (1 - THREE.MathUtils.smoothstep(u, 0.52, 0.96));
    welcomeGroup.position.set(
      0,
      2.15 + smoothU * 0.68 + Math.sin(elapsed * 0.45) * 0.018,
      -0.78 - smoothU * 1.4,
    );
    welcomeFront.setOpacity(welcomeFade);
    welcomeBack.setOpacity(welcomeFade * 0.92);
    welcomeGroup.visible = welcomeFade > 0.01;

    // Foreground signature stays strictly in front of Helios on top Z-layer while fading out cleanly
    const sigFade =
      focus * (1 - THREE.MathUtils.smoothstep(u, 0.46, 0.9));
    signatureGroup.position.set(
      0,
      -2.05 + smoothU * 0.24 + Math.cos(elapsed * 0.5) * 0.012,
      0.84 - smoothU * 0.12,
    );
    sigFront.setOpacity(sigFade);
    sigBack.setOpacity(sigFade * 0.94);
    signatureGroup.visible = sigFade > 0.01;
  };

  const dispose = () => {
    disposed = true;
    welcomeGeo.dispose();
    welcomeTex.dispose();
    welcomeFront.material.dispose();
    welcomeBack.material.dispose();
    sigGeo.dispose();
    sigTex.dispose();
    sigFront.material.dispose();
    sigBack.material.dispose();
  };

  return { group, update, dispose };
}

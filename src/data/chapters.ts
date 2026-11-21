export type FlareArchetype =
  | 'corona'
  | 'sweep'
  | 'dual'
  | 'cupola'
  | 'beam'
  | 'spark';

export type SegmentationMode =
  | 'parchment'
  | 'skyBlue'
  | 'darkSmoke'
  | 'cupola'
  | 'plaster'
  | 'sistine';

export interface ExtractionConfig {
  mode: SegmentationMode;
  colorTolerance: number;
  focusCenterX: number;
  focusCenterY: number;
  protectRadiusX: number;
  protectRadiusY: number;
}

export interface ExhibitionChapter {
  index: number;
  title: string;
  imageUrl: string;
  cropArtworkOnly?: boolean;
  isConcaveVault?: boolean;
  flareArchetype: FlareArchetype;
  extraction: ExtractionConfig;
  position: [number, number, number];
  restRotation: [number, number, number];
  foregroundZ: number;
  reliefMultiplier: number;
  keyColor: string;
  rimColor: string;
}

export const TOUR_DURATION_SECONDS = 30;
export const CLOUD_BACKDROP_URL =
  '/assets/aistudio/clouds-background_e1f121a7.png';

export const EXHIBITION_CHAPTERS: ExhibitionChapter[] = [
  {
    index: 0,
    title: 'Helios Rising',
    imageUrl: '/assets/aistudio/sunburst-figure_e2e35724.png',
    flareArchetype: 'corona',
    extraction: {
      mode: 'parchment',
      colorTolerance: 42,
      focusCenterX: 0.5,
      focusCenterY: 0.56,
      protectRadiusX: 0.26,
      protectRadiusY: 0.35,
    },
    position: [0, 0.08, 0],
    restRotation: [0.02, 0, 0],
    foregroundZ: 3.2,
    reliefMultiplier: 1.0,
    keyColor: '#ffe2a8',
    rimColor: '#f5b551',
  },
  {
    index: 1,
    title: 'The Celestial Chariot',
    imageUrl: '/assets/aistudio/chariot_38c90a11.png',
    flareArchetype: 'sweep',
    extraction: {
      mode: 'skyBlue',
      colorTolerance: 44,
      focusCenterX: 0.48,
      focusCenterY: 0.48,
      protectRadiusX: 0.33,
      protectRadiusY: 0.29,
    },
    position: [-0.2, -0.05, -24],
    restRotation: [0.02, 0.04, 0.02],
    foregroundZ: 3.5,
    reliefMultiplier: 1.0,
    keyColor: '#ffe4b5',
    rimColor: '#8ec0eb',
  },
  {
    index: 2,
    title: 'Sol & Luna',
    imageUrl: '/assets/aistudio/sun-moon-figures_742ebc46.png',
    flareArchetype: 'dual',
    extraction: {
      mode: 'darkSmoke',
      colorTolerance: 36,
      focusCenterX: 0.5,
      focusCenterY: 0.48,
      protectRadiusX: 0.38,
      protectRadiusY: 0.26,
    },
    position: [0.18, 0.04, -48],
    restRotation: [0.01, -0.04, 0],
    foregroundZ: 3.4,
    reliefMultiplier: 1.05,
    keyColor: '#ffd48f',
    rimColor: '#a2ccf5',
  },
  {
    index: 3,
    title: 'Council of Olympus',
    imageUrl: '/assets/aistudio/ceiling-fresco_55642826.png',
    isConcaveVault: true,
    flareArchetype: 'cupola',
    extraction: {
      mode: 'cupola',
      colorTolerance: 30,
      focusCenterX: 0.5,
      focusCenterY: 0.5,
      protectRadiusX: 0.43,
      protectRadiusY: 0.43,
    },
    position: [0, 0.38, -72],
    restRotation: [0.16, 0, 0],
    foregroundZ: 2.9,
    reliefMultiplier: 1.25,
    keyColor: '#ffe5b4',
    rimColor: '#e09a43',
  },
  {
    index: 4,
    title: 'The Solar Decree',
    imageUrl: '/assets/aistudio/pointing-figure_738bbc56.png',
    flareArchetype: 'beam',
    extraction: {
      mode: 'plaster',
      colorTolerance: 38,
      focusCenterX: 0.39,
      focusCenterY: 0.48,
      protectRadiusX: 0.25,
      protectRadiusY: 0.35,
    },
    position: [-0.28, 0.02, -96],
    restRotation: [0.02, 0.06, 0],
    foregroundZ: 3.6,
    reliefMultiplier: 1.0,
    keyColor: '#ffda9e',
    rimColor: '#e0b87b',
  },
  {
    index: 5,
    title: 'The Spark of Creation',
    imageUrl: '/assets/aistudio/creation-of-adam_fce373f6.png',
    cropArtworkOnly: true,
    flareArchetype: 'spark',
    extraction: {
      mode: 'sistine',
      colorTolerance: 24,
      focusCenterX: 0.5,
      focusCenterY: 0.52,
      protectRadiusX: 0.44,
      protectRadiusY: 0.38,
    },
    position: [0, 0.04, -120],
    restRotation: [0.01, 0, 0],
    foregroundZ: 4.1,
    reliefMultiplier: 0.56,
    keyColor: '#ffe3b8',
    rimColor: '#ebb967',
  },
];

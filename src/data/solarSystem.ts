export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface MoonSpec {
  id: string;
  name: string;
  radius: number;
  orbitRadius: number;
  /** Relative orbital angular speed (rad/s at 1x base) */
  orbitalSpeed: number;
  inclinationDeg: number;
  initialPhase: number;
  color: number;
  retrograde?: boolean;
  irregular?: boolean;
}

export interface PlanetSpec {
  id: PlanetId;
  name: string;
  code: string;
  semiMajorAu: number;
  eccentricity: number;
  inclinationDeg: number;
  ascendingNodeDeg: number;
  initialMeanAnomaly: number;
  /** Visual radius in simulation units */
  radius: number;
  /** Polar flattening factor (e.g. Saturn 0.902) */
  oblateness: number;
  axialTiltDeg: number;
  /** Sidereal spin rate rad/s at 1x */
  rotationSpeed: number;
  retrogradeSpin?: boolean;
  orbitColor: string;
  orbitalVelocityKms: string;
  surfaceTemp: string;
  moons: MoonSpec[];
}

export interface NarrativeStage {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  scrollStart: number;
  scrollEnd: number;
  rulerLabel: string;
  distanceLabel: string;
  velocityLabel: string;
  tiltLabel: string;
  tempLabel: string;
  description: string;
  focusTarget: PlanetId | 'belt' | 'sun' | 'blackhole' | 'bigbang' | 'void';
}

/** Smooth power-law AU -> scene units mapping preserving spatial order */
export function auToSimRadius(au: number): number {
  if (au <= 0) return 0;
  return 11.5 + Math.pow(au, 0.72) * 14.2;
}

/** True Kepler's 3rd Law angular velocity (omega proportional to a^(-3/2)) */
export function keplerOmega(au: number): number {
  return 0.042 / Math.pow(Math.max(0.25, au), 1.5);
}

/** Solve Kepler's Equation M = E - e*sin(E) via 4 Newton-Raphson iterations */
export function solveKeplerPosition(
  semiMajorAu: number,
  eccentricity: number,
  inclinationDeg: number,
  ascendingNodeDeg: number,
  meanAnomaly: number,
  out: { x: number; y: number; z: number },
): void {
  const a = auToSimRadius(semiMajorAu);
  const e = eccentricity;
  let E = meanAnomaly;
  for (let i = 0; i < 4; i++) {
    const f = E - e * Math.sin(E) - meanAnomaly;
    const fp = 1 - e * Math.cos(E);
    E -= f / Math.max(1e-4, fp);
  }
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xOrb = a * (cosE - e);
  const zOrb = a * Math.sqrt(Math.max(0, 1 - e * e)) * sinE;

  const inc = (inclinationDeg * Math.PI) / 180;
  const omega = (ascendingNodeDeg * Math.PI) / 180;

  // Tilt by orbital inclination, then rotate around Y by ascending node
  const yInc = zOrb * Math.sin(inc);
  const zInc = zOrb * Math.cos(inc);

  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);
  out.x = xOrb * cosW - zInc * sinW;
  out.y = yInc;
  out.z = xOrb * sinW + zInc * cosW;
}

export const PLANET_SPECS: PlanetSpec[] = [
  {
    id: 'neptune',
    name: 'Neptune',
    code: 'PL.08',
    semiMajorAu: 30.07,
    eccentricity: 0.0086,
    inclinationDeg: 1.77,
    ascendingNodeDeg: 131.7,
    initialMeanAnomaly: 0.55,
    radius: 1.55,
    oblateness: 0.983,
    axialTiltDeg: 28.32,
    rotationSpeed: 0.36,
    orbitColor: '#3b82f6',
    orbitalVelocityKms: '5.43 km/s',
    surfaceTemp: '72 K (-201 °C)',
    moons: [
      {
        id: 'triton',
        name: 'Triton',
        radius: 0.22,
        orbitRadius: 3.1,
        orbitalSpeed: 0.85,
        inclinationDeg: 156.8,
        initialPhase: 1.2,
        color: 0xd8c8be,
        retrograde: true,
      },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    code: 'PL.07',
    semiMajorAu: 19.19,
    eccentricity: 0.0472,
    inclinationDeg: 0.77,
    ascendingNodeDeg: 74.0,
    initialMeanAnomaly: 1.25,
    radius: 1.62,
    oblateness: 0.977,
    axialTiltDeg: 97.77,
    rotationSpeed: 0.34,
    retrogradeSpin: true,
    orbitColor: '#38bdf8',
    orbitalVelocityKms: '6.80 km/s',
    surfaceTemp: '76 K (-197 °C)',
    moons: [
      {
        id: 'miranda',
        name: 'Miranda',
        radius: 0.13,
        orbitRadius: 2.8,
        orbitalSpeed: 1.25,
        inclinationDeg: 97.77,
        initialPhase: 0.4,
        color: 0xc2cbd4,
      },
      {
        id: 'titania',
        name: 'Titania',
        radius: 0.19,
        orbitRadius: 3.7,
        orbitalSpeed: 0.72,
        inclinationDeg: 97.77,
        initialPhase: 2.8,
        color: 0xbab4ae,
      },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    code: 'PL.06',
    semiMajorAu: 9.537,
    eccentricity: 0.0565,
    inclinationDeg: 2.48,
    ascendingNodeDeg: 113.7,
    initialMeanAnomaly: 2.05,
    radius: 2.38,
    oblateness: 0.902,
    axialTiltDeg: 26.73,
    rotationSpeed: 0.56,
    orbitColor: '#eab308',
    orbitalVelocityKms: '9.68 km/s',
    surfaceTemp: '134 K (-139 °C)',
    moons: [
      {
        id: 'enceladus',
        name: 'Enceladus',
        radius: 0.15,
        orbitRadius: 6.1,
        orbitalSpeed: 1.35,
        inclinationDeg: 26.73,
        initialPhase: 0.7,
        color: 0xf1f6fa,
      },
      {
        id: 'titan',
        name: 'Titan',
        radius: 0.31,
        orbitRadius: 7.4,
        orbitalSpeed: 0.65,
        inclinationDeg: 26.73,
        initialPhase: 2.4,
        color: 0xe2a858,
      },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    code: 'PL.05',
    semiMajorAu: 5.203,
    eccentricity: 0.0489,
    inclinationDeg: 1.31,
    ascendingNodeDeg: 100.5,
    initialMeanAnomaly: 2.85,
    radius: 2.82,
    oblateness: 0.935,
    axialTiltDeg: 3.13,
    rotationSpeed: 0.62,
    orbitColor: '#f59e0b',
    orbitalVelocityKms: '13.07 km/s',
    surfaceTemp: '165 K (-108 °C)',
    moons: [
      // 1:2:4 Laplace orbital resonance for Io, Europa, Ganymede
      {
        id: 'io',
        name: 'Io',
        radius: 0.2,
        orbitRadius: 4.1,
        orbitalSpeed: 2.0,
        inclinationDeg: 3.13,
        initialPhase: 0.0,
        color: 0xe6c85a,
      },
      {
        id: 'europa',
        name: 'Europa',
        radius: 0.18,
        orbitRadius: 5.1,
        orbitalSpeed: 1.0,
        inclinationDeg: 3.13,
        initialPhase: 1.57,
        color: 0xd9d2c5,
      },
      {
        id: 'ganymede',
        name: 'Ganymede',
        radius: 0.27,
        orbitRadius: 6.4,
        orbitalSpeed: 0.5,
        inclinationDeg: 3.13,
        initialPhase: 3.14,
        color: 0xa69d92,
      },
      {
        id: 'callisto',
        name: 'Callisto',
        radius: 0.24,
        orbitRadius: 7.8,
        orbitalSpeed: 0.26,
        inclinationDeg: 3.13,
        initialPhase: 4.6,
        color: 0x7d7670,
      },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    code: 'PL.04',
    semiMajorAu: 1.524,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    ascendingNodeDeg: 49.6,
    initialMeanAnomaly: 3.65,
    radius: 0.68,
    oblateness: 0.994,
    axialTiltDeg: 25.19,
    rotationSpeed: 0.26,
    orbitColor: '#ef4444',
    orbitalVelocityKms: '24.07 km/s',
    surfaceTemp: '210 K (-63 °C)',
    moons: [
      {
        id: 'phobos',
        name: 'Phobos',
        radius: 0.08,
        orbitRadius: 1.18,
        orbitalSpeed: 2.4,
        inclinationDeg: 25.2,
        initialPhase: 0.5,
        color: 0x9b897b,
        irregular: true,
      },
      {
        id: 'deimos',
        name: 'Deimos',
        radius: 0.06,
        orbitRadius: 1.62,
        orbitalSpeed: 1.15,
        inclinationDeg: 25.2,
        initialPhase: 2.7,
        color: 0x8f8277,
        irregular: true,
      },
    ],
  },
  {
    id: 'earth',
    name: 'Earth & Moon',
    code: 'PL.03',
    semiMajorAu: 1.0,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
    ascendingNodeDeg: 0.0,
    initialMeanAnomaly: 4.35,
    radius: 1.02,
    oblateness: 0.997,
    axialTiltDeg: 23.44,
    rotationSpeed: 0.28,
    orbitColor: '#06b6d4',
    orbitalVelocityKms: '29.78 km/s',
    surfaceTemp: '288 K (15 °C)',
    moons: [
      {
        id: 'luna',
        name: 'Luna',
        radius: 0.27,
        orbitRadius: 2.35,
        orbitalSpeed: 0.9,
        inclinationDeg: 5.14,
        initialPhase: 1.0,
        color: 0xbec2c7,
      },
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    code: 'PL.02',
    semiMajorAu: 0.723,
    eccentricity: 0.0068,
    inclinationDeg: 3.39,
    ascendingNodeDeg: 76.7,
    initialMeanAnomaly: 5.05,
    radius: 0.96,
    oblateness: 1.0,
    axialTiltDeg: 177.36,
    rotationSpeed: 0.012,
    retrogradeSpin: true,
    orbitColor: '#fbbf24',
    orbitalVelocityKms: '35.02 km/s',
    surfaceTemp: '737 K (464 °C)',
    moons: [],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    code: 'PL.01',
    semiMajorAu: 0.387,
    eccentricity: 0.2056,
    inclinationDeg: 7.0,
    ascendingNodeDeg: 48.3,
    initialMeanAnomaly: 5.75,
    radius: 0.52,
    oblateness: 1.0,
    axialTiltDeg: 0.03,
    rotationSpeed: 0.06,
    orbitColor: '#94a3b8',
    orbitalVelocityKms: '47.36 km/s',
    surfaceTemp: '440 K (mean)',
    moons: [],
  },
];

export const NARRATIVE_STAGES: NarrativeStage[] = [
  {
    id: 'neptune',
    code: 'SYS.00',
    title: 'Neptune',
    subtitle: 'Supersonic Methane Frontier & Kuiper Edge',
    scrollStart: 0.0,
    scrollEnd: 0.09,
    rulerLabel: 'NEPTUNE',
    distanceLabel: '30.07 AU',
    velocityLabel: '5.43 km/s',
    tiltLabel: '28.32°',
    tempLabel: '72 K',
    description:
      'Deep cobalt methane storms, high-altitude white cirrus streaks, faint Adams ring arcs, and retrograde Triton against the outer Kuiper Belt.',
    focusTarget: 'neptune',
  },
  {
    id: 'uranus',
    code: 'SYS.01',
    title: 'Uranus',
    subtitle: '97.77° Oblique Ice Giant',
    scrollStart: 0.09,
    scrollEnd: 0.17,
    rulerLabel: 'URANUS',
    distanceLabel: '19.19 AU',
    velocityLabel: '6.80 km/s',
    tiltLabel: '97.77°',
    tempLabel: '76 K',
    description:
      'Rolling on its side across the ecliptic with 13 faint vertical rings, pale cyan methane haze, and moons Miranda and Titania.',
    focusTarget: 'uranus',
  },
  {
    id: 'saturn',
    code: 'SYS.02',
    title: 'Saturn',
    subtitle: 'Oblate Ringed Giant & Cassini Division',
    scrollStart: 0.17,
    scrollEnd: 0.26,
    rulerLabel: 'SATURN',
    distanceLabel: '9.54 AU',
    velocityLabel: '9.68 km/s',
    tiltLabel: '26.73°',
    tempLabel: '134 K',
    description:
      'Polar-flattened spheroid crowned by a north-pole hexagonal jet stream, 10,000+ ice particles, real-time ring shadows, Titan, and Enceladus.',
    focusTarget: 'saturn',
  },
  {
    id: 'jupiter',
    code: 'SYS.03',
    title: 'Jupiter',
    subtitle: 'Differential Jet Streams & 1:2:4 Laplace Resonance',
    scrollStart: 0.26,
    scrollEnd: 0.35,
    rulerLabel: 'JUPITER',
    distanceLabel: '5.20 AU',
    velocityLabel: '13.07 km/s',
    tiltLabel: '3.13°',
    tempLabel: '165 K',
    description:
      'Latitudinal shear bands, swirling Great Red Spot anticyclone, and the four Galilean moons Io, Europa, Ganymede, and Callisto casting transits.',
    focusTarget: 'jupiter',
  },
  {
    id: 'belt',
    code: 'SYS.04',
    title: 'Main Asteroid Belt',
    subtitle: 'C/S/M Spectral Classes · Kirkwood Gaps · Comet',
    scrollStart: 0.35,
    scrollEnd: 0.43,
    rulerLabel: 'ASTEROIDS',
    distanceLabel: '2.70 AU',
    velocityLabel: '17.90 km/s',
    tiltLabel: 'ECLIPTIC',
    tempLabel: '185 K',
    description:
      '450+ fractured Voronoi asteroids across carbonaceous, stony, and metallic classes. Move cursor to exert a live gravitational tractor field.',
    focusTarget: 'belt',
  },
  {
    id: 'mars',
    code: 'SYS.05',
    title: 'Mars',
    subtitle: 'Valles Marineris, Olympus Mons & Polar Caps',
    scrollStart: 0.43,
    scrollEnd: 0.5,
    rulerLabel: 'MARS',
    distanceLabel: '1.52 AU',
    velocityLabel: '24.07 km/s',
    tiltLabel: '25.19°',
    tempLabel: '210 K',
    description:
      'Iron-oxide basalt crust carved by Valles Marineris, seasonal CO2 polar caps, dusty salmon Rayleigh limb, and irregular moons Phobos & Deimos.',
    focusTarget: 'mars',
  },
  {
    id: 'earth',
    code: 'SYS.06',
    title: 'Earth & Luna',
    subtitle: 'Ocean Specular, Night-Lights & Rayleigh Halo',
    scrollStart: 0.5,
    scrollEnd: 0.57,
    rulerLabel: 'EARTH',
    distanceLabel: '1.00 AU',
    velocityLabel: '29.78 km/s',
    tiltLabel: '23.44°',
    tempLabel: '288 K',
    description:
      'Multi-layered biosphere: specular oceans, tectonic ridges, dark-side city lights, drifting cumulus shadow deck, and 5.14° inclined Luna.',
    focusTarget: 'earth',
  },
  {
    id: 'venus',
    code: 'SYS.07',
    title: 'Venus',
    subtitle: '60x Super-Rotating Sulfuric Cloud Decks',
    scrollStart: 0.57,
    scrollEnd: 0.62,
    rulerLabel: 'VENUS',
    distanceLabel: '0.72 AU',
    velocityLabel: '35.02 km/s',
    tiltLabel: '177.36°',
    tempLabel: '737 K',
    description:
      'Dual counter-rotating sulfuric acid cloud layers racing around a slow retrograde crust under a dense golden-amber Rayleigh rim.',
    focusTarget: 'venus',
  },
  {
    id: 'mercury',
    code: 'SYS.08',
    title: 'Mercury',
    subtitle: 'Caloris Crater Basins & High-Contrast Terminator',
    scrollStart: 0.62,
    scrollEnd: 0.67,
    rulerLabel: 'MERCURY',
    distanceLabel: '0.39 AU',
    velocityLabel: '47.36 km/s',
    tiltLabel: '0.03°',
    tempLabel: '440 K',
    description:
      'Airless silicate crust scarred by ancient multi-ringed impact basins and bright ejecta rays along an eccentric 0.206 orbit.',
    focusTarget: 'mercury',
  },
  {
    id: 'sun',
    code: 'SYS.09',
    title: 'The Sun (Sol)',
    subtitle: 'Photospheric Granulation & CME Plasma Loops',
    scrollStart: 0.67,
    scrollEnd: 0.82,
    rulerLabel: 'SOL',
    distanceLabel: '0.00 AU',
    velocityLabel: '220 km/s GAL',
    tiltLabel: '7.25°',
    tempLabel: '5,778 K',
    description:
      'G2V main-sequence star driven by convective plasma granulation, magnetic sunspot pairs, arching 3D coronal mass ejections, and solar wind.',
    focusTarget: 'sun',
  },
  {
    id: 'blackhole',
    code: 'SYS.10',
    title: 'Kerr Black Hole',
    subtitle: 'Doppler-Beamed Accretion & Roche Spaghettification',
    scrollStart: 0.82,
    scrollEnd: 0.92,
    rulerLabel: 'KERR BH',
    distanceLabel: 'r_s = 2GM/c²',
    velocityLabel: '0.998 c',
    tiltLabel: 'a* = 0.99',
    tempLabel: '10⁹ K DISK',
    description:
      'Spinning Kerr singularity bending background light via gravitational lensing while tidal Roche forces stretch and spiral planets into the horizon.',
    focusTarget: 'blackhole',
  },
  {
    id: 'bigbang',
    code: 'SYS.11',
    title: 'Singularity & Big Bang',
    subtitle: 'Planck Implosion & CMB Plasma Shockwave',
    scrollStart: 0.92,
    scrollEnd: 0.96,
    rulerLabel: 'BIG BANG',
    distanceLabel: 't = 10⁻⁴³ s',
    velocityLabel: 'c EXPANSION',
    tiltLabel: 'ISOTROPIC',
    tempLabel: '10³² K',
    description:
      'All compressed baryonic and radiative mass detonates from a Planck-scale singularity into a multi-wavelength cosmic microwave shockwave.',
    focusTarget: 'bigbang',
  },
  {
    id: 'void',
    code: 'SYS.12',
    title: 'Primordial Void',
    subtitle: 'Quantum Vacuum Fluctuations',
    scrollStart: 0.96,
    scrollEnd: 1.01,
    rulerLabel: 'VOID',
    distanceLabel: '∞ PARSEC',
    velocityLabel: '0.00 km/s',
    tiltLabel: 'NULL',
    tempLabel: '2.725 K',
    description:
      'Macroscopic matter annihilates into serene vacuum zero-point space populated solely by quantum-fluctuating bioluminescent vacuum quanta.',
    focusTarget: 'void',
  },
];

export function getActiveNarrativeStage(progress: number): NarrativeStage {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < NARRATIVE_STAGES.length; i++) {
    const s = NARRATIVE_STAGES[i];
    if (p >= s.scrollStart && p < s.scrollEnd) return s;
  }
  return NARRATIVE_STAGES[NARRATIVE_STAGES.length - 1];
}

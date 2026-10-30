import { boxInertia, gravityGradientTorqueMax, rpmToOmega } from '../physics';

/*
 * Tema 8 data: two real reaction wheels, the 6U CubeSat of the worked example, the disturbance
 * and the magnetorquer that set the saturation and dumping times, and the mission facts.
 * Everything comes from docs/superpowers/research/2026-10-30-ruedas-reaccion.md (§3 sources,
 * §4 numbers, §6 worked example), accessed 2026-10-30. Values the research computes itself are
 * computed here too, and say "cálculo propio". Never add the Hubble wheel capacity in N·m·s (NO
 * CONFIRMADO) or any number from 42's demo spacecraft files (placeholders, research §8).
 */

/** Source ids exactly as in research §3. */
export type WheelSourceId =
  | 'K1'
  | 'K2'
  | 'K3'
  | 'K4'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'J1'
  | 'J2'
  | 'J3'
  | 'J4'
  | 'J5'
  | 'W1'
  | 'W2'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'C4';

export interface WheelSource {
  id: WheelSourceId;
  label: string;
  url: string;
}

/** The sources this data cites, research §3 (the Kepler updates through the Wayback Machine, as opened). */
export const REACTION_WHEEL_SOURCES: Readonly<Record<WheelSourceId, WheelSource>> = {
  K1: {
    id: 'K1',
    label: 'Roger Hunter (NASA Ames), «Kepler Mission Manager Update 07.20.12», NASA, 2012',
    url: 'https://web.archive.org/web/20120723172623/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20122007.html',
  },
  K2: {
    id: 'K2',
    label: 'Roger Hunter (NASA Ames), «Kepler Mission Manager Update 07.24.2012», NASA, 2012',
    url: 'https://web.archive.org/web/20120727032310/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20122407.html',
  },
  K3: {
    id: 'K3',
    label: 'The Kepler Team, «Kepler Mission Manager Update, May 15, 2013», NASA, 2013',
    url: 'https://web.archive.org/web/20140228202745/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20130515.html',
  },
  K4: {
    id: 'K4',
    label:
      'Howell, Sobeck, Haas et al., «The K2 Mission: Characterization and Early Results», PASP 126, 2014',
    url: 'https://arxiv.org/abs/1402.5163',
  },
  H1: {
    id: 'H1',
    label: 'NASA Science, «Hubble: Pointing Control», actualizada el 21 de enero de 2025',
    url: 'https://science.nasa.gov/mission/hubble/observatory/design/pointing-control',
  },
  H2: {
    id: 'H2',
    label:
      'NASA GSFC, «The Hubble Program: Technology, Pointing Control System», actualizada el 29 de marzo de 2021',
    url: 'https://asd.gsfc.nasa.gov/archive/hubble/technology/pcs.html',
  },
  H3: {
    id: 'H3',
    label: 'Hugh Dougherty (Lockheed), «Space Telescope Pointing Control», NTRS 19900004138, 1988',
    url: 'https://ntrs.nasa.gov/citations/19900004138',
  },
  H4: {
    id: 'H4',
    label:
      'Martin D. Hasha, «High-Performance Reaction Wheel Optimization for Fine-Pointing Space Platforms», NTRS 20160008147, 2016',
    url: 'https://ntrs.nasa.gov/citations/20160008147',
  },
  J1: {
    id: 'J1',
    label: 'Gardner, Mather et al., «The James Webb Space Telescope Mission», PASP 135, 2023',
    url: 'https://arxiv.org/abs/2304.04869',
  },
  J2: {
    id: 'J2',
    label:
      'STScI, «JWST Momentum Management», JWST User Documentation, actualizada el 22 de julio de 2022',
    url: 'https://jwst-docs.stsci.edu/jwst-observatory-hardware/jwst-attitude-control-subsystem/jwst-momentum-management',
  },
  J3: {
    id: 'J3',
    label: 'STScI, «JWST Propulsion», JWST User Documentation, 2017',
    url: 'https://jwst-docs.stsci.edu/jwst-observatory-hardware/jwst-spacecraft-bus/jwst-propulsion',
  },
  J4: {
    id: 'J4',
    label:
      'NASA Webb Mission Team, «Webb’s Aft Momentum Flap Deployed», blog de NASA, 30 de diciembre de 2021',
    url: 'https://science.nasa.gov/blogs/webb/2021/12/30/webbs-aft-momentum-flap-deployed',
  },
  J5: {
    id: 'J5',
    label:
      'Bely, Illingworth et al., «Genesis of the James Webb Space Telescope architecture: The designers’ story», preprint sin revisión por pares, 2025',
    url: 'https://arxiv.org/abs/2501.09072',
  },
  W1: {
    id: 'W1',
    label: 'VECTRONIC Aerospace, hoja de datos «Reaction Wheel VRW-D-4» (DS11), 2022',
    url: 'https://www.vectronic-aerospace.com/wp-content/uploads/2022/06/VAS-VRW-D-4-DS11.pdf',
  },
  W2: {
    id: 'W2',
    label: 'AAC Clyde Space, hoja de datos «RW400», 2021',
    url: 'https://www.aac-clyde.space/wp-content/uploads/2021/11/RW400.pdf',
  },
  C1: {
    id: 'C1',
    label: 'The CubeSat Program (Cal Poly SLO), «CubeSat Design Specification Rev. 14.1», 2022',
    url: 'https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf',
  },
  C2: {
    id: 'C2',
    label: 'NASA SP-8024, «Spacecraft Gravitational Torques», 1969',
    url: 'https://ntrs.nasa.gov/citations/19700014113',
  },
  C3: {
    id: 'C3',
    label: 'GomSpace, «NanoTorque GST-600 Mk2 Datasheet», 2025',
    url: 'https://gomspace.com/wp-content/uploads/2025/09/gs-ds-NanoTorqueGST600mk2-1062432-2-EXT.pdf',
  },
  C4: {
    id: 'C4',
    label: 'NOAA NCEI, «World Magnetic Model» (WMM2025)',
    url: 'https://www.ncei.noaa.gov/products/world-magnetic-model',
  },
};

/**
 * A reaction wheel from its maker's datasheet: momentum capacity L_max (N·m·s), maximum torque
 * τ_max (N·m), top speed (rpm) and mass (kg). Rotor inertia (kg·m²): `inertiaPrinted` when the
 * sheet prints it, else null; `inertiaDerived` = L_max/ω_max always (cálculo propio).
 */
export interface ReactionWheel {
  name: string;
  Lmax: number;
  tauMax: number;
  rpmMax: number;
  mass: number;
  inertiaPrinted: number | null;
  inertiaDerived: number;
  sourceId: WheelSourceId;
  notes: readonly string[];
}

function wheel(data: Omit<ReactionWheel, 'inertiaDerived'>): ReactionWheel {
  return { ...data, inertiaDerived: data.Lmax / rpmToOmega(data.rpmMax) };
}

/** AAC Clyde Space RW400, 50 mN·m·s variant, "for 6 - 12U CubeSat platforms" [W2]. */
export const RW400: ReactionWheel = wheel({
  name: 'AAC Clyde Space RW400 (50 mN·m·s)',
  Lmax: 0.05,
  tauMax: 0.008,
  rpmMax: 5000,
  mass: 0.375,
  inertiaPrinted: null,
  sourceId: 'W2',
  notes: [
    'La serie tiene variantes de 15, 30 y 50 mN·m·s; aquí se usa la de 50 mN·m·s (375 g).',
    'La tabla da ±8 mN·m de torque máximo; los destacados dicen «> 12 mN.m (braking)».',
    'La hoja no imprime la inercia del rotor: I_w = L_máx/ω_máx (cálculo propio), suponiendo que las 5 000 rpm de la hoja valen para la variante de 50 mN·m·s.',
  ],
});

/** VECTRONIC Aerospace VRW-D-4, the only datasheet found that prints the rotor inertia [W1]. */
export const VRW_D_4: ReactionWheel = wheel({
  name: 'VECTRONIC Aerospace VRW-D-4',
  Lmax: 4,
  tauMax: 0.05,
  rpmMax: 6000,
  mass: 2.5,
  inertiaPrinted: 6.37e-3,
  sourceId: 'W1',
  notes: [
    'La hoja imprime la inercia del rotor: 6,37·10⁻³ kg·m².',
    'Comprobación (cálculo propio): 6,37·10⁻³ kg·m² × 628,3 rad/s = 4,00 N·m·s, el L_máx de la hoja.',
  ],
});

/** CubeSat side lengths (m): 100,0 × 226,3 × 366,0 mm. */
const CUBESAT_6U_SIDES = [0.1, 0.2263, 0.366] as const;
const CUBESAT_6U_MASS = 12;

/**
 * The 6U CubeSat of the worked example [C1]: typical maximum mass (Table 1) and the 6U drawing
 * envelope (p. 33), modelled as a homogeneous box. `Is` is about the axis normal to the
 * 226,3 × 366,0 mm face (the largest inertia, the one the slews use); `Ilong` about the 366 mm axis.
 */
export const CUBESAT_6U = {
  name: 'CubeSat 6U',
  mass: CUBESAT_6U_MASS,
  dimensions: CUBESAT_6U_SIDES,
  Is: boxInertia(CUBESAT_6U_MASS, CUBESAT_6U_SIDES[1], CUBESAT_6U_SIDES[2]),
  Ilong: boxInertia(CUBESAT_6U_MASS, CUBESAT_6U_SIDES[0], CUBESAT_6U_SIDES[1]),
  sourceId: 'C1' as WheelSourceId,
  note: 'Masa máxima típica de un 6U (12 kg, Tabla 1) y su envolvente (dibujo 6U, p. 33), modelado como caja homogénea, I = m(a² + b²)/12: una idealización; un 6U real concentra más la masa y su inercia sería algo menor.',
} as const;

const EARTH_MU = 3.986e14;
const EARTH_RADIUS = 6.371e6;
const ORBIT_ALTITUDE = 5e5;
const ORBIT_RADIUS = EARTH_RADIUS + ORBIT_ALTITUDE;

/**
 * Circular orbit at 500 km of the worked example (research §6b): μ = 3,986·10¹⁴ m³/s² and
 * r = R_T + h = 6871 km; period T = 2π √(r³/μ) (cálculo propio).
 */
export const ORBIT_500KM = {
  mu: EARTH_MU,
  earthRadius: EARTH_RADIUS,
  altitude: ORBIT_ALTITUDE,
  r: ORBIT_RADIUS,
  period: 2 * Math.PI * Math.sqrt(ORBIT_RADIUS ** 3 / EARTH_MU),
} as const;

/**
 * Largest gravity-gradient torque on the 6U at 500 km, pitching with ΔI = I_s − I_long
 * (NASA SP-8024 [C2], θ = 45°): about 2,29·10⁻⁷ N·m. Held constant it is an upper bound on how
 * fast the wheel fills, not the typical build-up (research §8, pitfall 7).
 */
export const GRAVITY_GRADIENT_6U = {
  torque: gravityGradientTorqueMax(ORBIT_500KM.mu, ORBIT_500KM.r, CUBESAT_6U.Is - CUBESAT_6U.Ilong),
  sourceIds: ['C2', 'C1'] as readonly WheelSourceId[],
  sourceLabel:
    'Cálculo propio con el torque de gradiente de gravedad en cabeceo de NASA SP-8024, máximo a θ = 45°; constante es una cota superior del ritmo de acumulación, no la acumulación típica',
} as const;

const GST600_DIPOLE = 0.4;
const SURFACE_FIELD_RANGE = [20000e-9, 60000e-9] as const;
const REPRESENTATIVE_FIELD = 3e-5;
const DIPOLE_SCALE = (EARTH_RADIUS / ORBIT_RADIUS) ** 3;

/**
 * Magnetorquer dump of the worked example (research §6c): GomSpace GST-600 Mk2, 0,40 A·m² on
 * X/Y [C3], in a field of about 3·10⁻⁵ T at 500 km. The range scales the surface field of
 * 20 000–60 000 nT [C4] as a dipole, (R_T/r)³ (cálculo propio). τ = m B ≈ 1,2·10⁻⁵ N·m is the
 * best case with m ⊥ B; τ = m × B is always ⊥ B, so the part of L_w along B cannot be dumped at
 * that instant.
 */
export const MAGNETORQUER_6U = {
  dipole: GST600_DIPOLE,
  field: REPRESENTATIVE_FIELD,
  fieldRange: [
    SURFACE_FIELD_RANGE[0] * DIPOLE_SCALE,
    SURFACE_FIELD_RANGE[1] * DIPOLE_SCALE,
  ] as const,
  torque: GST600_DIPOLE * REPRESENTATIVE_FIELD,
  sourceIds: ['C3', 'C4'] as readonly WheelSourceId[],
  sourceLabel:
    'Cálculo propio: dipolo de 0,40 A·m² del GomSpace GST-600 Mk2 por un campo de unos 3·10⁻⁵ T a 500 km (campo de superficie del World Magnetic Model escalado como dipolo)',
} as const;

export type Mission = 'Kepler' | 'K2' | 'Hubble' | 'JWST';

export interface MissionFact {
  mission: Mission;
  fact: string;
  sourceIds: readonly WheelSourceId[];
}

/** Research §4.2, row by row; the Hubble wheel capacity row is NO CONFIRMADO and left out. */
export const MISSIONS: readonly MissionFact[] = [
  {
    mission: 'Kepler',
    fact: '4 ruedas en ejes no ortogonales, «actively redundant»; diseñada para funcionar con 3',
    sourceIds: ['K1', 'K2'],
  },
  {
    mission: 'Kepler',
    fact: 'Rueda #2: falla el 14 de julio de 2012, detectada el 16 de julio, retirada el 19 de julio; unos 6 días de datos perdidos',
    sourceIds: ['K1', 'K2'],
  },
  {
    mission: 'Kepler',
    fact: 'Rueda 4: modo seguro detectado el 14 de mayo de 2013, «likely a structural failure of the wheel bearing»',
    sourceIds: ['K3'],
  },
  {
    mission: 'K2',
    fact: '2 ruedas (ejes Y y Z) más propulsores (eje X); presión solar como única perturbación; corrección de balanceo cada 12 h; descarga cada 2 días; combustible para 2–3 años',
    sourceIds: ['K4'],
  },
  {
    mission: 'Hubble',
    fact: '4 RWA de 45 kg (100 lb), unos 60 cm (2 ft) de ancho; hasta 3 000 rpm; pirámide inclinada',
    sourceIds: ['H1', 'H2', 'H4'],
  },
  {
    mission: 'Hubble',
    fact: '4 magnetopares a 90°; descargan el momento contra el campo terrestre; sin propelente (contaminaría la óptica)',
    sourceIds: ['H1', 'H2', 'H3'],
  },
  {
    mission: 'Hubble',
    fact: 'Unos 90° en 15 min (NASA, 2025); especificación de diseño de 90° en 18 min o menos (Dougherty); unos 6°/min (Hasha)',
    sourceIds: ['H1', 'H3', 'H4'],
  },
  {
    mission: 'JWST',
    fact: '6 ruedas, 2 de ellas redundantes',
    sourceIds: ['J1'],
  },
  {
    mission: 'JWST',
    fact: 'Descarga con propulsores MRE-1 (8 en total); unas horas por descarga; antes del lanzamiento se preveían 4–8 al mes y en operación hay una cada unas 6 semanas',
    sourceIds: ['J2', 'J3'],
  },
  {
    mission: 'JWST',
    fact: 'Aleta de momento («aft momentum flap») desplegada el 30 de diciembre de 2021; ángulo fijado antes del lanzamiento; reduce la acumulación de momento por presión solar',
    sourceIds: ['J4', 'J5'],
  },
];

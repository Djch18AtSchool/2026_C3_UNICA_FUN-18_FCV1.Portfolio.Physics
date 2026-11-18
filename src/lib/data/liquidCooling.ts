import {
  branchFlows,
  circuitProfile,
  M3S_PER_GPM,
  M3S_PER_LPM,
  PA_PER_BAR,
  PA_PER_PSI,
  powerLawCurve,
  seriesLoss,
  type BranchFlowsResult,
  type Fluid,
  type LossCurve,
  type ProfilePoint,
  type ReturnLayout,
  type Segment,
} from '../physics/hydraulics';
import { requireFinite } from '../physics/validate';

/*
 * Tema 13 data: the liquid-cooling circuit of a GB200 NVL72-class rack (Schneider RD109 analysed
 * by GF), its parts from open specifications (OCP UQD v2.0.0, NVIDIA MGX, Google Project
 * Deschutes), the fluid (Melinder via LBNL) and the per-port flows measured by Shahi et al.
 * (2023). Every number: docs/superpowers/research/2026-11-17-enfriamiento-liquido.md (§5 values,
 * §7 reference calculation), accessed 2026-11-17. SI units unless a name says otherwise.
 */

/**
 * Model vs product: `producto` is a value published for the real product, specification or
 * circuit; `ilustrativo` is a model assumption (a length I chose, a handbook or software default);
 * `calculo` is my own calculation from sourced values, reproduced by tested code.
 */
export type ValueOrigin = 'producto' | 'ilustrativo' | 'calculo';

export interface Provenance {
  origin: ValueOrigin;
  source: string;
}

export interface SourcedValue extends Provenance {
  value: number;
}

const sourced = (value: number, origin: ValueOrigin, source: string): SourcedValue => ({
  value,
  origin,
  source,
});

const OCP_OAI = 'OCP, OAI System Liquid Cooling Guidelines (2023)';
const OCP_UQD = 'OCP, Universal Quick Disconnect Design Specification v2.0.0 (2026)';
const AMPHENOL = 'Amphenol Industrial, catálogo UQD/UQDB (2025)';
const MGX = 'NVIDIA, MGX Accelerated Computing Rack and Trays Specification Rev. 1.0 (OCP, 2024)';
const DESCHUTES =
  'Google, Project Deschutes Data Center Facilities Specification 1.0.0 (OCP, 2026)';
const MBL = 'LBNL, Modelica Buildings Library v14.0.0';
const EPANET = 'US EPA, EPANET 2.2 User Manual';
const GF = 'Freda y Kugele (GF Piping Systems), Hydraulic design principles for DLC (2026)';
const SHAHI = 'Shahi et al., IPACK2023-114351 (ASME InterPACK 2023)';
const FT = 0.3048;

/*
 * Propylene glycol–water from Melinder (2010), as Modelica Buildings v14.0.0 codes it
 * (Buildings/Media/Antifreeze/Functions/PropyleneGlycolWater.mo): a polynomial in the mass
 * fraction and the temperature around a reference point (prototype pg_props.py).
 */
const MELINDER = {
  massFractionRef: 0.307031,
  temperatureRef: 32.7083,
  maxMassFraction: 0.6,
  termsPerPower: [4, 4, 4, 3, 2, 1],
  density: [
    1.018e3, -5.406e-1, -2.666e-3, 1.347e-5, 7.604e-1, -9.45e-3, 5.541e-5, -1.343e-7, -2.498e-3,
    2.7e-5, -4.018e-7, 3.376e-9, -1.55e-4, 2.829e-6, -7.175e-9, -1.131e-6, -2.221e-8, 2.342e-8,
  ],
  logViscosity: [
    6.837e-1, -3.045e-2, 2.525e-4, -1.399e-6, 3.328e-2, -3.984e-4, 4.332e-6, -1.86e-8, 5.453e-5,
    -8.6e-8, -1.593e-8, -4.465e-11, -3.9e-6, 1.054e-7, -1.589e-9, -1.587e-8, 4.475e-10, 3.564e-9,
  ],
} as const;

function melinder(coefficients: readonly number[], massFraction: number, tC: number): number {
  const dx = 100 * (massFraction - MELINDER.massFractionRef);
  const dt = tC - MELINDER.temperatureRef;
  const terms = MELINDER.termsPerPower.flatMap((count, i) =>
    Array.from({ length: count }, (_, j) => dx ** i * dt ** j),
  );
  return terms.reduce((sum, term, n) => sum + coefficients[n] * term, 0);
}

const density = (massFraction: number, tC: number) => melinder(MELINDER.density, massFraction, tC);

/** MBL's volumeToMassFraction: the glycol density extrapolated from 60 % to pure glycol. */
export function volumeToMassFraction(volumeFraction: number, tC: number): number {
  const xMax = MELINDER.maxMassFraction;
  const water = density(0, tC);
  const glycol =
    density(xMax, tC) + ((1 - xMax) * (density(xMax, tC) - density(xMax - 0.01, tC))) / 0.01;
  return (volumeFraction * glycol) / (volumeFraction * glycol + (1 - volumeFraction) * water);
}

/** MBL converts the volume fraction at 20 °C. */
const MIXING_TEMPERATURE_C = 20;

/** PG–water by volume fraction (mixed at 20 °C, as MBL) at temperature tC (°C). */
export function propyleneGlycolWater(volumeFraction: number, tC: number): Fluid {
  requireFinite('tC', tC);
  if (!(volumeFraction >= 0 && volumeFraction <= 1)) {
    throw new RangeError(`volumeFraction must be between 0 and 1, got ${volumeFraction}`);
  }
  const x = volumeToMassFraction(volumeFraction, MIXING_TEMPERATURE_C);
  if (x > MELINDER.maxMassFraction) {
    throw new RangeError(`mass fraction ${x} is beyond Melinder's fit (0.6)`);
  }
  return { rho: density(x, tC), mu: 1e-3 * Math.exp(melinder(MELINDER.logViscosity, x, tC)) };
}

/**
 * PG25 (25 % propylene glycol by volume) at 40 °C, the RD109 supply: ρ = 1010,6 kg/m³ and
 * μ = 1,394 mPa·s.
 */
export const PG25_40C: Fluid & Provenance & { label: string; temperatureC: number } = {
  ...propyleneGlycolWater(0.25, 40),
  label: 'PG25 a 40 °C',
  temperatureC: 40,
  origin: 'calculo',
  source: `Cálculo propio con los polinomios de Melinder (2010) en ${MBL}`,
};

/** OCP's design rule: «A typical design target is 10°C temperature rise, i.e. 1.5 LPM/kW». */
export const FLOW_PER_KW_LPM = 1.5;
export const FLOW_PER_KW = sourced(FLOW_PER_KW_LPM, 'producto', `${OCP_OAI}, §1.3, pág. 7`);

/** EPANET's tables (roughness, ×10⁻³ ft; K on v²/2g), applied to this circuit as assumptions. */
export const EPANET_VALUES = {
  roughnessPlastic: sourced(
    0.005e-3 * FT,
    'ilustrativo',
    `${EPANET}: rugosidad típica del plástico`,
  ),
  roughnessSteel: sourced(0.15e-3 * FT, 'ilustrativo', `${EPANET}: rugosidad típica del acero`),
  teeK: sourced(1.8, 'ilustrativo', `${EPANET}: «Standard tee - flow through branch 1.8»`),
} as const;

/** The UQD04 coupling of each server tray (OCP v2.0.0; Cv of Amphenol's catalogue). */
export const UQD04 = {
  cv: sourced(1.29, 'producto', `${AMPHENOL}: «UQD04:1.29»`),
  cvMin: sourced(1.1, 'producto', `${OCP_UQD}, tabla 6`),
  cvMax: sourced(1.6, 'producto', `${OCP_UQD}, tabla 6`),
  nominalFlow: sourced(6.44 * M3S_PER_LPM, 'producto', `${OCP_UQD}, tabla 6: 6,44 L/min`),
  bore: sourced(7.24e-3, 'producto', `${OCP_UQD}, tabla 2: boca del tapón, ØL`),
  length: sourced(0.06, 'producto', `${OCP_UQD}, tabla 1: DD máx.`),
} as const;

const MGX_WIDTH = 0.035;
const MGX_HEIGHT = 0.06;
const MGX_WALL = 0.003;
const MGX_INNER = [MGX_WIDTH - 2 * MGX_WALL, MGX_HEIGHT - 2 * MGX_WALL] as const;
const MGX_AREA = MGX_INNER[0] * MGX_INNER[1];

/** The MGX rack manifold: a 35 × 60 mm stainless tube with 44 UQD ports at 1 RU (44,45 mm). */
export const MGX_MANIFOLD = {
  outerWidth: sourced(MGX_WIDTH, 'producto', `${MGX}, fig. 7-13 a 7-15`),
  outerHeight: sourced(MGX_HEIGHT, 'producto', `${MGX}, fig. 7-13 a 7-15`),
  wall: sourced(MGX_WALL, 'producto', `${MGX}, fig. 7-13 a 7-15`),
  ports: sourced(44, 'producto', `${MGX}, fig. 7-13: «44X UQD»`),
  portPitch: sourced(0.04445, 'producto', `${MGX}, fig. 7-13: 44,45 mm entre puertos`),
  innerArea: sourced(MGX_AREA, 'calculo', 'Cálculo propio: 29 × 54 mm, con pared uniforme de 3 mm'),
  hydraulicDiameter: sourced(
    (4 * MGX_AREA) / (2 * (MGX_INNER[0] + MGX_INNER[1])),
    'calculo',
    'Cálculo propio: $D_h = 4A/P$ de la sección interior',
  ),
} as const;

/** A Deschutes pump curve at one PWM: Δp[psi] = c0 + c1·x + c2·x², x in GPM. */
export interface PumpCurve extends Provenance {
  pwm: number;
  c0: number;
  c1: number;
  c2: number;
}

const DESCHUTES_CURVES: readonly (readonly [number, number, number, number])[] = [
  [100, 119, 0.0211, -9.34e-5],
  [95, 105, 0.0171, -8.66e-5],
  [90, 94.1, 0.0148, -8.41e-5],
  [83, 83, 0.0144, -9.05e-5],
  [80, 74.4, 0.0107, -7.96e-5],
  [75, 65.4, 8.83e-3, -7.75e-5],
  [66, 53.2, 0.0103, -9.07e-5],
  [50, 29.6, 0.0112, -9.88e-5],
  [33, 13, 6.49e-3, -9.5e-5],
];

/** Google's Project Deschutes CDU (OCP): rating and the available-pressure curves of fig. 5.1.1. */
export const DESCHUTES_PUMP = {
  ratedFlow: sourced(500 * M3S_PER_GPM, 'producto', `${DESCHUTES}, §2.2: «500 GPM at 80-90 psi»`),
  ratedDpMin: sourced(80 * PA_PER_PSI, 'producto', `${DESCHUTES}, §2.2: «500 GPM at 80-90 psi»`),
  ratedDpMax: sourced(90 * PA_PER_PSI, 'producto', `${DESCHUTES}, §2.2: «500 GPM at 80-90 psi»`),
  curveMaxFlow: sourced(650 * M3S_PER_GPM, 'producto', `${DESCHUTES}, fig. 5.1.1: rango medido`),
  curves: DESCHUTES_CURVES.map(([pwm, c0, c1, c2]): PumpCurve => ({
    pwm,
    c0,
    c1,
    c2,
    origin: 'producto',
    source: `${DESCHUTES}, fig. 5.1.1: ecuación de la leyenda (PG25, dos bombas)`,
  })),
} as const;

/** Pressure a Deschutes curve makes available at flow Q (m³/s), in Pa. */
export function pumpPressure(curve: PumpCurve, Q: number): number {
  const x = Q / M3S_PER_GPM;
  return (curve.c0 + curve.c1 * x + curve.c2 * x * x) * PA_PER_PSI;
}

const MAIN_OUTER = 0.16;
const MAIN_SDR = 11;

/** The RD109 circuit as GF analysed it (published values) and the lengths I assumed (§7.1). */
export const RD109 = {
  cduFlow: sourced(0.023, 'producto', `${GF}: «approximately 23 L/s» por CDU`),
  racks: sourced(8, 'producto', `${GF}: 8 racks de 132 kW por CDU`),
  servers: sourced(24, 'producto', `${GF}, tabla 1: manifold «with 24 outlets»`),
  inletPressure: sourced(4 * PA_PER_BAR, 'producto', `${GF}, fig. 1: entrada a 4,000 bar abs`),
  mainPipeDiameter: sourced(
    MAIN_OUTER - (2 * MAIN_OUTER) / MAIN_SDR,
    'calculo',
    `Cálculo propio: PP-H d160 SDR11 de ${GF}, $D = d - 2d/\\mathrm{SDR}$`,
  ),
  mainPipeLength: sourced(
    35,
    'ilustrativo',
    `Supuesto: la mitad de los 70 m de ida y vuelta de ${GF}`,
  ),
  rackHoseDiameter: sourced(0.0508, 'producto', `${GF}, tabla 1: manguera Parker de 2″ (nominal)`),
  rackHoseLength: sourced(3, 'ilustrativo', 'Supuesto: 3 m de manguera de rack por sentido'),
  serverHoseDiameter: sourced(9.5e-3, 'producto', `${GF}, tabla 1: «3/8" inner diameter = 9.5 mm»`),
  serverHoseLength: sourced(
    0.5,
    'ilustrativo',
    'Supuesto: 0,5 m de manguera de servidor por sentido',
  ),
  plateDrop: sourced(1.2 * PA_PER_BAR, 'producto', `${GF}, tabla 1: 1,2 bar, valor de diseño`),
  plateExponent: sourced(1.85, 'ilustrativo', `${MBL}: n = 1,85 por omisión, ajustado a OCP`),
  plateLength: sourced(0.15, 'ilustrativo', 'Supuesto: 0,15 m dibujados para la placa fría'),
  systemExponent: sourced(
    1.9,
    'calculo',
    `Cálculo propio: lazo 8x1 de la fig. 4 de ${OCP_OAI} (lectura aproximada), de 2,6 a 12,9 psi entre 6 y 14 L/min, $n = \\ln(12{,}9/2{,}6)/\\ln(14/6) \\approx 1{,}9$`,
  ),
} as const;

/** GF's Sinetz result for the polymer configuration (fig. 2) and its velocity check. */
export const GF_PUBLISHED_DROP_BAR = 1.98;
const GF_BREAKDOWN_BAR: readonly (readonly [string, string, number])[] = [
  ['placas-frias', 'Placas frías', 1.2],
  ['qd-pequenos', 'Conectores pequeños (UQD)', 0.51],
  ['mangueras', 'Mangueras de 3/8″', 0.05],
  ['qd-grande', 'Conector grande', 0.01],
  ['accesorios', 'Accesorios', 0.09],
  ['manifolds', 'Manifolds', 0.03],
  ['tuberias', 'Tuberías', 0.07],
  ['valvulas', 'Válvulas mariposa', 0.02],
];
export const GF_PUBLISHED = {
  totalDrop: sourced(GF_PUBLISHED_DROP_BAR * PA_PER_BAR, 'producto', `${GF}, fig. 2: 1,98 bar`),
  maxPipeVelocity: sourced(
    1.7,
    'producto',
    `${GF}: «maximum velocity in the pipework was 1.7 m/s»`,
  ),
  breakdown: GF_BREAKDOWN_BAR.map(([id, label, bar]) => ({
    id,
    label,
    dp: bar * PA_PER_BAR,
    origin: 'producto' as ValueOrigin,
    source: `${GF}, fig. 2`,
  })),
} as const;

const lpm = (values: readonly number[]) => values.map((value) => value * M3S_PER_LPM);

/** Per-port flows of a 6-port rack manifold without cold plates at 49,5 L/min (NVIDIA + UTA). */
export const SHAHI_2023_PORT_FLOWS = {
  totalFlow: sourced(49.5 * M3S_PER_LPM, 'producto', `${SHAHI}, fig. 5`),
  layout: 'directo' as ReturnLayout,
  fnm: {
    flows: lpm([8.9742, 8.4878, 8.1774, 8.0043, 7.9287, 7.9098]),
    origin: 'producto' as ValueOrigin,
    source: `${SHAHI}, fig. 5: caudales del modelo de red (FNM) escritos en la figura`,
  },
  measured: {
    flows: lpm([8.0, 8.24, 8.24, 8.54, 8.06, 8.4]),
    approximate: true,
    origin: 'producto' as ValueOrigin,
    source: `${SHAHI}, fig. 4: medición, lectura aproximada de la figura`,
  },
} as const;

/** What sizes one rack's circuit; every preset says where each field comes from. */
export interface RackConfig {
  /** Racks on the CDU: the main pipe carries all of them. */
  racks: number;
  /** Servers on the manifold, one per port. */
  servers: number;
  /** Flow into the rack (m³/s). */
  rackFlow: number;
  serverHoseDiameter: number;
  layout: ReturnLayout;
  /** Server flow (m³/s) at which the cold plate drops RD109.plateDrop. */
  plateDesignFlow: number;
  /** Absolute pressure at the CDU outlet (Pa). */
  inletPressure: number;
}

export interface CoolingPreset extends RackConfig {
  id: 'referencia24' | 'mgx44';
  label: string;
  provenance: Readonly<Record<keyof RackConfig, Provenance>>;
}

/** Mean flow per server (m³/s). */
export function serverFlow(config: RackConfig): number {
  return config.rackFlow / config.servers;
}

const PLASTIC = EPANET_VALUES.roughnessPlastic.value;
const STEEL = EPANET_VALUES.roughnessSteel.value;
const TEE_K = EPANET_VALUES.teeK.value;
const PITCH = MGX_MANIFOLD.portPitch.value;
type Direction = 'ida' | 'vuelta';

/** One piece of the MGX manifold between two ports, rising one pitch (the split's header). */
export const MANIFOLD_PIECE: Segment = {
  id: 'manifold',
  label: 'Tramo de manifold',
  length: PITCH,
  diameter: MGX_MANIFOLD.hydraulicDiameter.value,
  area: MGX_MANIFOLD.innerArea.value,
  roughness: STEEL,
  dy: PITCH,
};

const manifoldPiece = (id: string, label: string, servers: number, dy: number): Segment => ({
  ...MANIFOLD_PIECE,
  id,
  label,
  dy,
  flowMultiple: servers,
});

function mainPipe(direction: Direction, config: RackConfig): Segment {
  return {
    id: `tuberia-${direction}`,
    label: `Tubería principal (${direction})`,
    length: RD109.mainPipeLength.value,
    diameter: RD109.mainPipeDiameter.value,
    roughness: PLASTIC,
    dy: 0,
    flowMultiple: config.racks * config.servers,
  };
}

function rackHose(direction: Direction, config: RackConfig, dy: number): Segment {
  return {
    id: `manguera-rack-${direction}`,
    label: `Te y manguera de rack (${direction})`,
    length: RD109.rackHoseLength.value,
    diameter: RD109.rackHoseDiameter.value,
    roughness: PLASTIC,
    dy,
    K: TEE_K,
    flowMultiple: config.servers,
  };
}

/** The parallel branch of one server, port to port: tee and hose, UQD04, cold plate and back. */
export function serverBranch(config: RackConfig): Segment[] {
  const hose = (direction: Direction): Segment => ({
    id: `manguera-servidor-${direction}`,
    label: `Te y manguera del servidor (${direction})`,
    length: RD109.serverHoseLength.value,
    diameter: config.serverHoseDiameter,
    roughness: PLASTIC,
    dy: 0,
    K: TEE_K,
  });
  const uqd = (direction: Direction): Segment => ({
    id: `uqd-${direction}`,
    label: `UQD04 (${direction})`,
    length: UQD04.length.value,
    diameter: UQD04.bore.value,
    roughness: STEEL,
    dy: 0,
    cv: UQD04.cv.value,
  });
  const plate: Segment = {
    id: 'placa-fria',
    label: 'Placa fría y tubería interna',
    length: RD109.plateLength.value,
    diameter: config.serverHoseDiameter,
    roughness: PLASTIC,
    dy: 0,
    curve: powerLawCurve(RD109.plateDrop.value, config.plateDesignFlow, RD109.plateExponent.value),
  };
  return [hose('ida'), uqd('ida'), plate, uqd('vuelta'), hose('vuelta')];
}

const ports = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (to >= from ? from + i : from - i));

/**
 * The path CDU → main pipe → rack hose → supply manifold up to `server` (1 = bottom) → branch →
 * return manifold → rack hose → main pipe → CDU (research §7.1). Each segment's flowMultiple
 * counts the servers whose flow it carries, so the path flow is one server's mean flow. Direct
 * return goes back down to the outlet below port 1; reverse return climbs to the outlet above
 * port N and the rack hose brings it down.
 */
export function rackPath(config: RackConfig, server = config.servers): Segment[] {
  const n = config.servers;
  if (!Number.isInteger(server) || server < 1 || server > n) {
    throw new RangeError(`server must be an integer between 1 and ${n}, got ${server}`);
  }
  const supply = ports(1, server).map((j) =>
    manifoldPiece(`manifold-ida-${j}`, 'Manifold de impulsión', n - j + 1, PITCH),
  );
  const isDirect = config.layout === 'directo';
  const back = isDirect
    ? ports(server, 1).map((p) =>
        manifoldPiece(`manifold-vuelta-${p}`, 'Manifold de retorno', n - p + 1, -PITCH),
      )
    : ports(server, n).map((p) =>
        manifoldPiece(`manifold-vuelta-${p}`, 'Manifold de retorno', p, PITCH),
      );
  const outletHeight = isDirect ? 0 : (n + 1) * PITCH;
  return [
    mainPipe('ida', config),
    rackHose('ida', config, 0),
    ...supply,
    ...serverBranch(config),
    ...back,
    rackHose('vuelta', config, -outletHeight),
    mainPipe('vuelta', config),
  ];
}

/** The branch as one curve: its loss at the mean server flow, with the cold plate's exponent. */
export function branchCurve(config: RackConfig, f: Fluid = PG25_40C): LossCurve {
  const q = serverFlow(config);
  return powerLawCurve(seriesLoss(serverBranch(config), q, f), q, RD109.plateExponent.value);
}

/** Per-server flows of the rack (branchFlows over the MGX manifold). */
export function rackSplit(config: RackConfig, f: Fluid = PG25_40C): BranchFlowsResult {
  return branchFlows({
    Qrack: config.rackFlow,
    branchCurve: branchCurve(config, f),
    header: MANIFOLD_PIECE,
    ports: config.servers,
    layout: config.layout,
    f,
  });
}

/** v(x) and p(x) along the path to `server`, at the mean server flow. */
export function rackProfile(
  config: RackConfig,
  server = config.servers,
  f: Fluid = PG25_40C,
): ProfilePoint[] {
  return circuitProfile(rackPath(config, server), serverFlow(config), f, config.inletPressure);
}

const provenanceOf = ({ origin, source }: Provenance): Provenance => ({ origin, source });
const REFERENCE_RACK_FLOW = RD109.cduFlow.value / RD109.racks.value;
const MGX_RACK_FLOW = 170 * M3S_PER_LPM;
const DIRECT_RETURN: Provenance = {
  origin: 'ilustrativo',
  source: 'Supuesto: retorno directo, con la entrada y la salida abajo',
};

export const PRESETS: Readonly<Record<CoolingPreset['id'], CoolingPreset>> = {
  referencia24: {
    id: 'referencia24',
    label: 'Referencia: 24 servidores (RD109)',
    racks: RD109.racks.value,
    servers: RD109.servers.value,
    rackFlow: REFERENCE_RACK_FLOW,
    serverHoseDiameter: RD109.serverHoseDiameter.value,
    layout: 'directo',
    plateDesignFlow: REFERENCE_RACK_FLOW / RD109.servers.value,
    inletPressure: RD109.inletPressure.value,
    provenance: {
      racks: provenanceOf(RD109.racks),
      servers: provenanceOf(RD109.servers),
      rackFlow: { origin: 'calculo', source: `Cálculo propio: los 23 L/s de ${GF} entre 8 racks` },
      serverHoseDiameter: provenanceOf(RD109.serverHoseDiameter),
      layout: DIRECT_RETURN,
      plateDesignFlow: {
        origin: 'calculo',
        source: 'Cálculo propio: el caudal medio por servidor, al que GF da 1,2 bar',
      },
      inletPressure: provenanceOf(RD109.inletPressure),
    },
  },
  mgx44: {
    id: 'mgx44',
    label: 'MGX: 44 puertos',
    racks: RD109.racks.value,
    servers: MGX_MANIFOLD.ports.value,
    rackFlow: MGX_RACK_FLOW,
    serverHoseDiameter: RD109.serverHoseDiameter.value,
    layout: 'directo',
    plateDesignFlow: MGX_RACK_FLOW / MGX_MANIFOLD.ports.value,
    inletPressure: RD109.inletPressure.value,
    provenance: {
      racks: {
        origin: 'ilustrativo',
        source: 'Supuesto: el mismo CDU de 8 racks que la referencia',
      },
      servers: provenanceOf(MGX_MANIFOLD.ports),
      rackFlow: {
        origin: 'producto',
        source: `${GF}, fig. 5: «The volume flow is defined as 170 l/min»`,
      },
      serverHoseDiameter: provenanceOf(RD109.serverHoseDiameter),
      layout: DIRECT_RETURN,
      plateDesignFlow: {
        origin: 'ilustrativo',
        source: 'Supuesto: la placa pierde sus 1,2 bar al caudal medio de este preset',
      },
      inletPressure: provenanceOf(RD109.inletPressure),
    },
  },
};

/** The research §7.1 reference: the path to the farthest server (24th, top), direct return. */
export const RD109_CIRCUIT: readonly Segment[] = rackPath(PRESETS.referencia24);

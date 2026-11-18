import {
  M3S_PER_GPM,
  M3S_PER_LPM,
  PA_PER_BAR,
  PA_PER_PSI,
  type Fluid,
  type ReturnLayout,
} from '../physics/hydraulics';
import { propyleneGlycolWater } from '../physics/propyleneGlycol';

/*
 * Tema 13 sourced catalogue: the values of the liquid-cooling circuit of a GB200 NVL72-class rack
 * (Schneider RD109 analysed by GF), its parts from open specifications (OCP UQD v2.0.0, NVIDIA
 * MGX, Google Project Deschutes), the fluid (Melinder via LBNL) and the per-port flows measured by
 * Shahi et al. (2023), each with its origin and source. The path and the presets built from them
 * live in liquidCoolingCircuit.ts. Every number: docs/superpowers/research/
 * 2026-11-17-enfriamiento-liquido.md (§5 values, §7 reference calculation), accessed 2026-11-17.
 * SI units unless a name says otherwise.
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
  /** A reading of a figure rather than a printed number. */
  approximate?: boolean;
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
const SCHNEIDER = 'Schneider Electric, EcoStruxure Reference Design 109 (NVIDIA GB200), 2026';
const NIST = 'NIST Chemistry WebBook (Lemmon et al.), agua en la isobara de 0,3 MPa';
const FT = 0.3048;

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

/**
 * Water at 40 °C as NIST publishes it: a published reference, not a model assumption, against
 * which Melinder's fit with no glycol is checked (research §5.1).
 */
export const WATER_40C_NIST = {
  temperatureC: 40,
  rho: sourced(992.3, 'producto', `${NIST}: 992,30 kg/m³ a 40 °C`),
  mu: sourced(0.65275e-3, 'producto', `${NIST}: 0,65275 mPa·s a 40 °C`),
} as const;

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
  drawnLength: sourced(
    0.06,
    'ilustrativo',
    `Supuesto: longitud dibujada del conector, la DD máx. de 60 mm de ${OCP_UQD}, tabla 1`,
  ),
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
    'Cálculo propio: $D_h = 4A/P_m$ de la sección interior, con $P_m$ su perímetro mojado',
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
  curveMaxFlow: {
    ...sourced(
      650 * M3S_PER_GPM,
      'producto',
      `${DESCHUTES}, fig. 5.1.1: final del eje de caudal, lectura aproximada`,
    ),
    approximate: true,
  },
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
  supplyTemperature: sourced(40, 'producto', `${SCHNEIDER}: «TCS loop supply temperature 104 °F»`),
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
  plateExponent: sourced(1.85, 'ilustrativo', `${MBL}: $n$ = 1,85 por omisión, ajustado a OCP`),
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
  cfdManifoldFlow: sourced(
    170 * M3S_PER_LPM,
    'producto',
    `${GF}, fig. 5: 44 ramas, «The volume flow is defined as 170 l/min»`,
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

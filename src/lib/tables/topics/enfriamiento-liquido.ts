/**
 * Tema 13 tables: the declared parameters of the calculation (fluid and flows, geometry,
 * connectors and cold plate; src/lib/data/liquidCoolingParameters.ts), each with its origin and
 * one source, and my loss breakdown against GF's. Every value comes from
 * src/lib/data/liquidCooling*.ts at module load (research
 * docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §5 and §7.1 with its errata).
 * Each parameter row has an id: the profile figure names the ids it uses (data-parameters), and
 * the tests and the e2e cross-check them against these rows.
 */
import {
  EPANET_VALUES,
  FLOW_PER_KW,
  GF_PUBLISHED,
  PG25_40C,
  RD109,
  UQD04,
  WATER_40C_NIST,
  type ValueOrigin,
} from '../../data/liquidCooling';
import { lossBreakdown, type BreakdownId } from '../../data/liquidCoolingBreakdown';
import { PRESETS, rackPath, serverFlow } from '../../data/liquidCoolingCircuit';
import {
  CONNECTOR_PARAMETERS,
  FLUID_PARAMETERS,
  GEOMETRY_PARAMETERS,
  type CoolingParameterId,
  type ParameterSpec,
} from '../../data/liquidCoolingParameters';
import { formatNumber } from '../../format';
import { hydraulicPower, M3S_PER_LPM, PA_PER_BAR, seriesLoss } from '../../physics/hydraulics';
import { propyleneGlycolWater } from '../../physics/propyleneGlycol';
import type { DataTableSpec, TableColumn } from '../types';

export type { CoolingParameterId };

/** How a row's origin reads; table 13.1's caption defines the three words. */
export const ORIGIN_LABELS: Readonly<Record<ValueOrigin, string>> = {
  producto: 'Producto',
  ilustrativo: 'Supuesto',
  calculo: 'Cálculo propio',
};
const CONSTANT = 'Constante';
const NONE = '—';
const PERCENT = 100;
const W_PER_KW = 1e3;
const L_PER_M3 = 1e3;

const REFERENCE = PRESETS.referencia24;
const PATH = rackPath(REFERENCE);
const Q_SERVER = serverFlow(REFERENCE);

const originLabel = ({ origin }: ParameterSpec['from']) =>
  origin === 'constante' ? CONSTANT : ORIGIN_LABELS[origin];

const COLUMNS: readonly TableColumn[] = [
  { key: 'parametro', label: 'Parámetro', align: 'text', minWidthCh: 18 },
  { key: 'simbolo', label: 'Símbolo', align: 'text' },
  // Each row prints its value with its own decimals (the cells come written): precision unused.
  { key: 'valor', label: 'Valor', align: 'num', precision: 0 },
  { key: 'unidad', label: 'Unidad', align: 'text' },
  { key: 'origen', label: 'Origen', align: 'text', minWidthCh: 10 },
  { key: 'fuente', label: 'Fuente', align: 'text', minWidthCh: 28 },
];

const printed = (spec: ParameterSpec) =>
  typeof spec.value === 'string'
    ? spec.value
    : formatNumber(spec.value, { precision: spec.precision ?? 0 });

const parameterRow = (spec: ParameterSpec) => ({
  id: spec.id,
  parametro: spec.parametro,
  simbolo: spec.simbolo ?? NONE,
  valor: printed(spec),
  unidad: spec.unidad ?? NONE,
  origen: originLabel(spec.from),
  fuente: spec.from.source,
});

const parameterTable = (
  id: string,
  caption: string,
  specs: readonly ParameterSpec[],
  source: DataTableSpec['source'],
): DataTableSpec => ({ id, caption, columns: COLUMNS, rows: specs.map(parameterRow), source });

const NIST_WATER = propyleneGlycolWater(0, WATER_40C_NIST.temperatureC);
const lpm = (flow: number) => formatNumber(flow / M3S_PER_LPM, { precision: 2, unit: 'L/min' });
const percentOff = (value: number, reference: number, precision: number) =>
  formatNumber(Math.abs(value / reference - 1) * PERCENT, { precision, unit: '%' });
/** The load (kW) OCP's rule (L/min per kW) gives for one rack's share of GF's flow. */
const RACK_LOAD_KW = REFERENCE.rackFlow / M3S_PER_LPM / FLOW_PER_KW.value;

const FLUID: DataTableSpec = parameterTable(
  'enfriamiento-liquido-fluido',
  `Fluido y caudales del circuito de referencia, el RD109 de Schneider Electric analizado por GF. Origen: «Producto» es un valor publicado del producto o de su especificación; «Supuesto», una hipótesis de mi modelo; «Cálculo propio», lo que calculé con esos valores. Los ${formatNumber(REFERENCE.rackFlow / M3S_PER_LPM, { precision: 1, unit: 'L/min' })} por rack equivalen a la regla de OCP con ${formatNumber(RACK_LOAD_KW, { precision: 0, unit: 'kW' })} (cálculo propio). Uso las propiedades a 40 °C en todo el lazo, aunque el retorno vuelve más caliente. Con 0 % de glicol, el polinomio de Melinder da el agua del NIST a 40 °C con una diferencia de ${percentOff(NIST_WATER.rho, WATER_40C_NIST.rho.value, 2)} en la densidad y de ${percentOff(NIST_WATER.mu, WATER_40C_NIST.mu.value, 2)} en la viscosidad (cálculo propio).`,
  FLUID_PARAMETERS,
  {
    text: 'Polinomios de Melinder (2010) en la Modelica Buildings Library v14.0.0 de LBNL; agua: NIST Chemistry WebBook; caudales: GF Piping Systems (2026) y Schneider Electric (RD109); regla de caudal: OCP OAI (2023); cada fila con su fuente',
    url: 'https://github.com/lbl-srg/modelica-buildings/blob/v14.0.0/Buildings/Media/Antifreeze/Functions/PropyleneGlycolWater.mo',
  },
);

const GEOMETRY: DataTableSpec = parameterTable(
  'enfriamiento-liquido-geometria',
  'Geometría de cada tramo del recorrido, de la salida del CDU al servidor y de vuelta (origen, como en la tabla 13.1). Las longitudes son supuestos míos: GF da la tubería principal de ida y vuelta, y nadie publica las de las mangueras.',
  GEOMETRY_PARAMETERS,
  {
    text: 'GF Piping Systems (2026), tabla 1; NVIDIA, MGX Rev. 1.0 (OCP, 2024), fig. 7-13 a 7-15; rugosidad y $K$ de las tablas del manual de EPANET 2.2; cada fila con su fuente',
    url: 'https://www.gfps.com/content/dam/gfps/com/whitepapers/en/gfps-whitepaper-hydraulic-design-principles-en.pdf',
  },
);

const CONNECTORS: DataTableSpec = parameterTable(
  'enfriamiento-liquido-conectores',
  `El conector UQD04 de cada bandeja y la placa fría (origen, como en la tabla 13.1). El $C_v$ se define con el caudal en gal/min y la caída en psi. Con ${REFERENCE.servers} servidores por rack, cada UQD04 lleva ${lpm(Q_SERVER)}, más que sus ${lpm(UQD04.nominalFlow.value)} nominales. NVIDIA no publica el caudal por bandeja, y la caída de la placa es el valor de diseño que GF da para todas las placas y su tubería interna, no la curva medida de un modelo con nombre.`,
  CONNECTOR_PARAMETERS,
  {
    text: 'OCP, Universal Quick Disconnect Design Specification v2.0.0 (2026), tablas 1, 2 y 6; Amphenol, catálogo UQD/UQDB (2025); GF Piping Systems (2026), tabla 1; exponente $n$ por omisión de la Modelica Buildings Library v14.0.0; cada fila con su fuente',
    url: 'https://www.opencompute.org/wp-content/uploads/2026/10/OCP-Design-Spec_UQD_v2.0.0.pdf',
  },
);

const ALL_PARAMETERS: readonly { table: string; specs: readonly ParameterSpec[] }[] = [
  { table: FLUID.id, specs: FLUID_PARAMETERS },
  { table: GEOMETRY.id, specs: GEOMETRY_PARAMETERS },
  { table: CONNECTORS.id, specs: CONNECTOR_PARAMETERS },
];

/** Every declared parameter by id: its table, its name and its value as the table prints them. */
export const PARAMETER_ROWS = Object.fromEntries(
  ALL_PARAMETERS.flatMap(({ table, specs }) =>
    specs.map((spec) => [spec.id, { table, parametro: spec.parametro, valor: printed(spec) }]),
  ),
) as Readonly<Record<CoolingParameterId, { table: string; parametro: string; valor: string }>>;

/* ── Table 13.4: my loss breakdown against GF's fig. 2 ─────────────────────────────────── */

const bar = (pa: number | null) => (pa === null ? NONE : pa / PA_PER_BAR);
const decimals = (value: number, precision: number) => formatNumber(value, { precision });

const HOW: Readonly<Record<BreakdownId, string>> = {
  'placas-frias': `Curva de la placa: ${decimals(RD109.plateDrop.value / PA_PER_BAR, 1)} bar de GF a su caudal de diseño`,
  'qd-pequenos': `Dos conectores con $C_v$ = ${decimals(UQD04.cv.value, 2)} de Amphenol`,
  mangueras: `Darcy–Weisbach, ${decimals(RD109.serverHoseLength.value, 1)} m por sentido`,
  'mangueras-rack': `Darcy–Weisbach, ${decimals(RD109.rackHoseLength.value, 0)} m por sentido; GF no tiene esta fila`,
  'qd-grande': 'No lo modelo',
  accesorios: `Cuatro tes con $K$ = ${decimals(EPANET_VALUES.teeK.value, 1)} de EPANET`,
  manifolds: 'Darcy–Weisbach con el caudal de cada tramo',
  tuberias: `Darcy–Weisbach, ${decimals(RD109.mainPipeLength.value, 0)} m por sentido`,
  valvulas: 'No las modelo',
};

const BREAKDOWN = lossBreakdown(PATH, Q_SERVER, PG25_40C);
const TOTAL = seriesLoss(PATH, Q_SERVER, PG25_40C);
const BELOW_GF = (1 - TOTAL / GF_PUBLISHED.totalDrop.value) * PERCENT;
const PUMP_POWER_KW = hydraulicPower(TOTAL, RD109.cduFlow.value) / W_PER_KW;

const DESGLOSE: DataTableSpec = {
  id: 'enfriamiento-liquido-desglose',
  caption: `Pérdidas hasta el servidor más lejano (el 24, arriba, con retorno directo), agrupadas como en la fig. 2 de GF, frente a lo que GF publica para el mismo circuito con su programa Sinetz. Un componente con $C_v$ o con curva medida lleva toda su pérdida en esa ley. Bombear los ${formatNumber(RD109.cduFlow.value * L_PER_M3, { precision: 0, unit: 'L/s' })} contra esa pérdida pide $P = \\Delta p\\,Q$ = ${formatNumber(PUMP_POWER_KW, { precision: 1, unit: 'kW' })} (cálculo propio).`,
  columns: [
    { key: 'grupo', label: 'Grupo de pérdidas', align: 'text', minWidthCh: 18 },
    { key: 'calculo', label: 'Este cálculo', unit: 'bar', align: 'num', precision: 3 },
    { key: 'gf', label: 'GF, Sinetz', unit: 'bar', align: 'num', precision: 2 },
    { key: 'como', label: 'Cómo lo calculo', align: 'text', minWidthCh: 24 },
  ],
  rows: [
    ...BREAKDOWN.map((row) => ({
      grupo: row.label,
      calculo: bar(row.computed),
      gf: bar(row.published),
      como: HOW[row.id],
    })),
    {
      grupo: 'Total hasta el servidor más lejano',
      calculo: TOTAL / PA_PER_BAR,
      gf: GF_PUBLISHED.totalDrop.value / PA_PER_BAR,
      como: `Suma: ${formatNumber(BELOW_GF, { precision: 1, unit: '%' })} por debajo de GF`,
    },
  ],
  source: {
    text: 'Este cálculo: cálculo propio con las ecuaciones (13.1) a (13.3) y los parámetros de las tablas 13.1 a 13.3; GF: Freda y Kugele, GF Piping Systems (2026), fig. 2, configuración de polímero',
    url: 'https://www.gfps.com/content/dam/gfps/com/whitepapers/en/gfps-whitepaper-hydraulic-design-principles-en.pdf',
  },
};

export const TABLES: readonly DataTableSpec[] = [FLUID, GEOMETRY, CONNECTORS, DESGLOSE];

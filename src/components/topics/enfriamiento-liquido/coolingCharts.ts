/**
 * Builders of Tema 13's two other figures: continuity as v against A (step 1, with the
 * hyperbolas v = Q/A of the circuit's three flows) and the split of the rack's flow among its
 * servers (step 4, against the bench of Shahi et al., 2023). Pure, as coolingPlots.ts.
 */
import { PG25_40C, SHAHI_2023_PORT_FLOWS } from '../../../lib/data/liquidCooling';
import { lossBreakdown, type BreakdownId } from '../../../lib/data/liquidCoolingBreakdown';
import {
  MANIFOLD_PIECE,
  rackPath,
  rackSplit,
  serverBranch,
  serverFlow,
  type RackConfig,
} from '../../../lib/data/liquidCoolingCircuit';
import {
  branchFlows,
  M3S_PER_LPM,
  pipeArea,
  powerLawCurve,
  seriesLoss,
  type ReturnLayout,
  type Segment,
} from '../../../lib/physics/hydraulics';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import type { Domain, Scale } from '../../lab/plotScales';
import { REFERENCE, type Point } from './coolingPlots';

const MM2_PER_M2 = 1e6;
const L_PER_M3 = 1e3;

/* ── Log scale for the area axis ─────────────────────────────────────────────────────── */

/** A logarithmic map between a positive value domain and a pixel range. */
export function logScale(domain: Domain, range: [number, number]): Scale {
  if (!(domain.min > 0) || !(domain.max > domain.min)) {
    throw new RangeError(`logScale: needs 0 < min < max (${domain.min}, ${domain.max})`);
  }
  const [r0, r1] = range;
  const [l0, l1] = [Math.log10(domain.min), Math.log10(domain.max)];
  return {
    toPx: (v) => r0 + ((Math.log10(v) - l0) / (l1 - l0)) * (r1 - r0),
    toValue: (px) => 10 ** (l0 + ((px - r0) / (r1 - r0)) * (l1 - l0)),
    domain: { ...domain },
    range: [r0, r1],
  };
}

/** Every power of ten inside the domain. */
export function decadeTicks(domain: Domain): number[] {
  const first = Math.ceil(Math.log10(domain.min));
  const last = Math.floor(Math.log10(domain.max));
  return Array.from({ length: last - first + 1 }, (_, i) => 10 ** (first + i));
}

/* ── Step 1: v against A ─────────────────────────────────────────────────────────────── */

/** The hyperbolas are references (muted); the sections and the manifold are the circuit (ink). */
export const HYPERBOLA_COLOR = TICK_COLOR;
export const SECTION_COLOR = TEXT_COLOR;
/** Areas (mm²) from below the UQD's bore to above the main pipe, and v (m/s) from 0. */
export const AREA_DOMAIN: Domain = { min: 20, max: 30_000 };
const V_STEP = 0.5;
const V_HEADROOM = 1.15;
const CURVE_SAMPLES = 80;

export type FlowId = 'cdu' | 'rack' | 'servidor';

export interface FlowCurve {
  id: FlowId;
  /** m³/s */
  flow: number;
  label: string;
  /** (A in mm², v in m/s) along v = Q/A. */
  points: Point[];
}

export interface SectionPoint {
  id: string;
  /** The number drawn on the point and in the key under the chart. */
  n: number;
  name: string;
  flowId: FlowId;
  /** mm² */
  area: number;
  /** m/s */
  v: number;
}

export interface VelocityAreaData {
  curves: FlowCurve[];
  sections: SectionPoint[];
  /** The manifold: one area, from the rack's flow at its inlet down to one server's at its top. */
  manifold: [Point, Point];
  area: Domain;
  v: Domain;
}

const segmentArea = (s: Segment) => s.area ?? pipeArea(s.diameter);
const flowLabel = (symbol: string, liters: string) => `${symbol} = ${liters}`;

/** The points of the path whose flow differs, each on the hyperbola of its flow (13.1). */
export function velocityAreaData(config: RackConfig = REFERENCE): VelocityAreaData {
  const path = rackPath(config);
  const q = serverFlow(config);
  const flows: Readonly<Record<FlowId, number>> = {
    cdu: q * config.racks * config.servers,
    rack: config.rackFlow,
    servidor: q,
  };
  const at = (segmentId: string) => {
    const segment = path.find((s) => s.id === segmentId);
    if (!segment) throw new RangeError(`velocityAreaData: no segment "${segmentId}"`);
    return segment;
  };
  const picks: readonly [string, string, FlowId][] = [
    ['tuberia-ida', 'Tubería principal', 'cdu'],
    ['manguera-rack-ida', 'Manguera de rack', 'rack'],
    [
      'manifold-ida-1',
      `Manifold, primer tramo: lleva el caudal de los ${config.servers} servidores`,
      'rack',
    ],
    [
      `manifold-ida-${config.servers}`,
      'Manifold, último tramo: lleva el de un servidor',
      'servidor',
    ],
    ['manguera-servidor-ida', 'Manguera 3/8″ del servidor', 'servidor'],
    ['uqd-ida', 'Boca del UQD04', 'servidor'],
  ];
  const sections = picks.map(([id, name, flowId], i) => {
    const area = segmentArea(at(id));
    return { id, n: i + 1, name, flowId, area: area * MM2_PER_M2, v: flows[flowId] / area };
  });
  const vMax = Math.ceil((Math.max(...sections.map((s) => s.v)) * V_HEADROOM) / V_STEP) * V_STEP;
  const ratio = (AREA_DOMAIN.max / AREA_DOMAIN.min) ** (1 / (CURVE_SAMPLES - 1));
  const areas = Array.from({ length: CURVE_SAMPLES }, (_, i) => AREA_DOMAIN.min * ratio ** i);
  const curve = (id: FlowId, label: string): FlowCurve => ({
    id,
    flow: flows[id],
    label,
    points: areas.map((area) => ({ x: area, y: flows[id] / (area / MM2_PER_M2) })),
  });
  const liters = (flow: number, unit: 'L/s' | 'L/min', precision: number) =>
    formatNumber(unit === 'L/s' ? flow * L_PER_M3 : flow / M3S_PER_LPM, { precision, unit });
  return {
    curves: [
      curve('cdu', flowLabel('$Q_\\text{CDU}$', liters(flows.cdu, 'L/s', 0))),
      curve('rack', flowLabel('$Q_\\text{rack}$', liters(flows.rack, 'L/min', 1))),
      curve('servidor', flowLabel('$q$', liters(flows.servidor, 'L/min', 2))),
    ],
    sections,
    manifold: [
      { x: sections[2].area, y: sections[2].v },
      { x: sections[3].area, y: sections[3].v },
    ],
    area: AREA_DOMAIN,
    v: { min: 0, max: vMax },
  };
}

/* ── Step 4: the split among servers ─────────────────────────────────────────────────── */

/** With cold plates, the real servers (ink); without them, a test bench like NVIDIA's (purple). */
export const WITH_PLATE_COLOR = TEXT_COLOR;
export const NO_PLATE_COLOR = 'var(--chart-4)';
/** Without the plate the branch is hoses and couplings: turbulent, n = 2 (MBL's PressureDrop). */
const NO_PLATE_EXPONENT = 2;

export interface BranchSeries {
  id: string;
  label: string;
  withPlate: boolean;
  layout: ReturnLayout;
  color: string;
  dashed: boolean;
  /** (port, flow in L/min), port 1 at the bottom, next to the inlet. */
  points: Point[];
  converged: boolean;
}

const LAYOUT_NAMES: Readonly<Record<ReturnLayout, string>> = {
  directo: 'retorno directo',
  invertido: 'retorno invertido',
};

const toPoints = (flows: readonly number[]) =>
  flows.map((flow, i) => ({ x: i + 1, y: flow / M3S_PER_LPM }));

/** The rack's split (13.4) with and without its cold plates, in direct and in reverse return. */
export function branchFlowSeries(config: RackConfig = REFERENCE): BranchSeries[] {
  const q = serverFlow(config);
  const bare = serverBranch(config).filter((segment) => segment.id !== 'placa-fria');
  const bareCurve = powerLawCurve(seriesLoss(bare, q, PG25_40C), q, NO_PLATE_EXPONENT);
  const layouts: readonly ReturnLayout[] = ['directo', 'invertido'];
  const withPlate = layouts.map((layout) => {
    const split = rackSplit({ ...config, layout });
    return { layout, withPlate: true, ...split };
  });
  const withoutPlate = layouts.map((layout) => {
    const split = branchFlows({
      Qrack: config.rackFlow,
      branchCurve: bareCurve,
      header: MANIFOLD_PIECE,
      ports: config.servers,
      layout,
      f: PG25_40C,
    });
    return { layout, withPlate: false, ...split };
  });
  return [...withPlate, ...withoutPlate].map(({ layout, withPlate: plate, flows, converged }) => ({
    id: `${plate ? 'placa' : 'sin-placa'}-${layout}`,
    label: `${plate ? 'Con placa fría' : 'Sin placa fría'}, ${LAYOUT_NAMES[layout]}`,
    withPlate: plate,
    layout,
    color: plate ? WITH_PLATE_COLOR : NO_PLATE_COLOR,
    dashed: layout === 'invertido',
    points: toPoints(flows),
    converged,
  }));
}

/** Shahi et al. (2023): their flow network model's flows (fig. 5) and the measured ones (fig. 4). */
export function shahiSeries(): { fnm: Point[]; measured: Point[] } {
  return {
    fnm: toPoints(SHAHI_2023_PORT_FLOWS.fnm.flows),
    measured: toPoints(SHAHI_2023_PORT_FLOWS.measured.flows),
  };
}

/* ── Step 3: where the pressure goes ─────────────────────────────────────────────────── */

/** My model's losses in ink (bars); GF's published ones in green (points), a reference. */
export const MODEL_LOSS_COLOR = TEXT_COLOR;
export const PUBLISHED_LOSS_COLOR = 'var(--chart-3)';
const PA_PER_KPA = 1e3;
const LOSS_HEADROOM = 1.08;
/** The groups inside the server's branch that GF says take most of the loss. */
const SERVER_GROUPS: readonly BreakdownId[] = ['placas-frias', 'qd-pequenos'];

export interface LossBar {
  id: BreakdownId;
  label: string;
  /** kPa; null for a group I do not model. */
  computed: number | null;
  /** kPa; null for a group GF's fig. 2 has no row for. */
  published: number | null;
}

export interface LossChartData {
  rows: LossBar[];
  /** End of the kPa axis. */
  max: number;
  /** Share of the plates and small couplings in my total and in GF's. */
  serverShare: { computed: number; published: number };
}

const toKpa = (pa: number | null) => (pa === null ? null : pa / PA_PER_KPA);

/** Table 13.4 as a chart: lossBreakdown's groups for the path to the farthest server, in kPa. */
export function lossChartData(config: RackConfig = REFERENCE): LossChartData {
  const rows = lossBreakdown(rackPath(config), serverFlow(config), PG25_40C).map((row) => ({
    id: row.id,
    label: row.label,
    computed: toKpa(row.computed),
    published: toKpa(row.published),
  }));
  const share = (pick: (row: LossBar) => number | null) => {
    const total = rows.reduce((sum, row) => sum + (pick(row) ?? 0), 0);
    const server = rows
      .filter((row) => SERVER_GROUPS.includes(row.id))
      .reduce((sum, row) => sum + (pick(row) ?? 0), 0);
    return server / total;
  };
  const largest = Math.max(...rows.flatMap((row) => [row.computed ?? 0, row.published ?? 0]));
  return {
    rows,
    max: largest * LOSS_HEADROOM,
    serverShare: {
      computed: share((row) => row.computed),
      published: share((row) => row.published),
    },
  };
}

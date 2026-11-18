/**
 * Builders of Tema 13's prescribed figure (CircuitProfileFigure): v(x) and p(x) along the path of
 * one litre of coolant from the CDU to a server and back, split into the supply and the return,
 * the three views it opens on, and the declared parameters it uses. Pure: the figure and the lab
 * (Task 14) draw what these return. Research docs/superpowers/research/2026-11-17-enfriamiento-
 * liquido.md, §7.1 (the path) and §8 (the figure).
 */
import { PG25_40C } from '../../../lib/data/liquidCooling';
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics/constants';
import {
  PRESETS,
  rackPath,
  rackProfile,
  type RackConfig,
} from '../../../lib/data/liquidCoolingCircuit';
import type { Fluid, ProfilePoint, Segment } from '../../../lib/physics/hydraulics';
import type { CoolingParameterId } from '../../../lib/data/liquidCoolingParameters';
import { TICK_COLOR } from '../../charts/chartTheme';
import { padDomain, type Domain } from '../../lab/plotScales';

export type Point = { x: number; y: number };

/** The supply runs from the CDU to the cold plate; the return, from the plate back to the CDU. */
export type CircuitSide = 'impulsion' | 'retorno';
export const SIDES: readonly CircuitSide[] = ['impulsion', 'retorno'];

/** Cold supply in blue, warm return in orange-red, as OCP OAI's fig. 3 and every plumber draw them. */
export const SUPPLY_COLOR = 'var(--chart-1)';
export const RETURN_COLOR = 'var(--chart-2)';
export const SIDE_COLORS: Readonly<Record<CircuitSide, string>> = {
  impulsion: SUPPLY_COLOR,
  retorno: RETURN_COLOR,
};
/** Bernoulli without losses is a reference, not the circuit: muted, as Tema 7's ideal bounce. */
export const IDEAL_COLOR = TICK_COLOR;

export const REFERENCE = PRESETS.referencia24;
const PA_PER_KPA = 1e3;
/** The server view shows this much manifold (m) on each side of the server's branch. */
export const SERVER_VIEW_PAD = 0.15;
const V_HEADROOM = 1.15;
const P_PAD = 0.12;

/** The kinds of piece along the path, from the segment ids of liquidCoolingCircuit.ts. */
export type SectionKind =
  'tuberia' | 'manguera-rack' | 'manifold' | 'manguera-servidor' | 'uqd' | 'placa-fria';
const KIND_PREFIXES: readonly (readonly [string, SectionKind])[] = [
  ['tuberia-', 'tuberia'],
  ['manguera-rack-', 'manguera-rack'],
  ['manifold', 'manifold'],
  ['manguera-servidor-', 'manguera-servidor'],
  ['uqd-', 'uqd'],
  ['placa-fria', 'placa-fria'],
];

export function sectionKind(segment: Segment): SectionKind {
  const match = KIND_PREFIXES.find(([prefix]) => segment.id.startsWith(prefix));
  if (!match) throw new RangeError(`sectionKind: unknown segment "${segment.id}"`);
  return match[1];
}

/** Index of the cold plate: the first segment of the return (the fluid heats inside it). */
export function plateIndex(path: readonly Segment[]): number {
  const index = path.findIndex((segment) => sectionKind(segment) === 'placa-fria');
  if (index < 0) throw new RangeError('plateIndex: the path has no cold plate');
  return index;
}

/** Where each segment starts along the path (m); the last entry is the path's length. */
export function segmentBounds(path: readonly Segment[]): number[] {
  return path.reduce<number[]>(
    (bounds, segment) => [...bounds, bounds[bounds.length - 1] + segment.length],
    [0],
  );
}

export interface SideSeries {
  /** v(x) in m/s, two points per segment: a staircase. */
  v: Point[];
  /** Real p(x) in kPa, with the losses. */
  p: Point[];
}

export interface CircuitProfileData {
  path: readonly Segment[];
  points: readonly ProfilePoint[];
  bounds: readonly number[];
  /** Each side ends at the plate inlet with the return's first point, so the lines join there. */
  sides: Readonly<Record<CircuitSide, SideSeries>>;
  /** Bernoulli without losses (kPa), the whole loop. */
  ideal: Point[];
  inlet: number;
  outlet: number;
  /** Inlet minus outlet (kPa): every loss of the path. */
  loss: number;
}

const kpa = (pa: number) => pa / PA_PER_KPA;

/** v(x), real p(x) and ideal p(x) of the path to `server` (13.1–13.3), split at the cold plate. */
export function circuitProfileData(
  config: RackConfig = REFERENCE,
  server = config.servers,
  f: Fluid = PG25_40C,
): CircuitProfileData {
  const path = rackPath(config, server);
  const points = rackProfile(config, server, f);
  const split = 2 * plateIndex(path);
  const series = (from: number, to: number): SideSeries => ({
    v: points.slice(from, to).map(({ x, v }) => ({ x, y: v })),
    p: points.slice(from, to).map(({ x, pReal }) => ({ x, y: kpa(pReal) })),
  });
  const inlet = kpa(points[0].pReal);
  const outlet = kpa(points[points.length - 1].pReal);
  return {
    path,
    points,
    bounds: segmentBounds(path),
    sides: { impulsion: series(0, split + 1), retorno: series(split, points.length) },
    ideal: points.map(({ x, pIdeal }) => ({ x, y: kpa(pIdeal) })),
    inlet,
    outlet,
    loss: inlet - outlet,
  };
}

/* ── Views ────────────────────────────────────────────────────────────────────────────── */

export type ProfileViewId = 'circuito' | 'rack' | 'servidor';
/** How finely the strip names the sections: the circuit's parts, the rack's, or every piece. */
export type LabelLevel = 'grupo' | 'parte' | 'tramo';

export interface ProfileView {
  id: ProfileViewId;
  label: string;
  labelLevel: LabelLevel;
}

export const PROFILE_VIEWS: readonly ProfileView[] = [
  { id: 'circuito', label: 'Todo el circuito', labelLevel: 'grupo' },
  { id: 'rack', label: 'Rack', labelLevel: 'parte' },
  { id: 'servidor', label: 'Servidor', labelLevel: 'tramo' },
];

/** The x range (m) of a view: the whole path, the rack's two hoses, or the server's branch. */
export function viewXDomain(path: readonly Segment[], view: ProfileViewId): Domain {
  const bounds = segmentBounds(path);
  const span = (kind: SectionKind) => {
    const indices = path.flatMap((segment, i) => (sectionKind(segment) === kind ? [i] : []));
    return { min: bounds[indices[0]], max: bounds[indices[indices.length - 1] + 1] };
  };
  if (view === 'circuito') return { min: 0, max: bounds[bounds.length - 1] };
  if (view === 'rack') return span('manguera-rack');
  const branch = span('manguera-servidor');
  return { min: branch.min - SERVER_VIEW_PAD, max: branch.max + SERVER_VIEW_PAD };
}

/** The v and p ranges that hold every segment drawn inside the x range, v from 0. */
export function viewYDomains(data: CircuitProfileData, x: Domain): { v: Domain; p: Domain } {
  const { points, bounds } = data;
  const visible = data.path.flatMap((_, i) =>
    bounds[i + 1] > x.min && bounds[i] < x.max ? [points[2 * i], points[2 * i + 1]] : [],
  );
  const vMax = Math.max(...visible.map((point) => point.v));
  const pressures = visible.flatMap((point) => [kpa(point.pReal), kpa(point.pIdeal)]);
  return { v: { min: 0, max: vMax * V_HEADROOM }, p: padDomain(pressures, P_PAD) };
}

/* ── What each view shows, in words ──────────────────────────────────────────────────── */

/** 1 bar = 100 kPa. */
export const KPA_PER_BAR = 100;
const PERCENT = 100;
const number = (value: number, precision: number) => formatNumber(value, { precision });

/** The reading under the figure for a view: the numbers it shows, computed from the profile. */
export function viewNote(
  data: CircuitProfileData,
  view: ProfileViewId,
  f: Fluid = PG25_40C,
): string {
  const { path, points } = data;
  const index = (id: string) => {
    const i = path.findIndex((segment) => segment.id === id);
    if (i < 0) throw new RangeError(`viewNote: the path has no segment "${id}"`);
    return i;
  };
  const start = (id: string) => points[2 * index(id)];
  const end = (id: string) => points[2 * index(id) + 1];
  const drop = (from: ProfilePoint, to: ProfilePoint) => kpa(from.pReal - to.pReal);
  if (view === 'circuito') {
    const server = drop(start('manguera-servidor-ida'), end('manguera-servidor-vuelta'));
    return `Del CDU al servidor ${data.path.filter((s) => s.id.startsWith('manifold-ida')).length} y de vuelta, la presión baja de ${number(data.inlet, 1)} a ${number(data.outlet, 1)} kPa: ${number(data.loss, 1)} kPa, o ${number(data.loss / KPA_PER_BAR, 2)} bar. El ${number((server / data.loss) * PERCENT, 0)} % se pierde dentro del servidor. Sin pérdidas, Bernoulli volvería a ${number(data.ideal[data.ideal.length - 1].y, 1)} kPa.`;
  }
  if (view === 'rack') {
    const supply = path.filter((segment) => segment.id.startsWith('manifold-ida'));
    const rise = supply.reduce((sum, segment) => sum + segment.dy, 0);
    const first = start(supply[0].id).v;
    const last = start(supply[supply.length - 1].id).v;
    return `Al subir ${number(rise, 2)} m por el manifold de impulsión, la presión baja $\\rho g \\Delta y$ = ${number(kpa(f.rho * G_EARTH * rise), 1)} kPa, que recupera al bajar por el de retorno. En el manifold, la velocidad baja de ${number(first, 2)} a ${number(last, 2)} m/s: cada puerto se lleva el caudal de un servidor.`;
  }
  const hose = start('manguera-servidor-ida');
  const uqd = start('uqd-ida');
  return `En la boca del UQD04 el líquido va a ${number(uqd.v, 2)} m/s: Bernoulli baja la presión ${number(kpa(hose.pIdeal - uqd.pIdeal), 1)} kPa y la devuelve en la manguera, pero cada conector pierde ${number(drop(uqd, end('uqd-ida')), 1)} kPa. La placa fría pierde ${number(drop(start('placa-fria'), end('placa-fria')), 1)} kPa, el valor de diseño de GF. Dentro de la placa dibujo la velocidad de la manguera: su interior no es público.`;
}

/* ── The declared parameters the figure uses ─────────────────────────────────────────── */

/** Fluid, gravity, inlet pressure and the flows that set every segment's own flow. */
const ALWAYS: readonly CoolingParameterId[] = [
  'pg25-densidad',
  'pg25-viscosidad',
  'temperatura-impulsion',
  'gravedad',
  'presion-entrada',
  'caudal-cdu',
  'racks-por-cdu',
  'servidores-por-rack',
  'caudal-rack',
  'caudal-servidor',
];

const BY_KIND: Readonly<Record<SectionKind, readonly CoolingParameterId[]>> = {
  tuberia: ['tuberia-diametro', 'tuberia-longitud', 'rugosidad-plastico'],
  'manguera-rack': [
    'manguera-rack-diametro',
    'manguera-rack-longitud',
    'rugosidad-plastico',
    'te-k',
  ],
  manifold: ['manifold-area', 'manifold-dh', 'manifold-paso', 'manifold-subida', 'rugosidad-acero'],
  'manguera-servidor': [
    'manguera-servidor-diametro',
    'manguera-servidor-longitud',
    'rugosidad-plastico',
    'te-k',
  ],
  uqd: ['uqd-cv', 'uqd-boca', 'uqd-longitud'],
  'placa-fria': ['placa-caida', 'placa-exponente', 'placa-caudal-diseno', 'placa-longitud'],
};

/** The ids (tables 13.1 to 13.3) of every parameter the profile of `path` is computed with. */
export function profileParameterIds(path: readonly Segment[]): CoolingParameterId[] {
  const kinds = new Set(path.map(sectionKind));
  return [...new Set([...ALWAYS, ...[...kinds].flatMap((kind) => BY_KIND[kind])])];
}

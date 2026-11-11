/**
 * What each view of Tema 6's lab shows, as data: the cycles' stops and stretches with their
 * transport markers, the road of a view, the scale of its energies and its readouts. In «Tramo»
 * the energies and the share recovered are the stretch's own (counted from its start, in kJ like
 * figure 6.3); in «Ciclo», the cycle's, as before (ruling R21).
 */
import { DRIVE_CYCLES, type CycleId } from '../../../lib/data/driveCycles';
import { formatNumber } from '../../../lib/format';
import type { BalanceStep } from '../../../lib/physics/energy';
import type { LabReadout } from '../../lab/LabShell';
import type { TransportMarker } from '../../lab/transportMarkers';
import type { EnergyScale } from './EnergyBars';
import type { RoadRange } from './RoadStrip';
import {
  balanceAt,
  energyAxisMax,
  J_PER_KJ,
  J_PER_KWH,
  KMH_PER_MS,
  W_PER_KW,
  type BalanceAt,
} from './regenScene';
import {
  balanceSince,
  brakingStretch,
  cycleStops,
  markersInStretch,
  stopMarkers,
  stretchAxisMax,
  type RegenView,
  type Stretch,
} from './regenStretch';

const CYCLE_IDS = Object.keys(DRIVE_CYCLES) as CycleId[];
/** One value per drive cycle, computed once. */
export const perCycle = <T>(value: (id: CycleId) => T) =>
  Object.fromEntries(CYCLE_IDS.map((id) => [id, value(id)])) as Readonly<Record<CycleId, T>>;

/** Each cycle's stops, derived from its samples (17 in the UDDS), and their transport markers. */
export const STOPS = perCycle((id) => cycleStops(DRIVE_CYCLES[id].samples));
const CYCLE_MARKERS = perCycle((id) => stopMarkers(STOPS[id]));
/** The stretch «Tramo» plays in each cycle (figure 6.3's in the UDDS) and the stops it holds. */
export const STRETCHES = perCycle((id) => brakingStretch(DRIVE_CYCLES[id].samples));
const STRETCH_MARKERS = perCycle((id) => markersInStretch(CYCLE_MARKERS[id], STRETCHES[id]));

const NO_MARKERS: readonly TransportMarker[] = [];

/**
 * The transport's events in a view: the stretch's stops on its own clock, or the cycle's. None in
 * «Conducir»: the stops are the cycle's car's, and the reader's own run has its timeline.
 */
export function viewMarkers(view: RegenView, cycle: CycleId): readonly TransportMarker[] {
  if (view === 'conducir') return NO_MARKERS;
  return (view === 'tramo' ? STRETCH_MARKERS : CYCLE_MARKERS)[cycle];
}

/** The road's ticks: every kilometre of the whole cycle, every 50 m of a stretch. */
const CYCLE_TICK_M = 1000;
const STRETCH_TICK_M = 50;
const CYCLE_ROAD_NOTE = 'no a escala';

/**
 * What the road stands for in a view: the whole cycle by kilometres, or the stretch by 50 m. A
 * stretch's road is to scale, the car is not: its note gives the length and says so.
 */
export function roadRange(
  view: RegenView,
  stretch: Stretch,
  steps: readonly BalanceStep[],
  distances: readonly number[],
): RoadRange {
  if (view === 'ciclo') {
    return {
      from: 0,
      to: distances[distances.length - 1],
      tickEvery: CYCLE_TICK_M,
      note: CYCLE_ROAD_NOTE,
    };
  }
  const from = balanceAt(steps, distances, stretch.start).distance;
  const to = balanceAt(steps, distances, stretch.end).distance;
  const length = formatNumber(to - from, { precision: 0, unit: 'm' });
  return { from, to, tickEvery: STRETCH_TICK_M, note: `${length} · auto no a escala` };
}

const KWH_PRECISION = 3;
const KJ_PRECISION = 1;
const SHARE_PRECISION = 1;
const PERCENT = 100;

/** The bars' scale: the cycle's in kWh (the energy plot's axis) or the stretch's in kJ. */
export function energyScale(
  view: RegenView,
  stretch: Stretch,
  steps: readonly BalanceStep[],
  distances: readonly number[],
): EnergyScale {
  if (view === 'ciclo') {
    const axisMax = energyAxisMax(steps);
    return {
      unit: 'kWh',
      joulesPerUnit: J_PER_KWH,
      precision: KWH_PRECISION,
      axisMax,
      scope: 'hasta t',
    };
  }
  const at = (t: number) => balanceAt(steps, distances, t);
  return {
    unit: 'kJ',
    joulesPerUnit: J_PER_KJ,
    precision: KJ_PRECISION,
    axisMax: stretchAxisMax(at(stretch.start), at(stretch.end)),
    scope: 'en el tramo, hasta t',
  };
}

/** The balance the readouts and the bars show: the cycle's, or the stretch's from its start. */
export function shownBalance(
  at: BalanceAt,
  view: RegenView,
  stretch: Stretch,
  steps: readonly BalanceStep[],
  distances: readonly number[],
): BalanceAt {
  return view === 'tramo' ? balanceSince(at, balanceAt(steps, distances, stretch.start)) : at;
}

/** What the energies of each view count: the stretch's, the cycle's or the reader's run. */
const READOUT_SCOPE: Readonly<Record<RegenView, string>> = {
  tramo: ' en el tramo',
  ciclo: '',
  conducir: ' en tu conducción',
};
const RECOVERED_LABEL: Readonly<Record<RegenView, string>> = {
  tramo: 'Recuperado en el tramo, % del frenado en las ruedas',
  ciclo: 'Recuperado en el ciclo, % de la tracción',
  conducir: 'Recuperado en tu conducción, % del frenado en las ruedas',
};

/**
 * The readouts: v and P at the instant, then E_batería, the conversion loss and E_fricción, and the
 * share recovered; in «Tramo» those are the stretch's and in «Conducir» the reader's run's, in kJ,
 * the share of its braking.
 */
export function readoutsFor(at: BalanceAt, view: RegenView): LabReadout[] {
  const isKj = view !== 'ciclo';
  const energy = (id: string, name: string, symbol: string, joules: number): LabReadout => ({
    id,
    label: `${name}${READOUT_SCOPE[view]} ${symbol}`,
    value: joules / (isKj ? J_PER_KJ : J_PER_KWH),
    unit: isKj ? 'kJ' : 'kWh',
    precision: isKj ? KJ_PRECISION : KWH_PRECISION,
  });
  return [
    { id: 'v', label: 'Velocidad v', value: at.v * KMH_PER_MS, unit: 'km/h' },
    { id: 'p', label: 'Potencia en las ruedas P', value: at.pWheel / W_PER_KW, unit: 'kW' },
    energy('battery', 'Energía a la batería', '$E_\\text{batería}$', at.eBattery),
    energy('loss', 'Pérdidas de conversión', '$E_\\text{conversión}$', at.eConversionLoss),
    energy('friction', 'Calor de fricción', '$E_\\text{fricción}$', at.eFriction),
    {
      id: 'recovered',
      label: RECOVERED_LABEL[view],
      value: at.recoveredShare * PERCENT,
      unit: '%',
      precision: SHARE_PRECISION,
    },
  ];
}

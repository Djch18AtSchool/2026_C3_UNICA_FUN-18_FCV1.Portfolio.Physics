/**
 * What the resonance lab reads out at the settled time, and the chips of its canvas notes. Every
 * readout is finite (Review Focus 3): what may grow without limit, the steady amplitude of (12.3)
 * without damping at resonance, is said in a chip («crece sin límite»), never printed as a number.
 */
import { MARCH_PACE_HZ, SETRA_RANGES } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { formatNumber } from '../../../lib/format';
import type { LabReadout } from '../../lab/labShellTypes';
import type { StatusChip } from '../../lab/StatusChips';
import type { ActiveModel } from './bridgeFrames';
import { envelopeAt, maxEnvelopeUntil } from './resonanceRun';
import { ZV_DESIGN_ZETA } from './resonanceScene';

export const UNBOUNDED = 'crece sin límite';
const MM_PER_M = 1000;
const N_PER_KN = 1000;
const PERCENT = 100;
const PRECISION = { ratio: 2, force: 1, mm: 1, times: 1, share: 3, percent: 1, t2: 3 } as const;

type ModeModel<M extends ActiveModel['mode']> = Extract<ActiveModel, { mode: M }>;

function sweepReadouts({ sweep }: ModeModel<'barrido'>, t: number): LabReadout[] {
  return [
    {
      id: 'drive',
      label: 'Frecuencia de la fuerza $f_d$',
      value: sweep.driveHzAt(t),
      unit: 'Hz',
    },
    {
      id: 'ratio',
      label: '$\\omega_d/\\omega_0$',
      value: sweep.ratioAt(t),
      unit: '',
      precision: PRECISION.ratio,
    },
    {
      id: 'amplitude',
      label: 'Amplitud medida $A/(F_0/k)$',
      value: envelopeAt(sweep.run, t),
      unit: '',
    },
    {
      id: 'peak',
      label: 'Pico medido hasta ahora',
      value: maxEnvelopeUntil(sweep.run, t),
      unit: '',
    },
  ];
}

function troopReadouts({ troop, step }: ModeModel<'tropa'>, t: number): LabReadout[] {
  const isInStep = step === 'al-paso';
  const run = isInStep ? troop.runs.inStep : troop.runs.breaking;
  const force = isInStep ? troop.forces.inStep : troop.forces.breaking;
  return [
    {
      id: 'force',
      label: 'Fuerza total $|F|$',
      value: force / N_PER_KN,
      unit: 'kN',
      precision: PRECISION.force,
    },
    {
      id: 'amplitude',
      label: 'Amplitud del tablero',
      value: envelopeAt(run, t) * MM_PER_M,
      unit: 'mm',
      precision: PRECISION.mm,
    },
    {
      id: 'ratio',
      label: 'Al paso / rompiendo el paso, este sorteo',
      value: troop.ratio,
      unit: '',
      precision: PRECISION.times,
    },
    {
      id: 'rms',
      label: 'En media cuadrática, $\\sqrt{N}$',
      value: troop.rmsRatio,
      unit: '',
      precision: PRECISION.times,
    },
  ];
}

function zvReadouts({ zv }: ModeModel<'filtro-zv'>): LabReadout[] {
  const [a1, a2] = zv.shaper.amplitudes;
  return [
    {
      id: 'residual',
      label: 'Vibración residual (estimación de Klipper)',
      value: zv.residual * PERCENT,
      unit: '%',
      precision: PRECISION.percent,
    },
    {
      id: 'detuning',
      label: 'Desajuste $f_0/f_\\text{ZV} - 1$',
      value: zv.detuning * PERCENT,
      unit: '%',
      precision: PRECISION.percent,
    },
    {
      id: 't2',
      label: 'Instante del segundo impulso $t_2$',
      value: zv.secondImpulse,
      unit: 's',
      precision: PRECISION.t2,
    },
    {
      id: 'a1',
      label: 'Fracción del primero $a_1$',
      value: a1,
      unit: '',
      precision: PRECISION.share,
    },
    {
      id: 'a2',
      label: 'Fracción del segundo $a_2$',
      value: a2,
      unit: '',
      precision: PRECISION.share,
    },
  ];
}

/** The readouts of the mode in view at the settled time t. */
export function resonanceReadouts(active: ActiveModel, t: number): LabReadout[] {
  if (active.mode === 'barrido') return sweepReadouts(active, t);
  if (active.mode === 'tropa') return troopReadouts(active, t);
  return zvReadouts(active);
}

export interface ChipRow {
  id: string;
  label: string;
  items: StatusChip[];
}

const n = (value: number, precision: number, unit?: string) =>
  formatNumber(value, { precision, unit });
/** A steady amplitude in mm, or «crece sin límite». */
const steadyText = (amplitude: number) =>
  Number.isFinite(amplitude) ? n(amplitude * MM_PER_M, PRECISION.mm, 'mm') : UNBOUNDED;

function sweepChips(active: ModeModel<'barrido'>): ChipRow[] {
  const { sweep } = active;
  const peak = Number.isFinite(sweep.peakGain)
    ? `$1/(2\\zeta)$ = ${n(sweep.peakGain, 2)}`
    : `sin amortiguamiento, ${UNBOUNDED}`;
  const rule = Number.isFinite(sweep.slowSeconds)
    ? `lento desde $T_b$ = ${n(sweep.slowSeconds, 0, 's')}: ${sweep.isSlow ? 'este lo es' : 'este es rápido'}`
    : 'sin amortiguamiento ninguno es lento';
  return [
    {
      id: 'sweep',
      label: 'Barrido',
      items: [
        { id: 'peak', text: `Pico de la (12.3): ${peak}` },
        { id: 'rule', text: rule },
      ],
    },
  ];
}

function troopChips(active: ModeModel<'tropa'>): ChipRow[] {
  const { troop } = active;
  const { min, max } = SETRA_RANGES.vertical;
  const where = troop.isInSetraRange ? 'dentro' : 'fuera';
  return [
    {
      id: 'steady',
      label: 'Amplitud estacionaria, (12.3)',
      items: [
        { id: 'in-step', text: `al paso: ${steadyText(troop.steady.inStep)}` },
        { id: 'breaking', text: `rompiendo el paso: ${steadyText(troop.steady.breaking)}` },
      ],
    },
    {
      id: 'setra',
      label: 'Sétra',
      items: [
        {
          id: 'range',
          text: `$f_0$ ${where} del rango de riesgo máximo, de ${n(min, 1)} a ${n(max, 1)} Hz; paso militar a ${n(MARCH_PACE_HZ, 1, 'Hz')}`,
        },
      ],
    },
  ];
}

function zvChips(active: ModeModel<'filtro-zv'>): ChipRow[] {
  const { zv } = active;
  const tolerance = n(KLIPPER.zvTolerance.value * PERCENT, 0);
  const within = zv.isWithinTolerance
    ? `dentro de ±${tolerance} %, donde Klipper promete dividir la vibración por ${KLIPPER.zvReduction.value}`
    : `fuera de ±${tolerance} %`;
  return [
    {
      id: 'klipper',
      label: 'Klipper',
      items: [
        {
          id: 'design',
          text: `filtro para $f_\\text{ZV}$ = ${n(zv.settings.fZv, 2, 'Hz')} con $\\zeta$ = ${n(ZV_DESIGN_ZETA, 1)}`,
        },
        { id: 'tolerance', text: `$f_0$ ${within}` },
      ],
    },
  ];
}

/** The canvas notes' chips: the model's verdicts the readouts cannot print. */
export function resonanceChips(active: ActiveModel): ChipRow[] {
  if (active.mode === 'barrido') return sweepChips(active);
  if (active.mode === 'tropa') return troopChips(active);
  return zvChips(active);
}

/**
 * What the resonance lab's canvas draws at a time of the clock: the mode in view as one model
 * (its run's length, time scale and events) and, at any t, the deck(s) as a share of the drawing's
 * room, clamped to it, plus what moves with them (the drive, the march, the pushes).
 */
import { MARCH_PACE_HZ } from '../../../lib/data/bridges';
import type { TransportMarker } from '../../lab/transportMarkers';
import type { ResonanceSettings } from './resonancePresets';
import { envelopeAt, xAt, type Run } from './resonanceRun';
import {
  sweepModel,
  toDrawing,
  troopModel,
  zvModel,
  type StepChoice,
  type SweepModel,
  type TroopModel,
  type ZvModel,
} from './resonanceScene';

const TWO_PI = 2 * Math.PI;
/** The footbridge's room on the drawing, ± 0,5 m: a fixed scale, so N and the step show. */
export const TROOP_DRAWING_FULL_M = 0.5;
/** A push's arrow stays this long (s of the clock) after it lands. */
export const PUSH_FLASH_S = 0.2;

interface Timing {
  duration: number;
  timeScale: number;
  markers: TransportMarker[];
}

export type ActiveModel = Timing &
  (
    | { mode: 'barrido'; sweep: SweepModel }
    | { mode: 'tropa'; troop: TroopModel; step: StepChoice }
    | { mode: 'filtro-zv'; zv: ZvModel }
  );

/** The model of the mode in view; the other modes are not computed. */
export function activeModel(settings: ResonanceSettings): ActiveModel {
  if (settings.mode === 'barrido') {
    const sweep = sweepModel(settings.sweep);
    const { duration, timeScale, markers } = sweep;
    return { mode: 'barrido', sweep, duration, timeScale, markers };
  }
  if (settings.mode === 'tropa') {
    const troop = troopModel(settings.troop);
    const { duration, markers } = troop;
    return { mode: 'tropa', troop, step: settings.troop.step, duration, timeScale: 1, markers };
  }
  const zv = zvModel(settings.zv);
  const { duration, markers } = zv;
  return { mode: 'filtro-zv', zv, duration, timeScale: 1, markers };
}

/** The value that fills the drawing's room: yMax, 0,5 m, or one push's amplitude. */
export function drawingFull(active: ActiveModel): number {
  if (active.mode === 'barrido') return active.sweep.yMax;
  return active.mode === 'tropa' ? TROOP_DRAWING_FULL_M : 1;
}

export type DeckId = 'puente' | 'un-empujon' | 'dos-empujones';

export interface DeckFrame {
  id: DeckId;
  /** x as a share of the room, in [−1, 1]. */
  fraction: number;
  /** The envelope as a share of the room, in [0, 1]. */
  envelope: number;
  /** x or its envelope passes the room and is drawn at its edge. */
  isClamped: boolean;
}

export interface PushFrame {
  deck: DeckId;
  /** The push's share of the whole one. */
  share: number;
  t: number;
  isActive: boolean;
}

export interface BridgeFrame {
  decks: DeckFrame[];
  /** «Barrido»: the drive's frequency now (Hz) and the force's share of F0, cos φ. */
  driveHz?: number;
  force?: number;
  /** «Tropa»: the march's phase now, 2π f t (rad). */
  marchPhase?: number;
  /** «Filtro ZV»: every push, and whether it is shown now. */
  pushes?: PushFrame[];
}

function deckAt(id: DeckId, run: Run, t: number, full: number): DeckFrame {
  const position = toDrawing(xAt(run, t), full);
  const envelope = toDrawing(envelopeAt(run, t), full);
  return {
    id,
    fraction: position.fraction,
    envelope: envelope.fraction,
    isClamped: position.isClamped || envelope.isClamped,
  };
}

function zvFrame(zv: ZvModel, t: number): BridgeFrame {
  const [a1, a2] = zv.shaper.amplitudes;
  const pushes = [
    { deck: 'un-empujon' as const, share: 1, t: 0 },
    { deck: 'dos-empujones' as const, share: a1, t: 0 },
    { deck: 'dos-empujones' as const, share: a2, t: zv.secondImpulse },
  ];
  return {
    decks: [
      deckAt('un-empujon', zv.runs.single, t, 1),
      deckAt('dos-empujones', zv.runs.shaped, t, 1),
    ],
    pushes: pushes.map((push) => ({
      ...push,
      isActive: t >= push.t && t < push.t + PUSH_FLASH_S,
    })),
  };
}

/** The drawing at time t of the clock. */
export function bridgeFrame(active: ActiveModel, t: number): BridgeFrame {
  if (active.mode === 'barrido') {
    const { sweep } = active;
    return {
      decks: [deckAt('puente', sweep.run, t, sweep.yMax)],
      driveHz: sweep.driveHzAt(t),
      force: sweep.forceShareAt(t),
    };
  }
  if (active.mode === 'tropa') {
    const { runs } = active.troop;
    const run = active.step === 'al-paso' ? runs.inStep : runs.breaking;
    return {
      decks: [deckAt('puente', run, t, TROOP_DRAWING_FULL_M)],
      marchPhase: TWO_PI * MARCH_PACE_HZ * t,
    };
  }
  return zvFrame(active.zv, t);
}

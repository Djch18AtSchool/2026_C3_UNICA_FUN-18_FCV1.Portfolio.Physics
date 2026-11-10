import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import InlineMath from '../../lab/InlineMath';
import StatusChips, { type StatusChip } from '../../lab/StatusChips';
import type { BallState } from '../../../lib/physics';
import { combineName } from './bounceLabSettings';
import type { BounceSettings } from './bouncePresets';
import { MAX_TIMELINE_S, pairRestitution, viewY, type BounceModel } from './bounceScene';

const CM_PER_M = 100;
/** Penetration below this (m) is not worth a note. */
const PENETRATION_NOTE_MIN = 5e-4;
/** ∞ in the InlineMath text of the summary rows. */
const INFINITY_SIGN = '$\\infty$';

const n = (value: number, precision: number, unit?: string) =>
  formatNumber(value, { precision, unit });

export interface SceneNotesInput {
  settings: BounceSettings;
  idealY: number;
  engine: BallState;
  top: number;
  speed: number;
  decimals: number;
}

/** What the scene shows that the reader should not take for physics, each said in words. */
export function sceneNotes({
  settings,
  idealY,
  engine,
  top,
  speed,
  decimals,
}: SceneNotesInput): string[] {
  // With e(v) on, both balls use the fit (≤ 0,79), whatever the stale constant e says.
  const isGaining = !settings.speedDependent && (settings.e > 1 || pairRestitution(settings) > 1);
  const highest = Math.max(idealY, engine.y);
  const isAbove = viewY(highest, top).clamp === 'above';
  const sunk = -engine.y;
  return [
    isGaining
      ? 'e > 1: cada bote devuelve más energía de la que recibe y la pelota gana energía; ningún material real lo hace.'
      : '',
    isAbove
      ? `La pelota sale del cuadro (va a ${n(highest, decimals, 'm')}): la dibujo en el borde superior.`
      : '',
    sunk >= PENETRATION_NOTE_MIN
      ? `El motor tiene la pelota ${n(sunk * CM_PER_M, 1, 'cm')} bajo el piso, una penetración que Baumgarte corrige de a poco y nunca del todo; la dibujo sobre el piso.`
      : '',
    settings.threshold === 0
      ? 'Umbral 0: el motor arma la restitución en cada contacto, por pequeño que sea, y la pelota nunca queda en reposo (microrrebotes que le impiden «dormir»).'
      : '',
    speed < 1 ? `Reproducción a ${n(speed, 2)}× (cámara lenta).` : '',
    speed > 1 ? `Reproducción a ${n(speed, 1)}×, más rápida que la real.` : '',
  ].filter(Boolean);
}

function Row({ term, children }: { term: string; children: string }): JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-dotted border-border pb-1.5">
      <dt className="text-sm text-fg-muted">
        <InlineMath text={term} />
      </dt>
      <dd className="m-0 text-sm tabular-nums">
        <InlineMath text={children} />
      </dd>
    </div>
  );
}

export interface BounceSummaryProps {
  settings: BounceSettings;
  model: BounceModel;
  decimals: number;
}

/**
 * The whole run in four rows: T of the ideal ball (∞ from e = 1), when and after how many rebounds
 * the engine rests, what its threshold predicts with exact events, and the pair e it mixes.
 */
export function BounceSummary({ settings: s, model, decimals }: BounceSummaryProps): JSX.Element {
  const { run, idealTime, prediction } = model;
  const seconds = (value: number) => n(value, decimals, 's');
  const lastFrame = run.frames[run.frames.length - 1];
  const idealRow = s.speedDependent
    ? `${Number.isFinite(idealTime) ? seconds(idealTime) : INFINITY_SIGN} (con e(v), suma de los vuelos)`
    : Number.isFinite(idealTime)
      ? `${seconds(idealTime)}, con infinitos rebotes`
      : `${INFINITY_SIGN}: nunca se detiene`;
  const engineRow = Number.isFinite(run.restTime)
    ? `en reposo a los ${seconds(run.restTime)}, tras ${lastFrame.bounces} rebotes`
    : `no queda en reposo en ${n(MAX_TIMELINE_S, 0, 's')}`;
  const predictionRow = !prediction
    ? 'sin umbral: rebota como la serie ideal'
    : Number.isFinite(prediction.bounces)
      ? `N = ${prediction.bounces} rebotes; el último sube ${n(prediction.lastApex * CM_PER_M, 1, 'cm')} y el siguiente contacto la deja quieta`
      : 'los impactos nunca bajan del umbral';
  const pairRow = s.speedDependent
    ? `e(v) del ajuste ilustrativo, mezclado con el suelo (${n(s.floorE, 3)}) por ${combineName(s.combine)}`
    : `${combineName(s.combine)}(${n(s.e, 3)}; ${n(s.floorE, 3)}) = ${n(pairRestitution(s), 3)}`;
  return (
    <dl data-testid="bounce-summary" className="m-0 flex flex-col gap-2">
      <Row term="T teórico, $t_0(1+e)/(1-e)$">{idealRow}</Row>
      <Row term="Motor de juego">{engineRow}</Row>
      <Row term="Umbral con eventos exactos">{predictionRow}</Row>
      <Row term="e del par en el motor">{pairRow}</Row>
    </dl>
  );
}

/** The engine's configuration as read-only chips (what the drawer sets; the presets change it). */
export function engineChips(s: BounceSettings): StatusChip[] {
  return [
    { id: 'step', text: `$\\Delta t$ = 1/${s.rate} s × ${s.substeps} subpasos` },
    { id: 'threshold', text: `umbral ${n(s.threshold, 2, 'm/s')}` },
    { id: 'rule', text: `regla ${combineName(s.combine)}` },
    { id: 'floor', text: `suelo $e$ = ${formatNumber(s.floorE, { precision: 2 })}` },
    { id: 'baumgarte', text: `$\\beta$ = ${formatNumber(s.baumgarte, { precision: 2 })}` },
  ];
}

export interface BounceNotesProps extends BounceSummaryProps {
  /** What the scene shows that is not physics (sceneNotes), each said in words. */
  notes: string[];
}

/**
 * What reads the bounce canvas without being a control, in the lab's canvas notes: the engine's
 * configuration, the notes on what is drawn and the four-row summary of the run.
 */
export default function BounceNotes({
  settings,
  model,
  notes,
  decimals,
}: BounceNotesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <StatusChips label="Motor" testId="engine-config" items={engineChips(settings)} />
      {notes.length > 0 ? (
        <ul data-testid="scene-notes" className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      <BounceSummary settings={settings} model={model} decimals={decimals} />
    </div>
  );
}

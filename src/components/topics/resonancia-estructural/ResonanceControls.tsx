/**
 * The resonance lab's levels and canvas notes: the three physical parameters of the mode in view
 * (level 1), the troop's step with «Nuevo sorteo» (level 2) and the chips and notes that read the
 * canvas.
 */
import type { JSX } from 'react';
import ChoiceField from '../../lab/ChoiceField';
import InlineMath from '../../lab/InlineMath';
import ParamField from '../../lab/ParamField';
import StatusChips from '../../lab/StatusChips';
import type { ActiveModel } from './bridgeFrames';
import { SCENE_NOTE } from './labTexts';
import { STEP_OPTIONS } from './resonanceLabSettings';
import { RESONANCE_LIMITS, type Limit, type ResonanceSettings } from './resonancePresets';
import { resonanceChips } from './resonanceReadouts';
import type { StepChoice, SweepSettings, TroopSettings, ZvSettings } from './resonanceScene';

const PERCENT = 100;
/** ζ in percent on the troop's slider (Sétra writes 0,4 %): its value is stored as a ratio. */
const PERCENT_DECIMALS = 6;

export interface ResonanceEdits {
  sweep(patch: Partial<SweepSettings>): void;
  troop(patch: Partial<TroopSettings>): void;
  zv(patch: Partial<ZvSettings>): void;
}

function Field({
  id,
  label,
  unit,
  limit,
  value,
  onChange,
  scale = 1,
}: {
  id: string;
  label: string;
  unit: string;
  limit: Limit;
  value: number;
  onChange(value: number): void;
  /** Shown value over stored value (100 for a ratio shown in %). */
  scale?: number;
}): JSX.Element {
  return (
    <ParamField
      id={id}
      label={label}
      unit={unit}
      min={limit.min * scale}
      max={limit.max * scale}
      step={limit.step * scale}
      value={Number((value * scale).toFixed(PERCENT_DECIMALS))}
      onChange={(shown) => onChange(Number((shown / scale).toFixed(PERCENT_DECIMALS)))}
    />
  );
}

/** Level 1: the mode's three parameters, two to a row. */
export function ResonanceParams({
  settings,
  edit,
}: {
  settings: ResonanceSettings;
  edit: ResonanceEdits;
}): JSX.Element {
  if (settings.mode === 'barrido') {
    const { sweep } = RESONANCE_LIMITS;
    return (
      <>
        <Field
          id="resonance-sweep-f0"
          label="Frecuencia natural $f_0$"
          unit="Hz"
          limit={sweep.f0}
          value={settings.sweep.f0}
          onChange={(f0) => edit.sweep({ f0 })}
        />
        <Field
          id="resonance-sweep-zeta"
          label="Amortiguamiento $\zeta$"
          unit=""
          limit={sweep.zeta}
          value={settings.sweep.zeta}
          onChange={(zeta) => edit.sweep({ zeta })}
        />
        <Field
          id="resonance-sweep-time"
          label="Duración del barrido $T_b$"
          unit="s"
          limit={sweep.sweepS}
          value={settings.sweep.sweepS}
          onChange={(sweepS) => edit.sweep({ sweepS })}
        />
      </>
    );
  }
  if (settings.mode === 'tropa') {
    const { troop } = RESONANCE_LIMITS;
    return (
      <>
        <Field
          id="resonance-troop-n"
          label="Soldados $N$"
          unit=""
          limit={troop.n}
          value={settings.troop.n}
          onChange={(n) => edit.troop({ n })}
        />
        <Field
          id="resonance-troop-f0"
          label="Frecuencia natural $f_0$"
          unit="Hz"
          limit={troop.f0}
          value={settings.troop.f0}
          onChange={(f0) => edit.troop({ f0 })}
        />
        <Field
          id="resonance-troop-zeta"
          label="Amortiguamiento $\zeta$"
          unit="%"
          limit={troop.zeta}
          scale={PERCENT}
          value={settings.troop.zeta}
          onChange={(zeta) => edit.troop({ zeta })}
        />
      </>
    );
  }
  const { zv } = RESONANCE_LIMITS;
  return (
    <>
      <Field
        id="resonance-zv-f0"
        label="Frecuencia natural $f_0$"
        unit="Hz"
        limit={zv.f0}
        value={settings.zv.f0}
        onChange={(f0) => edit.zv({ f0 })}
      />
      <Field
        id="resonance-zv-design"
        label="Frecuencia del filtro $f_\text{ZV}$"
        unit="Hz"
        limit={zv.fZv}
        value={settings.zv.fZv}
        onChange={(fZv) => edit.zv({ fZv })}
      />
      <Field
        id="resonance-zv-zeta"
        label="Amortiguamiento $\zeta$"
        unit=""
        limit={zv.zeta}
        value={settings.zv.zeta}
        onChange={(zeta) => edit.zv({ zeta })}
      />
    </>
  );
}

const DRAW_BUTTON =
  'min-h-10 shrink-0 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

/** Level 2 in «Tropa»: in step or breaking step, and another draw of the phases. */
export function StepChoiceRow({
  step,
  onStep,
  onNewDraw,
}: {
  step: StepChoice;
  onStep(step: StepChoice): void;
  onNewDraw(): void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
      <ChoiceField
        id="resonance-step"
        label="Paso"
        value={step}
        options={STEP_OPTIONS}
        onChange={onStep}
      />
      {step === 'rompiendo' ? (
        <button type="button" onClick={onNewDraw} className={DRAW_BUTTON}>
          Nuevo sorteo
        </button>
      ) : null}
    </div>
  );
}

/** The canvas notes: the model's verdicts as chips, then what the drawing shows. */
export function ResonanceNotes({ active }: { active: ActiveModel }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {resonanceChips(active).map((row) => (
        <StatusChips key={row.id} testId={`chips-${row.id}`} label={row.label} items={row.items} />
      ))}
      <p className="m-0 text-sm text-fg-muted">
        <InlineMath text={SCENE_NOTE[active.mode]} />
      </p>
    </div>
  );
}

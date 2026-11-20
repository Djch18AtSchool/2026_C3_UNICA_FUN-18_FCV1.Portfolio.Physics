import { useId, useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import {
  dampingRatio,
  naturalAngularFrequency,
  overshootRatio,
  type SpringParams,
} from '../../../lib/physics/dampedSpring';
import { CANVAS_INSET } from '../../lab/canvasInset';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import type { SettingOption } from '../../lab/SettingsDrawer';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import SpringCard from './SpringCard';
import { PARAM_STEP, SPRING_LAB_PRESETS, SPRING_LIMITS } from './springLabPresets';
import { INTERRUPT_HINT, INTERRUPT_WAIT_HINT, SPRING_USAGE } from './springLabText';
import SpringNotes from './SpringNotes';
import SpringPlot from './SpringPlot';
import { cardsAt, runMarkers, type SpringRun } from './springScene';
import { useSpringRun, type SpringRunControls } from './useSpringRun';

/** The playback speeds: 0,1× and 0,25× slow a stiff spring's overshoot down to watch it. */
export const SPRING_SPEEDS: readonly number[] = [0.1, 0.25, 0.5, 1, 2];
/** «,» and «.» move the clock by one frame at 60 Hz. */
const FRAME_STEP_S = 1 / 60;
const PERCENT = 100;
/** Keys that keep their native meaning: fields, buttons and anything inside the drawer. */
const NATIVE_KEYS_SELECTOR = 'input, select, textarea, button, a, dialog';
const ACTION_BUTTON =
  'min-h-10 self-start rounded-base border border-border bg-bg px-3 text-sm font-medium text-fg hover:border-accent disabled:cursor-not-allowed disabled:opacity-50';
const HINT = `m-0 text-sm text-fg-muted ${CANVAS_INSET}`;

export interface SpringLabProps {
  /** «Cómo se usa», after the lab's own lines: the playback speed, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», written in the topic's MDX so it travels with its text. */
  leftOut?: string;
}

interface Display {
  showComparison: boolean;
  showBand: boolean;
}

const INITIAL_DISPLAY: Display = { showComparison: true, showBand: true };

/** Every readout with its own fixed decimals: ζ to the thousandth, positions to 0,1 px. */
function springReadouts(run: SpringRun, t: number, showComparison: boolean): LabReadout[] {
  const { spring, bezier } = cardsAt(run, t);
  const zeta = dampingRatio(run.params);
  return [
    { id: 'zeta', label: 'Razón de amortiguamiento $\\zeta$', value: zeta, unit: '', precision: 3 },
    {
      id: 'omega',
      label: 'Frecuencia natural $\\omega_0$',
      value: naturalAngularFrequency(run.params),
      unit: 'rad/s',
      precision: 2,
    },
    {
      id: 'overshoot',
      label: 'Sobrepaso previsto $M_p$',
      value: overshootRatio(zeta) * PERCENT,
      unit: '%',
      precision: 2,
    },
    {
      id: 'target',
      label: 'Destino $x_\\text{obj}$',
      value: spring.target,
      unit: 'px',
      precision: 0,
    },
    { id: 'x', label: 'Posición del resorte $x$', value: spring.x, unit: 'px', precision: 1 },
    { id: 'v', label: 'Velocidad del resorte $v$', value: spring.v, unit: 'px/s', precision: 0 },
    ...(showComparison
      ? [
          {
            id: 'x-curve',
            label: 'Posición de la curva $x$',
            value: bezier.x,
            unit: 'px',
            precision: 1,
          },
          {
            id: 'v-curve',
            label: 'Velocidad de la curva $v$',
            value: bezier.v,
            unit: 'px/s',
            precision: 0,
          },
        ]
      : []),
  ];
}

/**
 * «Interrumpir» and the line under it: what it does, or why it waits. Both sentences share one
 * grid cell, the hidden one invisible, so the line keeps its height when it changes.
 */
function InterruptAction({ lab }: { lab: SpringRunControls }): JSX.Element {
  const hintId = useId();
  const [shown, hidden] = lab.canInterrupt
    ? [INTERRUPT_HINT, INTERRUPT_WAIT_HINT]
    : [INTERRUPT_WAIT_HINT, INTERRUPT_HINT];
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={lab.interrupt}
        disabled={!lab.canInterrupt}
        aria-describedby={hintId}
        className={ACTION_BUTTON}
      >
        Interrumpir
      </button>
      <div className="grid">
        <p id={hintId} data-testid="interrupt-hint" className={`${HINT} [grid-area:1/1]`}>
          {shown}
        </p>
        <p aria-hidden="true" className={`${HINT} invisible [grid-area:1/1]`}>
          {hidden}
        </p>
      </div>
    </div>
  );
}

/** k, b and m, two to a row, on the 0,1 grid. */
function SpringParamsFields({ lab }: { lab: SpringRunControls }): JSX.Element {
  const fields: [keyof SpringParams, string, string][] = [
    ['k', 'Rigidez $k$', 'N/m'],
    ['b', 'Amortiguamiento $b$', 'N·s/m'],
    ['m', 'Masa $m$', 'kg'],
  ];
  return (
    <>
      {fields.map(([key, label, unit]) => (
        <ParamField
          key={key}
          id={`spring-${key}`}
          label={label}
          unit={unit}
          min={SPRING_LIMITS[key][0]}
          max={SPRING_LIMITS[key][1]}
          step={PARAM_STEP}
          value={lab.params[key]}
          onChange={(next) => lab.edit({ [key]: next })}
        />
      ))}
    </>
  );
}

/** The drawer's options: the comparison card and the band, on by default. */
function displayOptions(display: Display, onChange: (patch: Partial<Display>) => void) {
  const options: SettingOption[] = [
    {
      key: 'comparison',
      kind: 'toggle',
      label: 'Tarjeta con la curva de duración fija',
      value: display.showComparison,
      onChange: (showComparison) => onChange({ showComparison }),
    },
    {
      key: 'band',
      kind: 'toggle',
      label: 'Banda de ±2 % alrededor del destino',
      value: display.showBand,
      onChange: (showBand) => onChange({ showBand }),
    },
  ];
  return options;
}

/** Space or K plays and pauses, I interrupts, R rewinds, «,» and «.» step a frame. */
function shortcutHandler(lab: SpringRunControls) {
  const { clock } = lab;
  const actions: Record<string, () => void> = {
    ' ': clock.toggle,
    k: clock.toggle,
    i: () => (lab.canInterrupt ? lab.interrupt() : undefined),
    r: clock.reset,
    '.': () => clock.step(FRAME_STEP_S),
    ',': () => clock.step(-FRAME_STEP_S),
  };
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element).closest(NATIVE_KEYS_SELECTOR)) return;
    const action = actions[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };
}

/**
 * Tema 10's laboratory, the topic's prescribed simulation: a card moved by a damped spring between
 * two marks, with k, b and m as its parameters, and under it a card moved by a fixed-duration
 * ease-in-out curve over the same travel. «Interrumpir» swaps the target at the clock's time: the
 * spring keeps x and v (10.9), the curve restarts from rest. The clock, the timeline, its events
 * (peak, settling, presses), the x(t) plot, the presets, the drawer and the keys are the house's.
 */
export default function SpringLab({ usage, leftOut }: SpringLabProps): JSX.Element {
  const lab = useSpringRun();
  const [display, setDisplay] = useState<Display>(INITIAL_DISPLAY);
  const { clock, run } = lab;
  const t = clock.state.t;
  const markers = useMemo(() => runMarkers(run), [run]);
  const scenario = (
    <>
      <InterruptAction lab={lab} />
      <LabPresets
        id="spring-preset"
        presets={SPRING_LAB_PRESETS}
        activeId={lab.presetId}
        onSelect={lab.choosePreset}
      />
    </>
  );
  return (
    <div onKeyDown={shortcutHandler(lab)}>
      <LabShell
        title="Laboratorio del resorte"
        testId="spring-lab"
        clock={clock}
        timeUnit="s"
        speeds={SPRING_SPEEDS}
        markers={markers}
        readouts={springReadouts(run, t, display.showComparison)}
        levels={{
          params: <SpringParamsFields lab={lab} />,
          scenario,
          display: displayOptions(display, (patch) => setDisplay((old) => ({ ...old, ...patch }))),
        }}
        charts={<SpringPlot run={run} t={t} frame={clock.frame} {...display} onSeek={clock.seek} />}
        canvasNotes={<SpringNotes run={run} {...display} />}
        notes={{
          usage: [...SPRING_USAGE, ...(usage ? [usage] : [])],
          leftOut: leftOut ? [leftOut] : [],
        }}
        onReset={lab.reset}
      >
        <div className="relative">
          <SpringCard run={run} frame={clock.frame} t={t} {...display} />
          <TimeScaleBadge clock={clock} />
        </div>
      </LabShell>
    </div>
  );
}

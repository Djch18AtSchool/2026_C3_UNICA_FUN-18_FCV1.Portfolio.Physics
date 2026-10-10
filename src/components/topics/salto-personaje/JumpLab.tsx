import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import { DEFAULT_JUMP_PRESET_ID, JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { formatNumber } from '../../../lib/format';
import { clampSettings } from '../../../lib/limits';
import { G_EARTH } from '../../../lib/physics';
import Presets, { type Preset } from '../../controls/Presets';
import { snapTo } from '../../lab/dragMath';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import { KNOB_HIT_RADIUS } from '../../lab/OverlayMarks';
import ParamField from '../../lab/ParamField';
import type { Domain } from '../../lab/plotScales';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import JumpDesigner from './JumpDesigner';
import { DEFAULT_DISPLAY, jumpLocalSettings, type JumpDisplay } from './jumpLabSettings';
import {
  computeJump,
  computeJumpEuler,
  EULER_DT,
  JUMP_DEFAULTS,
  JUMP_LIMITS,
  type JumpResult,
  type JumpSettings,
} from './jumpModel';
import JumpOverlay, { type LaunchSpeeds } from './JumpOverlay';
import { launchLengthPerMs, sceneDomains } from './jumpScene';
import { worldForGravity, worldForPreset } from './jumpWorlds';

type JumpKey = keyof JumpSettings;
type Domains = { x: Domain; y: Domain };

/** Slider steps; a dragged handle snaps to them too, so the fields never show float noise. */
const STEPS: Record<JumpKey, number> = { v0: 0.1, g: 0.01, vx: 0.05, fallMultiplier: 0.1 };
const SNAP_DECIMALS = 2;
/** The Earth reference wears Tierra's conventional color, dashed. */
const EARTH_COLOR = worldForPreset('tierra').color;

const FIELD_NAMES: Record<JumpKey, string> = {
  v0: 'impulso v₀',
  g: 'gravedad g',
  vx: 'velocidad horizontal vₓ',
  fallMultiplier: 'multiplicador de caída',
};

const EULER_FOOTNOTE = `Integrador: Euler semi-implícito con paso fijo Δt = 1/${Math.round(1 / EULER_DT)} s; las lecturas salen de la trayectoria muestreada.`;

interface JumpState {
  settings: JumpSettings;
  presetId?: string;
  clamped: JumpKey[];
}

const INITIAL_STATE: JumpState = {
  settings: JUMP_DEFAULTS,
  presetId: DEFAULT_JUMP_PRESET_ID,
  clamped: [],
};

const snap = (value: number, key: JumpKey) =>
  Number(snapTo(value, STEPS[key]).toFixed(SNAP_DECIMALS));

const toXY = (result: JumpResult) => result.points.map(({ x, y }) => ({ x, y }));

function describePlot(live: JumpResult, ghost: JumpResult | undefined): string {
  const m = (value: number) => formatNumber(value, { unit: 'm' });
  const own = `Trayectoria y(x): altura máxima ${m(live.hMax)}, alcance ${m(live.range)}`;
  return ghost
    ? `${own}; referencia terrestre: altura máxima ${m(ghost.hMax)}, alcance ${m(ghost.range)}.`
    : `${own}.`;
}

/**
 * Tema 2's laboratory on the v2 shell: the jump plotted in metres with equal aspect, the Earth
 * reference, a trail and the velocity at t, a draggable marker that scrubs t and a draggable
 * launch vector that sets v₀ and vₓ. The clock lasts the live jump's air time; any change to the
 * trajectory rewinds it. "Diseñar el salto" sits below, compact.
 */
export interface JumpLabProps {
  /** The model's caveats, written in the topic's MDX so they travel with its text. */
  footnote?: string;
}

export default function JumpLab({ footnote }: JumpLabProps): JSX.Element {
  const [state, setState] = useState<JumpState>(INITIAL_STATE);
  const [display, setDisplay] = useState<JumpDisplay>(DEFAULT_DISPLAY);
  /** The plot window held still while the launch vector is dragged, so the handle maps stably. */
  const [heldDomains, setHeldDomains] = useState<Domains | null>(null);
  const { decimals } = useGlobalSettings();
  const { settings, presetId, clamped } = state;

  const live = useMemo(
    () => (display.integrator === 'euler' ? computeJumpEuler(settings) : computeJump(settings)),
    [settings, display.integrator],
  );
  const ghost = useMemo(
    () => computeJump({ v0: settings.v0, vx: settings.vx, g: G_EARTH, fallMultiplier: 1 }),
    [settings.v0, settings.vx],
  );
  const shownGhost = display.showGhost ? ghost : undefined;
  // The window frames the live jump; a much larger Earth reference may run off the plot.
  const fitted = useMemo(() => sceneDomains([live]), [live]);
  const domains = heldDomains ?? fitted;
  const lengthPerMs = launchLengthPerMs(domains.y, JUMP_LIMITS);

  const clock = useSimClock(live.tAir);
  const { reset: rewind } = clock;
  useEffect(() => rewind(), [live, rewind]);

  const setField = (key: JumpKey, value: number) =>
    setState({ settings: { ...settings, [key]: value }, clamped: [] });

  // Presets and the designer may ask for values the sliders cannot show; clamp and say so.
  const applyValues = (values: JumpSettings, id?: string) => {
    const result = clampSettings<Record<JumpKey, number>>(values, JUMP_LIMITS);
    setState({ settings: result.values, presetId: id, clamped: result.clamped });
  };

  const onLaunchChange = ({ v0, vx }: LaunchSpeeds) =>
    setState((previous) => ({
      settings: { ...previous.settings, v0: snap(v0, 'v0'), vx: snap(vx, 'vx') },
      clamped: [],
    }));

  const onLaunchDragPhase = useCallback(
    (phase: 'start' | 'end') => setHeldDomains(phase === 'start' ? fitted : null),
    [fitted],
  );

  const world = worldForGravity(settings.g);
  const gravityText = (g: number) => formatNumber(g, { precision: decimals, unit: 'm/s²' });
  const series: PlotSeries[] = [
    ...(shownGhost
      ? [
          {
            id: 'ghost',
            label: `Referencia terrestre, g = ${gravityText(G_EARTH)}`,
            points: toXY(shownGhost),
            color: EARTH_COLOR,
            dashed: true,
          },
        ]
      : []),
    {
      id: 'live',
      label: `${world.name}, g = ${gravityText(settings.g)}`,
      points: toXY(live),
      color: world.color,
    },
  ];

  const readouts: LabReadout[] = [
    { id: 'hMax', label: 'Altura máxima', value: live.hMax, unit: 'm' },
    { id: 'tApex', label: 'Tiempo al ápice', value: live.tApex, unit: 's' },
    { id: 'tAir', label: 'Tiempo en el aire', value: live.tAir, unit: 's' },
    { id: 'range', label: 'Alcance', value: live.range, unit: 'm' },
  ];

  const localSettings = jumpLocalSettings({
    display,
    onDisplayChange: setDisplay,
    fallMultiplier: settings.fallMultiplier,
    onFallMultiplierChange: (k) => setField('fallMultiplier', k),
    clock,
  });

  const params = (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ParamField
          id="jump-v0"
          label="Impulso de salto v₀"
          unit="m/s"
          min={JUMP_LIMITS.v0[0]}
          max={JUMP_LIMITS.v0[1]}
          step={STEPS.v0}
          value={settings.v0}
          onChange={(value) => setField('v0', value)}
        />
        <ParamField
          id="jump-g"
          label="Gravedad g"
          unit="m/s²"
          min={JUMP_LIMITS.g[0]}
          max={JUMP_LIMITS.g[1]}
          step={STEPS.g}
          value={settings.g}
          onChange={(value) => setField('g', value)}
        />
      </div>
      <Presets
        presets={JUMP_PRESETS}
        activeId={presetId}
        onSelect={(preset: Preset<JumpSettings>) => applyValues(preset.values, preset.id)}
      />
      {clamped.length > 0 ? (
        <p data-testid="clamp-note" role="status" className="m-0 text-sm">
          {`Valores ajustados al rango de los controles: ${clamped.map((key) => FIELD_NAMES[key]).join(', ')}.`}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <LabShell
        title="Laboratorio del salto"
        clock={clock}
        readouts={readouts}
        params={params}
        localSettings={localSettings}
        onReset={() => setState(INITIAL_STATE)}
        footnote={
          display.integrator === 'euler'
            ? [EULER_FOOTNOTE, footnote].filter(Boolean).join(' ')
            : footnote
        }
        testId="jump-lab"
      >
        <SvgPlot
          title="Trayectoria del salto"
          xLabel="x"
          xUnit="m"
          yLabel="y"
          yUnit="m"
          series={series}
          xDomain={domains.x}
          yDomain={domains.y}
          equalAspect
          // The marker starts on the origin, at the plot's corner: keep its knob whole.
          overlayBleed={KNOB_HIT_RADIUS}
          ariaLabel={describePlot(live, shownGhost)}
          testId="jump-plot"
          overlay={(scales) => (
            <JumpOverlay
              scales={scales}
              plotClipPath={scales.plotClipPath}
              settings={settings}
              live={live}
              t={clock.state.t}
              lengthPerMs={lengthPerMs}
              color={world.color}
              showTrail={display.showTrail}
              showVelocity={display.showVelocity}
              decimals={decimals}
              onLaunchChange={onLaunchChange}
              onLaunchDragPhase={onLaunchDragPhase}
              onSeek={clock.seek}
            />
          )}
        />
      </LabShell>
      <JumpDesigner current={settings} onApply={(values) => applyValues(values)} />
    </div>
  );
}

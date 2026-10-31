import { useCallback, useEffect, useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import { bounceLocalSettings, combineName, MODE_OPTIONS, type LabMode } from './bounceLabSettings';
import { BounceSummary, sceneNotes } from './BounceNotes';
import BouncePlots from './BouncePlots';
import {
  BOUNCE_DEFAULTS,
  BOUNCE_LIMITS,
  BOUNCE_PRESETS,
  DEFAULT_PRESET_ID,
  PRESET_GROUPS,
  presetById,
  SPEED_FIT,
  type BounceSettings,
} from './bouncePresets';
import BounceScene from './BounceScene';
import {
  buildBounceModel,
  engineEnergy,
  engineFrameAt,
  firstRebound,
  idealEnergyAt,
  idealStateAt,
  measuredRestitution,
  sceneTop,
} from './bounceScene';
import { CollisionParams, CollisionScene, collisionReadouts } from './CollisionMode';
import {
  COLLISION_DEFAULTS,
  COLLISION_DURATION_S,
  collisionOutcome,
  type CollisionSettings,
} from './collisionScene';

const g = G_EARTH;
/** Thousandths, so the FIBA (0,767) and FIFA (0,851) centres sit on the grid. */
const E_STEP = 0.001;
const H0_STEP = 0.01;
const MEASURED_PRECISION = 3;
const COLLISION_FRAME_S = 1 / 60;
const [E_MIN, E_MAX] = BOUNCE_LIMITS.e;
const [H0_MIN, H0_MAX] = BOUNCE_LIMITS.h0;
/** Where e > 1 starts on the 0–1,2 scale (%). */
const GAIN_ZONE_START = (1 / E_MAX) * 100;

interface BounceState {
  settings: BounceSettings;
  /** The preset the settings still equal; undefined once anything was edited. */
  presetId?: string;
  /** The last preset chosen, whose note stays visible (marked as modified) after edits. */
  basedOn: string;
}

const INITIAL_STATE: BounceState = {
  settings: BOUNCE_DEFAULTS,
  presetId: DEFAULT_PRESET_ID,
  basedOn: DEFAULT_PRESET_ID,
};

/** Keys that must keep their native meaning: fields, buttons and anything inside the drawer. */
const NATIVE_KEYS_SELECTOR = 'input, select, textarea, button, a, dialog';

function ModeToggle({ mode, onChange }: { mode: LabMode; onChange(mode: LabMode): void }) {
  return (
    <div role="group" aria-label="Modo" className="flex flex-wrap gap-2">
      {MODE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className="min-h-11 rounded-base border border-border px-3 text-sm font-medium transition-colors hover:border-fg-muted aria-pressed:border-accent aria-pressed:bg-accent/10"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The 0–1,2 scale of e with its "gana energía" zone above 1 and a mark at the current e. */
function GainZone({ e }: { e: number }) {
  const at = (Math.min(Math.max(e, E_MIN), E_MAX) / E_MAX) * 100;
  return (
    <div data-testid="e-zone" aria-hidden="true" className="mx-2 flex flex-col gap-1">
      <div className="relative h-2 rounded-base border border-border">
        <div
          className="absolute inset-y-0 right-0"
          style={{
            left: `${GAIN_ZONE_START}%`,
            background: 'color-mix(in srgb, var(--chart-2) 35%, transparent)',
          }}
        />
        <div className="absolute -inset-y-1 w-0.5 bg-fg" style={{ left: `${at}%` }} />
      </div>
      <div className="relative h-4 font-mono text-xs text-fg-muted">
        <span className="absolute left-0">0</span>
        <span className="absolute right-0">e &gt; 1: gana energía</span>
      </div>
    </div>
  );
}

function PresetPicker({
  state,
  onSelect,
}: {
  state: BounceState;
  onSelect(id: string): void;
}): JSX.Element {
  const based = presetById(state.basedOn);
  const isModified = state.presetId === undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <label htmlFor="bounce-preset" className="text-sm font-medium">
          Preajuste
        </label>
        <select
          id="bounce-preset"
          value={state.presetId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
          className="min-h-11 max-w-full min-w-0 rounded-base border border-border bg-bg-elevated px-3 text-sm text-fg"
        >
          <option value="" disabled>
            Personalizado
          </option>
          {PRESET_GROUPS.map(({ group, label }) => (
            <optgroup key={group} label={label}>
              {BOUNCE_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <p data-testid="preset-note" className="m-0 text-sm text-fg-muted">
        {`${isModified ? `Partí de «${based.name}» y cambié algún valor. ` : ''}${based.note ?? ''}`}
        {based.sourceLabel ? (
          <span className="mt-1 block text-xs">{`Fuente: ${based.sourceLabel}`}</span>
        ) : null}
      </p>
    </div>
  );
}

export interface BounceLabProps {
  /** The model's caveats, written in the topic's MDX so they travel with its text. */
  footnote?: string;
}

/**
 * Tema 7's laboratory, the topic's prescribed simulation: the same ball dropped twice from h₀,
 * "Física ideal" (exact events, idealBallAt) beside "Motor de juego" (engineStep at Δt with
 * substeps, threshold, mixing rule, Baumgarte and optional e(v)), with e (0–1,2) and h₀ as main
 * controls, presets in two groups, synchronized y(t) and E(t) plots and the "Choque de dos
 * cuerpos" mode. Any change rewinds the clock: a new drop.
 */
export default function BounceLab({ footnote }: BounceLabProps): JSX.Element {
  const [state, setState] = useState<BounceState>(INITIAL_STATE);
  const [mode, setMode] = useState<LabMode>('bounce');
  const [collision, setCollision] = useState<CollisionSettings>(COLLISION_DEFAULTS);
  /** The scene's scale held still while h₀ is dragged, so the handle maps stably. */
  const [heldTop, setHeldTop] = useState<number | null>(null);
  const { decimals } = useGlobalSettings();
  const { settings } = state;

  const model = useMemo(() => buildBounceModel(settings, g), [settings]);
  const outcome = useMemo(() => collisionOutcome(collision), [collision]);
  const clock = useSimClock(mode === 'bounce' ? model.duration : COLLISION_DURATION_S);
  const { reset: rewind } = clock;
  useEffect(() => rewind(), [settings, collision, mode, rewind]);

  const t = clock.state.t;
  const top = heldTop ?? sceneTop(settings.h0);
  const ideal = idealStateAt(settings, g, t);
  const engine = engineFrameAt(model.run, t);
  const frameStep = mode === 'bounce' ? model.run.dt : COLLISION_FRAME_S;
  /** Both balls at any time, for the scene's moving layer. */
  const ballsAt = useCallback(
    (time: number) => {
      const frame = engineFrameAt(model.run, time);
      return {
        ideal: idealStateAt(settings, g, time),
        engine: { y: frame.y, isResting: frame.resting },
      };
    },
    [model, settings],
  );
  const live = useMemo(() => ({ frame: clock.frame, ballsAt }), [clock.frame, ballsAt]);

  const edit = (patch: Partial<BounceSettings>) =>
    setState((previous) => ({
      ...previous,
      settings: { ...previous.settings, ...patch },
      presetId: undefined,
    }));
  const choosePreset = (id: string) => {
    if (!id) return;
    setState({ settings: presetById(id).values, presetId: id, basedOn: id });
  };
  const onH0DragPhase = useCallback(
    (phase: 'start' | 'end') => setHeldTop(phase === 'start' ? sceneTop(settings.h0) : null),
    [settings.h0],
  );
  const onReset = () => {
    setState(INITIAL_STATE);
    setMode('bounce');
    setCollision(COLLISION_DEFAULTS);
    clock.reset();
  };

  const onShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element).closest(NATIVE_KEYS_SELECTOR)) return;
    const actions: Record<string, () => void> = {
      ' ': clock.toggle,
      k: clock.toggle,
      r: clock.reset,
      '.': () => clock.step(frameStep),
      ',': () => clock.step(-frameStep),
    };
    const action = actions[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const bounceReadouts: LabReadout[] = [
    { id: 'h1', label: 'Primer rebote h₁ (motor)', value: firstRebound(model.run), unit: 'm' },
    {
      id: 'measured',
      label: 'e medido √(h₁/h₀) (motor)',
      value: measuredRestitution(model.run),
      unit: '',
      precision: MEASURED_PRECISION,
    },
    { id: 'bounces', label: 'Rebotes del motor', value: engine.bounces, unit: '', precision: 0 },
    {
      id: 'ideal-energy',
      label: 'E/E₀ ideal',
      value: idealEnergyAt(model.impacts, t, settings.h0, g),
      unit: '',
    },
    {
      id: 'engine-energy',
      label: 'E/E₀ del motor',
      value: engineEnergy(engine, settings.h0, g),
      unit: '',
    },
  ];

  const notes = sceneNotes({
    settings,
    idealY: ideal.y,
    engine,
    top,
    speed: clock.state.speed,
    decimals,
  });
  const engineConfig = `Motor: Δt = 1/${settings.rate} s × ${settings.substeps} subpasos · umbral ${formatNumber(settings.threshold, { precision: 2, unit: 'm/s' })} · regla ${combineName(settings.combine)}, suelo e = ${formatNumber(settings.floorE, { precision: 2 })} · β = ${formatNumber(settings.baumgarte, { precision: 2 })}`;

  const bounceParams = (
    <>
      <PresetPicker state={state} onSelect={choosePreset} />
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {settings.speedDependent ? (
          <p data-testid="speed-fit" className="m-0 text-sm">
            {`e(v) = ${formatNumber(SPEED_FIT.e0, { precision: 2 })} − ${formatNumber(SPEED_FIT.k, { precision: 3 })}·|v| (s/m), recortado a [0, 1]: ajuste ilustrativo a Cross (1999). Desactívalo en los ajustes para volver a un e fijo.`}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <ParamField
              id="bounce-e"
              label="Coeficiente de restitución e"
              unit=""
              min={E_MIN}
              max={E_MAX}
              step={E_STEP}
              value={settings.e}
              onChange={(e) => edit({ e })}
            />
            <GainZone e={settings.e} />
          </div>
        )}
        <ParamField
          id="bounce-h0"
          label="Altura de suelta h₀"
          unit="m"
          min={H0_MIN}
          max={H0_MAX}
          step={H0_STEP}
          value={settings.h0}
          onChange={(h0) => edit({ h0 })}
        />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Arrastra la manija h₀ de la escena, o enfócala y muévela con las flechas (5 cm; con Mayús,
        25 cm). El motor (Δt, subpasos, umbral, regla de combinación, e del suelo, Baumgarte y e(v))
        se ajusta en el engranaje. Atajos, fuera de los campos: Espacio o K reproduce y pausa; R
        reinicia; «,» y «.» retroceden o avanzan un paso Δt del motor.
      </p>
    </>
  );

  const isBounce = mode === 'bounce';
  return (
    <div className="flex flex-col gap-4" onKeyDown={onShortcut}>
      <LabShell
        title="Laboratorio del rebote"
        clock={clock}
        readouts={isBounce ? bounceReadouts : collisionReadouts(collision, outcome)}
        params={
          <>
            <ModeToggle mode={mode} onChange={setMode} />
            {isBounce ? (
              bounceParams
            ) : (
              <CollisionParams
                settings={collision}
                outcome={outcome}
                onChange={(patch) => setCollision((previous) => ({ ...previous, ...patch }))}
              />
            )}
          </>
        }
        localSettings={bounceLocalSettings({
          mode,
          onModeChange: setMode,
          settings,
          onSettingsChange: edit,
          clock,
        })}
        onReset={onReset}
        footnote={footnote}
        testId="bounce-lab"
      >
        {isBounce ? (
          <div className="flex flex-col gap-3">
            <BounceScene
              h0={settings.h0}
              top={top}
              ball={settings.ball}
              ideal={ideal}
              engine={{ y: engine.y, isResting: engine.resting }}
              live={live}
              engineSubtitle={`Δt\u00a0=\u00a01/${settings.rate}\u00a0s ×\u00a0${settings.substeps}`}
              decimals={decimals}
              onH0Change={(h0) => edit({ h0 })}
              onH0DragPhase={onH0DragPhase}
            />
            <p data-testid="engine-config" className="m-0 px-3 text-xs text-fg-muted sm:px-0">
              {engineConfig}
            </p>
            {notes.length > 0 ? (
              <ul
                data-testid="scene-notes"
                className="m-0 flex list-disc flex-col gap-1 px-3 pl-8 text-sm sm:pr-0 sm:pl-5"
              >
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
            <BounceSummary settings={settings} model={model} decimals={decimals} />
          </div>
        ) : (
          <CollisionScene
            settings={collision}
            outcome={outcome}
            frame={clock.frame}
            decimals={decimals}
          />
        )}
      </LabShell>
      {isBounce ? (
        <BouncePlots
          model={model}
          t={t}
          frame={clock.frame}
          decimals={decimals}
          onSeek={clock.seek}
        />
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState, type JSX } from 'react';
import { JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics';
import LabPresets from '../../lab/LabPresets';
import LabShell from '../../lab/LabShell';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import JumpCanvas from './JumpCanvas';
import JumpDesigner from './JumpDesigner';
import { DEFAULT_DISPLAY, jumpLocalSettings, type JumpDisplay } from './jumpLabSettings';
import { describePlot, jumpReadouts, jumpSeries } from './jumpLabView';
import { computeJump, computeJumpEuler, EULER_DT, type JumpSettings } from './jumpModel';
import { V0_KEY_STEP, VX_KEY_STEP } from './JumpOverlay';
import JumpParams from './JumpParams';
import { stateAt } from './jumpScene';
import { worldForGravity } from './jumpWorlds';
import { launchTipMetres } from './jumpZoom';
import { useJumpFraming, useJumpState } from './useJumpState';
import { useRevealOnKey } from './useRevealOnKey';

/** A key step in m/s with exactly its own decimals: «0,5 m/s», «0,25 m/s». */
const stepText = (step: number) =>
  formatNumber(step, { precision: String(step).split('.')[1]?.length ?? 0, unit: 'm/s' });
/** «Cómo se usa»: the two handles on the plot, by pointer and by keys (JumpOverlay's steps). */
const DRAG_HINT = `Arrastra la punta del vector de lanzamiento $\\vec v_0$, o enfócala y muévela con las flechas: arriba y abajo cambian $v_0$ (${stepText(V0_KEY_STEP)}) y los lados, $v_x$ (${stepText(VX_KEY_STEP)}). El punto sobre la curva recorre el salto: arrástralo, o enfócalo y usa las flechas, Inicio y Fin.`;

/**
 * «Cómo se usa»: the zoom of the plot, after the handles' drag. The arrows are velocities, so they
 * do not grow with it; the framing of a new jump (a preset, the designer, «Restablecer») starts over.
 */
const ZOOM_HINT =
  'Acerca la gráfica con los botones, Ctrl y la rueda, o pellizcando; arrastra el fondo para desplazarla. Enfocada desde el teclado, + y − acercan y alejan, 0 ajusta y las flechas desplazan (y la rueda sola también acerca). Las flechas de $\\vec v_0$ y $\\vec v$ no crecen al acercar. «Ajustar» encuadra el salto entero, igual que elegir otro preajuste o «Restablecer».';

const EULER_NOTE = `Integrador: Euler semi-implícito con paso fijo Δt = 1/${Math.round(1 / EULER_DT)} s; las lecturas salen de la trayectoria muestreada.`;

/**
 * Tema 2's laboratory on LabShell: the jump plotted in metres with equal aspect, the Earth
 * reference, a trail and the velocity at t, a draggable marker that scrubs t and a draggable
 * launch vector that sets v₀ and vₓ. The clock lasts the live jump's air time; any change to the
 * trajectory rewinds it. "Diseñar el salto" sits below, compact.
 */
export interface JumpLabProps {
  /** «Cómo se usa», written in the topic's MDX so it travels with its text. */
  usage?: string;
  /** «Qué deja fuera el modelo», after the integrator's line: the caveats, from the topic's MDX. */
  leftOut?: string;
}

export default function JumpLab({ usage, leftOut }: JumpLabProps): JSX.Element {
  const [display, setDisplay] = useState<JumpDisplay>(DEFAULT_DISPLAY);
  const { decimals } = useGlobalSettings();
  const { settings, presetId, clamped, setField, applyValues, onLaunchChange, reset } =
    useJumpState();

  const live = useMemo(
    () => (display.integrator === 'euler' ? computeJumpEuler(settings) : computeJump(settings)),
    [settings, display.integrator],
  );
  const ghost = useMemo(
    () => computeJump({ v0: settings.v0, vx: settings.vx, g: G_EARTH, fallMultiplier: 1 }),
    [settings.v0, settings.vx],
  );
  const shownGhost = display.showGhost ? ghost : undefined;
  const { jumpZoom, lengthPerMs, onLaunchDragPhase } = useJumpFraming(live);
  const { fit: refitZoom } = jumpZoom.zoom;
  // A new jump (a preset, the designer, «Restablecer») starts over at the whole framing.
  const applyAndRefit = (values: JumpSettings, id?: string) => {
    applyValues(values, id);
    refitZoom();
  };

  const clock = useSimClock(live.tAir);
  const { reset: rewind } = clock;
  useEffect(() => rewind(), [live, rewind]);
  // After useJumpZoom's effects (the view is final), a key that moved a handle brings it into view.
  const { onKeyMove, onKeyDone } = useRevealOnKey({
    jumpZoom,
    launch: launchTipMetres(settings, lengthPerMs),
    marker: stateAt(live, clock.state.t),
  });

  const localSettings = jumpLocalSettings({
    display,
    onDisplayChange: setDisplay,
    fallMultiplier: settings.fallMultiplier,
    onFallMultiplierChange: (k) => setField('fallMultiplier', k),
    clock,
  });

  const params = <JumpParams settings={settings} clamped={clamped} onField={setField} />;

  const scenario = (
    <LabPresets
      id="jump-preset"
      presets={JUMP_PRESETS}
      activeId={presetId}
      onSelect={(preset) => applyAndRefit(preset.values, preset.id)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <LabShell
        title="Laboratorio del salto"
        clock={clock}
        readouts={jumpReadouts(live)}
        levels={{ params, scenario, display: localSettings }}
        notes={{
          usage: [DRAG_HINT, ZOOM_HINT, ...(usage ? [usage] : [])],
          leftOut: [
            ...(display.integrator === 'euler' ? [EULER_NOTE] : []),
            ...(leftOut ? [leftOut] : []),
          ],
        }}
        onReset={() => {
          reset();
          refitZoom();
        }}
        testId="jump-lab"
      >
        <JumpCanvas
          jumpZoom={jumpZoom}
          series={jumpSeries(settings, live, shownGhost, decimals)}
          ariaLabel={describePlot(live, shownGhost)}
          overlay={{
            settings,
            live,
            t: clock.state.t,
            frame: clock.frame,
            lengthPerMs,
            color: worldForGravity(settings.g).color,
            showTrail: display.showTrail,
            showVelocity: display.showVelocity,
            decimals,
            onLaunchChange,
            onLaunchDragPhase,
            onSeek: clock.seek,
            onKeyMove,
            onKeyDone,
          }}
        />
      </LabShell>
      <JumpDesigner current={settings} onApply={(values) => applyAndRefit(values)} />
    </div>
  );
}

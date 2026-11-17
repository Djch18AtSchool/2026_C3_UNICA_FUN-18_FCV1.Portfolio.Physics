/**
 * The frame every laboratory renders inside (auditoría §4 and §12.1). A lab declares its three
 * levels and LabShell places them:
 *
 *   <LabShell
 *     title="Laboratorio del sobrevuelo (modelo plano)"
 *     testId="flyby-lab"
 *     clock={clock}
 *     readouts={readouts}
 *     onReset={onReset}
 *     canvasNotes={<FlybyNotes … />}
 *     levels={{
 *       params: <RpField … />,                                    // 1: physical parameters
 *       scenario: <LabPresets id="flyby-preset" presets={…} … />, // 2: scenario and presets
 *       display: flybyLocalSettings(…),                           // 3: the settings drawer
 *     }}
 *     notes={{ usage: [DRAG_HINT, usage], leftOut: [leftOut] }}
 *   >
 *     <FlybyScene … />
 *   </LabShell>
 *
 * One card, one column at every width (Dylan 2026-11-16: the scene is never smaller than the
 * article column gives it): the title and the gear; the scene, then the transport in one row; the
 * control deck (level 1 «Parámetros», two to a row, then level 2 «Escenario» with «Restablecer»),
 * always in sight under the scene, with no titles or box of its own (the regions keep their names
 * for screen readers); «Lecturas», four to a row; the support plots (`charts`, «escena
 * primero»); the canvas notes; and «Cómo se usa» and «Qué deja fuera el modelo» at the end. The
 * order of the DOM is the order of reading and of the layout. Nothing sticks to the window. The
 * shell owns only whether the drawer is open; the simulation state belongs to the laboratory.
 */
import { useCallback, useId, useRef, type JSX, type ReactNode, type RefObject } from 'react';
import Readout from '../controls/Readout';
import { CANVAS_BLEED } from './canvasInset';
import {
  LAB_CANVAS_NOTES,
  LAB_CARD,
  LAB_CHARTS,
  LAB_DISCLOSURES,
  LAB_PANEL,
  LAB_PARAMS,
  LAB_READOUTS,
  LAB_SCENARIO,
  LAB_STAGE,
} from './labShellClasses';
import LabNotes from './LabNotes';
import LabPresets from './LabPresets';
import { LabResetContext, ResetButton, scenarioHolds } from './labReset';
import { GearButton, ReadoutAnnouncer, useLabDrawer, type LabDrawer } from './labShellParts';
import { PresetTransitionContext, playPresetTransition } from './presetTransition';
import { useMotionReduced } from './useMotionReduced';
import type { LabLevels, LabReadout, LabShellProps } from './labShellTypes';
import SettingsDrawer from './SettingsDrawer';
import TransportBar from './TransportBar';

export { READOUT_ANNOUNCE_DELAY_MS } from './labShellParts';
export type { LabLevels, LabReadout, LabShellProps } from './labShellTypes';

interface SectionProps {
  level: 'params' | 'scenario' | 'readouts';
  /** The region's name, said by screen readers and not shown: the deck has no titles. */
  title: string;
  className: string;
  children: ReactNode;
}

/** A level of the panel: a region named by a heading only screen readers see. */
function Section({ level, title, className, children }: SectionProps): JSX.Element {
  const headingId = `${useId()}-heading`;
  return (
    <section aria-labelledby={headingId} data-lab-level={level} className={className}>
      <h3 id={headingId} className="sr-only">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * One row: the title and the gear that opens the drawer. Nothing else: the speed is the
 * transport's and the scenario sits under the parameters, so no chip repeats a setting here.
 */
function Header({ title, drawer }: { title: string; drawer: LabDrawer }) {
  return (
    <div className="flex flex-nowrap items-center gap-3">
      <span id={drawer.titleId} className="min-w-0 grow text-sm font-semibold">
        {title}
      </span>
      <GearButton drawer={drawer} />
    </div>
  );
}

/**
 * Level 2 and «Restablecer»: LabPresets carries it at the end of its row when it stands at the
 * scenario's top (labReset.tsx); otherwise it closes the scenario's last row here. A lab without
 * a scenario keeps it alone, at the end of the parameters (Panel).
 */
function Scenario({ scenario, onReset }: { scenario: ReactNode; onReset(): void }) {
  const carried = scenarioHolds(scenario, LabPresets);
  return (
    <Section level="scenario" title="Escenario" className={LAB_SCENARIO}>
      {carried ? (
        <LabResetContext value={onReset}>{scenario}</LabResetContext>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-(--lab-flow)">
          <div className="flex min-w-0 flex-col gap-(--lab-flow)">{scenario}</div>
          <ResetButton onReset={onReset} />
        </div>
      )}
    </Section>
  );
}

interface PanelProps {
  levels: LabLevels;
  readouts: readonly LabReadout[];
  onReset(): void;
}

/** The control deck (parameters, scenario and «Restablecer») and the readouts, in the page's flow. */
function Panel({ levels, readouts, onReset }: PanelProps): JSX.Element {
  return (
    <div data-lab-panel="" className={LAB_PANEL}>
      <Section level="params" title="Parámetros" className={LAB_PARAMS}>
        {levels.params}
        {levels.scenario ? null : (
          <div className="col-span-full justify-self-end">
            <ResetButton onReset={onReset} />
          </div>
        )}
      </Section>
      {levels.scenario ? <Scenario scenario={levels.scenario} onReset={onReset} /> : null}
      {readouts.length > 0 ? (
        <Section level="readouts" title="Lecturas" className={LAB_READOUTS}>
          {readouts.map((readout) => (
            <Readout key={readout.id} layout="cell" {...readout} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}

/** What LabShell passes on to the transport: the clock and how it is read. */
type TransportProps = Pick<
  LabShellProps,
  'clock' | 'timeUnit' | 'markers' | 'timeOrigin' | 'formatTime' | 'speeds'
>;

/** The stage: the canvas, at the column's full width, then the transport when there is a clock. */
function Stage({
  clock,
  children,
  canvasRef,
  ...reading
}: TransportProps &
  Pick<LabShellProps, 'children'> & { canvasRef: RefObject<HTMLDivElement | null> }): JSX.Element {
  return (
    <div data-lab-stage="" className={LAB_STAGE}>
      <div ref={canvasRef} data-lab-canvas="" className={CANVAS_BLEED}>
        {children}
      </div>
      {clock ? (
        <div data-lab-transport="">
          <TransportBar clock={clock} {...reading} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The preset transition on this lab's canvas (presetTransition.ts), for LabPresets: a stable
 * callback that reads reduced motion when it plays, so the context never changes.
 */
function usePresetTransition(canvasRef: RefObject<HTMLDivElement | null>, isReduced: boolean) {
  const isReducedRef = useRef(isReduced);
  isReducedRef.current = isReduced;
  return useCallback(() => {
    playPresetTransition(canvasRef.current, isReducedRef.current);
  }, [canvasRef]);
}

/** The lab's reset as a stable callback: LabPresets, memoized, never re-renders for a new one. */
function useStableReset(onReset: () => void): () => void {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  return useCallback(() => onResetRef.current(), []);
}

/** What the announcer says while a view speaks for itself (announceReadouts false). */
const NO_READOUTS: readonly LabReadout[] = Object.freeze([]);

export default function LabShell({
  title,
  readouts,
  announceReadouts = true,
  levels,
  charts,
  canvasNotes,
  notes,
  onReset,
  testId,
  children,
  ...transport
}: LabShellProps): JSX.Element {
  const drawer = useLabDrawer();
  const canvasRef = useRef<HTMLDivElement>(null);
  const playTransition = usePresetTransition(canvasRef, useMotionReduced());
  const reset = useStableReset(onReset);
  return (
    <div
      role="group"
      aria-labelledby={drawer.titleId}
      data-testid={testId}
      data-lab-shell="tiered"
      data-playing={transport.clock?.state.playing ?? false}
      className={LAB_CARD}
    >
      <Header title={title} drawer={drawer} />
      <Stage {...transport} canvasRef={canvasRef}>
        {children}
      </Stage>
      <PresetTransitionContext value={playTransition}>
        <Panel levels={levels} readouts={readouts} onReset={reset} />
      </PresetTransitionContext>
      {charts ? (
        <div data-lab-charts="" className={`${LAB_CHARTS} ${CANVAS_BLEED}`}>
          {charts}
        </div>
      ) : null}
      {canvasNotes ? (
        <div data-lab-canvas-notes="" className={LAB_CANVAS_NOTES}>
          {canvasNotes}
        </div>
      ) : null}
      <div className={LAB_DISCLOSURES}>
        <LabNotes {...notes} />
      </div>
      <ReadoutAnnouncer readouts={announceReadouts ? readouts : NO_READOUTS} />
      <SettingsDrawer
        id={drawer.drawerId}
        open={drawer.isOpen}
        onClose={drawer.close}
        returnFocusTo={drawer.openerRef}
        title={`Ajustes: ${title}`}
        local={levels.display}
      />
    </div>
  );
}

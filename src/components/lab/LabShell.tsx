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
 *       display: flybyLocalSettings(…),                           // 3: drawer, chips by the gear
 *     }}
 *     notes={{ usage: [DRAG_HINT, usage], leftOut: [leftOut] }}
 *   >
 *     <FlybyScene … />
 *   </LabShell>
 *
 * One card: the title with the chip row and the gear; the stage (canvas, then transport); the
 * panel (level 1 «Parámetros» with «Restablecer», level 2 «Escenario», «Lecturas» in two narrow
 * columns); the canvas notes; and «Cómo se usa» and «Qué deja fuera el modelo» at the end. The
 * order of the DOM is the order of reading and of the layout, in one column and in two. In two
 * columns (the lab-split variant, global.css: lg and a lab 42rem wide) the stage and the 20rem
 * panel sit side by side: the panel flows with the page, and the stage sticks under the topic bar
 * while it fits the window (a taller one flows too, its transport pinned at the window's bottom);
 * the canvas notes take the row under both, the disclosures follow. The shell owns only whether
 * the drawer is open; the simulation state belongs to the laboratory.
 */
import { useId, type JSX, type ReactNode } from 'react';
import Readout from '../controls/Readout';
import { useFitsInWindow } from '../hooks/useFitsInWindow';
import { CANVAS_BLEED } from './canvasInset';
import {
  LAB_CANVAS_NOTES,
  LAB_CARD,
  LAB_COLUMNS,
  LAB_PANEL,
  LAB_PANEL_CELL,
  LAB_LEVEL_IN_COLUMNS,
  LAB_STAGE_CELL,
  LAB_STAGE_TOP,
} from './labShellClasses';
import InlineMath from './InlineMath';
import LabNotes from './LabNotes';
import { GearButton, ReadoutAnnouncer, useLabDrawer, type LabDrawer } from './labShellParts';
import type { LabLevels, LabReadout, LabShellProps } from './labShellTypes';
import SettingsDrawer from './SettingsDrawer';
import { settingChips } from './settingChips';
import TransportBar from './TransportBar';

export { READOUT_ANNOUNCE_DELAY_MS } from './labShellParts';
export type { LabLevels, LabReadout, LabShellProps } from './labShellTypes';

/**
 * The stage sticks only while it fits the window under the topic bar: data-lab-stage-fits is
 * "true" or "false" once measured (absent on the server, so nothing sticks before). The sticky
 * top is the CSS variable the fit is measured against (LAB_STAGE_TOP): Tailwind needs the class
 * literal, and LabShell.layout.test checks that it names the same variable.
 */
export const STAGE =
  'flex flex-col gap-4 lab-split:data-[lab-stage-fits=true]:sticky lab-split:data-[lab-stage-fits=true]:top-(--topic-bar-clearance)';
/**
 * Over a stage taller than the window, the transport waits at the window's bottom. Its height (the
 * 44 px buttons of TransportBar, py-3 and the 1 px rule; a second row with events) is copied once,
 * in --lab-transport-room and --lab-transport-room-events (global.css, which also switches the
 * stage to the second): change them together (lab-shell.spec.ts and time-scale.spec.ts fail when
 * they drift).
 */
const TRANSPORT =
  'lab-split:sticky lab-split:bottom-0 lab-split:z-10 lab-split:border-t lab-split:border-border lab-split:bg-bg-elevated lab-split:py-3';
/**
 * In a narrow lab the canvas bleeds into the card's padding (canvasInset.ts). In two columns,
 * whatever in it takes focus keeps the pinned transport's room below it (WCAG 2.4.11):
 * scroll-margin on its own descendants, so nothing is reserved where the transport cannot pin
 * (one column, or below lg).
 */
const CANVAS = `${CANVAS_BLEED} lab-split:**:scroll-mb-[calc(var(--lab-transport-room)+0.5rem)]`;
const CHIP =
  'inline-flex min-h-8 items-center whitespace-nowrap rounded-base border border-border bg-bg px-2 text-xs font-medium text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';
const RESET =
  'min-h-10 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

interface SectionProps {
  level: 'params' | 'scenario' | 'readouts';
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A level of the panel: a region named by its heading. */
function Section({ level, title, action, className = '', children }: SectionProps): JSX.Element {
  const headingId = `${useId()}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      data-lab-level={level}
      className={`flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h3 id={headingId} className="m-0 text-sm font-semibold">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Title, the chips of the active display settings and the gear; chips and gear open the drawer. */
function Header({
  title,
  drawer,
  display,
}: { title: string; drawer: LabDrawer } & Pick<LabLevels, 'display'>) {
  const chips = settingChips(display);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id={drawer.titleId} className="max-w-full grow text-sm font-semibold">
        {title}
      </span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {chips.length > 0 ? (
          <div
            role="group"
            aria-label="Ajustes activos"
            className="flex flex-wrap justify-end gap-2"
          >
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-label={chip.name}
                aria-haspopup="dialog"
                aria-expanded={drawer.isOpen}
                aria-controls={drawer.drawerId}
                onClick={(event) => drawer.open(event.currentTarget)}
                className={CHIP}
              >
                {/* One inline run: as flex items, the text after a formula would lose its space. */}
                <span>
                  <InlineMath text={chip.text} />
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <GearButton drawer={drawer} />
      </div>
    </div>
  );
}

interface PanelProps {
  levels: LabLevels;
  readouts: readonly LabReadout[];
  onReset(): void;
}

/** The three levels, in the page's flow. */
function Panel({ levels, readouts, onReset }: PanelProps): JSX.Element {
  return (
    <div data-lab-panel="" className={LAB_PANEL}>
      <Section
        level="params"
        title="Parámetros"
        className={LAB_LEVEL_IN_COLUMNS}
        action={
          <button type="button" onClick={onReset} className={RESET}>
            Restablecer
          </button>
        }
      >
        {levels.params}
      </Section>
      {levels.scenario ? (
        <Section level="scenario" title="Escenario" className={LAB_LEVEL_IN_COLUMNS}>
          {levels.scenario}
        </Section>
      ) : null}
      {readouts.length > 0 ? (
        <Section level="readouts" title="Lecturas" className={LAB_LEVEL_IN_COLUMNS}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {readouts.map((readout) => (
              <Readout key={readout.id} layout="cell" {...readout} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

/** The stage, in its cell: the canvas, then the transport when the lab has a clock. */
type TransportProps = Pick<
  LabShellProps,
  'clock' | 'timeUnit' | 'markers' | 'timeOrigin' | 'formatTime'
>;

function Stage({
  clock,
  children,
  ...reading
}: TransportProps & Pick<LabShellProps, 'children'>): JSX.Element {
  const [ref, fits] = useFitsInWindow<HTMLDivElement>(`var(${LAB_STAGE_TOP})`);
  return (
    <div className={LAB_STAGE_CELL}>
      <div
        ref={ref}
        data-lab-stage=""
        data-lab-stage-fits={fits === undefined ? undefined : String(fits)}
        className={STAGE}
      >
        <div data-lab-canvas="" className={CANVAS}>
          {children}
        </div>
        {clock ? (
          <div data-lab-transport="" className={TRANSPORT}>
            <TransportBar clock={clock} {...reading} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LabShell({
  title,
  readouts,
  levels,
  canvasNotes,
  notes,
  onReset,
  testId,
  children,
  ...transport
}: LabShellProps): JSX.Element {
  const drawer = useLabDrawer();
  return (
    <div
      role="group"
      aria-labelledby={drawer.titleId}
      data-testid={testId}
      data-lab-shell="tiered"
      data-playing={transport.clock?.state.playing ?? false}
      className={LAB_CARD}
    >
      <Header title={title} drawer={drawer} display={levels.display} />
      <div data-lab-columns="" className={LAB_COLUMNS}>
        <Stage {...transport}>{children}</Stage>
        <div className={LAB_PANEL_CELL}>
          <Panel levels={levels} readouts={readouts} onReset={onReset} />
        </div>
        {canvasNotes ? (
          <div data-lab-canvas-notes="" className={LAB_CANVAS_NOTES}>
            {canvasNotes}
          </div>
        ) : null}
      </div>
      <LabNotes {...notes} />
      <ReadoutAnnouncer readouts={readouts} />
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

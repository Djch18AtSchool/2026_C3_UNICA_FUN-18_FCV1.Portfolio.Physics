/**
 * LabShell's tiered layout (auditoría §4 and §12.1). One card: the title with the chip row and the
 * gear; the stage (canvas, then transport); the panel (level 1 «Parámetros» with «Restablecer»,
 * level 2 «Escenario», «Lecturas» in two narrow columns); the canvas notes; and «Cómo se usa» and
 * «Qué deja fuera el modelo» at the end. In two columns (the lab-split variant, global.css: lg and
 * a lab 42rem wide) the stage and the panel sit side by side, each sticking under the topic bar in
 * its own cell, the panel 20rem wide, never taller than the window and scrolling on its own (then
 * a named, focusable region), and a stage taller than the window keeps its transport at the
 * window's bottom; the canvas notes take the row under both, the disclosures follow. In one column
 * the order is canvas, transport, canvas notes, levels, readouts, disclosures.
 */
import { useId, type JSX, type ReactNode } from 'react';
import Readout from '../controls/Readout';
import { useOverflowsY } from '../hooks/useOverflowsY';
import InlineMath from './InlineMath';
import LabNotes from './LabNotes';
import { GearButton, ReadoutAnnouncer, useLabDrawer, type LabDrawer } from './labShellParts';
import type { LabLevels, LabReadout, TieredLabShellProps } from './labShellTypes';
import SettingsDrawer from './SettingsDrawer';
import { settingChips } from './settingChips';
import TransportBar from './TransportBar';

/** Inside a figure the frame lends its border (content.css); alone the card draws its own. */
const ROOT =
  '@container/lab flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4 in-[.figure-frame]:border-0';
/** Row 1: stage and panel cells; row 2: the canvas notes across both. */
const COLUMNS =
  'flex flex-col gap-6 lab-split:grid lab-split:grid-cols-[minmax(0,1fr)_20rem] lab-split:grid-rows-[auto_auto]';
/** Each cell spans row 1 only, so what sticks inside it never slides over the canvas notes. */
const STAGE_CELL = 'min-w-0 lab-split:col-start-1 lab-split:row-start-1';
const PANEL_CELL = 'min-w-0 lab-split:col-start-2 lab-split:row-start-1';
const CANVAS_NOTES = 'min-w-0 lab-split:col-span-2 lab-split:row-start-2';
const STAGE = 'flex flex-col gap-4 lab-split:sticky lab-split:top-(--topic-bar-clearance)';
/**
 * Its 0,25rem padding keeps focus rings unclipped, so it sits 0,25rem higher and wider to line
 * its content up with the stage's; its edges shade while it hides content (scroll-cue-y).
 */
const PANEL =
  'flex flex-col gap-6 lab-split:sticky lab-split:top-[calc(var(--topic-bar-clearance)-0.25rem)] lab-split:-m-1 lab-split:max-h-[calc(100dvh-var(--topic-bar-clearance)-1rem)] lab-split:overflow-y-auto lab-split:p-1 lab-split:scroll-cue-y lab-split:[scrollbar-width:thin]';
/** Over a stage taller than the window, the transport waits at the window's bottom. */
const TRANSPORT =
  'lab-split:sticky lab-split:bottom-0 lab-split:z-10 lab-split:border-t lab-split:border-border lab-split:bg-bg-elevated lab-split:py-3';
const CHIP =
  'inline-flex min-h-8 items-center whitespace-nowrap rounded-base border border-border bg-bg px-2 text-xs font-medium text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';
const RESET =
  'min-h-10 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';
const PANEL_NAME = 'Controles del laboratorio';

interface SectionProps {
  level: 'params' | 'scenario' | 'readouts';
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

/** A level of the panel: a region named by its heading. */
function Section({ level, title, action, children }: SectionProps): JSX.Element {
  const headingId = `${useId()}-heading`;
  return (
    <section aria-labelledby={headingId} data-lab-level={level} className="flex flex-col gap-4">
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
                <InlineMath text={chip.text} />
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

/** The three levels. Scrolling on its own, it is a named stop of the tab order (WCAG 2.1.1). */
function Panel({ levels, readouts, onReset }: PanelProps): JSX.Element {
  const [ref, overflows] = useOverflowsY<HTMLDivElement>();
  const scrollable = overflows
    ? ({ role: 'region', 'aria-label': PANEL_NAME, tabIndex: 0 } as const)
    : {};
  return (
    <div ref={ref} data-lab-panel="" className={PANEL} {...scrollable}>
      <Section
        level="params"
        title="Parámetros"
        action={
          <button type="button" onClick={onReset} className={RESET}>
            Restablecer
          </button>
        }
      >
        {levels.params}
      </Section>
      {levels.scenario ? (
        <Section level="scenario" title="Escenario">
          {levels.scenario}
        </Section>
      ) : null}
      {readouts.length > 0 ? (
        <Section level="readouts" title="Lecturas">
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

export default function TieredLabShell({
  title,
  clock,
  timeUnit,
  readouts,
  levels,
  canvasNotes,
  notes,
  onReset,
  testId,
  children,
}: TieredLabShellProps): JSX.Element {
  const drawer = useLabDrawer();
  return (
    <div
      role="group"
      aria-labelledby={drawer.titleId}
      data-testid={testId}
      data-lab-shell="tiered"
      data-playing={clock?.state.playing ?? false}
      className={ROOT}
    >
      <Header title={title} drawer={drawer} display={levels.display} />
      <div data-lab-columns="" className={COLUMNS}>
        <div className={STAGE_CELL}>
          <div data-lab-stage="" className={STAGE}>
            {/* On phones the canvas bleeds into the card's padding so the plot keeps its width. */}
            <div data-lab-canvas="" className="-mx-3 sm:mx-0">
              {children}
            </div>
            {clock ? (
              <div data-lab-transport="" className={TRANSPORT}>
                <TransportBar clock={clock} timeUnit={timeUnit} />
              </div>
            ) : null}
          </div>
        </div>
        {canvasNotes ? (
          <div data-lab-canvas-notes="" className={CANVAS_NOTES}>
            {canvasNotes}
          </div>
        ) : null}
        <div className={PANEL_CELL}>
          <Panel levels={levels} readouts={readouts} onReset={onReset} />
        </div>
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

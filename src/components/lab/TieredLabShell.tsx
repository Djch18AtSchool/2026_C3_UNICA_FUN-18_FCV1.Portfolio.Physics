/**
 * LabShell's tiered layout (auditoría §4 and §12.1). One card: the title with the chip row and the
 * gear; under it the stage (canvas, then transport) and the panel (level 1 «Parámetros» with
 * «Restablecer», level 2 «Escenario», «Lecturas» in two narrow columns, then «Cómo se usa» and
 * «Qué deja fuera el modelo»). Once the lab is 42rem wide (@2xl of its own container, not of the
 * viewport: the lab sits in the article column) stage and panel are two columns: the panel is
 * 20rem wide, never taller than the window and scrolls on its own; both stick under the topic bar
 * while the page scrolls, and when the stage is taller than the window its transport sticks to the
 * window's bottom instead. Narrower, the order is canvas, transport, levels, readouts, notes.
 */
import { useId, type JSX, type ReactNode } from 'react';
import Readout from '../controls/Readout';
import InlineMath from './InlineMath';
import LabNotes from './LabNotes';
import { GearButton, ReadoutAnnouncer, useLabDrawer, type LabDrawer } from './labShellParts';
import type { LabLevels, TieredLabShellProps } from './labShellTypes';
import SettingsDrawer from './SettingsDrawer';
import { settingChips } from './settingChips';
import TransportBar from './TransportBar';

const ROOT =
  '@container/lab flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4';
const COLUMNS =
  'flex flex-col gap-6 @2xl/lab:grid @2xl/lab:grid-cols-[minmax(0,1fr)_20rem] @2xl/lab:items-start';
/**
 * Sticks under the topic bar (4rem). The panel's 0,25rem padding keeps focus rings unclipped (its
 * top is 0,25rem higher so its content lines up with the stage's), and its edges shade while it
 * hides content above or below (scroll-cue-y).
 */
const STAGE = 'flex min-w-0 flex-col gap-4 @2xl/lab:sticky @2xl/lab:top-16';
const PANEL =
  'flex min-w-0 flex-col gap-6 @2xl/lab:sticky @2xl/lab:top-15 @2xl/lab:-m-1 @2xl/lab:max-h-[calc(100dvh-5rem)] @2xl/lab:overflow-y-auto @2xl/lab:p-1 @2xl/lab:scroll-cue-y @2xl/lab:[scrollbar-width:thin]';
/** Over a stage taller than the window, the transport waits at the window's bottom. */
const TRANSPORT =
  '@2xl/lab:sticky @2xl/lab:bottom-0 @2xl/lab:z-10 @2xl/lab:border-t @2xl/lab:border-border @2xl/lab:bg-bg-elevated @2xl/lab:py-3';
const CHIP =
  'inline-flex min-h-8 items-center whitespace-nowrap rounded-base border border-border bg-bg px-2 text-xs font-medium text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';
const RESET =
  'min-h-10 rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

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

export default function TieredLabShell({
  title,
  clock,
  timeUnit,
  readouts,
  levels,
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
        <div data-lab-panel="" className={PANEL}>
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
          <LabNotes {...notes} />
        </div>
      </div>
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

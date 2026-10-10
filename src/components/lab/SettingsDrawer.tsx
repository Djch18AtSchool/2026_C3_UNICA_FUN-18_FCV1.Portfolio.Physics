import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import GlobalSettingsTab from './GlobalSettingsTab';
import { ICON_BUTTON } from './iconButton';
import LocalSettingsTab from './LocalSettingsTab';

export type SettingOption =
  | { key: string; label: string; kind: 'toggle'; value: boolean; onChange(v: boolean): void }
  | {
      key: string;
      label: string;
      kind: 'select';
      value: string;
      options: { value: string; label: string }[];
      onChange(v: string): void;
    }
  | {
      key: string;
      label: string;
      kind: 'range';
      value: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
      onChange(v: number): void;
    };

export interface SettingsDrawerProps {
  open: boolean;
  onClose(): void;
  title: string;
  local: SettingOption[];
  /** Id of the <dialog>, so an opener can point aria-controls at it; generated when omitted. */
  id?: string;
  /**
   * Element that gets focus back on close (the opener). Safari and macOS Firefox do not focus a
   * button on click, so `document.activeElement` at open time is only the fallback.
   */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

type TabKey = 'local' | 'global';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'local', label: 'Este simulador' },
  { key: 'global', label: 'Global' },
];

/** Bottom sheet on phones, full-height right panel from `sm` up; the backdrop dims the page. */
const DIALOG =
  'inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none rounded-t-base border-t border-border bg-bg-elevated p-0 text-fg backdrop:bg-black/40 sm:top-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:w-[22rem] sm:max-w-full sm:rounded-none sm:border-t-0 sm:border-l';

const TAB =
  '-mb-px min-h-11 border-b-2 border-transparent px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg aria-selected:border-accent aria-selected:text-fg';

function showDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

/** Whether a click landed outside the dialog's box, i.e. on its ::backdrop. */
function isBackdropClick(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  const { clientX: x, clientY: y } = event;
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

function hideDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

/** Arrow keys cycle the tabs, Home and End jump to the ends; undefined for any other key. */
function nextTab(current: TabKey, key: string): TabKey | undefined {
  const index = TABS.findIndex((tab) => tab.key === current);
  const last = TABS.length - 1;
  const moves: Record<string, number> = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  };
  const target = moves[key];
  return target === undefined ? undefined : TABS[target].key;
}

function CloseIcon() {
  return (
    <svg
      className="size-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/**
 * Settings panel on a native modal <dialog>: tabs "Este simulador" (the laboratory's options) and
 * "Global" (the site-wide store). The `open` prop drives showModal/close; Escape, the close button
 * and a backdrop click ask the owner to close through `onClose`, and focus returns to whatever
 * had it when the panel opened.
 */
export default function SettingsDrawer({
  open,
  onClose,
  title,
  local,
  id,
  returnFocusTo,
}: SettingsDrawerProps): JSX.Element {
  const generatedId = useId();
  const dialogId = id ?? generatedId;
  const titleId = `${dialogId}-title`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('local');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      const focused = document.activeElement;
      returnFocusRef.current =
        returnFocusTo?.current ?? (focused instanceof HTMLElement ? focused : null);
      showDialog(dialog);
      return;
    }
    hideDialog(dialog);
    const returnTo = returnFocusRef.current;
    returnFocusRef.current = null;
    if (returnTo?.isConnected) returnTo.focus();
    // returnFocusTo is a ref, read at open time; it never needs to re-run the effect.
  }, [open]);

  const selectTab = (key: TabKey) => {
    setActiveTab(key);
    tabRefs.current[key]?.focus();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = nextTab(activeTab, event.key);
    if (!target) return;
    event.preventDefault();
    selectTab(target);
  };

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      aria-labelledby={titleId}
      className={DIALOG}
      // Escape: keep the owner's `open` as the source of truth instead of closing natively.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A close the browser forces anyway (e.g. a repeated Escape) still reaches the owner.
      onClose={() => {
        if (open) onClose();
      }}
      // A click on the dialog itself may be blank panel area below the content (the panel is
      // full height); only one outside the dialog's box hit the backdrop.
      onClick={(event) => {
        if (isBackdropClick(event)) onClose();
      }}
    >
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 bg-bg-elevated px-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="m-0 text-base">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Cerrar ajustes"
              onClick={onClose}
              className={ICON_BUTTON}
            >
              <CloseIcon />
            </button>
          </div>
          <div
            role="tablist"
            aria-label="Ámbito de los ajustes"
            onKeyDown={onTabKeyDown}
            className="mt-2 flex border-b border-border"
          >
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  ref={(node) => {
                    tabRefs.current[tab.key] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`${dialogId}-tab-${tab.key}`}
                  aria-selected={isActive}
                  aria-controls={`${dialogId}-panel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.key)}
                  className={TAB}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {TABS.map((tab) => (
          <div
            key={tab.key}
            role="tabpanel"
            id={`${dialogId}-panel-${tab.key}`}
            aria-labelledby={`${dialogId}-tab-${tab.key}`}
            hidden={tab.key !== activeTab}
            className="p-4"
          >
            {tab.key === 'local' ? (
              <LocalSettingsTab idPrefix={`${dialogId}-local`} options={local} />
            ) : (
              <GlobalSettingsTab idPrefix={`${dialogId}-global`} />
            )}
          </div>
        ))}
      </div>
    </dialog>
  );
}

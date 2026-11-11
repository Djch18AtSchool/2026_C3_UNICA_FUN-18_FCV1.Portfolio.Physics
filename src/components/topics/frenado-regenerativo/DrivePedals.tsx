import { useRef, type JSX, type KeyboardEvent, type PointerEvent } from 'react';
import type { DriveState } from '../../../lib/physics/regenDrive';
import type { FrameStore } from '../../lab/frameStore';
import InlineMath from '../../lab/InlineMath';
import { useFrameEffect } from '../../lab/useFrameTime';
import { ARROW_PEDALS, HOLD_KEYS, type PedalId, type PedalSource } from './pedalInput';

/** The brake left of the accelerator, as in a car; each with its arrow key. */
const PEDALS: readonly { id: PedalId; label: string; arrow: string; shortcut: string }[] = [
  { id: 'brake', label: 'Freno', arrow: '↓', shortcut: 'ArrowDown' },
  { id: 'throttle', label: 'Acelerador', arrow: '↑', shortcut: 'ArrowUp' },
];
/** Decimals of the depth written per frame: a stable style string. */
const DEPTH_DECIMALS = 3;
const PEDAL =
  'relative isolate flex min-h-10 flex-1 touch-none select-none items-center justify-center gap-2 overflow-hidden rounded-base border-2 border-border bg-bg px-3 text-sm font-semibold [-webkit-touch-callout:none]';
const DEPTH = 'absolute inset-0 -z-10 origin-left bg-accent/25';

export interface DrivePedalsProps {
  frame: FrameStore;
  /** The run's state at a live time: each pedal's depth. */
  liveAt(t: number): DriveState;
  /** Anything that changes the run outside playback (a cut, another model): redraws the depth. */
  version: unknown;
  press(pedal: PedalId, source: PedalSource): void;
  release(pedal: PedalId, source: PedalSource): void;
  releaseAll(): void;
  /** The status line: the hint, a limit met, or the summary at a pause or at the end. */
  message: string;
  /** The longest message this course can say: it reserves the line's height (no shift). */
  reserve: string;
}

type PedalProps = Omit<DrivePedalsProps, 'message' | 'reserve' | 'releaseAll'> & {
  pedal: (typeof PEDALS)[number];
};

/** One pedal: a button held with a pointer, a finger, Space or Enter; its depth fills it. */
function Pedal({ pedal, frame, liveAt, version, press, release }: PedalProps): JSX.Element {
  const depthRef = useRef<HTMLSpanElement>(null);
  useFrameEffect(
    frame,
    (t) => {
      const depth = liveAt(t)[pedal.id].toFixed(DEPTH_DECIMALS);
      if (depthRef.current) depthRef.current.style.transform = `scaleX(${depth})`;
    },
    [version],
  );
  const pointer = (event: PointerEvent<HTMLButtonElement>) => `pointer-${event.pointerId}`;
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, isDown: boolean) => {
    if (!HOLD_KEYS.includes(event.key)) return;
    event.preventDefault();
    if (!isDown) release(pedal.id, 'key');
    else if (!event.repeat) press(pedal.id, 'key');
  };
  return (
    <button
      type="button"
      data-pedal={pedal.id}
      aria-keyshortcuts={pedal.shortcut}
      className={PEDAL}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        press(pedal.id, pointer(event));
      }}
      onPointerUp={(event) => release(pedal.id, pointer(event))}
      onPointerCancel={(event) => release(pedal.id, pointer(event))}
      onLostPointerCapture={(event) => release(pedal.id, pointer(event))}
      onKeyDown={(event) => onKey(event, true)}
      onKeyUp={(event) => onKey(event, false)}
      onBlur={() => release(pedal.id, 'key')}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span ref={depthRef} data-pedal-depth="" aria-hidden="true" className={DEPTH} />
      {pedal.label}
      <span aria-hidden="true" className="font-mono text-fg-muted">
        {pedal.arrow}
      </span>
    </button>
  );
}

/**
 * The pedals of «Conducir», in the canvas: brake and accelerator as buttons held down (pointer,
 * touch, Space or Enter), ↑ and ↓ while either has the focus. Leaving the pair, the window or the
 * page lets every pedal go. Under them, the one status line: the hint, a limit met (once per run)
 * and the summary at a pause or at the end; never a frame's worth of text. Its height is the
 * longest message's (an invisible copy in the same cell), so it never shifts what follows.
 */
export default function DrivePedals(props: DrivePedalsProps): JSX.Element {
  const { press, release, releaseAll, message, reserve } = props;
  const onArrow = (event: KeyboardEvent<HTMLDivElement>, isDown: boolean) => {
    const pedal = ARROW_PEDALS[event.key];
    if (!pedal) return;
    event.preventDefault();
    if (!isDown) release(pedal, 'arrow');
    else if (!event.repeat) press(pedal, 'arrow');
  };
  return (
    <div data-testid="drive-pedals" className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Pedales"
        className="flex gap-3"
        onKeyDown={(event) => onArrow(event, true)}
        onKeyUp={(event) => onArrow(event, false)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) releaseAll();
        }}
      >
        {PEDALS.map((pedal) => (
          <Pedal key={pedal.id} pedal={pedal} {...props} />
        ))}
      </div>
      <div className="grid text-sm">
        <p role="status" data-testid="drive-status" className="m-0 [grid-area:1/1]">
          <InlineMath text={message} />
        </p>
        <p
          aria-hidden="true"
          data-drive-status-reserve=""
          className="invisible m-0 [grid-area:1/1]"
        >
          {reserve}
        </p>
      </div>
    </div>
  );
}

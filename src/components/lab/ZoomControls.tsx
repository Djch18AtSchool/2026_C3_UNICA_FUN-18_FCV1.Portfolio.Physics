/**
 * The zoom buttons of a canvas (auditoría §12.3): «Acercar», «Alejar», «Ajustar» and «Tamaño real
 * 1:1» with the zoom factor («×2,5») over them, the same group in every scene, in a corner of the
 * canvas (bottom-right by default; `corner` and `orientation` move it off what matters). «1:1» is
 * left out when it would repeat «Ajustar» (zoom.hasActualSize: the lab declared no fit). Buttons
 * are 40 px with 20 px glyphs; one with nothing to do is inert with aria-disabled and keeps its
 * focus. It also holds the canvas' instructions (the viewport's aria-describedby), so a canvas
 * with useZoomPan always renders it:
 *
 *   <div {...zoom.viewportProps} className="relative">
 *     <Scene … />
 *     <ZoomControls zoom={zoom} />
 *   </div>
 *
 * A screen reader hears the factor in words while browsing and, in a polite region, the new zoom
 * once it settles (never at load).
 */
import type { JSX, ReactNode } from 'react';
import { placementClasses, type CanvasPlacement } from './canvasCorner';
import type { ZoomPan } from './useZoomPan';
import { useSettledText } from './useSettledText';
import { formatZoomFactor, zoomSpoken } from './zoomMath';

/** A glide or a held key changes the zoom many times; it is said once it holds this long. */
export const ZOOM_ANNOUNCE_DELAY_MS = 500;
export const ZOOM_INSTRUCTIONS =
  'Con el lienzo enfocado: + y − acercan y alejan, 0 ajusta el dibujo y las flechas lo desplazan; enfocado con el teclado, también la rueda sola. Con el ratón: Ctrl y la rueda, y arrastrar el fondo. En pantalla táctil: pellizcar y arrastrar con un dedo.';

export type ZoomControlsOrientation = 'column' | 'row';

export interface ZoomControlsProps {
  zoom: ZoomPan;
  /** A corner of the canvas, or `inline` inside ZoomOverlay. */
  corner?: CanvasPlacement;
  orientation?: ZoomControlsOrientation;
}

const GROUP = 'flex rounded-base border border-border bg-bg-elevated';
const DIRECTION: Readonly<Record<ZoomControlsOrientation, string>> = {
  column: 'flex-col divide-y divide-border',
  row: 'flex-row divide-x divide-border',
};
const BUTTON =
  'inline-flex size-10 items-center justify-center text-fg-muted transition-colors hover:text-fg aria-disabled:cursor-not-allowed aria-disabled:text-fg-muted/50 aria-disabled:hover:text-fg-muted/50';
const FACTOR =
  'flex h-8 min-w-10 items-center justify-center px-1 font-mono text-xs font-medium whitespace-nowrap text-fg tabular-nums';

function Icon({ d }: { d: string }): JSX.Element {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const PLUS = 'M12 5v14M5 12h14';
const MINUS = 'M5 12h14';
/** Four corner brackets: frame the drawing. */
const FIT = 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5';

interface ZoomButtonProps {
  label: string;
  title: string;
  isEnabled: boolean;
  onPress(): void;
  children: ReactNode;
}

/** An aria-disabled button stays focusable and ignores presses (it says why it does nothing). */
function ZoomButton({ label, title, isEnabled, onPress, children }: ZoomButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      aria-disabled={isEnabled ? undefined : 'true'}
      onClick={() => {
        if (isEnabled) onPress();
      }}
      className={BUTTON}
    >
      {children}
    </button>
  );
}

export default function ZoomControls({
  zoom,
  corner = 'bottom-right',
  orientation = 'column',
}: ZoomControlsProps): JSX.Element {
  const spoken = zoomSpoken(zoom.view.scale);
  const announced = useSettledText(spoken, ZOOM_ANNOUNCE_DELAY_MS);
  return (
    <>
      <div
        data-zoom-controls=""
        data-zoom-ignore=""
        role="group"
        aria-label="Zoom"
        className={`${GROUP} ${DIRECTION[orientation]} ${placementClasses(corner)}`}
      >
        <span data-zoom-factor="" aria-hidden="true" className={FACTOR}>
          {formatZoomFactor(zoom.view.scale)}
        </span>
        <ZoomButton
          label="Acercar"
          title="Acercar (+)"
          isEnabled={zoom.canZoomIn}
          onPress={zoom.zoomIn}
        >
          <Icon d={PLUS} />
        </ZoomButton>
        <ZoomButton
          label="Alejar"
          title="Alejar (−)"
          isEnabled={zoom.canZoomOut}
          onPress={zoom.zoomOut}
        >
          <Icon d={MINUS} />
        </ZoomButton>
        <ZoomButton label="Ajustar" title="Ajustar (0)" isEnabled={zoom.canFit} onPress={zoom.fit}>
          <Icon d={FIT} />
        </ZoomButton>
        {zoom.hasActualSize ? (
          <ZoomButton
            label="Tamaño real 1:1"
            title="Tamaño real (1:1)"
            isEnabled={zoom.canActualSize}
            onPress={zoom.actualSize}
          >
            <span className="font-mono text-xs font-medium">1:1</span>
          </ZoomButton>
        ) : null}
      </div>
      <span data-zoom-words="" className="sr-only">
        {spoken}
      </span>
      <p role="status" aria-live="polite" className="sr-only">
        {announced}
      </p>
      <p id={zoom.instructionsId} className="sr-only">
        {ZOOM_INSTRUCTIONS}
      </p>
    </>
  );
}

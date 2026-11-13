/**
 * The zoom buttons of a canvas (auditoría §12.3): «Acercar», «Alejar», «Ajustar» and «Tamaño real
 * 1:1» with the zoom factor («Zoom ×2,5»: never a bare «×2,5», which reads like the time badge's
 * «×4 cámara rápida», R31) before them, the same group in every scene, in a corner of the
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

/**
 * The group's width in a row without «1:1» («Zoom ×5,7» and three 40 px buttons; README, «Zoom y
 * desplazamiento»): what a strip leaves beside its scale bar (inlineScaleBarMaxPx).
 */
export const ZOOM_ROW_WIDTH_PX = 191;
/**
 * Height of the strip of one row under a canvas (Temas 2, 3, 8 and 9): the buttons' 40 px with
 * 4 px of air above and below, so the strip measures the same on the server and in the browser.
 */
export const ZOOM_STRIP_PX = 48;
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
/**
 * «Zoom» and the number: on one line in a row, the number 4 characters wide whatever it says, so
 * the buttons never move; stacked in a column (two 16 px lines in the 32 px cell), which keeps
 * the column 40 px wide.
 */
const FACTOR_LAYOUT: Readonly<Record<ZoomControlsOrientation, { box: string; number: string }>> = {
  row: { box: 'gap-1', number: 'min-w-[4ch] text-left' },
  column: { box: 'flex-col leading-4', number: 'text-center' },
};

/** The factor as drawn: «Zoom ×2,8». Hidden: ZoomControls says it in words. */
function ZoomFactor({
  scale,
  orientation,
}: {
  scale: number;
  orientation: ZoomControlsOrientation;
}) {
  const layout = FACTOR_LAYOUT[orientation];
  return (
    <span data-zoom-factor-label="" aria-hidden="true" className={`${FACTOR} ${layout.box}`}>
      <span className="text-fg-muted">Zoom</span>{' '}
      <span data-zoom-factor="" className={layout.number}>
        {formatZoomFactor(scale)}
      </span>
    </span>
  );
}

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

/** The four buttons («1:1» only when it differs from «Ajustar»). */
function ZoomButtons({ zoom }: { zoom: ZoomPan }): JSX.Element {
  return (
    <>
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
    </>
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
        <ZoomFactor scale={zoom.view.scale} orientation={orientation} />
        <ZoomButtons zoom={zoom} />
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

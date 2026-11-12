/**
 * The jump lab's canvas: the trajectory plot with its zoom layer and overlay, and the zoom's
 * buttons in their strip under it. SvgPlot gets the part of the window the zoom shows, with the
 * room of its widest y label at every zoom so the plot keeps its size (JUMP_Y_LABEL_CHARS).
 */
import type { JSX } from 'react';
import { KNOB_HIT_RADIUS } from '../../lab/OverlayMarks';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import JumpOverlay, { type JumpOverlayProps } from './JumpOverlay';
import { JUMP_Y_LABEL_CHARS } from './jumpZoom';
import JumpZoomLayer from './JumpZoomLayer';
import JumpZoomStrip from './JumpZoomStrip';
import type { JumpZoom } from './useJumpZoom';

export interface JumpCanvasProps {
  jumpZoom: JumpZoom;
  series: PlotSeries[];
  ariaLabel: string;
  /** Everything the overlay draws and reports, but the scales the plot gives it. */
  overlay: Omit<JumpOverlayProps, 'scales' | 'plotClipPath'>;
}

export default function JumpCanvas({
  jumpZoom,
  series,
  ariaLabel,
  overlay,
}: JumpCanvasProps): JSX.Element {
  return (
    <>
      <SvgPlot
        title="Trayectoria del salto"
        xLabel="x"
        xUnit="m"
        yLabel="y"
        yUnit="m"
        series={series}
        xDomain={jumpZoom.domains.x}
        yDomain={jumpZoom.domains.y}
        equalAspect
        minYLabelChars={JUMP_Y_LABEL_CHARS}
        // The marker starts on the origin, at the plot's corner: keep its knob whole.
        overlayBleed={KNOB_HIT_RADIUS}
        ariaLabel={ariaLabel}
        testId="jump-plot"
        overlay={(scales) => (
          <JumpZoomLayer scales={scales} jumpZoom={jumpZoom}>
            <JumpOverlay {...overlay} scales={scales} plotClipPath={scales.plotClipPath} />
          </JumpZoomLayer>
        )}
      />
      <JumpZoomStrip zoom={jumpZoom.zoom} />
    </>
  );
}

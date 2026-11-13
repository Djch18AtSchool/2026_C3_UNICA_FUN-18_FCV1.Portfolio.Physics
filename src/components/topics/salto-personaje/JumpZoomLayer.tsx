/**
 * The zoom's place in the jump plot: the plot area itself. Inside SvgPlot's overlay, a
 * foreignObject the size of the plot area holds the zoom's viewport (an HTML div, as useZoomPan
 * wants) with the lab's marks in a nested svg whose viewBox keeps the plot's own coordinates, so
 * the handles' drag and the plot's scales read the same pixels as before. The background drag, the
 * wheel, the keys and the reveal of a focused handle are the hook's. The scale bar sits in the
 * plot's top-right corner, which the trajectory leaves free at the start, drawn under the marks (the
 * marker and the arrows pass over it as the jump runs); the buttons are in a strip under the plot
 * (JumpZoomStrip), because a plot this flat (half as tall as wide) has no corner to spare.
 *
 * The foreign object and the nested svg let what is drawn past the plot area show (overflow
 * visible), so the origin's knob keeps its whole hit target on the plot's corner as before:
 * SvgPlot's overlay clip, which has the knobs' bleed, is what cuts it (and, in WebKit, which
 * ignores that clip here, the viewport's own: CLIPS_AT_THE_BLEED).
 */
import { useLayoutEffect, type CSSProperties, type JSX, type ReactNode } from 'react';
import type { Scale } from '../../lab/plotScales';
import { KNOB_HIT_RADIUS } from '../../lab/OverlayMarks';
import { ScaleBarSvg, ScaleBarWords } from '../../lab/ScaleBar';
import {
  JUMP_SCALE_UNITS,
  jumpScaleBarMaxPx,
  plotAreaOf,
  plotPxPerMetre,
  SCALE_BAR_BASELINE_PX,
  SCALE_BAR_INSET_PX,
} from './jumpZoom';
import type { JumpZoom } from './useJumpZoom';

export interface JumpZoomLayerProps {
  scales: { x: Scale; y: Scale };
  jumpZoom: JumpZoom;
  children: ReactNode;
}

/** The viewport fills the plot area; its focus ring is drawn inside, where the clip keeps it. */
const VIEWPORT = 'relative size-full -outline-offset-2';
const SHOWS_OVERFLOW: CSSProperties = { overflow: 'visible' };
/**
 * The viewport clips its own contents, with the knobs' bleed around the plot area (what SvgPlot's
 * overlay clip leaves a knob on the edge: its whole hit target and focus ring). Chromium also
 * clips there, through the plot's clip-path; WebKit does not apply a SVG clip-path to what is
 * inside a foreignObject, and drew the origin's marker, out of the window, below the plot.
 */
const CLIPS_AT_THE_BLEED: CSSProperties = { clipPath: `inset(-${KNOB_HIT_RADIUS}px)` };

export default function JumpZoomLayer({
  scales,
  jumpZoom,
  children,
}: JumpZoomLayerProps): JSX.Element {
  const { left, top, width, height } = plotAreaOf(scales);
  const { noteDrawn } = jumpZoom;
  // Tells the zoom which size SvgPlot drew, before its effects run (a reveal waits for it).
  useLayoutEffect(() => noteDrawn({ width, height }), [noteDrawn, width, height]);
  const bar = {
    pxPerUnit: plotPxPerMetre(scales.x),
    units: JUMP_SCALE_UNITS,
    maxPx: jumpScaleBarMaxPx(width),
  };
  return (
    <foreignObject x={left} y={top} width={width} height={height} style={SHOWS_OVERFLOW}>
      <div
        {...jumpZoom.viewportProps}
        className={VIEWPORT}
        style={{ ...jumpZoom.viewportProps.style, ...CLIPS_AT_THE_BLEED }}
      >
        <svg
          viewBox={`${left} ${top} ${width} ${height}`}
          width={width}
          height={height}
          className="block"
          style={SHOWS_OVERFLOW}
          role="presentation"
        >
          {/* Under the marks: the marker and the arrows that pass over the bar are drawn over it. */}
          <ScaleBarSvg
            {...bar}
            x={left + width - SCALE_BAR_INSET_PX}
            y={top + SCALE_BAR_BASELINE_PX}
            anchor="end"
          />
          {children}
        </svg>
        <ScaleBarWords {...bar} />
      </div>
    </foreignObject>
  );
}

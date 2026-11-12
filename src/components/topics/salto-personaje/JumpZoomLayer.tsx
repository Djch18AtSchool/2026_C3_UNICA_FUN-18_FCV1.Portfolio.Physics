/**
 * The zoom's place in the jump plot: the plot area itself. Inside SvgPlot's overlay, a
 * foreignObject the size of the plot area holds the zoom's viewport (an HTML div, as useZoomPan
 * wants) with the lab's marks in a nested svg whose viewBox keeps the plot's own coordinates, so
 * the handles' drag and the plot's scales read the same pixels as before. The background drag, the
 * wheel, the keys and the reveal of a focused handle are the hook's. The scale bar sits in the
 * plot's top-right corner, the one the trajectory leaves free; the buttons are in a strip under
 * the plot (JumpZoomStrip), because a plot this flat (half as tall as wide) has no corner to spare.
 *
 * The foreign object and the nested svg let what is drawn past the plot area show (overflow
 * visible), so the origin's knob keeps its whole hit target on the plot's corner as before:
 * SvgPlot's overlay clip, which has the knobs' bleed, is what cuts it.
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import type { Scale } from '../../lab/plotScales';
import { ScaleBarSvg, ScaleBarWords } from '../../lab/ScaleBar';
import { JUMP_SCALE_UNITS, plotPxPerMetre } from './jumpZoom';
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
 * The scale bar's baseline sits this far (px) from the plot's top: the 8 px ticks, the 4 px gap and
 * the 12 px words above it, with 4 px of air. It ends 8 px from the plot's right edge.
 */
const SCALE_BAR_BASELINE = 28;
const SCALE_BAR_INSET = 8;

/** The plot area in the svg's user units: its left and top edges and its size. */
function plotArea({ x, y }: JumpZoomLayerProps['scales']) {
  const [left, right] = [Math.min(...x.range), Math.max(...x.range)];
  const [top, bottom] = [Math.min(...y.range), Math.max(...y.range)];
  return { left, top, width: right - left, height: bottom - top };
}

export default function JumpZoomLayer({
  scales,
  jumpZoom,
  children,
}: JumpZoomLayerProps): JSX.Element {
  const { left, top, width, height } = plotArea(scales);
  const bar = { pxPerUnit: plotPxPerMetre(scales.x), units: JUMP_SCALE_UNITS };
  return (
    <foreignObject x={left} y={top} width={width} height={height} style={SHOWS_OVERFLOW}>
      <div {...jumpZoom.viewportProps} className={VIEWPORT}>
        <svg
          viewBox={`${left} ${top} ${width} ${height}`}
          width={width}
          height={height}
          className="block"
          style={SHOWS_OVERFLOW}
          role="presentation"
        >
          {children}
          <ScaleBarSvg
            {...bar}
            x={left + width - SCALE_BAR_INSET}
            y={top + SCALE_BAR_BASELINE}
            anchor="end"
          />
        </svg>
        <ScaleBarWords {...bar} />
      </div>
    </foreignObject>
  );
}

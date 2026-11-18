import type { JSX } from 'react';
import {
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import SvgPlot, { type OverlayScales } from '../../lab/SvgPlot';
import { ENVELOPE_AXES, SIGNAL_COLOR, WINDOW_BRACKET_Y, type EnvelopeData } from './soundPlots';

export interface EnvelopePlotProps {
  data: EnvelopeData;
  title: string;
  ariaLabel: string;
  testId?: string;
}

const BAND_OPACITY = 0.14;
/** The band labels sit at this level, under the sustain (about 1) and above the bracket. */
const BAND_LABEL_Y = 0.62;
const LABEL_GAP = 4;
const LABEL_RISE = 6;
const CAP = 5;
const HALO = 4;

const labelStyle = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: TICK_FONT_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO,
  paintOrder: 'stroke',
} as const;

/**
 * The attack and the release as shaded bands, each labelled beside it toward the sustain, and the
 * analysis window as a bracket under the sustain. They are drawn as measured, so they may overlap
 * (the clarinet's window opens inside its attack, the flute's closes inside its release).
 */
function Bands({ scales, data }: { scales: OverlayScales; data: EnvelopeData }): JSX.Element {
  const { x, y } = scales;
  const [top, bottom] = [y.toPx(y.domain.max), y.toPx(y.domain.min)];
  const labelY = y.toPx(BAND_LABEL_Y);
  const bracketY = y.toPx(WINDOW_BRACKET_Y);
  const band = (name: string, { from, to }: { from: number; to: number }) => (
    <rect
      data-band={name}
      x={x.toPx(from)}
      y={top}
      width={x.toPx(to) - x.toPx(from)}
      height={bottom - top}
      fill={TICK_COLOR}
      fillOpacity={BAND_OPACITY}
    />
  );
  const [windowLeft, windowRight] = [x.toPx(data.window.from), x.toPx(data.window.to)];
  return (
    <g className="pointer-events-none">
      {band('ataque', data.attack)}
      {band('caida', data.release)}
      <text x={x.toPx(data.attack.to) + LABEL_GAP} y={labelY} {...labelStyle}>
        Ataque
      </text>
      <text x={x.toPx(data.release.from) - LABEL_GAP} y={labelY} textAnchor="end" {...labelStyle}>
        Caída
      </text>
      <g data-bracket="ventana" stroke={TEXT_COLOR} strokeWidth={1}>
        <line x1={windowLeft} x2={windowRight} y1={bracketY} y2={bracketY} />
        <line x1={windowLeft} x2={windowLeft} y1={bracketY - CAP} y2={bracketY + CAP} />
        <line x1={windowRight} x2={windowRight} y1={bracketY - CAP} y2={bracketY + CAP} />
      </g>
      <text
        x={(windowLeft + windowRight) / 2}
        y={bracketY - LABEL_RISE}
        textAnchor="middle"
        {...labelStyle}
      >
        Ventana de análisis
      </text>
    </g>
  );
}

/**
 * The 10 ms RMS envelope of a whole recording, relative to its sustain, on the timeline of the
 * clip the reader plays: the instant of the attack transient (11.7) and the window the spectrum
 * and the waveform were measured in. Both recordings share these axes.
 */
export default function EnvelopePlot({
  data,
  title,
  ariaLabel,
  testId,
}: EnvelopePlotProps): JSX.Element {
  return (
    <SvgPlot
      title={title}
      {...ENVELOPE_AXES}
      series={[
        { id: 'envolvente', label: 'Envolvente RMS', points: data.points, color: SIGNAL_COLOR },
      ]}
      overlay={(scales) => <Bands scales={scales} data={data} />}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_FONT_SIZE } from '../../charts/chartTheme';
import MathText from '../../lab/MathText';
import SvgPlot, { type OverlayScales, type PlotSeries } from '../../lab/SvgPlot';
import { formatNumber } from '../../../lib/format';
import {
  PERIOD_BRACKET_Y,
  SHIFTED_COLOR,
  SIGNAL_COLOR,
  WAVEFORM_AXES,
  type WaveformData,
} from './soundPlots';

export interface WaveformPlotProps {
  data: WaveformData;
  /** Plain text, with KaTeX inline between `$…$`. */
  title: string;
  ariaLabel: string;
  /** Draw −y(t + T/2) dashed on top (equation 11.6); Paso 1's pure tone leaves it out. */
  showShifted?: boolean;
  testId?: string;
}

const CAP = 5;
const LABEL_RISE = 8;
const HALO = 4;

/** «$T$ = 3,22 ms» over a bracket that spans the first period. */
function PeriodBracket({ scales, periodMs }: { scales: OverlayScales; periodMs: number }) {
  const left = scales.x.toPx(0);
  const right = scales.x.toPx(periodMs);
  const y = scales.y.toPx(PERIOD_BRACKET_Y);
  return (
    <g data-mark="periodo" stroke={TEXT_COLOR} strokeWidth={1}>
      <line x1={left} x2={right} y1={y} y2={y} />
      <line x1={left} x2={left} y1={y - CAP} y2={y + CAP} />
      <line x1={right} x2={right} y1={y - CAP} y2={y + CAP} />
      <MathText
        source={`$T$ = ${formatNumber(periodMs, { precision: 2 })} ms`}
        x={right + CAP}
        y={y + LABEL_RISE / 2}
        fontSize={TICK_FONT_SIZE}
        fill={TEXT_COLOR}
        halo={{ color: SURFACE_COLOR, width: HALO }}
      />
    </g>
  );
}

/**
 * Four periods of a sound in ms, on the axes every waveform of the topic shares, with the bracket
 * of one period T and, dashed on top, −y(t + T/2): where it falls on the solid curve the second
 * half of each period is the first one inverted, equation (11.6).
 */
export default function WaveformPlot({
  data,
  title,
  ariaLabel,
  showShifted = true,
  testId,
}: WaveformPlotProps): JSX.Element {
  const series: PlotSeries[] = [
    { id: 'senal', label: 'Señal $y(t)$', points: data.signal, color: SIGNAL_COLOR },
  ];
  if (showShifted) {
    series.push({
      id: 'media-onda',
      label: 'Medio periodo después, invertida: $-y(t + T/2)$',
      points: data.shifted,
      color: SHIFTED_COLOR,
      dashed: true,
    });
  }
  return (
    <SvgPlot
      title={title}
      {...WAVEFORM_AXES}
      series={series}
      overlay={(scales) => <PeriodBracket scales={scales} periodMs={data.periodMs} />}
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

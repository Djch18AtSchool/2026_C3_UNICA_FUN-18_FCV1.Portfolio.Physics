/**
 * Axes, domains and series of Tema 5's force–displacement plots, shared by the static figures of
 * steps 1–2 and the trigger laboratory of step 4.
 */
import { TRIGGER_TRAVEL_MM, triggerCurves } from '../../../lib/data/triggerModel';
import { CHART_COLORS } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { PlotSeries, SvgPlotProps } from '../../lab/SvgPlot';
import type { SpringSettings } from './triggerScene';

/** The ideal spring wears chart 1, dashed; the trigger profile chart 2; the vibration chart 3. */
export const HOOKE_COLOR = CHART_COLORS[0];
export const PROFILE_COLOR = CHART_COLORS[1];
export const VIBRATION_COLOR = CHART_COLORS[2];

/** 0–8 mm, the assumed travel; 0–5 N, a round top above k_max · 8 mm = 600 · 0,008 = 4,8 N. */
export const TRAVEL_DOMAIN = { min: 0, max: TRIGGER_TRAVEL_MM } as const;
export const FORCE_DOMAIN = { min: 0, max: 5 } as const;

type PlotFrame = Pick<
  SvgPlotProps,
  'xLabel' | 'xUnit' | 'yLabel' | 'yUnit' | 'series' | 'xDomain' | 'yDomain' | 'bands'
>;

export const FORCE_AXES = {
  xLabel: 'Desplazamiento x',
  xUnit: 'mm',
  yLabel: 'Fuerza F',
  yUnit: 'N',
  xDomain: TRAVEL_DOMAIN,
  yDomain: FORCE_DOMAIN,
} as const;

/** The ideal spring's F = k x (magnitude of −k x) over the travel, dashed. */
export function hookeSeries(k: number, label = 'Resorte ideal, F = k x'): PlotSeries {
  return {
    id: 'hooke',
    label,
    points: triggerCurves({ k, start: 0 }).map(({ x, hooke }) => ({ x, y: hooke })),
    color: HOOKE_COLOR,
    dashed: true,
  };
}

/** The trigger's piecewise profile, equation (5.4), over the travel. */
export function profileSeries({ k, x0Mm }: SpringSettings): PlotSeries {
  return {
    id: 'perfil',
    label: 'Perfil del gatillo, ecuación (5.4)',
    points: triggerCurves({ k, start: x0Mm }).map(({ x, trigger }) => ({ x, y: trigger })),
    color: PROFILE_COLOR,
  };
}

/** The laboratory's plot: Hooke and the profile, with the resisting stretch shaded from x₀ > 0. */
export function labPlot(settings: SpringSettings): PlotFrame {
  return {
    ...FORCE_AXES,
    series: [hookeSeries(settings.k), profileSeries(settings)],
    bands:
      settings.x0Mm > 0
        ? [{ from: settings.x0Mm, to: TRIGGER_TRAVEL_MM, label: 'Tramo con resistencia' }]
        : [],
  };
}

/** Below this measured width (phones) a plot gets a squarer aspect so its lines keep height. */
const COMPACT_WIDTH = 480;
const FALLBACK_WIDTH = 720;

/** A wrapper ref and the aspect ratio for its measured width: `wide` from 480 px, else `compact`. */
export function usePlotAspect(wide: number, compact: number) {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? compact : wide };
}

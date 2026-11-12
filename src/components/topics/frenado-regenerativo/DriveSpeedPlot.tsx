import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { CycleSample } from '../../../lib/physics/energy';
import SvgPlot, { type PlotAspect, type PlotSeries } from '../../lab/SvgPlot';
import type { DriveCourse } from './driveRun';
import { KMH_PER_MS } from './regenScene';

export interface DriveSpeedPlotProps {
  samples: readonly CycleSample[];
  course: DriveCourse;
  cycleName: string;
  /** Your v (km/h) against the cycle's time, up to the settled instant (speedTrace). */
  own: { x: number; y: number }[];
  /** The settled instant (s of the run): the instant's line. */
  t: number;
}

/** Flatter than a lone plot: one curve of 26 s under the scene and the pedals. */
const SPEED_PLOT_ASPECT: PlotAspect = { compact: 1.6, wide: 2 };
/** The speed axis ends at the fastest of the two, rounded up to 20 km/h. */
const AXIS_GRAIN_KMH = 20;
const OWN_COLOR = 'var(--accent)';
const CYCLE_COLOR = 'var(--fg-muted)';

const seconds = (t: number) => formatNumber(t, { precision: 0 });

/** The cycle's samples on the course, v in km/h against its time. */
export function courseSpeeds(samples: readonly CycleSample[], course: DriveCourse) {
  const end = course.offset + course.duration;
  return samples
    .filter(({ t }) => t >= course.offset && t <= end)
    .map(({ t, v }) => ({ x: t, y: v * KMH_PER_MS }));
}

/**
 * Your speed against the cycle's car's on the course: the cycle's data dashed and muted, yours solid
 * in the accent, named in the legend (never told apart by color alone), and a line at the instant.
 */
export default function DriveSpeedPlot({
  samples,
  course,
  cycleName,
  own,
  t,
}: DriveSpeedPlotProps): JSX.Element {
  const cycle = useMemo(() => courseSpeeds(samples, course), [samples, course]);
  const series: PlotSeries[] = [
    {
      id: 'cycle',
      label: `Auto del ${cycleName} (dato real)`,
      color: CYCLE_COLOR,
      dashed: true,
      points: cycle,
    },
    { id: 'own', label: 'Tu conducción', color: OWN_COLOR, points: own },
  ];
  const fastest = Math.max(...cycle.map(({ y }) => y), ...own.map(({ y }) => y));
  const top = Math.max(1, Math.ceil(fastest / AXIS_GRAIN_KMH)) * AXIS_GRAIN_KMH;
  const end = course.offset + course.duration;
  return (
    <div data-testid="drive-speed-plot">
      <SvgPlot
        title="Velocidad: tu conducción y el auto del ciclo"
        xLabel="Tiempo"
        xUnit="s"
        yLabel="Velocidad"
        yUnit="km/h"
        series={series}
        xDomain={{ min: course.offset, max: end }}
        yDomain={{ min: 0, max: top }}
        aspectRatio={SPEED_PLOT_ASPECT}
        // At the settled time (10 Hz), not every frame: the curve already shows the progress, and
        // «Conducir» keeps within the lab's budget of DOM mutations per frame.
        cursor={{ x: course.offset + t }}
        ariaLabel={`Velocidad en el tramo de ${seconds(course.offset)} a ${seconds(end)} s: el auto del ${cycleName}, dato real, en línea discontinua, y tu conducción, en línea continua, hasta el instante actual.`}
      />
    </div>
  );
}

/**
 * A clocked lab for tests/e2e/time-scale.spec.ts: a 1 369 s run at ×20 (the UDDS cycle's length
 * and Tema 6's lapse) with 17 stops and one peak on its transport, the HTML badge in the canvas
 * corner and the SVG one beside a dot that moves with the clock.
 */
import type { JSX } from 'react';
import { clockSettings } from '../../../../../src/components/lab/clockSettings';
import LabShell from '../../../../../src/components/lab/LabShell';
import TimeScaleBadge, {
  TimeScaleBadgeSvg,
} from '../../../../../src/components/lab/TimeScaleBadge';
import type { TransportMarker } from '../../../../../src/components/lab/transportMarkers';
import { useFrameTime } from '../../../../../src/components/lab/useFrameTime';
import { useSimClock, type SimClock } from '../../../../../src/components/lab/useSimClock';

const DURATION = 1369;
const TIME_LAPSE = 20;
/** 17 stops spread over the run, like the UDDS's, and its top speed as a peak. */
const STOP_TIMES = [
  22, 125, 190, 280, 312, 397, 470, 545, 620, 700, 770, 850, 930, 1010, 1100, 1190, 1360,
];
export const MARKERS: readonly TransportMarker[] = [
  ...STOP_TIMES.map((t) => ({ t, label: 'Detención', kind: 'stop' as const })),
  { t: 240, label: 'Rapidez máxima', kind: 'peak' },
];
const SCENE_HEIGHT = 256;
const DOT_RADIUS = 8;
const BADGE_GAP = 16;

function MovingDot({ clock }: { clock: SimClock }): JSX.Element {
  const t = useFrameTime(clock);
  const share = t / DURATION;
  return (
    <svg data-testid="time-scene" width="100%" height={SCENE_HEIGHT} className="block">
      <rect width="100%" height="100%" fill="var(--grid)" opacity={0.4} />
      <line x1="0" x2="100%" y1="50%" y2="50%" stroke="var(--border)" strokeWidth={2} />
      <svg x={`${share * 90 + 5}%`} y="50%" overflow="visible">
        <circle r={DOT_RADIUS} fill="var(--chart-1)" />
        <TimeScaleBadgeSvg
          clock={clock}
          x={0}
          y={-DOT_RADIUS - BADGE_GAP - BADGE_GAP}
          anchor="start"
        />
      </svg>
    </svg>
  );
}

export default function TimeLabFixture(): JSX.Element {
  const clock = useSimClock(DURATION, { timeScale: TIME_LAPSE });
  return (
    <LabShell
      title="Laboratorio de prueba del tiempo"
      testId="time-fixture-lab"
      clock={clock}
      timeUnit="s"
      markers={MARKERS}
      readouts={[{ id: 't', label: 'Tiempo', value: clock.state.t, unit: 's', precision: 0 }]}
      onReset={clock.reset}
      levels={{ params: <p className="text-sm">Sin parámetros.</p>, display: clockSettings(clock) }}
    >
      <div className="relative">
        <MovingDot clock={clock} />
        <TimeScaleBadge clock={clock} />
      </div>
    </LabShell>
  );
}

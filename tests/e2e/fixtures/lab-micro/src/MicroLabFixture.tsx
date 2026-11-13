/**
 * A lab for tests/e2e/microinteractions.spec.ts: three presets of a launch speed, a plot of three
 * series (two parabolas and a line) whose legend highlights them, and a knob on the plot that
 * drags the speed (useDrag, Knob) with the arrow keys as its keyboard alternative.
 */
import { useState, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../../../src/lib/format';
import type { Preset } from '../../../../../src/lib/presets';
import LabPresets from '../../../../../src/components/lab/LabPresets';
import LabShell from '../../../../../src/components/lab/LabShell';
import { Knob } from '../../../../../src/components/lab/OverlayMarks';
import SvgPlot, { type OverlayScales } from '../../../../../src/components/lab/SvgPlot';
import { useDrag } from '../../../../../src/components/lab/useDrag';

const PRESETS: readonly Preset<number>[] = [
  { id: 'lento', name: 'Lento', values: 4 },
  { id: 'medio', name: 'Medio', values: 6 },
  { id: 'rapido', name: 'Rápido', values: 8 },
];
const SPEED = { min: 2, max: 10 } as const;
const KEY_STEP = 0.5;
const G = 9.81;
const SAMPLES = 24;
const X_MAX = 10;

/** y(x) of a launch at 45° with speed v, and of the same launch on the Moon, sampled. */
function series(v: number) {
  const xs = Array.from({ length: SAMPLES + 1 }, (_, i) => (X_MAX * i) / SAMPLES);
  const arc = (g: number) => xs.map((x) => ({ x, y: Math.max(0, x - (g * x * x) / (v * v)) }));
  return [
    { id: 'tierra', label: 'Tierra', points: arc(G) },
    { id: 'luna', label: 'Luna', points: arc(G / 6), dashed: true },
    {
      id: 'suelo',
      label: 'Suelo, $y = 0$',
      points: [
        { x: 0, y: 0 },
        { x: X_MAX, y: 0 },
      ],
    },
  ];
}

const clamp = (v: number) => Math.min(SPEED.max, Math.max(SPEED.min, v));

function SpeedKnob({
  v,
  onChange,
  scales,
}: {
  v: number;
  onChange(v: number): void;
  scales: OverlayScales;
}) {
  const drag = useDrag(({ x }) => onChange(clamp(Math.round(scales.x.toValue(x) * 10) / 10)));
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = {
      ArrowRight: KEY_STEP,
      ArrowUp: KEY_STEP,
      ArrowLeft: -KEY_STEP,
      ArrowDown: -KEY_STEP,
    }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onChange(clamp(v + step));
  };
  return (
    <g
      data-testid="micro-knob"
      role="slider"
      tabIndex={0}
      aria-label="Rapidez de lanzamiento"
      aria-valuemin={SPEED.min}
      aria-valuemax={SPEED.max}
      aria-valuenow={v}
      aria-valuetext={`v = ${formatNumber(v, { precision: 1, unit: 'm/s' })}`}
      className="group cursor-ew-resize outline-none"
      onKeyDown={onKeyDown}
      {...drag}
    >
      <Knob at={{ x: scales.x.toPx(v), y: scales.y.toPx(1) }} fill="var(--fg)" />
    </g>
  );
}

export default function MicroLabFixture(): JSX.Element {
  const [v, setV] = useState(PRESETS[0].values);
  const activeId = PRESETS.find((preset) => preset.values === v)?.id;
  return (
    <LabShell
      title="Laboratorio de prueba de microinteracciones"
      testId="micro-fixture-lab"
      readouts={[{ id: 'v', label: 'Rapidez', value: v, unit: 'm/s', precision: 1 }]}
      onReset={() => setV(PRESETS[0].values)}
      levels={{
        params: <p className="text-sm">La rapidez se arrastra en el lienzo.</p>,
        scenario: (
          <LabPresets
            id="micro-preset"
            presets={PRESETS}
            activeId={activeId}
            onSelect={(p) => setV(p.values)}
          />
        ),
        display: [],
      }}
    >
      <SvgPlot
        title="Trayectorias de prueba"
        xLabel="x"
        xUnit="m"
        yLabel="y"
        yUnit="m"
        series={series(v)}
        xDomain={{ min: 0, max: X_MAX }}
        yDomain={{ min: 0, max: 4 }}
        ariaLabel={`Dos trayectorias con v = ${v} m/s`}
        testId="micro-plot"
        overlayBleed={16}
        overlay={(scales) => <SpeedKnob v={v} onChange={setV} scales={scales} />}
      />
    </LabShell>
  );
}

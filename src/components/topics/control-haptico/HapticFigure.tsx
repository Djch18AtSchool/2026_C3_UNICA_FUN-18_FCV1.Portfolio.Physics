import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import SvgPlot from '../../lab/SvgPlot';
import { Label } from '../../lab/OverlayMarks';
import type { Scale } from '../../lab/plotScales';
import { PlotPoints, type PlotPoint } from '../llantas-f1/TyreMarks';
import {
  FORCE_AXES,
  HOOKE_COLOR,
  hookeSeries,
  usePlotAspect,
  VIBRATION_COLOR,
} from './hapticPlots';
import { triggerReadings } from './triggerScene';
import ThirdLawDiagram from './ThirdLawDiagram';

export type HapticFigureVariant = 'vibracion' | 'hooke' | 'tercera-ley';

export interface HapticFigureProps {
  variant: HapticFigureVariant;
}

/** Wide figures keep the plotter's 1,6; phones get a squarer plot so the lines keep height. */
const WIDE_ASPECT = 1.6;
const COMPACT_ASPECT = 0.8;
/** The worked example: k = 400 N/m over the assumed 8 mm travel. */
const K_EXAMPLE = 400;
const BOTTOM_MM = 8;
const MID_MM = 4;
const EARLY_MM = 2;
/** The fixed vibration, as a force, matches the spring at mid travel: k · 4 mm = 1,6 N. */
const VIBRATION_N = (K_EXAMPLE * MID_MM) / 1000;
const AREA_OPACITY = 0.15;
const AREA_LABEL_DROP = 4;

const newtons = (value: number) => formatNumber(value, { precision: 1, unit: 'N' });
const springAt = (xMm: number) => triggerReadings({ k: K_EXAMPLE, x0Mm: 0 }, xMm);

function VibrationPlot(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const points: PlotPoint[] = [
    {
      id: 'vib-2',
      x: EARLY_MM,
      y: VIBRATION_N,
      label: newtons(VIBRATION_N),
      color: VIBRATION_COLOR,
    },
    {
      id: 'vib-8',
      x: BOTTOM_MM,
      y: VIBRATION_N,
      label: newtons(VIBRATION_N),
      anchor: 'end',
      side: 1,
      color: VIBRATION_COLOR,
    },
    {
      id: 'res-2',
      x: EARLY_MM,
      y: springAt(EARLY_MM).hooke,
      label: newtons(springAt(EARLY_MM).hooke),
      side: 1,
      color: HOOKE_COLOR,
    },
    {
      id: 'res-8',
      x: BOTTOM_MM,
      y: springAt(BOTTOM_MM).hooke,
      label: newtons(springAt(BOTTOM_MM).hooke),
      anchor: 'end',
      color: HOOKE_COLOR,
    },
  ];
  return (
    <div ref={ref} data-testid="haptic-figure-vibracion">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fuerza sobre el dedo frente al desplazamiento: vibración fija y resorte"
        {...FORCE_AXES}
        series={[
          {
            id: 'vibracion',
            label: 'Vibración fija, F = F₀',
            points: [
              { x: 0, y: VIBRATION_N },
              { x: BOTTOM_MM, y: VIBRATION_N },
            ],
            color: VIBRATION_COLOR,
          },
          hookeSeries(K_EXAMPLE, `Resorte de ${K_EXAMPLE} N/m, F = k x`),
        ]}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel="La vibración fija da 1,6 N a 2 mm y a 8 mm: su fuerza no dice dónde está el gatillo. El resorte de 400 N/m da 0,8 N a 2 mm y 3,2 N a 8 mm."
      />
    </div>
  );
}

/** The triangle under F = k x up to 8 mm, whose area is U = ½ k x², with its value inside. */
function EnergyArea({ scales }: { scales: { x: Scale; y: Scale } }): JSX.Element {
  const bottom = springAt(BOTTOM_MM);
  const corners = [
    [0, 0],
    [BOTTOM_MM, bottom.hooke],
    [BOTTOM_MM, 0],
  ].map(([x, y]) => `${scales.x.toPx(x)},${scales.y.toPx(y)}`);
  // The centroid of the triangle: a third of the way up from its base, two thirds along.
  const centroid = {
    x: scales.x.toPx((2 * BOTTOM_MM) / 3),
    y: scales.y.toPx(bottom.hooke / 3),
  };
  return (
    <g className="pointer-events-none">
      <polygon
        data-area="energia"
        points={corners.join(' ')}
        fill={HOOKE_COLOR}
        fillOpacity={AREA_OPACITY}
      />
      <Label at={centroid} dx={0} dy={AREA_LABEL_DROP} anchor="middle">
        {`U = ${formatNumber(bottom.energy, { precision: 1, unit: 'mJ' })}`}
      </Label>
    </g>
  );
}

function HookePlot(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const points: PlotPoint[] = [MID_MM, BOTTOM_MM].map((xMm) => ({
    id: `res-${xMm}`,
    x: xMm,
    y: springAt(xMm).hooke,
    label: newtons(springAt(xMm).hooke),
    anchor: 'end',
    color: HOOKE_COLOR,
  }));
  return (
    <div ref={ref} data-testid="haptic-figure-hooke">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fuerza del resorte ideal frente a su deformación, con la energía como área"
        {...FORCE_AXES}
        series={[
          { ...hookeSeries(K_EXAMPLE, `Resorte de ${K_EXAMPLE} N/m, F = k x`), dashed: false },
        ]}
        overlay={(scales) => (
          <>
            <EnergyArea scales={scales} />
            <PlotPoints points={points} scales={scales} />
          </>
        )}
        ariaLabel="La fuerza del resorte de 400 N/m crece en recta: 1,6 N a 4 mm y 3,2 N a 8 mm. El área bajo la recta hasta 8 mm es la energía guardada, 12,8 mJ."
      />
    </div>
  );
}

/** The static figures of Tema 5's steps 1–3. */
export default function HapticFigure({ variant }: HapticFigureProps): JSX.Element {
  switch (variant) {
    case 'vibracion':
      return <VibrationPlot />;
    case 'hooke':
      return <HookePlot />;
    case 'tercera-ley':
      return <ThirdLawDiagram />;
  }
}

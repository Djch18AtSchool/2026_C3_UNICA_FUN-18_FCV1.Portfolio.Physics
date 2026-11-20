/**
 * The support plots of Tema 13's lab, after its readouts: each server's flow against its minimum
 * (13.4); the pump's chart, whose cursor is the pump's flow (Deschutes' published curves, the
 * circuit's curve, the duty point and where the lowest published curve that gives it would run);
 * and the profile of the page's figure 13.2, recomputed for the lab's rack. All from the last
 * valid scene.
 */
import { memo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { TEXT_COLOR } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { Label } from '../../lab/OverlayMarks';
import { PlotPoints } from '../../lab/PlotPoints';
import type { Scale } from '../../lab/plotScales';
import SvgPlot, { STAGE_PLOT_ASPECT } from '../../lab/SvgPlot';
import CircuitProfileFigure from './CircuitProfileFigure';
import { pumpNote } from './coolingLabReadings';
import { pumpPlot, splitPlot, type PumpPlot } from './coolingLabPlots';
import type { CoolingScene } from './coolingScene';
import { L_PER_M3 } from './coolingUnits';

/** The values of the split's plot are already in L/min. */
const lpm = (value: number) => formatNumber(value, { precision: 2, unit: 'L/min' });
/** The off-scale marker: a triangle on the top edge, pointing up, and its label beside it. */
const EDGE_SIZE = 6;
const EDGE_LABEL_DX = 10;
const EDGE_LABEL_DY = 16;

/** The duty point above the pressure axis, on the top edge with its value. */
function EdgeMarker({
  edge,
  scales,
}: {
  edge: NonNullable<PumpPlot['edge']>;
  scales: { x: Scale; y: Scale };
}): JSX.Element {
  const x = scales.x.toPx(edge.x);
  const top = scales.y.toPx(scales.y.domain.max);
  const half = EDGE_SIZE / 2;
  return (
    <g data-point="pedido-fuera" className="pointer-events-none">
      <path
        d={`M${x - half} ${top + EDGE_SIZE} L${x + half} ${top + EDGE_SIZE} L${x} ${top} Z`}
        fill={TEXT_COLOR}
      />
      <Label at={{ x, y: top }} dx={-EDGE_LABEL_DX} dy={EDGE_LABEL_DY} anchor="end">
        {edge.label}
      </Label>
    </g>
  );
}

/** q_i against the port, with OCP's design target and the server that gets least. */
function SplitChart({ scene }: { scene: CoolingScene }): JSX.Element {
  const plot = splitPlot(scene);
  const flows = plot.series[0].points.map((point) => point.y);
  return (
    <div data-testid="cooling-split-plot">
      <SvgPlot
        aspectRatio={STAGE_PLOT_ASPECT}
        title="Caudal de cada servidor frente al objetivo de OCP"
        xLabel="Puerto $i$"
        xUnit="1 = abajo"
        yLabel="Caudal $q_i$"
        yUnit="L/min"
        series={plot.series}
        xDomain={plot.xDomain}
        yDomain={plot.yDomain}
        overlay={(scales) => <PlotPoints scales={scales} points={[plot.worst]} />}
        ariaLabel={mathTextToString(
          `Caudal de los ${flows.length} servidores, de ${lpm(Math.max(...flows))} a ${lpm(Math.min(...flows))}, frente al objetivo de diseño de OCP, ${lpm(plot.series[1].points[0].y)} por servidor. Recibe menos el servidor ${plot.worst.label}.`,
        )}
      />
    </div>
  );
}

interface PumpChartProps {
  scene: CoolingScene;
  /** The cursor sets the CDU's flow (m³/s); the lab turns it into the pump's flow per rack. */
  onCduFlow(Q: number): void;
}

/** Deschutes' curves, the circuit's, the duty point and the operating point; the cursor is Q_CDU. */
function PumpChart({ scene, onCduFlow }: PumpChartProps): JSX.Element {
  const plot = pumpPlot(scene);
  const note = pumpNote(scene);
  return (
    <div data-testid="cooling-pump-plot">
      <SvgPlot
        aspectRatio={STAGE_PLOT_ASPECT}
        title="Bomba del CDU: curvas de Deschutes y curva del circuito"
        xLabel="Caudal del CDU $Q_\text{CDU}$"
        xUnit="L/s"
        yLabel="Presión de la bomba $\Delta p$"
        yUnit="kPa"
        series={plot.series}
        xDomain={plot.xDomain}
        yDomain={plot.yDomain}
        cursor={{
          x: scene.cduFlow * L_PER_M3,
          onChange: (x) => onCduFlow(x / L_PER_M3),
          label: (x) => `$Q_\\text{CDU}$ = ${formatNumber(x, { precision: 1, unit: 'L/s' })}`,
          ariaLabel: 'Caudal de la bomba, $Q_\\text{CDU}$',
        }}
        overlay={(scales) => (
          <>
            <PlotPoints scales={scales} points={plot.points} />
            {plot.edge ? <EdgeMarker edge={plot.edge} scales={scales} /> : null}
          </>
        )}
        ariaLabel={mathTextToString(note)}
      />
      <p data-testid="cooling-pump-note" className="m-0 mt-3 text-sm">
        <InlineMath text={note} />
      </p>
    </div>
  );
}

export type CoolingLabChartsProps = PumpChartProps;

/**
 * The three plots, in the shell's column of support plots. Memoized: an edit that leaves the scene
 * as it was (a split that does not converge) redraws nothing.
 */
function CoolingLabCharts({ scene, onCduFlow }: CoolingLabChartsProps): JSX.Element {
  return (
    <>
      <SplitChart scene={scene} />
      <PumpChart scene={scene} onCduFlow={onCduFlow} />
      <CircuitProfileFigure config={scene.config} testId="cooling-lab-profile" />
    </>
  );
}

export default memo(CoolingLabCharts);

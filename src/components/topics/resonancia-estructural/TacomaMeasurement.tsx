import type { JSX } from 'react';
import { TACOMA_TORSION } from '../../../lib/data/bridges';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import SvgPlot, { type PlotAspect } from '../../lab/SvgPlot';
import { MEASURED_COLOR, measurementPlot, RAW_COLOR, REFERENCE_COLOR } from './resonancePlots';

/** The counting shot of the film (1:01,7–1:09,4): the deck edge seen from under the tower. */
const SHOT_ID = 'torre';
const PLOT = measurementPlot(TACOMA_TORSION, SHOT_ID);
const ASPECT: PlotAspect = { compact: 0.9, wide: 1.6 };
const DOMAIN = { x: { min: 0, max: 11 }, y: { min: -18, max: 16 } } as const;

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
const VIDEO_PERIOD = comma(PLOT.periodVideoS, 2);
const REAL_PERIOD = comma(PLOT.periodRealS, 2);

/**
 * My frame-by-frame measurement of the deck edge in the counting shot: as the file plays it, on
 * the real clock (× 24/16, Olson et al. 2015) and against Farquharson's 5 s of 1940, a sinusoid
 * fitted to the corrected series in amplitude, phase and mean level, its period kept at 5 s.
 */
export default function TacomaMeasurement(): JSX.Element {
  return (
    <div data-testid="tacoma-measurement">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Altura del borde del tablero medida cuadro a cuadro, en el tiempo del video y en el real"
        xLabel="Tiempo desde el inicio de la toma $t$"
        xUnit="s"
        yLabel="Altura del borde del tablero"
        yUnit="px"
        series={[
          {
            id: 'video',
            label: `Tal como corre el video ($T$ = ${VIDEO_PERIOD} s)`,
            points: PLOT.video,
            color: RAW_COLOR,
            dashed: true,
          },
          {
            id: 'real',
            label: `Corregida a tiempo real ($T$ = ${REAL_PERIOD} s)`,
            points: PLOT.real,
            color: MEASURED_COLOR,
          },
          {
            id: 'farquharson',
            label: `Cosenoide de ${comma(PLOT.farquharsonPeriodS, 1)} s de Farquharson`,
            points: PLOT.fit,
            color: REFERENCE_COLOR,
            dashed: true,
          },
        ]}
        xDomain={DOMAIN.x}
        yDomain={DOMAIN.y}
        ariaLabel={mathTextToString(
          `El borde del tablero sube y baja dos veces en la toma. Tal como corre el video, un ciclo dura ${VIDEO_PERIOD} s; estirado ${comma(PLOT.stretch, 1)} veces al tiempo real, ${REAL_PERIOD} s, y casi coincide con una cosenoide de ${comma(PLOT.farquharsonPeriodS, 1)} s, el periodo que cronometró Farquharson.`,
        )}
      />
    </div>
  );
}

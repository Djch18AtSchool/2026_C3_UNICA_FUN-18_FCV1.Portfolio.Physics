/** What the jump lab shows of its live jump: the plot's series, its description and the readouts. */
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics';
import type { LabReadout } from '../../lab/LabShell';
import type { PlotSeries } from '../../lab/SvgPlot';
import type { JumpResult, JumpSettings } from './jumpModel';
import { worldForGravity, worldForPreset } from './jumpWorlds';

/** The Earth reference wears Tierra's conventional color, dashed. */
const EARTH_COLOR = worldForPreset('tierra').color;

const toXY = (result: JumpResult) => result.points.map(({ x, y }) => ({ x, y }));

/** The live jump and, when shown, the Earth reference with the same launch speeds. */
export function jumpSeries(
  settings: JumpSettings,
  live: JumpResult,
  ghost: JumpResult | undefined,
  decimals: number,
): PlotSeries[] {
  const gravityText = (g: number) => formatNumber(g, { precision: decimals, unit: 'm/s²' });
  const world = worldForGravity(settings.g);
  return [
    ...(ghost
      ? [
          {
            id: 'ghost',
            label: `Referencia terrestre, g = ${gravityText(G_EARTH)}`,
            points: toXY(ghost),
            color: EARTH_COLOR,
            dashed: true,
          },
        ]
      : []),
    {
      id: 'live',
      label: `${world.name}, g = ${gravityText(settings.g)}`,
      points: toXY(live),
      color: world.color,
    },
  ];
}

export function describePlot(live: JumpResult, ghost: JumpResult | undefined): string {
  const m = (value: number) => formatNumber(value, { unit: 'm' });
  const own = `Trayectoria y(x): altura máxima ${m(live.hMax)}, alcance ${m(live.range)}`;
  return ghost
    ? `${own}; referencia terrestre: altura máxima ${m(ghost.hMax)}, alcance ${m(ghost.range)}.`
    : `${own}.`;
}

export function jumpReadouts(live: JumpResult): LabReadout[] {
  return [
    { id: 'hMax', label: 'Altura máxima', value: live.hMax, unit: 'm' },
    { id: 'tApex', label: 'Tiempo al ápice', value: live.tApex, unit: 's' },
    { id: 'tAir', label: 'Tiempo en el aire', value: live.tAir, unit: 's' },
    { id: 'range', label: 'Alcance', value: live.range, unit: 'm' },
  ];
}

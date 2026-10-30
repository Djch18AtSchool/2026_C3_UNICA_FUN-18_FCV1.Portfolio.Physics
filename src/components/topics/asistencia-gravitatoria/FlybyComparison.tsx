import type { JSX } from 'react';
import type { Encounter } from '../../../lib/data/voyager';
import { formatNumber } from '../../../lib/format';
import type { PlanarFlybyResult } from '../../../lib/physics';
import { signed } from './flybyFormat';

export interface FlybyComparisonProps {
  /** The encounter of the active preset; undefined once r_p or the side were edited. */
  encounter?: Encounter;
  result: PlanarFlybyResult;
  decimals: number;
}

const OUT_OF_PLANE = 'Giro fuera del plano: el modelo plano no reproduce el dato.';
const IN_PLANE = 'El modelo plano reproduce el dato.';
const DATA_NOTE =
  'Dato: cónicas empalmadas de la trayectoria de diseño de la misión, publicada por JPL Horizons.';
const EDITED =
  'Con r_p o el lado cambiados, el dato de la Voyager ya no aplica: las lecturas son las del modelo plano.';

const CELL = 'px-2 py-1 text-right font-mono tabular-nums';

/**
 * The planar model's result beside the Horizons value for the active preset, each column
 * labelled, so the planar number is never read as the real one. Encounters whose real turn
 * leaves the plane say so first.
 */
export default function FlybyComparison({
  encounter,
  result,
  decimals,
}: FlybyComparisonProps): JSX.Element {
  if (!encounter) return <p className="m-0 text-sm text-fg-muted">{EDITED}</p>;

  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  const rows = [
    { label: '|v| antes', model: kms(result.vIn), data: kms(encounter.conicBefore) },
    { label: '|v| después', model: kms(result.vOut), data: kms(encounter.conicAfter) },
    {
      label: 'Δ|v|',
      model: signed(result.vOut - result.vIn, decimals, 'km/s'),
      data: signed(encounter.conicAfter - encounter.conicBefore, decimals, 'km/s'),
    },
  ];

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p
        className={`m-0 font-medium ${encounter.planarTurnReproduces ? '' : 'border-l-2 border-accent pl-2'}`}
      >
        {encounter.planarTurnReproduces ? IN_PLANE : OUT_OF_PLANE}
      </p>
      <table aria-label="Modelo plano frente al dato" className="w-full max-w-md border-collapse">
        <thead>
          <tr className="border-b border-border text-fg-muted">
            <td className="px-2 py-1" />
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Modelo plano
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Dato (Horizons)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-dotted border-border">
              <th scope="row" className="px-2 py-1 text-left font-normal text-fg-muted">
                {row.label}
              </th>
              <td className={CELL}>{row.model}</td>
              <td className={CELL}>{row.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 text-xs text-fg-muted">{DATA_NOTE}</p>
    </div>
  );
}

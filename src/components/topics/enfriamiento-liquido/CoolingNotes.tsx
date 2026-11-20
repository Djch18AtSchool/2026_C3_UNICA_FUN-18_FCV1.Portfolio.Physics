/**
 * The canvas notes of Tema 13's lab: the key of the rack drawing and what is to scale in it, the
 * worst server's margin over OCP's design target (or what reaching it would take), and where
 * every value comes from (model vs product). Text only: no controls.
 */
import type { JSX } from 'react';
import { ORIGIN_LABELS } from '../../../lib/tables/topics/enfriamiento-liquido';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST, LegendItem } from '../../lab/LegendKey';
import { RETURN_COLOR, SUPPLY_COLOR } from './coolingPlots';
import { SCALE_NOTE, valueOrigins } from './coolingLabText';
import { shortfallNote } from './coolingLabReadings';
import type { CoolingLabState, CoolingScene } from './coolingScene';

const NOTE = 'm-0 text-sm';
/** A source may open with its origin («Supuesto: …»); the list prints the origin once, before it. */
const ORIGIN_LEAD = /^(?:Supuesto|Cálculo propio): /;
const withoutLead = (source: string) => source.replace(ORIGIN_LEAD, '');
const REST =
  'Los demás valores (el fluido, las tuberías, el manifold, el UQD04 y las longitudes) son los de las tablas 13.1 a 13.3, cada uno con su origen.';

export interface CoolingNotesProps {
  state: CoolingLabState;
  scene: CoolingScene;
}

export default function CoolingNotes({ state, scene }: CoolingNotesProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Leyenda del rack" className={LEGEND_LIST}>
        <LegendItem color={SUPPLY_COLOR} shape="line">
          Manifold de impulsión, frío
        </LegendItem>
        <LegendItem color={RETURN_COLOR} shape="line">
          Manifold de retorno, caliente
        </LegendItem>
        <LegendItem color={TEXT_COLOR} shape="line">
          Caudal de cada servidor
        </LegendItem>
        <LegendItem color={TICK_COLOR} shape="line" dashed>
          Objetivo de diseño de OCP por servidor
        </LegendItem>
      </ul>
      <p className={NOTE}>{SCALE_NOTE}</p>
      <p data-testid="cooling-shortfall" className={NOTE}>
        <InlineMath text={shortfallNote(scene)} />
      </p>
      <div className="flex flex-col gap-2">
        <p className={`${NOTE} font-medium`}>De dónde sale cada valor</p>
        <ul
          aria-label="Origen de cada valor"
          className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-fg-muted"
        >
          {valueOrigins(state, scene).map((row) => (
            <li key={row.id} className="m-0">
              <span className="font-medium text-fg">{row.text}.</span>{' '}
              <InlineMath text={`${ORIGIN_LABELS[row.origin]}: ${withoutLead(row.source)}`} />
            </li>
          ))}
        </ul>
        <p className={`${NOTE} text-fg-muted`}>{REST}</p>
      </div>
    </div>
  );
}

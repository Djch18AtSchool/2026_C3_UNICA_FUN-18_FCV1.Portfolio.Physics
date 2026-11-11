/**
 * Level 2 («Escenario») of Tema 1's laboratory: which view of the route plays. «Tramo» is one leg
 * between two stops at real speed, with the leg to fly chosen below; «Ruta» is the whole route
 * faster. The line under the choice says what the view covers, in the route's own seconds.
 */
import type { JSX } from 'react';
import type { LegSchedule } from '../../../lib/data/droneRoute';
import ChoiceField from '../../lab/ChoiceField';
import { SelectField } from '../../lab/SettingsFields';
import {
  legOptionLabel,
  viewNote,
  type RouteView,
  type ViewSelection,
  type ViewSpan,
} from './routeView';

export interface RouteViewFieldsProps {
  selection: ViewSelection;
  schedule: readonly LegSchedule[];
  /** The span the clock plays: the note says its start and its length. */
  span: ViewSpan;
  onView(view: RouteView): void;
  onLeg(leg: number): void;
}

const VIEW_OPTIONS = [
  { value: 'tramo', label: 'Tramo' },
  { value: 'ruta', label: 'Ruta' },
] as const;

export default function RouteViewFields({
  selection,
  schedule,
  span,
  onView,
  onLeg,
}: RouteViewFieldsProps): JSX.Element {
  return (
    <>
      <ChoiceField
        id="drone-view"
        label="Vista"
        value={selection.view}
        options={VIEW_OPTIONS}
        onChange={onView}
      />
      {selection.view === 'tramo' ? (
        <SelectField
          id="drone-leg"
          label="Tramo mostrado"
          stacked
          value={String(selection.leg)}
          options={schedule.map((leg, index) => ({
            value: String(index),
            label: legOptionLabel(leg),
          }))}
          onChange={(value) => onLeg(Number(value))}
        />
      ) : null}
      <p data-testid="drone-view-note" className="m-0 text-sm text-fg-muted">
        {viewNote(span, selection)}
      </p>
    </>
  );
}

import { segmentLoss, type Fluid, type Segment } from '../physics/hydraulics';
import { GF_PUBLISHED } from './liquidCooling';

/*
 * Tema 13: my losses along a path grouped as GF groups the RD109 losses in its fig. 2, next to
 * GF's published values (research docs/superpowers/research/2026-11-17-enfriamiento-liquido.md,
 * §7.1, «Comparación con el desglose de GF», with the errata of 2026-11-17). A component with a
 * Cv or a measured curve carries its whole loss (ruling R7); a hose's K (its tee) goes to GF's
 * «accesorios», its friction to the hose's own row.
 */

export type BreakdownId =
  | 'placas-frias'
  | 'qd-pequenos'
  | 'mangueras'
  | 'mangueras-rack'
  | 'qd-grande'
  | 'accesorios'
  | 'manifolds'
  | 'tuberias'
  | 'valvulas';

/** The rows in GF's order, with the rack hoses (which fig. 2 has no row for) after the 3/8″ ones. */
export const BREAKDOWN_ROWS: readonly { id: BreakdownId; label: string }[] = [
  { id: 'placas-frias', label: 'Placas frías y su tubería interna' },
  { id: 'qd-pequenos', label: 'Conectores pequeños (UQD04, ida y vuelta)' },
  { id: 'mangueras', label: 'Mangueras de 3/8″ del servidor' },
  { id: 'mangueras-rack', label: 'Mangueras de rack de 2″' },
  { id: 'qd-grande', label: 'Conector grande' },
  { id: 'accesorios', label: 'Accesorios (tes)' },
  { id: 'manifolds', label: 'Manifolds' },
  { id: 'tuberias', label: 'Tuberías principales' },
  { id: 'valvulas', label: 'Válvulas mariposa' },
];

/** Where each kind of segment goes: its K to `local` if given, the rest of its loss to `rest`. */
const RULES: readonly { prefix: string; rest: BreakdownId; local?: BreakdownId }[] = [
  { prefix: 'tuberia-', rest: 'tuberias' },
  { prefix: 'manguera-rack-', rest: 'mangueras-rack', local: 'accesorios' },
  { prefix: 'manifold', rest: 'manifolds' },
  { prefix: 'manguera-servidor-', rest: 'mangueras', local: 'accesorios' },
  { prefix: 'uqd-', rest: 'qd-pequenos' },
  { prefix: 'placa-fria', rest: 'placas-frias' },
];

/** GF's rows I do not model: the big quick disconnect and the butterfly valves. */
const NOT_MODELLED: ReadonlySet<BreakdownId> = new Set(['qd-grande', 'valvulas']);

export interface BreakdownRow {
  id: BreakdownId;
  label: string;
  /** My loss for the group (Pa); null for a group I do not model. */
  computed: number | null;
  /** GF's fig. 2 value (Pa); null for a group GF's figure has no row for. */
  published: number | null;
}

/** The loss of every segment of `path` at the path flow Q, summed by GF's groups. */
export function lossBreakdown(path: readonly Segment[], Q: number, f: Fluid): BreakdownRow[] {
  const totals = new Map<BreakdownId, number>();
  const add = (id: BreakdownId, dp: number) => totals.set(id, (totals.get(id) ?? 0) + dp);
  for (const segment of path) {
    const rule = RULES.find(({ prefix }) => segment.id.startsWith(prefix));
    if (!rule) throw new RangeError(`lossBreakdown: no GF group for segment "${segment.id}"`);
    const q = Q * (segment.flowMultiple ?? 1);
    const whole = segmentLoss(segment, q, f);
    const { K: _tee, ...withoutK } = segment;
    const rest = rule.local ? segmentLoss(withoutK, q, f) : whole;
    add(rule.rest, rest);
    if (rule.local) add(rule.local, whole - rest);
  }
  const published = new Map(GF_PUBLISHED.breakdown.map(({ id, dp }) => [id, dp]));
  return BREAKDOWN_ROWS.map(({ id, label }) => ({
    id,
    label,
    computed: NOT_MODELLED.has(id) ? null : (totals.get(id) ?? 0),
    published: published.get(id) ?? null,
  }));
}

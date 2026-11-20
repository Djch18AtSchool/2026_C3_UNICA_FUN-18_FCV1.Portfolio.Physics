import { describe, expect, test } from 'vitest';
import type { Phase } from '../consigna';
import {
  CLOSING_ANCHOR,
  CLOSING_PAIRS,
  CLOSING_TITLE,
  connectionMap,
  relatedNumbers,
  type MapLabel,
} from './closing';
import type { TopicSummary } from './topics';

/** The thirteen short titles of the course, as the topics' frontmatter writes them. */
const SHORT_TITLES = [
  'Dron de reparto',
  'El salto del personaje',
  'Gravedad artificial',
  'Llantas de Fórmula 1',
  'Control háptico',
  'Frenado regenerativo',
  'Coeficiente de restitución',
  'Ruedas de reacción',
  'Asistencia gravitatoria',
  'Animaciones con resorte',
  'Síntesis de sonido',
  'Resonancia estructural',
  'Enfriamiento líquido',
];
const phaseOf = (n: number): Phase => (n <= 5 ? 1 : n <= 9 ? 2 : 3);
const TOPICS_13: TopicSummary[] = SHORT_TITLES.map((shortTitle, index) => ({
  slug: `tema-${index + 1}`,
  number: index + 1,
  phase: phaseOf(index + 1),
  title: shortTitle,
  shortTitle,
  resourceType: 'diagrama',
}));
/** The `related` of every topic once the final delivery is in (spec §6, reciprocity included). */
const RELATED_13: ReadonlyMap<number, readonly number[]> = new Map([
  [1, [2, 3, 6]],
  [2, [1, 3, 7]],
  [3, [1, 4, 2, 8]],
  [4, [3, 5, 6]],
  [5, [4, 3, 7, 11, 12]],
  [6, [4, 1, 7, 13]],
  [7, [2, 5, 9, 10]],
  [8, [3, 9, 5]],
  [9, [7, 8, 3]],
  [10, [5, 7, 12]],
  [11, [5, 10, 12]],
  [12, [10, 11, 5]],
  [13, [6, 4]],
]);
const WIDTH = 960;

const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
const boxesOverlap = (p: Box, q: Box) =>
  p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
const labelBox = ({ x, y, width, height }: MapLabel): Box => ({
  left: x - width / 2,
  right: x + width / 2,
  top: y - height / 2,
  bottom: y + height / 2,
});

describe('the closing section', () => {
  test('anchors at #que-aprendi under its exact title', () => {
    expect(CLOSING_ANCHOR).toBe('que-aprendi');
    expect(CLOSING_TITLE).toBe('Qué aprendí');
  });

  test('pairs the three connections Dylan chose, each with its principle', () => {
    expect(CLOSING_PAIRS).toEqual([
      { a: 7, b: 9, principle: 'Momento lineal' },
      { a: 6, b: 13, principle: 'Energía con disipación' },
      { a: 11, b: 12, principle: 'Frecuencia natural' },
    ]);
  });
});

describe('connectionMap', () => {
  const map = connectionMap(TOPICS_13, RELATED_13, CLOSING_PAIRS, WIDTH);
  const nodeBox = (number: number): Box => {
    const node = map.nodes.find((candidate) => candidate.number === number)!;
    return {
      left: node.x - map.nodeWidth / 2,
      right: node.x + map.nodeWidth / 2,
      top: node.y - map.nodeHeight / 2,
      bottom: node.y + map.nodeHeight / 2,
    };
  };

  test('places the 13 topics in three columns, one per delivery, with 5, 4 and 4 nodes', () => {
    expect(map.nodes.map((node) => node.number)).toEqual(TOPICS_13.map((topic) => topic.number));
    const columns = [1, 2, 3].map((phase) => map.nodes.filter((node) => node.phase === phase));

    expect(columns.map((column) => column.length)).toEqual([5, 4, 4]);
    for (const column of columns) {
      expect(new Set(column.map((node) => node.x)).size).toBe(1);
    }
    expect(columns[0][0].x).toBeLessThan(columns[1][0].x);
    expect(columns[1][0].x).toBeLessThan(columns[2][0].x);
    expect(map.nodes.find((node) => node.number === 7)?.shortTitle).toBe(
      'Coeficiente de restitución',
    );
  });

  test('spaces every column with one vertical step and centres the shorter ones', () => {
    const steps = [1, 2, 3].flatMap((phase) => {
      const ys = map.nodes.filter((node) => node.phase === phase).map((node) => node.y);
      return ys.slice(1).map((y, index) => y - ys[index]);
    });

    expect(new Set(steps).size).toBe(1);
    const middle = (phase: Phase) => {
      const ys = map.nodes.filter((node) => node.phase === phase).map((node) => node.y);
      return (ys[0] + ys[ys.length - 1]) / 2;
    };
    expect(middle(2)).toBeCloseTo(middle(1));
    expect(middle(3)).toBeCloseTo(middle(1));
  });

  test('keeps every node inside the width and the height', () => {
    for (const { number } of map.nodes) {
      const box = nodeBox(number);
      expect(box.left, `tema ${number}`).toBeGreaterThanOrEqual(0);
      expect(box.right, `tema ${number}`).toBeLessThanOrEqual(WIDTH);
      expect(box.top, `tema ${number}`).toBeGreaterThanOrEqual(0);
      expect(box.bottom, `tema ${number}`).toBeLessThanOrEqual(map.height);
    }
  });

  test('labels each column with its delivery', () => {
    expect(map.columns.map(({ label }) => label)).toEqual([
      'Avance 1',
      'Avance 2',
      'Entrega Final',
    ]);
    expect(map.columns.map(({ x }) => x)).toEqual([
      nodeBox(1).left + map.nodeWidth / 2,
      nodeBox(6).left + map.nodeWidth / 2,
      nodeBox(10).left + map.nodeWidth / 2,
    ]);
  });

  test('highlights exactly the three pairs, each with its principle and a label', () => {
    const pairs = map.edges.filter((edge) => edge.isPair);

    expect(pairs.map(({ a, b, principle }) => ({ a, b, principle }))).toEqual(CLOSING_PAIRS);
    for (const pair of pairs) expect(pair.label?.text).toBe(pair.principle);
    for (const edge of map.edges.filter((candidate) => !candidate.isPair)) {
      expect(edge.principle).toBeUndefined();
      expect(edge.label).toBeUndefined();
    }
  });

  test('draws every related connection once, whichever topic declares it', () => {
    const keys = map.edges.map((edge) => edgeKey(edge.a, edge.b));
    const expected = new Set(
      [...RELATED_13].flatMap(([a, list]) => list.map((b) => edgeKey(a, b))),
    );

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys)).toEqual(expected);
    for (const edge of map.edges) expect(edge.a).toBeLessThan(edge.b);
  });

  test('lists the faint connections first, so the pairs are drawn on top', () => {
    const firstPair = map.edges.findIndex((edge) => edge.isPair);

    expect(map.edges.slice(firstPair).every((edge) => edge.isPair)).toBe(true);
  });

  test('still draws a pair that no topic declares as related', () => {
    const withoutPair = new Map(RELATED_13);
    withoutPair.set(11, [5, 10]);
    withoutPair.set(12, [10, 5]);
    const edges = connectionMap(TOPICS_13, withoutPair, CLOSING_PAIRS, WIDTH).edges;

    expect(edges.filter((edge) => edge.a === 11 && edge.b === 12)).toEqual([
      expect.objectContaining({ isPair: true, principle: 'Frecuencia natural' }),
    ]);
  });

  test('ignores a topic that declares itself', () => {
    const edges = connectionMap(TOPICS_13, new Map([[1, [1, 2]]]), [], WIDTH).edges;

    expect(edges.map((edge) => edgeKey(edge.a, edge.b))).toEqual(['1-2']);
  });

  test('renders whatever is registered: missing topics, their edges and pairs are skipped', () => {
    const nine = TOPICS_13.filter((topic) => topic.number <= 9);
    const partial = connectionMap(nine, RELATED_13, CLOSING_PAIRS, WIDTH);

    expect(partial.nodes).toHaveLength(9);
    expect(partial.edges.filter((edge) => edge.isPair).map((edge) => edge.principle)).toEqual([
      'Momento lineal',
    ]);
    for (const edge of partial.edges) {
      expect(edge.a).toBeLessThanOrEqual(9);
      expect(edge.b).toBeLessThanOrEqual(9);
    }
  });

  test('an empty site still has a height and no nodes', () => {
    const empty = connectionMap([], new Map(), CLOSING_PAIRS, WIDTH);

    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
    expect(empty.height).toBeGreaterThan(0);
  });

  test('puts every pair label clear of the nodes and of the other labels', () => {
    const labels = map.edges.flatMap((edge) => (edge.label ? [labelBox(edge.label)] : []));

    expect(labels).toHaveLength(3);
    labels.forEach((label, index) => {
      for (const { number } of map.nodes) {
        expect(boxesOverlap(label, nodeBox(number)), `etiqueta ${index}, tema ${number}`).toBe(
          false,
        );
      }
      for (const other of labels.slice(index + 1)) {
        expect(boxesOverlap(label, other), `etiquetas ${index}`).toBe(false);
      }
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.right).toBeLessThanOrEqual(WIDTH);
    });
  });

  test('bends a connection inside one column around the nodes between its ends', () => {
    const momentum = map.edges.find((edge) => edge.principle === 'Momento lineal')!;
    const between = nodeBox(8);

    // The label rides the bend: outside the column, level with the node it goes around.
    expect(labelBox(momentum.label!).right).toBeLessThan(between.left);
    expect(momentum.label!.y).toBeCloseTo((between.top + between.bottom) / 2);
    expect(momentum.d).toMatch(/^M [\d.]+ [\d.]+ Q /);
  });

  test('joins neighbours in one column with a straight segment between their boxes', () => {
    const frequency = map.edges.find((edge) => edge.principle === 'Frecuencia natural')!;
    const top = nodeBox(11);
    const bottom = nodeBox(12);
    const x = (top.left + top.right) / 2;

    expect(frequency.d).toBe(`M ${x} ${top.bottom} L ${x} ${bottom.top}`);
    expect(frequency.label!.y).toBeCloseTo((top.bottom + bottom.top) / 2);
  });

  test('joins two columns with a curve from one box side to the other', () => {
    const energy = map.edges.find((edge) => edge.principle === 'Energía con disipación')!;
    const from = nodeBox(6);
    const to = nodeBox(13);

    expect(energy.d.startsWith(`M ${from.right} ${(from.top + from.bottom) / 2} C `)).toBe(true);
    expect(energy.d.endsWith(`${to.left} ${(to.top + to.bottom) / 2}`)).toBe(true);
  });

  describe('a connection that skips a column', () => {
    /** The straight run of a path through the middle column: «L x y» after its first curve. */
    const run = (d: string) => {
      const match = / C [-\d. ]+ ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) C /.exec(d);
      if (!match) return undefined;
      const [, x1, y1, x2, y2] = match.map(Number);
      return { x1, x2, y: y1, isLevel: y1 === y2 };
    };
    const skipping = map.edges.filter((edge) => {
      const phases = [edge.a, edge.b].map(
        (n) => map.nodes.find((node) => node.number === n)!.phase,
      );
      return Math.abs(phases[0] - phases[1]) === 2;
    });
    const middle = map.nodes.filter((node) => node.phase === 2).map((node) => nodeBox(node.number));

    test('crosses the middle column level, between its boxes, never behind one', () => {
      expect(skipping.map((edge) => edgeKey(edge.a, edge.b))).toEqual([
        '4-13',
        '5-10',
        '5-11',
        '5-12',
      ]);
      for (const edge of skipping) {
        const straight = run(edge.d);
        expect(straight, edgeKey(edge.a, edge.b)).toBeDefined();
        expect(straight!.isLevel).toBe(true);
        expect(straight!.x1).toBeLessThan(middle[0].left);
        expect(straight!.x2).toBeGreaterThan(middle[0].right);
        for (const box of middle) {
          const isClear = straight!.y < box.top || straight!.y > box.bottom;
          expect(isClear, `${edgeKey(edge.a, edge.b)} y=${straight!.y}`).toBe(true);
        }
      }
    });

    test('does not start or end its run inside a pair’s label', () => {
      const labels = map.edges.flatMap((edge) => (edge.label ? [labelBox(edge.label)] : []));
      for (const edge of skipping) {
        const straight = run(edge.d)!;
        for (const label of labels) {
          for (const x of [straight.x1, straight.x2]) {
            const isInside =
              x >= label.left &&
              x <= label.right &&
              straight.y >= label.top &&
              straight.y <= label.bottom;
            expect(isInside, `${edgeKey(edge.a, edge.b)} en «${x}, ${straight.y}»`).toBe(false);
          }
        }
      }
    });
  });

  test('refuses a width too narrow for three columns of nodes', () => {
    expect(() => connectionMap(TOPICS_13, RELATED_13, CLOSING_PAIRS, 400)).toThrow(RangeError);
  });
});

describe('relatedNumbers', () => {
  test('resolves each topic’s related slugs to topic numbers', () => {
    const related = relatedNumbers([
      { number: 7, related: ['salto-personaje', 'asistencia-gravitatoria'] },
      { number: 9, related: ['coeficiente-restitucion'] },
    ]);

    expect([...related]).toEqual([
      [7, [2, 9]],
      [9, [7]],
    ]);
  });

  test('skips a slug that is not registered yet', () => {
    const related = relatedNumbers([{ number: 6, related: ['dron-reparto', 'no-registrado'] }]);

    expect(related.get(6)).toEqual([1]);
  });
});

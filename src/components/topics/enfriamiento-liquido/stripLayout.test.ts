import { describe, expect, test } from 'vitest';
import { PRESETS, rackPath } from '../../../lib/data/liquidCoolingCircuit';
import { linearScale, textWidth } from '../../lab/plotScales';
import { PROFILE_VIEWS, viewXDomain } from './coolingPlots';
import {
  LABEL_FONT_SIZE,
  LABEL_GAP,
  numberedLabels,
  placeLabels,
  STRIP_LABEL_ROWS,
  stripLabels,
  stripSections,
  type StripLabel,
} from './stripLayout';

const PATH = rackPath(PRESETS.referencia24);
const sections = stripSections(PATH);
const widthOf = (label: StripLabel) =>
  Math.max(...label.lines.map((line) => textWidth(line, LABEL_FONT_SIZE)));

describe('stripSections: the path as the strip draws it', () => {
  test('eleven sections, the manifold pieces merged, end to end over the 79,4 m', () => {
    expect(sections.map((s) => s.id)).toEqual([
      'tuberia-impulsion',
      'manguera-rack-impulsion',
      'manifold-impulsion',
      'manguera-servidor-impulsion',
      'uqd-impulsion',
      'placa-fria-retorno',
      'uqd-retorno',
      'manguera-servidor-retorno',
      'manifold-retorno',
      'manguera-rack-retorno',
      'tuberia-retorno',
    ]);
    expect(sections[0].x0).toBe(0);
    for (let i = 1; i < sections.length; i++) expect(sections[i].x0).toBe(sections[i - 1].x1);
    expect(sections.at(-1)?.x1).toBeCloseTo(79.4036, 4);
  });

  test('each section keeps its inner diameter: 130,9 → 50,8 → 37,7 (D_h) → 9,5 → 7,24 mm', () => {
    const mm = sections.map((s) => Number((s.diameter * 1e3).toFixed(2)));

    expect(mm.slice(0, 5)).toEqual([130.91, 50.8, 37.73, 9.5, 7.24]);
    expect(mm.slice(6)).toEqual([7.24, 9.5, 37.73, 50.8, 130.91]);
  });

  test('the supply sections are before the cold plate and the return ones from it on', () => {
    expect(sections.map((s) => s.side)).toEqual([
      ...Array(5).fill('impulsion'),
      ...Array(6).fill('retorno'),
    ]);
  });
});

describe('stripLabels: a name per section, grouped as the view needs', () => {
  const lines = (labels: StripLabel[]) =>
    labels.map((label) => label.lines.join(' · ').replace(/\u202f/g, ' '));

  test('the whole circuit: the two main pipes with their D, and the rack between them', () => {
    const labels = stripLabels(sections, 'grupo', viewXDomain(PATH, 'circuito'));

    expect(lines(labels)).toEqual([
      'Tubería principal · $D$ = 130,9 mm',
      'Rack',
      'Tubería principal · $D$ = 130,9 mm',
    ]);
  });

  test('the rack: its hoses and manifolds, and the server as one piece', () => {
    const labels = stripLabels(sections, 'parte', viewXDomain(PATH, 'rack'));

    expect(lines(labels)).toEqual([
      'Manguera de rack · $D$ = 50,8 mm',
      'Manifold · $D_h$ = 37,7 mm',
      'Servidor',
      'Manifold · $D_h$ = 37,7 mm',
      'Manguera de rack · $D$ = 50,8 mm',
    ]);
  });

  test('the server: every piece whose middle is in view, the plate drawn without scale', () => {
    const labels = stripLabels(sections, 'tramo', viewXDomain(PATH, 'servidor'));

    // The manifolds show only their ends here: they are named in the rack view.
    expect(lines(labels)).toEqual([
      'Manguera 3/8″ · $D$ = 9,5 mm',
      'UQD04 · $D$ = 7,24 mm',
      'Placa fría · sin escala',
      'UQD04 · $D$ = 7,24 mm',
      'Manguera 3/8″ · $D$ = 9,5 mm',
    ]);
  });
});

describe('placeLabels: rows below the strip, no two labels touching', () => {
  /** Every label of every view placed, each inside the plot and clear of its row's neighbours. */
  function expectAllPlaced(width: number, name: (labels: StripLabel[]) => StripLabel[]) {
    for (const view of PROFILE_VIEWS) {
      const domain = viewXDomain(PATH, view.id);
      const x = linearScale(domain, [48, width - 14]);
      const labels = name(stripLabels(sections, view.labelLevel, domain));

      const placed = placeLabels(labels, x, widthOf, LABEL_GAP);

      expect(
        placed.map((label) => label.id),
        `${view.id} at ${width}`,
      ).toEqual(labels.map((label) => label.id));
      for (const label of placed) {
        expect(label.row).toBeLessThan(STRIP_LABEL_ROWS);
        expect(label.centre - widthOf(label) / 2).toBeGreaterThanOrEqual(48);
        expect(label.centre + widthOf(label) / 2).toBeLessThanOrEqual(width - 14);
      }
      // A label never covers another one's anchor, so no leader line crosses a label.
      for (const label of placed) {
        expect(label.anchor).toBeTypeOf('number');
        for (const other of placed.filter((candidate) => candidate.id !== label.id)) {
          const covers = Math.abs(other.anchor - label.centre) < widthOf(label) / 2;
          expect(covers, `${view.id}: ${label.id} over ${other.id}`).toBe(false);
        }
      }
      for (let row = 0; row < STRIP_LABEL_ROWS; row++) {
        const inRow = placed.filter((label) => label.row === row);
        for (let i = 1; i < inRow.length; i++) {
          const end = inRow[i - 1].centre + widthOf(inRow[i - 1]) / 2;
          const start = inRow[i].centre - widthOf(inRow[i]) / 2;
          expect(start - end, `${view.id} row ${row}`).toBeGreaterThanOrEqual(LABEL_GAP);
        }
      }
    }
  }

  test('on a desktop column (720 px) every name of every view fits under its section', () => {
    expectAllPlaced(720, (labels) => labels);
  });

  test('on a 360 px phone (a 264 px drawing) the names give way to numbers, and those fit', () => {
    const domain = viewXDomain(PATH, 'rack');
    const x = linearScale(domain, [48, 250]);
    const labels = stripLabels(sections, 'parte', domain);

    expect(placeLabels(labels, x, widthOf, LABEL_GAP).length).toBeLessThan(labels.length);
    expect(numberedLabels(labels).map((label) => label.lines)).toEqual([
      ['1'],
      ['2'],
      ['3'],
      ['4'],
      ['5'],
    ]);
    expectAllPlaced(264, numberedLabels);
  });

  test('a label that finds no free row is left out rather than drawn over another', () => {
    const domain = viewXDomain(PATH, 'servidor');
    const x = linearScale(domain, [0, 60]);
    const labels = stripLabels(sections, 'tramo', domain);

    const placed = placeLabels(labels, x, widthOf, LABEL_GAP);

    expect(placed.length).toBeLessThan(labels.length);
  });
});

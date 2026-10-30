// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import {
  boxesOverlap,
  segmentHitsBox,
  textBox,
  type Box,
  type Segment,
} from '../../lab/labelClearance';
import { stubResizeObserver, viewBoxOf } from '../../lab/svgPlotTestKit';
import FlybyLab from './FlybyLab';

/** Panel widths: a 360 px phone and one column of the 1280 px layout (the panels cap at 380). */
const WIDTHS = [290, 380];
const PRESETS = [
  /^V2 · Júpiter/,
  /^V2 · Saturno/,
  /^V2 · Urano/,
  /^V2 · Neptuno/,
  /^V1 · Júpiter/,
  /^V1 · Saturno/,
];
const PLANET_LABELS = ['v∞,in', 'v∞,out'];
const SUN_LABELS = ['v antes', 'v después', 'δ'];
/** Corner texts inherit 12 px from their group; Labels set 13 px themselves. */
const CORNER_FONT = 12;
/** Room the drawing leaves around a corner text, px: it must not even graze it. */
const CORNER_MARGIN = 3;

function boxOf(text: SVGTextElement): Box {
  const fontSize = Number(text.getAttribute('font-size') ?? CORNER_FONT);
  const anchor = (text.getAttribute('text-anchor') ?? 'start') as 'start' | 'middle' | 'end';
  const at = { x: Number(text.getAttribute('x')), y: Number(text.getAttribute('y')) };
  return textBox(at, text.textContent ?? '', fontSize, anchor);
}

function textsOf(frame: Element): SVGTextElement[] {
  return [...frame.querySelectorAll('text')];
}

function labelBox(frame: Element, label: string): Box {
  const text = textsOf(frame).find((element) => element.textContent === label);
  expect(text, label).toBeDefined();
  return boxOf(text as SVGTextElement);
}

/** Straight strokes of a frame (arrow shafts, the periapsis line, the scale bar), except v_rel. */
function linesOf(frame: Element): Segment[] {
  return [...frame.querySelectorAll('line')]
    .filter((line) => !line.closest('[data-vector="vrel"]'))
    .map((line) => [
      { x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1')) },
      { x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2')) },
    ]);
}

function expectClear(frame: Element, labels: readonly string[]): void {
  const [, , width, height] = viewBoxOf(frame);
  const lines = linesOf(frame);
  const others = textsOf(frame).filter((text) => !labels.includes(text.textContent ?? ''));
  const boxes = labels.map((label) => labelBox(frame, label));
  boxes.forEach((box, index) => {
    const name = labels[index];
    expect(box.left, `${name}: left edge`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${name}: right edge`).toBeLessThanOrEqual(width);
    expect(box.top, `${name}: top edge`).toBeGreaterThanOrEqual(0);
    expect(box.bottom, `${name}: bottom edge`).toBeLessThanOrEqual(height);
    for (const line of lines) {
      expect(segmentHitsBox(line, box), `${name} crosses a line`).toBe(false);
    }
    for (const other of others) {
      expect(boxesOverlap(box, boxOf(other)), `${name} covers «${other.textContent}»`).toBe(false);
    }
    boxes.slice(index + 1).forEach((next, offset) => {
      expect(boxesOverlap(box, next), `${name} covers ${labels[index + 1 + offset]}`).toBe(false);
    });
  });
}

/** The track and the v∞ arrows keep out of the r_p readout and the scale bar's text. */
function expectCornersClear(frame: Element): void {
  const readout = boxOf(frame.querySelector('[data-testid="flyby-rp-value"]') as SVGTextElement);
  const bar = boxOf(
    textsOf(frame).find((text) =>
      /^\d+(,\d)? R_[A-Z]$/.test(text.textContent ?? ''),
    ) as SVGTextElement,
  );
  const d = frame.querySelector('path')?.getAttribute('d') ?? '';
  const track = [...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(([, x, y]) => ({
    x: Number(x),
    y: Number(y),
  }));
  const strokes: Segment[] = [
    ...track.slice(1).map((p, k): Segment => [track[k], p]),
    ...[...frame.querySelectorAll('[data-vector^="vinf"] line')].map((line): Segment => [
      { x: Number(line.getAttribute('x1')), y: Number(line.getAttribute('y1')) },
      { x: Number(line.getAttribute('x2')), y: Number(line.getAttribute('y2')) },
    ]),
  ];
  const heads = [...frame.querySelectorAll('[data-vector^="vinf"] polygon')].flatMap((polygon) => {
    const corners = (polygon.getAttribute('points') ?? '').split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });
    return corners.map((p, k): Segment => [p, corners[(k + 1) % corners.length]]);
  });
  for (const corner of [readout, bar]) {
    const margin = {
      left: corner.left - CORNER_MARGIN,
      right: corner.right + CORNER_MARGIN,
      top: corner.top - CORNER_MARGIN,
      bottom: corner.bottom + CORNER_MARGIN,
    };
    for (const stroke of [...strokes, ...heads]) expect(segmentHitsBox(stroke, margin)).toBe(false);
  }
}

describe('FlybyLab vector labels', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  describe.each(WIDTHS)('at %i px', (width) => {
    test.each(PRESETS)('%s: labels clear of arrows, readouts and each other', (preset) => {
      stubResizeObserver(width);
      render(<FlybyLab footnote="Nota." />);
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Valores de referencia' })).getByRole('button', {
          name: preset,
        }),
      );

      expectClear(screen.getByTestId('flyby-planet-frame'), PLANET_LABELS);
      expectClear(screen.getByTestId('flyby-sun-frame'), SUN_LABELS);
      expectCornersClear(screen.getByTestId('flyby-planet-frame'));
    });
  });

  test('at the ends of the r_p bar the labels stay clear too', () => {
    stubResizeObserver(WIDTHS[0]);
    render(<FlybyLab footnote="Nota." />);
    const handle = screen.getByTestId('periapsis-handle');

    for (const key of ['Home', 'End']) {
      fireEvent.keyDown(handle, { key });
      expectClear(screen.getByTestId('flyby-planet-frame'), PLANET_LABELS);
      expectClear(screen.getByTestId('flyby-sun-frame'), SUN_LABELS);
    }
  });
});

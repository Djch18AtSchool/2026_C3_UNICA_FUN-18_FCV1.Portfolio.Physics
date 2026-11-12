import { describe, expect, test } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { boxesOverlap } from '../../lab/labelClearance';
import { IDENTITY_VIEW, type ZoomView } from '../../lab/zoomMath';
import { flybyHyperbola } from './flybyOrbit';
import { FLYBY_PRESETS } from './flybyPresets';
import {
  BAR_INSET,
  cornerTexts,
  knobLabel,
  labelObstacles,
  placeVInfLabels,
  scaleBarSpot,
  type Panel,
} from './planetFrameLayout';
import { frameWorld, screenFrame } from './planetGeometry';
import { frameScaleBar } from './planetZoom';

const DEG = Math.PI / 180;
const planet = PLANETS.jupiter;
const hyperbola = flybyHyperbola({
  vInf: 10.7,
  rp: 10.09 * planet.radiusKm,
  GM: planet.gm,
  thetaIn: 100 * DEG,
  side: 'behind',
});
const NARROWEST: Panel = { width: 276, height: 276 };
const WIDEST: Panel = { width: 380, height: 380 };
const RP_VALUE = 'r_p = 100,00 R_J';
const RATE = 19_354;

const frameAt = (panel: Panel, view: ZoomView = IDENTITY_VIEW) => {
  const world = frameWorld(hyperbola, planet, panel.width, panel.height);
  return { world, screen: screenFrame(world, world.fitted, view, hyperbola, planet) };
};
const zoomedAbout = (scale: number, panel: Panel): ZoomView => ({
  scale,
  x: (panel.width / 2) * (1 - scale),
  y: (panel.height / 2) * (1 - scale),
});

describe('cornerTexts', () => {
  test.each([NARROWEST, WIDEST])('keeps the four corner texts apart at %o', (panel) => {
    const corners = cornerTexts(panel, RP_VALUE, RATE);
    const boxes = [corners.vpBox, ...corners.badge.boxes, corners.rpBox, corners.noteBox];

    boxes.forEach((box, index) => {
      boxes.slice(index + 1).forEach((other) => expect(boxesOverlap(box, other)).toBe(false));
    });
  });

  test('puts «planeta agrandado» at the right, on the line of the scale bar text, off its ticks', () => {
    const { noteBox, noteAt } = cornerTexts(WIDEST, RP_VALUE, RATE);
    const bar = frameScaleBar(1 / 3000, 'R_J', planet.radiusKm);
    if (!bar) throw new Error('no bar');
    const spot = scaleBarSpot(bar, WIDEST);
    const [ticks, text] = spot.boxes;

    expect(noteAt.x).toBe(WIDEST.width - 12);
    expect(noteBox.bottom).toBeLessThan(ticks.top);
    expect(noteBox.top).toBeGreaterThanOrEqual(WIDEST.height - 40);
    expect(text.bottom).toBeLessThanOrEqual(ticks.top);
  });
});

describe('scaleBarSpot', () => {
  test("starts at the panel's bottom-left corner and its baseline is the line labels keep off", () => {
    const bar = frameScaleBar(0.001, 'R_J', planet.radiusKm);
    const spot = scaleBarSpot(bar, WIDEST);

    expect(spot.at).toEqual({ x: 12, y: WIDEST.height - BAR_INSET });
    expect(spot.line[0]).toEqual(spot.at);
    expect(spot.line[1].x - spot.line[0].x).toBeCloseTo(bar?.px ?? Number.NaN, 9);
    expect(spot.boxes).toHaveLength(2);
  });

  test('has no boxes without a bar', () => {
    const spot = scaleBarSpot(undefined, WIDEST);

    expect(spot.boxes).toEqual([]);
    expect(spot.line[0]).toEqual(spot.line[1]);
  });
});

describe('knobLabel', () => {
  test('names the knob beside it while it is on the panel', () => {
    const label = knobLabel(frameAt(WIDEST).screen, WIDEST);

    expect(label).toBeDefined();
    expect(label?.box.right).toBeGreaterThan(label?.box.left ?? Number.NaN);
  });

  test('has no label once the zoom takes the knob off the panel', () => {
    const { screen } = frameAt(WIDEST, zoomedAbout(8, WIDEST));

    expect(knobLabel(screen, WIDEST)).toBeUndefined();
  });
});

describe('placeVInfLabels', () => {
  const place = (panel: Panel, view: ZoomView) => {
    const { world, screen } = frameAt(panel, view);
    const corners = cornerTexts(panel, RP_VALUE, RATE);
    const bar = scaleBarSpot(frameScaleBar(0.0005 * view.scale, 'R_J', planet.radiusKm), panel);
    const obstacles = labelObstacles(corners, bar, screen, knobLabel(screen, panel), true);
    return placeVInfLabels({ screen, world, panel, obstacles, barLine: bar.line });
  };

  test("places both labels at the lab's own framing, inside the panel", () => {
    const labels = place(WIDEST, IDENTITY_VIEW);

    for (const label of [labels.in, labels.out]) {
      expect(label).toBeDefined();
      expect(label?.box.left).toBeGreaterThanOrEqual(0);
      expect(label?.box.right).toBeLessThanOrEqual(WIDEST.width);
    }
  });

  test('leaves out the label of an arrow that has left the panel', () => {
    const labels = place(WIDEST, zoomedAbout(8, WIDEST));

    expect(labels.in).toBeUndefined();
    expect(labels.out).toBeUndefined();
  });
});

describe('labelObstacles', () => {
  test('lists the note only while it is shown, and the knob label only while it exists', () => {
    const { screen } = frameAt(WIDEST);
    const corners = cornerTexts(WIDEST, RP_VALUE, RATE);
    const bar = scaleBarSpot(undefined, WIDEST);
    const knob = knobLabel(screen, WIDEST);

    const withAll = labelObstacles(corners, bar, screen, knob, true);
    const without = labelObstacles(corners, bar, screen, undefined, false);

    expect(withAll.length - without.length).toBe(2);
    expect(withAll).toContain(corners.noteBox);
    expect(without).not.toContain(corners.noteBox);
  });
});

describe('placeVInfLabels over every encounter, side, zoom and pan', () => {
  const ZOOMS = [1, Math.SQRT2, 2, 4, 8];
  /** Arrow-key presses of the canvas (48 px each) in every direction, and the view as it opens. */
  const PANS = [
    { x: 0, y: 0 },
    { x: 48, y: 0 },
    { x: -48, y: 0 },
    { x: 0, y: 48 },
    { x: 0, y: -48 },
    { x: -96, y: 48 },
    { x: 96, y: -96 },
  ];

  test('no label is drawn cut by the panel: its whole box is inside', () => {
    const cut: string[] = [];
    let drawn = 0;
    for (const { name, values } of FLYBY_PRESETS) {
      const p = PLANETS[values.encounter.planet];
      for (const side of ['behind', 'front'] as const) {
        const h = flybyHyperbola({
          vInf: values.encounter.vInf,
          rp: values.rp * p.radiusKm,
          GM: p.gm,
          thetaIn: values.encounter.thetaInDeg * DEG,
          side,
        });
        const world = frameWorld(h, p, WIDEST.width, WIDEST.height);
        for (const scale of ZOOMS) {
          for (const pan of PANS) {
            const view = { ...zoomedAbout(scale, WIDEST) };
            const moved = { scale, x: view.x + pan.x, y: view.y + pan.y };
            const screen = screenFrame(world, world.fitted, moved, h, p);
            const corners = cornerTexts(WIDEST, RP_VALUE, RATE);
            const bar = scaleBarSpot(undefined, WIDEST);
            const obstacles = labelObstacles(corners, bar, screen, knobLabel(screen, WIDEST), true);
            const labels = placeVInfLabels({
              screen,
              world,
              panel: WIDEST,
              obstacles,
              barLine: bar.line,
            });
            for (const label of [labels.in, labels.out]) {
              if (!label) continue;
              drawn += 1;
              const { box } = label;
              const isWhole =
                box.left >= 0 &&
                box.top >= 0 &&
                box.right <= WIDEST.width &&
                box.bottom <= WIDEST.height;
              if (!isWhole) cut.push(`${name} ${side} ×${scale} ${pan.x},${pan.y}`);
            }
          }
        }
      }
    }

    expect(drawn).toBeGreaterThan(0);
    expect(cut).toEqual([]);
  });
});

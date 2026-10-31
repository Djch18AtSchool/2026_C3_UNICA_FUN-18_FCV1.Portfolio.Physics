// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import WheelLab from './WheelLab';

type Point = { x: number; y: number };

const DEG = Math.PI / 180;
const TIMELINE_MAX = 1000;

const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const scene = () => screen.getByTestId('wheel-scene');

/** `rotate(a cx cy)` of an SVG transform attribute. */
function parseRotate(transform: string | null): { degrees: number; about: Point } {
  const match = /rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/.exec(transform ?? '');
  if (!match) throw new Error(`No rotate in "${transform}"`);
  return { degrees: Number(match[1]), about: { x: Number(match[2]), y: Number(match[3]) } };
}

/** SVG's rotate(a cx cy): clockwise on screen (y down). */
function svgRotate(p: Point, degrees: number, about: Point): Point {
  const cos = Math.cos(degrees * DEG);
  const sin = Math.sin(degrees * DEG);
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * cos - dy * sin, y: about.y + dx * sin + dy * cos };
}

const parsePoints = (points: string | null): Point[] =>
  (points ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .map(([x, y]) => ({ x, y }));

/** The nose polygon (the second one) of a body, in canvas coordinates. */
function nose(body: 'live' | 'target'): Point[] {
  const polygon = scene().querySelectorAll(`[data-body="${body}"] polygon`)[1];
  const points = parsePoints(polygon.getAttribute('points'));
  if (body === 'target') return points;
  const turn = parseRotate(
    scene().querySelector('[data-body-turn]')?.getAttribute('transform') ?? '',
  );
  return points.map((p) => svgRotate(p, turn.degrees, turn.about));
}

describe('WheelScene turning sense (SVG rotates clockwise; the lab counts counterclockwise)', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('at the end of the maneuver the live nose lands on the dashed target nose', () => {
    render(<WheelLab />);

    fireEvent.change(timeline(), { target: { value: String(TIMELINE_MAX) } });

    const live = nose('live');
    const target = nose('target');
    expect(live).toHaveLength(3);
    live.forEach((p, i) => {
      expect(p.x).toBeCloseTo(target[i].x, 1);
      expect(p.y).toBeCloseTo(target[i].y, 1);
    });
  });

  test('mid-maneuver the ω_w arc sits above the wheel centre, where its 90° centre line points', () => {
    render(<WheelLab />);
    fireEvent.change(timeline(), { target: { value: String(TIMELINE_MAX / 2) } });
    const arc = scene().querySelector('[data-rate="ω_w"]') as SVGGElement;
    const turn = parseRotate(arc.getAttribute('transform'));
    const d = arc.querySelector('path')?.getAttribute('d') ?? '';
    const [, startX, startY, endX, endY] =
      /M([-\d.]+) ([-\d.]+) A.* ([-\d.]+) ([-\d.]+)$/.exec(d) ?? [];

    const start = svgRotate({ x: Number(startX), y: Number(startY) }, turn.degrees, turn.about);
    const end = svgRotate({ x: Number(endX), y: Number(endY) }, turn.degrees, turn.about);

    expect(start.y).toBeLessThan(turn.about.y);
    expect(end.y).toBeLessThan(turn.about.y);
    expect(Math.abs((start.x + end.x) / 2 - turn.about.x)).toBeLessThan(1);
  });
});

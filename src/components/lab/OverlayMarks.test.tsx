// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { Arrow, ARROW_HEAD } from './OverlayMarks';

function headsOf(to: { x: number; y: number }, dashed = false): number {
  const { container } = render(
    <svg>
      <Arrow from={{ x: 0, y: 0 }} to={to} color="var(--accent)" dashed={dashed} />
    </svg>,
  );
  return container.querySelectorAll('polygon').length;
}

describe('Arrow', () => {
  afterEach(cleanup);

  test('an arrow exactly as long as its head still draws the head, despite float error', () => {
    const angle = (-66 * Math.PI) / 180;
    const to = { x: ARROW_HEAD * Math.sin(angle), y: -ARROW_HEAD * Math.cos(angle) };
    expect(Math.hypot(to.x, to.y)).not.toBe(ARROW_HEAD);

    expect(headsOf(to)).toBe(1);
    expect(headsOf({ x: ARROW_HEAD, y: 0 })).toBe(1);
  });

  test('an arrow shorter than its head draws only the shaft', () => {
    expect(headsOf({ x: ARROW_HEAD / 2, y: 0 })).toBe(0);
  });

  test('a dashed arrow dashes its shaft only', () => {
    const { container } = render(
      <svg>
        <Arrow from={{ x: 0, y: 0 }} to={{ x: 40, y: 0 }} color="red" dashed />
      </svg>,
    );
    expect(container.querySelector('line')?.getAttribute('stroke-dasharray')).toBe('6 3');
    expect(container.querySelector('polygon')?.getAttribute('stroke-dasharray')).toBeNull();
  });
});

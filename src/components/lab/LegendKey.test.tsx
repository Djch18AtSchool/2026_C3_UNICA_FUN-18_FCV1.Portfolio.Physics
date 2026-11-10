// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { LegendItem, LegendKey, LEGEND_LIST } from './LegendKey';

describe('LegendKey', () => {
  afterEach(cleanup);

  test('an arrow is a line ending where its head starts, and the head reaches the tip', () => {
    const { container } = render(<LegendKey color="red" />);

    const line = container.querySelector('line')!;
    const head = container.querySelector('polygon')!;
    const tip = head.getAttribute('points')!.split(' ')[0];
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(Number(line.getAttribute('x2'))).toBeLessThan(Number(tip.split(',')[0]));
    expect(line).toHaveAttribute('stroke', 'red');
    expect(line).not.toHaveAttribute('stroke-dasharray');
  });

  test('a line has no head; a dot is only a circle; a dashed key dashes its line', () => {
    const line = render(<LegendKey color="blue" shape="line" dashed />);
    expect(line.container.querySelector('polygon')).toBeNull();
    expect(line.container.querySelector('line')).toHaveAttribute('stroke-dasharray');
    line.unmount();

    const dot = render(<LegendKey color="green" shape="dot" />);
    expect(dot.container.querySelector('line')).toBeNull();
    expect(dot.container.querySelector('circle')).toHaveAttribute('fill', 'green');
  });

  test('a thick key draws a thicker line than a normal one', () => {
    const normal = render(<LegendKey color="red" />);
    const thin = Number(normal.container.querySelector('line')!.getAttribute('stroke-width'));
    normal.unmount();

    const thick = render(<LegendKey color="red" weight="thick" />);
    expect(
      Number(thick.container.querySelector('line')!.getAttribute('stroke-width')),
    ).toBeGreaterThan(thin);
  });

  test('an item is a list entry with its key before its text', () => {
    render(
      <ul className={LEGEND_LIST}>
        <LegendItem color="red">Ruta</LegendItem>
      </ul>,
    );

    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('Ruta');
    expect(item.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  });
});

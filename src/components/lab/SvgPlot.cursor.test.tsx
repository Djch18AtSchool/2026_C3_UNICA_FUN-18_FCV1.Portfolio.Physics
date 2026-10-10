// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import type { Scale } from './plotScales';
import SvgPlot from './SvgPlot';
import { mockIdentityCtm, PROPS } from './svgPlotTestKit';

describe('SvgPlot cursor', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('exposes a focusable slider labelled by the x axis', () => {
    render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);

    const slider = screen.getByRole('slider', { name: 'x' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '10');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    expect(slider).toHaveAttribute('tabindex', '0');
  });

  test('ArrowRight calls onChange with a greater value', () => {
    const onChange = vi.fn();
    render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeGreaterThan(5);
  });

  test('arrows move by 1 % of the domain and by 10 % with Shift', () => {
    const onChange = vi.fn();
    render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });

    expect(onChange.mock.calls[0][0]).toBeCloseTo(4.9);
    expect(onChange.mock.calls[1][0]).toBeCloseTo(6);
  });

  test('Home and End jump to the domain ends and moves are clamped', () => {
    const onChange = vi.fn();
    render(<SvgPlot {...PROPS} cursor={{ x: 9.95, onChange }} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'End' });

    expect(onChange.mock.calls.map(([x]) => x)).toEqual([10, 0, 10]);
  });

  test('ignores keys that do not move the cursor', () => {
    const onChange = vi.fn();
    render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'a' });

    expect(onChange).not.toHaveBeenCalled();
  });

  test('dragging maps the pointer through the screen CTM and clamps it', () => {
    const onChange = vi.fn();
    let xScale: Scale | undefined;
    render(
      <SvgPlot
        {...PROPS}
        cursor={{ x: 5, onChange }}
        overlay={({ x }) => {
          xScale = x;
          return null;
        }}
      />,
    );
    const slider = screen.getByRole('slider');
    mockIdentityCtm(slider);
    const grabbed = xScale!.toPx(5);
    const target = xScale!.toPx(7.5);

    fireEvent.pointerDown(slider, { pointerId: 1, clientX: grabbed, clientY: 100 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: target, clientY: 100 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 5000, clientY: 100 });
    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: target, clientY: 100 });

    expect(onChange.mock.calls.map(([x]) => x)).toEqual([7.5, 10]);
  });

  test('keeps the grab offset so the knob does not jump to the pointer', () => {
    const onChange = vi.fn();
    let xScale: Scale | undefined;
    render(
      <SvgPlot
        {...PROPS}
        cursor={{ x: 5, onChange }}
        overlay={({ x }) => {
          xScale = x;
          return null;
        }}
      />,
    );
    const slider = screen.getByRole('slider');
    mockIdentityCtm(slider);
    // Grab 8 px right of the line, then move by the pixels of 2.5 m.
    const grabbed = xScale!.toPx(5) + 8;
    const delta = xScale!.toPx(2.5) - xScale!.toPx(0);

    fireEvent.pointerDown(slider, { pointerId: 1, clientX: grabbed, clientY: 100 });
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: grabbed + delta, clientY: 100 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeCloseTo(7.5, 6);
  });

  test('renders the cursor label near the handle', () => {
    render(
      <SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {}, label: (x) => `x = ${x} m` }} />,
    );

    expect(screen.getByText('x = 5 m')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'x = 5 m');
  });

  test('draws a read-only cursor line without a slider when there is no onChange', () => {
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5 }} />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(container.querySelector('[data-cursor] line')).toBeInTheDocument();
  });
});

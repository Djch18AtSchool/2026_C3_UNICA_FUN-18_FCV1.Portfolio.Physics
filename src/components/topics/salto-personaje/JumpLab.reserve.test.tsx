// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { resolveCssLength } from '../../../test-css-length';
import { installDialogPolyfill } from '../../../test-dialog';
import { WIDE_FROM_PX } from '../../lab/svgPlotReserve';
import { stubResizeObserver, viewBoxOf } from '../../lab/svgPlotTestKit';
import JumpLab from './JumpLab';

/** Stage widths across SvgPlot's compact layout, its switch and past it. */
const WIDTHS = [300, 320, 360, 414, 479, 520];
const HEIGHT_TOLERANCE_PX = 1;

const plot = () =>
  within(screen.getByTestId('jump-plot')).getByRole('img') as unknown as SVGSVGElement;

/**
 * Tema 2's trajectory has equal units on both axes: its reserve is the margins plus the data's
 * slope times the plot width, its compact left margin fitted at 360 px. With the lab's real data,
 * the reserved height must be the drawn one at every compact width too, not only at 360.
 */
describe('JumpLab: the trajectory reserves the height it draws', () => {
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

  test.each(WIDTHS)('at %s px', (width) => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<JumpLab />);
    const layout = width >= WIDE_FROM_PX ? 'wide' : 'compact';
    const reserved = resolveCssLength(plot().style.getPropertyValue(`--plot-height-${layout}`), {
      container: width,
    });
    cleanup();
    vi.unstubAllGlobals();

    stubResizeObserver(Math.round(width));
    render(<JumpLab />);
    const [, , viewWidth, viewHeight] = viewBoxOf(plot());

    expect(Math.abs(reserved - (viewHeight * width) / viewWidth)).toBeLessThan(HEIGHT_TOLERANCE_PX);
  });
});

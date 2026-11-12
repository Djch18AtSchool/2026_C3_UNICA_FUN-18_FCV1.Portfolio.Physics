// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import { useZoomPan } from './useZoomPan';
import ZoomOverlay from './ZoomOverlay';

const KM = [{ label: 'km', size: 1 }];

function Canvas({ withBar = true, orientation }: { withBar?: boolean; orientation?: 'row' }) {
  const zoom = useZoomPan({ label: 'Mapa de prueba' });
  return (
    <div {...zoom.viewportProps}>
      <ZoomOverlay
        zoom={zoom}
        orientation={orientation}
        scaleBar={withBar ? { pxPerUnit: 0.15 * zoom.view.scale, units: KM } : undefined}
      />
    </div>
  );
}

describe('ZoomOverlay', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    resetSettingsForTests();
  });

  test('one strip along the bottom: the scale bar, then the buttons at the end, wrapping', () => {
    const { container } = render(<Canvas />);
    const strip = container.querySelector<HTMLElement>('[data-zoom-overlay]')!;
    const bar = strip.querySelector<HTMLElement>('div[data-scale-bar]')!;
    const controls = strip.querySelector<HTMLElement>('[data-zoom-controls]')!;

    for (const name of ['absolute', 'inset-x-2', 'bottom-2', 'flex-wrap', 'items-end']) {
      expect(strip.className).toContain(name);
    }
    expect(strip.className).toContain('pointer-events-none');
    expect(bar.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.className).not.toMatch(/\babsolute\b/u);
    expect(controls.className).not.toMatch(/\babsolute\b/u);
    expect(controls.closest('[data-zoom-overlay] > *')?.className).toContain('ml-auto');
    expect(controls.closest('[data-zoom-overlay] > *')?.className).toContain('pointer-events-auto');
  });

  test('passes the orientation on, and goes without a bar', () => {
    const { container } = render(<Canvas withBar={false} orientation="row" />);

    expect(container.querySelector('[data-scale-bar]')).toBeNull();
    expect(container.querySelector('[data-zoom-controls]')?.className).toContain('flex-row');
  });

  test('still holds the canvas’ instructions and the zoom’s words', () => {
    const { container } = render(<Canvas />);
    const viewport = container.querySelector('[data-zoom-viewport]')!;

    expect(document.getElementById(viewport.getAttribute('aria-describedby')!)).not.toBeNull();
    expect(container.querySelector('[data-scale-bar-words]')).not.toBeNull();
  });
});

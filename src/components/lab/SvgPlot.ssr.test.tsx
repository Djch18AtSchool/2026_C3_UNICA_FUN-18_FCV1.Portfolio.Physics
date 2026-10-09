import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import SvgPlot from './SvgPlot';

describe('SvgPlot on the server', () => {
  test('renders its markup without a window, cursor included', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <SvgPlot
        title="Trayectoria"
        xLabel="x"
        xUnit="m"
        yLabel="y"
        yUnit="m"
        series={[
          {
            id: 's',
            label: 'S',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ],
          },
        ]}
        cursor={{ x: 0.5, onChange: () => {} }}
        ariaLabel="Recta"
      />,
    );

    expect(html).toContain('<svg');
    expect(html).toContain('role="slider"');
    expect(html).toContain('x (m)');
  });
});

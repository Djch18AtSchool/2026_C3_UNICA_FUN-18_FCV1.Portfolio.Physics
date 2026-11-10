import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import LabShell from './LabShell';

describe('LabShell on the server', () => {
  test('renders its markup without a window, the drawer closed', () => {
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <LabShell
        title="Laboratorio"
        readouts={[{ id: 'range', label: 'Alcance', value: 2, unit: 'm' }]}
        levels={{
          params: null,
          display: [
            { key: 'trail', label: 'Rastro', kind: 'toggle', value: true, onChange: () => {} },
          ],
        }}
        onReset={() => {}}
        testId="lab"
      >
        <svg />
      </LabShell>,
    );

    expect(html).toContain('data-testid="lab"');
    expect(html).toContain('Ajustes del simulador');
    expect(html).toMatch(/<dialog(?![^>]*\sopen)[^>]*>/);
  });

  test('renders its levels, chips and closed disclosures on the server', () => {
    const html = renderToString(
      <LabShell
        title="Laboratorio"
        readouts={[{ id: 'range', label: 'Alcance', value: 2, unit: 'm' }]}
        levels={{
          params: <input aria-label="Impulso" />,
          scenario: <p>escenario</p>,
          display: [
            {
              key: 'trail',
              label: 'Rastro',
              chip: 'estela',
              kind: 'toggle',
              value: true,
              onChange: () => {},
            },
          ],
        }}
        notes={{ usage: ['Arrastra.'], leftOut: ['Sin aire.'] }}
        onReset={() => {}}
        testId="lab"
      >
        <svg />
      </LabShell>,
    );

    expect(html).toContain('data-lab-shell="tiered"');
    expect(html).toContain('aria-label="estela"');
    expect(html).toMatch(/<details(?![^>]*\sopen)[^>]*>/);
    expect(html).toMatch(/<dialog(?![^>]*\sopen)[^>]*>/);
  });
});

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
        params={null}
        localSettings={[
          { key: 'trail', label: 'Rastro', kind: 'toggle', value: true, onChange: () => {} },
        ]}
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
});

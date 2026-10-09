// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import DroneProfiles from './DroneProfiles';

describe('DroneProfiles', () => {
  afterEach(cleanup);

  test('announces the loading state, then shows the explorer once the dataset arrives', async () => {
    render(<DroneProfiles />);
    const root = screen.getByTestId('drone-profiles');

    expect(root).toHaveAttribute('data-ready', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando los datos de la ruta…');

    expect(await screen.findByLabelText(/^Tiempo/)).toBeInTheDocument();
    expect(root).toHaveAttribute('data-ready', 'true');
    expect(screen.queryByText('Cargando los datos de la ruta…')).toBeNull();
    expect(screen.getByTestId('route-map')).toBeInTheDocument();
  });
});

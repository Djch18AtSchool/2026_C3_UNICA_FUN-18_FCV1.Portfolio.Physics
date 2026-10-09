// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ControlPanel from './ControlPanel';

describe('ControlPanel', () => {
  afterEach(cleanup);

  test('renders the title as a heading and its children', () => {
    render(
      <ControlPanel title="Parámetros" onReset={() => {}}>
        <p>contenido</p>
      </ControlPanel>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Parámetros' })).toBeInTheDocument();
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  test('calls onReset when "Restablecer" is pressed', () => {
    const onReset = vi.fn();
    render(
      <ControlPanel title="Parámetros" onReset={onReset}>
        <p>contenido</p>
      </ControlPanel>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});

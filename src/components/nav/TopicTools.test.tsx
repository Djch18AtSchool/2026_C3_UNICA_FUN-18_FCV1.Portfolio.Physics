// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import TopicTools from './TopicTools';
import { embedScriptText } from '../../lib/scriptText';

const URL = 'https://example.org/temas/salto-personaje/';
const GITHUB_URL = 'https://github.com/u/r/blob/main/src/content/topics/salto-personaje.mdx';
const MARKDOWN_ID = 'topic-markdown';
const MARKDOWN = 'Introducción.\n\n<Step n={1} title="Uno">\n\n</Step>\n<script>x</script>';
const CONFIRM_MS = 1000;

/** The icon the control shows: a copy button keeps its other face, aria-hidden, in the DOM. */
function iconOf(control: HTMLElement): Element | null {
  return (
    control.querySelector('[aria-hidden="false"] > svg[data-icon]') ??
    control.querySelector('svg[data-icon]')
  );
}

function renderTools() {
  return render(<TopicTools url={URL} githubUrl={GITHUB_URL} markdownElementId={MARKDOWN_ID} />);
}

describe('TopicTools', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const embed = document.createElement('script');
    embed.type = 'text/plain';
    embed.id = MARKDOWN_ID;
    embed.textContent = embedScriptText(MARKDOWN);
    document.body.append(embed);
  });
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('muestra los dos botones de copiar y el enlace a GitHub', () => {
    renderTools();

    expect(screen.getByRole('button', { name: 'Copiar URL' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: 'Copiar Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir en GitHub' })).toHaveAttribute(
      'href',
      GITHUB_URL,
    );
  });

  test('cada herramienta lleva su icono decorativo y el enlace, la flecha de salida', () => {
    renderTools();

    for (const name of ['Copiar URL', 'Copiar Markdown']) {
      const icon = iconOf(screen.getByRole('button', { name }));
      expect(icon).toHaveAttribute('data-icon', 'copy');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
    const link = screen.getByRole('link', { name: 'Abrir en GitHub' });
    expect(iconOf(link)).toHaveAttribute('data-icon', 'github');
    expect(link.querySelector('svg[data-icon="external"]')).toHaveAttribute('aria-hidden', 'true');
    expect(link).toHaveTextContent(/GitHub$/);
  });

  test('el estado vacío queda fuera del flujo de la fila y no añade un hueco', () => {
    renderTools();

    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.getByRole('status')).toHaveClass('sr-only');
  });

  test('"Copiar URL" copia la URL y confirma con "Copiado" durante un segundo', async () => {
    renderTools();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar URL' }));
    });

    expect(writeText).toHaveBeenCalledWith(URL);
    const copied = screen.getByRole('button', { name: 'Copiado' });
    expect(iconOf(copied)).toHaveAttribute('data-icon', 'check');
    expect(iconOf(copied)).toHaveClass('text-accent');
    expect(screen.getByRole('status')).toHaveTextContent('Copiado');
    // The button already shows it: the status only speaks, out of the row's flow.
    expect(screen.getByRole('status')).toHaveClass('sr-only');

    act(() => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });

    const restored = screen.getByRole('button', { name: 'Copiar URL' });
    expect(iconOf(restored)).toHaveAttribute('data-icon', 'copy');
    expect(screen.queryByRole('button', { name: 'Copiado' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  test('"Copiar Markdown" copia el cuerpo embebido sin escapes', async () => {
    renderTools();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }));
    });

    expect(writeText).toHaveBeenCalledWith(MARKDOWN);
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    // Only the clicked button confirms; its neighbour keeps its copy icon.
    expect(iconOf(screen.getByRole('button', { name: 'Copiar URL' }))).toHaveAttribute(
      'data-icon',
      'copy',
    );
  });

  test('si no se puede copiar, lo dice en el estado sin lanzar', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: () => false,
    });
    renderTools();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar URL' }));
    });

    expect(screen.getByRole('status')).toHaveTextContent('No se pudo copiar');
    expect(screen.getByRole('status')).not.toHaveClass('sr-only');
    expect(screen.queryByRole('button', { name: 'Copiado' })).toBeNull();
    // No check mark for a copy that did not happen.
    expect(iconOf(screen.getByRole('button', { name: 'Copiar URL' }))).toHaveAttribute(
      'data-icon',
      'copy',
    );
  });

  test('un segundo intento exitoso reemplaza el aviso de fallo', async () => {
    const failing = vi.fn(async (): Promise<void> => {
      throw new Error('denied');
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: failing },
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
    renderTools();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar URL' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo copiar');

    failing.mockImplementation(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Copiado');
    expect(screen.getByRole('status')).toHaveClass('sr-only');
  });

  test('sin el Markdown embebido, avisa en vez de copiar texto vacío', async () => {
    document.getElementById(MARKDOWN_ID)?.remove();
    renderTools();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar Markdown' }));
    });

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo copiar');
  });
});

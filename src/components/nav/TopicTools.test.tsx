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
    expect(screen.getByRole('button', { name: 'Copiado' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copiado');
    // The button already shows it: the status only speaks, out of the row's flow.
    expect(screen.getByRole('status')).toHaveClass('sr-only');

    act(() => {
      vi.advanceTimersByTime(CONFIRM_MS);
    });

    expect(screen.getByRole('button', { name: 'Copiar URL' })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Copiar URL' })).toBeInTheDocument();
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

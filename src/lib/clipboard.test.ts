// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { copyText } from './clipboard';

function mockClipboard(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function mockExecCommand(result: boolean | Error) {
  const execCommand = vi.fn((command: string) => {
    if (result instanceof Error) throw result;
    return command === 'copy' && result;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
  return execCommand;
}

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('usa navigator.clipboard.writeText cuando existe', async () => {
    const writeText = vi.fn(async () => {});
    mockClipboard(writeText);
    const execCommand = mockExecCommand(true);

    const isCopied = await copyText('hola');

    expect(isCopied).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hola');
    expect(execCommand).not.toHaveBeenCalled();
  });

  test('sin la API, copia desde un textarea oculto que luego retira', async () => {
    mockClipboard(undefined);
    let copiedValue = '';
    const execCommand = mockExecCommand(true);
    execCommand.mockImplementation(() => {
      copiedValue = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });

    const isCopied = await copyText('texto largo');

    expect(isCopied).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copiedValue).toBe('texto largo');
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('si la API rechaza, recurre al textarea y devuelve el foco', async () => {
    mockClipboard(vi.fn(async () => Promise.reject(new Error('NotAllowedError'))));
    const execCommand = mockExecCommand(true);
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();

    const isCopied = await copyText('hola');

    expect(isCopied).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.activeElement).toBe(button);
  });

  test('si ambos caminos fallan devuelve false sin lanzar', async () => {
    mockClipboard(undefined);
    mockExecCommand(new Error('no soportado'));

    await expect(copyText('hola')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('si execCommand responde false, devuelve false', async () => {
    mockClipboard(undefined);
    mockExecCommand(false);

    await expect(copyText('hola')).resolves.toBe(false);
  });
});

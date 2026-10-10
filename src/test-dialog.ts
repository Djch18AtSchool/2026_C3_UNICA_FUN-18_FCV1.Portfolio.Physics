/**
 * jsdom implements <dialog> but not showModal/close or Escape handling. This installs the parts
 * of the browser behavior the settings drawer relies on: showModal opens and focuses the first
 * focusable descendant, close dispatches `close`, and Escape fires a cancelable `cancel` on the
 * topmost open dialog that closes it unless prevented. Returns a function that uninstalls it.
 */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function installDialogPolyfill(): () => void {
  const proto = HTMLDialogElement.prototype;
  const originalShowModal = Object.getOwnPropertyDescriptor(proto, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(proto, 'close');

  proto.showModal = function showModal(this: HTMLDialogElement) {
    if (this.open) return;
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const topmost = dialogs[dialogs.length - 1];
    if (!topmost) return;
    if (topmost.dispatchEvent(new Event('cancel', { cancelable: true }))) topmost.close();
  };
  document.addEventListener('keydown', onKeyDown);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    restore(proto, 'showModal', originalShowModal);
    restore(proto, 'close', originalClose);
  };
}

/** Removes the HTMLDialogElement methods entirely, to exercise the open-attribute fallback. */
export function removeDialogMethods(): () => void {
  const proto = HTMLDialogElement.prototype;
  const showModal = Object.getOwnPropertyDescriptor(proto, 'showModal');
  const close = Object.getOwnPropertyDescriptor(proto, 'close');
  Reflect.deleteProperty(proto, 'showModal');
  Reflect.deleteProperty(proto, 'close');
  return () => {
    restore(proto, 'showModal', showModal);
    restore(proto, 'close', close);
  };
}

function restore(
  proto: HTMLDialogElement,
  key: 'showModal' | 'close',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) Object.defineProperty(proto, key, descriptor);
  else Reflect.deleteProperty(proto, key);
}

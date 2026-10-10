/**
 * Copy text from a click handler. `navigator.clipboard.writeText` is called first, synchronously
 * inside the handler; when the API is missing (an insecure origin) or rejects, a hidden textarea
 * and `document.execCommand('copy')` take over. Resolves to whether the text was copied and never
 * throws, so a failed copy only changes the button's message.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or no focus: the textarea route below may still work.
  }
  return copyWithTextarea(text);
}

/** The deprecated command is the point of the fallback; this type keeps the hint out of check. */
interface LegacyCopyDocument {
  execCommand(command: 'copy'): boolean;
}

function copyWithTextarea(text: string): boolean {
  const previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  Object.assign(area.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
  document.body.append(area);
  try {
    area.focus();
    area.select();
    return (document as LegacyCopyDocument).execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    previousFocus?.focus();
  }
}

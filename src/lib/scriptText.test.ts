import { describe, expect, test } from 'vitest';
import { embedScriptText, readScriptText } from './scriptText';

describe('embedScriptText', () => {
  test('ningún "</script" sobrevive dentro del texto embebido', () => {
    const embedded = embedScriptText('Antes </script><b>después</b> </SCRIPT >');

    expect(embedded.toLowerCase()).not.toContain('</script');
    expect(embedded).not.toContain('</');
  });

  test('tampoco deja "<!--", que cambiaría cómo el HTML lee el script', () => {
    expect(embedScriptText('<!-- <script> -->')).not.toContain('<!');
  });

  test('readScriptText devuelve exactamente el texto original', () => {
    const samples = [
      'Texto sin etiquetas.',
      '</script> y </Step>',
      'Ya escapado: <\\/script> y <\\\\/ raro',
      '<!-- comentario --> <\\! <\\',
      '',
    ];

    for (const sample of samples) {
      expect(readScriptText(embedScriptText(sample)), sample).toBe(sample);
    }
  });
});

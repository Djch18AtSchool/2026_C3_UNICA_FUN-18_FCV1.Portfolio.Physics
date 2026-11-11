import { describe, expect, test } from 'vitest';
import {
  compareToBaseline,
  countViolations,
  formatBaseline,
  pruneBaseline,
  readBaseline,
  type ScaleCounts,
} from './scaleBaseline';
import { scanSource, type ScaleViolation } from './scaleScan';

/** The violations of one snippet as `rule value` keys, exempt ones left out. */
function keys(path: string, text: string): string[] {
  return scanSource(path, text)
    .filter((violation) => violation.exempt === undefined)
    .map(({ rule, value }) => `${rule} ${value}`);
}

const tsx = (classes: string) => keys('a.tsx', `<div className="${classes}" />`);

describe('Tailwind classes', () => {
  test('flags spacing steps off the 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 scale', () => {
    expect(tsx('gap-1.5 px-5 mt-14 pt-10 pr-40 gap-0.5 py-0.5 -mt-7')).toEqual([
      'spacing gap-1.5',
      'spacing px-5',
      'spacing mt-14',
      'spacing pt-10',
      'spacing pr-40',
      'spacing gap-0.5',
      'spacing py-0.5',
      'spacing -mt-7',
    ]);
  });

  test('passes the scale, negatives, hairlines and keywords', () => {
    expect(
      tsx(
        'm-0 gap-1 gap-2 p-3 px-4 m-6 mt-8 gap-12 pb-16 -mx-3 -inset-y-1 inset-0 px-px top-1/2 ' +
          '-translate-y-1/2 translate-x-4 space-x-reverse top-auto w-full h-auto size-full',
      ),
    ).toEqual([]);
  });

  test('keeps the variant, important and negative out of the value', () => {
    expect(tsx('md:hover:gap-1.5 !px-5 lab-split:-mt-7 [&>svg]:size-2.5')).toEqual([
      'spacing gap-1.5',
      'spacing px-5',
      'spacing -mt-7',
      'size size-2.5',
    ]);
  });

  test('sizes: icons 20, icon buttons 40/44, 2 px rules and widths in steps of 4 rem', () => {
    expect(
      tsx(
        'size-5 size-10 size-11 min-h-10 min-h-11 h-6 w-10 w-0.5 h-px w-16 w-32 min-w-32 w-64 ' +
          'max-w-[20rem] max-w-md max-w-xs max-w-[70ch] max-h-[85dvh] max-w-none',
      ),
    ).toEqual([]);
    expect(tsx('size-[18px] size-2.5 size-3.5 min-h-9 w-24 max-w-[30rem] max-w-2xl gap-5')).toEqual(
      [
        'size size-[18px]',
        'size size-2.5',
        'size size-3.5',
        'size min-h-9',
        'size w-24',
        'size max-w-[30rem]',
        'size max-w-2xl',
        'spacing gap-5',
      ],
    );
  });

  test('20, 40 and 44 only through the named icon and icon-button classes', () => {
    expect(tsx('w-5 h-5 w-11 h-11 min-w-10 min-w-11 h-10')).toEqual([]);
    expect(tsx('max-w-10 max-h-11 min-w-5 h-[40px] size-[20px] min-h-[2.75rem]')).toEqual([
      'size max-w-10',
      'size max-h-11',
      'size min-w-5',
      'size h-[40px]',
      'size size-[20px]',
      'size min-h-[2.75rem]',
    ]);
    expect(keys('a.css', '.a { width: 2.5rem; min-height: 44px; }')).toEqual([
      'size width: 2.5rem',
      'size min-height: 44px',
    ]);
  });

  test('a class list across lines: attribute values and templates', () => {
    // B2: a JSX attribute string may cross lines (Prettier does not join it).
    expect(keys('a.tsx', '<div\n  className="flex gap-2\n    mt-7"\n/>')).toEqual(['spacing mt-7']);
    // B1: in Astro the quotes keep pairing after a multiline class, so the next one is still seen.
    expect(keys('a.astro', '<div class="flex\n  mt-7">\n  <p class="px-5">x</p>\n</div>')).toEqual([
      'spacing mt-7',
      'spacing px-5',
    ]);
    expect(keys('a.mdx', "<div className='gap-2\n  pt-10' />")).toEqual(['spacing pt-10']);
    expect(keys('a.tsx', 'cn(\n  "gap-2",\n  `mt-7\n   px-5`,\n)')).toEqual([
      'spacing mt-7',
      'spacing px-5',
    ]);
    expect(
      scanSource('a.tsx', '<div\n  className="gap-2\n    mt-7"\n/>').map(({ line }) => line),
    ).toEqual([3]);
  });

  test('arbitrary properties and the line-height modifier', () => {
    expect(
      tsx('[margin-top:5px] [--x:1rem] text-sm/6 text-sm/[20px] [mask-type:luminance]'),
    ).toEqual(['spacing [margin-top:5px]']);
    expect(tsx('text-sm/[22px] text-xs/7.5 text-[15px]/6')).toEqual([
      'leading text-sm/[22px]',
      'leading text-xs/7.5',
      'text text-[15px]/6',
    ]);
  });

  test('reads every length in an arbitrary value, calc() of the scale and own variables included', () => {
    expect(
      tsx(
        'max-w-[calc(100%-1rem)] left-[calc(8px+(100%-16px)*var(--mark-at))] ' +
          'scroll-mb-[calc(var(--lab-transport-room)+0.5rem)] lg:max-h-[calc(100dvh-4rem)] ' +
          'grid-cols-[minmax(0,1fr)_20rem] h-(--plot-height) grid-cols-2',
      ),
    ).toEqual([]);
    expect(
      tsx('top-[3px] ml-[2.125rem] grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] right-[13px]'),
    ).toEqual([
      'spacing top-[3px]',
      'spacing ml-[2.125rem]',
      'size grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto]',
      'spacing right-[13px]',
    ]);
  });

  test('text sizes: 12, 14, 16, 18, 20, 24 and 36 only; colors and alignment are not sizes', () => {
    expect(
      tsx(
        'text-xs text-sm text-base text-lg text-xl text-2xl text-4xl text-[12px] text-fg text-left',
      ),
    ).toEqual([]);
    expect(tsx('text-3xl sm:text-5xl text-[2.5rem] text-[13px]')).toEqual([
      'text text-3xl',
      'text text-5xl',
      'text text-[2.5rem]',
      'text text-[13px]',
    ]);
  });

  test('line heights pair with the text sizes; unitless ones are out of scope', () => {
    expect(tsx('leading-4 leading-5 leading-6 leading-7 leading-none leading-[1.4]')).toEqual([]);
    expect(tsx('leading-9 leading-[27px]')).toEqual([
      'leading leading-9',
      'leading leading-[27px]',
    ]);
  });

  test('radii 4 and 8 (and full or none)', () => {
    expect(
      tsx('rounded rounded-sm rounded-lg rounded-full rounded-none rounded-base rounded-t-base'),
    ).toEqual([]);
    expect(tsx('rounded-md rounded-[2px] rounded-[1px] rounded-xl')).toEqual([
      'radius rounded-md',
      'radius rounded-[2px]',
      'radius rounded-[1px]',
      'radius rounded-xl',
    ]);
  });

  test('borders 1 and 2', () => {
    expect(
      tsx(
        'border border-2 border-l-2 border-0 border-border border-solid outline-2 outline-offset-2',
      ),
    ).toEqual([]);
    expect(tsx('border-4 border-l-[3px] border-b-[3px] border-chart-2')).toEqual([
      'border border-4',
      'border border-l-[3px]',
      'border border-b-[3px]',
    ]);
  });

  test('one solid stroke: dotted and dashed borders, dividers and outlines are off the scale', () => {
    expect(
      tsx('border-b border-dotted md:border-dashed divide-y divide-dashed outline-dotted'),
    ).toEqual([
      'border border-dotted',
      'border border-dashed',
      'border divide-dashed',
      'border outline-dotted',
    ]);
    expect(tsx('border-double border-solid decoration-dotted')).toEqual([]);
  });

  test('breakpoints and container queries are not spacing', () => {
    expect(
      tsx(
        '@min-[17.1rem]/lab:h-(--x) min-[479.5px]:p-4 @min-[calc(481.5px+2rem)]:h-(--y) ' +
          '@min-[19.55rem]/lab:gap-4 max-[39.99rem]:px-4',
      ),
    ).toEqual([]);
  });

  test('ignores look-alikes that are not lengths', () => {
    expect(
      tsx('top-left w-1/2 aspect-(--x) tracking-[.02em] align-[-2px] columns-2 0.35em'),
    ).toEqual([]);
  });

  test('reads template literals and the strings inside their expressions', () => {
    expect(keys('a.tsx', 'const c = `gap-1.5 ${wide ? "px-5" : \'px-4\'}`;')).toEqual([
      'spacing gap-1.5',
      'spacing px-5',
    ]);
  });
});

describe('comments', () => {
  test('a comment in code is not a class list', () => {
    expect(keys('a.ts', "// gap-1.5\n/* px-5 */\nconst a = 'gap-2';")).toEqual([]);
  });

  test('a // inside a string does not start a comment', () => {
    expect(keys('a.ts', "const u = 'https://example.com'; const c = 'gap-1.5';")).toEqual([
      'spacing gap-1.5',
    ]);
  });

  test('an apostrophe in JSX text does not swallow the next lines', () => {
    expect(keys('a.tsx', '<p>Don\'t</p>\n<div className="px-5" />')).toEqual(['spacing px-5']);
  });

  test('HTML and MDX comments are skipped', () => {
    expect(keys('a.astro', '<!-- <div class="px-5"> -->\n<div class="gap-1.5" />')).toEqual([
      'spacing gap-1.5',
    ]);
    expect(keys('a.mdx', '{/* <div className="px-5" /> */}\n<div className="mt-5" />')).toEqual([
      'spacing mt-5',
    ]);
  });
});

describe('CSS', () => {
  test('flags lengths off the scale per property', () => {
    const css = `.a {
      margin-top: 1.25rem;
      padding: 0.35em 1rem;
      font-size: 0.9375rem;
      border-left: 3px double var(--accent);
      border-radius: 3px;
      line-height: 27px;
      box-shadow: 0 0 0 0.375rem red;
      max-width: 62rem;
    }`;
    expect(keys('a.css', css)).toEqual([
      'spacing margin-top: 1.25rem',
      'spacing padding: 0.35em',
      'text font-size: 0.9375rem',
      'border border-left: 3px',
      'radius border-radius: 3px',
      'leading line-height: 27px',
      'spacing box-shadow: 0.375rem',
      'size max-width: 62rem',
    ]);
  });

  test('one solid stroke: a dotted or dashed border or outline is off the scale', () => {
    const css = `.a {
      border-bottom: 1px dotted var(--border);
      border-style: dashed;
      outline: 2px dashed red;
      border-left-style: dotted;
      border-top: var(--rule);
      border: var(--rule-double-width) double var(--accent);
      text-decoration-style: dotted;
    }`;
    expect(keys('a.css', css)).toEqual([
      'border border-bottom: dotted',
      'border border-style: dashed',
      'border outline: dashed',
      'border border-left-style: dotted',
    ]);
  });

  test('passes the scale, ch, %, hairlines and out-of-scope properties', () => {
    const css = `.a {
      margin-block: 1rem;
      padding: 0.25rem 1.5rem;
      font-size: 0.875rem;
      border-top: 1px solid var(--border);
      border-radius: var(--radius);
      line-height: 1.6;
      max-width: 70ch;
      width: 100%;
      top: max(1rem, env(safe-area-inset-top));
      background-position: -1px -1px;
      letter-spacing: -0.015em;
      text-underline-offset: 0.2em;
      stroke-width: 4px;
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
      content: 'gap: 1.45rem';
    }`;
    expect(keys('a.css', css)).toEqual([]);
  });

  test('media and container queries are breakpoints, not lengths', () => {
    const css = `@media (max-width: 39.99rem) { .a { padding-left: 0; } }
      @container lab (width >= 42rem) { .b { gap: 1rem; } }
      @custom-variant x { @media (width >= 64rem) { @slot; } }`;
    expect(keys('a.css', css)).toEqual([]);
  });

  test('a percentage root size counts against the 16 px body', () => {
    expect(keys('a.css', 'html { font-size: 106.25%; }')).toEqual(['text font-size: 106.25%']);
    expect(keys('a.css', 'html { font-size: 100%; }')).toEqual([]);
  });

  test('custom properties: a radius or a text size by its name, any other as a length', () => {
    const css = `:root {
      --text-h1: 2.25rem;
      --text-aux: 0.875rem;
      --text-legend: 0.9375rem;
      --leading-x: 27px;
      --radius: 3px;
      --table-cue-width: 0.875rem;
      --lab-transport-room: calc(2.75rem + 2 * 0.75rem + 1px);
      --table-cover-width: 2.5rem;
      --grid-cell: 1rem;
      --icon: 1.25rem;
      --icon-button: 2.5rem;
      --icon-button-touch: 2.75rem;
    }`;
    expect(keys('a.css', css)).toEqual([
      'text --text-legend: 0.9375rem',
      'leading --leading-x: 27px',
      'radius --radius: 3px',
      'size --table-cue-width: 0.875rem',
      'size --lab-transport-room: 2.75rem',
      'size --table-cover-width: 2.5rem',
    ]);
  });

  test('em is relative to the local size, so it is off the scale wherever it measures', () => {
    const css = `.a {
      margin-block: 1em;
      padding: 0.25em 1rem;
      font-size: 0.875em;
      letter-spacing: 0.02em;
    }`;
    expect(keys('a.css', css)).toEqual([
      'spacing margin-block: 1em',
      'spacing padding: 0.25em',
      'text font-size: 0.875em',
    ]);
    expect(tsx('text-[0.875em] px-[1em]')).toEqual(['text text-[0.875em]', 'spacing px-[1em]']);
  });

  test('shorthands: font size and line height, flex basis, transforms', () => {
    const css = `.a {
      font: 600 15px/1.2 var(--font-sans);
      font: 500 0.875rem/27px var(--font-mono);
      flex: 0 0 18.5rem;
      transform: translateY(3px) rotate(45deg);
      translate: 0 5px;
    }`;
    expect(keys('a.css', css)).toEqual([
      'text font: 15px',
      'leading font: 27px',
      'size flex: 18.5rem',
      'spacing transform: 3px',
      'spacing translate: 5px',
    ]);
    expect(
      keys('a.css', '.a { font: 600 1rem/1.5 serif; flex: 1 1 0; transform: scale(1.5); }'),
    ).toEqual([]);
  });

  test('a declaration after a nested rule, and @apply', () => {
    expect(keys('a.css', '.a { & p { gap: 1rem; } margin-top: 5px; }')).toEqual([
      'spacing margin-top: 5px',
    ]);
    expect(keys('a.css', '.a { @apply flex p-5 gap-2; }')).toEqual(['spacing p-5']);
  });

  test('a comment is not a declaration', () => {
    expect(keys('a.css', '.a { /* gap: 1.45rem; */ gap: 1rem; }')).toEqual([]);
  });
});

describe('Astro, MDX and React styles', () => {
  test('Astro: the style block, style attributes and class attributes', () => {
    const astro = [
      '---',
      "const C = 'gap-1.5';",
      '---',
      '<div class="px-5" style="padding: 0.35em"></div>',
      '<style>',
      "  .a { gap: 1.45rem; content: 'mt-5'; }",
      '</style>',
    ].join('\n');
    // In source order, whatever the extractor that found each one.
    expect(keys('a.astro', astro)).toEqual([
      'spacing gap-1.5',
      'spacing px-5',
      'spacing padding: 0.35em',
      'spacing gap: 1.45rem',
    ]);
  });

  test('React style objects: literal lengths and bare numbers (px); variables are not followed', () => {
    const code =
      "<div style={{ padding: '0.35em', marginTop: 20, lineHeight: 1.5, width: MAX, left: `${x}%` }} />";
    expect(keys('a.tsx', code)).toEqual(['spacing padding: 0.35em', 'spacing marginTop: 20']);
  });

  test('Astro reads React-style objects too', () => {
    expect(keys('a.astro', '<div style={{ marginTop: "10px", padding: 8 }} />')).toEqual([
      'spacing marginTop: 10px',
    ]);
  });

  test('SVG drawing attributes are out of scope', () => {
    expect(
      keys('a.tsx', '<text fontSize={13} dy="0.35em" strokeWidth={1.5} width="18" x={3} />'),
    ).toEqual([]);
  });

  test('MDX: JSX class names count, prose does not', () => {
    expect(keys('a.mdx', 'La masa m-5 cae.\n\n<div className="mt-5">x</div>')).toEqual([
      'spacing mt-5',
    ]);
  });
});

describe('line numbers and exemptions', () => {
  test('each violation carries its line', () => {
    const lines = scanSource('a.css', '.a {\n  gap: 1rem;\n  margin: 1.25rem;\n}').map(
      (violation: ScaleViolation) => violation.line,
    );
    expect(lines).toEqual([3]);
  });

  test('scale-exempt with a reason exempts its own line, or the next one when alone', () => {
    const css = [
      '.a {',
      '  font-size: 17px; /* scale-exempt: SVG user units */',
      '  /* scale-exempt: matches the native 16 px thumb */',
      '  margin: 1.25rem;',
      '  padding: 0.35em;',
      '}',
    ].join('\n');
    const violations = scanSource('a.css', css);
    expect(violations.map(({ value, exempt }) => [value, exempt])).toEqual([
      ['font-size: 17px', 'SVG user units'],
      ['margin: 1.25rem', 'matches the native 16 px thumb'],
      ['padding: 0.35em', undefined],
    ]);
  });

  test('scale-exempt without a reason exempts nothing', () => {
    expect(keys('a.css', '.a { margin: 1.25rem; /* scale-exempt: */ }')).toEqual([
      'spacing margin: 1.25rem',
    ]);
  });

  test('works from a JSX comment too', () => {
    const code = '{/* scale-exempt: native thumb */}\n<div className="px-5" />';
    expect(keys('a.tsx', code)).toEqual([]);
  });
});

describe('baseline', () => {
  const at = (rule: ScaleViolation['rule'], value: string, exempt?: string): ScaleViolation => ({
    rule,
    value,
    line: 1,
    exempt,
  });

  test('counts per file and per rule-and-value, without the exempt ones', () => {
    expect(
      countViolations({
        'src/a.tsx': [at('spacing', 'gap-1.5'), at('spacing', 'gap-1.5'), at('text', 'text-3xl')],
        'src/b.css': [at('spacing', 'gap: 1.45rem', 'SVG')],
      }),
    ).toEqual({ 'src/a.tsx': { 'spacing gap-1.5': 2, 'text text-3xl': 1 } });
  });

  test('a new violation is added; a cleaned one is stale', () => {
    const baseline: ScaleCounts = {
      'src/a.tsx': { 'spacing gap-1.5': 2 },
      'src/gone.tsx': { 'size w-24': 1 },
    };
    const actual: ScaleCounts = { 'src/a.tsx': { 'spacing gap-1.5': 1, 'text text-3xl': 1 } };
    expect(compareToBaseline(actual, baseline)).toEqual({
      added: [{ file: 'src/a.tsx', key: 'text text-3xl', actual: 1, baseline: 0 }],
      stale: [
        { file: 'src/a.tsx', key: 'spacing gap-1.5', actual: 1, baseline: 2 },
        { file: 'src/gone.tsx', key: 'size w-24', actual: 0, baseline: 1 },
      ],
    });
  });

  test('matching counts drift nowhere', () => {
    const counts: ScaleCounts = { 'src/a.tsx': { 'spacing gap-1.5': 2 } };
    expect(compareToBaseline(counts, counts)).toEqual({ added: [], stale: [] });
  });

  test('pruning only lowers counts, never adds, and drops what reached zero', () => {
    const baseline: ScaleCounts = {
      'src/a.tsx': { 'spacing gap-1.5': 2, 'size w-24': 1 },
      'src/gone.tsx': { 'size w-24': 1 },
    };
    const actual: ScaleCounts = {
      'src/a.tsx': { 'spacing gap-1.5': 1, 'text text-3xl': 4 },
      'src/new.tsx': { 'spacing px-5': 1 },
    };
    expect(pruneBaseline(actual, baseline)).toEqual({ 'src/a.tsx': { 'spacing gap-1.5': 1 } });
  });

  test('writes sorted JSON and reads back only file → key → positive count', () => {
    const text = formatBaseline({
      'src/b.css': { 'text x': 1 },
      'src/a.tsx': { 'z y': 2, 'a b': 1 },
    });
    expect(text).toBe(
      '{\n  "src/a.tsx": {\n    "a b": 1,\n    "z y": 2\n  },\n  "src/b.css": {\n    "text x": 1\n  }\n}\n',
    );
    expect(readBaseline(text)).toEqual({
      'src/a.tsx': { 'a b': 1, 'z y': 2 },
      'src/b.css': { 'text x': 1 },
    });
    expect(() => readBaseline('[]')).toThrow(/objeto/);
    expect(() => readBaseline('{"src/a.tsx": {"spacing x": 0}}')).toThrow(/src\/a.tsx/);
    expect(() => readBaseline('{"src/a.tsx": 3}')).toThrow(/src\/a.tsx/);
  });
});

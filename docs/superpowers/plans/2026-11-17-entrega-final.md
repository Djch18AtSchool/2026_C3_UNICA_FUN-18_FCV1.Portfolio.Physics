# Entrega Final (Temas 10 a 13 y «Qué aprendí») — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Temas 10–13 (each with its prescribed resource and its lab), the «Qué aprendí» closing section on the home page, and the professor's Tema 7 correction, so the site holds the thirteen entries of the course.

**Architecture:** Same site, same patterns: one MDX per topic (4 `Step`, ≤ 650 words, `DataTable` registry), a pure physics core in `src/lib/physics/`, sourced data in `src/lib/data/`, figures and a `LabShell` lab in `src/components/topics/<slug>/`. Two shared pieces are new: `AnalyzedMedia` (YouTube, hosted video or audio with timed markers and written analysis; Tema 5 migrates to it) and two `ffmpeg`-based data scripts that produce the Tema 11 harmonics and the Tema 12 frame-by-frame measurement, with tests pinning every number the page states.

**Tech Stack:** Astro 7, React 19, Tailwind 4, KaTeX, Vitest 5 (+ Testing Library, jsdom), Playwright 1.64 (+ axe), tsx scripts, ffmpeg (local only), Web Audio API (Tema 11 lab).

**Spec:** `docs/superpowers/specs/2026-11-17-entrega-final-design.md` (read it whole). Per-topic detail (sources with lines, numbers, equations, traps): `docs/superpowers/research/2026-11-17-{animaciones-resorte,sintesis-sonido,resonancia-estructural,enfriamiento-liquido,deteccion-caidas}.md`. House rules and the checklist for a new topic: `docs/superpowers/handoff/2026-10-31-avance-2-handoff.md`, section «Fase E», apartado 7. README sections «Laboratorios por niveles», «Escala de tiempo y eventos», «Zoom y desplazamiento», «Notación matemática», «Escala de medidas».

**Research prototypes** (Python, throwaway, local only): `.superpowers/sdd/2026-11-17-entrega-final/prototypes/{sonido,resonancia,enfriamiento,enfriamiento-out}/` and `spring_calcs.out`. Port algorithms from them into TypeScript; never import or run them from the site.

## Global Constraints

- Spanish on the page; textbook notation (Serway, Sears–Zemansky): **g = 9,81 m/s²**, comma decimals in prose, code literals quoted as written (with a point).
- **Every symbol inside `$…$`**, also in SVG (`MathText`); accessible names via `mathTextToString`/`mathAriaLabel`; never the mini-notation (`V_p`, `vec v`) for a variable; plain text inside `<option>`.
- New topics write the damping coefficient as **b** ($b_c = 2\sqrt{km}$, as Módulo 5); height in Bernoulli as **y**.
- Exact topic titles (from the consigna), slugs and `shortTitle`: 10 `animaciones-resorte` «Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion» / «Animaciones con resorte»; 11 `sintesis-sonido` «Síntesis de sonido: armónicos, timbre y el sintetizador» / «Síntesis de sonido»; 12 `resonancia-estructural` «Resonancia estructural: Tacoma Narrows y por qué las tropas rompen el paso al cruzar un puente» / «Resonancia estructural»; 13 `enfriamiento-liquido` «Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli» / «Enfriamiento líquido». All `phase: 3`.
- Four `Step` per topic, each with a numbered equation (10.n … 13.n), a `Why` (`fenomeno`, `ecuacion`) and its figure; `UseCase`, class `Callout`, `Connections`, `Sources`. **Prose ≤ 650 words** (`MAX_PROSE_WORDS`).
- One resource badge per topic (the prescribed figure); every other `Figure` passes `showBadge={false}`.
- **One source per number:** an open source marked CONFIRMADO in the research, or «(cálculo propio)» reproduced by tested code. NO CONFIRMADO is never stated. `src/lib` never imports from `src/components`.
- **Model vs product:** every parameter in a table, preset or lab says whether it is the product's value (with its source) or an illustrative model assumption (field `origin: 'producto' | 'ilustrativo' | 'calculo'` in data modules; the table or label shows it).
- Scale 4/8 (`src/styles/scale.test.ts`; `pnpm run scale:report` total 0); colours via tokens with a dark variant and checked contrast; colour carries meaning, never series order.
- First person in prose and figure source lines. Every new or changed sentence goes to `docs/superpowers/review/2026-11-20-textos-entrega-final.md` (file:line, antes → después).
- Commits: English, conventional (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`), Dylan's identity only, **no Co-Authored-By or attribution line**.
- Never touch the dev server on port 4321; e2e on `E2E_PORT=4322` (worktrees 4336–4339, plus 4331–4333); stop servers by PID; no `pkill -f`, no `git stash`.
- Coverage: statements ≥ 98 % overall, every new file ≥ 80 %.
- **No push to `main` without Dylan's explicit permission for that push.**

## Review Focus

1. **Media that cannot play** (browser without the codec, file missing, network off): `AnalyzedMedia` still shows the markers and the written analysis, the marker buttons stay usable, and a visible line offers the file as a download link; nothing throws. Test in Task 2.
2. **Audio started without a gesture or left playing** (Tema 11 lab): no sound before a click; one stop control silences every voice; changing preset while playing never clicks to full volume (ramped gain); leaving the page (`pagehide`) closes the `AudioContext`. Tests in Task 8.
3. **Extreme lab inputs** (Tema 10 with ζ exactly 1 or b = 0; Tema 12 with ζ → 0 at exact resonance; Tema 13 with a single server or a tiny hose): readouts stay finite, the regime label never flickers between «crítico» and its neighbours at ζ = 1 ± 1e-9, b = 0 shows «sin amortiguar» and a settling time of «nunca», and the hydraulic solver either converges or reports «no converge» instead of NaN. Tests in Tasks 3, 9, 12.
4. **Interruption mid-flight** (Tema 10 «Interrumpir» pressed twice quickly, or after the spring is at rest): position and velocity stay continuous, the fixed-duration card restarts without a jump in position, and pressing it at rest just swaps targets. Test in Task 5.
5. **«Velocidad real (×2/3)» outside Elliott's 16 fps shots** (Tema 12): the rate applies only inside the declared ranges and returns to 1× in the collapse (24 fps); seeking with the markers while the toggle is on lands at the right rate. Test in Task 2 (component) and Task 10 (ranges).

---

## Execution model

- **Branches and worktrees.** Integration branch `entrega-final` (from `fase-e-laboratorio`). Worktrees: `entrega-final-base` (Tasks 1–2), `entrega-final-tema-10` (3–5), `-tema-11` (6–8), `-tema-12` (9–11), `-tema-13` (12–14), `entrega-final-f` (15), `entrega-final-cierre` (16). `pnpm install --frozen-lockfile` in each. Rebase onto `entrega-final` and integrate with fast-forward (linear history).
- **Order.** Tasks 1–2 first and integrated. Tasks 3, 6 (data and core only), 9, 12 and 15 do not depend on them and may start at the same time. Page tasks (4, 7, 10, 13) and Task 16 start after rebasing on the integrated base. Within a topic: core → page → lab. Task 17 last.
- **Shared files.** `src/components/{lab,ui,charts,media}/**`, `src/styles/**` and the shared e2e suites are touched only by Tasks 1, 2 and 17. **Exception, append-only:** each page task adds its own entry to `src/consigna.ts` (`TOPICS`) and `tests/e2e/topicPages.ts` (`LABS`); each lab task adds its own entries to the e2e registries listed in its steps. Conflicts there are resolved at rebase by keeping both entries in number order.
- **Between a page task and its lab task** the shared suites that iterate `TOPIC_PAGES` are not run in that worktree (the lab test id does not exist yet); the page task runs its unit tests and its own spec; the lab task runs the shared suites.
- **Models and effort** (CLAUDE.md): physics cores, prescribed resources, labs and texts on the strongest model at high effort; Task 1 and registries at medium. Each task: implementer → independent reviewer → fixes → bounded re-review; controller decisions logged in `.superpowers/sdd/2026-11-17-entrega-final/progress.md` with their cost if wrong.
- **e2e on this machine:** never the whole suite at once; batches with `--workers=1` or `2`.

---

## Phase 0 — base (worktree `entrega-final-base`)

### Task 1: Tests and navigation ready for phase 3

The registry tests stop hard-coding nine topics and a future Entrega Final, so each topic can join `TOPICS` on its own without breaking unrelated suites. No visible change on the site.

**Files:**
- Modify: `src/consigna.test.ts`, `tests/e2e/site-pages.spec.ts`, `tests/e2e/navigation.spec.ts`, `src/consigna.ts` (doc comment only)

**Interfaces:**
- Produces: the rule «a phase is future iff `topicsByPhase(phase, TOPICS)` is empty», used by both e2e suites; `CONSIGNA_TITLES` in `src/consigna.test.ts`.

- [ ] **Step 1: Rewrite the unit tests to derive from `TOPICS`**

```ts
const CONSIGNA_TITLES: Record<number, string> = {
  1: 'Rastreo y navegación de un dron de reparto',
  // … 2–9 exactly as today in src/consigna.ts …
  10: 'Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion',
  11: 'Síntesis de sonido: armónicos, timbre y el sintetizador',
  12: 'Resonancia estructural: Tacoma Narrows y por qué las tropas rompen el paso al cruzar un puente',
  13: 'Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli',
};
test('los temas registrados van numerados 1..N sin huecos', () => {
  expect(TOPICS.map((t) => t.number)).toEqual(TOPICS.map((_, i) => i + 1));
});
test('cada tema registrado lleva el título exacto de la consigna', () => {
  for (const t of TOPICS) expect(t.title).toBe(CONSIGNA_TITLES[t.number]);
});
test('los temas 10 a 13 pertenecen a la Entrega Final', () => {
  for (const t of TOPICS.filter((t) => t.number >= 10)) expect(t.phase).toBe(3);
});
```

- [ ] **Step 2: Make `site-pages.spec.ts` and `navigation.spec.ts` derive future phases**

`FUTURE_PHASE_LABELS = PHASES.filter((p) => topicsByPhase(p, TOPICS).length === 0).map((p) => PHASE_LABELS[p])`. «la portada muestra el Avance 2…» becomes one test per phase with topics («la portada muestra ${label} con sus N temas»). `RETIRED_SLUGS` and `RETIRED_NAMES` keep only names that are **not** in `TOPICS` (filter them), so a slug that joins `TOPICS` stops counting as retired.

- [ ] **Step 3: Run**

Run: `pnpm vitest run src/consigna.test.ts` → PASS. `pnpm run build && E2E_PORT=4322 pnpm exec playwright test tests/e2e/site-pages.spec.ts tests/e2e/navigation.spec.ts --workers=1` → PASS with today's nine topics.

- [ ] **Step 4: Verify the tests flip correctly with a phase-3 topic** — temporarily add a fake `{ number: 10, … phase: 3 }` entry locally, run Step 1's tests (the title test fails with a wrong title and passes with the exact one), then remove it. Do not commit the fake entry.

- [ ] **Step 5: Commit** — `test(registry): phase tests derive from the registered topics, ready for the Final Delivery`

### Task 2: `AnalyzedMedia` — video, audio or YouTube with analysed markers

**Files:**
- Create: `src/components/media/AnalyzedMedia.tsx`, `src/components/media/HostedPlayer.tsx`, `src/components/media/YouTubeEmbed.tsx` (moved from `HapticVideo.tsx`'s facade and player), `src/components/media/useYouTubePlayer.ts` (moved), `src/components/media/useRealSpeed.ts`, `src/lib/media.ts`
- Modify: `src/lib/videoMarkers.ts` (marker helpers stay; `EmbeddedVideo` moves into `media.ts` as the YouTube variant), `src/content/topics/control-haptico.mdx` (uses `AnalyzedMedia`), README («Medios con análisis»)
- Delete: `src/components/topics/control-haptico/HapticVideo.tsx`, `useYouTubePlayer.ts` (tests move with them)
- Test: `src/components/media/AnalyzedMedia.test.tsx`, `src/components/media/useRealSpeed.test.ts`, `src/lib/media.test.ts`; e2e `tests/e2e/control-haptico.spec.ts` unchanged and green

**Interfaces:**
- Produces (`src/lib/media.ts`):
```ts
export interface YouTubeSource { kind: 'youtube'; id: string; title: string; channel: string; published: string; duration: number }
export interface HostedSource {
  kind: 'video' | 'audio';
  /** In order of preference; the first the browser can play wins. */
  files: readonly { src: string; type: string }[];
  title: string; credit: string; duration: number;
  poster?: string; width?: number; height?: number; // video only
}
export type MediaSource = YouTubeSource | HostedSource;
export interface MediaMarker { time: number; title: string; analysis: string }
export interface RealSpeed { label: string; rate: number; ranges: readonly (readonly [number, number])[] }
export function requireMedia(source: MediaSource, markers: readonly MediaMarker[]): void; // throws RangeError in Spanish, like requireEmbeddedVideo
export function rateAt(time: number, realSpeed: RealSpeed | undefined, isOn: boolean): number; // rate inside a range when on, else 1
```
- Produces (component): `AnalyzedMedia({ source, markers, realSpeed?, testId }: AnalyzedMediaProps)`. Test ids derive from `testId` exactly as `HapticVideo` writes them today with `haptic-video`: `${testId}-player`, `${testId}-facade`, `${testId}-credit`, `${testId}-markers`; each marker keeps `marker-label` and `marker-analysis`; the toggle is `${testId}-real-speed`. With `testId="haptic-video"` the Tema 5 e2e stays untouched.

- [ ] **Step 1: Unit tests for `media.ts`** — `requireMedia` rejects markers outside `[0, duration)` and out of order (same messages as `videoMarkers.ts`), an empty `files` list, a `type` other than `video/webm`, `video/mp4`, `audio/mpeg`; `rateAt(5, {rate: 2/3, ranges: [[2, 9.6]]}, true)` → `2/3`, `rateAt(120, …, true)` → `1`, `rateAt(5, …, false)` → `1`.
- [ ] **Step 2: Component tests** — renders every marker with `formatTimestamp`; clicking a marker on a hosted source sets `currentTime` and makes it the active marker (`aria-current="true"`), and announces its title in the polite region; with `realSpeed` on, `playbackRate` follows `rateAt` on `timeupdate` and on seek; **Review Focus 1**: dispatching `error` on the media element shows «No se pudo reproducir el archivo en este navegador:» with a download link to `files[0].src`, the markers and analyses stay rendered and clickable; no autoplay (`autoplay` attribute absent, `preload="metadata"`); audio renders `<audio controls>` with an accessible name from `title`. YouTube variant: the existing `HapticVideo` tests, moved and renamed, pass unchanged.
- [ ] **Step 3: Run** `pnpm vitest run src/components/media src/lib/media.test.ts` → FAIL (modules missing).
- [ ] **Step 4: Implement** — move the YouTube facade/player code as is; `HostedPlayer` wraps `<video>`/`<audio>` with `<source>` per file; `useRealSpeed(mediaRef, realSpeed)` returns `{ isOn, toggle }` and applies `rateAt`. Keep the marker list markup and classes of `HapticVideo` (scale 4/8 already). Migrate `control-haptico.mdx` to `<AnalyzedMedia client:visible source={{ kind: 'youtube', … }} markers={…} testId="haptic-video" />` keeping the current test id so its e2e stays.
- [ ] **Step 5: Run** unit tests → PASS; `pnpm run check`; `pnpm run build`; `E2E_PORT=4322 pnpm exec playwright test tests/e2e/control-haptico.spec.ts tests/e2e/glyphs.spec.ts tests/e2e/a11y.spec.ts --workers=1` → PASS.
- [ ] **Step 6: Commit** — `feat(media): AnalyzedMedia plays YouTube, hosted video or audio with analysed markers; Tema 5 uses it`

---

## Phase 1 — Tema 10, Spring animations (worktree `entrega-final-tema-10`)

### Task 3: Damped-spring core and presets

**Files:**
- Create: `src/lib/physics/dampedSpring.ts`, `src/lib/physics/dampedSpring.test.ts`, `src/lib/data/springPresets.ts`, `src/lib/data/springPresets.test.ts`

**Interfaces:**
- Consumes: `criticalDamping(k, m)` from `src/lib/physics/spring.ts`; `requirePositive`, `requireNonNegative` from `validate.ts`.
- Produces:
```ts
export interface SpringParams { k: number; b: number; m: number }
export type DampingRegime = 'sin-amortiguar' | 'subamortiguado' | 'critico' | 'sobreamortiguado';
export const CRITICAL_TOLERANCE = 1e-9; // |ζ − 1| below this is «crítico»
export function naturalAngularFrequency(p: SpringParams): number;       // ω0 = √(k/m)
export function dampingRatio(p: SpringParams): number;                  // ζ = b / (2√(km))
export function dampingRegime(p: SpringParams): DampingRegime;
export function springState(p: SpringParams, u0: number, v0: number, t: number): { u: number; v: number }; // (10.6), analytic
export function overshootRatio(zeta: number): number;                   // (10.7), 0 for ζ ≥ 1
export function peakTime(p: SpringParams): number;                      // π/ωd, Infinity for ζ ≥ 1
export function settlingTime(p: SpringParams, u0: number, v0: number, epsilon: number): number; // Infinity when b = 0
export function fromPerceptual(duration: number, bounce: number, m?: number): SpringParams; // (10.10)
export function isSpringAtRest(u: number, v: number, restDelta: number, restSpeed: number): boolean; // (10.11)
```
`src/lib/data/springPresets.ts`: `export interface SpringPreset { id: string; label: string; params: SpringParams; origin: 'producto' | 'ilustrativo'; source: string }` and `SPRING_PRESETS` with, in order: `motion-defecto` (100, 10, 1; Motion `spring.ts` L22-L24), `motion-xy` (500, 25, 1; `default-transitions.ts` L4-L18), `motion-escala-cero` (550, `2 * Math.sqrt(550)`, 1), `apple-ejemplo` (`fromPerceptual(0.5, 0.3)`; Apple documentation), `sobreamortiguado` (100, 40, 1; `origin: 'ilustrativo'`).

- [ ] **Step 1: Failing tests** (values from research §3.1 and §4):

```ts
const sample = (p: SpringParams, from: number, to: number, stepS: number, n: number) =>
  Array.from({ length: n }, (_, i) => Math.round(to + springState(p, from - to, 0, i * stepS).u));
test('reproduce la prueba subamortiguada de Motion', () =>
  expect(sample({ k: 300, b: 10, m: 1 }, 100, 1000, 0.2, 9)).toEqual([100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000]));
test('reproduce la prueba crítica de Motion', () =>
  expect(sample({ k: 100, b: 20, m: 1 }, 100, 1000, 0.2, 6)).toEqual([100, 635, 918, 984, 997, 1000]));
test('reproduce la prueba sobreamortiguada de Motion', () =>
  expect(sample({ k: 300, b: 100, m: 1 }, 100, 1000, 0.2, 14)).toEqual([100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999, 1000]));
test('el ejemplo de Apple: 0,5 s y rebote 0,3 → k 157,9 y b 17,6', () => {
  const p = fromPerceptual(0.5, 0.3);
  expect(p.k).toBeCloseTo(157.91, 2); expect(p.b).toBeCloseTo(17.59, 2); expect(p.m).toBe(1);
});
test('Motion por omisión: ζ = 0,5 y ω0 = 10', () => { /* dampingRatio, naturalAngularFrequency */ });
test('la escala hacia 0 de Motion es crítica exacta', () => expect(dampingRegime({ k: 550, b: 2 * Math.sqrt(550), m: 1 })).toBe('critico'));
test('.bouncy: sobrepaso 4,60 % a 0,350 s', () => { /* overshootRatio(0.7) ≈ 0.0460, peakTime ≈ 0.350 */ });
test('x y v son continuas: springState en t y el reinicio desde ese estado coinciden', () => { /* (10.9) */ });
// Review Focus 3:
test('ζ = 1 ± 1e-12 se clasifica crítico y su estado es finito', () => { /* no NaN from ωd → 0 */ });
test('b = 0: sin amortiguar, energía constante y asentamiento infinito', () => { /* settlingTime → Infinity */ });
```
Plus presets: every preset has `origin`, a non-empty `source`, and `motion-defecto` gives ζ = 0,5.

- [ ] **Step 2: Run** `pnpm vitest run src/lib/physics/dampedSpring.test.ts src/lib/data/springPresets.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Analytic per regime as research §5 Paso 3 (the same three branches as Motion); near ζ = 1 use the critical branch inside `CRITICAL_TOLERANCE` (avoid dividing by ωd). `settlingTime`: the last time |u| exceeds ε·|u0| (ε relative to the initial offset), found on the analytic solution by bracketing with the envelope bound (10.8) and bisection; document the definition in the docstring.
- [ ] **Step 4: Run** → PASS, coverage of both files ≥ 95 %.
- [ ] **Step 5: Commit** — `feat(spring): damped spring core reproducing Motion's own tests, and sourced presets`

### Task 4: Tema 10 page — MDX, tables and step figures

**Files:**
- Modify: `src/consigna.ts` (append Tema 10), `tests/e2e/topicPages.ts` (`LABS` entry `{ labTestId: 'spring-lab', hasClock: true, hasEvents: true, hasZoom: false }`)
- Create: `src/content/topics/animaciones-resorte.mdx`, `src/lib/tables/topics/animaciones-resorte.ts` (+ registry entry in `src/lib/tables/index.ts`), `src/components/topics/animaciones-resorte/SpringFigure.tsx` (+ `springPlots.ts` and tests), `tests/e2e/animaciones-resorte.spec.ts`

**Interfaces:**
- Consumes: Task 3 (`springState`, `dampingRatio`, `overshootRatio`, `SPRING_PRESETS`).
- Produces: `SpringFigure({ variant: 'libre' | 'amortiguado' | 'regimenes' | 'interrupcion' })` used by the four steps; tables `animaciones-resorte-preajustes` (k, b, m, ζ, $M_p$, $t_s$ at 2 %, origin, source) and `animaciones-resorte-conversion` (Apple's and Motion's perceptual conversions).

- [ ] **Step 1: Failing tests** — `src/content/topics.test.ts` and `looseSymbols.test.ts` already iterate every MDX: run them after creating an empty-bodied MDX to see them fail (fewer than 3 `Step`, missing `Why`). Figure unit tests: `springPlots.ts` builds the four series (undamped cosine never inside the band; damped with its envelope $e^{-\zeta\omega_0 t}$; the three regimes from the same $u_0$; interruption: spring and Bézier curves, the Bézier's velocity jumps at the retarget instant and the spring's does not).
- [ ] **Step 2: Write the MDX** following spec §6.1 and research §5–§7: equations (10.1)–(10.4) in Steps 1–2, (10.6)–(10.8) in Step 3, (10.9)–(10.11) in Step 4; `UseCase` with Motion (`spring.ts` tag v14.14.0, commit `f95ab94`, lines) and Apple (WWDC23 quotes) and the gain/cost balance; contrast Android/Material 3; class `Callout` with Módulo 5 (MAS, amortiguamiento, $b_c = 2\sqrt{km}$) and Módulo 2 (Hooke, energía elástica); `Connections` to Temas 5, 7 and 12; `related: ['control-haptico', 'coeficiente-restitucion', 'resonancia-estructural']` — **the Tema 12 slug only once Task 10 lands; until then `['control-haptico', 'coeficiente-restitucion']`** (Task 17 adds it); `classRefs` from `.reference/class-material/05-oscilaciones.md`. Figure source lines in first person. Prose ≤ 650.
- [ ] **Step 3: e2e** `animaciones-resorte.spec.ts`: page title equals the consigna title; four figures numbered 10.1–10.4; the two tables render with captions «Tabla 10.1/10.2»; exactly one resource badge.
- [ ] **Step 4: Run** `pnpm vitest run src/content src/lib/tables src/components/topics/animaciones-resorte`, `pnpm run check`, `pnpm run build`, `E2E_PORT=4336 pnpm exec playwright test tests/e2e/animaciones-resorte.spec.ts --workers=1` → PASS.
- [ ] **Step 5: Add the page's sentences to the texts list** (`docs/superpowers/review/2026-11-20-textos-entrega-final.md`, section «Tema 10»).
- [ ] **Step 6: Commit** — `feat(tema-10): Spring animations page with its steps, tables and figures`

### Task 5: Tema 10 lab — the prescribed simulation

**Files:**
- Create: `src/components/topics/animaciones-resorte/SpringLab.tsx`, `springScene.ts`, `SpringCard.tsx`, `useSpringRun.ts`, tests for each; e2e `tests/e2e/animaciones-resorte-lab.spec.ts`
- Modify: `src/content/topics/animaciones-resorte.mdx` (the lab `Figure` with `type="simulacion"`, the badge, `usage`/`leftOut` notes), e2e registries: `lab-shell.spec.ts` (`MIGRATED_LABS`; first screen at 1 280 × 800), `lab-microinteractions.spec.ts` (`KNOB_LABS`, `AXIS_LABS`, `LEGENDS` if any), `lab-preset-transition.spec.ts` (`PRESET_LABS`), `glyphs.spec.ts` (`EXTRA_STATES`: after «Interrumpir»; overdamped preset)

**Interfaces:**
- Consumes: Task 3; `LabShell`, `ParamField`, `LabPresets`, `useSimClock`, `SvgPlot`, `TimeScaleBadge`, `InlineMath`, `MathText`.
- Produces: `SpringLab` with `testId="spring-lab"`; clock duration = the larger of 3 s and the settling time at 0,2 % of the current preset, capped at 6 s (`timeUnit: 's'`); `markers`: «Interrupción» at the retarget time when used, «Pico» at `peakTime` when ζ < 1.

- [ ] **Step 1: Failing tests** — scene: the card's x at clock t equals `springState` (exact, not integrated); changing k, b or m recomputes x(t) and the readouts (ζ, régimen, $x$, $v$, sobrepaso, $t_s$); regime chip text for ζ = 0,5 / 1 / 2 and «sin amortiguar» for b = 0 (**Review Focus 3**); «Interrumpir» at t* swaps the target and restarts (10.6) from `springState` at t* with the same $v$ (difference < 1e-9), while the comparison card (cubic-bezier `0.25, 0.1, 0.25, 1`, duration = the spring's $t_s$, labelled «Curva de duración fija») restarts at its current position with zero velocity; **Review Focus 4**: two presses within 50 ms keep x and v continuous; a press at rest swaps targets with v = 0. Presets load the five `SPRING_PRESETS`, each option label says «(producto)» or «(ilustrativo)». Keyboard: every slider and «Interrumpir» reachable; reduced motion shows the final frame and the plot.
- [ ] **Step 2: Run** the new unit tests → FAIL.
- [ ] **Step 3: Implement** `SpringLab` on `LabShell` following `TriggerLab.tsx`/`BounceLab.tsx`: `levels.params` = k, b, m (two per row, `ParamField`; ranges k 10–1 000 N/m, b 0–100 N·s/m, m 0,1–5 kg); `levels.scenario` = presets + «Interrumpir»; `levels.display` = show the comparison card, show the 2 % band; scene = two lanes (spring card and fixed-duration card) over a track with start and target marks, plus `TimeScaleBadge`; `charts` = $x(t)$ for both cards with the band and the peak marker; `readouts` as above with fixed precisions; `notes.usage` and `notes.leftOut` (react-spring's semi-implicit Euler and Tema 5's integrator stay out; units cancel, so k in N/m is valid for pixels — research §4) from the MDX.
- [ ] **Step 4: Run** unit tests → PASS; `pnpm run check`; `pnpm run scale:report` → total 0; build; e2e batch `animaciones-resorte-lab lab-shell lab-controls lab-microinteractions lab-preset-transition glyphs a11y responsive measures lab-registry` on 4336 with `--workers=1` → PASS.
- [ ] **Step 5: Texts list** (lab labels, notes) → **Step 6: Commit** — `feat(tema-10): spring lab with stiffness, damping, regimes and the interruption test`

---

## Phase 1 — Tema 11, Síntesis de sonido (worktree `entrega-final-tema-11`)

### Task 6: Harmonics core, spectral analysis and the `data:harmonics` pipeline

**Files:**
- Create: `src/lib/physics/harmonics.ts` (+ test), `src/lib/audio/spectrum.ts` (+ test), `scripts/generate-instrument-harmonics.ts`, `src/data/instrument-harmonics.json`, `src/lib/data/instrumentSamples.ts` (+ test), `public/media/sintesis-sonido/flauta-mib4.mp3`, `public/media/sintesis-sonido/clarinete-mib4.mp3`
- Modify: `package.json` (`"data:harmonics": "tsx scripts/generate-instrument-harmonics.ts"`), `.prettierignore` if the JSON needs it

**Interfaces:**
- Produces (`harmonics.ts`):
```ts
export type ClassicWave = 'seno' | 'cuadrada' | 'sierra' | 'triangular';
export function classicAmplitudes(wave: ClassicWave, count: number): number[]; // signed A_n, index 0 = n 1 (research §5 Paso 3)
export function synthesize(amplitudes: readonly number[], phases: readonly number[], f1: number, t: number): number; // (11.4)
export function waveform(amplitudes: readonly number[], phases: readonly number[], periods: number, samplesPerPeriod: number): { tOverT: number[]; y: number[] };
export function halfWaveCorrelation(y: readonly number[], samplesPerPeriod: number): number; // corr(y(t), −y(t+T/2)) over whole periods
export function oddEvenPowerDb(amplitudes: readonly number[]): number; // definition of research §4.1, stated in the docstring
export function toPeriodicWave(amplitudes: readonly number[], phases: readonly number[]): { real: Float32Array; imag: Float32Array }; // a_n = A_n sin φ_n, b_n = A_n cos φ_n, index 0 = DC = 0
export function maxHarmonicBelowNyquist(f1: number, sampleRate: number): number; // ⌊fs/(2 f1)⌋ (11.9)
```
- Produces (`spectrum.ts`): `hann(n)`, `realFft(x): { re: Float64Array; im: Float64Array }` (radix-2), `welchPsd(x, sampleRate, windowS, overlap)`, `harmonicAmplitudes(x, sampleRate, f1Guess, count): { f1: number; amplitudesDb: number[] }` (parabolic peak interpolation), `attackTime(envelope, sampleRate)` (10–90 %), as in research §4.1 and `prototypes/sonido/harmonics.py`, `halfwave.py`, `envelope.py`.
- Produces (data): `INSTRUMENT_SAMPLES` with `{ id: 'flauta' | 'clarinete', file, mp3, credit, license, f1, amplitudesDb, oddEvenDb, halfWaveCorrelation, attackS, waveform }` read from the JSON; `credit` and `license` are the exact texts of research §6.2.

- [ ] **Step 1: Failing tests.** `harmonics.test.ts`: `classicAmplitudes('cuadrada', 5)` ≈ `[4/π, 0, 4/(3π), 0, 4/(5π)]`; sierra alternates sign with 2/(nπ); triangular 8/(π²n²) with alternating sign on odd n; `halfWaveCorrelation` of a square wave = 1 and of a sawtooth ≈ (P_odd − P_even)/(P_odd + P_even); `toPeriodicWave([1], [0])` → `real = [0, 0]`, `imag = [0, 1]`; `maxHarmonicBelowNyquist(310, 44100)` = 71. `spectrum.test.ts`: a synthetic 310,2 Hz signal with known recipe recovers f1 within 0,05 Hz and each amplitude within 0,2 dB. `instrumentSamples.test.ts` pins the facts the page states (research §4.1): both f1 in [310,1; 310,3] Hz and within 1,3 cents of each other; clarinete `oddEvenDb` ≈ 25,7 (±0,2) and flauta ≈ −0,7 (±0,2); half-wave correlation 0,992 (±0,005) and −0,08 (±0,03); attack 0,40 s and 0,12 s (±0,02); clarinet 3rd harmonic +3,3 dB over n = 1; flute 2nd +3,7 dB.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** core and analysis; then the script: downloads `BbClarinet.ff.Eb4.stereo.aif` and `Flute.nonvib.ff.Eb4.stereo.aif` from the MIS (URLs in research §3.2) into `media-raw/` (ignored), checks SHA-256, decodes with `ffmpeg` to 44,1 kHz mono float, runs the analysis on the original (not the MP3), trims (clarinet from 0,38 s, flute from 0,10 s), fades 10/50 ms, normalises to −20 LUFS ± 0,5 (`ffmpeg loudnorm`, two passes) and encodes MP3 128 kb/s into `public/media/sintesis-sonido/`; writes the JSON with provenance (source URLs, SHA-256, window, method, date). MP3 is the single audio format (spec §4.3): every target browser, Playwright's included, plays it.
- [ ] **Step 4: Run** `pnpm run data:harmonics`, then the tests → PASS; MP3 sizes under 60 kB each.
- [ ] **Step 5: Commit** — `feat(tema-11): harmonics core, own FFT and the reproducible flute and clarinet analysis`

### Task 7: Tema 11 page — the two analysed audios, waveform and spectrum

**Files:**
- Modify: `src/consigna.ts` (Tema 11), `tests/e2e/topicPages.ts` (`{ labTestId: 'synth-lab', hasClock: false, hasEvents: false, hasZoom: false }`)
- Create: `src/content/topics/sintesis-sonido.mdx`, `src/lib/tables/topics/sintesis-sonido.ts` (+ registry), `src/components/topics/sintesis-sonido/{SampleAnalysis.tsx,WaveformPlot.tsx,SpectrumBars.tsx,EnvelopePlot.tsx,soundPlots.ts}` (+ tests), `tests/e2e/sintesis-sonido.spec.ts`

**Interfaces:**
- Consumes: Task 2 (`AnalyzedMedia` with `kind: 'audio'`), Task 6 (`INSTRUMENT_SAMPLES`, `classicAmplitudes`, `waveform`).
- Produces: `SampleAnalysis({ sample: 'flauta' | 'clarinete' })` = `AnalyzedMedia` (markers at the attack and in the sustain, with the written analysis of research §6.4) + `EnvelopePlot` (RMS envelope with attack/analysis/decay bands) + `WaveformPlot` (4 periods, ms axis, $-y(t + T/2)$ dashed on top) + `SpectrumBars` (n = 1…12, dB re $A_1$, floor −45 dB, odd vs even by fill **and** pattern; odd/even value above). Both samples use identical axes.

- [ ] **Step 1: Failing tests** — plot builders: same y-range for both samples; odd bars carry the pattern id; the dashed curve equals −y shifted half a period; the envelope bands start at the measured attack. e2e: two `<audio>` with accessible names, four markers in total, «Figura 11.N» numbering, the tables (harmonics of both samples; classic recipes; sample data with license), exactly one resource badge (on the pair of analysed audios — one `Figure type="multimedia"` wrapping both `SampleAnalysis`).
- [ ] **Step 2: Write the MDX** per spec §6.2 and research §5–§6: (11.1)–(11.3) in Steps 1–2, (11.4)–(11.6) in Step 3, (11.7)–(11.9) in Step 4; the joint analysis «qué diferencia produce qué»; Wolfe's caveat published; `UseCase` with the W3C Recommendation (2021-06-17, §1.28.4, §1.28.6, §1.26, §1.6.2) and Chromium (`periodic_wave_handler.cc`, tag `160.0.8168.1`, commit `22cf9aec`, L105-L109, L320-L335; 576 KiB per recipe, cálculo propio); boxes for Chrome Music Lab and Hammond; class `Callout` with Módulo 5 (Tema 4, ondas, introductorio) and Módulo 1 (MCU: $T$, $f$); `related: ['control-haptico', 'animaciones-resorte']` (+ `resonancia-estructural` in Task 17). Prose ≤ 650.
- [ ] **Step 3: Run** unit + check + build + `E2E_PORT=4337 … sintesis-sonido.spec.ts` → PASS. **Step 4:** texts list. **Step 5: Commit** — `feat(tema-11): sound synthesis page with the two analysed recordings`

### Task 8: Tema 11 lab — additive synthesiser (Web Audio)

**Files:**
- Create: `src/components/topics/sintesis-sonido/{SynthLab.tsx,useAdditiveVoice.ts,synthScene.ts}` (+ tests, with a fake `AudioContext` in `src/test-audio.ts`), `tests/e2e/sintesis-sonido-lab.spec.ts`
- Modify: MDX (lab `Figure`, `showBadge={false}`), registries (`lab-shell` `MIGRATED_LABS`, `lab-preset-transition` `PRESET_LABS`, `lab-microinteractions` `KNOB_LABS` exclusion if no knob, `glyphs` `EXTRA_STATES`: «fases aleatorias» on, `LAB_WITHOUT_PRESETS` no)

**Interfaces:**
- Consumes: Task 6 (`toPeriodicWave`, `waveform`, `classicAmplitudes`, `maxHarmonicBelowNyquist`, `INSTRUMENT_SAMPLES` recipes).
- Produces: `SynthLab` `testId="synth-lab"`; `useAdditiveVoice()` → `{ isPlaying, start(): Promise<void>, stop(): void, setRecipe(amplitudes, phases), setFrequency(f1) }`.

- [ ] **Step 1: Failing tests** — **Review Focus 2**: no `AudioContext` is created before `start()`; `start()` creates one `OscillatorNode` with `setPeriodicWave(toPeriodicWave(…))` and a `GainNode` starting at 0 and ramping to −18 dBFS over 30 ms; `setRecipe` while playing ramps gain down, swaps the wave and ramps up (no step to full gain); `stop()` ramps to 0 and stops; `pagehide` closes the context; the visible «Detener» control exists whenever `isPlaying`. Scene: 10 amplitude sliders (0–1,5 relative to $A_1$, step 0,01), $f_1$ 110–880 Hz; presets seno, cuadrada, sierra, triangular, «Flauta (medida)», «Clarinete (medido)» (the measured recipes, labelled «(producto: grabación MIS)»); the waveform and spectrum recompute from the recipe; «Fases aleatorias» changes the waveform (correlation with the zero-phase one < 0,9 for the clarinet recipe) and keeps the spectrum identical; harmonics above Nyquist are disabled with a note.
- [ ] **Step 2–4: Run → FAIL, implement on `LabShell`** (no clock; `readouts` f₁, T, odd/even dB, strongest harmonic; `charts` = waveform and spectrum; `notes.leftOut`: aliasing, blowing noise, vibrato, attack), **run → PASS**, check, scale report 0, build, e2e batch with the shared suites on 4337.
- [ ] **Step 5: Texts list. Step 6: Commit** — `feat(tema-11): additive synthesiser lab with measured recipes and random phases`

---

## Phase 1 — Tema 12, Resonancia estructural (worktree `entrega-final-tema-12`)

### Task 9: Resonance core, bridge data and the `data:tacoma` measurement

**Files:**
- Create: `src/lib/physics/resonance.ts` (+ test), `src/lib/data/bridges.ts` (+ test), `src/lib/video/periodEstimate.ts` (+ test), `scripts/generate-tacoma-torsion.ts`, `src/data/tacoma-torsion.json`, `public/media/resonancia-estructural/tacoma-1940.webm`, `tacoma-1940.mp4`, `tacoma-1940-poster.jpg`
- Modify: `package.json` (`"data:tacoma": "tsx scripts/generate-tacoma-torsion.ts"`)

**Interfaces:**
- Produces (`resonance.ts`):
```ts
export interface Oscillator { m: number; k: number; b: number }
export function naturalFrequency(o: Oscillator): number;                          // f0 (12.1)
export function steadyAmplitude(o: Oscillator, F0: number, omega: number): number; // (12.3)
export function resonanceGain(zeta: number): number;                               // A_max/(F0/k) = 1/(2ζ)
export function cycleEnergies(o: Oscillator, F0: number, omega: number): { input: number; dissipated: number }; // (12.4)
export function troopForceAmplitude(F1: number, phases: readonly number[]): number; // |Σ F1 e^{iφ}| (12.5)
export function zvShaper(f: number, zeta: number): { amplitudes: readonly [number, number]; times: readonly [number, number] }; // (12.6), normalised as Klipper's shaper_defs.py
export function criticalPedestrians(zeta: number, f: number, M: number, kp: number): number; // (12.8)
export function vortexFrequency(strouhal: number, U: number, D: number): number;  // (12.9)
export function energyChangePerCycle(zetaNet: number): number;                      // ≈ −4π ζ_net (12.12)
export function forcedStep(o: Oscillator, s: { x: number; v: number }, force: number, dt: number): { x: number; v: number }; // semi-implicit Euler, for the lab
```
- Produces (`periodEstimate.ts`): `estimatePeriod(samples: readonly number[], fps: number, minS: number, maxS: number): number` (detrend, autocorrelation peak with parabolic refinement — as `prototypes/resonancia/period.py`).
- Produces (data): `TACOMA` (wind 42 mph, torsional 12 cycles/min, 14 at the start, vertical 36–38 cycles/min, ±45° at quarter points, ζ ≈ 0,005, deck depth 8 ft, S ≈ 0,11; each with source and `origin`), `MILLENNIUM` (k_p ≈ 300 N·s/m, 166 people measured on the north span test, 37 viscous dampers, ζ from < 1 % to 15–20 %), `SETRA_RANGES` (vertical 1,7–2,1 Hz, lateral 0,5–1,1 Hz), `MARCH_PACE_HZ = 2.0` (FM 3-21.5); `TACOMA_TORSION` from the JSON: `{ shots: { startS, endS, periodVideoS }[], meanPeriodVideoS, cameraFps: 16, videoFps: 24, periodRealS, frequencyRealHz, series }`.

- [ ] **Step 1: Failing tests** — `resonanceGain(0.005)` = 100; at ζ = 0,2, 2,5; `steadyAmplitude` at ω = ω0 equals `(F0/k)/(2ζ)`; `cycleEnergies` input = dissipated at steady state for 3 frequencies; `troopForceAmplitude(F1, zeros(N))` = N·F1; the mean over 2 000 random phase sets for N = 100 within 5 % of √N·F1 (seeded RNG); `zvShaper` second impulse at half the damped period with amplitude ratio $K = e^{-\zeta\pi/\sqrt{1-\zeta^2}}$, and the superposed free responses cancel after the second impulse (residual < 1e-9); `vortexFrequency(0.11, 42 mph in m/s, 8 ft in m)` ≈ 0,85 Hz; `criticalPedestrians` with ζ = 0,20 and the CL1 data ≈ 1 180 and with the CL1 ζ ≈ 37 (research §4); `energyChangePerCycle(0.005)` ≈ −0,0628. **Review Focus 3:** `steadyAmplitude` with b = 0 at ω = ω0 returns `Infinity` (not NaN) and the lab clamps it. `periodEstimate` recovers a 3,44 s sine sampled at 29,97 fps with noise within 0,5 %. `bridges.test.ts` pins the JSON: three shots with periods in [3,40; 3,51] s, mean 3,45 ± 0,03 s, real period 5,2 ± 0,1 s, frequency 0,19 ± 0,01 Hz.
- [ ] **Step 2: Run → FAIL. Step 3: Implement**; the script downloads Commons' `Tacoma Narrows Bridge destruction.ogv` (and its VP9 transcode) into `media-raw/`, checks SHA-256, extracts the grey luminance of the three shots (research §6.2 table: 0:14,3–0:25,3, 0:25,3–0:32,6 horizon tilt; 1:01,7–1:09,4 edge height, columns 170–194 of 320) with `ffmpeg … -f rawvideo -pix_fmt gray`, estimates the periods, corrects by 24/16 and writes the JSON with provenance; encodes `tacoma-1940.webm` (VP9) and `.mp4` (H.264, `+faststart`) at 640 × 480 and a poster frame.
- [ ] **Step 4: Run** `pnpm run data:tacoma` and the tests → PASS; video files under 20 MB each. **Step 5: Commit** — `feat(tema-12): resonance core and the frame-by-frame measurement of the Tacoma torsion`

### Task 10: Tema 12 page — the analysed Tacoma video and the Millennium Bridge

**Files:**
- Modify: `src/consigna.ts` (Tema 12), `tests/e2e/topicPages.ts` (`{ labTestId: 'resonance-lab', hasClock: true, hasEvents: true, hasZoom: false }`)
- Create: `src/content/topics/resonancia-estructural.mdx`, `src/lib/tables/topics/resonancia-estructural.ts` (+ registry), `src/components/topics/resonancia-estructural/{ResonanceFigure.tsx,TacomaMeasurement.tsx,resonancePlots.ts}` (+ tests), `tests/e2e/resonancia-estructural.spec.ts`

**Interfaces:**
- Consumes: Tasks 2 and 9.
- Produces: the prescribed figure = `AnalyzedMedia` with `{ kind: 'video', files: [webm, mp4], credit: 'Barney Elliott y Harbine Monroe (The Camera Shop, Tacoma), 7 de noviembre de 1940. Prelinger Archives vía Wikimedia Commons, dominio público', duration: 149.6 }`, markers at 0:14,3 (línea central = nodo), 0:32,6 (viga de alma llena en H), 0:51,1 (el viento y el oleaje: fuente de energía), 1:01,7 (contar ciclos: 3,44 s → 5,2 s reales), 1:55,8 (el colapso, a velocidad real), and `realSpeed = { label: 'Velocidad real (×2/3)', rate: 2/3, ranges: [[2, 42.8], [46.1, 115.8]] }` (Elliott's shots only; research §6.3); `TacomaMeasurement` (measured series with the fitted period, video vs corrected axis, and Farquharson's 5 s); `ResonanceFigure({ variant: 'libre' | 'curva' | 'tropa' | 'autoexcitacion' })`; the Millennium Bridge as a second, smaller `AnalyzedMedia` (YouTube `Hz72lzDxMfc`, «2000: 'Wobbly' Millennium Bridge Closed Days After Opening», Frontline by ITN, 2022-06-10, 93 s) with two markers, `showBadge={false}`.

- [ ] **Step 1: Failing tests** — plots: the resonance curve peaks at ω0 with height 1/(2ζ) for the three ζ shown; the self-excited envelope grows by $e^{-\zeta_\text{neto}\omega_0 t}$ for ζ_neto < 0; the measurement plot's x axis reads real seconds after ×1,5. e2e: the video has `preload="metadata"`, five markers in order, **Review Focus 5**: with the toggle on, seeking to the 1:01,7 marker gives `playbackRate` 2/3 and seeking to 1:55,8 gives 1; the YouTube facade of the second video (with `youtubeStub.ts`); tables (Tacoma, Millennium, Sétra, own measurement) numbered 12.N; one resource badge.
- [ ] **Step 2: Write the MDX** per spec §6.3 and research §5, §6.4: Step 1 (12.1); Step 2 (12.2)–(12.4) with Klipper's sweep and the Rhythm Nation box (CVE-2022-38392, Raymond Chen quote); Step 3 (12.5)–(12.9) with the march at 2,0 Hz, Sétra, ZV, Millennium; Step 4 (12.10)–(12.12) with Billah and Scanlan's bridge sentence; the written analysis answers the three things the consigna asks (natural frequency, excitation source, why the amplitude grows) under the markers; `UseCase` Klipper v0.13.0 (commit `61c0c8d`; `resonance_tester.py` L49-L78; `shaper_defs.py` L17-L23; costs from its docs); do not assert the Broughton date, Angers' marching or a British Army order (spec §12); class `Callout` Módulo 5 (resonancia; $b_c$); `related: ['animaciones-resorte', 'sintesis-sonido', 'control-haptico']` (only slugs already present when this lands; Task 17 completes). Prose ≤ 650.
- [ ] **Step 3: Run** unit, check, build, `E2E_PORT=4338 … resonancia-estructural.spec.ts` → PASS. **Step 4:** texts list. **Step 5: Commit** — `feat(tema-12): structural resonance page with the analysed Tacoma film and own measurement`

### Task 11: Tema 12 lab — sweep, troop and ZV filter

**Files:**
- Create: `src/components/topics/resonancia-estructural/{ResonanceLab.tsx,resonanceScene.ts,BridgeScene.tsx,useResonanceRun.ts}` (+ tests), `tests/e2e/resonancia-estructural-lab.spec.ts`
- Modify: MDX (lab `Figure`, `showBadge={false}`, notes), registries as in Task 5 (`EXTRA_STATES`: each mode)

**Interfaces:**
- Consumes: Task 9 (`forcedStep`, `steadyAmplitude`, `troopForceAmplitude`, `zvShaper`, `MARCH_PACE_HZ`, `SETRA_RANGES`).
- Produces: `ResonanceLab` `testId="resonance-lab"`, modes `'barrido' | 'tropa' | 'filtro-zv'` (a `ChoiceField` in `levels.scenario`).

- [ ] **Step 1: Failing tests** — «Barrido»: the excitation frequency sweeps linearly across [0,5 f0; 1,5 f0] over the clock and the traced envelope approaches `steadyAmplitude` within 5 % once the sweep is slow (documented rate); changing ζ redraws the analytic curve. «Tropa»: N soldiers (1–200) at 2,0 Hz with `al paso` (equal phases) vs `rompiendo el paso` (seeded random phases); the bridge amplitude ratio between them ≈ √N on average; f0 of the bridge adjustable so the reader can put it inside or outside Sétra's band. «Filtro ZV»: one push vs the two ZV impulses; residual vibration after the second impulse < 1 % of the single-push amplitude at the design frequency and grows when f0 is off by ±10 % (Klipper's ±5 % note). Readouts finite at b → 0 (**Review Focus 3**: amplitude clamped to the drawing with «crece sin límite» chip).
- [ ] **Step 2–4: Run → FAIL, implement, run → PASS** (clock in seconds; `markers` at the second ZV impulse and, in «Tropa», when the bridge reaches 90 % of its steady amplitude; `TimeScaleBadge`; numbers sourced or «(ilustrativo)»), check, scale 0, build, e2e batch with the shared suites on 4338.
- [ ] **Step 5: Texts list. Step 6: Commit** — `feat(tema-12): resonance lab with frequency sweep, marching troop and Klipper's ZV filter`

---

## Phase 1 — Tema 13, Enfriamiento líquido (worktree `entrega-final-tema-13`)

### Task 12: Hydraulics core, circuit data and the validation against GF

**Files:**
- Create: `src/lib/physics/hydraulics.ts` (+ test), `src/lib/data/liquidCooling.ts` (+ test)

**Interfaces:**
- Produces (`hydraulics.ts`):
```ts
export interface Fluid { rho: number; mu: number } // kg/m³, Pa·s
export interface Segment { id: string; label: string; length: number; diameter: number; roughness: number; dy: number; K?: number; cv?: number; curve?: { a: number; b: number } }
export interface ProfilePoint { x: number; segmentId: string; v: number; pIdeal: number; pReal: number }
export function pipeArea(D: number): number;
export function flowVelocity(Q: number, D: number): number;           // continuity (13.1)
export function reynolds(f: Fluid, v: number, D: number): number;
export function frictionFactor(Re: number, roughness: number, D: number): number; // 64/Re below 2300, Swamee–Jain above 4000, EPANET's interpolation between
export function darcyLoss(fric: number, L: number, D: number, f: Fluid, v: number): number;
export function minorLoss(K: number, f: Fluid, v: number): number;
export function cvLoss(Q: number, cv: number, f: Fluid): number;     // Δp[psi] = SG (Q[GPM]/Cv)², returned in Pa
export function bernoulliPressure(p1: number, v1: number, y1: number, v2: number, y2: number, f: Fluid): number; // (13.2), g = 9,81
export function circuitProfile(segments: readonly Segment[], Q: number, f: Fluid, p0: number): ProfilePoint[];
export function branchFlows(input: { Qrack: number; branchCurve: { a: number; b: number }; header: Segment; ports: number; layout: 'directo' | 'invertido'; f: Fluid }): { flows: number[]; converged: boolean; iterations: number };
export function operatingPoint(pump: (Q: number) => number, system: (Q: number) => number, Qmax: number): { Q: number; dp: number } | null;
```
`branchFlows`: port the algorithm of `prototypes/enfriamiento/manifold.py` (research §7.2): header segments between ports carry the cumulative flow; solve the port flows so every branch's Δp matches its curve; stop at relative change < 1e-9 or 500 iterations and return `converged: false` otherwise (**Review Focus 3**: never NaN).
- Produces (`liquidCooling.ts`): `PG25_40C` (ρ 1010,6 kg/m³, μ 1,394 mPa·s; Melinder via LBNL), `FLOW_PER_KW_LPM = 1.5` (OCP), `UQD04` (Cv 1,29 Amphenol, nominal 6,44 L/min, bore 7,24 mm; OCP v2.0.0), `MGX_MANIFOLD` (35 × 60 mm tube, 44 ports at 44,45 mm), `DESCHUTES_PUMP` (curve and 500 GPM / 80–90 psi), `RD109_CIRCUIT` (segments of research §7.1 for the 24-server reference), `GF_PUBLISHED_DROP_BAR = 1.98`, `SHAHI_2023_PORT_FLOWS` (measured per-port flows), `PRESETS = { referencia24, mgx44 }`; every value with `origin` and `source`.

- [ ] **Step 1: Failing tests** (research §6–§7): hose 9,5 mm at 7,19 L/min → 1,69 m/s; UQD bore 7,24 mm → 2,91 m/s; Bernoulli drop between them 2,84 kPa (ρ = 1010,6); manifold rise 1,067 m → ρgΔy = 10,6 kPa; `cvLoss(1,90 GPM, 1,29)` → 15,1 kPa; main pipe Re ≈ 162 000 with f ≈ 0,0163, hose Re ≈ 11 600 with f ≈ 0,030; `frictionFactor(1000, …)` = 0,064; **the RD109 profile to the farthest server totals 1,80 ± 0,02 bar, 9,2 % below GF's 1,98 bar** (ruling R7: the research's 1,83 double-counted ≈ 3,4 kPa of friction inside the UQD's Cv and GF's plate curve; errata in research §7.1); hydraulic power Δp·Q = 4,1 kW at 23 L/s; with Δp ∝ Q^1,9, +51 % flow triples pumping power; `branchFlows` direct return gives the nearest server the most flow and reverse return is within 2 % between servers for equal branches; `PRESETS.mgx44` keeps every UQD04 ≤ 6,44 L/min while `referencia24` puts it at 7,19 L/min. Review Focus 3: one server, and a 2 mm hose, return finite results or `converged: false`.
- [ ] **Step 2: Run → FAIL. Step 3: Implement. Step 4: Run → PASS** (coverage ≥ 95 %). **Step 5: Commit** — `feat(tema-13): hydraulics core and the open data of a GB200-class rack circuit, validated against GF`

### Task 13: Tema 13 page — the three figures and the declared parameters

**Files:**
- Modify: `src/consigna.ts` (Tema 13), `tests/e2e/topicPages.ts` (`{ labTestId: 'cooling-lab', hasClock: false, hasEvents: false, hasZoom: false }`)
- Create: `src/content/topics/enfriamiento-liquido.mdx`, `src/lib/tables/topics/enfriamiento-liquido.ts` (+ registry), `src/components/topics/enfriamiento-liquido/{CircuitProfileFigure.tsx,SectionStrip.tsx,VelocityAreaFigure.tsx,BranchFlowFigure.tsx,coolingPlots.ts}` (+ tests), `tests/e2e/enfriamiento-liquido.spec.ts`

**Interfaces:**
- Consumes: Task 12.
- Produces: the prescribed figure (badge) = `CircuitProfileFigure`: $v(x)$ (m/s) and $p(x)$ (kPa) over the circuit position $x$ (m), the ideal Bernoulli $p$ dashed over the real one, and `SectionStrip` under it drawing each section to scale in diameter with its name; `VelocityAreaFigure` ($v$ vs $A$ with $Q = Av$ hyperbolas for the circuit's three flows); `BranchFlowFigure` (per-server flow, direct vs reverse return, with Shahi et al. 2023's measured points). Tables: fluid; geometry; connectors and cold plate; loss breakdown computed vs published.

- [ ] **Step 1: Failing tests** — plots: the velocity steps exactly where the section changes and matches `flowVelocity`; $p_\text{ideal}$ closes the loop at its start value and $p_\text{real}$ drops by the total loss; axis labels carry units; measured points are drawn as points, the model as lines, and the legend says which is which. e2e: figure and table numbering 13.N, one resource badge, the parameter table lists every value used in the figure (cross-check by id), source lines cite OCP, LBNL, Schneider/GF, NIST/Melinder and Shahi et al.
- [ ] **Step 2: Write the MDX** per spec §6.4 and research §6: (13.1) continuity, (13.2) Bernoulli with $\rho g y$, (13.3) the class's generalized equation with $h_L$ plus Darcy–Weisbach and $K$ declared as extension («la clase los nombra; aquí los uso»), Re with 2300/4000, (13.4) parallel branches; the flow rule as an OCP datum; `UseCase` with Deschutes, GB200 NVL72-class rack, Modelica Buildings v14.0.0 (`Buildings.Fluid.DataCenters`), contrasts Shahi 2023 and EPANET; state that the cold plate's 1,2 bar is GF's design value and NVIDIA publishes no per-tray flow; class `Callout` Módulo 6 (continuidad, Bernoulli, ecuación generalizada, Reynolds); `related: ['frenado-regenerativo', 'llantas-f1']`. Prose ≤ 650.
- [ ] **Step 3: Run** unit, check, build, `E2E_PORT=4339 … enfriamiento-liquido.spec.ts` → PASS. **Step 4:** texts list. **Step 5: Commit** — `feat(tema-13): liquid cooling page with velocity and pressure along the circuit`

### Task 14: Tema 13 lab — size the circuit

**Files:**
- Create: `src/components/topics/enfriamiento-liquido/{CoolingLab.tsx,coolingScene.ts,RackDiagram.tsx}` (+ tests), `tests/e2e/enfriamiento-liquido-lab.spec.ts`
- Modify: MDX (lab `Figure`, `showBadge={false}`, notes), registries as in Task 5 (`KNOB_LABS` exclusion if no knob; `PRESET_LABS`)

**Interfaces:**
- Consumes: Task 12, Task 13's plot builders.

- [ ] **Step 1: Failing tests** — params: pump flow (L/min), hose diameter (mm, the standard sizes as a choice), number of servers (1–44), return layout (directo/invertido); recalculated $v(x)$, $p(x)$, per-server flow and the operating point on Deschutes' curve; readouts: farthest server flow vs its minimum (1,5 L/min·kW × its power), total Δp, pump hydraulic power; a chip «el servidor más lejano no llega a su mínimo» when it applies; presets «Referencia: 24 servidores (RD109)» and «MGX: 44 puertos»; `converged: false` shows «El reparto no converge con estos valores» and keeps the last valid drawing (**Review Focus 3**).
- [ ] **Step 2–4: Run → FAIL, implement on `LabShell`** (no clock; `charts` = profile and per-server flow; `canvasNotes` = what is to scale), **run → PASS**, check, scale 0, build, e2e batch on 4339.
- [ ] **Step 5: Texts list. Step 6: Commit** — `feat(tema-13): cooling lab that sizes the rack circuit and finds the pump's operating point`

---

## Phase 1 — corrections and closing

### Task 15: Tema 7 bounce count (professor's correction) — worktree `entrega-final-f`

**Files:**
- Modify: `src/content/topics/coeficiente-restitucion.mdx:290-314` and the `Why` of that step, `src/lib/physics/collision.ts:115-120` (docstring), `src/components/topics/coeficiente-restitucion/bounceScene.ts:303` (docstring), `src/lib/physics/collision.test.ts`

- [ ] **Step 1: Failing test** — the published form and the code agree:

```ts
test('la fórmula publicada, con techo, coincide con el conteo del código', () => {
  const ceilForm = (v0: number, e: number, vth: number) => Math.ceil(Math.log(v0 / vth) / Math.log(1 / e));
  for (const [v0, e, vth] of [[4.43, 0.9, 2], [4.43, 0.9, 1], [3, 0.7, 0.5], [10, 0.8, 1.3]] as const)
    expect(ceilForm(v0, e, vth)).toBe(bouncesAboveThreshold(v0, e, vth));
  expect(bouncesAboveThreshold(4, 0.5, 1)).toBe(2); // the professor's example: 4, 2 and 1 m/s
});
test('la ecuación (7.3) de la página usa el techo y no el piso más uno', () => {
  const mdx = readFileSync('src/content/topics/coeficiente-restitucion.mdx', 'utf8');
  expect(mdx).toContain('N = \\left\\lceil');
  expect(mdx).not.toContain('\\right\\rfloor + 1');
});
```
- [ ] **Step 2: Run → FAIL** (second test). **Step 3: Change** the LaTeX to `N = \left\lceil \frac{\ln(v_0/v_\text{th})}{\ln(1/e)} \right\rceil`; the `N` symbol meaning to «rebotes: impactos $e^n v_0$ estrictamente por encima del umbral; uno que cae justo en $v_\text{th}$ no rebota»; and in the `ecuacion` slot one sentence with the professor's example («con $v_0 = 4$ m/s, $v_\text{th} = 1$ m/s y $e = 0{,}5$, los impactos son de 4, 2 y 1 m/s; el tercero cae justo en el umbral y no rebota: $N = 2$»), keeping prose ≤ 650 (trim only Claude-written words if needed, R32). Align both docstrings to the ceiling form (the code's equality guard stays: floating point).
- [ ] **Step 4: Run** `pnpm vitest run src/lib/physics/collision.test.ts src/content` → PASS; build; `E2E_PORT=4331 … coeficiente-restitucion.spec.ts glyphs.spec.ts --workers=1` → PASS.
- [ ] **Step 5: Texts list** (section «Tarea F»). **Step 6: Commit** — `fix(tema-7): the bounce count uses the ceiling, so an impact exactly at the threshold does not count`

### Task 16: «Qué aprendí» at the end of the home page — worktree `entrega-final-cierre`

**Files:**
- Create: `src/content/closing/que-aprendi.mdx`, `src/lib/closing.ts` (+ test), `src/components/closing/ConnectionMap.astro`, `src/content/closing.test.ts`, `tests/e2e/que-aprendi.spec.ts`
- Modify: `src/pages/index.astro` (section after the phases), `src/components/nav/SideNav.astro` (link «Qué aprendí» → `#que-aprendi` after the phases), `src/components/nav/PrevNext.astro` (the last topic's «siguiente» goes to «Qué aprendí»)

**Interfaces:**
- Produces (`src/lib/closing.ts`):
```ts
export interface ConnectionPair { a: number; b: number; principle: string }
export const CLOSING_PAIRS: readonly ConnectionPair[]; // [{a:7,b:9,principle:'Momento lineal'},{a:6,b:13,principle:'Energía con disipación'},{a:11,b:12,principle:'Frecuencia natural'}]
export interface MapNode { number: number; shortTitle: string; phase: Phase; x: number; y: number }
export interface MapEdge { a: number; b: number; isPair: boolean; principle?: string }
export function connectionMap(topics: readonly TopicSummary[], related: ReadonlyMap<number, readonly number[]>, pairs: readonly ConnectionPair[], width: number): { nodes: MapNode[]; edges: MapEdge[]; height: number };
export const CLOSING_ANCHOR = 'que-aprendi';
```
Layout: three columns, one per delivery (5, 4, 4 nodes), equal vertical spacing; edges are the union of `related` (deduplicated, undirected) with the pairs flagged; a pair missing from `related` is still drawn.

- [ ] **Step 1: Failing tests** — unit: 13 nodes, exactly 3 pair edges with their principles, no duplicate edge, every node inside the width; `closing.test.ts`: each pair paragraph ≤ 150 words and the application ≤ 350 words (reuse `readingStats` from `src/lib/readingTime.ts`), headings «Qué aprendí», «El mapa de conexiones», «La aplicación propia: detección de caídas». e2e: the section is the last of `<main>` on the home page with `id="que-aprendi"` and `<h2>` «Qué aprendí»; the sidebar link reaches it; the Tema 13 «siguiente» link reaches it; the six topic links of the pairs resolve (200); the map SVG has 13 nodes and 3 highlighted edges, each pair readable as text (not only in the SVG); axe clean at 360 and 1 280 px, light and dark.
- [ ] **Step 2: Write the MDX** (spec §5; research `2026-11-17-deteccion-caidas.md` draft): three pair paragraphs with one equation each and the class module (Módulo 3 colisiones; Módulos 2 y 6; Módulo 5), and the fall-detection half page: free fall reads $|a| \approx 0$; $t = \sqrt{2h/g}$ = 0,40 s and $v = \sqrt{2gh}$ = 3,96 m/s from $h$ = 0,8 m (cálculo propio); impact $J = \Delta p = \bar F\,\Delta t$ and the measured 2,5–3,5 g thresholds; why the sequence (0 g → impact → stillness) beats a fixed threshold, with the counterexample of a 30 cm jump (0,49 s at 0 g); what it costs (falls without free-fall phase, the wrist is not the body; published real-fall sensitivity 57 % ± 27 %); sources: Apple Newsroom 2018 (32 g), US 10,629,048 B2, Google Pixel Watch blog 2023, Samsung, ADXL345 datasheet, the open-access papers of the research; nothing from Apple's support page (it did not load).
- [ ] **Step 3: Implement** the map, the section and the nav links. **Step 4: Run** unit, check, build, `E2E_PORT=4333 … que-aprendi.spec.ts navigation.spec.ts site-pages.spec.ts --workers=1` (after rebasing on the four topics) → PASS.
- [ ] **Step 5: Texts list** (section «Qué aprendí», marked: Dylan makes (b) his own). **Step 6: Commit** — `feat(closing): «Qué aprendí» with the connection map and the fall-detection application`

---

## Phase 2 — integration (branch `entrega-final`)

### Task 17: Integrate, complete the cross-links, document and pass the gate

**Files:**
- Modify: `src/content/topics/{control-haptico,coeficiente-restitucion,frenado-regenerativo}.mdx` (`related`: Tema 7 adds `animaciones-resorte`; Tema 5 adds `sintesis-sonido` and `resonancia-estructural`; Tema 6 adds `enfriamiento-liquido`; `updated: 2026-11-20`), the new MDX `related` completed (10 ↔ 12, 11 ↔ 12), README («Temas» table with 13 rows, «Comandos» with `data:harmonics` and `data:tacoma`, «Medios con análisis»), `docs/superpowers/review/2026-11-20-textos-entrega-final.md` (complete), `docs/superpowers/handoff/2026-10-31-avance-2-handoff.md` (new section «Entrega Final», state and open decisions)

- [ ] **Step 1:** Rebase and fast-forward each worktree branch onto `entrega-final` in the order base → 15 → 10 → 13 → 11 → 12 → 16; after each, `pnpm vitest run` and `pnpm run build` → PASS.
- [ ] **Step 2:** Cross-links and docs above; `pnpm vitest run src/content` (related symmetry where declared, ≥ 2, prose ≤ 650 for all 13) → PASS.
- [ ] **Step 3: Whole-branch review** by a fresh reviewer (strongest model) against the spec, the rubric and the Global Constraints; then a visual pass at 360 and 1 280 px, light and dark, on the home page and the four new topics; fix rounds with bounded re-review.
- [ ] **Step 4: Gate** — `pnpm run check && pnpm run test:cov && pnpm run build`, then the e2e in batches on 4322 with `--workers=1` or `2` until every spec has passed; record the numbers (tests, coverage, pages = 15: home, 404, 13 topics; e2e passed/failed) in the handoff.
- [ ] **Step 5: Hand to Dylan** the texts list and the open decisions; **stop**. Push (`git push origin entrega-final:main`) only after his explicit permission for that push; then CI and Pages green and the 13 topic pages and the home page answer 200 on the live site.
- [ ] **Step 6: Commit** — `docs(final): handoff, README and the texts list for the Final Delivery`

# Portafolio de Física I · Avance 1 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en GitHub Pages el portafolio de evidencias de Física I con la base para 13 temas y los cinco temas del Avance 1 completos, cada uno con su caso de uso de cuatro partes y su recurso del tipo prescrito.

**Architecture:** Astro 7 genera un sitio estático desde una colección MDX de 13 temas validada con zod; la física vive en funciones puras de TypeScript con pruebas; las piezas interactivas son islas React hidratadas al entrar en pantalla; los componentes Astro compartidos encarnan la rúbrica (caso de uso con cuatro huecos, figuras con fuente, ecuaciones numeradas, fuentes y conexiones).

**Tech Stack:** Astro 7.3, @astrojs/mdx 8, @astrojs/react 7, React 19.3, @astrojs/markdown-remark 7.3 + remark-math + rehype-katex + KaTeX 0.19, Tailwind 4.3 vía @tailwindcss/vite, Recharts 3.10, Vitest 5 + @vitest/coverage-v8 + jsdom + Testing Library, Playwright 1.64 + axe-core, TypeScript 6.0.3, pnpm 11.1.1, Node 24, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-08-physics-portfolio-design.md`
**Research (leer antes de las tareas 1, 11, 13, 14):** `docs/superpowers/research/2026-10-08-stack-apis.md` (APIs verificadas con un build real) y `docs/superpowers/research/2026-10-08-sources.md` (fuentes y valores confirmados para el contenido).
**Material de clase (solo para redactar "conexiones con clase"):** `.reference/class-material/00-indice.md`.

## Global Constraints

- Node 24.14, pnpm 11.1.1; `package.json` lleva `"packageManager": "pnpm@11.1.1"` y se commitean `pnpm-lock.yaml` y `pnpm-workspace.yaml`.
- Versiones fijadas tal como aparecen en "Pinned versions" del documento de stack. `typescript@^6.0.3`, nunca 7.x (`astro check` no lo soporta).
- `astro.config.mjs`: `site: 'https://djch18atschool.github.io'`, `base: '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics'`, `trailingSlash: 'always'`, `markdown.processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] })`. Nada en `mdx({...})`.
- `z` se importa de `astro/zod`. Colección en `src/content.config.ts` con `glob` de `astro/loaders`. Entradas por `entry.id`; render con `render(entry)` de `astro:content`.
- Toda URL interna pasa por `withBase()` de `src/lib/url.ts`. `import.meta.env.BASE_URL` termina en `/`. Las rutas terminan en `/`.
- En MDX, los slots con nombre se escriben como bloques `<Fragment slot="nombre">…</Fragment>` separados por líneas en blanco.
- Contenido del sitio en español con coma decimal; identificadores, commits y nombres de archivo en inglés. Commits convencionales (`feat`, `fix`, `docs`, `test`, `chore`, `ci`), un commit por tarea como mínimo, sin línea de coautoría. Identidad ya configurada localmente: Dylan Chaves, correo noreply universitario.
- Física: unidades del SI, `G_EARTH = 9.81`, notación estándar de libros de texto. Títulos de tema idénticos a `src/consigna.ts`.
- Estilos con utilidades de Tailwind y tokens CSS; sin estilos inline salvo `counter-set` o variables generadas con `define:vars`.
- Accesibilidad: todo control con etiqueta visible, operable por teclado, `aria-valuetext` con unidad; `prefers-reduced-motion` desactiva animaciones; contraste AA en ambos temas.
- Pruebas unitarias co-ubicadas (`src/**/*.test.ts` y `.test.tsx`), cobertura mínima 80% en `src/lib/**`. E2E en `tests/e2e/`.
- Ejecución por subagentes: cada tarea indica un modelo y esfuerzo sugeridos (petición de Dylan). El contenido redactado es borrador para su revisión; no se da por publicado hasta que lo apruebe.

## Review Focus

1. Extremos de los controles del salto (v0 = 25 m/s con g = 1 m/s²): la trayectoria debe ser finita, con ejes que se reescalan y animación acotada. Prueba en Tarea 16 (`computeJump` con 240 muestras fijas y dominio calculado).
2. Entradas nulas en el hábitat (RPM = 0 o r = 0): nada de `Infinity` en pantalla; las funciones lanzan `RangeError` y los controles no bajan de su mínimo. Prueba en Tarea 7.
3. Enlaces internos bajo el subdirectorio de Pages: un href sin `base` da 404 en producción pero funciona en local. Prueba en Tarea 13 (rastreo de todos los enlaces internos en preview).
4. `localStorage` bloqueado o inexistente (modo privado, vista previa): el alternador de tema no debe lanzar ni romper la hidratación. Prueba en Tarea 12.
5. Archivo de video ausente (el tema 5 se publica antes de que Dylan grabe o si el archivo falla): la página debe construir y mostrar el análisis con texto alternativo. Prueba en Tarea 20.

---

### Task 1: Andamiaje del proyecto Astro

**Modelo sugerido:** sonnet, esfuerzo medio.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.nvmrc`, `.prettierrc`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `tests/e2e/smoke.spec.ts`, `src/env.d.ts` si Astro no lo genera.
- Modify: `.gitignore` (añadir `coverage/`, `test-results/`, `playwright-report/` si faltan).

**Interfaces:**
- Produces: scripts `dev`, `build`, `preview`, `check`, `test`, `test:cov`, `e2e`, `format`; `BaseLayout.astro` con prop `title: string` y `description?: string`, que importa fuentes IBM Plex (400/500/600 sans, 400/500 mono), `katex/dist/katex.min.css` y `../styles/global.css`.

- [ ] **Step 1: Escribir `package.json`** copiando el bloque "Full package.json of the spike" del documento de stack, con `"name": "physics-portfolio"`, y añadiendo devDependencies `prettier`, `prettier-plugin-astro`, `tsx`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@axe-core/playwright`, `gray-matter` (versiones actuales de npm) y los scripts `"format": "prettier --write ."`, `"data:drone": "tsx scripts/generate-drone-route.ts"`.

- [ ] **Step 2: Escribir `pnpm-workspace.yaml`** (`allowBuilds: esbuild: true, sharp: true`), `tsconfig.json` (bloque del documento de stack, sección 7), `.nvmrc` con `24`, `.prettierrc` con `{ "plugins": ["prettier-plugin-astro"], "singleQuote": true, "printWidth": 100 }`.

- [ ] **Step 3: Escribir `astro.config.mjs`** exactamente como en la sección 1 del documento de stack.

- [ ] **Step 4: Escribir `vitest.config.ts`** usando `getViteConfig` de `astro/config` con `test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node', passWithNoTests: true, setupFiles: ['./src/test-setup.ts'], coverage: { provider: 'v8', include: ['src/lib/**'], exclude: ['src/**/*.test.*'], reporter: ['text', 'html'], thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } } }`. Crear `src/test-setup.ts` que importe `@testing-library/jest-dom/vitest`.

- [ ] **Step 5: Escribir `playwright.config.ts`** como en la sección 7 del documento de stack, con `testDir: './tests/e2e'`.

- [ ] **Step 6: Escribir `src/styles/global.css`** mínimo (`@import "tailwindcss";` y `body { font-family: var(--font-sans) }` con `@theme { --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif; --font-mono: "IBM Plex Mono", ui-monospace, monospace; }`), `src/layouts/BaseLayout.astro` (sección 5 del documento, con `lang="es"`, `<main id="contenido">`) y `src/pages/index.astro` con `<h1>Portafolio de evidencias de Física I</h1>`.

- [ ] **Step 7: Escribir la prueba e2e `tests/e2e/smoke.spec.ts`**

```ts
test('la portada carga bajo el base path', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portafolio de evidencias de Física I');
});
```

- [ ] **Step 8: Instalar y verificar**

Run: `pnpm install && pnpm exec playwright install chromium && pnpm run check && pnpm run build && pnpm run test && pnpm run e2e`
Expected: `check` con 0 errores, `build` termina con `dist/`, `test` pasa sin archivos, `e2e` 1 passed.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "chore: scaffold astro project with mdx, react, tailwind, katex and test tooling"
```

---

### Task 2: Repositorio, CI y despliegue del esqueleto en GitHub Pages

**Modelo sugerido:** sonnet, esfuerzo medio.

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `README.md`.

**Interfaces:**
- Produces: sitio público en `https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/` que se actualiza en cada push a `main`.

- [ ] **Step 1: Escribir `deploy.yml`** copiado literal de la sección 8 del documento de stack, sin los comentarios de ejemplo.

- [ ] **Step 2: Escribir `ci.yml`**: dispara en `push` y `pull_request`; `actions/checkout@v7`; `pnpm/action-setup@v4` (lee `packageManager`); `actions/setup-node@v4` con `node-version: 24` y `cache: pnpm`; `pnpm install --frozen-lockfile`; `pnpm run check`; `pnpm run test:cov`; `pnpm run build`; `pnpm exec playwright install --with-deps chromium`; `pnpm run e2e`; subir `playwright-report/` como artefacto si falla.

- [ ] **Step 3: Escribir `README.md`** con: título, autor, universidad, curso FUN-18 Física I, sección FCV1, periodo 2026-C3, docente Andrés Castro Núñez; las dos URLs (sitio y repo); tabla de los 13 temas con avance y estado; estructura de carpetas; comandos.

- [ ] **Step 4: Crear el repositorio y el remoto**

Run:
```bash
gh repo create Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics --public --description "Portafolio de evidencias de Física I (FUN-18, CENFOTEC, 2026-C3)"
git remote add origin git@github-university:Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics.git
```
Expected: el repo existe y `gh repo view Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics --json visibility` devuelve `PUBLIC`.

- [ ] **Step 5: Commit y push**

```bash
git add -A && git commit -m "ci: add CI and GitHub Pages deploy workflows with README"
git push -u origin main
```
Si el push falla con `Permission denied (publickey)`, Dylan debe ejecutar `ssh-add ~/.ssh/id_ed25519_university` en su terminal. Respaldo acordado: `git remote set-url origin https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics.git` (la identidad universitaria habilita el helper de credenciales de gh).

- [ ] **Step 6: Activar Pages con origen "GitHub Actions"**

Run: `gh api -X POST repos/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/pages -f build_type=workflow` (si responde 409, repetir con `-X PUT`).
Expected: JSON con `"build_type": "workflow"`.

- [ ] **Step 7: Verificar el despliegue**

Run: `gh run watch --exit-status` y luego `curl -sI https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/ | head -1`
Expected: workflow `Deploy to GitHub Pages` en verde; `HTTP/2 200`.

---

### Task 3: Constantes del curso y lista de la consigna

**Modelo sugerido:** sonnet, esfuerzo medio.

**Files:**
- Create: `src/consigna.ts`, `src/consigna.test.ts`.

**Interfaces:**
- Produces:
```ts
export type Phase = 1 | 2 | 3;
export type ResourceType = 'simulacion' | 'visualizacion' | 'diagrama' | 'multimedia';
export interface ConsignaTopic { number: number; slug: string; title: string; phase: Phase }
export const TOPICS: readonly ConsignaTopic[];           // los 13 de la spec §4.4, en orden
export const PHASE_LABELS: Record<Phase, string>;        // 1: 'Avance 1', 2: 'Avance 2', 3: 'Entrega Final'
export const RESOURCE_LABELS: Record<ResourceType, string>; // 'Simulación interactiva', 'Visualización de datos', 'Diagrama', 'Multimedia con análisis'
export const COURSE: { code: 'FUN-18'; name: 'Física I'; section: 'FCV1'; period: '2026-C3'; university: 'Universidad CENFOTEC'; professor: 'Andrés Castro Núñez' };
export const AUTHOR = 'Dylan Chaves';
export const REPO_URL = 'https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics';
export const SITE_URL = 'https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';
export function topicBySlug(slug: string): ConsignaTopic | undefined;
export function topicByNumber(n: number): ConsignaTopic | undefined;
export function topicsByPhase(phase: Phase): ConsignaTopic[];
```

- [ ] **Step 1: Escribir la prueba `src/consigna.test.ts`**

```ts
test('hay 13 temas numerados 1..13 en orden', () => {
  expect(TOPICS.map((t) => t.number)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13]);
});
test('los slugs son únicos y en kebab-case', () => {
  const slugs = TOPICS.map((t) => t.slug);
  expect(new Set(slugs).size).toBe(13);
  for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
});
test('los títulos del Avance 1 son idénticos a la consigna', () => {
  expect(topicByNumber(1)?.title).toBe('Rastreo y navegación de un dron de reparto');
  expect(topicByNumber(2)?.title).toBe('El salto del personaje: cómo los motores de juego falsean la gravedad');
  expect(topicByNumber(3)?.title).toBe('Gravedad artificial por rotación en hábitats espaciales');
  expect(topicByNumber(4)?.title).toBe('Llantas de Fórmula 1: la ventana de temperatura y el agarre');
  expect(topicByNumber(5)?.title).toBe('El resorte virtual detrás de un control háptico');
});
test('las fases agrupan 5, 4 y 4 temas', () => {
  expect(topicsByPhase(1).map((t) => t.number)).toEqual([1,2,3,4,5]);
  expect(topicsByPhase(2).map((t) => t.number)).toEqual([6,7,8,9]);
  expect(topicsByPhase(3).map((t) => t.number)).toEqual([10,11,12,13]);
});
```

- [ ] **Step 2: Correr la prueba** — Run: `pnpm vitest run src/consigna.test.ts` — Expected: FAIL, módulo inexistente.
- [ ] **Step 3: Implementar `src/consigna.ts`** con los valores de la spec §4.4 y §3.
- [ ] **Step 4: Correr la prueba** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: add course constants and the fixed list of 13 topics"`

---

### Task 4: Kernel de física · constantes y vectores

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/constants.ts`, `src/lib/physics/vector.ts`, `src/lib/physics/vector.test.ts`, `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
export const G_EARTH = 9.81; export const G_MOON = 1.62; export const PERSON_HEIGHT = 1.8;
export interface Vec2 { readonly x: number; readonly y: number }
export function vec(x: number, y: number): Vec2;
export function add(a: Vec2, b: Vec2): Vec2; export function sub(a: Vec2, b: Vec2): Vec2;
export function scale(a: Vec2, k: number): Vec2;
export function magnitude(a: Vec2): number; export function angle(a: Vec2): number; // rad, atan2(y, x)
export function fromPolar(r: number, theta: number): Vec2;
```
`index.ts` reexporta todos los módulos de física (se amplía en las tareas 5 a 9).

- [ ] **Step 1: Escribir `vector.test.ts`**: `magnitude(vec(3,4))` es 5; `fromPolar(20, Math.PI/4)` tiene x e y `toBeCloseTo(14.142, 3)`; `angle(vec(0,1))` es `Math.PI/2`; `add`, `sub`, `scale` devuelven objetos nuevos (`not.toBe` el argumento) con los valores esperados.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** los tres archivos.
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add constants and 2D vector helpers"`

---

### Task 5: Kernel de física · cinemática

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/kinematics.ts`, `src/lib/physics/kinematics.test.ts`.
- Modify: `src/lib/physics/index.ts`.

**Interfaces:**
- Consumes: `Vec2`, `vec`, `add`, `scale`, `magnitude` de la Tarea 4.
- Produces:
```ts
export interface State1D { x0: number; v0: number; a: number }
export function position(s: State1D, t: number): number;      // x0 + v0 t + a t²/2; RangeError si t < 0
export function velocity(s: State1D, t: number): number;      // v0 + a t
export function position2D(r0: Vec2, v0: Vec2, a: Vec2, t: number): Vec2;
export interface Sample { t: number; value: Vec2 }
export function derivativeSeries(samples: readonly Sample[]): Sample[]; // diferencias centrales; adelante/atrás en extremos; RangeError si < 2 muestras o t no creciente
export interface MotionProfile { duration: number; isTriangular: boolean; s(t: number): number; v(t: number): number; a(t: number): number }
export function trapezoidalProfile(distance: number, vMax: number, aMax: number): MotionProfile; // RangeError si algún argumento ≤ 0
```

- [ ] **Step 1: Escribir `kinematics.test.ts`**

```ts
expect(position({ x0: 0, v0: 2, a: 4 }, 3)).toBe(24);
expect(velocity({ x0: 0, v0: 2, a: 4 }, 3)).toBe(14);
expect(() => position({ x0: 0, v0: 0, a: 0 }, -1)).toThrow(RangeError);
expect(position2D(vec(0,0), vec(3,4), vec(0,-9.81), 2)).toEqual({ x: 6, y: expect.closeTo(-11.62, 2) });
// derivadas: x = t² muestreado en t = 0..4 → v(2) ≈ 4 con tolerancia 1e-9 (central), extremos con tolerancia 1
// perfil trapezoidal (100, 10, 2.5): duration 14; isTriangular false; s(14) → 100; v(7) → 10; a(2) → 2.5; a(7) → 0; a(12) → -2.5; s(4) → 20
// perfil triangular (10, 10, 2.5): duration 4; isTriangular true; v(2) → 5; s(4) → 10
expect(() => trapezoidalProfile(0, 10, 2.5)).toThrow(RangeError);
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `kinematics.ts`.** Perfil trapezoidal: `tAcc = vMax/aMax`, `dAcc = vMax²/(2 aMax)`; si `2·dAcc ≥ distance` es triangular con `vPeak = sqrt(distance·aMax)`.
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add kinematics with finite-difference derivatives and trapezoidal profile"`

---

### Task 6: Kernel de física · tiro vertical y salto

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/projectile.ts`, `src/lib/physics/projectile.test.ts`.
- Modify: `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
export interface JumpParams { v0: number; gUp: number; gDown?: number; vx?: number } // gDown por defecto = gUp; vx por defecto 0
export function apexHeight(v0: number, g: number): number;                 // v0²/(2g)
export function timeToApex(v0: number, g: number): number;                 // v0/g
export function airTime(v0: number, gUp: number, gDown?: number): number;  // v0/gUp + sqrt(2h/gDown)
export function designJump(height: number, timeToApex: number): { g: number; v0: number }; // g = 2h/t², v0 = 2h/t
export function heightAt(v0: number, g: number, t: number): number;        // v0 t − g t²/2
export interface TrajectoryPoint { t: number; x: number; y: number; vy: number }
export function trajectory(p: JumpParams, points?: number): TrajectoryPoint[]; // `points` muestras (por defecto 240) repartidas uniformemente en [0, airTime]; analítica por tramos; último punto con y = 0 exacto
```
Toda función lanza `RangeError` si `v0 ≤ 0` o alguna g ≤ 0.

- [ ] **Step 1: Escribir `projectile.test.ts`**

```ts
expect(apexHeight(10, 9.81)).toBeCloseTo(5.097, 3);
expect(timeToApex(10, 9.81)).toBeCloseTo(1.019, 3);
expect(airTime(10, 9.81)).toBeCloseTo(2.039, 3);
expect(airTime(10, 9.81, 19.62)).toBeCloseTo(1.740, 3);
expect(designJump(5.097, 1.019)).toEqual({ g: expect.closeTo(9.81, 1), v0: expect.closeTo(10, 1) });
const tr = trajectory({ v0: 10, gUp: 9.81, vx: 2 });
expect(tr).toHaveLength(240);
expect(tr.at(-1)).toMatchObject({ y: 0, t: expect.closeTo(2.039, 3), x: expect.closeTo(4.078, 3) });
expect(Math.max(...tr.map((p) => p.y))).toBeCloseTo(5.097, 2);
expect(trajectory({ v0: 25, gUp: 1 })).toHaveLength(240); // extremo del Review Focus 1
expect(() => apexHeight(10, 0)).toThrow(RangeError);
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `projectile.ts`.**
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add jump and vertical projectile model with design inverse"`

---

### Task 7: Kernel de física · movimiento circular y hábitat

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/circular.ts`, `src/lib/physics/circular.test.ts`.
- Modify: `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
export function rpmToOmega(rpm: number): number; export function omegaToRpm(omega: number): number;
export function centripetalFromOmega(omega: number, r: number): number;  // ω² r
export function centripetalFromSpeed(v: number, r: number): number;      // v²/r
export function tangentialSpeed(omega: number, r: number): number;       // ω r
export function period(omega: number): number; export function frequency(omega: number): number;
export function radiusForGravity(targetA: number, rpm: number): number;  // a/ω²; RangeError si rpm ≤ 0 o targetA ≤ 0
export function rpmForGravity(targetA: number, r: number): number;       // RangeError si r ≤ 0
export function headToFootGradient(r: number, height: number): number;   // h/r
export function maxCorneringSpeed(mu: number, g: number, r: number): number; // sqrt(μ g r)
export interface HabitatSolution { r: number; rpm: number; omega: number; v: number; aC: number; gRatio: number; period: number; frequency: number; gradient: number }
export function solveHabitat(input: { r: number; rpm: number }, g?: number): HabitatSolution; // gradient con PERSON_HEIGHT
```

- [ ] **Step 1: Escribir `circular.test.ts`**

```ts
expect(rpmToOmega(2)).toBeCloseTo(0.2094, 4);
expect(radiusForGravity(9.81, 2)).toBeCloseTo(223.6, 1);
expect(rpmForGravity(9.81, 100)).toBeCloseTo(2.99, 2);
expect(centripetalFromOmega(rpmToOmega(1), 830) / 9.81).toBeCloseTo(0.93, 2); // Toro de Stanford, NASA SP-413: R = 830 m, 1 rpm, 0,95 ± 0,05 g
expect(period(rpmToOmega(2))).toBeCloseTo(30, 6);
expect(headToFootGradient(223.6, 1.8)).toBeCloseTo(0.00805, 5);
expect(maxCorneringSpeed(1.5, 9.81, 50)).toBeCloseTo(27.1, 1);
expect(solveHabitat({ r: 830, rpm: 1 })).toMatchObject({ gRatio: expect.closeTo(0.93, 2), period: expect.closeTo(60, 3) });
expect(() => radiusForGravity(9.81, 0)).toThrow(RangeError);   // Review Focus 2
expect(() => rpmForGravity(9.81, 0)).toThrow(RangeError);
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `circular.ts`.**
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add uniform circular motion and rotating habitat solver"`

---

### Task 8: Kernel de física · fricción y modelos de neumático

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/friction.ts`, `src/lib/physics/friction.test.ts`.
- Modify: `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
export function maxStaticFriction(muS: number, N: number): number;
export function kineticFriction(muK: number, N: number): number;
export function normalOnIncline(m: number, g: number, thetaRad: number): number;    // m g cos θ
export function loadSensitiveMu(mu0: number, fz: number, fz0: number, exponent: number): number; // mu0 (fz/fz0)^(exponent − 1)
export function maxLateralForce(mu0: number, fz: number, fz0: number, exponent: number): number; // μ(fz) fz
export interface TemperatureModel { muPeak: number; tOpt: number; widthBelow: number; widthAbove: number }
export function gripVsTemperature(m: TemperatureModel, t: number): number; // muPeak·exp(−(t−tOpt)²/(2w²)), w = widthBelow si t < tOpt, si no widthAbove
export interface MagicFormulaCoefficients { B: number; C: number; D: number; E: number }
export function magicFormula(x: number, c: MagicFormulaCoefficients): number;
```

- [ ] **Step 1: Escribir `friction.test.ts`**

```ts
expect(maxStaticFriction(0.4, 98)).toBeCloseTo(39.2, 6);
expect(kineticFriction(0.3, 98)).toBeCloseTo(29.4, 6);
expect(normalOnIncline(10, 9.81, Math.PI / 6)).toBeCloseTo(84.96, 2);
expect(loadSensitiveMu(1.5, 8000, 4000, 0.9)).toBeCloseTo(1.3995, 3);
expect(maxLateralForce(1.5, 4000, 4000, 0.9)).toBeCloseTo(6000, 6);
expect(maxLateralForce(1.5, 8000, 4000, 0.9)).toBeLessThan(12000);
const m = { muPeak: 1.8, tOpt: 100, widthBelow: 20, widthAbove: 15 };
expect(gripVsTemperature(m, 100)).toBe(1.8);
expect(gripVsTemperature(m, 80)).toBeCloseTo(1.8 * Math.exp(-0.5), 6);
expect(gripVsTemperature(m, 115)).toBeCloseTo(1.8 * Math.exp(-0.5), 6);
const c = { B: 10, C: 1.9, D: 1, E: 0.97 };
expect(magicFormula(0, c)).toBe(0);
expect(magicFormula(-0.1, c)).toBeCloseTo(-magicFormula(0.1, c), 12);
expect(Math.abs(magicFormula(5, c))).toBeLessThanOrEqual(1);
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `friction.ts`.**
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add friction, load sensitivity, temperature window and magic formula"`

---

### Task 9: Kernel de física · resortes

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/spring.ts`, `src/lib/physics/spring.test.ts`.
- Modify: `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
export function hookeForce(k: number, x: number): number;            // −k x
export function elasticEnergy(k: number, x: number): number;         // k x²/2
export function piecewiseResistance(x: number, start: number, k: number): number; // 0 si x < start; k (x − start) si no
export interface ForcePoint { x: number; f: number }
export function forceCurve(fn: (x: number) => number, xMax: number, steps: number): ForcePoint[]; // steps + 1 puntos de 0 a xMax
```

- [ ] **Step 1: Escribir `spring.test.ts`**: `hookeForce(150, -0.08)` → `12` (closeTo 6); `elasticEnergy(150, -0.08)` → `0.48`; `piecewiseResistance(0.002, 0.003, 400)` → `0`; `piecewiseResistance(0.005, 0.003, 400)` → `0.8` (closeTo 6); `forceCurve(x => 2*x, 1, 4)` tiene 5 puntos, el último `{ x: 1, f: 2 }`.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `spring.ts`.**
- [ ] **Step 4: Correr con cobertura** — Run: `pnpm run test:cov` — Expected: PASS y cobertura de `src/lib/**` ≥ 80% en las cuatro métricas.
- [ ] **Step 5: Commit** — `git commit -m "feat(physics): add Hooke's law, elastic energy and trigger resistance profile"`

---

### Task 10: Utilidades de formato y URL

**Modelo sugerido:** sonnet, esfuerzo medio.

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/url.ts`, `src/lib/url.test.ts`.

**Interfaces:**
- Produces:
```ts
export function formatNumber(value: number, options?: { precision?: number; unit?: string }): string;
// coma decimal; miles separados por U+202F; unidad precedida por U+202F; precision por defecto 2; NaN/±Infinity → '—'
export function withBase(path: string, base?: string): string;  // base por defecto import.meta.env.BASE_URL; quita '/' inicial del path; añade '/' final salvo que el último segmento tenga extensión
export function topicUrl(slug: string, base?: string): string;   // `${base}temas/${slug}/`
```

- [ ] **Step 1: Escribir las pruebas**

```ts
expect(formatNumber(1234.5, { precision: 1, unit: 'm/s' })).toBe('1 234,5 m/s');
expect(formatNumber(0.5)).toBe('0,50');
expect(formatNumber(9.81, { precision: 2, unit: 'm/s²' })).toBe('9,81 m/s²');
expect(formatNumber(NaN)).toBe('—');
expect(withBase('temas/x/', '/repo/')).toBe('/repo/temas/x/');
expect(withBase('/temas/x', '/repo/')).toBe('/repo/temas/x/');
expect(withBase('media/v.mp4', '/repo/')).toBe('/repo/media/v.mp4');
expect(withBase('', '/repo/')).toBe('/repo/');
expect(topicUrl('salto-personaje', '/repo/')).toBe('/repo/temas/salto-personaje/');
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** ambos módulos. `formatNumber` usa `toFixed` y reemplaza el punto por coma; no depende de la configuración regional del sistema.
- [ ] **Step 4: Correr** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: add number formatting with decimal comma and base-aware url helpers"`

---

### Task 11: Esquema de contenido y los 13 temas en estado inicial

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Create: `src/content/topicSchema.ts`, `src/content.config.ts`, `src/content/topics.test.ts`, `src/content/topics/<slug>.mdx` × 13 (nombres = slugs de `consigna.ts`).

**Interfaces:**
- Consumes: `TOPICS`, `topicByNumber` de la Tarea 3.
- Produces:
```ts
// topicSchema.ts
import { z } from 'astro/zod';
export const sourceSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), title: z.string(), authors: z.string().optional(), year: z.number().int().optional(), publisher: z.string().optional(), url: z.string().url().optional(), accessed: z.string().optional() });
export const classRefSchema = z.object({ module: z.string(), topic: z.string(), note: z.string().optional() });
export const topicSchema = z.object({
  number: z.number().int().min(1).max(13), phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string(), shortTitle: z.string().max(40), concept: z.string(),
  status: z.enum(['publicado', 'proximamente']),
  resourceType: z.enum(['simulacion', 'visualizacion', 'diagrama', 'multimedia']).optional(),
  useCase: z.object({ product: z.string(), industry: z.string() }).optional(),
  sources: z.array(sourceSchema).default([]), related: z.array(z.string()).default([]),
  classRefs: z.array(classRefSchema).default([]), updated: z.coerce.date(),
}).superRefine(/* publicado ⇒ resourceType, useCase, sources.length ≥ 1, related.length ≥ 2 y classRefs.length ≥ 1; title y phase deben coincidir con topicByNumber(number) */);
export type TopicData = z.infer<typeof topicSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type ClassRef = z.infer<typeof classRefSchema>;
```
`content.config.ts` exporta `collections = { topics }` con `glob({ base: './src/content/topics', pattern: '*.mdx' })` y `schema: topicSchema`.

- [ ] **Step 1: Escribir `src/content/topics.test.ts`** (usa `gray-matter` para leer el frontmatter de cada `.mdx` sin Astro):

```ts
test('existen exactamente 13 archivos, uno por slug de la consigna', ...);            // nombres de archivo = TOPICS[i].slug + '.mdx'
test('cada frontmatter valida contra topicSchema', ...);                              // topicSchema.parse no lanza
test('number, title y phase coinciden con la consigna', ...);                         // para cada archivo vs topicBySlug
test('related solo apunta a slugs existentes', ...);
test('un tema publicado sin fuentes es rechazado', () => {
  expect(() => topicSchema.parse({ ...valid, status: 'publicado', sources: [] })).toThrow(/fuente/);
});
test('un título distinto al de la consigna es rechazado', () => {
  expect(() => topicSchema.parse({ ...valid, title: 'Otro' })).toThrow(/consigna/);
});
test('un tema publicado necesita dos temas relacionados y una referencia a clase', () => {
  expect(() => topicSchema.parse({ ...validPublished, related: ['salto-personaje'] })).toThrow(/relacionados/);
  expect(() => topicSchema.parse({ ...validPublished, classRefs: [] })).toThrow(/clase/);
});
```

- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar `topicSchema.ts` y `content.config.ts`.** Mensajes de error: `El tema publicado necesita al menos una fuente`, `El tema publicado necesita al menos dos temas relacionados`, `El tema publicado necesita al menos una referencia a clase`, `El título no coincide con la consigna para el tema N`.
- [ ] **Step 4: Escribir los 13 MDX** con `status: proximamente`, `shortTitle` corto, `concept` tomado de la consigna (temas 1–5) o de la frase de la lista (6–13), `updated: 2026-10-08`, sin cuerpo salvo una línea. Temas 1–5 incluyen `resourceType` desde ya.
- [ ] **Step 5: Correr pruebas y build** — Run: `pnpm run test && pnpm run build` — Expected: PASS y build sin errores (el build valida el esquema real de Astro).
- [ ] **Step 6: Commit** — `git commit -m "feat(content): add topic schema and the 13 topic entries in initial state"`

---

### Task 12: Tokens de diseño, estilos globales, layout base y alternador de tema

**Modelo sugerido:** opus, esfuerzo alto. Cargar el skill `frontend-design:frontend-design` antes de elegir colores y tipografía, y `dataviz` para la paleta de series.

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/tokens.test.ts`, `src/lib/color.ts`, `src/lib/color.test.ts`, `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/components/nav/ThemeToggle.tsx`, `src/components/nav/ThemeToggle.test.tsx`, `src/components/nav/SiteHeader.astro`, `src/components/nav/SiteFooter.astro`.
- Modify: `src/styles/global.css`, `src/layouts/BaseLayout.astro`.

**Interfaces:**
- Produces: variables CSS en `:root` y en `:root[data-theme="dark"]` (y `@media (prefers-color-scheme: dark)` para `:root:not([data-theme="light"])`): `--bg`, `--bg-elevated`, `--fg`, `--fg-muted`, `--border`, `--accent`, `--accent-fg`, `--sim`, `--viz`, `--diag`, `--media`, `--grid`, `--chart-1` … `--chart-6`, `--radius`, expuestas a Tailwind con `@theme inline` como `--color-bg`, `--color-fg`, … (utilidades `bg-bg`, `text-fg`, `border-border`, `text-sim`, etc.).
```ts
// color.ts
export function contrastRatio(hexA: string, hexB: string): number; // WCAG 2.1
// theme.ts
export type Theme = 'light' | 'dark';
export function resolveTheme(stored: string | null, systemPrefersDark: boolean): Theme;
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | undefined): string | null; // try/catch → null
export function writeStoredTheme(storage: Pick<Storage, 'setItem'> | undefined, theme: Theme): boolean; // try/catch → false
```
`ThemeToggle` (React, `client:load`): botón con `aria-label="Cambiar a tema oscuro"`/`claro`, fija `document.documentElement.dataset.theme` y persiste. `BaseLayout` lleva un `<script is:inline>` en `<head>` que aplica el tema guardado antes del primer pintado, envuelto en try/catch. `SiteHeader` muestra título del sitio, autor y `ThemeToggle`; `SiteFooter` muestra curso, periodo, enlace al repo y "Última actualización".

- [ ] **Step 1: Escribir `color.test.ts`**: `contrastRatio('#000000', '#ffffff')` → 21 (closeTo 1); `contrastRatio('#777777', '#ffffff')` → 4.48 (closeTo 2).
- [ ] **Step 2: Escribir `theme.test.ts`**: `resolveTheme(null, true)` → `'dark'`; `resolveTheme('light', true)` → `'light'`; `readStoredTheme({ getItem() { throw new Error() } })` → `null`; `writeStoredTheme({ setItem() { throw new Error() } }, 'dark')` → `false`; `writeStoredTheme(undefined, 'dark')` → `false`.
- [ ] **Step 3: Escribir `tokens.test.ts`**: lee `src/styles/tokens.css`, extrae `--bg`/`--fg`/`--fg-muted`/`--accent` de los bloques claro y oscuro y verifica `contrastRatio(fg, bg) ≥ 7`, `contrastRatio(fgMuted, bg) ≥ 4.5`, `contrastRatio(accent, bg) ≥ 4.5` en ambos temas.
- [ ] **Step 4: Escribir `ThemeToggle.test.tsx`** (`// @vitest-environment jsdom`): al hacer clic cambia `document.documentElement.dataset.theme` de `light` a `dark` y el `aria-label`; con `localStorage.setItem` reemplazado por una función que lanza, el clic no lanza y el tema igual cambia (Review Focus 4).
- [ ] **Step 5: Correr** — Expected: FAIL.
- [ ] **Step 6: Implementar** tokens, utilidades, `theme.ts`, `ThemeToggle.tsx`, header, footer y el layout. Reglas: fondo claro papel cálido, oscuro grafito; cuatro acentos distinguibles entre sí también en oscuro; `@media (prefers-reduced-motion: reduce)` anula transiciones; tipografía base 17px/1.6; columna de lectura `max-width: 70ch`.
- [ ] **Step 7: Correr pruebas, check y build** — Expected: PASS, 0 errores, build correcto. Abrir `pnpm run preview --ignore-lock` y revisar ambos temas en escritorio y a 375 px.
- [ ] **Step 8: Commit** — `git commit -m "feat(ui): add design tokens, base layout, header, footer and theme toggle"`

---

### Task 13: Navegación y páginas: portada, página de tema, 404

**Modelo sugerido:** opus, esfuerzo alto. Cargar `frontend-design:frontend-design`.

**Files:**
- Create: `src/lib/topics.ts`, `src/lib/topics.test.ts`, `src/components/nav/SideNav.astro`, `src/components/nav/TopicCard.astro`, `src/components/nav/Breadcrumbs.astro`, `src/components/nav/PrevNext.astro`, `src/components/ui/StatusBadge.astro`, `src/components/ui/ResourceBadge.astro`, `src/layouts/TopicLayout.astro`, `src/pages/temas/[slug].astro`, `src/pages/404.astro`, `tests/e2e/navigation.spec.ts`, `tests/e2e/links.spec.ts`.
- Modify: `src/pages/index.astro`.

**Interfaces:**
- Consumes: `TOPICS`, `PHASE_LABELS`, `RESOURCE_LABELS`, `COURSE`, `AUTHOR` (Tarea 3); `topicUrl`, `withBase` (Tarea 10); `TopicData` (Tarea 11); `BaseLayout` (Tarea 12).
- Produces:
```ts
// topics.ts (puro, sin astro:content)
export interface TopicSummary { slug: string; number: number; phase: Phase; title: string; shortTitle: string; status: 'publicado' | 'proximamente'; resourceType?: ResourceType }
export function sortByNumber<T extends { number: number }>(items: readonly T[]): T[];
export function neighbors<T extends { number: number }>(sorted: readonly T[], number: number): { prev?: T; next?: T };
export function publishedCount(items: readonly { status: string }[]): number;
```
`TopicLayout.astro` props: `{ topic: TopicData & { slug: string }; all: TopicSummary[] }`; renderiza `SideNav`, `Breadcrumbs`, encabezado ("Tema N · Avance X", título h1, concepto, `ResourceBadge`), `<slot />`, `PrevNext`, pie con fecha y enlace "Ver fuente de esta página en GitHub" (`${REPO_URL}/blob/main/src/content/topics/${slug}.mdx`). Si `status === 'proximamente'` muestra un aviso `data-testid="upcoming-notice"` con "Se publica en {PHASE_LABELS[phase]}" en lugar del slot. `SideNav`: `<nav aria-label="Temas">`, tres grupos por fase, `aria-current="page"` en el activo, `data-testid="topic-link"` en cada enlace, implementado con `<details>` para el cajón móvil. Portada: hero con `AUTHOR`, `COURSE`, "N de 13 temas publicados", tres grupos de `TopicCard`. `404.astro` incluye `SideNav`.

- [ ] **Step 1: Escribir `topics.test.ts`**: `sortByNumber` ordena; `neighbors(sorted, 1)` sin `prev`; `neighbors(sorted, 13)` sin `next`; `neighbors(sorted, 5)` → prev 4, next 6; `publishedCount` cuenta solo `publicado`.
- [ ] **Step 2: Escribir `tests/e2e/navigation.spec.ts`**

```ts
test('la portada lista los 13 temas con sus títulos exactos agrupados por avance', ...); // 13 topic-link; contiene 'Avance 1', 'Avance 2', 'Entrega Final'; texto 'de 13 temas publicados'
test('un tema próximo muestra el aviso de su avance', ...);  // ./temas/frenado-regenerativo/ → upcoming-notice contiene 'Avance 2'
test('la barra lateral marca el tema activo y navega', ...); // aria-current en el enlace del tema actual; clic en otro cambia la URL
test('la página 404 muestra la navegación', ...);            // ./no-existe/ → status 404 y nav[aria-label="Temas"] visible
```

- [ ] **Step 3: Escribir `tests/e2e/links.spec.ts`**: para la portada y las 13 páginas de tema, recoger todos los `a[href]` que empiecen por `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/` y pedirlos con `request.get`; todos responden 200 (Review Focus 3).
- [ ] **Step 4: Correr unitarias y e2e** — Expected: FAIL (componentes inexistentes).
- [ ] **Step 5: Implementar** los componentes y páginas. `[slug].astro`: `getStaticPaths` desde `getCollection('topics')`, lanza `Error` si `topic.id` no coincide con el slug de `topicByNumber(topic.data.number)`; pasa `all` ordenado.
- [ ] **Step 6: Correr unitarias, check, build y e2e** — Expected: todo PASS.
- [ ] **Step 7: Commit** — `git commit -m "feat(nav): add index, topic pages, sidebar navigation and 404"`

---

### Task 14: Componentes de contenido que encarnan la rúbrica

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/components/ui/UseCase.astro`, `Equation.astro`, `Figure.astro`, `Sources.astro`, `Cite.astro`, `Connections.astro`, `Callout.astro`, `src/styles/content.css`, `src/lib/sources.ts`, `src/lib/sources.test.ts`, `src/content/topics/_fixture.md` NO (no se crean fixtures en la colección); la verificación es sobre el tema 2 real en la Tarea 16.
- Modify: `src/styles/global.css` (importa `content.css`), `src/layouts/TopicLayout.astro` (envuelve el slot en `<div class="topic-body" style={`counter-set: topic ${number}`}>`).

**Interfaces:**
- Produces (props):
  - `UseCase`: slots obligatorios `caso`, `ecuacion`, `justificacion`, `balance`; lanza `Error('UseCase: falta el slot "<nombre>"')` en frontmatter si `!Astro.slots.has(nombre)`. Renderiza `<section data-testid="use-case">` con cuatro `<h3>`: "El caso concreto", "La ecuación", "Por qué modelar la física", "Qué se gana y qué cuesta", cada uno con `data-part="caso|ecuacion|justificacion|balance"`.
  - `Equation`: `{ latex: string; id?: string; inline?: boolean; symbols?: { symbol: string; meaning: string; unit?: string }[] }`; renderiza KaTeX en build con `katex.renderToString` (import de `katex`), numerada "Ec. N.k" por contador CSS salvo `inline`; leyenda de símbolos como `<dl>`.
  - `Figure`: `{ type: ResourceType; caption: string; source: { text: string; url?: string }; id?: string }`; lanza `Error('Figure: falta la fuente')` si `source.text` está vacío; renderiza `<figure data-testid="figure" data-type>` con `ResourceBadge`, slot, `<figcaption>` "Figura N.k · caption" y `<p class="figure-source">Fuente: …</p>`.
  - `Sources`: `{ sources: Source[] }` → `<section data-testid="sources"><h2>Fuentes</h2><ol>` con `<li id="fuente-<id>">` (título, autores, año, editorial, enlace, "consultado el …").
  - `Cite`: `{ id: string; sources: Source[] }` → `<a class="cite" href="#fuente-<id>">[n]</a>`; lanza `Error('Cite: fuente "<id>" no declarada')` si no existe.
  - `Connections`: `{ related: string[]; classRefs: ClassRef[] }` → `<section data-testid="connections">` con lista "Con otros temas" (enlaces con `topicUrl` y título de `consigna.ts`) y lista "Con lo visto en clase".
  - `Callout`: `{ variant: 'nota' | 'clase' | 'cuidado'; title?: string }`.
```ts
// sources.ts
export function sourceIndex(sources: readonly { id: string }[], id: string): number; // 1-based; RangeError si no existe
export function formatSource(s: Source): string; // "Autores (año). Título. Editorial." sin partes vacías
```
`content.css`: contadores `figure`, `equation` reiniciados en `.topic-body`; `figcaption::before { content: "Figura " counter(topic) "." counter(figure) " · " }`; `.equation::after { content: "(" counter(topic) "." counter(equation) ")" }`; estilo de `.figure-source`, `.cite`, retícula de fondo en `figure`.

- [ ] **Step 1: Escribir `sources.test.ts`**: `sourceIndex([{id:'a'},{id:'b'}], 'b')` → 2; id ausente → `RangeError`; `formatSource({ id:'x', title:'T', authors:'A', year: 2020 })` → `'A (2020). T.'`.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** `sources.ts`, los siete componentes y `content.css`; conectar `TopicLayout`.
- [ ] **Step 4: Verificar los fallos de build a mano**: en el MDX del tema 2 (aún próximo) poner temporalmente un `<UseCase>` sin el slot `balance`, correr `pnpm run build`, comprobar que falla con `falta el slot "balance"`, y revertir el cambio.
- [ ] **Step 5: Correr unitarias, check y build** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(ui): add use-case, equation, figure, sources, cite, connections and callout components"`

---

### Task 15: Controles interactivos y primitivas de gráficas

**Modelo sugerido:** sonnet, esfuerzo alto. Cargar `dataviz` antes de `chartTheme.ts` y `LineChart.tsx`.

**Files:**
- Create: `src/lib/limits.ts`, `src/lib/limits.test.ts`, `src/components/controls/ControlPanel.tsx`, `Slider.tsx`, `Slider.test.tsx`, `Readout.tsx`, `Readout.test.tsx`, `Presets.tsx`, `Presets.test.tsx`, `src/components/charts/chartTheme.ts`, `ChartFrame.tsx`, `LineChart.tsx`, `LineChart.test.tsx`.

**Interfaces:**
- Consumes: `formatNumber` (Tarea 10); tokens `--chart-1…6` (Tarea 12).
- Produces:
```tsx
export interface SliderProps { id: string; label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; precision?: number }
export interface ReadoutProps { label: string; value: number; unit: string; precision?: number }
export interface Preset<T> { id: string; name: string; values: T; sourceLabel?: string; note?: string }
export interface PresetsProps<T> { presets: Preset<T>[]; activeId?: string; onSelect: (preset: Preset<T>) => void }
export interface ControlPanelProps { title: string; onReset: () => void; children: React.ReactNode }
export interface AxisSpec { label: string; unit: string; domain?: [number, number] }
export interface SeriesSpec { key: string; name: string; color?: string; dashed?: boolean }
export interface ReferenceBand { from: number; to: number; label: string }
export interface LineChartProps { title: string; data: Record<string, number>[]; xKey: string; xAxis: AxisSpec; yAxis: AxisSpec; series: SeriesSpec[]; bands?: ReferenceBand[]; aspectRatio?: number }
export interface ChartFrameProps { title: string; children: React.ReactNode; footnote?: string }
export const CHART_COLORS: string[]; // ['var(--chart-1)', …]
// limits.ts
export type Range = readonly [number, number];
export function clamp(value: number, range: Range): number;            // NaN o ±Infinity → range[0]
export function clampSettings<T extends Record<string, number>>(values: T, limits: { [K in keyof T]: Range }): { values: T; clamped: (keyof T)[] }; // objeto nuevo, nunca muta
```
`Slider`: `<label for=id>` con "label (unit)", `<input type="range">` con `aria-valuetext` = `formatNumber(value, { unit })`, valor visible en monoespaciada y rango "min–max" visible junto al control. `LineChart`: Recharts con `responsive`, ejes con `Label` que incluye la unidad ("t (s)"), `Tooltip` con `formatNumber` y unidad; lanza `Error('LineChart: el eje <x|y> necesita unidad')` si `unit` está vacío; con `data` vacío renderiza `<p data-testid="chart-empty">Sin datos para graficar</p>` en lugar del gráfico; `bands` se dibujan con `ReferenceArea`.

- [ ] **Step 1: Escribir las pruebas**: `limits.test.ts` (node): `clamp(5, [0, 3])` → 3; `clamp(NaN, [1, 3])` → 1; `clampSettings({ g: 500, v0: 8 }, { g: [1, 150], v0: [2, 25] })` → `{ values: { g: 150, v0: 8 }, clamped: ['g'] }` y no muta la entrada. Con jsdom: `Slider` muestra "Gravedad (m/s²)" y `aria-valuetext` "9,81 m/s²", y `onChange` recibe `20` tras `fireEvent.change` con `'20'`; `Readout` muestra "5,10 m"; `Presets` llama `onSelect` con el preset al hacer clic y marca `aria-pressed` en el activo; `LineChart` lanza si `yAxis.unit === ''`, renderiza el título, y con `data: []` muestra `chart-empty`.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** los componentes.
- [ ] **Step 4: Correr unitarias y check** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): add slider, readout, presets, control panel and line chart primitives"`

---

### Task 16: Tema 2 · simulador del salto y contenido

**Modelo sugerido:** opus, esfuerzo alto. Leer `docs/superpowers/research/2026-10-08-sources.md` secciones 1 a 4 antes de escribir preajustes o citas.

**Files:**
- Create: `src/lib/data/jumpPresets.ts`, `src/lib/data/jumpPresets.test.ts`, `src/components/topics/salto-personaje/jumpModel.ts`, `jumpModel.test.ts`, `JumpSimulator.tsx`, `JumpCanvas.tsx`, `JumpDesigner.tsx`, `tests/e2e/salto-personaje.spec.ts`.
- Modify: `src/content/topics/salto-personaje.mdx` (contenido completo, `status: publicado`).

**Interfaces:**
- Consumes: `trajectory`, `apexHeight`, `timeToApex`, `airTime`, `designJump` (Tarea 6); controles y `LineChart` no (el lienzo es SVG propio); `Slider`, `Readout`, `Presets`, `ControlPanel` (Tarea 15); `UseCase`, `Equation`, `Figure`, `Sources`, `Cite`, `Connections`, `Callout` (Tarea 14).
- Produces:
```ts
export interface JumpSettings { v0: number; g: number; vx: number; fallMultiplier: number }
export const JUMP_LIMITS = { v0: [2, 25], g: [1, 150], vx: [0, 12], fallMultiplier: [1, 4] } as const;
export const JUMP_DEFAULTS: JumpSettings = { v0: 8, g: 9.81, vx: 3, fallMultiplier: 1 };
export const JUMP_PRESETS: Preset<JumpSettings>[]; // 'tierra' {8, 9.81, 3, 1}; 'luna' {8, 1.62, 3, 1}; 'celeste' {13.1, 112.5, 11.25, 1} con escala 8 px = 1 m (un tile) desde Gravity 900 px/s², JumpSpeed 105 px/s, MaxRun 90 px/s; 'super-mario-bros' {15, 28.1, 6, 3.5} con escala 16 px = 1 m (un bloque) y 60 fps desde v0 = 4 px/frame, g = 0.125 px/frame² con A sostenido y 0.4375 px/frame² al soltar
export interface JumpResult { points: TrajectoryPoint[]; hMax: number; tApex: number; tAir: number; range: number; domain: { x: [number, number]; y: [number, number] } }
export function computeJump(s: JumpSettings): JumpResult; // domain.x = [0, max(range, 1)], domain.y = [0, hMax * 1.1]
```
`JumpSimulator` (`client:visible`): estado `JumpSettings`; al aplicar un preajuste o el diseñador pasa por `clampSettings(values, JUMP_LIMITS)` y, si recortó algo, muestra `<p data-testid="clamp-note">` con los campos recortados; cuatro `Slider` (impulso de salto v0 en m/s, gravedad g en m/s², velocidad horizontal en m/s, multiplicador de caída sin unidad → unidad `×`); `Readout` para altura máxima, tiempo al ápice, tiempo en el aire y alcance; `Presets`; `JumpCanvas` dibuja la trayectoria actual y la fantasma con g = 9,81 (misma v0 y vx) en SVG con ejes etiquetados; marcador animado con `requestAnimationFrame` sobre los 240 puntos, duración de animación acotada a `min(tAir, 4)` segundos de reloj, desactivado si `matchMedia('(prefers-reduced-motion: reduce)')`. `JumpDesigner`: entradas altura (m) y tiempo al ápice (s), muestra g y v0 derivados y botón "Aplicar" que llama a `onApply(settings)`.

- [ ] **Step 1: Escribir `jumpModel.test.ts`**: `computeJump({ v0: 10, g: 9.81, vx: 0, fallMultiplier: 1 })` → `hMax` 5.097, `tAir` 2.039, `points.length` 240, `domain.y[1]` closeTo 5.607; con `fallMultiplier: 2` → `tAir` 1.740; `computeJump({ v0: 25, g: 1, vx: 0, fallMultiplier: 1 })` → `hMax` 312.5 y 240 puntos finitos (Review Focus 1).
- [ ] **Step 2: Escribir `jumpPresets.test.ts`**: hay 4 preajustes con ids `tierra`, `luna`, `celeste`, `super-mario-bros`; cada `values` está dentro de `JUMP_LIMITS`; cada uno tiene `sourceLabel` no vacío; `tierra.values.g === 9.81`, `luna.values.g === 1.62`.
- [ ] **Step 3: Escribir `tests/e2e/salto-personaje.spec.ts`**

```ts
test('mover la gravedad recalcula la altura máxima', ...); // leer readout "Altura máxima"; fijar slider gravedad a 20 con fill + dispatch; el valor numérico baja
test('el preajuste Luna cambia los controles', ...);        // clic en botón "Luna" → slider gravedad vale 1.62
test('la página cumple la estructura del tema', ...);       // use-case con 4 data-part; figure[data-type="simulacion"]; sources con ≥ 4 li; connections visible; .katex-display ≥ 2
```

- [ ] **Step 4: Correr** — Expected: FAIL.
- [ ] **Step 5: Implementar** `jumpModel.ts`, `jumpPresets.ts` (valores de la interfaz de arriba; `sourceLabel` y `note` con la escala píxel→metro y la simplificación de cada preajuste: Celeste no modela el sostén de 0,2 s ni la media gravedad cerca del ápice; Mario usa el salto parado), `JumpCanvas.tsx`, `JumpDesigner.tsx`, `JumpSimulator.tsx`.
- [ ] **Step 6: Redactar `salto-personaje.mdx`** siguiendo la spec §8.2 y §4.3: `UseCase` con los cuatro `<Fragment slot>`; `Equation` para y(t), h_máx, t_aire y el diseño inverso; `Figure type="simulacion"` envolviendo `<JumpSimulator client:visible />` con fuente "Simulación del autor sobre `src/lib/physics/projectile.ts`"; `Callout variant="clase"` enlazando el Módulo 1 temas 1.2 y 1.3; sección "Conexiones" con prosa y `<Connections related={frontmatter.related} classRefs={frontmatter.classRefs} />`; `<Sources sources={frontmatter.sources} />`. Fuentes solo las confirmadas en el documento de fuentes, con `accessed: '2026-10-08'`. Marcar el archivo como borrador para Dylan en el mensaje de entrega de la tarea, no en el contenido.
- [ ] **Step 7: Correr unitarias, check, build y e2e** — Expected: PASS.
- [ ] **Step 8: Commit** — `git commit -m "feat(tema-2): add jump simulator with presets and publish the topic"`

---

### Task 17: Tema 3 · diagrama del hábitat, calculadora y contenido

**Modelo sugerido:** opus, esfuerzo alto. Leer secciones 7 a 9 del documento de fuentes.

**Files:**
- Create: `src/lib/data/habitatPresets.ts`, `habitatPresets.test.ts`, `src/components/topics/gravedad-artificial/HabitatDiagram.astro`, `HabitatCalculator.tsx`, `tests/e2e/gravedad-artificial.spec.ts`.
- Modify: `src/content/topics/gravedad-artificial.mdx`.

**Interfaces:**
- Consumes: `solveHabitat`, `radiusForGravity`, `rpmForGravity` (Tarea 7); controles (Tarea 15); componentes de contenido (Tarea 14).
- Produces:
```ts
export interface HabitatSettings { r: number; rpm: number }
export const HABITAT_LIMITS = { r: [5, 4000], rpm: [0.1, 10] } as const; // paso del slider de radio: 5 m
export const HABITAT_PRESETS: Preset<HabitatSettings>[]; // 'toro-stanford' {830, 1} (NASA SP-413), 'cilindro-oneill' {4000, 0.47} (SP-413, Isla Tres, 'note' aclara que son cifras de diseño), 'centrifuga-pequena' {10, 9.46}
```
`HabitatDiagram.astro`: SVG inline `role="img"` `data-testid="habitat-diagram"` con `<title>` y `<desc>`, elementos: anillo, eje de giro, radio r, flecha de ω, persona con la cabeza hacia el eje, vector a_c hacia el centro, vector de gravedad aparente hacia afuera, altura h marcada, y textos `a_c = ω²r`, `v = ωr`, `T = 2π/ω`, `Δa/a = h/r` (con `<tspan>` para subíndices); colores por variables CSS. `HabitatCalculator` (`client:visible`): selector de modo (`radio` "Fijar 1 g y despejar r" | "Fijar r y despejar RPM"); en el primero `Slider` RPM y `Readout` radio; en el segundo `Slider` radio y `Readout` RPM; siempre `Readout` de ω, v, a_c, a_c/g, T, f y diferencia cabeza–pies en %; `Presets`.

- [ ] **Step 1: Escribir `habitatPresets.test.ts`**: tres preajustes dentro de `HABITAT_LIMITS`; `toro-stanford` resuelve `gRatio` closeTo 0.93 (2 decimales); `centrifuga-pequena` resuelve `gRatio` closeTo 1 (1 decimal).
- [ ] **Step 2: Escribir el e2e**: el SVG `habitat-diagram` es visible y contiene textos con `ω²` y `2π`; en modo "Fijar 1 g", poner RPM en 2 muestra radio "223,6 m"; `figure[data-type="diagrama"]` existe; estructura del tema (use-case 4 partes, sources, connections).
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** diagrama, calculadora y preajustes.
- [ ] **Step 5: Redactar `gravedad-artificial.mdx`** según spec §8.3: caso concreto = SpinCalc de Theodore Hall (herramienta de diseño de hábitats que implementa estas ecuaciones y los criterios de confort de Hill y Schnitzer, Gilruth, Gordon y Gervais, Stone y Cramer) y el diseño del Toro de Stanford en NASA SP-413; Elite Dangerous se menciona solo si el implementador confirma una fuente oficial de Frontier (el documento de fuentes no lo logró), en caso contrario se omite. Caso numérico escrito: 2 RPM → 223,6 m; 100 m → 2,99 RPM; Toro de Stanford 830 m a 1 RPM → 0,93 g, que SP-413 reporta como 0,95 ± 0,05 g. La extensión ΣF = m a_c va en un `Callout variant="clase"`.
- [ ] **Step 6: Correr todo** — Expected: PASS.
- [ ] **Step 7: Commit** — `git commit -m "feat(tema-3): add annotated habitat diagram, calculator and publish the topic"`

---

### Task 18: Tema 1 · ruta del dron, dataset y perfiles

**Modelo sugerido:** opus, esfuerzo alto. Leer secciones 5 y 6 del documento de fuentes.

**Files:**
- Create: `src/lib/data/droneRoute.ts`, `droneRoute.test.ts`, `scripts/generate-drone-route.ts`, `src/data/drone-route.json`, `src/components/topics/dron-reparto/DroneProfiles.tsx`, `RouteMap.tsx`, `tests/e2e/dron-reparto.spec.ts`.
- Modify: `src/content/topics/dron-reparto.mdx`.

**Interfaces:**
- Consumes: `trapezoidalProfile`, `derivativeSeries`, `Vec2` (Tareas 4–5); `LineChart`, `Slider` (Tarea 15).
- Produces:
```ts
export interface RouteStop { name: string; x: number; y: number; dwell: number } // m, s
export interface RouteDefinition { stops: RouteStop[]; vMax: number; aMax: number; dt: number }
export const DRONE_ROUTE: RouteDefinition; // depósito (0,0,0) → A (600,200,20) → B (900,800,20) → C (300,1100,20) → depósito (0,0,0); vMax 10 m/s y aMax 2.5 m/s² = valores por defecto de ArduPilot Copter 4.6.3 (WPNAV_SPEED 1000 cm/s, WPNAV_ACCEL 250 cm/s², llamados WP_SPD y WP_ACC en la documentación actual) según el doc de fuentes §5; dt 0.1
export interface RouteSample { t: number; x: number; y: number; vx: number; vy: number; speed: number; ax: number; ay: number; accel: number }
export function generateRoute(def: RouteDefinition): RouteSample[]; // perfil trapezoidal por tramo, parada en cada vértice, velocidad y aceleración analíticas del perfil proyectadas sobre el rumbo del tramo
export function routeDuration(def: RouteDefinition): number;
```
`scripts/generate-drone-route.ts` escribe `src/data/drone-route.json` (`{ definition, samples }`). `DroneProfiles` (`client:visible`) importa el JSON y renderiza: `RouteMap` (SVG x–y con la ruta, paradas etiquetadas, marcador en `t` y vectores v y a escalados) con `Slider` de tiempo; cuatro `LineChart`: posición (x, y en m vs t en s), velocidad (vx, vy, |v| en m/s), aceleración (ax, ay, |a| en m/s²); una línea vertical de referencia en `t` seleccionado en cada gráfica.

- [ ] **Step 1: Escribir `droneRoute.test.ts`**: con vMax 10 y aMax 2.5, `routeDuration(DRONE_ROUTE)` closeTo 387.4 (1 decimal); `generateRoute` empieza y termina en (0,0); `t` crece de 0.1 en 0.1; `max(speed) ≤ vMax + 1e-9`; `max(accel) ≤ aMax + 1e-9`; durante la parada en A (muestras con `t` entre el fin del tramo 1 y + 20 s) `speed` es 0.
- [ ] **Step 2: Escribir el e2e**: la página muestra 4 `.recharts-surface` y el SVG `route-map`; mover el slider de tiempo cambia el atributo `cx` del marcador `data-testid="drone-marker"`; `figure[data-type="visualizacion"]` con línea de fuente que contiene "ArduPilot".
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar `droneRoute.ts` y el script; generar el JSON** — Run: `pnpm run data:drone` — Expected: `src/data/drone-route.json` creado con 3 874 ± 2 muestras.
- [ ] **Step 5: Implementar `RouteMap.tsx` y `DroneProfiles.tsx`.**
- [ ] **Step 6: Redactar `dron-reparto.mdx`** según spec §8.1; la fuente de la figura declara "Datos generados por el autor con `scripts/generate-drone-route.ts` a partir de la ruta declarada; límites de ArduPilot" con `Cite`.
- [ ] **Step 7: Correr todo** — Expected: PASS.
- [ ] **Step 8: Commit** — `git commit -m "feat(tema-1): add drone route generator, dataset and kinematic profiles"`

---

### Task 19: Tema 4 · modelos de neumático, gráficas y contenido

**Modelo sugerido:** opus, esfuerzo alto. Leer secciones 10 a 13 del documento de fuentes; usar solo parámetros confirmados o declararlos ilustrativos en la fuente de la figura.

**Files:**
- Create: `src/lib/data/tyreModels.ts`, `tyreModels.test.ts`, `src/components/topics/llantas-f1/GripCharts.tsx`, `tests/e2e/llantas-f1.spec.ts`.
- Modify: `src/content/topics/llantas-f1.mdx`.

**Interfaces:**
- Consumes: `gripVsTemperature`, `maxLateralForce`, `loadSensitiveMu` (Tarea 8); `LineChart` (Tarea 15).
- Produces:
```ts
export interface DocumentedParams<T> { values: T; sourceLabel: string; illustrative: boolean }
export const TEMPERATURE_MODEL: DocumentedParams<TemperatureModel>;
export const WORKING_WINDOW: DocumentedParams<{ from: number; to: number }>; // °C; compuesto C3 de 2019: 105–135 °C según la tabla publicada por Autosport (Noble, 2019) citada en el doc de fuentes §10; `sourceLabel` deja claro que es la generación de 13 pulgadas de 2019
export const LOAD_MODEL: DocumentedParams<{ mu0: number; fz0: number; exponent: number }>; // illustrative: true; ley de potencia propia inspirada en el exponente LS_EXPY del tyres.ini comentado del equipo MUR (doc de fuentes §11) y en la sensibilidad a la carga de Milliken §13
export function temperatureSeries(from: number, to: number, step: number): { t: number; mu: number }[];
export function loadSeries(from: number, to: number, step: number): { fz: number; linear: number; real: number; muEff: number }[];
```
`GripCharts` (`client:visible`): gráfica A `temperatureSeries(40, 160, 2)` con `bands: [WORKING_WINDOW]`, eje x "Temperatura (°C)", eje y "Coeficiente de agarre μ (adimensional)" (unidad `1`); gráfica B `loadSeries(0, 10000, 250)` con series "Modelo lineal F = μ N" (discontinua) y "Con sensibilidad a la carga", ejes "Carga vertical F_z (N)" y "Fuerza lateral máxima F_y (N)"; pie con la fuente y la marca "ilustrativo" si aplica.

- [ ] **Step 1: Escribir `tyreModels.test.ts`**: `temperatureSeries(40,160,2)` tiene 61 puntos y su máximo está en `t === TEMPERATURE_MODEL.values.tOpt`; `loadSeries` es creciente en `real` y `real < linear` para `fz > fz0`, `real > linear` para `0 < fz < fz0`; cada constante tiene `sourceLabel` no vacío.
- [ ] **Step 2: Escribir el e2e**: dos `.recharts-surface`; etiquetas de eje con "°C" y "(N)"; `figure[data-type="visualizacion"]` × 2 con fuente.
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** modelos y gráficas.
- [ ] **Step 5: Redactar `llantas-f1.mdx`** según spec §8.4: el caso concreto es el modelo de neumático de Assetto Corsa documentado a través de un `tyres.ini` real comentado (MUR, doc de fuentes §11) y la Fórmula Mágica de Pacejka (3.ª ed., 2012); la definición de Isola de rango operativo como "agarre máximo menos 3%" se cita en la prosa; los coeficientes B = 10, C = 1,9, D = 1, E = 0,97 se declaran como conjunto longitudinal ilustrativo. Incluye la conexión con el tema 3 (`maxCorneringSpeed`) con un ejemplo numérico.
- [ ] **Step 6: Correr todo** — Expected: PASS.
- [ ] **Step 7: Commit** — `git commit -m "feat(tema-4): add tyre grip models, charts and publish the topic"`

---

### Task 20: Tema 5 · curva del resorte, video háptico y contenido

**Modelo sugerido:** opus, esfuerzo alto. Leer secciones 14 a 16 del documento de fuentes.

**Files:**
- Create: `src/lib/data/triggerModel.ts`, `triggerModel.test.ts`, `src/components/topics/control-haptico/SpringForceCurve.tsx`, `HapticVideo.tsx`, `HapticVideo.test.tsx`, `scripts/compress-video.sh`, `tests/e2e/control-haptico.spec.ts`.
- Modify: `src/content/topics/control-haptico.mdx`.

**Interfaces:**
- Consumes: `hookeForce`, `elasticEnergy`, `piecewiseResistance`, `forceCurve` (Tarea 9); `LineChart`, `Slider`, `Readout` (Tarea 15); `withBase` (Tarea 10).
- Produces:
```ts
export interface TriggerSettings { k: number; start: number } // N/m, mm
export const TRIGGER_LIMITS = { k: [50, 600], start: [0, 6] } as const; export const TRIGGER_TRAVEL_MM = 8;
export function triggerCurves(s: TriggerSettings): { x: number; hooke: number; trigger: number }[]; // x en mm de 0 a 8, 33 puntos; fuerzas en N (x convertido a m)
export function storedEnergyMilliJoules(s: TriggerSettings): number; // ½ k x_max² con x_max = 8 mm, en mJ
export interface VideoMarker { time: number; title: string; analysis: string }
export interface HapticVideoProps { src: string; poster?: string; markers: VideoMarker[]; transcript: string }
```
`SpringForceCurve` (`client:visible`): `Slider` k y `Slider` inicio de resistencia; `LineChart` con ejes "Desplazamiento x (mm)" y "Fuerza F (N)" y series "Hooke ideal" y "Gatillo adaptativo"; `Readout` energía almacenada (mJ); nota de la tercera ley. `HapticVideo` (`client:load`): `<video controls preload="metadata" data-testid="haptic-video">` con `onError` → `data-state="error"` y bloque de respaldo con `transcript` y enlace de descarga; lista de `markers` como botones que fijan `currentTime` y resaltan el activo según `timeupdate`. `scripts/compress-video.sh`: `ffmpeg -i media-raw/<entrada> -vf scale=-2:720 -c:v libx264 -crf 26 -preset slow -c:a aac -b:a 96k public/media/tema-05-dualsense.mp4` y póster `-ss 2 -frames:v 1 public/media/tema-05-dualsense.jpg`.

- [ ] **Step 1: Escribir `triggerModel.test.ts`**: `triggerCurves({ k: 400, start: 3 })` tiene 33 puntos, `hooke` en x = 8 es 3.2 N, `trigger` en x = 2 es 0 y en x = 8 es 2.0 N; `storedEnergyMilliJoules({ k: 400, start: 0 })` → 12.8.
- [ ] **Step 2: Escribir `HapticVideo.test.tsx`** (jsdom): al disparar `error` en el video aparece el texto del `transcript` y el enlace de descarga (Review Focus 5); hacer clic en un marcador fija `currentTime` al `time` del marcador.
- [ ] **Step 3: Escribir el e2e**: pedir `./media/tema-05-dualsense.mp4` con `request`; si responde 404, esperar que `[data-state="error"]` y el transcript sean visibles; si 200, que el video tenga `controls`; en ambos casos 3 botones de marcador, `figure[data-type="multimedia"]`, la gráfica del resorte y la estructura del tema.
- [ ] **Step 4: Correr** — Expected: FAIL.
- [ ] **Step 5: Implementar** modelo, componentes y script.
- [ ] **Step 6: Redactar `control-haptico.mdx`** según spec §8.5 (Astro's Playroom como ejemplo de resorte progresivo; Horizon Forbidden West como "pop" al llegar al máximo del arco, que es lo que dice la fuente oficial; modos `ContinuousResitance` y `SectionResitance` con `startPosition` y `force` de 0 a 255 según el header de DualSense-Windows) con tres marcadores iniciales según el guion de la spec §13 (inicio de resistencia ≈ 5 s, fondo ≈ 15 s, liberación ≈ 18 s), que Dylan ajusta tras grabar; el `transcript` describe la secuencia grabada.
- [ ] **Step 7: Correr todo** — Expected: PASS.
- [ ] **Step 8: Commit** — `git commit -m "feat(tema-5): add spring force curve, haptic video player and publish the topic"`

---

### Task 21: Pase de diseño, accesibilidad y rendimiento

**Modelo sugerido:** opus, esfuerzo alto. Cargar `frontend-design:frontend-design` y `chrome-devtools-mcp:a11y-debugging`.

**Files:**
- Create: `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`.
- Modify: estilos y componentes según hallazgos.

- [ ] **Step 1: Escribir `a11y.spec.ts`**: con `@axe-core/playwright`, para la portada y los 5 temas publicados, en tema claro y oscuro, `violations.filter(v => ['serious','critical'].includes(v.impact))` está vacío.
- [ ] **Step 2: Escribir `responsive.spec.ts`**: viewport 375×812; para portada y tema 2, `document.documentElement.scrollWidth <= window.innerWidth`; el cajón de temas se abre y lista 13 enlaces.
- [ ] **Step 3: Correr** — Expected: FAIL o PASS según el estado; anotar violaciones.
- [ ] **Step 4: Corregir** contraste, foco, etiquetas, orden de encabezados, desbordes; revisar los seis temas en ambos modos y afinar jerarquía tipográfica, espaciado y detalles de cuaderno (retícula, numeración, notas al margen).
- [ ] **Step 5: Lighthouse** sobre `pnpm run preview --ignore-lock` para portada y tema 2 — Expected: Accesibilidad ≥ 95, Rendimiento ≥ 90, Buenas prácticas ≥ 95. Registrar los valores en el mensaje de cierre de la tarea.
- [ ] **Step 6: Correr todo** — Expected: PASS.
- [ ] **Step 7: Commit** — `git commit -m "feat(ui): accessibility, responsive and visual polish pass"`

---

### Task 22: Integración de la revisión de Dylan, video final y entrega

**Modelo sugerido:** sonnet, esfuerzo medio (ediciones mecánicas); opus para cualquier reescritura de contenido.

**Files:**
- Modify: los cinco MDX según las correcciones de Dylan; `public/media/tema-05-dualsense.mp4` y `.jpg`; `README.md`.

- [ ] **Step 1: Aplicar las correcciones de texto de Dylan** tema por tema; cada tema aprobado se commitea por separado: `content(tema-N): apply author revisions`.
- [ ] **Step 2: Comprimir e integrar el video** — Run: `bash scripts/compress-video.sh media-raw/<archivo>` — Expected: `public/media/tema-05-dualsense.mp4` ≤ 15 MB y póster creado. Ajustar los `markers` del MDX a los segundos reales.
- [ ] **Step 3: Actualizar README** con el estado "publicado" de los temas 1–5 y la fecha.
- [ ] **Step 4: Verificación completa** — Run: `pnpm run check && pnpm run test:cov && pnpm run build && pnpm run e2e` — Expected: todo PASS.
- [ ] **Step 5: Push y verificación pública** — Run: `git push && gh run watch --exit-status && curl -sI <SITE_URL> | head -1 && gh repo view --json visibility` — Expected: 200 y `PUBLIC`.
- [ ] **Step 6: Etiquetar** — `git tag -a avance-1 -m "Avance 1: temas 1 a 5" && git push --tags`.
- [ ] **Step 7: Entrega en Moodle (Dylan):** URL del sitio y URL del repositorio.

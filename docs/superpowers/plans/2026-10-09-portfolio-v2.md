# Portafolio de Física I · v2 — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar el portafolio v1 publicado a la v2 aprobada: portada simplificada sin información inventada, barra lateral de documentación con buscador, cabecera de tema con insignias y herramientas, contenido en pasos incrementales con justificación doble, y simuladores con manipulación directa, transporte mínimo y ajustes en panel, conservando el formato visual v1.

**Architecture:** Se añade una capa de laboratorio (`src/components/lab/`) con reloj puro, arrastre por puntero, graficadora SVG propia, panel de ajustes y un cascarón común; cada tema obtiene un laboratorio sobre ese cascarón y su MDX se reescribe con los componentes `Step` y `Why`. La navegación y la cabecera de tema se rehacen sobre los componentes Astro existentes; el índice de búsqueda y los esquemas de sección se calculan en el build con `render(entry).headings`.

**Tech Stack:** el de la v1 (Astro 7, React 19, Tailwind 4, Recharts para figuras de datos, Vitest 5, Playwright 1.64, pnpm 11). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-09-portfolio-v2-design.md` (deltas) sobre `docs/superpowers/specs/2026-10-08-physics-portfolio-design.md` (v1).
**Fuentes verificadas:** `docs/superpowers/research/2026-10-08-sources.md`. **Material de clase:** `.reference/class-material/00-indice.md`.

## Global Constraints

- El formato visual de la v1 no cambia: tokens, tipografía, utilidades y componentes de contenido se reutilizan; nada del preview descartado.
- Rama de trabajo `v2` creada desde `main`; se integra a `main` por bloques completos (fast-forward) al final de las tareas 9, 10, 11, 12, 13, 14 y 16, con push tras cada integración. Nada se publica a medias.
- Sin dependencias nuevas. `astro check` siempre en 0/0/0; cobertura ≥ 80 % en `src/lib/**`; todas las e2e verdes antes de cada integración.
- Contenido en español, coma decimal, unidades en todas las cifras; g = 9,81 m/s²; notación estándar; los hechos, números y fuentes ya verificados en la v1 no cambian.
- Identificadores en inglés; commits convencionales; sin línea de coautoría; prettier solo sobre los archivos tocados.
- Toda figura, gráfica o laboratorio ocupa el ancho de la columna; no existe variante a dos columnas.
- Todo manejador arrastrable tiene alternativa de teclado y `touch-action: none`; la reproducción termina en `duration` y `loop` está apagado por defecto.
- Accesibilidad como en la v1: axe sin violaciones serias en ambos temas y en ambos estados de la barra lateral.
- Ejecución por subagentes con modelo y esfuerzo por tarea (petición de Dylan). El contenido reescrito es borrador para su revisión.

## Review Focus

1. Arrastre con el dedo en móvil: el manejador debe seguir al puntero sin desplazar la página. Prueba en Tarea 5 (`touch-action: none` presente y captura de puntero) y verificación manual a 375 px en las Tareas 10 a 14.
2. La reproducción nunca pasa de `duration` ni repite sin `loop`: pruebas de `clockReducer` en Tarea 1 y e2e "termina al final" en cada laboratorio (Tareas 10 a 14).
3. `localStorage` bloqueado: ajustes globales y estado de la barra lateral usan valores por defecto sin lanzar. Pruebas en Tarea 2 y Tarea 8.
4. Barra lateral sin parpadeo: el estado recordado se aplica antes del primer pintado y, si no hay almacenamiento, el avance del tema actual queda abierto. Prueba e2e en Tarea 8.
5. Arrastrar una parada del dron sobre otra (tramo de longitud cero): el laboratorio conserva la última ruta válida y lo dice. Prueba unitaria y e2e en Tarea 11.

---

### Task 1: Kernel: reloj puro, oscilador amortiguado y Euler

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/physics/clock.ts`, `src/lib/physics/clock.test.ts`.
- Modify: `src/lib/physics/spring.ts`, `src/lib/physics/spring.test.ts`, `src/lib/physics/projectile.ts`, `src/lib/physics/projectile.test.ts`, `src/lib/physics/index.ts`.

**Interfaces:**
- Produces:
```ts
// clock.ts
export interface ClockState { t: number; duration: number; playing: boolean; speed: number; loop: boolean }
export type ClockAction =
  | { type: 'play' } | { type: 'pause' } | { type: 'toggle' } | { type: 'reset' }
  | { type: 'seek'; t: number } | { type: 'step'; dt: number } | { type: 'tick'; dt: number }
  | { type: 'setSpeed'; speed: number } | { type: 'setLoop'; loop: boolean } | { type: 'setDuration'; duration: number };
export function createClock(duration: number): ClockState;            // t 0, playing false, speed 1, loop false; RangeError si duration < 0
export function clockReducer(state: ClockState, action: ClockAction): ClockState; // nuevo objeto siempre
// tick: t' = t + dt·speed; si t' ≥ duration → loop ? t' − duration (sigue) : t = duration y playing false. seek y step acotan a [0, duration] y pausan. play con t === duration reinicia a 0.
// spring.ts
export interface OscillatorState { x: number; v: number }
export interface OscillatorParams { k: number; m: number; c: number }  // c en N·s/m
export function dampedSpringStep(s: OscillatorState, p: OscillatorParams, dt: number): OscillatorState; // semi-implícito: v' = v + (−k x − c v)/m·dt; x' = x + v'·dt; RangeError si m ≤ 0 o dt ≤ 0 o k < 0 o c < 0
export function isAtRest(s: OscillatorState, tol?: { x: number; v: number }): boolean;             // por defecto x 1e-4 m, v 1e-3 m/s
export function criticalDamping(k: number, m: number): number;                                   // 2√(k m)
// projectile.ts
export interface EulerState { t: number; x: number; y: number; vx: number; vy: number }
export function eulerStep(s: EulerState, gUp: number, gDown: number, dt: number): EulerState;   // g = vy > 0 ? gUp : gDown; vy' = vy − g dt; y' = y + vy' dt; x' = x + vx dt; t' = t + dt
```

- [ ] **Step 1: Escribir `clock.test.ts`**

```ts
expect(createClock(2)).toEqual({ t: 0, duration: 2, playing: false, speed: 1, loop: false });
expect(clockReducer({ ...c, t: 0.9, duration: 1, playing: true }, { type: 'tick', dt: 0.2 })).toMatchObject({ t: 1, playing: false });
expect(clockReducer({ ...c, t: 0.9, duration: 1, playing: true, loop: true }, { type: 'tick', dt: 0.2 })).toMatchObject({ t: expect.closeTo(0.1, 9), playing: true });
expect(clockReducer({ ...c, duration: 2 }, { type: 'seek', t: 5 })).toMatchObject({ t: 2, playing: false });
expect(clockReducer({ ...c, t: 0 }, { type: 'step', dt: -1 })).toMatchObject({ t: 0 });
expect(clockReducer({ ...c, t: 2, duration: 2 }, { type: 'play' })).toMatchObject({ t: 0, playing: true });
expect(clockReducer({ ...c, t: 1, playing: true, speed: 2 }, { type: 'tick', dt: 0.25 })).toMatchObject({ t: 1.5 });
expect(clockReducer({ ...c, t: 3, duration: 5 }, { type: 'setDuration', duration: 2 })).toMatchObject({ t: 2 });
const before = { ...c }; clockReducer(before, { type: 'play' }); expect(before.playing).toBe(false); // inmutable
```

- [ ] **Step 2: Escribir las pruebas nuevas de `spring.test.ts` y `projectile.test.ts`**

```ts
// spring: k 400, m 0.02, c = criticalDamping(400, 0.02) ≈ 5.657, dt 1/1000, desde x 0.008 → tras 0.5 s isAtRest(s) true y x nunca cambia de signo más de una vez
// spring: c 0, dt 1/4000, 1 s → energía ½kx² + ½mv² dentro del 2 % de la inicial
expect(() => dampedSpringStep({ x: 0, v: 0 }, { k: 400, m: 0, c: 1 }, 0.01)).toThrow(RangeError);
// projectile: desde { t 0, x 0, y 0, vx 2, vy 10 }, dt 1/120, gUp = gDown = 9.81: la y máxima está dentro del 1 % de 5.097 y el aterrizaje dentro del 2 % de 2.039 s
```

- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** `clock.ts`, las adiciones a `spring.ts` y `projectile.ts`, y las reexportaciones en `index.ts`.
- [ ] **Step 5: Correr con cobertura** — Run: `pnpm run test:cov` — Expected: PASS, umbrales de `src/lib/**` intactos.
- [ ] **Step 6: Commit** — `git commit -m "feat(physics): add pure simulation clock, damped oscillator step and euler step"`

---

### Task 2: Ajustes globales y lecturas que los usan

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Create: `src/lib/settingsStore.ts`, `src/lib/settingsStore.test.ts`, `src/components/lab/useGlobalSettings.ts`, `src/components/lab/useGlobalSettings.test.tsx`.
- Modify: `src/components/controls/Readout.tsx`, `src/components/controls/Readout.test.tsx`, `src/components/controls/Slider.tsx`, `src/components/controls/Slider.test.tsx`.

**Interfaces:**
- Produces:
```ts
export interface GlobalSettings { decimals: 1 | 2 | 3; grid: boolean; motion: 'auto' | 'reduced' }
export const DEFAULT_SETTINGS: GlobalSettings; // { decimals: 2, grid: true, motion: 'auto' }
export const SETTINGS_KEY = 'portafolio.settings';
export function readSettings(storage: Pick<Storage, 'getItem'> | undefined): GlobalSettings; // try/catch; JSON inválido o claves fuera de rango → valores por defecto para esas claves
export function writeSettings(storage: Pick<Storage, 'setItem'> | undefined, s: GlobalSettings): boolean;
export function getSettings(): GlobalSettings; export function setSettings(patch: Partial<GlobalSettings>): void; export function subscribe(listener: () => void): () => void;
export function motionReduced(s: GlobalSettings, mediaMatches: boolean): boolean; // s.motion === 'reduced' || (s.motion === 'auto' && mediaMatches)
// useGlobalSettings.ts
export function useGlobalSettings(): GlobalSettings; // useSyncExternalStore; snapshot de servidor DEFAULT_SETTINGS
```
`Readout` y `Slider`: `precision` pasa a opcional; si falta, usan `useGlobalSettings().decimals`.

- [ ] **Step 1: Escribir `settingsStore.test.ts`**: `readSettings(undefined)` → defaults; `readSettings({ getItem: () => '{"decimals":7,"grid":false}' })` → `{ decimals: 2, grid: false, motion: 'auto' }`; `readSettings({ getItem() { throw new Error() } })` → defaults; `writeSettings(undefined, DEFAULT_SETTINGS)` → false; `setSettings({ decimals: 3 })` notifica a un suscriptor y `getSettings().decimals` es 3; `motionReduced({ ...DEFAULT_SETTINGS, motion: 'reduced' }, false)` → true; `motionReduced(DEFAULT_SETTINGS, true)` → true.
- [ ] **Step 2: Escribir `useGlobalSettings.test.tsx`** (jsdom): un componente que muestra `decimals` rerenderiza al llamar `setSettings({ decimals: 1 })`. `Readout.test.tsx`: sin `precision`, con `setSettings({ decimals: 3 })` muestra "5,100 m". `Slider.test.tsx`: `aria-valuetext` sigue a los decimales globales.
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** el store (estado en memoria inicializado de `localStorage` en el cliente, escritura en cada `setSettings`), el hook y los cambios en `Readout` y `Slider`.
- [ ] **Step 5: Correr** `pnpm run test` y `pnpm run check` — Expected: PASS, 0/0/0.
- [ ] **Step 6: Commit** — `git commit -m "feat(lab): add global settings store and decimals-aware readouts"`

---

### Task 3: Graficadora SVG propia

**Modelo sugerido:** opus, esfuerzo alto. Cargar `dataviz`.

**Files:**
- Create: `src/components/lab/plotScales.ts`, `plotScales.test.ts`, `SvgPlot.tsx`, `SvgPlot.test.tsx`.

**Interfaces:**
- Produces:
```ts
export interface Domain { min: number; max: number }
export interface Scale { toPx(v: number): number; toValue(px: number): number; domain: Domain; range: [number, number] }
export function linearScale(domain: Domain, range: [number, number]): Scale;            // RangeError si max ≤ min
export function niceTicks(domain: Domain, count: number): number[];                      // pasos 1, 2, 2.5, 5 × 10^n, incluye extremos "bonitos" dentro del dominio
export function padDomain(values: number[], padFraction: number, includeZero?: boolean): Domain;
export interface PlotSeries { id: string; label: string; points: { x: number; y: number }[]; color?: string; dashed?: boolean }
export interface PlotBand { from: number; to: number; label: string }
export interface PlotCursor { x: number; onChange?: (x: number) => void; label?: (x: number) => string }
export interface PlotMarker { x: number; y: number; label?: string }
export interface SvgPlotProps {
  title: string; xLabel: string; xUnit: string; yLabel: string; yUnit: string;
  series: PlotSeries[]; xDomain?: Domain; yDomain?: Domain; equalAspect?: boolean; aspectRatio?: number; // por defecto 1.6
  bands?: PlotBand[]; cursor?: PlotCursor; marker?: PlotMarker; showGrid?: boolean;
  overlay?: (scales: { x: Scale; y: Scale }) => React.ReactNode;   // elementos SVG propios en píxeles
  ariaLabel: string; testId?: string;
}
export default function SvgPlot(props: SvgPlotProps): JSX.Element;
```
`SvgPlot` dibuja con `viewBox` fijo (por ejemplo 720 × 450) y `width: 100%`; cuadrícula desde `--grid`; ejes con rótulos "label (unit)" en monoespaciada; `cursor` es una línea vertical con manejador arrastrable (`role="slider"`, `aria-valuenow`, flechas ±1 % del dominio) que llama a `onChange`; `showGrid` por defecto desde `useGlobalSettings().grid`; colores de `chartTheme.ts`.

- [ ] **Step 1: Escribir `plotScales.test.ts`**: `linearScale({min:0,max:10},[0,100]).toPx(2.5)` → 25 y `toValue(25)` → 2.5; `niceTicks({min:0,max:8.2},5)` → `[0, 2, 4, 6, 8]`; `niceTicks({min:40,max:160},6)` → `[40, 60, 80, 100, 120, 140, 160]`; `padDomain([1, 3], 0.1, true)` → `{ min: 0, max: 3.2 }`; `linearScale({min:1,max:1},[0,1])` lanza.
- [ ] **Step 2: Escribir `SvgPlot.test.tsx`** (jsdom): renderiza los rótulos "x (m)" y "y (m)"; con `bands` dibuja un `<rect>` con `aria-label` igual a la etiqueta; con `cursor` el manejador tiene `role="slider"` y `ArrowRight` llama a `onChange` con un valor mayor; `overlay` recibe escalas cuyo `toPx(min)` cae dentro del área del gráfico.
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** `plotScales.ts` y `SvgPlot.tsx`.
- [ ] **Step 5: Correr y `check`** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(lab): add SvgPlot, a self-contained plotter with draggable cursor"`

---

### Task 4: Reloj de simulación y barra de transporte

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/components/lab/useSimClock.ts`, `useSimClock.test.tsx`, `TransportBar.tsx`, `TransportBar.test.tsx`.

**Interfaces:**
- Consumes: `createClock`, `clockReducer`, `ClockState` (Tarea 1); `useGlobalSettings`, `motionReduced` (Tarea 2); `formatNumber`.
- Produces:
```ts
export interface SimClock { state: ClockState; play(): void; pause(): void; toggle(): void; reset(): void; seek(t: number): void; step(dt: number): void; setSpeed(s: number): void; setLoop(b: boolean): void }
export function useSimClock(duration: number): SimClock;   // rAF con dt real acotado a 50 ms; con motionReduced, play avanza en pasos de duration/60 cada 250 ms (sin rAF continuo); cancela en desmontaje
export interface TransportBarProps { clock: SimClock; stepSize?: number }  // stepSize por defecto 1/60
export default function TransportBar(props: TransportBarProps): JSX.Element; // botones "Reproducir"/"Pausar" (aria-label cambia), "Reiniciar", input range aria-label "Línea de tiempo" (0..1000), lectura "t = 1,234 s"; no renderiza nada si duration === 0
```

- [ ] **Step 1: Escribir `useSimClock.test.tsx`** con temporizadores falsos y `requestAnimationFrame` simulado: tras `play()` y avanzar 2 s de rAF con `duration` 1, `state.t` es 1 y `playing` false; con `setLoop(true)` sigue en `playing` true; `seek(0.5)` pausa; `setSpeed(2)` duplica el avance.
- [ ] **Step 2: Escribir `TransportBar.test.tsx`**: el botón pasa de "Reproducir" a "Pausar" al hacer clic; mover el range a 500 llama a `seek` con `duration/2`; con `duration` 0 no renderiza.
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar** ambos.
- [ ] **Step 5: Correr y `check`** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(lab): add simulation clock hook and minimal transport bar"`

---

### Task 5: Arrastre por puntero

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Create: `src/components/lab/dragMath.ts`, `dragMath.test.ts`, `useDrag.ts`, `useDrag.test.tsx`.

**Interfaces:**
- Produces:
```ts
export function clampTo(v: number, min: number, max: number): number;
export function snapTo(v: number, step: number): number;
export function svgPointFromClient(ctmInverse: DOMMatrixReadOnly | { a: number; b: number; c: number; d: number; e: number; f: number }, clientX: number, clientY: number): { x: number; y: number }; // aplica la matriz
export interface DragPoint { x: number; y: number; phase: 'start' | 'move' | 'end' }
export function useDrag(onDrag: (p: DragPoint) => void): { onPointerDown(e: React.PointerEvent<SVGGraphicsElement>): void; onPointerMove(e): void; onPointerUp(e): void; onPointerCancel(e): void; style: { touchAction: 'none' } };
```
`useDrag` convierte con `ownerSVGElement.getScreenCTM().inverse()`, usa `setPointerCapture` y solo responde al botón principal.

- [ ] **Step 1: Escribir `dragMath.test.ts`**: `clampTo(11, 0, 10)` → 10; `snapTo(0.26, 0.05)` → 0.25; `svgPointFromClient({ a: 2, b: 0, c: 0, d: 2, e: -10, f: -20 }, 15, 30)` → `{ x: 20, y: 40 }`.
- [ ] **Step 2: Escribir `useDrag.test.tsx`** (jsdom): un `<circle>` con los manejadores recibe `pointerdown` + `pointermove` + `pointerup` (con `getScreenCTM` simulado como identidad) y `onDrag` recibe fases `start`, `move`, `end` con las coordenadas del evento; `setPointerCapture` se llama; el `style` incluye `touchAction: 'none'` (Review Focus 1).
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Correr y `check`** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(lab): add pointer drag hook with SVG coordinate mapping"`

---

### Task 6: Panel de ajustes, campo de parámetro y cascarón

**Modelo sugerido:** opus, esfuerzo alto. Cargar `frontend-design:frontend-design` solo para integrar con los estilos v1 existentes, no para redefinirlos.

**Files:**
- Create: `src/components/lab/SettingsDrawer.tsx`, `SettingsDrawer.test.tsx`, `ParamField.tsx`, `ParamField.test.tsx`, `LabShell.tsx`, `LabShell.test.tsx`.

**Interfaces:**
- Consumes: `SimClock`, `TransportBar` (Tarea 4); `useGlobalSettings`, `setSettings` (Tarea 2); `Slider`, `Readout`; `ResourceType`, `RESOURCE_LABELS`.
- Produces:
```ts
export type SettingOption =
  | { key: string; label: string; kind: 'toggle'; value: boolean; onChange(v: boolean): void }
  | { key: string; label: string; kind: 'select'; value: string; options: { value: string; label: string }[]; onChange(v: string): void }
  | { key: string; label: string; kind: 'range'; value: number; min: number; max: number; step: number; unit?: string; onChange(v: number): void };
export interface SettingsDrawerProps { open: boolean; onClose(): void; title: string; local: SettingOption[] } // pestañas "Este simulador" y "Global" (decimales 1/2/3, cuadrícula, movimiento auto/reducido desde el store); <dialog> nativo, Esc cierra, foco vuelve al botón que abrió
export interface ParamFieldProps { id: string; label: React.ReactNode; unit: string; min: number; max: number; step: number; value: number; onChange(v: number): void }
export interface LabReadout { label: string; value: number; unit: string }
export interface LabShellProps { title: string; type: ResourceType; clock?: SimClock; readouts: LabReadout[]; params: React.ReactNode; localSettings: SettingOption[]; onReset(): void; footnote?: string; testId: string; children: React.ReactNode }
```
`LabShell` renderiza, en este orden y con las clases del marco de figura v1: cabecera (título con la marca del tipo, botón engranaje `aria-label="Ajustes del simulador"` con `aria-expanded`), el lienzo (hijos, a lo ancho), `TransportBar` si hay reloj, fila de `Readout`, bloque de parámetros con botón "Restablecer", `SettingsDrawer`. Atributo `data-testid={testId}` en la raíz y `data-playing` reflejando el reloj.

- [ ] **Step 1: Escribir las pruebas** (jsdom): `SettingsDrawer` abre con `open`, muestra las dos pestañas, cambia `setSettings({ decimals })` al elegir "3" en Global, llama `onClose` con Escape y devuelve el foco; `ParamField` sincroniza range y número y acota al rango; `LabShell` muestra título, lecturas con unidad, el engranaje abre el panel, "Restablecer" llama `onReset`, sin `clock` no hay barra de transporte.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** los tres componentes.
- [ ] **Step 4: Correr y `check`** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(lab): add settings drawer, param field and the shared lab shell"`

---

### Task 7: Portada, pie, temas futuros y esquema

**Modelo sugerido:** sonnet, esfuerzo alto.

**Files:**
- Modify: `src/pages/index.astro`, `src/components/nav/TopicCard.astro`, `src/components/nav/SiteFooter.astro`, `src/layouts/TopicLayout.astro` (rama `proximamente`), `src/content/topicSchema.ts`, `src/content/topics.test.ts`, los ocho MDX de los temas 6 a 13, `tests/e2e/navigation.spec.ts`, `tests/e2e/smoke.spec.ts` si asserta texto eliminado.

- [ ] **Step 1: Actualizar las pruebas primero**: en `topics.test.ts`, "un tema proximamente no declara concept" y "un tema publicado sin concept es rechazado"; en `navigation.spec.ts`, la portada muestra la lista de definición con los términos en este orden exacto: Autor, Universidad, Curso, Docente, Última actualización; no contiene "temas publicados" ni "Temas 1 a 5" ni el texto "Publicado"; las filas de los temas 6 a 13 no contienen "Recurso por definir"; el botón "Ver repositorio" apunta a `REPO_URL`; la página de un tema próximo no muestra la lista de secciones futuras ni el concepto.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar**: `index.astro` (lista `<dl>` tras el resumen; botón; sin bloque de progreso; grupos sin rótulo de rango), `TopicCard.astro` (sin `StatusBadge` cuando publicado; "Próximamente" cuando no; sin producto; sin insignia de recurso para futuros), `SiteFooter.astro` (enlace al repositorio y "Sitio generado el <fecha>"), `TopicLayout.astro` (rama próxima reducida), `topicSchema.ts` (`concept` opcional; `superRefine` lo exige si publicado), MDX 6–13 sin `concept`.
- [ ] **Step 4: Correr** `pnpm run test`, `pnpm run check`, `pnpm run build`, `pnpm run e2e` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(index): simplify the cover and footer and strip invented detail from upcoming topics"`

---

### Task 8: Barra lateral con buscador, avances plegables, subtemas y botón de cabecera

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/searchIndex.ts`, `src/lib/searchIndex.test.ts`, `src/components/nav/SidebarSearch.tsx`, `SidebarSearch.test.tsx`, `src/components/nav/SidebarToggle.tsx`, `SidebarToggle.test.tsx`, `src/lib/navState.ts`, `navState.test.ts`, `tests/e2e/sidebar.spec.ts`.
- Modify: `src/components/nav/SideNav.astro`, `src/components/nav/SiteHeader.astro`, `src/layouts/BaseLayout.astro`, `src/layouts/TopicLayout.astro`, `src/pages/temas/[slug].astro`, `src/pages/404.astro`, `tests/e2e/a11y.spec.ts`, `tests/e2e/responsive.spec.ts`.

**Interfaces:**
- Produces:
```ts
// searchIndex.ts
export interface SearchHeading { text: string; anchor: string }
export interface SearchEntry { slug: string; number: number; phase: Phase; title: string; shortTitle: string; status: 'publicado' | 'proximamente'; headings: SearchHeading[] }
export function buildSearchIndex(topics: TopicSummary[], headingsBySlug: Record<string, { depth: number; text: string; slug: string }[]>): SearchEntry[]; // solo depth 2 de temas publicados
export function normalize(s: string): string;                       // minúsculas, sin acentos (NFD)
export function filterIndex(index: SearchEntry[], query: string): { entry: SearchEntry; headings: SearchHeading[] }[]; // vacío → todo; coincide en título o encabezado; ordenado por number
// navState.ts
export const SIDEBAR_KEY = 'portafolio.nav.sidebar'; export const phaseKey = (p: Phase) => `portafolio.nav.avance-${p}`;
export function readOpenPhases(storage, currentPhase: Phase): Record<Phase, boolean>; // sin almacenamiento o sin valor → solo currentPhase abierta
export function readSidebarClosed(storage): boolean;              // try/catch → false
```
`SideNav.astro` props: `{ topics: TopicSummary[]; current?: string; outlines: Record<string, SearchHeading[]>; index: SearchEntry[]; currentPhase: Phase }`. Un `<details data-phase="N">` por avance; dentro, los temas; bajo cada tema publicado un `<details class="outline">` con sus encabezados (abierto para el actual, con indicador por `IntersectionObserver` en un script del componente). `SidebarSearch` (`client:idle`) arriba, con `role="search"`, resultados como lista de enlaces y mensaje "Sin resultados". Script inline justo después del `<aside>`: lee `readOpenPhases` y `readSidebarClosed` desde `localStorage` y aplica `open` y `data-sidebar="closed"` antes de seguir pintando. `SidebarToggle` (`client:load`) en `SiteHeader`, solo visible en pantallas anchas, `aria-pressed`, `aria-label` "Ocultar barra lateral"/"Mostrar barra lateral", persiste. CSS en `TopicLayout`: con `data-sidebar="closed"` en lg, la columna lateral se oculta y el contenido ocupa el ancho.

- [ ] **Step 1: Escribir las pruebas unitarias**: `filterIndex(index, 'ápice')` encuentra el encabezado "Paso 3 · Qué falta: tiempo al ápice" aunque se busque "apice"; `filterIndex(index, '')` devuelve todas las entradas sin encabezados; `buildSearchIndex` ignora `depth` 3 y los temas próximos; `readOpenPhases(undefined, 2)` → `{1:false,2:true,3:false}`; `readSidebarClosed({ getItem() { throw new Error() } })` → false (Review Focus 3); `SidebarSearch` filtra al escribir y enlaza a `topicUrl(slug) + '#' + anchor`; `SidebarToggle` alterna `document.documentElement.dataset.sidebar`.
- [ ] **Step 2: Escribir `tests/e2e/sidebar.spec.ts`**: en un tema del Avance 1, el `details` del Avance 1 está abierto y los otros cerrados; al cerrar el Avance 1 y recargar sigue cerrado; con `localStorage` bloqueado (`addInitScript` que hace lanzar `getItem`) la página carga y el avance actual está abierto (Review Focus 3 y 4); el esquema del tema actual lista sus `h2`; escribir "llantas" en el buscador deja una coincidencia y el enlace navega; el botón de cabecera oculta la barra, persiste tras recargar y `scrollWidth ≤ innerWidth` en ambos estados; no hay parpadeo: `addInitScript` fija cerrado y la primera captura de `document.documentElement.dataset.sidebar` tras `domcontentloaded` ya es `closed`.
- [ ] **Step 3: Correr** — Expected: FAIL.
- [ ] **Step 4: Implementar**: `[slug].astro` renderiza todas las entradas publicadas con `render()` para obtener `headings`, construye `outlines` e `index` y los pasa a `TopicLayout` → `SideNav`; `404.astro` igual con `current` indefinido. Extender `a11y.spec.ts` y `responsive.spec.ts` al estado cerrado de la barra.
- [ ] **Step 5: Correr todo** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(nav): docs-style sidebar with search, collapsible phases, outlines and header toggle"`

---

### Task 9: Cabecera de tema, herramientas, conexiones verticales y componentes `Step`/`Why`

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/lib/readingTime.ts`, `readingTime.test.ts`, `src/components/nav/TopicTools.tsx`, `TopicTools.test.tsx`, `src/components/ui/Step.astro`, `src/components/ui/Why.astro`, `tests/e2e/topic-tools.spec.ts`.
- Modify: `src/layouts/TopicLayout.astro`, `src/pages/temas/[slug].astro`, `src/components/ui/Connections.astro`, `src/styles/content.css`, `src/content/topics.test.ts`.

**Interfaces:**
- Produces:
```ts
export function readingMinutes(body: string): number; // max(1, round(palabras/200 + 0.5·ocurrencias de "<Figure")) con palabras = tokens separados por espacios sin líneas de import ni frontmatter
export function markdownSource(body: string): string; // cuerpo MDX sin líneas que empiezan por "import "
export interface TopicToolsProps { url: string; githubUrl: string; markdownElementId: string }
```
`TopicLayout` (publicado): bajo el resumen, fila de insignias: `ResourceBadge`, `≈ N min de lectura`, `Contenido actualizado el <fecha>`; debajo `TopicTools` (`client:idle`) con "Copiar URL", "Copiar Markdown" (lee `#topic-markdown`, un `<script type="text/plain">` con `markdownSource(entry.body)`), "Abrir en GitHub"; se elimina el pie con "Actualizado el" y "Ver fuente…". `Connections.astro`: las dos listas apiladas (sin `connections-grid`). `Step.astro` props `{ n: number; title: string }` → `<section class="step" id={`paso-${n}`}><h2>Paso {n} · {title}</h2><slot/></section>`. `Why.astro`: slots obligatorios `fenomeno` y `ecuacion`, rótulos "En el fenómeno" y "En la ecuación", error de build `Why: falta el slot "<nombre>"`.

- [ ] **Step 1: Escribir las pruebas**: `readingMinutes` de un cuerpo de 400 palabras con 2 figuras → 3; `markdownSource` quita las líneas de import; `TopicTools` copia la URL y el Markdown (portapapeles simulado) y muestra "Copiado"; e2e `topic-tools.spec.ts`: en el tema 2 aparecen las tres insignias (con "min de lectura" y "Contenido actualizado"), los tres botones, "Copiar URL" escribe la URL en el portapapeles (permiso `clipboard-read`/`clipboard-write` en el contexto), no existe el texto "Ver fuente de esta página en GitHub" al pie, y en Conexiones los dos `h3` están uno debajo del otro (el segundo tiene `y` mayor y la misma `x`); `topics.test.ts`: si un MDX usa `<Step`, cada `Step` contiene un `<Why`.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar** y añadir en `content.css` los estilos de `.step` y `.why` reutilizando los tokens y la rejilla de `UseCase`.
- [ ] **Step 4: Verificar el fallo de build a mano**: `Why` sin `ecuacion` en una copia temporal del tema 2 falla con el mensaje; revertir.
- [ ] **Step 5: Correr todo** — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(topic): header badges and tools, vertical connections, Step and Why components"`
- [ ] **Step 7: Integrar el bloque a `main`**: `git checkout main && git merge --ff-only v2 && git push && git checkout v2`; verificar el despliegue con `gh run watch --exit-status` y `curl -sI` de la portada.

---

### Task 10: Tema 2 reescrito con `JumpLab`

**Modelo sugerido:** opus, esfuerzo alto. Leer la spec v2 §7.3 (Tema 2), §8.3 (Salto) y el MDX actual.

**Files:**
- Create: `src/components/topics/salto-personaje/JumpLab.tsx`, `JumpLab.test.tsx`, `jumpScene.ts` (geometría pura del manejador y del marcador), `jumpScene.test.ts`.
- Modify: `src/content/topics/salto-personaje.mdx`, `tests/e2e/salto-personaje.spec.ts`, `src/components/topics/salto-personaje/JumpDesigner.tsx` (compacto bajo el laboratorio).
- Delete: `JumpSimulator.tsx`, `JumpSimulator.test.tsx`, `JumpCanvas.tsx`, `JumpCanvas.test.tsx` (sustituidos).

**Interfaces:**
- Consumes: `LabShell`, `SettingOption`, `ParamField` (Tarea 6); `useSimClock` (Tarea 4); `SvgPlot`, `Scale` (Tarea 3); `useDrag` (Tarea 5); `computeJump`, `JUMP_LIMITS`, `JUMP_PRESETS`, `jumpModel`; `eulerStep`, `trajectory`.
- Produces:
```ts
// jumpScene.ts
export function handleFromSettings(s: JumpSettings, scale: { x: Scale; y: Scale }, lengthPerMs: number): { x: number; y: number }; // punta del vector v⃗0 = (vx, v0) desde el origen
export function settingsFromHandle(px: { x: number; y: number }, scale, lengthPerMs: number, limits: typeof JUMP_LIMITS): Pick<JumpSettings, 'v0' | 'vx'>; // acotado
export function timeFromMarkerDrag(pxX: number, scale: Scale, result: JumpResult): number; // t cuyo x es el más cercano
```
`JumpLab` (`client:visible`): `LabShell` con reloj de duración `tAir`; lienzo `SvgPlot` (x m, y m) con fantasma terrestre, trayectoria viva, rastro hasta t, marcador arrastrable (seek), manejador del vector arrastrable (fija v0 y vx), vector velocidad en t; parámetros principales v0 y g (`ParamField`); preajustes; lecturas h_máx, t_ápice, t_aire, alcance; ajustes locales: referencia terrestre, vector velocidad, rastro, multiplicador de caída (range 1–4), integrador (analítico/Euler), velocidad, repetir. Por defecto el preajuste Celeste (como en la v1 final).

- [ ] **Step 1: Escribir `jumpScene.test.ts`** con escalas lineales conocidas: `handleFromSettings` y `settingsFromHandle` son inversas; `settingsFromHandle` acota a `JUMP_LIMITS`; `timeFromMarkerDrag` devuelve el `t` del punto más cercano.
- [ ] **Step 2: Escribir `JumpLab.test.tsx`** (jsdom): arrastrar el manejador (eventos de puntero con CTM identidad simulada) cambia la lectura de altura máxima; "Restablecer" vuelve a Celeste; con `setSettings({ decimals: 3 })` las lecturas tienen 3 decimales.
- [ ] **Step 3: Actualizar `tests/e2e/salto-personaje.spec.ts`**: reproducir termina (`data-playing="false"` y botón "Reproducir" tras esperar `tAir + 1` s; `t` igual a `tAir`) y no repite (Review Focus 2); arrastrar el manejador con `page.mouse` cambia la lectura; el engranaje abre el panel, Escape lo cierra y el foco vuelve; cambiar decimales globales a 1 reduce los decimales de las lecturas; la página tiene ≥ 3 `section.step` con un `.why` cada una; el laboratorio ocupa el ancho de la columna (su `width` ≥ 0,9 × el ancho del `article`).
- [ ] **Step 4: Correr** — Expected: FAIL.
- [ ] **Step 5: Implementar** `jumpScene.ts`, `JumpLab.tsx`, mover `JumpDesigner` bajo el laboratorio.
- [ ] **Step 6: Reescribir `salto-personaje.mdx`** según la spec v2 §7.2 y §7.3: resumen de dos frases; `Step` 1–4 con `Equation`, `Why` (`fenomeno`/`ecuacion`) y `Figure` vertical (pasos 1–3 con `SvgPlot` estáticos en islas pequeñas `JumpFigure.tsx` o SVG inline generados en build; paso 4 con `<JumpLab client:visible />` dentro de `Figure type="simulacion"`); `UseCase` corto; `Callout clase`; `Connections`; `Sources` sin cambios de fuentes. Prosa total ≤ 600 palabras sin contar ecuaciones ni leyendas. Mantener números y citas de la v1.
- [ ] **Step 7: Verificación visual** con Playwright MCP a 1280 y 375 px, claro y oscuro, incluyendo un arrastre con el dedo simulado (`hasTouch`); capturas en `.superpowers/sdd/<plan>/task-10-screens/`.
- [ ] **Step 8: Correr todo** — Expected: PASS.
- [ ] **Step 9: Commit e integrar** — `git commit -m "feat(tema-2): rewrite in steps with the direct-manipulation jump lab"`; luego `main` ← `v2` (ff) y push.

---

### Task 11: Tema 1 reescrito con `DroneLab`

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/components/topics/dron-reparto/DroneLab.tsx`, `DroneLab.test.tsx`, `RouteMapLab.tsx`, `routeEdit.ts`, `routeEdit.test.ts`.
- Modify: `src/content/topics/dron-reparto.mdx`, `tests/e2e/dron-reparto.spec.ts`, `src/components/topics/dron-reparto/DroneProfiles.tsx` (pasa a recibir las muestras como prop para reutilizar las tres gráficas).
- Delete: `RouteMap.tsx` (sustituido por `RouteMapLab.tsx`).

**Interfaces:**
- Consumes: `generateRoute`, `routeDuration`, `DRONE_ROUTE`, `RouteDefinition`, `RouteSample`; `LabShell`, `useSimClock`, `useDrag`, `SvgPlot` (`equalAspect`, `overlay`).
- Produces:
```ts
// routeEdit.ts
export function moveStop(def: RouteDefinition, index: 1 | 2 | 3, x: number, y: number): RouteDefinition; // nuevo objeto; redondea a 10 m
export function tryGenerate(def: RouteDefinition): { ok: true; samples: RouteSample[] } | { ok: false; error: string }; // captura RangeError (paradas coincidentes) → mensaje en español
export function isDeclaredRoute(def: RouteDefinition): boolean;
export function sampleAt(samples: RouteSample[], t: number): RouteSample;
```
`DroneLab`: conserva la carga diferida de `src/data/drone-route.json` de la v1 para la ruta declarada y usa `tryGenerate` solo cuando el usuario edita una parada; `LabShell` con reloj de duración `routeDuration(def)`; `RouteMapLab` (`SvgPlot` con `equalAspect`, ruta, paradas arrastrables, dron en t, vectores v y a con escala en leyenda); regenera al soltar; nota "Ruta modificada" y botón "Restablecer" a `DRONE_ROUTE`; si `tryGenerate` falla, conserva la última ruta válida y muestra el mensaje (Review Focus 5); parámetros principales vMax (1–15 m/s) y aMax (0,5–5 m/s²); lecturas x, y, |v|, |a|; debajo, `DroneProfiles` con las muestras actuales y marcador en t; ajustes locales: vectores, escala de vectores, rastro, velocidad, repetir.

- [ ] **Step 1: Escribir `routeEdit.test.ts`**: `moveStop` no muta y redondea; `tryGenerate` con dos paradas iguales → `{ ok: false }` con mensaje; `sampleAt(samples, 65)` ≈ la muestra 650; `isDeclaredRoute(DRONE_ROUTE)` true y false tras `moveStop`.
- [ ] **Step 2: Escribir `DroneLab.test.tsx`** (jsdom): tras arrastrar la parada A, aparece "Ruta modificada" y la duración cambia; "Restablecer" la quita.
- [ ] **Step 3: Actualizar el e2e**: reproducir termina al final sin repetir; arrastrar la parada B cambia la lectura de duración; soltar B sobre C muestra el mensaje y conserva la ruta; las tres gráficas siguen presentes; estructura de pasos.
- [ ] **Step 4: Correr** — Expected: FAIL.
- [ ] **Step 5: Implementar.**
- [ ] **Step 6: Reescribir `dron-reparto.mdx`** (spec v2 §7.3, Tema 1), ≤ 600 palabras, figuras verticales; el laboratorio en el paso 4 dentro de `Figure type="visualizacion"` con la línea de fuente actual.
- [ ] **Step 7: Verificación visual** (1280/375, claro/oscuro, arrastre táctil).
- [ ] **Step 8: Correr todo** — Expected: PASS.
- [ ] **Step 9: Commit e integrar** — `git commit -m "feat(tema-1): rewrite in steps with the editable-route drone lab"`; `main` ← `v2`; push.

---

### Task 12: Tema 3 reescrito con `HabitatLab`

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/components/topics/gravedad-artificial/HabitatLab.tsx`, `HabitatLab.test.tsx`, `habitatScene.ts`, `habitatScene.test.ts`.
- Modify: `src/content/topics/gravedad-artificial.mdx`, `tests/e2e/gravedad-artificial.spec.ts`.
- Delete: `HabitatCalculator.tsx`, `HabitatCalculator.test.tsx` (su lógica pasa a `habitatModel.ts` ya existente y al laboratorio).

**Interfaces:**
```ts
// habitatScene.ts
export function radiusToSlider(r: number): number;   // log10 entre 5 y 4000 → 0..1
export function sliderToRadius(u: number): number;    // inversa, redondeada a 5 m
export function angleAt(omega: number, t: number): number; // rad, módulo 2π
```
`HabitatLab`: `LabShell` con reloj de duración `period(ω)` (una vuelta; velocidad local hasta 8×); lienzo SVG propio (anillo, persona, vectores a_c y gravedad aparente en vivo, manejador de radio arrastrable sobre una barra logarítmica anotada "escala logarítmica"); parámetros principales RPM y radio; modo "fijar 1 g" (toggle local) que resuelve el otro parámetro; lecturas ω, v, a_c/g, T, gradiente; preajustes de la v1. El diagrama anotado estático queda en el paso 4 como recurso prescrito, antes del laboratorio.

- [ ] **Step 1: Escribir `habitatScene.test.ts`**: `sliderToRadius(radiusToSlider(830))` → 830; `sliderToRadius(0)` → 5; `sliderToRadius(1)` → 4000; `angleAt(rpmToOmega(1), 60)` ≈ 0.
- [ ] **Step 2: Escribir `HabitatLab.test.tsx`**: con "fijar 1 g" activo, poner RPM 2 muestra radio 223,6 m; arrastrar el manejador de radio cambia la lectura de a_c/g.
- [ ] **Step 3: Actualizar el e2e**: una vuelta completa termina y no repite; arrastrar el radio cambia una lectura; el diagrama `habitat-diagram` sigue presente; estructura de pasos.
- [ ] **Step 4: Correr** — Expected: FAIL.
- [ ] **Step 5: Implementar.**
- [ ] **Step 6: Reescribir `gravedad-artificial.mdx`** (spec v2 §7.3, Tema 3), ≤ 600 palabras; la extensión dinámica en el `Callout clase`.
- [ ] **Step 7: Verificación visual.**
- [ ] **Step 8: Correr todo** — Expected: PASS.
- [ ] **Step 9: Commit e integrar** — `git commit -m "feat(tema-3): rewrite in steps with the rotating habitat lab"`; `main` ← `v2`; push.

---

### Task 13: Tema 4 reescrito con `TyreLab`

**Modelo sugerido:** opus, esfuerzo alto. Cargar `dataviz`.

**Files:**
- Create: `src/components/topics/llantas-f1/TyreLab.tsx`, `TyreLab.test.tsx`.
- Modify: `src/lib/data/tyreModels.ts` (+ `COMPOUND_WINDOWS` con C3 105–135 y C4 90–120 °C citados), `tyreModels.test.ts`, `src/content/topics/llantas-f1.mdx`, `tests/e2e/llantas-f1.spec.ts`.
- Delete: `GripCharts.tsx`, `GripCharts.test.tsx`.

`TyreLab`: `LabShell` sin reloj; dos `SvgPlot` apilados con cursor arrastrable: temperatura (lee μ(T); `bands` con la ventana del compuesto elegido; selector C3/C4 como ajuste local) y carga (lee F_y lineal, F_y real y μ efectivo); parámetros principales T y F_z sincronizados con los cursores; lecturas μ(T), F_y lineal, F_y real, μ efectivo.

- [ ] **Step 1: Pruebas**: `COMPOUND_WINDOWS.C4` → `{ from: 90, to: 120 }` con `sourceLabel`; `TyreLab.test.tsx`: mover el cursor de carga a 8 000 N muestra 11 943 N; elegir C4 cambia la etiqueta de la banda; e2e: dos gráficas con rótulos "°C" y "(N)", arrastrar el cursor cambia una lectura, no hay barra de transporte, estructura de pasos.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Reescribir `llantas-f1.mdx`** (spec v2 §7.3, Tema 4), ≤ 600 palabras, con las salvedades de la v1 (parámetros ilustrativos, lectura propia de `LS_EXPY`, Pacejka como referencia de ingeniería).
- [ ] **Step 5: Verificación visual.**
- [ ] **Step 6: Correr todo** — Expected: PASS.
- [ ] **Step 7: Commit e integrar** — `git commit -m "feat(tema-4): rewrite in steps with the tyre grip lab"`; `main` ← `v2`; push.

---

### Task 14: Tema 5 reescrito con `TriggerLab` y prueba estricta de estructura

**Modelo sugerido:** opus, esfuerzo alto.

**Files:**
- Create: `src/components/topics/control-haptico/TriggerLab.tsx`, `TriggerLab.test.tsx`, `triggerScene.ts`, `triggerScene.test.ts`.
- Modify: `src/content/topics/control-haptico.mdx`, `tests/e2e/control-haptico.spec.ts`, `src/content/topics.test.ts`.
- Delete: `SpringForceCurve.tsx`, `SpringForceCurve.test.tsx`.

```ts
// triggerScene.ts
export function leverAngle(xMm: number, travelMm: number, maxAngleDeg: number): number; // lineal
export function xFromLever(angleDeg: number, travelMm: number, maxAngleDeg: number): number;
export function releaseParams(k: number): OscillatorParams; // m 0.02 kg, c = criticalDamping(k, 0.02)
```
`TriggerLab`: `LabShell` sin reloj; gatillo en SVG (palanca sobre pivote) arrastrable de 0 a 8 mm; al soltar, animación con `dampedSpringStep` hasta `isAtRest` (rAF, acotada a 3 s, respeta movimiento reducido); `SvgPlot` F–x con Hooke ideal y perfil del gatillo y marcador en vivo; parámetros principales k y x₀; lecturas x, F, energía; ajuste local: amortiguación (crítica, subamortiguada ×0,3). `HapticVideo` sigue arriba sin cambios.

- [ ] **Step 1: Pruebas**: `triggerScene.test.ts` (`leverAngle` y `xFromLever` inversas; `releaseParams(400).c` ≈ 5.657); `TriggerLab.test.tsx` (arrastrar el gatillo a 8 mm muestra F 3,2 N con k 400 y x₀ 0; soltar lleva x a 0 con temporizadores falsos); e2e: arrastrar cambia la lectura, al soltar vuelve a 0,0 mm en menos de 3 s, el video y sus marcadores siguen, estructura de pasos; `topics.test.ts` estricto: todo tema publicado tiene ≥ 3 `Step`, un `Why` por `Step`, `UseCase`, `Connections`, `Sources`.
- [ ] **Step 2: Correr** — Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Reescribir `control-haptico.mdx`** (spec v2 §7.3, Tema 5), ≤ 600 palabras; el video con análisis en el paso 4 antes del laboratorio; marcadores y transcripción como en la v1 hasta que exista el clip.
- [ ] **Step 5: Verificación visual.**
- [ ] **Step 6: Correr todo** — Expected: PASS.
- [ ] **Step 7: Commit e integrar** — `git commit -m "feat(tema-5): rewrite in steps with the trigger lab and enforce the step structure"`; `main` ← `v2`; push.

---

### Task 15: Pase de accesibilidad, respuesta en móvil y rendimiento v2

**Modelo sugerido:** opus, esfuerzo alto. Cargar `chrome-devtools-mcp:a11y-debugging`.

- [ ] **Step 1: Extender `a11y.spec.ts`** a la barra cerrada y a cada laboratorio con el panel de ajustes abierto; `responsive.spec.ts` a los cinco laboratorios a 375 px (sin desplazamiento horizontal, manejadores de ≥ 24 px).
- [ ] **Step 2: Correr y corregir** lo que falle; revisar foco en manejadores, nombres accesibles de cursores y palancas, `aria-live` en lecturas.
- [ ] **Step 3: Lighthouse** en portada, tema 1 y tema 2, escritorio y móvil — Expected: Accesibilidad ≥ 95, Rendimiento ≥ 90, Buenas prácticas ≥ 95; registrar.
- [ ] **Step 4: Correr todo** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ui): accessibility and performance pass for the v2 labs and navigation"`

---

### Task 16: Revisión final de la rama, README, integración y cierre

**Modelo sugerido:** sonnet, esfuerzo medio para README y gate; la revisión final con opus.

- [ ] **Step 1: README**: estructura actualizada (carpeta `src/components/lab/`, componentes `Step`/`Why`, ajustes globales), comandos sin cambios, estado de los temas.
- [ ] **Step 2: Gate completo** — Run: `pnpm run check && pnpm run test:cov && pnpm run build && pnpm run e2e` — Expected: PASS.
- [ ] **Step 3: Revisión final de toda la rama** (proceso del skill de subagentes) y una ola de correcciones.
- [ ] **Step 4: Integrar** `main` ← `v2` y push; verificar el despliegue.
- [ ] **Step 5: Lectura de Dylan** de los cinco textos; integrar sus cambios; video del Tema 5 (`bash scripts/compress-video.sh media-raw/<archivo>`), marcadores y transcripción ajustados; `git tag -a avance-1`; entrega en Moodle (Dylan).

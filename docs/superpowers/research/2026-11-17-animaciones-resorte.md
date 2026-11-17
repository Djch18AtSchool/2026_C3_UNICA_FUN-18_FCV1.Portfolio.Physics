# Tema 10: animaciones con resorte (spring animations), el oscilador amortiguado detrás de iOS y de Motion (antes Framer Motion)

Investigación de solo lectura. Todas las fuentes se consultaron el **2026-11-17**. Los valores están copiados de la fuente abierta (código fijado a un tag o commit, con número de línea; documentación con su URL). Lo que calculé yo lleva la marca "(cálculo propio)" y lo que no pude verificar, "NO CONFIRMADO". Las citas textuales están en el idioma original. Las descargas (código, JSON de la documentación de Apple, HTML) están en `scratchpad/research/data/animaciones-resorte/` y son datos no confiables: no se ejecutó nada de ellas. Los cálculos propios están en `scratchpad/scripts/spring_calcs.py` (se corre con `python3 -I`; salida en `scratchpad/research/spring_calcs.out`). El scratchpad es volátil: si hace falta conservar el script, hay que copiarlo a un lugar durable.

**Notación de esta nota.** Sigo a Serway y a OpenStax: coeficiente de amortiguamiento **b** (F = −b v), constante elástica k, masa m, ω₀ = √(k/m), razón de amortiguamiento ζ = b/(2√(km)). Ojo con los nombres en el código, que no coinciden entre bibliotecas:

| Magnitud | Libro | Apple (SwiftUI, UIKit, Core Animation) | Motion | Android / Compose | Material 3 (tokens) | react-spring | Tema 5 (`spring.ts`) |
|---|---|---|---|---|---|---|---|
| b (N·s/m) | b | `damping` | `damping` | (no se expone) | (no se expone) | `friction` | `c` |
| ζ (adimensional) | ζ | `dampingRatio`, `dampingFraction` | (interno `dampingRatio`) | `dampingRatio` | `Spring…Damping` (¡es ζ!) | `damping` (¡es ζ!) | `ratio` |
| k (N/m) | k | `stiffness` | `stiffness` | `stiffness` | `Spring…Stiffness` | `tension` | `k` |

---

## 1. Recomendación

**Caso de uso: Motion (antes Framer Motion; licencia MIT), el generador `spring` de `packages/motion-dom/src/animation/generators/spring.ts`, tag `v14.14.0` (commit `f95ab94`, 2026-11-13). Apple (SwiftUI `Spring` y la charla WWDC23 «Animate with springs») es la voz de diseño que explica el porqué.**

Motivos:
- Es código abierto y fijable a un tag. Las tres soluciones analíticas (subamortiguado, crítico, sobreamortiguado) están escritas literalmente en el código (L389-L393, L399-L404, L414-L455). **Con las fórmulas del libro reproduje exactamente los tres vectores de prueba del propio Motion** (`spring.test.ts` L41-L121): la página puede decir, con evidencia, que «la ecuación del libro es la del código» (cálculo propio, §4).
- El código contiene todo el «qué se gana y qué cuesta» que pide la banda Excelente: la velocidad de la animación interrumpida pasa a la nueva (`motion-value.ts` L48 y `retarget`, L463-L478); los umbrales de reposo son empíricos («selected empirically», L339-L340); hay una parametrización perceptual (`visualDuration` con el factor 1,2, L240-L248, y `findSpring` con Newton, L112-L186); los resortes definidos por duración ignoran la velocidad heredada (L305-L312, y la documentación lo admite); y hubo un fallo numérico real en la solución analítica (desbordamiento de sinh/cosh, issue #1207, corregido en 14.7.0). Además, las transiciones por omisión eligen ζ según la propiedad: `x`, `y` y `rotate` subamortiguados (500/25), y `scale` hacia 0 **exactamente crítico**, con `2 * Math.sqrt(550)` (`default-transitions.ts` L4-L18).
- Apple pone el argumento de diseño con citas primarias (WWDC23: continuidad de velocidad, gesto que entrega su velocidad, «perceptual duration» frente a «settling duration») y presets documentados (`.smooth` con rebote base 0, `.snappy` con 0,15 y `.bouncy` con 0,3, a 0,5 s). Su código es cerrado: no se puede citar una línea, pero el ejemplo numérico de su documentación (0,5 s y 0,3 → 157,9 y 17,6) permite verificar la conversión.
- La consigna nombra a los dos. La página puede contarlo así: «Apple lo explica; Motion lo muestra en código abierto». El propio código de Motion dice que mapea el rebote «as SwiftUI does» (L43).

**Alternativas:**
1. **Apple sola (SwiftUI, UIKit, Core Animation).** Tiene las mejores citas y es el producto más reconocible, pero su código es cerrado. Como caso principal pierde por la misma razón que Unity perdió frente a Box2D en el Tema 7.
2. **Android Jetpack (`SpringForce`, Compose `spring`) y los tokens de Material 3** (AndroidX, Apache 2.0, commit `b192298`). Es el mejor contraste: la solución es analítica y se aplica cuadro a cuadro desde el estado actual, la API se expresa en k y ζ, y al cambiar de destino a mitad de cuadro el código lo aproxima con dos medios pasos. En el mismo repositorio se ve el cambio de la industria: `MotionTokens.kt` (duraciones de 50 a 1 000 ms con curvas de Bézier) junto a `StandardMotionTokens.kt` y `ExpressiveMotionTokens.kt` (resortes con k y ζ).
3. **react-spring v10.1.2** (MIT). Sirve de contraste numérico: integra con Euler semi-implícito en pasos de 1 ms, el mismo integrador que el Tema 5. Su opción `bounce` es literalmente un coeficiente de restitución contra el destino, lo que da un puente genuino con el Tema 7.

---

## 2. Casos de uso candidatos, ordenados

| # | Caso | Qué calcula el software | Ecuación explícita en el código | Por qué la física supera a la animación con guion (duración + curva) o a la tabla | Qué cuesta |
|---|---|---|---|---|---|
| 1 | **Motion v14.14.0** (TS, MIT) | Posición y velocidad de cada valor animado (x, y, scale, rotate, opacidad…) en el instante t, en forma cerrada para cada régimen | Subamortiguado: `return s.target - c.env * (c.A * c.sin + s.delta * c.cos)` con `c.A = (s.velocity + decay * s.delta) / angularFreq` (L375, L392); crítico: `s.target - Math.exp(-undampedAngularFreq * t) * (s.delta + (s.velocity + undampedAngularFreq * s.delta) * t)` (L401-L404); sobreamortiguado: dos exponenciales (L449-L450); `dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))` (L314) | Una animación nueva hereda `value.getVelocity()` (L48 de `motion-value.ts`): una interrupción o un gesto no producen un salto de velocidad. Con tres números (k, b, m) sirve para cualquier distancia, punto de partida y velocidad inicial. Una curva con duración «is just a prespecified curve, so there's no way to represent an initial velocity» (WWDC23) | No hay duración fija: el final depende de umbrales empíricos (2 px/s y 0,5 px). Los resortes por duración (`duration` + `bounce`) recuperan el tiempo exacto pero **descartan la velocidad**. Convertir de parámetros perceptuales a k y b exige Newton (12 iteraciones). Hubo desbordamiento numérico (sinh/cosh, #1207). Para CSS se muestrea en `linear()` cada 30 ms |
| 2 | **Apple: SwiftUI `Spring`, UIKit `UISpringTimingParameters`, Core Animation `CASpringAnimation`** | Lo mismo en iOS, iPadOS, macOS, watchOS y visionOS; desde iOS 17 es la animación por omisión de SwiftUI | Cerrado. Documentado: `damping / (2 * sqrt (stiffness * mass))` (UIKit); `Spring(duration: 0.5, bounce: 0.3)` → `(1.0, 157.9, 17.6)`; la diapositiva de conversión de la WWDC23 (con una errata, §3.3) | «springs are the only type of animation that maintains continuity both for static cases and cases with an initial velocity» (WWDC23, 365 s) | «The settling duration depends on many different factors, so can be a bit unpredictable» (1011 s). m, k y b «are not very intuitive» (576 s), por eso Apple inventó duración y rebote. Distintas propiedades terminan en tiempos distintos |
| 3 | **Android `SpringForce` / Compose `spring` / Material 3** (Java y Kotlin, Apache 2.0) | Valor y velocidad de cada propiedad en cada cuadro, con la solución analítica aplicada desde el estado del cuadro anterior | `double c = 2 * mNaturalFreq * mDampingRatio;` (SpringForce L220); `updateValues` analítico por régimen (L272-L314) | «spring can handle interruptions more smoothly than duration-based AnimationSpec types because it guarantees the continuity of velocity when target value changes amid animations» (documentación de Compose) | Umbral de reposo por propiedad; m fija en 1; al cambiar el destino a mitad de cuadro se aproxima con dos medios pasos (`SpringAnimation` L277-L283) |
| 4 | **react-spring v10.1.2** (TS, MIT) | Lo mismo con integración numérica | `const springForce = -config.tension * 0.000001 * (position - to)` · `const dampingForce = -config.friction * 0.001 * velocity` · `velocity = velocity + acceleration * step` · `position = position + velocity * step` con `step = 1 // 1ms` (SpringValue L310-L337) | Igual que arriba. Además, `bounce` es un rebote contra el destino: `velocity = -velocity * bounceFactor` (L327) | 1 000 pasos por segundo de animación; el error depende del paso; el umbral es adaptativo (`precision`) |

---

## 3. Fuentes

### 3.1 Código de Motion (antes Framer Motion)

**[motion-v14140] Motion v14.14.0.** Matt Perry y colaboradores, Motion B.V. GitHub `motiondivision/motion`, tag `v14.14.0`, commit `f95ab9418d9524b906c8681994b95d15cb03d5fc` (fecha del commit: 2026-11-13), licencia MIT («Copyright (c) 2024 Motion B.V.», `LICENSE.md` L1-L3). En npm, `motion` y `framer-motion` están ambos en 14.14.0 con licencia MIT. **CONFIRMADO.** Archivo principal: `packages/motion-dom/src/animation/generators/spring.ts` (532 líneas). URL base: https://github.com/motiondivision/motion/blob/v14.14.0/packages/motion-dom/src/animation/generators/spring.ts
- Valores por omisión, L22-L40: `defaultStiffness = 100` (L22), `defaultDamping = 10` (L23), `defaultMass = 1.0` (L24), `defaultDuration = 800 // in ms` (L27), `defaultBounce = 0.3` (L28), `defaultVisualDuration = 0.3 // in seconds` (L29); umbrales `restSpeedGranular = 0.01`, `restSpeedDefault = 2`, `restDeltaGranular = 0.005`, `restDeltaDefault = 0.5` (L32-L35); límites `minDuration = 0.01`, `maxDuration = 10.0`, `minDamping = 0.05` (L38-L40).
- Rebote → ζ, L42-L50: «Maps bounce to a damping ratio as SwiftUI does: 0 is critically damped, and it approaches undamped towards 1 and infinitely overdamped towards -1.» Código: `bounce < 0 ? 1 / Math.max(1 + bounce, minDamping) : Math.max(1 - bounce, minDamping)`. Es decir, **ζ = 1 − rebote** para rebote ≥ 0 y ζ = 1/(1 + rebote) para rebote < 0.
- `visualDuration`, L240-L248: `const root = ((2 * Math.PI) / (options.visualDuration * 1.2)) * overdampedFreqScale(...)`, `springOptions.stiffness = root * root`, `springOptions.damping = 2 * dampingRatio * Math.sqrt(springOptions.stiffness)`. Con m = 1: **ω₀ = 2π/(1,2·T_v)** y b = 2ζ√k.
- `findSpring` (resorte definido por `duration` y `bounce`), L102-L186: «This is ported from the Framer implementation of duration-based spring resolution.» (L103); `const safeMin = 0.001` (L105); «Assumes zero initial velocity and the default mass: duration springs start from rest so they end exactly at their duration.» (L107-L111). Busca ω₀ con Newton (`rootIterations = 12`, L89) a partir de `initialGuess = 5 / duration` (L174).
- Velocidad heredada, L305-L312: «A duration spring must end exactly at its duration, and it's settled from rest by then. Inherited velocity could leave it still moving, so it starts from rest. Every other spring, visualDuration included, ends when it comes to rest, so inherits velocity as its initial condition.» `const inheritVelocity = (velocity: number) => isResolvedFromDuration ? 0 : -millisecondsToSeconds(velocity)`.
- Parámetros físicos, L314-L318: `const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass))`, `undampedAngularFreq = … Math.sqrt(stiffness / mass)`, `const decay = dampingRatio * undampedAngularFreq`.
- Umbrales de reposo, L335-L350: «These defaults have been selected empirically based on what strikes a good ratio between feeling good and finishing as soon as changes are imperceptible.» (L339-L340); `const isGranularScale = Math.abs(s.delta) < 5` (L343).
- Subamortiguado, L362-L397: `c.A = (s.velocity + decay * s.delta) / angularFreq` (L375); `return s.target - c.env * (c.A * c.sin + s.delta * c.cos)` (L392). `calcAngularFreq` = `undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio)` (L85-L87).
- Crítico, L399-L413: `s.target - Math.exp(-undampedAngularFreq * t) * (s.delta + (s.velocity + undampedAngularFreq * s.delta) * t)`.
- Sobreamortiguado, L414-L455: «Overdamped spring: the sum of a slow and a fast decaying exponential, so no term can overflow however heavily it's damped.» (L415-L417); `slow = decay - dampedAngularFreq`, `fast = decay + dampedAngularFreq` (L421-L422). Límite no físico L424-L438: «Physics-defined springs keep a non-physical limit … any later and it cuts off a slow spring that's visibly still moving (#1207).»
- Redirección, L463-L478: «Aim the spring at a new target from its current position and velocity, reusing the resolved physics and closures.» `retarget: (keyframes, newVelocity) => { … s.velocity = inheritVelocity(newVelocity) … update() }`.
- Criterio de fin, L484-L490: `state.done = Math.abs(currentVelocity) <= s.restSpeed && Math.abs(s.target - current) <= s.restDelta`; en los resortes por duración, `state.done = t >= duration!`.
- CSS, L497-L511: `toString` muestrea la curva en `linear()` con resolución de 30 ms (`generateLinearEasing(…, easingDuration, 30)`).
- Transiciones por omisión, `packages/motion-dom/src/animation/utils/default-transitions.ts` L4-L18 y L35-L47: `underDampedSpring = { type: "spring", stiffness: 500, damping: 25, restSpeed: 10 }` para las propiedades de transformación; para `scale`, `stiffness: 550, damping: target === 0 ? 2 * Math.sqrt(550) : 30`. **Cuando la escala va a 0, Motion usa b = 2√(km) con m = 1, el crítico exacto**: así la escala no se pasa a valores negativos. El CHANGELOG L4796, versión 3.4.0 (2021-02-18), dice: «Fixed default spring for `scale`, `opacity` etc from being overdamped to being critically damped when animating to `0`.»
- Herencia de velocidad al interrumpir: `packages/motion-dom/src/animation/interfaces/motion-value.ts` L48: `velocity: value.getVelocity(),`. `FollowAnimation.ts` L102-L117: «Steer towards new keyframes from the current position and velocity. Springs are updated in place».
- Pruebas, `packages/motion-dom/src/animation/generators/__tests__/spring.test.ts`:
  - L41-L53: `keyframes: [100, 1000], stiffness: 300` (b = 10, m = 1 por omisión), muestreado cada 200 ms → `[100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000]`.
  - L72-L85: `stiffness: 100, damping: 20` (crítico) → `[100, 635, 918, 984, 997, 1000]`.
  - L105-L121: `stiffness: 300, damping: 100` (sobreamortiguado) → `[100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999, 1000]`.
  - L473-L475: «bounce 0 is 96.68% of the way at visualDuration».
  - L487-L498: «bounce of %d has 0.1% of the distance left at duration» (para rebote 0 y negativos).
  - L320-L330: un resorte con `duration: 800, bounce: 0.3, velocity: 2000` termina exactamente a los 800 ms.
  - L501-L505: «bounce is limited to -0.95».
- `CHANGELOG.md` (en el mismo tag): L1892-L1897, [11.12.0] 2024-11-27: «New `visualDuration` option for `spring` animations.»; L4984-L4988, [2.7.0] 2020-09-23: «Duration-based springs.»; L573-L577, [12.34.3] 2026-02-20: «Ensure `velocity` is never transferred to a time-derived spring.»; L523-L530, [12.35.2] 2026-03-09: «Ensure `useSpring` is not affected by monitor framerate.»; L248-L252, [13.5.0] 2026-10-01: «`spring`: Now accepts negative `bounce` (`0`-`-1`) to define overdamped springs.»; L203-L207, [14.1.1] 2026-10-13: «Fix velocity hand-off for hardware-accelerated springs.»; L106-L120, [14.7.0] 2026-10-27: «`spring`: Fix overdamped springs snapping to target.»; L28-L32, [14.12.0] 2026-11-10: «`spring`: `visualDuration`/`bounce` respects `velocity`.»
- Plan interno del repo `plans/031-overdamped-spring-exponential-form.md` («Planned at: commit `42bfbe3ed`, 2026-06-11»): «slow overdamped springs visibly **snap to the target mid-animation**. Root cause … the overdamped branch caps `sinh`/`cosh` inputs at 300 to avoid `Infinity` … freezing them at the cap kills that cancellation». Es un ejemplo documentado de que **la solución analítica también tiene trampas numéricas**. `plans/033-findspring-closed-form.md` da la raíz crítica «`u ≈ 9.2334134764516`», que coincide con mi cálculo (§4).
- `README.md` L57: «**Note:** Framer Motion is now Motion.»; L133: «Motion powers the animations for all websites built with Framer, the web builder for creative pros.»

**[motion-v12430] Motion v12.43.0.** Tag `v12.43.0`, commit `a4ef40a5dd378205a41dbb19e7fad04e3280607f` (2026-07-28). **CONFIRMADO.** Es la versión que muestran casi todos los tutoriales: la física es la misma y la estructura distinta (objeto `springDefaults`, L21-L48; `visualDuration` en L190-L205 con `clamp(0.05, 1, 1 - bounce)`; sobreamortiguado con sinh/cosh y tope `Math.min(dampedAngularFreq * t, 300)` en L343-L344). **No mezclar números de línea entre versiones.**

**[motion-blog-2024] «Framer Motion is now independent, introducing Motion».** Matt Perry. motion.dev, 2024-11-12 (`datePublished` de la página). https://motion.dev/blog/framer-motion-is-now-independent-introducing-motion **CONFIRMADO.** «Framer Motion is now completely independent. I'm spinning it off into its own project, to better serve the whole community.»

### 3.2 Documentación de Motion

**[motion-docs-spring] spring.** motion.dev. https://motion.dev/docs/spring (sin fecha ni versión en la página). **CONFIRMADO.**
- «`spring()` creates physics-based spring animations, configured by bounce, stiffness, damping, and mass.»
- `visualDuration`: «The visual duration is a time, set in seconds, that the animation will take to visually appear to reach its target.» «Unlike `duration`, a `visualDuration` spring incorporates the velocity of any animation or gesture it interrupts, like a physics-based spring.» «In other words, the bulk of the transition will occur before this time, and the "bouncy bit" will mostly happen after.»
- `bounce`: «Negative values, down to `-1`, make the spring overdamped … It still arrives at the same time as a `bounce` of `0`, so a negative `bounce` changes the shape of the motion, not its timing.»
- `velocity`: «A spring set with `duration` always lasts exactly its duration, so it starts from rest and ignores `velocity`.»
- «WARNING Springs with `damping: 0` will run forever».
- **Contradicciones con el código** (verificadas con la página descargada): la documentación dice `stiffness` «Default: 1», `bounce` «Default: 0.25», `restSpeed` «Default: 0.1» y `restDelta` «Default: 0.01». El código v14.14.0 dice 100, 0,3, 2 (o 0,01) y 0,5 (o 0,005). **En la página se citan los valores del código.**

**[motion-docs-transitions] Transitions (React).** https://motion.dev/docs/react-transitions **CONFIRMADO.** «Physics-based spring animations are set via stiffness, damping and mass, and these incorporate the velocity of any existing gestures or animations for natural feedback.» «Duration-based spring animations are set via a duration and bounce. A duration spring always lasts exactly its duration, so it doesn't incorporate velocity, but it's easier to understand, and can also be generated as pure CSS for when you'd rather not ship Motion to the browser.» Es la mejor cita de **qué cuesta** elegir duración en lugar de física.

**[npm] Descargas semanales en npm** (API pública `api.npmjs.org/downloads/point/last-week/…`, semana del 2026-11-10 al 2026-11-16). **CONFIRMADO:** `framer-motion` 69 550 484; `motion` 35 498 605; `@react-spring/web` 6 609 703. Descargas no son usuarios (incluyen CI y dependencias transitivas): usar como orden de magnitud.

### 3.3 Apple

La documentación de Apple se leyó en su JSON público (`https://developer.apple.com/tutorials/data/documentation/<ruta>.json`, el mismo contenido que la página `https://developer.apple.com/documentation/<ruta>`). **CONFIRMADO** en todo lo que sigue, salvo donde se indica.

**[apple-spring] SwiftUI `Spring`.** https://developer.apple.com/documentation/swiftui/spring (iOS 17.0, macOS 14.0, visionOS 1.0, watchOS 10.0).
- Overview: «Use this type to convert between different representations of spring parameters:» con el ejemplo `let spring = Spring(duration: 0.5, bounce: 0.3)` → `// (1.0, 157.9, 17.6)` para (mass, stiffness, damping), y `let spring2 = Spring(mass: 1, stiffness: 100, damping: 10)` → `// (0.63, 0.5)` para (duration, bounce).
- `init(duration:bounce:)`, con valores por omisión `duration: TimeInterval = 0.5, bounce: Double = 0.0`: «duration: Defines the pace of the spring. This is approximately equal to the settling duration, but for springs with very large bounce values, will be the duration of the period of oscillation for the spring.» «bounce: … A value of 0 indicates no bounces (a critically damped spring), positive values indicate increasing amounts of bounciness up to a maximum of 1.0 (corresponding to undamped oscillation), and negative values indicate overdamped springs with a minimum value of -1.0.»
- `init(response:dampingRatio:)`: «response: Defines the stiffness of the spring as an approximate duration in seconds.» «dampingRatio: Defines the amount of drag applied as a fraction the amount needed to produce critical damping.»
- `init(mass:stiffness:damping:allowOverDamping:)`: `mass: Double = 1.0`; «allowOverDamping: … a value of false specifies that such cases should instead be treated as critically damped.»
- `duration` (propiedad): «The perceptual duration, which defines the pace of the spring.» `settlingDuration`: «The estimated duration required for the spring system to be considered at rest.» «This uses a `target` of 1.0, an `initialVelocity` of 0, and an `epsilon` of 0.001.»
- Presets: `smooth(duration: TimeInterval = 0.5, extraBounce: Double = 0.0)`, «How much additional bounce should be added to the base bounce of 0.»; `snappy(…)`, «… base bounce of 0.15.»; `bouncy(…)`, «… base bounce of 0.3.» Las propiedades estáticas `.smooth`, `.snappy` y `.bouncy` solo dicen «a predefined duration»: que esa duración sea 0,5 s lo **infiero** del valor por omisión de las funciones (NO CONFIRMADO de forma literal).
- `Animation.default`: «The `default` animation is spring(response:dampingFraction:blendDuration:) with: `response` equal to `0.55` · `dampingFraction` equal to `1.0` · `blendDuration` equal to `0.0`. Prior to iOS 17, macOS 14, tvOS 17, and watchOS 10, the `default` animation is easeInOut.»
- `Animation.spring(response:dampingFraction:blendDuration:)`: valores por omisión `response: 0.5, dampingFraction: 0.825`; «A persistent spring animation. When mixed with other `spring()` or `interactiveSpring()` animations on the same property, each animation will be replaced by their successor, preserving velocity from one animation to the next.» `interactiveSpring`: `response: 0.15, dampingFraction: 0.86, blendDuration: 0.25`.
- `interpolatingSpring(mass:stiffness:damping:initialVelocity:)` (iOS 13): «Preserves velocity across overlapping animations by adding the effects of each animation.»

**[apple-uikit] UIKit.** **CONFIRMADO.**
- `UISpringTimingParameters` (iOS 10): «This property's value accelerates toward its final value according to the relative force of the spring, which you configure. It then oscillates around that final value until it comes to a rest.»
- `init(mass:stiffness:damping:initialVelocity:)`: «The damping ratio for the spring is computed from the formula `damping` / (2 * sqrt (`stiffness` * `mass`)).» Es literalmente ζ = b/(2√(km)).
- `initialVelocity`: «To create a smooth transition from an object in motion into a spring animation, initialize the spring timing parameters with an initial velocity. One common use of this property is to animate a view to a final resting position at the end of a pan gesture.» Se normaliza por la distancia: «Set the `dx` component of the initial velocity vector to the `x` velocity divided by the `x` distance.»
- `UIView.animate(withDuration:delay:usingSpringWithDamping:initialSpringVelocity:…)`: «A value of `1` corresponds to the total animation distance traversed in one second. For example, if the total animation distance is 200 points and you want the start of the animation to match a view velocity of 100 pt/s, use a value of `0.5`.»
- `UIView.animate(springDuration:bounce:initialSpringVelocity:…)` (iOS 17): valores por omisión `duration = 0.5, bounce = 0.0`.
- `init()` de `UISpringTimingParameters`: «sets the damping ratio to `4.56`». Es un valor muy sobreamortiguado y la página no explica de dónde sale: **no usarlo como preset**.

**[apple-ca] Core Animation `CASpringAnimation`** (iOS 9). **CONFIRMADO.**
- `mass`: «The default mass is `1`. Increasing this value will increase the spring effect: the attached object will be subject to more oscillations and greater overshoot, resulting in an increased settlingDuration.»
- `stiffness`: «The default stiffness coefficient is `100`.» `damping`: «The default value of the damping property is `10`.» `initialVelocity`: «Defaults to `0`».
- `settlingDuration`: con `fromValue = 0`, `toValue = 640`, `damping = 5`, «the settling duration is approximately 2.85 seconds: the animated layer bounces around the target position several times before settling. However, changing the damping property to `15` reduces the settling duration to just over 1 second». «All of the spring animation's physical attributes: damping, initialVelocity, mass and stiffness, can affect the settling duration.»
- `init(perceptualDuration:bounce:)` (iOS 17) existe. Su página no tiene texto.
- **Los valores por omisión de Core Animation (1, 100, 10) son exactamente los de Motion** (observación propia).

**[wwdc23-springs] «Animate with springs».** Apple, WWDC23, sesión 10158, presentada por «Jacob» (el apellido no aparece en la transcripción). https://developer.apple.com/videos/play/wwdc2023/10158/ Transcripción oficial en la página; los segundos son las marcas `data-start`. **CONFIRMADO.**
- 134-149 s: «If an object's velocity suddenly changes, that also feels unnatural. … So one goal we have is to make our animations have continuous position and velocity.»
- 315-318 s (curva ease-in-out tras un gesto): «This type of animation is just a prespecified curve, so there's no way to represent an initial velocity.»
- 336-342 s: «A spring can start with any initial velocity, so we get a natural feeling where our animation picks up right where the gesture ends.»
- 365-370 s: «So springs are the only type of animation that maintains continuity both for static cases and cases with an initial velocity.»
- 406 s: «These types of non-bouncy springs are used in animations all over iOS.»
- 422-425 s: «It very slowly and gradually comes to rest. There's no single point when the object is abruptly done.»
- 449-476 s: «different properties animating with springs can finish at different times, which is true. … Don't we want all animations to start and stop at the same time? The answer is no!»
- 521-534 s: «this motion is defined by 3 properties: the object's mass, the spring's stiffness, and the damping of the system, which is a measure of how much friction is applied to the object by its surroundings.»
- 573-584 s: «But while these are a natural way to model a physical system, they're not very intuitive for defining a spring animation. There isn't a real object with mass or a spring with stiffness here, and making up these values to change the curve is not easy to do.»
- 594 s y 607-613 s: «It uses just 2 parameters: duration and bounce.» «we're adopting these universally across Apple's design and engineering efforts. So all of our frameworks that support springs will use them.»
- 650-655 s: «In the physics of springs, these are called underdamped, critically damped, and overdamped springs. But I like to think of them as bouncy, smooth, and flattened.»
- 715-749 s: con rebote del 100 % «it's now exactly the behavior of a cosine wave … it's just a cosine curve, and the time is divided by the duration. So for this bounce value, the duration corresponds exactly to the period of the curve.»
- 791-807 s: «This additional curve is an exponential decay curve. … So what seemed like a complicated curve is just the product of these two components, which is called a damped cosine or sine wave.»
- 900-910 s: «a spring animation uses the velocity it had when it was retargeted as the initial velocity towards its new destination and this same velocity preservation makes these kind of interruptions feel smooth and natural.»
- 982-1029 s: «The exponential decay of the spring means that technically it keeps moving forever … That amount of time until a spring animation is finished enough to remove is called the settling duration. This settling duration is different from the duration parameter … The settling duration depends on many different factors, so can be a bit unpredictable, but the duration parameter is a perceptual duration that is chosen to be predictable … you shouldn't wait for the settling duration for user-facing changes.»
- 1052 s: «we now use them as the default animation in SwiftUI».
- 1259-1286 s: «A bounce of 0 feels like a smooth, gradual change. A small bounce, like around 15%, doesn't feel very bouncy yet, but the long tail feels a little more brisk. And for larger bounce values like 30%, you do start to feel some noticeable bounciness. … you should be cautious about using values higher than around 0.4, since they may feel too exaggerated for a UI element.»
- 1311-1315 s: «Bounce can also make sense when you want an animation to feel more physical, like if it's going to be used at the end of a gesture.»
- Código de la página, «19:26 - Spring Parameter Conversion», textual: `mass = 1` · `stiffness = (2π ÷ duration)^2` · `damping = 1 - 4π × bounce ÷ duration, bounce ≥ 0` · `4π ÷ (duration + 4π × bounce), bounce < 0`. **La fórmula de `damping` está mal transcrita**: con (0,5; 0,3) da 1 − 4π·0,3/0,5 = −6,54, mientras que el ejemplo de la documentación da 17,6 (cálculo propio). La forma coherente con ese ejemplo es b = 4π(1 − rebote)/duración, que da 17,59 (cálculo propio). La rama negativa también es incoherente: se anula para rebote = −duración/(4π) ≈ −0,04. **NO CONFIRMADO** cómo convierte Apple un rebote negativo. Esta errata circula copiada en sitios de terceros (por ejemplo, la documentación `SpringPreset` de remix.run).

### 3.4 Android, Compose y Material 3

**[androidx] AndroidX**, GitHub `androidx/androidx`, rama `androidx-main` en el commit `b192298bee5cff524471e0eac2f294aa59794ca6` (2026-11-17), licencia Apache 2.0. Descargado de `raw.githubusercontent.com` en ese commit. **CONFIRMADO.**
- `dynamicanimation/dynamicanimation/src/main/java/androidx/dynamicanimation/animation/SpringForce.java`:
  - L22-L34: «If damping ratio equals to 1 (i.e. critically damped), the object will return to equilibrium within the shortest amount of time. … Without any damping (i.e. damping ratio = 0), the mass will oscillate forever.» Matiz: el más rápido **sin rebasar** (§5, paso 3).
  - Constantes, L40-L75: `STIFFNESS_HIGH = 10_000f`, `STIFFNESS_MEDIUM = 1500f` («This is the default stiffness for spring force.»), `STIFFNESS_LOW = 200f`, `STIFFNESS_VERY_LOW = 50f`; `DAMPING_RATIO_HIGH_BOUNCY = 0.2f`, `DAMPING_RATIO_MEDIUM_BOUNCY = 0.5f` (por omisión), `DAMPING_RATIO_LOW_BOUNCY = 0.75f`, `DAMPING_RATIO_NO_BOUNCY = 1f`.
  - L77-L80: «if it takes >= 1 frame to move the value threshold amount, then the velocity is a reasonable threshold.» `VELOCITY_THRESHOLD_MULTIPLIER = 1000.0 / 16.0`.
  - L215-L223 (`getAcceleration`): `double k = mNaturalFreq * mNaturalFreq;` `double c = 2 * mNaturalFreq * mDampingRatio;` `return (float) (-k * lastDisplacement - c * lastVelocity);`. Android fija m = 1: k = ω₀² y b = 2ζω₀.
  - L268-L314 (`updateValues`): «calculate the spring position/velocity using an analytical approach.» Ramas `// Overdamped`, `// Critically damped` y `// Underdamped`.
- `SpringAnimation.java`:
  - L162-L184 (`animateToFinalPosition`): «When the animation is running, calling this method would assume the position change of the spring as a continuous movement since last frame».
  - L276-L283: «Approximate by considering half of the time spring position stayed at the old position, half of the time it's at the new position.»
  - L240-L241: `canSkipToEnd()` devuelve `mSpring.mDampingRatio > 0`, porque un resorte sin amortiguar no termina nunca.
- Compose, `compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/VectorizedAnimationSpec.kt` L836-L884: `object Spring` con `StiffnessHigh = 10_000f`, `StiffnessMedium = 1500f`, `StiffnessMediumLow = 400f` («the default stiffness for springs used in enter/exit transitions»), `StiffnessLow = 200f`, `StiffnessVeryLow = 50f`, `DampingRatioHighBouncy = 0.2f`, `DampingRatioMediumBouncy = 0.5f`, `DampingRatioLowBouncy = 0.75f`, `DampingRatioNoBouncy = 1f`, `DefaultDisplacementThreshold = 0.01f`. `AnimationSpec.kt` L876-L878: `spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium, …)`, así que **en Compose el resorte por omisión es crítico**. `SpringSimulation.kt` L88-L89: `val k = naturalFreq * naturalFreq` · `val c = 2.0 * naturalFreq * dampingRatio`.
- Material 3 (`compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/`):
  - `tokens/StandardMotionTokens.kt` L20-L31: `SpringDefaultSpatialDamping = 0.9f`, `SpringDefaultSpatialStiffness = 700.0f`, `SpringFastSpatialStiffness = 1400.0f`, `SpringSlowSpatialStiffness = 300.0f` (todos con 0.9f), efectos `1.0f` con `1600.0f`, `3800.0f` y `800.0f`.
  - `tokens/ExpressiveMotionTokens.kt` L22-L33: espacial por omisión `0.8f` / `380.0f`, rápido `0.6f` / `800.0f`, lento `0.8f` / `200.0f`; efectos iguales a los estándar.
  - `MotionScheme.kt` L117-L132: «The standard scheme is Material's basic motion scheme for utilitarian UI elements and recurring interactions.» «The expressive scheme is Material's recommended motion scheme for prominent UI elements and hero interactions.» L136-L171: cada especificación es `spring(dampingRatio = …Damping, stiffness = …Stiffness)`. **El token `…Damping` es ζ, no b.**
  - `tokens/MotionTokens.kt` L24-L39 y siguientes: `DurationShort1 = 50.0` … `DurationExtraLong4 = 1000.0` y curvas `CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)`, etc. Es el sistema anterior, con duraciones y curvas.
  - La página m3.material.io («Motion – Material Design 3») no se pudo leer (es una SPA y no devolvió texto): **NO CONFIRMADO** ningún texto de Material; solo los tokens del código.
- **[android-docs-spring] «Animate movement using spring physics».** developer.android.com, «Last updated 2026-10-23 UTC». https://developer.android.com/develop/ui/views/animations/spring-animation **CONFIRMADO.** «Physics-based motion is driven by force. Spring force is one such force that guides interactivity and motion.» «if you drag an app icon around the screen and later release it by lifting your finger from the icon, the icon tugs back to its original place by an invisible but a familiar force.» «Critical damping occurs when the damping ratio is equal to one. It lets the object return to the rest position within the shortest amount of time.»
- **[compose-docs-customize] «Customize animations».** developer.android.com, «Last updated 2026-11-17 UTC». https://developer.android.com/develop/ui/compose/animation/customize **CONFIRMADO.** «`spring` can handle interruptions more smoothly than duration-based `AnimationSpec` types because it guarantees the continuity of velocity when target value changes amid animations. `spring` is used as the default AnimationSpec by many animation APIs, such as `animate*AsState` and `updateTransition`.»

### 3.5 react-spring

**[react-spring] react-spring v10.1.2.** pmndrs. GitHub `pmndrs/react-spring`, tag `v10.1.2` y `@react-spring/core@10.1.2`, commit `59b1e5306402d3039120e2da464b66e10b1a1aa1`, licencia MIT. **CONFIRMADO.**
- `packages/core/src/constants.ts` L1-L9: «The `mass` prop defaults to 1»; `default: { tension: 170, friction: 26 }`, `gentle: { tension: 120, friction: 14 }`, `wobbly: { tension: 180, friction: 12 }`, `stiff: { tension: 210, friction: 20 }`, `slow: { tension: 280, friction: 60 }`, `molasses: { tension: 280, friction: 120 }`.
- `packages/core/src/AnimationConfig.ts` L191-L197: `config.tension = Math.pow((2 * Math.PI) / frequency, 2) * mass` · `config.friction = (4 * Math.PI * damping * mass) / frequency`. **Es la misma conversión que la de Apple** (k = m(2π/T)², b = 4πζm/T), con nombres distintos. L122-L129 (`bounce`): «When above zero, the spring will bounce instead of overshooting when exceeding its goal value. Its velocity is multiplied by `-1 + bounce` …». El código hace `-velocity * bounceFactor` (`SpringValue.ts` L327): el texto y el código no coinciden.
- `packages/core/src/SpringValue.ts` L232-L239 (`precision` adaptativa: `Math.min(1, Math.abs(to - from) * 0.001)`), L295 (`restVelocity = config.restVelocity || precision / 10`), L310-L337 (bucle de Euler semi-implícito con paso de 1 ms; citado en §2).

### 3.6 Física: libros, artículo y motores

**[openstax-15-5] University Physics Volume 1, §15.5 «Damped Oscillations».** William Moebs, Samuel J. Ling y Jeff Sanny. OpenStax, 2016. https://openstax.org/books/university-physics-volume-1/pages/15-5-damped-oscillations **CONFIRMADO.** Ec. 15.23: m d²x/dt² + b dx/dt + kx = 0; Ec. 15.24: x(t) = A₀ e^(−bt/2m) cos(ωt + φ); Ec. 15.25: ω₀ = √(k/m); Ec. 15.26: ω = √(ω₀² − (b/2m)²). La raíz cuadrada del umbral crítico se pierde en el HTML («b=4mk»); en la figura 15.27 es b = √(4mk). Citas:
- «An example of a critically damped system is the shock absorbers in a car. It is advantageous to have the oscillations decay as fast as possible. Here, the system does not oscillate, but asymptotically approaches the equilibrium condition as quickly as possible.»
- «An overdamped system will approach equilibrium over a longer period of time.»
- «Critical damping is often desired, because such a system returns to equilibrium rapidly and remains at equilibrium as well. In addition, a constant force applied to a critically damped system moves the system to a new equilibrium position in the shortest time possible without overshooting or oscillating about the new position.» **Esta última frase describe justo lo que hace una interfaz al cambiar de destino.**
- La página trae el aviso «This book may not be used in the training of large language models…». Citarla y enlazarla está bien; no copiar párrafos largos.

**[serway] Serway y Jewett, *Física para ciencias e ingeniería*, Vol. 1, 10.ª ed., Cengage 2018** (ya está en el sitio como `serway-jewett-2018`). Es la fuente de libro de texto para el MAS y las oscilaciones amortiguadas (capítulo de movimiento oscilatorio). El capítulo, la sección y el número de ecuación en el ejemplar en español: **NO CONFIRMADO** en esta nota; hay que verificarlos en el libro.

**[schwager-poschel-2007] «Coefficient of restitution and linear–dashpot model revisited».** Thomas Schwager y Thorsten Pöschel. *Granular Matter* 9(6), 465-469 (2007), DOI 10.1007/s10035-007-0065-z. arXiv cond-mat/0701278, https://ar5iv.arxiv.org/html/cond-mat/0701278 **CONFIRMADO.** Resumen: «It turns out that an expression … widely used in the literature is even qualitatively incorrect due to an incorrect definition of the duration of the collision.» Su Ec. (15), la expresión «común», es ε = exp(−βπ/ω), es decir, exp(−ζπ/√(1−ζ²)) con β = ζω₀ (cálculo propio). Explican el error así: «Unfortunately, condition (14) cannot be correct since at time t_c⁰ = π/ω the interaction force is negative». Sirve para la conexión con el Tema 7 (§7).

**[box2d-v320-soft] Box2D v3.2.0, contacto blando.** Erin Catto, tag `v3.2.0`, commit `178495ba35695aefe9c321e569d2277f06db3b90` (el mismo de la investigación del Tema 7). **CONFIRMADO.** `src/types.c` L22-L23: `def.contactHertz = 30.0;` · `def.contactDampingRatio = 10.0f;`. `include/box2d/types.h` L127-L133: «Contact stiffness. Cycles per second. Increasing this increases the speed of overlap recovery, but can introduce jitter.» «Contact bounciness. Non-dimensional.» **El motor del Tema 7 modela el contacto como un resorte amortiguado** con f = 30 Hz y ζ = 10 (muy sobreamortiguado).

**[css-easing-1] CSS Easing Functions Level 1.** W3C Candidate Recommendation Draft, 2023-02-13. https://www.w3.org/TR/css-easing-1/ **CONFIRMADO.** «ease-in-out: Equivalent to cubic-bezier(0.42, 0, 0.58, 1).» Es la curva de duración fija para el contraste de la simulación.

### 3.7 Material de clase

- `.reference/class-material/02-dinamica.md`, Módulo 2, Tema 02, Concepto 04 «Fuerza elástica y ley de Hooke» (L589-L630): F_el,x = −kx; «Si el resorte es la única fuerza horizontal, la aceleración es −kx/m. … No corresponde usar MRUA durante toda la compresión o expansión. En una posición extrema puede haber velocidad cero y fuerza no nula: se trata de reposo instantáneo, no de equilibrio.» Ejemplo: k = 150 N/m, x = −0,08 m → +12 N.
- Tema 03, Concepto 03 «Trabajo de la fuerza elástica» (L749-L787); Tema 04, Concepto 03 «Energía potencial elástica» (L989-L1029, U_el = kx²/2); Concepto 05 «Trabajo no conservativo y balance de energía» (L1075-L1100: Δ(K+U) = W_otras).
- SPAA 02 «Una simulación convincente también puede estar equivocada» (L1246-L1266). La regla B, «Al soltar la tensión de un carro sin fricción, su velocidad se vuelve cero», es el error que comete una curva con duración al reiniciarse. La regla C, «En la máxima compresión del resorte, la fuerza es cero porque el bloque se detuvo», es el error en el punto de máximo sobrepaso.
- **No encontré un módulo de oscilaciones.** `https://fun18-modulo5.netlify.app/`, `…modulo7…` y `…modulo8…` responden 404; `…modulo6…` es «Módulo 6: Mecánica de fluidos». Revisado el 2026-11-17. El índice (`00-indice.md`) lista los Módulos 1-4. La oscilación amortiguada es, por tanto, **una extensión dentro del tema**, construida sobre Hooke, la segunda ley y el balance de energía de clase.

---

## 4. Números clave

Todos con m = 1 kg (lo que asumen Apple, Motion y Android). Unidades: k en N/m = kg/s² y b en N·s/m = kg/s. **La unidad de longitud se cancela**: k y b valen lo mismo si x está en píxeles o en metros, así que tiene sentido escribir «k = 157,91 N/m» para una tarjeta en pantalla (cálculo propio, análisis dimensional).

**Conversiones** (verificadas como cálculo propio contra los ejemplos de la fuente):

| Parametrización | Conversión a k y b | Verificación |
|---|---|---|
| SwiftUI `Spring(duration: d, bounce: β)`, β ≥ 0 | ω₀ = 2π/d, ζ = 1 − β → k = m(2π/d)², b = 4πm(1 − β)/d | (0,5; 0,3) → k = 157,91, b = 17,59; Apple: «(1.0, 157.9, 17.6)». (1, 100, 10) → d = 2π/10 = 0,628, β = 1 − 0,5 = 0,5; Apple: «(0.63, 0.5)» |
| SwiftUI `response`, `dampingFraction` | Lectura habitual: ω₀ = 2π/response, ζ = dampingFraction | NO CONFIRMADO en texto de Apple (solo «approximate duration») |
| Motion `visualDuration` T_v, `bounce` β ≥ 0 | ω₀ = 2π/(1,2 T_v), ζ = máx(1 − β; 0,05), b = 2ζ√k | Con β = 0, a t = T_v se lleva el 96,68 % del recorrido (cálculo propio: 96,6815 %; prueba L473-L475). Equivale a la `duration` de Apple d = 1,2 T_v |
| Motion `duration` T, `bounce` β (`findSpring`) | Raíz de ζ/√(1−ζ²)·e^(−ζω₀T) = 0,001 (subamortiguado) o e^(−ω₀T)(1 + ω₀T) = 0,001 (crítico) | T = 0,8 s, β = 0,3 → ω₀ = 12,30 rad/s, k = 151,28, b = 17,22 (cálculo propio; Newton de 12 pasos y forma cerrada coinciden) |
| react-spring `frequency` T, `damping` ζ | k = m(2π/T)², b = 4πζm/T | Idéntica a la de Apple (L196-L197) |
| UIKit / Android / Compose | ζ = b/(2√(km)); Android: b = 2ζ√k con m = 1 | Literal en el código y la documentación |
| UIKit velocidad inicial | v_norm = v_gesto/distancia | 100 pt/s sobre 200 pt → 0,5 (ejemplo de Apple) |

**Presets y valores por omisión** (ζ, ω₀ y sobrepaso son cálculo propio a partir de los valores confirmados; sobrepaso M_p = e^(−ζπ/√(1−ζ²)) con v₀ = 0):

| Biblioteca | Preset | k (N/m) | b (N·s/m) | ζ | ω₀ (rad/s) | Sobrepaso | Fuente del dato |
|---|---|---|---|---|---|---|---|
| SwiftUI | `.smooth` (d 0,5; β 0) | 157,91 | 25,13 | 1 | 12,57 | 0 | rebote base CONFIRMADO; d = 0,5 inferida |
| SwiftUI | `.snappy` (β 0,15) | 157,91 | 21,36 | 0,85 | 12,57 | 0,63 % | ídem |
| SwiftUI | `.bouncy` (β 0,3) = ejemplo de Apple | 157,91 | 17,59 | 0,70 | 12,57 | 4,60 % (a 0,350 s) | ídem; coincide con «(1.0, 157.9, 17.6)» |
| SwiftUI | β 0,4 (el límite que aconseja la WWDC) | 157,91 | 15,08 | 0,60 | 12,57 | 9,48 % | WWDC23, 1282 s |
| SwiftUI | `Animation.default` (iOS 17) | 130,5 | 22,85 | 1 | 11,42 | 0 | lectura ω₀ = 2π/response |
| SwiftUI | `interactiveSpring` | 1 754,6 | 72,05 | 0,86 | 41,89 | 0,50 % | ídem |
| Core Animation | por omisión | 100 | 10 | 0,5 | 10 | 16,30 % | CONFIRMADO |
| Core Animation | ejemplo `damping = 5` | 100 | 5 | 0,25 | 10 | 44,4 % | «approximately 2.85 seconds» |
| Motion | por omisión del generador | 100 | 10 | 0,5 | 10 | 16,30 % (a 0,363 s) | spring.ts L22-L24 |
| Motion | transición por omisión de x, y, rotate | 500 | 25 | 0,559 | 22,36 | 12,03 % | default-transitions.ts L4-L9 |
| Motion | transición por omisión de scale | 550 | 30 | 0,640 | 23,45 | 7,32 % | L11-L18 |
| Motion | scale hacia 0 | 550 | 2√550 = 46,90 | 1 | 23,45 | 0 | L16 |
| Motion | `spring()` sin argumentos (T_v 0,3; β 0,3) | 304,62 | 24,43 | 0,70 | 17,45 | 4,60 % | L29, L28, L240-L248 |
| Motion | ejemplo de la documentación `{ bounce: 0.3, duration: 0.8 }` | 151,28 | 17,22 | 0,70 | 12,30 | 4,60 % | findSpring (cálculo propio) |
| Android View | `SpringForce` por omisión | 1 500 | 38,73 | 0,5 | 38,73 | 16,30 % | L44, L64 |
| Compose | `spring()` por omisión | 1 500 | 77,46 | 1 | 38,73 | 0 | AnimationSpec.kt L876-L878 |
| Material 3 estándar | espacial por omisión / rápido / lento | 700 / 1 400 / 300 | 47,62 / 67,35 / 31,18 | 0,9 | 26,46 / 37,42 / 17,32 | 0,15 % | StandardMotionTokens L20-L29 |
| Material 3 expresivo | espacial por omisión / rápido / lento | 380 / 800 / 200 | 31,19 / 33,94 / 22,63 | 0,8 / 0,6 / 0,8 | 19,49 / 28,28 / 14,14 | 1,52 % / 9,48 % / 1,52 % | ExpressiveMotionTokens L22-L31 |
| Material 3 | efectos por omisión | 1 600 | 80,00 | 1 | 40 | 0 | L22-L23 |
| react-spring | `default` | 170 | 26 | 0,997 | 13,04 | ≈ 0 | constants.ts L3 |
| react-spring | `gentle` / `wobbly` / `stiff` | 120 / 180 / 210 | 14 / 12 / 20 | 0,639 / 0,447 / 0,690 | 10,95 / 13,42 / 14,49 | 7,35 % / 20,79 % / 5,00 % | L4-L6 |
| react-spring | `slow` / `molasses` | 280 | 60 / 120 | 1,79 / 3,59 | 16,73 | 0 | L7-L8 |
| Android | `STIFFNESS_HIGH` con ζ 0,5 | 10 000 | 100 | 0,5 | 100 | 16,30 % | L40 |

**Tiempos de asentamiento** (cálculo propio; escalón unitario con v₀ = 0; t_s(ε) es el último instante con |x − x_obj| > ε):

| Resorte | 2 % | 1 % | 0,1 % |
|---|---|---|---|
| `.smooth` (ζ 1) | 0,464 s | 0,528 s | 0,735 s |
| `.snappy` (ζ 0,85) | 0,333 s | 0,355 s | 0,697 s |
| `.bouncy` (ζ 0,7) | 0,476 s | 0,523 s | 0,819 s |

- Crítico: e^(−u)(1 + u) = ε con u = ω₀t da u = 5,834 (2 %), 6,638 (1 %) y 9,2334 (0,1 %). El último coincide con el «`u ≈ 9.2334134764516`» del plan 033 de Motion. Por eso `Spring(duration: 0.5, bounce: 0).settlingDuration`, que usa ε = 0,001, vale ≈ 0,735 s, y la «duración» de 0,5 s se parece más al asentamiento al 1 % (0,528 s). A t = d, al resorte crítico le falta el 1,36 % del recorrido.
- Motion por omisión (ζ 0,5; ω₀ 10) en 100 px: entra en la banda de 0,5 px (restDelta) a los 0,917 s.
- Core Animation (k 100, m 1): Apple dice «approximately 2.85 seconds» con b = 5 y «just over 1 second» con b = 15. Con el criterio de la envolvente A·e^(−ζω₀t) y un umbral de 0,5/640 de la distancia salen 2,88 s y 1,01 s; con ε = 0,001 sobre la curva, 2,69 s y 0,80 s. **El criterio exacto de Apple es NO CONFIRMADO**: la página solo debe decir «unos 2,85 s según Apple».

**Sobrepaso y asentamiento al 2 % frente a ζ** (ω₀ fija; cálculo propio):

| ζ | 0,2 | 0,3 | 0,5 | 0,6 | 0,7 | 0,75 | 0,8 | 0,85 | 0,9 | 1 | 1,5 | 2 | 3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sobrepaso | 52,66 % | 37,23 % | 16,30 % | 9,48 % | 4,60 % | 2,84 % | 1,52 % | 0,63 % | 0,15 % | 0 | 0 | 0 | 0 |
| ω₀·t_s(2 %) | 19,60 | 11,23 | 8,08 | 5,94 | 5,98 | 5,74 | **3,76** | 4,19 | 4,70 | 5,83 | 10,65 | 14,88 | 22,98 |

**Interrupción** (cálculo propio; tarjeta de 0 a 300 px con `.smooth`, que a los 0,2 s se redirige a 0):
- A los 0,2 s: x = 214,62 px y v = +767,5 px/s (la rapidez máxima, 1 386,9 px/s, se alcanza a 1/ω₀ = 0,0796 s).
- Resorte redirigido: conserva x y v, sigue 6,3 px más (hasta 220,92 px) durante 17,6 ms y vuelve. La aceleración salta de −5 806 a −53 181 px/s²: es un salto finito, así que la posición y la velocidad son continuas.
- Curva ease-in-out de 0,5 s reiniciada desde 214,62 px: su pendiente inicial es 0, así que la velocidad salta de +767,5 px/s a 0 en un cuadro. En la gráfica de x(t) se ve como una esquina.

**Integración numérica** (cálculo propio; u₀ = −1, v₀ = 0, horizonte 1 s, error máximo frente a la solución analítica, en fracción de la amplitud):

| Resorte | 60 Hz | 120 Hz | 1 000 Hz (react-spring) | 4 800 Hz (Tema 5) |
|---|---|---|---|---|
| `.bouncy` (ω₀Δt a 60 Hz = 0,209) | 7,9 % | 3,9 % | 0,46 % | 0,096 % |
| Motion por omisión | 7,0 % | 3,5 % | 0,41 % | 0,085 % |
| Motion scale → 0 (crítico, k 550) | 13 % | 6,3 % | 0,73 % | 0,15 % |
| Android HIGH, ζ 0,5 (ω₀ = 100) | **diverge** | 44 % | 4,1 % | 0,85 % |
| Prueba de Motion k = 10⁶, b = 10⁷ | diverge | diverge | diverge | diverge |

- Estabilidad de Euler semi-implícito con m = 1 (cálculo propio): la matriz del paso tiene det = 1 − bΔt y traza = 2 − kΔt² − bΔt; es estable si bΔt < 2 y (ω₀Δt)² < 4 − 2bΔt, o sea ω₀Δt < 2(√(1+ζ²) − ζ): 2 con ζ = 0; 1,236 con ζ = 0,5; 0,828 con ζ = 1. A 60 Hz, Android HIGH tiene ω₀Δt = 1,67 > 1,236.
- Euler explícito sin amortiguamiento (k = 157,91) multiplica la energía por 391 888 en 5 s a 60 Hz; el semi-implícito la mantiene en 0,976 de la inicial.
- Comprobación de energía: dE/dt = −b v² se cumple numéricamente (−17,7193 frente a −17,7193; Motion por omisión a 0,3 s).

---

## 5. La física en 4 pasos (formato de la casa)

Convención: x es la posición del elemento en su eje (px o m, da igual), x_obj es el destino, u = x − x_obj es el desplazamiento respecto del equilibrio y v = ẋ. Ecuaciones propuestas con numeración (10.n).

### Paso 1. Modelo simple: Hooke sin amortiguar
- Segunda ley con la fuerza de Hooke de clase (M2, T02, C04): `m\ddot u = -k\,u` **(10.1)**, es decir a = −(k/m)u, la misma aceleración variable de la clase («No corresponde usar MRUA»).
- Solución: `u(t) = A\cos(\omega_0 t + \varphi)`, con `\omega_0 = \sqrt{k/m}` y `T_0 = 2\pi/\omega_0` **(10.2)**. Si se suelta desde u₀ con v₀ = 0: u = u₀ cos ω₀t.
- Energía (M2, T04, C03-C04): `E = \tfrac12 m v^2 + \tfrac12 k u^2` es constante.
- Puente con la interfaz: con rebote 1, SwiftUI da «exactly the behavior of a cosine wave … the duration corresponds exactly to the period of the curve» (WWDC23, 715-749 s), así que d = T₀ = 2π/ω₀. Es el origen de `stiffness = (2π ÷ duration)^2`.
- **Por qué no basta:** el elemento nunca se detiene. Apple: «oscillates forever without slowing down, and never actually reaches its target position» (731-734 s); Android exige ζ > 0 para `skipToEnd`. Además, en el máximo (u = ±A) la velocidad es cero pero la fuerza no: es la regla C mal planteada de la SPAA 02 del curso.

### Paso 2. Lo que falta: amortiguamiento viscoso
- Fuerza de amortiguamiento −b v (Serway; OpenStax 15.23): `m\ddot u + b\,\dot u + k\,u = 0` **(10.3)**.
- Razón de amortiguamiento y valor crítico: `\zeta = \dfrac{b}{2\sqrt{k m}}`, `b_c = 2\sqrt{k m}` **(10.4)**. Es la `c = 2√(km)` que ya usa el laboratorio del Tema 5 (`criticalDamping`) y la fórmula literal de UIKit.
- Balance de energía (M2, T04, C05, Δ(K + U) = W_otras): al derivar E y usar (10.3) queda `\dfrac{dE}{dt} = -b\,v^2 \le 0` **(10.5)** (cálculo propio, comprobado numéricamente). La energía elástica se pierde a ritmo b v²: así «termina» el movimiento.
- Solución con poco amortiguamiento (OpenStax 15.24, 15.26): `u(t) = A_0 e^{-\zeta\omega_0 t}\cos(\omega_d t + \varphi)`, con `\omega_d = \omega_0\sqrt{1-\zeta^2}`. Es el «damped cosine» que describe Apple (791-807 s): un coseno por una exponencial.
- **Por qué no basta todavía:** no dice qué pasa con mucho amortiguamiento ni con qué ζ conviene animar, y supone que se parte del reposo. En una interfaz se parte a menudo con velocidad (un gesto, una animación interrumpida).

### Paso 3. Los tres regímenes con condiciones iniciales generales (lo que está en el código)
Con u₀ = x₀ − x_obj y v₀ cualesquiera **(10.6)**:
- **Subamortiguado** (ζ < 1): `u(t) = e^{-\zeta\omega_0 t}\left[u_0\cos\omega_d t + \dfrac{v_0 + \zeta\omega_0 u_0}{\omega_d}\sin\omega_d t\right]`. En Motion: `s.target - c.env * (c.A * c.sin + s.delta * c.cos)`, con `s.delta` = −u₀ y `s.velocity` = −v₀ (L311-L312, L375, L392); el signo se cancela y es la misma expresión (cálculo propio).
- **Crítico** (ζ = 1): `u(t) = e^{-\omega_0 t}\left[u_0 + (v_0 + \omega_0 u_0)\,t\right]`. En Motion, L401-L404; en Android, `(coeffA + coeffB * deltaT) * Math.pow(Math.E, -mNaturalFreq * deltaT)`.
- **Sobreamortiguado** (ζ > 1): `u(t) = C_1 e^{r_1 t} + C_2 e^{r_2 t}`, con `r_{1,2} = -\zeta\omega_0 \pm \omega_0\sqrt{\zeta^2-1}`, `C_2 = \dfrac{v_0 - r_1 u_0}{r_2 - r_1}` y `C_1 = u_0 - C_2`. En Motion, «the sum of a slow and a fast decaying exponential» (L415-L422).
- **Evidencia:** con estas tres fórmulas reproduzco número por número las tres pruebas de Motion (`[100, 1343, 873, …]`, `[100, 635, 918, …]`, `[100, 499, 731, …]`; cálculo propio).
- **Sobrepaso** (ζ < 1, v₀ = 0): el primer máximo está en `t_p = \pi/\omega_d`, y vale `M_p = e^{-\zeta\pi/\sqrt{1-\zeta^2}}` **(10.7)** (cálculo propio: se evalúa (10.6) en t_p). Para `.bouncy`: 4,60 % a 0,350 s.
- **Asentamiento:** con la envolvente, `t_s(\varepsilon) \approx \dfrac{1}{\zeta\omega_0}\ln\dfrac{1}{\varepsilon\sqrt{1-\zeta^2}}` **(10.8)** para ζ < 1; para ζ = 1, e^(−u)(1 + u) = ε con u = ω₀t_s. Dependen de ζ, de ω₀, de v₀ y de ε: **no hay una duración**.
- **Crítico, el más rápido sin rebasar.** OpenStax: «moves the system to a new equilibrium position in the shortest time possible without overshooting». Matiz (cálculo propio, tabla §4): si se tolera un sobrepaso menor que la banda, ζ ≈ 0,8 entra en el 2 % antes (3,76/ω₀ frente a 5,83/ω₀). Por eso las bibliotecas usan ζ entre 0,8 y 0,9 (Material 3 estándar 0,9; SwiftUI `.snappy` 0,85) y Apple dice que un rebote del 15 % «feels a little more brisk». La frase de Android, «within the shortest amount of time», es imprecisa sin el «sin rebasar».
- **Qué cuesta (para el `<Why>`):** elegir ε y umbrales; que cada propiedad termine en su tiempo («Don't we want all animations to start and stop at the same time? The answer is no!»); y que k, m y b sean ficticios («There isn't a real object with mass or a spring with stiffness here»).

### Paso 4. Modelo mejorado (dentro del tema): lo que hace una biblioteca real
Cuatro añadidos, todos con fuente:
1. **Estado inicial heredado e interrupción.** Al cambiar el destino en t*, el resorte reinicia (10.6) con `u_0 \leftarrow x(t^*) - x_{\text{nuevo}}`, `v_0 \leftarrow \dot x(t^*)` **(10.9)**. Así x y v son continuas y solo salta la aceleración, una cantidad finita. En el código: Motion `velocity: value.getVelocity()` y `retarget`; Android, `animateToFinalPosition` con dos medios pasos; SwiftUI, «preserving velocity from one animation to the next». El gesto entrega su velocidad del mismo modo (UIKit `initialVelocity` normalizada; Android `VelocityTracker` → `setStartVelocity`). Una curva con duración no tiene dónde poner v₀: comete la regla B de la SPAA 02 («su velocidad se vuelve cero»).
2. **Parametrización perceptual.** `k = m\left(\dfrac{2\pi}{d}\right)^2,\quad b = \dfrac{4\pi m\,(1-\beta)}{d}` **(10.10)**, con d la «duración perceptual» y β el rebote. Es la misma física con otros dos números (Apple; react-spring con `frequency` y `damping`; Motion con `visualDuration`, ω₀ = 2π/(1,2 T_v)). Motion además resuelve con Newton el ω₀ que deja el 0,1 % del recorrido a los T segundos, a cambio de descartar la velocidad heredada.
3. **Criterio de reposo:** `|v| \le v_{\text{rep}} \;\wedge\; |x - x_{\text{obj}}| \le \delta \Rightarrow x \leftarrow x_{\text{obj}},\ v \leftarrow 0` **(10.11)**. Motion usa 2 px/s y 0,5 px (0,01 y 0,005 si |Δ| < 5); Android usa v_rep = 62,5 s⁻¹ · δ («≥ 1 frame»); react-spring usa δ = mín(1; 0,001|Δ|) y v_rep = δ/10.
4. **Analítica frente a numérica.** Euler semi-implícito (el del Tema 5 y react-spring): `v_{n+1} = v_n + a_n\,\Delta t,\quad x_{n+1} = x_n + v_{n+1}\Delta t` **(10.12)**, estable solo si `\omega_0\Delta t < 2(\sqrt{1+\zeta^2}-\zeta)` (cálculo propio). A 60 Hz el error es del 7-13 % para resortes de interfaz y un resorte rígido diverge. La solución analítica de Motion y de Android es exacta a cualquier frecuencia de pantalla (60 o 120 Hz) y se puede muestrear en cualquier t («The spring can be sampled in a non-linear fashion», documentación de Motion). Ese muestreo permite la línea de tiempo arrastrable del laboratorio. A cambio, tiene sus propias trampas numéricas (#1207).

---

## 6. Por qué rigidez y amortiguamiento en vez de una duración: lo que se gana y lo que cuesta

| Aspecto | Con duración + curva (ease-in-out) | Con resorte (k, b, m) | Cita |
|---|---|---|---|
| (a) Interrumpir y redirigir | Reinicia con pendiente 0: salto de velocidad (+767,5 → 0 px/s en el ejemplo) | Conserva x y v (10.9) | WWDC23 900-910 s; Compose «guarantees the continuity of velocity»; Motion L48, L463-L478 |
| (b) Entregar la velocidad de un gesto | «no way to represent an initial velocity» | v₀ entra en (10.6) | WWDC23 315-342 s; UIKit `initialVelocity`; Android `setStartVelocity` |
| (c) Final | Se detiene de golpe al cumplirse la duración | Cola exponencial «no single point when the object is abruptly done» | WWDC23 422-425 s |
| (d) Una sola configuración | Cada distancia o punto de partida pide otra curva o una tabla | Tres números sirven para cualquier distancia y estado inicial | Motion: «incorporate the velocity of any existing gestures or animations for natural feedback» |
| (e) Duración conocida | Exacta: sirve para coordinar y para CSS | No hay: depende de ζ, ω₀, v₀ y ε («a bit unpredictable») | WWDC23 1011-1029 s; Core Animation `settlingDuration` |
| (f) Ajustar a ojo | Duración y curva son intuitivas | m, k, b «not very intuitive» → hace falta convertir (10.10) | WWDC23 573-594 s |
| (g) Fin y pruebas | `done` en t = T | Umbrales empíricos (10.11); las pruebas muestrean (`animateSync`) o esperan el reposo | Motion L339-L340; `spring.test.ts` |
| (h) Cómputo | Curva de Bézier barata, ejecutable por el compositor | Solución analítica por cuadro, o Euler con pasos finos (1 ms en react-spring); trampas numéricas | react-spring L310; Motion #1207, 14.1.1, 12.35.2 |
| (i) El término medio | — | Resorte por duración: tiempo exacto y CSS, pero ignora la velocidad | Motion docs: «so it doesn't incorporate velocity, but it's easier to understand» |

---

## 7. Conexiones con el sitio y con la clase

- **Tema 5 (control háptico):** es la conexión más fuerte, porque es el mismo oscilador. El laboratorio del gatillo ya integra `m ẍ = −k x − c ẋ` al soltar la palanca, con c crítico o 0,3 del crítico, m = 20 g y Euler semi-implícito a 1/4 800 s (`triggerScene.ts` L33-L44, L61, L97-L100; `spring.ts` `dampedSpringStep`, `criticalDamping`, `isAtRest`). El Tema 10 puede reutilizar ese núcleo y añadirle la solución analítica (10.6). Los tres vectores de prueba de Motion sirven como oráculo de las pruebas unitarias. Frase posible: «el gatillo del Tema 5 vuelve al reposo con el mismo resorte con el que iOS vuelve una tarjeta a su sitio».
- **Tema 7 (restitución):** hay tres puentes genuinos. (1) Si un contacto se modela como resorte con amortiguador, su «e» ingenuo es exp(−ζπ/√(1−ζ²)): **el mismo número que el sobrepaso (10.7)** (cálculo propio). Schwager y Pöschel (2007) muestran que para un contacto real la fórmula es incorrecta, porque a t = π/ω la fuerza ya sería atractiva y un contacto no puede tirar. Un resorte de interfaz sí puede tirar: ahí la fórmula es exacta. (2) Box2D v3.2.0 modela el contacto como un resorte blando con `contactHertz = 30` y `contactDampingRatio = 10`. (3) La opción `bounce` de react-spring multiplica la velocidad por −e al llegar al destino: es la ley de Newton de la restitución aplicada a una animación. El Tema 5 ya dice «Con el Tema 7: veo un choque como un resorte breve»; el Tema 10 cierra ese triángulo.
- **Tema 8 (ruedas de reacción):** la investigación del Tema 8 dice que 42 (NASA) usa «control PD». Un PD, τ = −K_p θ − K_d ω, es un resorte de torsión amortiguado. Las ganancias de 42 no las verifiqué en esta nota (NO CONFIRMADO): para usar la conexión hay que citar la línea del Tema 8.
- **Tema 1 (dron):** el texto del Tema 1 dice que el dron «se pasa del punto y oscila». Es el comportamiento subamortiguado de un lazo de control. Es una conexión cualitativa: vale solo como frase.
- **Clase:** Hooke y aceleración variable (M2 T02 C04); energía elástica (M2 T04 C03); trabajo no conservativo (M2 T04 C05), que se conecta con (10.5); SPAA 02, reglas B y C. No hay un módulo de oscilaciones, así que la oscilación amortiguada es una extensión (§3.7).

---

## 8. Diseño de la simulación (recurso SIMULACIÓN INTERACTIVA)

Requisitos de la casa (memoria «simulations must be rich»): transporte (reproducir, pausar, paso a paso, reiniciar), línea de tiempo, panel de ajustes y presets, no solo deslizadores. Referencias de estructura: `BounceLab` (Tema 7) y `TriggerLab` con `useTriggerRelease` (Tema 5).

**Vista principal: «la hoja» o «la tarjeta».**
- Un elemento de interfaz reconocible (una hoja inferior o una tarjeta) que se desliza entre dos destinos, con un «fantasma» tenue en el destino, como la perilla de la WWDC23 (884 s). Al lado, un carril gemelo con la **curva de duración fija** (CSS `ease-in-out` = `cubic-bezier(0.42, 0, 0.58, 1)`, 0,5 s) para comparar.
- Gráfica x(t) sincronizada: destino, banda ±ε, marca del sobrepaso (M_p, t_p) y de t_s. Pestañas para v(t) (donde se ve el salto de velocidad del carril de duración) y E(t) = ½mv² + ½ku², que decrece según (10.5).
- Lecturas: ζ, ω₀, ω_d, régimen (ficha «subamortiguado / crítico / sobreamortiguado»), sobrepaso previsto (10.7) y medido, t_s previsto y medido, y la «duración perceptual» d = 2π/ω₀ y el rebote 1 − ζ equivalentes.

**Controles:**
- k (N/m), b (N·s/m) y m (kg), con una marca en b_c = 2√(km) que se mueve al cambiar k o m. Un interruptor «modo perceptual» cambia los deslizadores a d y rebote y muestra en vivo k y b según (10.10): la misma física con otros dos números.
- Distancia del recorrido y velocidad inicial v₀.
- **Interrumpir:** un botón «cambiar de destino» o un clic en el carril a mitad de camino. El resorte sigue con su velocidad (10.9) y la curva reinicia desde v = 0. Lectura del salto Δv en el instante de la interrupción.
- **Arrastrar y soltar:** se arrastra la tarjeta y la velocidad al soltar se convierte en v₀ (en px/s y normalizada como en UIKit).
- **Integrador:** analítico frente a Euler semi-implícito a 60 Hz, 120 Hz o 1 kHz, con el error en vivo y aviso de inestabilidad cuando ω₀Δt supera 2(√(1+ζ²) − ζ).
- Respetar `prefers-reduced-motion`, como el resto del sitio.

**Presets** (todos con m = 1 kg; detalle y estado de cada número en §4):

| Preset | k | b | ζ | Qué enseña | Estado |
|---|---|---|---|---|---|
| SwiftUI `.smooth` | 157,91 | 25,13 | 1 | El crítico «por omisión» de Apple | rebote base CONFIRMADO; d = 0,5 inferida; k y b cálculo propio |
| SwiftUI `.snappy` | 157,91 | 21,36 | 0,85 | Casi sin rebote pero más vivo (0,63 %) | ídem |
| SwiftUI `.bouncy` | 157,91 | 17,59 | 0,70 | Rebote visible (4,6 %) | CONFIRMADO (ejemplo de Apple) |
| Motion por omisión = Core Animation por omisión | 100 | 10 | 0,5 | 16 % de sobrepaso | CONFIRMADO (código y documentación) |
| Motion, `x`/`y` por omisión | 500 | 25 | 0,56 | Lo que recibe `<motion.div animate={{ x }}>` | CONFIRMADO |
| Motion, `scale` hacia 0 | 550 | 46,90 | 1 | Crítico escrito en el código para no invertir la escala | CONFIRMADO (fórmula); valor cálculo propio |
| Material 3 estándar, espacial | 700 | 47,62 | 0,9 | Interfaz «utilitaria» | CONFIRMADO (tokens) |
| Material 3 expresivo, espacial rápido | 800 | 33,94 | 0,6 | Interfaz «expresiva» (9,5 %) | CONFIRMADO (tokens) |
| react-spring `molasses` | 280 | 120 | 3,59 | Sobreamortiguado: lento sin rebasar | CONFIRMADO |
| Sin amortiguar | 157,91 | 0 | 0 | Paso 1: coseno de período d = 0,5 s; nunca termina | Apple (rebote 1) y Motion (`damping: 0`) |
| Core Animation, ejemplo de `settlingDuration` | 100 | 5 | 0,25 | «approximately 2.85 seconds» | CONFIRMADO (texto de Apple) |
| «Se siente mal»: rígido con Euler a 60 Hz | 10 000 | 100 | 0,5 | Android HIGH con integrador ingenuo: diverge | constantes CONFIRMADAS; divergencia cálculo propio |
| «Se siente mal»: rebote 0,6 | 157,91 | 10,05 | 0,4 | Más allá del «around 0.4» de Apple: 25 % de sobrepaso | WWDC23 1282 s; cálculo propio |

**Escala de tiempo:** las animaciones de interfaz duran de 0,2 a 1 s, así que se puede reproducir a ×1 (a diferencia del gatillo del Tema 5, que necesitaba ×10 más lento). Conviene ofrecer ×0,25 para ver el sobrepaso de los resortes rígidos.

---

## 9. Riesgos y advertencias

- **Documentación de Motion frente a su código.** La página `spring` dice `stiffness` 1, `bounce` 0,25, `restSpeed` 0,1 y `restDelta` 0,01; el código v14.14.0 dice 100, 0,3, 2 y 0,5 (con variantes «granular»). **Citar el código con tag y línea.**
- **Motion cambia rápido.** v14.14.0 es del 2026-11-13. Entre la v12 y la v14 se reescribió la estructura del archivo, el rebote negativo entró en la 13.5.0 y `visualDuration` hereda velocidad desde la 14.12.0. Fijar siempre el tag; las líneas de la v12.43.0 no sirven para la v14.
- **«Framer Motion» y «Motion».** El nombre actual es Motion (README L57; blog del 2024-11-12). El paquete `framer-motion` sigue publicándose con la misma versión. En la página: «Motion (antes Framer Motion)».
- **La diapositiva de conversión de la WWDC23 tiene una errata** (§3.3) que se copia en sitios de terceros. Usar b = 4π(1 − β)/d, verificada con el ejemplo de la documentación. La rama de rebote negativo de Apple es NO CONFIRMADO.
- **`.smooth`, `.snappy` y `.bouncy` a 0,5 s** es una inferencia del valor por omisión de las funciones ajustables; el rebote base sí está escrito. **`response` = 2π/ω₀** es la lectura habitual, no una frase de Apple.
- **El código de Apple es cerrado.** No se puede citar una línea de SwiftUI, UIKit ni Core Animation; solo la documentación, la WWDC y los ejemplos numéricos.
- **El criterio exacto de `settlingDuration` de Core Animation** no está publicado. Decir «unos 2,85 s según Apple», no «2,85 s exactos».
- **`UISpringTimingParameters()` con ζ = 4,56**: el dato está documentado pero sin explicación. No usarlo.
- **«Crítico = el más rápido»** solo es cierto «sin rebasar». Con tolerancia, ζ ≈ 0,8 llega antes a la banda del 2 %. La frase de Android y la de OpenStax («as quickly as possible») hay que leerlas con ese matiz.
- **El sobrepaso (10.7) supone v₀ = 0.** Con velocidad inicial (gesto o interrupción) el sobrepaso cambia; la simulación debe medirlo, no solo predecirlo.
- **Unidades ficticias.** «There isn't a real object with mass or a spring with stiffness here» (Apple). En la página: m = 1 kg por convención de las bibliotecas; k y b no dependen de la unidad de longitud (§4). Decir «N/m» es correcto, pero no implica un resorte real.
- **Nombres que engañan:** `damping` es b en Apple y en Motion, pero ζ en react-spring; los tokens de Material 3 `…Damping` son ζ; `friction` es b; `tension` es k. La tabla de notación del principio debería pasar a la página como nota.
- **Notación de la casa:** Serway y OpenStax usan b; el Tema 5 escribió c (`c = 2√(km)`). Decisión pendiente (§10).
- **Sin Laplace ni funciones de transferencia.** El sobrepaso y el asentamiento salen de la solución temporal (10.6) evaluada en t_p y de la envolvente. «Tiempo de asentamiento» y «sobrepaso» son vocabulario de control, pero aquí se definen solo con lo del paso 3.
- **OpenStax** pide no usar el libro para entrenar modelos. Citar y enlazar está bien; no reproducir párrafos largos.
- **npm:** las descargas semanales (69,6 M de `framer-motion`) no son usuarios. Usarlas como orden de magnitud y con la fecha.
- **Material 3:** solo los tokens del código están verificados; la página m3.material.io no se pudo leer. No atribuir a Material frases que no estén en el código.
- **No hay un módulo de oscilaciones** en el curso a la fecha (5, 7 y 8 dan 404; el 6 es fluidos). El callout de clase debe apoyarse en Hooke, la energía elástica y el trabajo no conservativo del Módulo 2, y declarar la oscilación amortiguada como extensión.
- **No rebajar el alcance:** la consigna pide los tres regímenes **y** el porqué de rigidez y amortiguamiento frente a la duración. La demostración de interrupción y la de entrega de velocidad del gesto son el corazón del porqué: no dejarlas fuera.

---

## 10. Decisiones para Dylan

1. **Caso principal:** Motion con el código fijado (recomendado) o Apple como producto principal y Motion como evidencia de código. La consigna nombra a los dos.
2. **Símbolo del coeficiente:** b (Serway, OpenStax; recomendado por la regla de notación de libro) o c (lo que usa el Tema 5). Si se elige b, ¿se ajusta el Tema 5 por coherencia?
3. **Contraste en la página:** Android y Material 3 (k y ζ, analítico, tokens estándar frente a expresivos) o react-spring (Euler a 1 ms y el puente `bounce` → Tema 7). Se pueden usar ambos, uno como callout.
4. **Presets:** ¿se aceptan los de SwiftUI con d = 0,5 s inferida y declarada, o solo `.bouncy`, que coincide con el ejemplo literal de Apple?
5. **Integrador del laboratorio:** solo analítico (como Motion y Android), o analítico con un modo Euler a 60/120 Hz para enseñar el error y la divergencia. El segundo reutiliza el núcleo del Tema 5.
6. **Conexión con el Tema 7 por el sobrepaso igual a la restitución ingenua** (con la advertencia de Schwager y Pöschel): ¿entra como callout o solo como frase en Conexiones?
7. **Elemento animado de la escena:** hoja inferior, tarjeta o interruptor (el ejemplo de la WWDC). No hay un color con significado físico; usar la paleta neutra del sitio.

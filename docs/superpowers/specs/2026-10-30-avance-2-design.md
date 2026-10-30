# Portafolio de Física I — Avance 2 (Temas 6 a 9)

Diseño aprobado por Dylan en la conversación del 30 de octubre de 2026. Entrega: sábado
31 de octubre de 2026, 23:59, en Moodle, con la URL del sitio y la del repositorio. El tiempo
ordena el trabajo; no recorta alcance, calidad ni diseño.

Consigna: `C:\Users\dylan\Downloads\Portafolio - Avance 2.docx.pdf` (fuera de git; en WSL,
`/mnt/c/Users/dylan/Downloads/`). Investigación verificada (fuentes, números, código fijado a
commit, trampas): `docs/superpowers/research/2026-10-30-*.md`. Material de clase (local, no se
publica): `.reference/class-material/`, con el Módulo 4 de Gravitación extraído el 30 de
octubre (`04-gravitacion.md`) y la cobertura de los Temas 6 a 9 en `00-indice.md`.

## 1. Objetivo

Al terminar, el sitio tiene las nueve entradas: los cinco temas del Avance 1, que se vuelven a
evaluar, y los Temas 6 a 9, con el mismo formato y la misma calidad que los primeros. Cada tema
nuevo cumple los dos elementos obligatorios de la consigna (caso de uso con caso concreto,
ecuación explícita y justificación frente a alternativas no físicas; recurso del tipo
prescrito) y apunta a la banda Excelente de la rúbrica: casos profundos y citados con un balance
de qué se gana y qué cuesta modelar la física, recursos con datos reales bien citados,
simulaciones sólidas y diagramas propios, y conexiones explícitas entre temas y con la clase.

## 2. Decisiones de Dylan (30 de octubre)

1. **Casos de uso:** Tema 6, FASTSim (NLR, antes NREL); Tema 7, Box2D v3; Tema 8, el simulador
   42 de NASA Goddard, con Kepler/K2, Hubble y JWST como misiones; Tema 9, el diseño de
   trayectorias de JPL (Minovitch 1961, Flandro 1966) y JPL Horizons.
2. **Tablas de datos en todos los temas.** Los Temas 6 a 9 nacen con un componente de tabla;
   al final, ya integrados los nuevos, los datos de los Temas 1 a 5 pasan a tablas y sus
   leyendas se recortan (Dylan relee esos temas).
3. **Conexiones recíprocas:** los Temas 1 a 5 ganan una frase hacia los temas nuevos donde el
   vínculo es real (§4.7).
4. **Sin datos medidos de Argonne (D3)** por ahora: la gráfica del Tema 6 usa ciclo y
   coeficientes reales de la EPA con el reparto regenerativo modelado, y lo declara. Dylan
   intentará la descarga desde su navegador; si aparece la potencia de batería medida, se
   superpone sin rehacer nada.
5. **Cada tema nuevo lleva su laboratorio**, también los de visualización y diagrama, como los
   Temas 1, 3, 4 y 5.

## 3. Reglas que siguen vigentes

Las del handoff del Avance 1 (`docs/superpowers/handoff/2026-10-10-avance-1-handoff.md`,
"Decisiones vigentes"), en particular:

- Notación de libro de texto (Serway, Sears-Zemansky): g = 9,81 m/s², decimales con coma en la
  prosa, fuerza normal `n`, momento angular `L` (42 lo llama `H`: se aclara en el caso de uso).
  Los literales de código se citan tal cual, con punto.
- Estructura por pasos: al menos 3 `Step` (aquí, 4), cada uno con su ecuación numerada, un
  `Why` con `fenomeno` y `ecuacion`, y su figura en vertical, a lo ancho de la columna.
- Prosa ≤ 650 palabras por tema. Con las tablas, cada leyenda vuelve a ser de dos o tres
  frases: qué muestra la figura y cómo leerla; los parámetros viven en la tabla.
- Una sola insignia de recurso por tema (la figura del recurso prescrito); el resto pasa
  `showBadge={false}`.
- Voz en primera persona en los textos y en las líneas de fuente de las figuras.
- Colores con significado real (§4.3), nunca por orden de serie.
- Simuladores ricos: reloj, línea de tiempo, lecturas, preajustes, panel de ajustes local y
  global, atajos de teclado, manipulación directa con alternativa de teclado; la velocidad de
  reproducción se indica en la página cuando no es real.
- Cada número sale de una fuente abierta y verificada o es "(cálculo propio)" reproducible por
  código con pruebas. Lo NO CONFIRMADO en la investigación no se afirma.
- Los Temas 10 a 13 siguen sin existir en el sitio: ni nombre, ni enlace, ni página. La
  Entrega Final queda como sección con la insignia "Se publica con su consigna".
- Commits en inglés, formato convencional, solo con la identidad de Dylan, sin línea de
  coautor. No se toca el servidor de desarrollo del puerto 4321.

## 4. Cambios transversales

### 4.1 Consigna

`src/consigna.ts` suma, en la fase 2, con los títulos exactos de la consigna:

| # | slug | título | shortTitle |
|---|---|---|---|
| 6 | `frenado-regenerativo` | Frenado regenerativo en un vehículo eléctrico | Frenado regenerativo |
| 7 | `coeficiente-restitucion` | El coeficiente de restitución en un motor de videojuego: por qué la pelota rebota mal | Coeficiente de restitución |
| 8 | `ruedas-reaccion` | Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada | Ruedas de reacción |
| 9 | `asistencia-gravitatoria` | Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible | Asistencia gravitatoria |

Con temas, la fase 2 deja de ser futura: la portada y la barra lateral muestran el Avance 2 con
sus cuatro temas (`groupByPhase` ya lo resuelve); solo la Entrega Final conserva la insignia.
Anterior y siguiente enlazan del Tema 5 al 6 y del 9 a ninguno.

### 4.2 Tabla de datos (`src/components/ui/DataTable.astro`)

- En el MDX se escribe `<DataTable id="…" />`. La tabla vive en un registro tipado por tema
  (`src/lib/tables/topics/<slug>.ts`): `caption` (título), `columns` (`key`, `label`, `unit`
  opcional, `align` `'text' | 'num'`, `precision` obligatoria en las numéricas), `rows`
  (números o textos) y `source` (`{ text }`, como en `Figure`). El registro es la única fuente
  de la tabla para la página, el tiempo de lectura y "Copiar Markdown".
- Se numera por tema como las figuras ("Tabla 6.1") y se puede citar en la prosa.
- HTML semántico: `<table>` con `<caption>`, `<th scope="col">` con la unidad entre paréntesis,
  primera columna como `<th scope="row">` cuando nombra la fila. Números con `formatNumber`
  (coma decimal, con la `precision` de su columna: la precisión es la del dato, así que las
  tablas no siguen el ajuste global de decimales), alineados a la derecha con cifras tabulares.
- En móvil la tabla se desplaza dentro de su contenedor (`overflow-x: auto`, región con
  `role="region"`, `aria-label` y `tabindex="0"` solo cuando desborda), nunca la página.
- Estilo de la casa: mismo marco que `Figure`, filetes finos, sin cebra, tipografía de las
  leyendas; legible en ambos temas.
- Tiempo de lectura (`src/lib/readingTime.ts`): cuentan `caption`, las etiquetas de columna y
  las celdas de texto; no las celdas numéricas. "Copiar Markdown" exporta la tabla como tabla
  Markdown.
- Los valores calculados (balances, saltos, maniobras) salen de código con pruebas
  (`src/lib/data/*` o el núcleo), no se teclean a mano en el MDX; los datos copiados de una
  fuente (hojas de datos, normas) viven en `src/lib/data/*` con su fuente.
- Pruebas: unitarias del formateo y del conteo de lectura, e2e de desborde en móvil y axe.

### 4.3 Colores con significado (`src/styles/tokens.css`)

Tokens nuevos, con variante oscura y ≥ 3:1 contra `--bg-elevated` en ambos temas (ampliar
`tokens.test.ts`):

- `--sun` ámbar; `--jupiter` ocre; `--saturn` arena; `--uranus` cian pálido; `--neptune` azul
  intenso. La Tierra y las líneas de su campo B usan `--chart-1` (azul), como en el Tema 2.
- `--tennis` amarillo verdoso (ITF: "White or Yellow"); `--basketball` naranja (FIBA: "a single
  shade of orange").
- Energía del Tema 6: lo devuelto a la batería en verde (`--chart-3`), el calor de la fricción
  en un rojo anaranjado (`--chart-2`), la tracción y la carga en carretera en tonos que no
  compitan con esos dos; la leyenda de la figura nombra cada color.

### 4.4 Núcleo de física (`src/lib/physics/`)

Módulos puros, sin DOM, con pruebas unitarias y cobertura en el umbral del proyecto (≥ 80 %
en `src/lib/**`; la práctica del Avance 1 fue ≈ 98 %). Firmas orientativas; el implementador
las ajusta al estilo de los módulos existentes (`circular.ts`, `spring.ts`, `projectile.ts`):

- `energy.ts` (Tema 6): `roadLoadForce(v, {A, B, C})`, `wheelPower(m, v0, v1, dt, coeffs)`
  con la velocidad media del intervalo, `cycleBalance(cycle, vehicle, regen)` que devuelve las
  series acumuladas (tracción, carga en carretera, frenado en ruedas, batería, fricción) y los
  totales; `regen` con `eta`, `pMax` y el desvanecimiento a baja velocidad `f(v)` de FASTSim.
  Conversión imperial → SI con 0,44704 m/s por mph y 4,448 22 N por lbf.
- `collision.ts` (Tema 7): `bounceSeries(h0, e, g)` (alturas, velocidades, tiempos y
  T = t₀(1+e)/(1−e)); `collide1D(m1, v1, m2, v2, e)` con momento y ΔK; un paso de motor
  `engineStep(state, params, dt)` con Euler semi-implícito, detección por penetración, impulso
  `j = −m_ef (v_n + e v_n⁻)`, umbral, regla de combinación y Baumgarte opcional; el tope de
  Poisson (`J_r ≤ e J_c`); `e(v)` lineal ilustrativo.
- `rotation.ts` (Tema 8): intercambio `I_s Δω_s = −I_w Δω_w`; maniobra de reposo a reposo
  `τ = 4 I_s θ / T²` con sus perfiles θ_s(t), ω_s(t), ω_w(t), L_w(t); límites (`T_min` por
  torque y por momento); acumulación `L_w = ∫ τ_ext dt` con saturación en `L_max`; descarga a
  ritmo `τ_dump`.
- `gravitation.ts` (Tema 9): `gravityForce`, `potentialEnergy`, energía específica y vis-viva,
  rapidez de escape; sobrevuelo hiperbólico (`e = 1 + r_p v∞²/GM`, `sin(δ/2) = 1/e`); cambio
  de marco `v = V_p + v_rel` con el lado de paso; `|Δv| = 2 v∞ sin(δ/2)`; esfera de influencia.

### 4.5 Datos reproducibles

Mismo patrón que `scripts/generate-drone-route.ts` → `src/data/drone-route.json`:

- `scripts/generate-drive-cycles.ts` → `src/data/drive-cycles.json` (`pnpm run data:cycles`):
  descarga UDDS, HWFET y US06 de la página de la EPA, registra URL y fecha, guarda t (s) y v
  (m/s, convertida). Los coeficientes y la masa del vehículo (Test Car List 2025, registro
  `3R124-782214`, prueba `RTSL10086702`; y el Nissan LEAF 2025 `KWB115`, que usa un preajuste de §6) viven en `src/lib/data/evModels.ts` con su fuente, en unidades EPA y convertidos por
  código.
- `scripts/generate-voyager-speed.ts` → `src/data/voyager-speed.json`
  (`pnpm run data:voyager`): consulta la API de Horizons con los parámetros de la §4 de la
  investigación (heliocéntrico `500@10`, vectores, serie base cada 5 días para la V2 de
  1977-08-21 a 1990-01-01 y la V1 de 1977-09-06 a 1982-01-01, ventanas de 1 h ±5 días en cada
  encuentro), y guarda la consulta, la fecha, la línea `source:` de la cabecera, `GM_sun` y
  por punto [JD_TDB − 2 443 000, |v| en km/s con 3 decimales, r en UA con 4]. Objetivo
  ≈ 70 KB. El prototipo de la investigación
  (`…/scratchpad/research/data/proto-voyager-speed.json`) sirve de referencia, no se copia.
- Ambos JSON se validan con zod al importarse y tienen pruebas: forma, unidades y los hechos que
  la página afirma (saltos con su signo, ε_☉ < 0 antes de Júpiter y > 0 después, 3,13 UA/año al
  final; duración y distancia del UDDS: 1369 s y 11,99 km).

### 4.6 Pruebas de extremo a extremo

- `tests/e2e/site-pages.spec.ts`: páginas esperadas = portada, 404 y los nueve temas; la guarda
  de nombres retirados conserva solo los Temas 10 a 13 (`spring-animations`,
  `sintesis-sonido`, `resonancia-tacoma`, `enfriamiento-datacenter`; "Spring animations",
  "Síntesis de sonido", "Tacoma", "Enfriamiento líquido"); solo "Entrega Final" es fase futura.
- Una especificación por tema nuevo, como `gravedad-artificial.spec.ts`: la figura del recurso
  prescrito con su insignia y su fuente, el laboratorio (reproducir termina al final sin
  repetir, arrastrar o mover un control cambia una lectura, ajustes con teclado), tablas
  visibles y sin desborde de página en 360 px.
- Las suites que recorren todas las páginas (axe, móvil, consola, enlaces, navegación) cubren
  los temas nuevos sin cambios o con la lista ampliada.

### 4.7 Conexiones recíprocas y tablas en los Temas 1 a 5 (al final)

Una frase por tema, solo donde el vínculo es real, y el tema nuevo entra en su `related`:

- Tema 1 (dron) → Tema 6: un ciclo de conducción es un perfil de velocidad como el del dron, y
  cada frenada quita ½ m v².
- Tema 2 (salto) → Tema 7: entre rebotes la pelota hace el lanzamiento vertical de la (2.1), y el
  motor la integra con el mismo Euler semi-implícito.
- Tema 3 (hábitat) → Tema 8: para hacer girar un hábitat hay que darle momento angular; desde
  dentro, el resto de la nave giraría al revés.
- Tema 4 (llantas) → Tema 6: el agarre limita la desaceleración, regenerativa o de fricción.
- Tema 5 (háptico) → Tema 7: un choque es un resorte breve; lo que no devuelve es la energía que
  e < 1 se lleva.

`updated` de esos temas pasa a la fecha del cambio. Después, sus datos de leyenda pasan a
`DataTable` y cada leyenda queda en dos o tres frases, sin perder ningún número ni salvedad ya
verificado. Dylan relee los cinco.

### 4.8 Documentación

README (tabla de temas y estado), handoff nuevo `docs/superpowers/handoff/2026-10-31-avance-2-handoff.md`
(reemplaza al del Avance 1 como punto de partida) y el puntero de `CLAUDE.md`.

## 5. Recordatorio del formato de un tema

Frontmatter (`number`, `phase: 2`, `title`, `shortTitle`, `concept`, `resourceType`,
`useCase`, `sources` con `id` estable, `related` ≥ 2 y solo temas del sitio, `classRefs` ≥ 1,
`updated`); resumen de dos frases; Pasos 1 a 4; `UseCase` con `caso`, `ecuacion`,
`justificacion` y `balance` (dos a cuatro frases cada uno); `Callout variant="clase"`;
`Connections`; `Sources`. Ecuaciones numeradas (6.1), (6.2)…; figuras y tablas numeradas por
tema. Referencia de forma: `src/content/topics/gravedad-artificial.mdx` y
`salto-personaje.mdx`.

## 6. Tema 6 · Frenado regenerativo en un vehículo eléctrico

- **Concepto (consigna):** trabajo, energía cinética y transformación de energía; cuánta de la
  energía del frenado se recupera y cuánta se disipa. **Recurso:** visualización de datos.
- **Caso:** FASTSim v3.1.0 (`NatLabRockies/fastsim`, Apache-2.0; "NLR, antes NREL"), líneas
  citadas en la investigación (§2): potencia en ruedas por paso con ΔK/Δt más rodadura y aire;
  al frenar, regeneración limitada por `min(P_motor, P_carga_batería)`, por η y por f(v); la
  fricción absorbe el resto. Alternativa citada en el balance: el control del dinamómetro de
  40 CFR 1066.210 (A + Bv + Cv² + M_e dv/dt). Vehículo: Tesla Model 3 Long Range RWD 2025
  (ETW 4250 lb = 1927,77 kg; A = 27,02 lbf, B = 0,2873 lbf/mph, C = 0,012 20 lbf/mph²).
  Ciclo principal: UDDS (1369 s, 11,99 km).
- **Paso 1 · Frenar es quitar energía cinética.** (6.1) `W_neto = ΔK = ½ m v_f² − ½ m v_i²`.
  Detenerse desde 50 km/h: 185,9 kJ; en el UDDS, 1,124 kWh de K quitados en desaceleraciones.
  Figura sin insignia: K(t) del auto en los primeros 200 s del UDDS, con la caída de cada
  frenada marcada.
- **Paso 2 · Por qué no basta: el aire y la rodadura también frenan.** (6.2)
  `F_RL = A + Bv + Cv²`, `P_rueda = m v dv/dt + F_RL v`. De 1,124 kWh, 0,255 los disipa la
  carga en carretera y 0,869 exigen freno (77,3 %); en HWFET solo pasa por los frenos el 45,6 %.
  Figura sin insignia: F_RL(v) con sus tres términos, coeficientes reales de la EPA.
- **Paso 3 · Qué falta: el motor recupera con límites.** (6.3)
  `P_regen = min(f(v) P_freno, P_máx)`, `E_batería = Σ η P_regen Δt`, `E_fricción = Σ (P_freno − P_regen) Δt`.
  η de 0,70 a 0,87 (Boretti, LEAF); el límite de carga baja con frío y SOC alto. Figura sin
  insignia: potencia en una frenada del UDDS, con el área regenerada y la de fricción.
- **Paso 4 · El balance del ciclo.** (6.4) las sumas segundo a segundo y la fracción recuperada
  `E_batería / E_tracción`.
  - **Recurso prescrito (insignia):** arriba v(t) del UDDS; abajo, las energías acumuladas
    (tracción, carga en carretera, frenado en ruedas, batería, pérdidas de conversión (1 − η) y
    calor de fricción: lo disipado es la suma de las dos últimas), con el marcador
    sincronizado. Línea de fuente: "Ciclo UDDS y coeficientes de carga: EPA (datos reales);
    reparto regenerativo/fricción: cálculo propio con el modelo y los parámetros de FASTSim".
  - **Tablas:** el vehículo (masa, A, B, C en EPA y en SI); el balance UDDS / HWFET / US06
    (tracción, frenado, ΔK, batería, fracción; potencia de frenado máxima, desaceleración
    máxima). Siempre con el denominador explícito (pitfall 5). Las cifras del sitio son las que
    calcula su propio modelo mejorado, el de FASTSim (η constante 0,80, P_máx 239 kW y el
    desvanecimiento f(v) a baja velocidad activo): 40,4 % en UDDS, 12,5 % en HWFET y 30,7 % en
    US06 de la tracción vuelve a la batería (sin f(v) la fricción sería nula y el modelo no mostraría
    cuánto se disipa; ese caso, 43,5 %, solo sirve de contraste en el paso 3). La
    cadena completa de FASTSim de la investigación (43,9 %, 13,6 %, 34,5 %) se menciona solo como
    contraste.
  - **Laboratorio (sin insignia):** reproduce un ciclo con el auto en movimiento y el flujo de
    potencia en vivo (batería ↔ motor ↔ ruedas ↔ frenos, grosor proporcional), barras
    acumuladas y la gráfica de energía con cursor arrastrable. Parámetros: η, P_máx; ajustes:
    ciclo (UDDS, HWFET, US06), f(v) sí/no, velocidad, repetir. Preajustes: Model 3 en ciudad,
    en carretera, agresivo; batería fría o llena (P_máx 10 kW: 0,448 kWh); Nissan LEAF 2025
    (`KWB115`: ETW 3875 lb, A = 25,89 lbf, B = 0,3449 lbf/mph, C = 0,019 45 lbf/mph²). Lecturas: v, P en ruedas, E_batería, E_fricción, % de la
    tracción recuperado. La reproducción va acelerada (`TIME_LAPSE`, indicado en la página).
- **Caso de uso:** justificación frente a la constante "recupera X %" (12,5 % a 40,4 % según el
  ciclo) y frente a una tabla de autonomía; balance: se gana una autonomía que responde al ciclo,
  al auto y a la batería; cuesta conocer A, B, C, η y los límites, y el modelo no ve frío ni SOC
  salvo que se los den. Coherencia con los MPGe de la EPA solo como indicio (NO CONFIRMADO).
- **Clase:** Módulo 2, Tema 03 C05 (teorema trabajo–energía, ejemplo "Distancia de frenado") y
  Tema 04 C05 (trabajo no conservativo y balance); la potencia y la eficiencia son extensión.
- **Conexiones (`related`):** `llantas-f1`, `dron-reparto`, `coeficiente-restitucion`.
- **Trampas:** las 12 de la §8 de la investigación (ETW, coeficientes "Target", unidades,
  "frenado" ≠ "ΔK quitado", denominador, regeneración modelada, dinamómetro ≠ calle, WLTC
  NO CONFIRMADO, NLR/NREL).

## 7. Tema 7 · El coeficiente de restitución en un motor de videojuego

- **Concepto (consigna):** colisiones elásticas e inelásticas, conservación del momento lineal
  y coeficiente de restitución. **Recurso:** simulación interactiva (control de e sobre una
  pelota que rebota; rebote realista frente a uno que se siente mal).
- **Caso:** Box2D v3 (Erin Catto, MIT): v3.1.1 (commit `8c66146`) para el impulso
  `impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity )`; v3.2.0 (commit
  `178495b`) para el tope de Poisson ("guarantees no energy gain"); `restitutionThreshold` de
  1 m/s, mezcla `max`, orden Solve → IntegratePositions → Relax → Restitution. No se afirma que
  Angry Birds use Box2D ni cifras de Rocket League (NO CONFIRMADO).
- **Paso 1 · Un rebote contra el piso.** (7.1) `e = −v_y′/v_y = √(h′/h)`, `h_n = e^{2n} h_0`.
  Figura sin insignia: y(t) de la pelota de tenis ITF (e = 0,745, h₀ = 2,54 m).
- **Paso 2 · Choque entre dos cuerpos.** (7.2) momento lineal y ley de Newton de la restitución,
  `v_1′`, `v_2′`, y `ΔK = −½ μ (1 − e²) v_rel²`; el piso es m₂ → ∞. Figura sin insignia: antes y
  después de un choque con e = 0, 0,75 y 1 (momento igual, energía no).
- **Paso 3 · Por qué rebota mal.** (7.3) `T = t_0 (1+e)/(1−e)` (infinitos rebotes en tiempo
  finito) y lo que hace el motor: `j = −m_ef (v_n + e v_n⁻)`, `e_ef = 0` si `|v_n⁻| ≤ v_th`,
  `N = ⌊ln(v_0/v_th)/ln(1/e)⌋ + 1`. Figura sin insignia: h_n frente a n en escala logarítmica,
  ideal frente a umbral de 1 m/s (Box2D) y 2 m/s (Unity, parada en seco tras 18,5 cm).
  Tabla: umbral y regla de combinación por motor (Box2D, Unity 3D, PhysX, Unity 2D, Bullet,
  Jolt, Godot), con su fuente.
- **Paso 4 · Un rebote que se siente bien.** (7.4) tope de Poisson `J_r ≤ e J_c` y e(v)
  (Cross 1999; ajuste lineal ilustrativo, marcado como tal).
  - **Recurso prescrito (insignia): laboratorio del rebote.** Dos pelotas en paralelo, mismo
    h₀: "Física ideal" (eventos exactos) y "Motor de juego" (Δt, subpasos, umbral, combinación,
    Baumgarte opcional). Control principal: e (0 a 1,2, zona > 1 marcada). Gráficas
    sincronizadas y(t) y E(t) (escalones de 1 − e²; ganancias marcadas). Lecturas: e efectivo
    medido √(h′/h), rebotes, T frente a t₀(1+e)/(1−e), energía. Modo "Choque de dos cuerpos"
    (m₁, m₂, v₁, v₂, e): p antes y después, ΔK y ΔK/K_CM = 1 − e². Transporte completo, cámara
    lenta en ajustes, atajos de teclado.
  - **Preajustes** (tabla §7 de la investigación): realistas (tenis ITF 0,745; básquet FIBA
    0,767; fútbol FIFA 0,851; superbola 0,86; béisbol 0,49; plastilina 0; Box2D por defecto) y
    "se siente mal" (e = 1 sin umbral; e = 1,1; e = 0,2; umbral alto de Unity; choque de
    reglas de combinación; pocos fps con Baumgarte), más "realista mejorado" con e(v).
  - **Tabla:** e de pelotas reales desde sus normas (altura de caída, rebote admitido, e
    calculado).
- **Caso de uso:** frente a una animación de rebote guionizada o una tabla precalculada: un
  número por forma da rebotes coherentes con cualquier altura, masa y pila de cuerpos y conserva
  el momento; cuesta el umbral (paradas en seco), la mezcla (e es del par, no del material), la
  dependencia de Δt, el túnel sin CCD y una pasada extra del solver.
- **Clase:** Módulo 3, Tema 02 C01–C05 (e, choques en 1D y 2D, ejemplo "Choque elástico de
  masas distintas"); el bote contra el piso y la serie de alturas son extensión.
- **Conexiones (`related`):** `salto-personaje`, `control-haptico`, `asistencia-gravitatoria`.
- **Colores:** pelota de tenis `--tennis`, balón de básquet `--basketball`; ideal frente a
  motor con un par neutro coherente con el sitio.

## 8. Tema 8 · Ruedas de reacción

- **Concepto (consigna):** conservación del momento angular y torque. **Recurso:** diagrama
  propio del satélite y su rueda, con el intercambio de momento angular, las ecuaciones sobre el
  dibujo y qué ocurre cuando la rueda llega a su velocidad máxima.
- **Caso:** 42 (NASA GSFC, Eric Stoneking; NASA Open Source Agreement 1.3; commit `df4fbdf5`):
  `Hdot = Trq` (rueda), `−Trq` sobre la nave, `if (W->Trq > 0.0 && W->H >= W->Hmax) W->Trq = 0.0`,
  `τ = m × B` y la ley de descarga `Mcmd = Kunl·(H × B)`. Misiones: Kepler (4 ruedas; fallas del
  14 de julio de 2012 y del 14 de mayo de 2013) → K2 (2 ruedas, presión solar, descarga cada
  2 días); Hubble (4 ruedas de 45 kg, hasta 3000 rpm, magnetopares; capacidad en N·m·s NO
  CONFIRMADA); JWST (6 ruedas, descarga con propulsores cada unas 6 semanas, aleta de momento).
- **Ejemplo numérico de todo el tema:** CubeSat 6U de 12 kg modelado como caja
  (I_s = 0,1852 kg·m²) con la rueda AAC Clyde RW400 (L_max = 0,050 N·m·s, τ_max = 8 mN·m,
  5000 rpm → I_w = 9,55·10⁻⁵ kg·m²), §6 de la investigación.
- **Paso 1 · Sistema aislado.** (8.1) `I_s ω_s + I_w ω_w = constante`, `I_s Δθ_s = −I_w Δθ_w`:
  unas 485 vueltas de la rueda por 90° de la nave. Figura sin insignia: nave y rueda girando en
  sentidos opuestos con L_s y L_w iguales y opuestos.
- **Paso 2 · El torque del motor.** (8.2) τ sobre la rueda y −τ sobre la nave;
  `τ = I α`, maniobra de reposo a reposo `τ = 4 I_s θ / T²`. Figura sin insignia: θ_s(t) en S y
  ω_w(t) en triángulo (pico de 970 rpm a 30 s); tabla de la maniobra.
- **Paso 3 · Por qué no basta: perturbación y saturación.** (8.3) `L_w = ∫ τ_ext dt`,
  `L_max = I_w ω_max`; gradiente de gravedad a 500 km ≤ 2,29·10⁻⁷ N·m: saturación en unos
  2,5 días como cota superior (no "cada 2,5 días"). Figura sin insignia: L_w(t) en rampa hasta
  L_max.
- **Paso 4 · Desaturar.** (8.4) `τ = m × B` (siempre ⊥ B) o `τ = r × F`; tres o cuatro ruedas
  para tres ejes y redundancia.
  - **Recurso prescrito (insignia): diagrama propio** en dos paneles, componente Astro en SVG
    al estilo de `HabitatDiagram.astro`. Panel A: nave en corte con la rueda, eje z, ω_w y ω_s
    opuestos, L_w y L_s iguales y opuestos, motor con τ y −τ (tercera ley), ecuaciones (8.1) y
    (8.2) anotadas, nota de las 485 vueltas. Panel B: medidor de L_w llegando a L_max (rojo),
    τ_ext entrando con `L_w = ∫ τ_ext dt`, el rótulo "en saturación el motor ya no puede acelerar
    la rueda: la nave deriva", y la descarga con B (azul, líneas de campo), m y `τ = m × B`;
    variante con propulsor `τ = r × F` (JWST, K2); recuadro de 3–4 ruedas (Kepler).
  - **Tablas:** dos ruedas reales (VECTRONIC VRW-D-4 y AAC Clyde RW400) y las misiones.
  - **Laboratorio (sin insignia):** vista de la nave y la rueda; se arrastra el ángulo objetivo
    (alternativa de teclado) y se elige T; la maniobra corre con θ_s, ω_w (rpm) y un medidor
    L_w/L_max; perturbación activable que llena la rueda (a cámara rápida, indicada) y descarga
    por magnetopar o propulsor con su umbral (80 % como elección de diseño, dicha así).
    Lecturas: θ_s, ω_s, ω_w, L_w, τ, % de L_max. Preajustes: 90° en 60 s, giro más rápido
    posible (≈ 12 s), día de perturbación con descarga. Aviso cuando T < T_min.
- **Caso de uso:** frente a "girar N grados durante t segundos" en lazo abierto o una tabla de
  ángulos: no ve la inercia real, ni los torques que se acumulan, ni la saturación (Dougherty
  1988: la saturación "would cause a loss of vehicle control"); balance: se gana apuntar sin
  propelente y con precisión; cuesta sensores, lazos de control, gestión de la saturación y un
  segundo actuador que intercambie momento con algo externo.
- **Clase:** Módulo 3, Tema 03 C02–C04 (torque, momento de inercia, τ = I α) y Tema 04 C01–C04
  (L = I ω, conservación, "Acercar dos masas al eje"); el intercambio entre dos cuerpos acoplados
  es extensión.
- **Conexiones (`related`):** `gravedad-artificial`, `asistencia-gravitatoria`,
  `control-haptico` (tercera ley: τ y −τ como fuerza del dedo y del gatillo).
- **Trampas:** §8 de la investigación (no usar los números demo de 42, no inventar la capacidad
  del Hubble, gradiente de gravedad como cota, ω de rueda relativa frente a inercial, paso por
  cero, notación L).

## 9. Tema 9 · Asistencia gravitatoria

- **Concepto (consigna):** gravitación universal, energía potencial gravitatoria y conservación
  del momento en el marco del planeta. **Recurso:** visualización de datos (rapidez de la sonda
  respecto al Sol contra el tiempo, con los saltos en cada encuentro, fuente citada).
- **Caso:** el diseño de trayectorias de JPL: memorando técnico 312-130 de M. A. Minovich
  (23 de agosto de 1961; "calculó en JPL", no "inventó"), Flandro (1966, *Astronautica Acta*,
  la oportunidad de 1978 a los cuatro gigantes) y JPL Horizons, que publica hoy la trayectoria.
  MONTE se menciona como software actual cerrado; GMAT no se cita (NO CONFIRMADO).
- **Paso 1 · Solo el Sol.** (9.1) `F = G M m / r²`, `U = −G M m / r`, `½ v² − G M_☉/r = ε`
  (vis-viva). Sin Júpiter, la V2 estaba ligada (a = 3,64 UA, afelio 6,29 UA) y habría vuelto.
  Figura sin insignia: v contra r entre Júpiter y Saturno siguiendo vis-viva (datos y curva).
- **Paso 2 · En el marco del planeta.** (9.2) `|v∞,in| = |v∞,out|`,
  `sin(δ/2) = 1/(1 + r_p v∞²/GM_p)`. V2 en Júpiter: v∞ = 7,6 km/s, r_p = 721 375 km,
  δ = 97,5°. Figura sin insignia: la hipérbola en el marco de Júpiter con v∞ entrando y saliendo.
- **Paso 3 · De vuelta al marco del Sol.** (9.3) `v = V_p + v_rel`, `|Δv| = 2 v∞ sin(δ/2)`,
  `m Δv = −M ΔV`: Júpiter retrocede 4,4·10⁻²¹ m/s. Figura sin insignia: triángulos de
  velocidades antes y después, Júpiter (+9,91 km/s) y Neptuno (−2,13 km/s, paso sobre el polo
  norte; el motivo Tritón solo si se confirma).
- **Paso 4 · Lo que muestran los datos.** (9.4) la integración de n cuerpos como modelo
  mejorado y la comparación cónicas frente a datos.
  - **Recurso prescrito (insignia):** |v| heliocéntrica de la V2 (y la V1, más tenue, hasta
    1981) de 1977 a 1990, con marcas en cada encuentro y su Δ|v| (+10,2 / +4,9 / +1,9 /
    −2,1 km/s, vis-viva), la curva de escape √(2GM_☉/r) en la posición de la sonda y la zona
    hiperbólica sombreada, la línea contrafactual "solo el Sol" desde 1979-01-01, y detalle
    horario de cada encuentro (pico y salto neto). Cursor sincronizado; segundo panel con r (UA)
    en el mismo eje de tiempo. Leyenda y fuente: "Datos: NASA/JPL Horizons, consultados el 30 de octubre de
    2026; trayectoria de diseño reconstruida hasta el 29 de agosto de 1989 y ajuste de 2022 a
    datos de seguimiento después". Nunca "medida" para el tramo de diseño.
  - **Tabla de encuentros:** fecha y hora UT, r_p, v∞ de entrada y salida, δ, Δ|v| por cónicas
    y por datos (Saturno V2 a 03:24 UT de Horizons, discrepancia con NASA declarada).
  - **Laboratorio (sin insignia):** sobrevuelo en el marco del planeta; r_p de 1 a 100 radios
    del planeta (escala logarítmica) y lado de paso (detrás o delante); la sonda recorre la
    hipérbola (cámara rápida indicada) y, al lado, el triángulo de velocidades en el marco del
    Sol. Lecturas: e, δ, |Δv|, |v| antes y después. Preajustes: V2 en Júpiter, Saturno, Urano y
    Neptuno; V1 en Júpiter (datos de la tabla). Lección: acercarse más no siempre da más (máximo
    cerca de 2 R_J para la V2) y el lado de paso decide ganar o perder.
- **Caso de uso:** frente a una trayectoria precalculada o una regla "el planeta suma Δv": no
  responde a llegar una hora tarde o 1000 km más cerca, ni explica que Neptuno restara 2,1 km/s;
  balance: se gana la gira de cuatro planetas con el combustible de uno; cuesta integrar n
  cuerpos, la sensibilidad a las condiciones de llegada, ventanas raras (≈ 175 años) y
  maniobras de corrección (24 estimadas para la V2 en el ajuste de 2022).
- **Clase:** Módulo 4, Tema 1 (gravitación universal) y Tema 3 (U = −GMm/r, rapidez de escape,
  E > 0 con la Voyager 1 como ejemplo); Módulo 3, Tema 02 (el sobrevuelo es un choque elástico,
  e = 1, en el marco del planeta). El cambio de marco y la hipérbola son extensión.
- **Conexiones (`related`):** `coeficiente-restitucion`, `ruedas-reaccion`,
  `gravedad-artificial`.
- **Colores:** `--jupiter`, `--saturn`, `--uranus`, `--neptune`, `--sun` (escape).
- **Trampas:** §9 de la investigación (diseño ≠ seguimiento, TDB frente a UT, pico ≠ salto, cómo
  medir el salto, Neptuno resta, errata de lanzamiento de la V1, firma "Minovich", GM del cuerpo
  frente al del sistema).

## 10. Pruebas y puerta

- Unitarias del núcleo (§4.4), de los datos (§4.5), de cada laboratorio (como
  `HabitatLab.test.tsx`), de `DataTable` y del conteo de lectura; cobertura ≥ 80 % en
  `src/lib/**` y `src/components/**`.
- Contenido: `src/content/topics.test.ts` ya exige un MDX por tema, ≥ 3 `Step`, un `Why` por
  paso y una sola insignia; se suma que cada `DataTable` tenga `caption` y `source`.
- E2E (§4.6) con axe en ambos temas y en móvil.
- Puerta antes de integrar a `main`:
  `pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run e2e`.
  Con trabajo en paralelo, cada worktree usa su propio puerto de e2e (4331 a 4334).

## 11. Orden de trabajo y revisión

1. **Base** (secuencial, en `avance-2`): §4.1 consigna con los cuatro temas y un MDX mínimo
   válido por tema (solo en la rama; nada se publica hasta el final), §4.2 `DataTable`, §4.3
   tokens, §4.6 guarda de páginas. Puerta verde.
2. **Los cuatro temas en paralelo**, cada uno en su worktree y rama `avance-2-tema-N` desde la
   base: núcleo y datos con pruebas → figuras y tablas → recurso prescrito → laboratorio →
   texto MDX → e2e. Implementador con modelo y esfuerzo altos (física, diseño y texto). Cada
   tema recibe revisión independiente (física, fuentes, diseño, accesibilidad, rúbrica), una
   ronda de correcciones y una re-revisión acotada.
3. **Integración** a `avance-2` (rebase y avance rápido, historia lineal), §4.7 conexiones y
   tablas en los Temas 1 a 5, §4.8 documentación.
4. **Revisión final** de toda la rama y puerta completa; capturas para Dylan.
5. **Lectura de Dylan** de los textos nuevos y de los cambios en los Temas 1 a 5.
6. **Integración a `main`** con avance rápido (`git push origin avance-2:main`), CI en verde y
   verificación de las páginas vivas antes de la fecha límite.

## 12. Riesgos

- **Tiempo:** el orden de §11 deja los cuatro temas completos el sábado temprano; si algo se
  difiere, se dice explícitamente y no se recorta en silencio.
- **Fuentes que cambian:** la API de Horizons o la página de la EPA podrían cambiar; los JSON se
  guardan en el repositorio con la consulta y la fecha, y los scripts quedan para reproducirlos.
- **Conflictos al integrar:** los temas tocan carpetas disjuntas; los archivos compartidos
  (consigna, tokens, guarda e2e, `DataTable`) se cierran en la base, antes del paralelo.
- **Exceso de texto:** las tablas absorben los datos; el presupuesto de 650 palabras de prosa y
  las leyendas de dos o tres frases se revisan en cada tema.

## 13. Fuera de alcance

- Los Temas 10 a 13 y cualquier mención de ellos.
- Correcciones del docente al Avance 1 (aún no publicadas); cuando lleguen, se tratan aparte.
- Datos medidos de Argonne (D3) mientras no estén disponibles (§2.4).

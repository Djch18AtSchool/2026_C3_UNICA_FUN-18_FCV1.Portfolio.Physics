# Textos de la Entrega Final para que Dylan los lea

Rama `entrega-final`. Cada tarea añade aquí su sección: toda frase nueva o cambiada que la página muestra o dice,
con su archivo y su línea, «antes» → «después» (una frase nueva tiene «antes» vacío, —). En el código, la línea que
lleva el texto; los `${…}` son valores que pone el componente.

## Medios con análisis (`AnalyzedMedia`, Task 2)

Textos de interfaz nuevos del componente compartido. Los dos primeros solo aparecen con un video o un audio alojados
(Temas 11 y 12); el tercero también lo oye quien usa un lector de pantalla en el Tema 5. Lo que se ve en el Tema 5 no
cambia.

1. `src/components/media/HostedPlayer.tsx:141-142`, línea bajo un medio que el navegador no puede reproducir (sin el
   códec, archivo ausente, sin red): — → «No se pudo reproducir el archivo en este navegador: descárgalo en
   `${formato}`.» (el enlace es «descárgalo en WebM» o «descárgalo en MP3» y baja el primer archivo).
2. `src/components/media/HostedPlayer.tsx:118`, línea de crédito de un medio alojado: — → «Video: `${credit}`» o
   «Audio: `${credit}`» (como la del Tema 5, «Video: PlayStation Access, 5 de agosto de 2021.»).
3. `src/components/media/AnalyzedMedia.tsx:145`, anuncio para el lector de pantalla al pulsar una marca (no se ve; la
   marca mueve el medio a su instante y lo reproduce, en YouTube y en los alojados, decisión R11): — → «Reproduciendo
   desde `${m:ss}`: `${título de la marca}`», por ejemplo «Reproduciendo desde 4:15: El arco: la tensión crece con el
   recorrido».

## Tarea F (Tema 7)

Corrección del profesor a la ecuación (7.3): la fórmula de $N$ debe excluir el impacto que cae exactamente en el
umbral. El código ya contaba solo los impactos estrictamente por encima; la página decía otra cosa.

1. `src/content/topics/coeficiente-restitucion.mdx:290`, ecuación (7.3), última línea: `N = ⌊ln(v₀/v_th) / ln(1/e)⌋ + 1`
   → `N = ⌈ln(v₀/v_th) / ln(1/e)⌉` (techo, sin el «+ 1»).
2. `src/content/topics/coeficiente-restitucion.mdx:312`, significado de $N$ en la tabla de símbolos: «rebotes antes de
   que el impacto, $e^n v_0$ con $v_0 = \sqrt{2gh_0}$, deje de superar el umbral» → «rebotes: impactos $e^n v_0$, con
   $v_0 = \sqrt{2gh_0}$, estrictamente por encima del umbral; uno que cae justo en $v_\text{th}$ no rebota».
3. `src/content/topics/coeficiente-restitucion.mdx:327`, `Why`, ranura `ecuacion`: añado al final «Con $v_0 = 4$ m/s,
   $v_\text{th} = 1$ m/s y $e = 0{,}5$, los impactos son de 4, 2 y 1 m/s; el tercero, justo en el umbral, no rebota:
   $N = 2$.» (antes: — ; la frase anterior, «… el umbral corta la serie en $N$ botes; con Box2D, 15.», no cambia).

Prosa del tema: 629 → 650 palabras (tope 650), tras acortar mi frase nueva en dos palabras.

## Tema 10

Página nueva, «Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion» (rama
`entrega-final-tema-10`, tarea 4). Todo es nuevo. Tres elecciones de Claude que se ven en el texto:

- La frecuencia angular amortiguada se escribe $\omega'$, como en el Tema 3 del Módulo 5 (y Sears–Zemansky): el
  Módulo 5 reserva $\omega_d$ para la frecuencia impulsora, que usará el Tema 12. La investigación escribía $\omega_d$.
- La curva de duración fija de la figura 10.4 es la `ease-in-out` de CSS, `cubic-bezier(0.42, 0, 0.58, 1)`, la única
  confirmada en la investigación; dura lo que el resorte tarda en asentarse al 2 % (0,26 s).
- En la tabla 10.1 el preajuste «Motion, posición x e y» se escribe «Motion, posición $x$ e $y$» (en el selector del
  laboratorio seguirá en texto plano, porque un `<option>` no admite fórmulas).

La lista va por archivo: la página (frontmatter, con las fuentes tal como salen en «Fuentes», y cuerpo), las figuras,
las tablas y los datos cuyos textos se ven por primera vez en las tablas de esta página.

### Página (`src/content/topics/animaciones-resorte.mdx`)

- `src/content/topics/animaciones-resorte.mdx:5`, título corto (nuevo): «Animaciones con resorte»
- `src/content/topics/animaciones-resorte.mdx:6`, concepto (nuevo): «Oscilador amortiguado: ley de Hooke, amortiguamiento viscoso, regímenes subamortiguado, crítico y sobreamortiguado, y por qué una interfaz anima con rigidez y amortiguamiento en vez de con una duración.»
- `src/content/topics/animaciones-resorte.mdx:9`, caso de uso, producto (nuevo): «Motion (antes Framer Motion) y las animaciones con resorte de Apple»
- `src/content/topics/animaciones-resorte.mdx:10`, caso de uso, industria (nuevo): «Interfaces de usuario y animación web»
- `src/content/topics/animaciones-resorte.mdx:13`, «Fuentes», título de motion-v14140 (nuevo): «Motion v14.14.0 (tag v14.14.0, commit f95ab94)»
- `src/content/topics/animaciones-resorte.mdx:14`, «Fuentes», autores de motion-v14140 (nuevo): «Matt Perry y colaboradores, Motion B.V.»
- `src/content/topics/animaciones-resorte.mdx:16`, «Fuentes», editorial o detalle de motion-v14140 (nuevo): «Repositorio motiondivision/motion en GitHub, licencia MIT; packages/motion-dom/src/animation: generators/spring.ts L22-L50, L240-L248, L305-L318, L335-L455 y L463-L490, utils/default-transitions.ts L4-L18, interfaces/motion-value.ts L48 y la prueba spring.test.ts L41-L121; CHANGELOG.md L106-L120»
- `src/content/topics/animaciones-resorte.mdx:20`, «Fuentes», título de motion-blog-2024 (nuevo): «Framer Motion is now independent, introducing Motion»
- `src/content/topics/animaciones-resorte.mdx:21`, «Fuentes», autores de motion-blog-2024 (nuevo): «Matt Perry»
- `src/content/topics/animaciones-resorte.mdx:23`, «Fuentes», editorial o detalle de motion-blog-2024 (nuevo): «Blog de motion.dev, 12 de noviembre de 2024»
- `src/content/topics/animaciones-resorte.mdx:27`, «Fuentes», título de motion-docs-spring (nuevo): «spring»
- `src/content/topics/animaciones-resorte.mdx:28`, «Fuentes», autores de motion-docs-spring (nuevo): «Motion»
- `src/content/topics/animaciones-resorte.mdx:29`, «Fuentes», editorial o detalle de motion-docs-spring (nuevo): «Documentación de Motion»
- `src/content/topics/animaciones-resorte.mdx:33`, «Fuentes», título de motion-docs-transitions (nuevo): «Transitions (React)»
- `src/content/topics/animaciones-resorte.mdx:34`, «Fuentes», autores de motion-docs-transitions (nuevo): «Motion»
- `src/content/topics/animaciones-resorte.mdx:35`, «Fuentes», editorial o detalle de motion-docs-transitions (nuevo): «Documentación de Motion»
- `src/content/topics/animaciones-resorte.mdx:39`, «Fuentes», título de wwdc23-springs (nuevo): «Animate with springs (sesión 10158)»
- `src/content/topics/animaciones-resorte.mdx:40`, «Fuentes», autores de wwdc23-springs (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:42`, «Fuentes», editorial o detalle de wwdc23-springs (nuevo): «WWDC23, Apple Developer; transcripción oficial de la página»
- `src/content/topics/animaciones-resorte.mdx:46`, «Fuentes», título de apple-spring (nuevo): «Spring (SwiftUI)»
- `src/content/topics/animaciones-resorte.mdx:47`, «Fuentes», autores de apple-spring (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:48`, «Fuentes», editorial o detalle de apple-spring (nuevo): «Apple Developer Documentation, iOS 17.0 y posteriores»
- `src/content/topics/animaciones-resorte.mdx:52`, «Fuentes», título de apple-animation-default (nuevo): «Animation.default (SwiftUI)»
- `src/content/topics/animaciones-resorte.mdx:53`, «Fuentes», autores de apple-animation-default (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:54`, «Fuentes», editorial o detalle de apple-animation-default (nuevo): «Apple Developer Documentation»
- `src/content/topics/animaciones-resorte.mdx:58`, «Fuentes», título de androidx (nuevo): «AndroidX (commit b192298)»
- `src/content/topics/animaciones-resorte.mdx:59`, «Fuentes», autores de androidx (nuevo): «The Android Open Source Project»
- `src/content/topics/animaciones-resorte.mdx:61`, «Fuentes», editorial o detalle de androidx (nuevo): «Repositorio androidx/androidx en GitHub, licencia Apache 2.0; compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens: MotionTokens.kt L24-L39, StandardMotionTokens.kt L20-L31 y ExpressiveMotionTokens.kt L22-L33»
- `src/content/topics/animaciones-resorte.mdx:65`, «Fuentes», título de react-spring-v1012 (nuevo): «react-spring v10.1.2 (tag v10.1.2, commit 59b1e53)»
- `src/content/topics/animaciones-resorte.mdx:66`, «Fuentes», autores de react-spring-v1012 (nuevo): «pmndrs»
- `src/content/topics/animaciones-resorte.mdx:67`, «Fuentes», editorial o detalle de react-spring-v1012 (nuevo): «Repositorio pmndrs/react-spring en GitHub, licencia MIT; packages/core/src/SpringValue.ts L310-L337»
- `src/content/topics/animaciones-resorte.mdx:71`, «Fuentes», título de css-easing-1 (nuevo): «CSS Easing Functions Level 1»
- `src/content/topics/animaciones-resorte.mdx:72`, «Fuentes», autores de css-easing-1 (nuevo): «W3C»
- `src/content/topics/animaciones-resorte.mdx:74`, «Fuentes», editorial o detalle de css-easing-1 (nuevo): «Candidate Recommendation Draft, 13 de febrero de 2023»
- `src/content/topics/animaciones-resorte.mdx:78`, «Fuentes», título de serway-jewett-2018 (nuevo): «Física para ciencias e ingeniería, Vol. 1, 10.ª edición»
- `src/content/topics/animaciones-resorte.mdx:79`, «Fuentes», autores de serway-jewett-2018 (nuevo): «Raymond A. Serway y John W. Jewett Jr.»
- `src/content/topics/animaciones-resorte.mdx:81`, «Fuentes», editorial o detalle de serway-jewett-2018 (nuevo): «Cengage Learning»
- `src/content/topics/animaciones-resorte.mdx:87`, «Con lo visto en clase», tema (nuevo): «Tema 1 · Ecuaciones Diferenciales y Movimiento Oscilatorio · Ecuación Diferencial del Movimiento Armónico Simple (MAS)»
- `src/content/topics/animaciones-resorte.mdx:88`, «Con lo visto en clase», nota (nuevo): «$m\,d^2x/dt^2 = -kx$ con $\omega = \sqrt{k/m}$ y $T = 2\pi\sqrt{m/k}$: las (10.1) y (10.2).»
- `src/content/topics/animaciones-resorte.mdx:90`, «Con lo visto en clase», tema (nuevo): «Tema 3 · Oscilaciones Amortiguadas Simples · Tres regímenes»
- `src/content/topics/animaciones-resorte.mdx:91`, «Con lo visto en clase», nota (nuevo): «La (10.3), $b_c = 2\sqrt{km}$ y $dE/dt = -b v_x^2$; su $\omega^\prime$ es el de la (10.6).»
- `src/content/topics/animaciones-resorte.mdx:93`, «Con lo visto en clase», tema (nuevo): «Tema 02 · Fricción y resortes · Concepto 04 · Fuerza elástica y ley de Hooke»
- `src/content/topics/animaciones-resorte.mdx:94`, «Con lo visto en clase», nota (nuevo): «$a_x = -(k/m)\,x$: una aceleración que cambia con la deformación, la de la (10.1).»
- `src/content/topics/animaciones-resorte.mdx:96`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 03 · Energía potencial elástica»
- `src/content/topics/animaciones-resorte.mdx:97`, «Con lo visto en clase», nota (nuevo): «$U_\text{el} = kx^2/2$: el segundo término de la $E$ de la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:99`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 05 · Trabajo no conservativo y balance de energía»
- `src/content/topics/animaciones-resorte.mdx:100`, «Con lo visto en clase», nota (nuevo): «$\Delta(K+U) = W_\text{otras}$: con la fuerza viscosa, la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:121`, introducción (nuevo): «Lo que se desliza o se abre en iOS y en Motion no sigue una curva dibujada a mano: sigue un resorte amortiguado, calculado en cada cuadro.»
- `src/content/topics/animaciones-resorte.mdx:123`, Paso 1, título (nuevo): «Un resorte sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:125`, Paso 1 (nuevo): «Llamo $u$ al desplazamiento del elemento respecto de su destino; con solo Hooke, su aceleración cambia con $u$.»
- `src/content/topics/animaciones-resorte.mdx:131`, Paso 1, leyenda de ecuación (nuevo): «posición del elemento en su eje»
- `src/content/topics/animaciones-resorte.mdx:132`, Paso 1, leyenda de ecuación (nuevo): «destino de la animación»
- `src/content/topics/animaciones-resorte.mdx:133`, Paso 1, leyenda de ecuación (nuevo): «masa; las bibliotecas usan 1 kg»
- `src/content/topics/animaciones-resorte.mdx:134`, Paso 1, leyenda de ecuación (nuevo): «rigidez del resorte»
- `src/content/topics/animaciones-resorte.mdx:142`, Paso 1, leyenda de ecuación (nuevo): «desplazamiento inicial, soltado desde el reposo»
- `src/content/topics/animaciones-resorte.mdx:143`, Paso 1, leyenda de ecuación (nuevo): «frecuencia angular natural»
- `src/content/topics/animaciones-resorte.mdx:144`, Paso 1, leyenda de ecuación (nuevo): «periodo»
- `src/content/topics/animaciones-resorte.mdx:152`, Paso 1, «En el fenómeno» (nuevo): «El elemento cruza el destino a su rapidez máxima y sigue de largo, porque nada le quita energía: «Springs with ˋdamping: 0ˋ will run forever» <Cite id="motion-docs-spring" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:158`, Paso 1, «En la ecuación» (nuevo): «Derivo dos veces la (10.2): <Equation inline latex="\ddot u = -\omega_0^2\,u" />, la (10.1). Con los valores por omisión de Motion, 100 N/m y 1 kg, <Equation inline latex="T_0" /> = 0,63 s.»
- `src/content/topics/animaciones-resorte.mdx:167`, Paso 1, pie de figura (nuevo): «Valor animado de 100 a 1 000 con $k$ = 100 N/m, $m$ = 1 kg y $b$ = 0. Es un coseno de periodo $T_0$ = 0,63 s: vuelve a 100 en cada periodo y nunca se queda en la banda de ±2 % del destino.»
- `src/content/topics/animaciones-resorte.mdx:169`, Paso 1, fuente de la figura (nuevo): «Gráfica que calculé con la (10.2); $k$ y $m$ por omisión de Motion v14.14.0 (spring.ts L22 y L24), con $b$ = 0»
- `src/content/topics/animaciones-resorte.mdx:177`, Paso 2, título (nuevo): «El amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:179`, Paso 2 (nuevo): «Le añado una fuerza opuesta a la velocidad, <Equation inline latex="-b\,\dot u" /> <Cite id="serway-jewett-2018" sources={frontmatter.sources} />. La razón $\zeta$ compara $b$ con el amortiguamiento crítico <Equation inline latex="b_c" />.»
- `src/content/topics/animaciones-resorte.mdx:184`, Paso 2, leyenda de ecuación (nuevo): «coeficiente de amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:191`, Paso 2, leyenda de ecuación (nuevo): «razón de amortiguamiento, adimensional»
- `src/content/topics/animaciones-resorte.mdx:192`, Paso 2, leyenda de ecuación (nuevo): «amortiguamiento crítico, el de $\zeta = 1$»
- `src/content/topics/animaciones-resorte.mdx:200`, Paso 2, leyenda de ecuación (nuevo): «energía mecánica del resorte»
- `src/content/topics/animaciones-resorte.mdx:201`, Paso 2, leyenda de ecuación (nuevo): «velocidad, $\dot u$»
- `src/content/topics/animaciones-resorte.mdx:209`, Paso 2, «En el fenómeno» (nuevo): «Cada vaivén es menor: la fuerza viscosa siempre frena, y el elemento acaba en una banda alrededor del destino.»
- `src/content/topics/animaciones-resorte.mdx:215`, Paso 2, «En la ecuación» (nuevo): «Con la (10.3), <Equation inline latex="\dot E = v\,(m\dot v + k u) = -b v^2" />. Si <Equation inline latex="\zeta < 1" />, <Equation inline latex="u = A_0 e^{-\zeta\omega_0 t}\cos(\omega' t + \phi)" /> con <Equation inline latex="\omega' = \omega_0\sqrt{1-\zeta^2}" />: un coseno por una exponencial, el «damped cosine» de Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:224`, Paso 2, pie de figura (nuevo): «Los valores por omisión de Motion, $k$ = 100 N/m, $b$ = 10 N·s/m y $m$ = 1 kg ($\zeta$ = 0,5), de 100 a 1 000. La curva queda entre las envolventes $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$, con $A_0 = |u_0|/\sqrt{1-\zeta^2}$, y entra para siempre en la banda de ±2 % a los 0,81 s.»
- `src/content/topics/animaciones-resorte.mdx:226`, Paso 2, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores por omisión de Motion v14.14.0 (spring.ts L22-L24)»
- `src/content/topics/animaciones-resorte.mdx:234`, Paso 3, título (nuevo): «Tres regímenes y ninguna duración»
- `src/content/topics/animaciones-resorte.mdx:236`, Paso 3 (nuevo): «Con cualquier <Equation inline latex="u_0" /> y <Equation inline latex="v_0" />, la (10.3) tiene tres soluciones según $\zeta$: las tres ramas del generador de Motion <Cite id="motion-v14140" sources={frontmatter.sources} />. Con ellas reproduzco, valor por valor, sus tres pruebas (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:242`, Paso 3, leyenda de ecuación (nuevo): «velocidad inicial, por ejemplo la de un gesto»
- `src/content/topics/animaciones-resorte.mdx:243`, Paso 3, leyenda de ecuación (nuevo): «frecuencia angular amortiguada»
- `src/content/topics/animaciones-resorte.mdx:246`, Paso 3, leyenda de ecuación (nuevo): «tasas de las dos exponenciales, una lenta y una rápida»
- `src/content/topics/animaciones-resorte.mdx:256`, Paso 3, leyenda de ecuación (nuevo): «instante del primer sobrepaso»
- `src/content/topics/animaciones-resorte.mdx:257`, Paso 3, leyenda de ecuación (nuevo): «sobrepaso, como fracción del recorrido»
- `src/content/topics/animaciones-resorte.mdx:267`, Paso 3, leyenda de ecuación (nuevo): «tiempo de asentamiento: desde ahí, $|u| \le \varepsilon\,|u_0|$»
- `src/content/topics/animaciones-resorte.mdx:270`, Paso 3, leyenda de ecuación (nuevo): «ancho de la banda de reposo, como fracción del recorrido»
- `src/content/topics/animaciones-resorte.mdx:278`, Paso 3, «En el fenómeno» (nuevo): «Con <Equation inline latex="\zeta < 1" /> el elemento se pasa y oscila; con <Equation inline latex="\zeta = 1" /> llega sin pasarse; con <Equation inline latex="\zeta > 1" />, sin pasarse pero más tarde. Ninguno termina en un instante preciso.»
- `src/content/topics/animaciones-resorte.mdx:284`, Paso 3, «En la ecuación» (nuevo): «La (10.7) es la (10.6) en el primer <Equation inline latex="v = 0" />; la (10.8), cuándo la envolvente cae a $\varepsilon$. El asentamiento depende de $\zeta$, <Equation inline latex="\omega_0" />, $\varepsilon$ y del estado inicial: no hay una duración. Con una banda del 2 %, <Equation inline latex="\zeta = 0{,}8" /> entra antes que el crítico (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:293`, Paso 3, pie de figura (nuevo): «Las tres pruebas del resorte de Motion, de 100 a 1 000 con $m$ = 1 kg: subamortiguada ($k$ = 300 N/m, $b$ = 10 N·s/m), crítica (100 y 20) y sobreamortiguada (300 y 100). Las curvas son la (10.6); los puntos, los valores que cada prueba espera cada 0,2 s, y coinciden al redondear.»
- `src/content/topics/animaciones-resorte.mdx:295`, Paso 3, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores esperados de la prueba spring.test.ts de Motion v14.14.0, L41-L121»
- `src/content/topics/animaciones-resorte.mdx:306`, Paso 4, título (nuevo): «Lo que hace una biblioteca real»
- `src/content/topics/animaciones-resorte.mdx:308`, Paso 4 (nuevo): «Si el destino cambia a mitad de camino, la biblioteca reinicia la (10.6) desde el estado actual; Motion pasa ˋvalue.getVelocity()ˋ a la animación nueva <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple cambió $m$, $k$ y $b$ («they're not very intuitive» <Cite id="wwdc23-springs" sources={frontmatter.sources} />) por una duración $d$ y un rebote $\beta$ <Cite id="apple-spring" sources={frontmatter.sources} />. Un umbral de reposo corta la cola.»
- `src/content/topics/animaciones-resorte.mdx:314`, Paso 4, leyenda de ecuación (nuevo): «instante en que cambia el destino»
- `src/content/topics/animaciones-resorte.mdx:315`, Paso 4, leyenda de ecuación (nuevo): «el destino nuevo»
- `src/content/topics/animaciones-resorte.mdx:323`, Paso 4, leyenda de ecuación (nuevo): «duración perceptual: $\omega_0 = 2\pi/d$»
- `src/content/topics/animaciones-resorte.mdx:326`, Paso 4, leyenda de ecuación (nuevo): «rebote: $\zeta = 1 - \beta$; 0 es crítico y 1, sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:335`, Paso 4, leyenda de ecuación (nuevo): «umbral de rapidez; Motion usa 2 px/s»
- `src/content/topics/animaciones-resorte.mdx:338`, Paso 4, leyenda de ecuación (nuevo): «umbral de distancia; Motion usa 0,5 px, «selected empirically»»
- `src/content/topics/animaciones-resorte.mdx:348`, Paso 4, «En el fenómeno» (nuevo): «Interrumpido, el resorte sigue con su velocidad y vuelve sin sacudida; una curva con duración arranca otra vez desde el reposo, y su velocidad cae a cero de golpe.»
- `src/content/topics/animaciones-resorte.mdx:354`, Paso 4, «En la ecuación» (nuevo): «Con la (10.9), $x$ y $v$ son continuas en <Equation inline latex="t^*" />; solo salta la aceleración, una cantidad finita por la (10.3). La (10.10) da <Equation inline latex="\omega_0 = 2\pi/d" /> y <Equation inline latex="\zeta = 1 - \beta" />: con 0,5 s y 0,3, los 157,9 N/m y 17,6 N·s/m de Apple (tabla 10.2).»
- `src/content/topics/animaciones-resorte.mdx:363`, Paso 4, pie de figura (nuevo): «La transición por omisión de Motion para una traslación ($k$ = 500 N/m, $b$ = 25 N·s/m) frente a una curva ease-in-out que dura 0,26 s, lo que tarda el resorte en asentarse al 2 %. A $t^*$ = 0,10 s el destino vuelve a 100. Arriba, la posición; abajo, la velocidad: la del resorte sigue en unos 6 680 px/s y la de la curva cae de 5 330 px/s a 0.»
- `src/content/topics/animaciones-resorte.mdx:365`, Paso 4, fuente de la figura (nuevo): «Gráfica que calculé con las (10.6) y (10.9); $k$ y $b$ de Motion v14.14.0 (default-transitions.ts L4-L9); curva ease-in-out, cubic-bezier(0.42, 0, 0.58, 1), de CSS Easing Functions Level 1 (W3C)»
- `src/content/topics/animaciones-resorte.mdx:393`, caso de uso, «El caso concreto» (nuevo): «Motion (antes Framer Motion, licencia MIT) anima interfaces web <Cite id="motion-blog-2024" sources={frontmatter.sources} />. Su generador ˋspringˋ (tag v14.14.0, commit ˋf95ab94ˋ) escribe las tres ramas de la (10.6) <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple explica el porqué en la WWDC23 <Cite id="wwdc23-springs" sources={frontmatter.sources} />; desde iOS 17, los resortes animan SwiftUI por omisión <Cite id="apple-animation-default" sources={frontmatter.sources} />. En Android, Material 3 pasó de duraciones con curvas de Bézier a tokens con $k$ y $\zeta$ <Cite id="androidx" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:399`, caso de uso, «La ecuación» (nuevo): «ˋreturn s.target - c.env * (c.A * c.sin + s.delta * c.cos)ˋ (L392) es la (10.6) si ˋs.deltaˋ vale <Equation inline latex="-u_0" /> y ˋs.velocityˋ, <Equation inline latex="-v_0" />. ˋdamping / (2 * Math.sqrt(stiffness * mass))ˋ (L314) es la (10.4), y la escala hacia 0 usa ˋ2 * Math.sqrt(550)ˋ: el crítico exacto, para que la escala no se vuelva negativa.»
- `src/content/topics/animaciones-resorte.mdx:405`, caso de uso, «Por qué modelar la física» (nuevo): «Una curva con duración «is just a prespecified curve, so there's no way to represent an initial velocity» <Cite id="wwdc23-springs" sources={frontmatter.sources} />. El resorte acepta cualquier distancia y cualquier <Equation inline latex="v_0" />: un gesto o una animación interrumpida entregan su velocidad sin salto (figura 10.4). Con curvas haría falta una por caso.»
- `src/content/topics/animaciones-resorte.mdx:411`, caso de uso, «Qué se gana y qué cuesta» (nuevo): «Gano continuidad de velocidad con solo tres números, $m$, $k$ y $b$. Cuesta no tener duración («a bit unpredictable», dice Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />), umbrales empíricos, parámetros sin objeto real y trampas numéricas: la 14.7.0 corrigió sobreamortiguados que saltaban al destino <Cite id="motion-v14140" sources={frontmatter.sources} />. Los resortes por duración de Motion terminan a tiempo, pero ignoran la velocidad heredada <Cite id="motion-docs-transitions" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:417`, recuadro de clase, título (nuevo): «Módulo 5 · Temas 1 y 3; Módulo 2 · Temas 02 y 04, y SPAA 02»
- `src/content/topics/animaciones-resorte.mdx:419`, recuadro «Visto en clase» (nuevo): «El Módulo 5 escribe la (10.2), la (10.3), <Equation inline latex="b_c = 2\sqrt{km}" /> y la (10.5); su envolvente <Equation inline latex="e^{-(b/2m)t}" /> es la de la (10.6), porque <Equation inline latex="\zeta\omega_0 = b/2m" />. El Módulo 2 da Hooke («No corresponde usar MRUA») y la energía elástica <Equation inline latex="\tfrac12 k x^2" />. La regla B de su SPAA 02, «su velocidad se vuelve cero», es el error de la curva con duración. $\zeta$, la (10.6) completa y las (10.7) a (10.11) son extensiones.»
- `src/content/topics/animaciones-resorte.mdx:425`, «Conexiones» (nuevo): «Con el Tema 5: el mismo oscilador devuelve el gatillo al reposo, crítico o a 0,3 del crítico, con $c$ en lugar de $b$. Con el Tema 7: ˋbounceˋ de react-spring invierte la velocidad en el destino y la escala, como una restitución <Cite id="react-spring-v1012" sources={frontmatter.sources} />. Con el Tema 12: el mismo oscilador, forzado a su frecuencia natural.»

### Figuras 10.1 a 10.4 (`src/components/topics/animaciones-resorte/SpringFigure.tsx`)

- `src/components/topics/animaciones-resorte/SpringFigure.tsx:48`, rótulo en la gráfica (nuevo): «$x_\text{obj}$ ± ${PERCENT}»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:102`, rótulo en la gráfica (nuevo): «$T_0$ = ${comma(LIBRE.period, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:109`, título de la gráfica (nuevo): «Valor animado por un resorte sin amortiguamiento»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:115`, leyenda (nuevo): «Sin amortiguar»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:141`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo con k = 100 N/m, m = 1 kg y b = 0, de ${TRAVEL.from} hacia ${TRAVEL.to}: un coseno que oscila entre ${TRAVEL.from} y ${2 * TRAVEL.to - TRAVEL.from}, vuelve al punto de partida cada T_0 = ${comma(LIBRE.period, 2)} s y nunca se queda en la banda de ±${PERCENT} del destino.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:154`, rótulo en la gráfica (nuevo): «$t$ = ${comma(AMORTIGUADO.settling, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:162`, título de la gráfica (nuevo): «Valor animado por el resorte por omisión de Motion y su envolvente»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:168`, leyenda (nuevo): «Motion por omisión, $\zeta$ = 0,5»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:174`, leyenda (nuevo): «Envolvente $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:194`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo con k = 100 N/m, b = 10 N·s/m y m = 1 kg, ζ = 0,5: oscila de ${TRAVEL.from} hacia ${TRAVEL.to} con vaivenes cada vez menores, entre las dos envolventes exponenciales, y entra para siempre en la banda de ±${PERCENT} a los ${comma(AMORTIGUADO.settling, 2)} s.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:202`, nombre del régimen en la leyenda (nuevo): «Subamortiguado»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:203`, nombre del régimen en la leyenda (nuevo): «Crítico»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:204`, nombre del régimen en la leyenda (nuevo): «Sobreamortiguado»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:236`, título de la gráfica (nuevo): «Las tres pruebas del resorte de Motion: tres regímenes desde el mismo punto»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:249`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo, de ${TRAVEL.from} a ${TRAVEL.to}, para las tres pruebas de Motion (ζ = ${zetas}): el subamortiguado se pasa del destino y oscila, el crítico llega sin pasarse y el sobreamortiguado llega sin pasarse pero más tarde. Los puntos son los valores que esperan las pruebas cada 0,2 s y caen sobre las curvas.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:256`, leyenda (nuevo): «Resorte, transición de Motion para $x$»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:257`, leyenda (nuevo): «Curva de duración fija, ease-in-out»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:258`, rótulo en la gráfica (nuevo): «$t^*$ = ${comma(INTERRUPTION.tStar, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:300`, título de la gráfica (nuevo): «Posición al interrumpir: el resorte frente a una curva de duración fija»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:313`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Posición x frente al tiempo. Los dos parten de ${TRAVEL.from} hacia ${TRAVEL.to}; la curva ease-in-out dura ${comma(duration, 2)} s. A los t* = ${comma(INTERRUPTION.tStar, 2)} s el destino vuelve a ${TRAVEL.from}: el resorte sigue un poco hacia arriba y vuelve sin esquina; la curva da la vuelta en seco desde donde estaba.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:318`, título de la gráfica (nuevo): «Velocidad al interrumpir: la del resorte es continua, la de la curva salta»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:327`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Velocidad v frente al tiempo. En t* = ${comma(INTERRUPTION.tStar, 2)} s la velocidad del resorte sigue en ${speed(spring.jump.before)} px/s, sin salto; la de la curva cae a 0 desde ${speed(bezier.jump.before)} px/s, porque una curva con duración arranca siempre desde el reposo.»

### Tablas 10.1 y 10.2 (`src/lib/tables/topics/animaciones-resorte.ts`)

- `src/lib/tables/topics/animaciones-resorte.ts:42`, nombre del preajuste en la tabla (nuevo): «Motion, posición $x$ e $y$»
- `src/lib/tables/topics/animaciones-resorte.ts:46`, celda «Origen» (nuevo): «Producto»
- `src/lib/tables/topics/animaciones-resorte.ts:47`, celda «Origen» (nuevo): «Ilustrativo»
- `src/lib/tables/topics/animaciones-resorte.ts:70`, leyenda de la tabla (nuevo): «Preajustes de resorte: los valores por omisión de Motion, el ejemplo documentado de Apple y un sobreamortiguado ilustrativo, todos con $m$ = 1 kg. $\\zeta$ es la (10.4), $M_p$ la (10.7) y $t_s$ el último instante fuera de la banda de ±2 % del recorrido, partiendo del reposo.»
- `src/lib/tables/topics/animaciones-resorte.ts:72`, encabezado de columna (nuevo): «Preajuste»
- `src/lib/tables/topics/animaciones-resorte.ts:73`, encabezado de columna (nuevo): «$k$»
- `src/lib/tables/topics/animaciones-resorte.ts:74`, encabezado de columna (nuevo): «$b$»
- `src/lib/tables/topics/animaciones-resorte.ts:75`, encabezado de columna (nuevo): «$m$»
- `src/lib/tables/topics/animaciones-resorte.ts:76`, encabezado de columna (nuevo): «$\\zeta$»
- `src/lib/tables/topics/animaciones-resorte.ts:77`, encabezado de columna (nuevo): «$M_p$»
- `src/lib/tables/topics/animaciones-resorte.ts:78`, encabezado de columna (nuevo): «$t_s$ al 2 %»
- `src/lib/tables/topics/animaciones-resorte.ts:79`, encabezado de columna (nuevo): «Origen»
- `src/lib/tables/topics/animaciones-resorte.ts:80`, encabezado de columna (nuevo): «Fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:84`, fuente de la tabla (nuevo): «Motion v14.14.0 (tag v14.14.0, commit f95ab94), licencia MIT, y Apple Developer Documentation (SwiftUI, Spring). Son cálculo propio con el núcleo del sitio: el $k$ y el $b$ del ejemplo de Apple, con la (10.10) a 0,5 s y rebote 0,3; el $b$ de la escala hacia 0, $2\\sqrt{550}$; y $\\zeta$, $M_p$ y $t_s$ de todas las filas.»
- `src/lib/tables/topics/animaciones-resorte.ts:89`, celda «Cálculo propio» (nuevo): «$k$ = ${comma(k, PARAM_DECIMALS)} N/m, $b$ = ${comma(b, PARAM_DECIMALS)} N·s/m»
- `src/lib/tables/topics/animaciones-resorte.ts:98`, celda «Llamada» (nuevo): «Apple, SwiftUI: ${forward.call}»
- `src/lib/tables/topics/animaciones-resorte.ts:99`, celda «Conversión» (nuevo): «$k = m\,(2\pi/d)^2$, $b = 4\pi m\,(1-\beta)/d$»
- `src/lib/tables/topics/animaciones-resorte.ts:105`, celda «Llamada» (nuevo): «Apple, SwiftUI: ${inverse.call}»
- `src/lib/tables/topics/animaciones-resorte.ts:106`, celda «Conversión» (nuevo): «$d = 2\pi/\omega_0$, $\beta = 1 - \zeta$»
- `src/lib/tables/topics/animaciones-resorte.ts:107`, celda «Cálculo propio» (nuevo): «$d$ = ${comma(period, 2)} s, $\beta$ = ${comma(bounce, 1)}»
- `src/lib/tables/topics/animaciones-resorte.ts:121`, celda «Llamada» (nuevo): «Motion: spring() por omisión, visualDuration: ${visualDuration}, bounce: ${bounce}»
- `src/lib/tables/topics/animaciones-resorte.ts:122`, celda «Conversión» (nuevo): «$\omega_0 = 2\pi/(${factor}\,T_v)$, $\zeta = \text{máx}(1-\beta;\ ${texNumber(minDampingRatio, 2)})$, $b = 2\zeta\sqrt{k m}$»
- `src/lib/tables/topics/animaciones-resorte.ts:128`, celda «Llamada» (nuevo): «Motion: bounce: 0, al cumplirse visualDuration»
- `src/lib/tables/topics/animaciones-resorte.ts:129`, celda «Conversión» (nuevo): «la (10.6) crítica en $t = T_v$, con $\omega_0 T_v = 2\pi/${factor}$»
- `src/lib/tables/topics/animaciones-resorte.ts:130`, celda «Cálculo propio» (nuevo): «${comma(progress * PERCENT, 2)} % del recorrido»
- `src/lib/tables/topics/animaciones-resorte.ts:131`, celda «Lo que publica la fuente» (nuevo): ««bounce 0 is 96.68% of the way at visualDuration»»
- `src/lib/tables/topics/animaciones-resorte.ts:140`, leyenda de la tabla (nuevo): «Los parámetros perceptuales de Apple y de Motion, duración y rebote, convertidos a $k$ y $b$ con la (10.10) y $m$ = 1 kg: lo que calculo frente a lo que publica la fuente. En Motion, $T_v$ es visualDuration.»
- `src/lib/tables/topics/animaciones-resorte.ts:142`, encabezado de columna (nuevo): «Llamada»
- `src/lib/tables/topics/animaciones-resorte.ts:143`, encabezado de columna (nuevo): «Conversión»
- `src/lib/tables/topics/animaciones-resorte.ts:144`, encabezado de columna (nuevo): «Cálculo propio»
- `src/lib/tables/topics/animaciones-resorte.ts:145`, encabezado de columna (nuevo): «Lo que publica la fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:146`, encabezado de columna (nuevo): «Fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:150`, fuente de la tabla (nuevo): «Apple Developer Documentation (SwiftUI, Spring), ejemplos de su resumen; Motion v14.14.0 (tag v14.14.0, commit f95ab94), packages/motion-dom/src/animation/generators/spring.ts y su prueba. La conversión de Apple sale de su ejemplo: la diapositiva de la WWDC23 trae una errata en la fórmula de damping.»

### Preajustes mostrados en la tabla 10.1 (`src/lib/data/springPresets.ts`)

- `src/lib/data/springPresets.ts:10`, prefijo de las fuentes de Motion en la columna «Fuente» de la tabla 10.1 (nuevo): «Motion v14.14.0, packages/motion-dom/src/animation»
- `src/lib/data/springPresets.ts:25`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, por omisión»
- `src/lib/data/springPresets.ts:28`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/generators/spring.ts L22-L24»
- `src/lib/data/springPresets.ts:32`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, posición x e y»
- `src/lib/data/springPresets.ts:35`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/utils/default-transitions.ts L4-L18»
- `src/lib/data/springPresets.ts:39`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, escala hacia 0»
- `src/lib/data/springPresets.ts:42`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/utils/default-transitions.ts L11-L18 (L16: damping: target === 0 ? 2 * Math.sqrt(550) : 30)»
- `src/lib/data/springPresets.ts:46`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Apple, ejemplo de la documentación»
- `src/lib/data/springPresets.ts:49`, celda «Fuente» de la tabla 10.1 (nuevo): «${APPLE_FORWARD_EXAMPLE.source}: ${APPLE_FORWARD_EXAMPLE.call} da ${APPLE_FORWARD_EXAMPLE.printed}» (en la página: «Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring): Spring(duration: 0.5, bounce: 0.3) da (1.0, 157.9, 17.6)»)
- `src/lib/data/springPresets.ts:53`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Sobreamortiguado»
- `src/lib/data/springPresets.ts:57`, celda «Fuente» de la tabla 10.1 (nuevo): «supuesto del modelo: el doble del amortiguamiento crítico, con la rigidez y la masa de Motion por omisión»

### Fuentes mostradas en las tablas 10.1 y 10.2 (`src/lib/data/springReferences.ts`)

- `src/lib/data/springReferences.ts:65`, celda «Fuente» de las tablas 10.1 (preajuste de Apple) y 10.2 (nuevo): «Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring)»
- `src/lib/data/springReferences.ts:114`, celda «Fuente» de la tabla 10.2 (MOTION es «Motion v14.14.0 (commit f95ab94), packages/motion-dom/src/animation/generators») (nuevo): «${MOTION}/spring.ts L28-L29, L40, L42-L50 y L240-L248, y su prueba spring.test.ts L473-L475»

### Laboratorio (figura 10.5, `src/components/topics/animaciones-resorte/`, tarea 5)

Todo es nuevo («antes» vacío). Elecciones de Claude que se ven en el texto:

- El recurso es la figura 10.5, con la insignia «Simulación interactiva»; las figuras 10.1 a 10.4 siguen sin ella.
- La tarjeta de comparación es la `ease-in-out` de la figura 10.4 (fallo R14), no la `cubic-bezier(0.25, 0.1, 0.25, 1)`
  del plan, y se llama «Curva de duración fija». Dura el $t_s$ al 2 % del resorte en cada tramo; si el resorte no tiene
  $t_s$ ($b = 0$, o un tramo que empieza dentro de la banda) dura la $d = 2\pi/\omega_0$ de la (10.10), y el resumen lo
  dice.
- «Interrumpir» en reposo aplica la (10.11) con los umbrales de Motion (0,5 px y 2 px/s): el resorte arranca desde su
  destino con $v = 0$ y solo cambia el destino. En el inicio, en pausa, el botón espera.
- El asentamiento sin amortiguamiento se escribe «nunca» en el resumen bajo el lienzo, no en las lecturas: una lectura
  del laboratorio solo muestra números.
- En el selector, el ejemplo de Apple se llama «Apple, ejemplo (producto)»: con el texto al 200 % el nombre completo
  hacía el selector más ancho que la tarjeta. El nombre completo sigue en la nota del preajuste y en la tabla 10.1.

En la página:

- `src/content/topics/animaciones-resorte.mdx:373`, pie de la figura 10.5: — → «Laboratorio del resorte: una tarjeta
  que mueve la (10.6) y, debajo, otra con una curva ease-in-out que dura el $t_s$ del resorte. Mueve $k$, $b$ y $m$
  para pasar por los tres regímenes; «Interrumpir» aplica la (10.9): el resorte conserva $x$ y $v$, y la curva arranca
  otra vez desde el reposo.»
- `src/content/topics/animaciones-resorte.mdx:375`, fuente de la figura 10.5: — → «Simulación que programé sobre
  src/lib/physics/dampedSpring.ts; preajustes de Motion v14.14.0 y de Apple (tabla 10.1); curva ease-in-out,
  cubic-bezier(0.42, 0, 0.58, 1), de CSS Easing Functions Level 1 (W3C)»
- `src/content/topics/animaciones-resorte.mdx:380`, «Cómo se usa», última línea (las velocidades salen de
  `SPRING_SPEEDS`): — → «A 1× la reproducción va en tiempo real, como en una interfaz, donde la animación dura menos de
  un segundo; con 0,1× o 0,25× se ven el sobrepaso y la interrupción de un resorte rígido.»
- `src/content/topics/animaciones-resorte.mdx:381`, «Qué deja fuera el modelo»: — → «Calculo cada cuadro con la
  solución analítica (10.6), exacta en cualquier $t$, como el generador de Motion: no integro paso a paso.
  react-spring avanza con Euler semiimplícito en pasos de 1 ms, y el gatillo del Tema 5 en pasos de 1/4 800 s; su
  error crece con $\omega_0\,\Delta t$, y aquí no aparece. La unidad de longitud se cancela en $k/m$ y en $b/m$, así que
  $k$ en N/m vale igual con $x$ en píxeles; $m$ = 1 kg es la convención de las bibliotecas, no una masa real. Tampoco
  entran el gesto que entrega una $v_0$ al soltar ni la duración y el rebote de Apple, que con la (10.10) dan otros $k$
  y $b$, no otra física. De los umbrales con que Motion da la animación por terminada solo uso el reposo al
  interrumpir.»

En el laboratorio (`SpringLab.tsx`, `springLabText.ts`, `SpringNotes.tsx`, `SpringPlot.tsx`, `SpringCard.tsx`,
`springScene.ts`, `springLabPresets.ts`; los `${…}` son valores que calcula el núcleo):

- `SpringLab.tsx:234`, título: — → «Laboratorio del resorte»
- `SpringLab.tsx:142-144`, parámetros: — → «Rigidez $k$» (N/m, de 10 a 1 000), «Amortiguamiento $b$» (N·s/m, de 0 a 100),
  «Masa $m$» (kg, de 0,1 a 5); los tres con paso 0,1
- `SpringLab.tsx:125`, botón del escenario: — → «Interrumpir»
- `springLabText.ts:55`, línea bajo «Interrumpir» cuando puede pulsarse: — → «Cambia el destino al instante: el resorte
  sigue con su velocidad y la curva arranca otra vez desde el reposo.»
- `springLabText.ts:57`, la misma línea en el inicio, en pausa (botón desactivado): — → «En el inicio no hay
  movimiento que interrumpir: reproduce o mueve la línea de tiempo.»
- `SpringLab.tsx:62-97`, lecturas (decimales fijos): — → «Razón de amortiguamiento $\zeta$» (tres), «Frecuencia
  natural $\omega_0$» (rad/s, dos), «Sobrepaso previsto $M_p$» (%, dos; la (10.7), desde el reposo), «Destino
  $x_\text{obj}$» (px, ninguno), «Posición del resorte $x$» (px, uno), «Velocidad del resorte $v$» (px/s, ninguno),
  «Posición de la curva $x$» y «Velocidad de la curva $v$» (estas dos, solo con la tarjeta de la curva)
- `SpringLab.tsx:171` y `:178`, interruptores del cajón, «Este simulador»: — → «Tarjeta con la curva de duración
  fija», «Banda de ±2 % alrededor del destino»
- `springLabText.ts:22-25`, ficha del régimen en el lienzo: — → «Sin amortiguar, $b = 0$», «Subamortiguado,
  $\zeta < 1$», «Crítico, $\zeta = 1$», «Sobreamortiguado, $\zeta > 1$»
- `springLabText.ts:36-37`, títulos de los carriles del lienzo y de las series de la gráfica: — → «Resorte», «Curva de
  duración fija»
- `springLabText.ts:114`, ficha del carril de la curva: — → «ease-in-out, $T$ = `${duración}`»
- `SpringCard.tsx:228`, rótulo bajo la marca del destino actual: — → «destino» (las marcas dicen «100 px» y
  «1 000 px»)
- `springLabText.ts:49`, «Cómo se usa», primera línea: — → «Reproduce y pulsa «Interrumpir» con las tarjetas a mitad
  de camino: el destino pasa a la otra marca. También puedes pausar, llevar la línea de tiempo o el cursor de la gráfica
  a un instante e interrumpir ahí. Cada interrupción queda en la línea de tiempo; una nueva antes de otra la reemplaza a
  ella y a las siguientes.»
- `springLabText.ts:50` (con la lista de `:40-41`), «Cómo se usa», segunda línea: — → «Atajos, con el foco en el
  lienzo (un clic en él, o Tab) o en el cursor de la gráfica: Espacio o K reproduce y pausa; I interrumpe; R vuelve al
  inicio; «,» y «.» retroceden o avanzan 1/60 s.» (antes de la revisión decía «Atajos, fuera de los campos: …»)
- `springLabText.ts:45`, nombre del lienzo para el lector de pantalla (el lienzo toma el foco para que los atajos
  funcionen): — → «Tarjetas del laboratorio. Atajos: Espacio o K reproduce y pausa; I interrumpe; R vuelve al inicio;
  «,» y «.» retroceden o avanzan 1/60 s.»
- `SpringNotes.tsx:7-11`, notas del lienzo (la segunda frase solo con la tarjeta de la curva; la última, solo con la
  banda): — → «Las dos tarjetas recorren lo mismo, de 100 px a 1 000 px. Arriba, el resorte de la (10.6), con el color
  de su régimen, como en las figuras 10.1 a 10.4. Abajo, la curva ease-in-out de duración fija, que arranca otra vez
  desde el reposo en cada interrupción. El contorno tenue marca el destino de ahora. La franja es la banda de ±2 % del
  recorrido en la que se mide $t_s$.»
- `SpringNotes.tsx:54`, `:58`, `:62`, filas del resumen: — → «Asentamiento al 2 %, $t_s$», «Curva de duración fija»,
  «Última interrupción»
- `springLabText.ts:79-85`, valor de «Asentamiento al 2 %»: — → «`${t_s}`» (sin interrupciones, p. ej. «0,81 s»);
  «nunca: con $b = 0$ el resorte no pierde energía, $dE/dt = -b v^2 = 0$»; «a los `${t}`: `${t_s}` después de la
  última interrupción»; «`${t*}`: tras la última interrupción ya no sale de la banda»
- `springLabText.ts:94-97`, valor de «Curva de duración fija»: — → «ease-in-out de `${T}`, el $t_s$ del resorte: salen
  y llegan a la vez»; o «ease-in-out de `${T}`, la $d = 2\pi/\omega_0$ de la (10.10), porque el resorte nunca se
  asienta» (o «… porque el resorte no sale de la banda»)
- `springLabText.ts:103-109`, valor de «Última interrupción»: — → «ninguna todavía: pulsa «Interrumpir» con las
  tarjetas a mitad de camino»; «a $t^*$ = `${t*}` las dos estaban en reposo: solo cambia el destino»; «a $t^*$ =
  `${t*}` el resorte sigue a `${v}`; la curva pasa de `${v_curva}` a 0»
- `springScene.ts:247-249`, eventos de la reproducción: — → «Interrupción», «Pico» (solo con $\zeta < 1$),
  «Asentamiento»
- `SpringPlot.tsx:156`, título de la gráfica: — → «Posición de las dos tarjetas, $x(t)$»
- `SpringPlot.tsx:100`, rótulo del primer sobrepaso en la gráfica: — → «$t_p$ = `${t_p}`»
- `SpringPlot.tsx:168`, nombre hablado del cursor de la gráfica: — → «Instante en la gráfica de posición»
- `SpringPlot.tsx:114`, descripción hablada de la gráfica (escrita con $x$): — → «Posición x frente al tiempo durante `${duración}`. El
  resorte, `${régimen}`, sale de 100 px hacia 1 000 px. La curva de duración fija va de 100 px a 1 000 px en `${T}`.
  Interrupciones: `${n}`, cada una cambia el destino.» (las dos últimas frases, según el caso)
- `SpringCard.tsx:342`, descripción hablada del lienzo: — → «Dos tarjetas van de 100 px a 1 000 px. El resorte,
  `${régimen}`, está en `${x}`, con destino `${x_obj}`; la curva de duración fija, en `${x}`.»
- `springLabPresets.ts:94` y `:47`, opciones del selector (texto plano): — → el nombre de `springPresets.ts` seguido de
  « (producto)» o « (ilustrativo)»; el de Apple, «Apple, ejemplo (producto)»
- `springLabPresets.ts:79`, nota de «Motion, por omisión»: — → «El generador de Motion sin opciones: $\zeta$ = 0,50, y
  la tarjeta se pasa un 16,30 % del recorrido antes de volver.»
- `springLabPresets.ts:80`, nota de «Motion, posición $x$ e $y$»: — → «La transición que Motion da a una traslación sin
  opciones propias: $\zeta$ = 0,56, con un sobrepaso del 12,03 %.»
- `springLabPresets.ts:82`, nota de «Motion, escala hacia 0»: — → «El crítico exacto, $b = 2\sqrt{k m}$, que Motion usa
  cuando la escala va a 0 para que no se vuelva negativa.»
- `springLabPresets.ts:83`, nota de «Apple, ejemplo de la documentación»: — → «La (10.10) con $d$ = 0,5 s y $\beta$ =
  0,3 da los 157,9 N/m y 17,6 N·s/m que imprime Apple: $\zeta$ = 0,70.»
- `springLabPresets.ts:84`, nota de «Sobreamortiguado»: — → «El doble del amortiguamiento crítico, $\zeta$ = 2: llega
  sin pasarse, pero tarda 1,49 s en asentarse al 2 %.»

Dos textos de la tarea 4 que cambié para que pase la guardia de glifos, que corre en esta página desde que tiene
laboratorio:

- `src/components/topics/animaciones-resorte/SpringFigure.tsx:174`, leyenda de la figura 10.2: «Envolvente
  $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$» → «Envolvente $x_\text{obj} \pm A_0 e^{-(b/2m)\,t}$». Es la misma
  envolvente, en la forma del Módulo 5 que ya cita el recuadro de clase ($\zeta\omega_0 = b/2m$). Con el subíndice
  dentro del exponente, el nombre hablado del botón de la leyenda decía «omega _0» con el guion bajo crudo. El pie de
  la figura conserva $e^{-\zeta\omega_0 t}$.
- `src/content/topics/animaciones-resorte.mdx:215`, Paso 2, «En la ecuación»: «… $\cos(\omega' t + \phi)$» →
  «… $\cos(\omega' t + \varphi)$». La ϕ de `\phi` no está en IBM Plex y se dibujaba con DejaVu Sans; la φ de
  `\varphi` sí está (el Tema 4 la usa), y es la del libro para la fase.

## Tema 11

Página nueva, «Síntesis de sonido: armónicos, timbre y el sintetizador» (rama `entrega-final-tema-11`, tarea 7, con la
ronda de corrección 1 del 20 de noviembre). Todo es nuevo («antes» vacío). Los `${…}` de los componentes son números que
salen de las medidas (`src/data/instrument-harmonics.json`); abajo los escribo como se ven hoy. Elecciones de Claude que
se ven en el texto:

- **Dónde va el recurso.** Las dos grabaciones analizadas (figura 11.4, la única con insignia) van en el paso 4, «Dos
  instrumentos reales»: así sus análisis citan (11.3), (11.4), (11.6) y (11.7) hacia atrás. Los pasos 1 a 3 llevan figuras
  propias con los mismos ejes: un tono puro (11.1), un diagrama de los modos de los dos tubos (11.2, figura nueva) y la
  onda cuadrada frente al diente de sierra (11.3).
- **Temas relacionados:** `control-haptico` y `gravedad-artificial` (la (11.1) es la proyección del MCU del hábitat). El
  Tema 10 no existe aún en esta rama; la tarea 17 añade `animaciones-resorte` y `resonancia-estructural`.
- **El bemol.** IBM Plex no tiene «♭»: en lo que se ve lo compone KaTeX («si$\flat$», «mi$\flat$4»); en lo que se oye
  dice «si bemol», «mi bemol 4». En las líneas de fuente y en la lista de fuentes lo escribo en palabras, «si bemol»: una
  línea de fuente admite fórmulas (la de la figura 11.2 lleva $v$), pero ahí elegí la palabra.
- **Números corregidos frente a la investigación** (decisión R9): $f_1$ = 310,10 y 310,34 Hz, a 1,4 cents; los pares
  del clarinete, «entre 21 y 37 dB por debajo del fundamental». No publico las correlaciones de resíntesis.
- **La (11.6) lleva una segunda relación**, $\rho = (P_\text{imp} - P_\text{par})/(P_\text{imp} + P_\text{par})$ (cálculo
  propio, con prueba): predice 0,995 y −0,083 y mido 0,992 y −0,084. Es lo que conecta los dB de los armónicos con lo que
  se ve en la forma de onda.
- **La (11.5)** se escribe con $t/T$: la §1.28.4 de la especificación escribe $t$ medido en periodos, de 0 a 1 en cada
  ciclo, y así la página no cambia de unidad. Lo dice la leyenda de la (11.5), en la entrada $t/T$.
- **El oído y la fase (Helmholtz, decisión R18).** El pie de la figura 11.4 explica por qué muestro amplitudes y no fases,
  con la cita de Helmholtz y la salvedad de Ellis sobre Koenig («a slight modification»); el paso 4 lo cita en la prosa.
  Es la fuente 12, a la que apuntará el interruptor «Fases aleatorias» del laboratorio (tarea 8).
- **Formas de onda y espectros de los pasos 1 y 3** usan el $f_1$ del clarinete, 310,10 Hz, para que el corchete de $T$
  sea el mismo que en las grabaciones. La forma de onda muestra cuatro periodos y el espectro, $n$ = 1…12 (la tarea; el
  spec decía tres periodos y $n$ = 1…10).
- **Marcas:** el ataque en 0:00, antes de que termine el ataque de cada grabación, y el sostenido en 0:01, dentro de la
  ventana de análisis de cada una (la e2e comprueba adónde cae cada salto).
- **Línea de fuente de las grabaciones** en primera persona (decisión R12), sin cursiva: una línea de fuente no admite
  marcas de cursiva.
- **Punteros «fuente N».** Las líneas de fuente y los análisis que no pueden llevar un enlace [n] (los de los audios)
  nombran la fuente por su número: 1 (W3C), 3 (MIS), 4 y 6 (Wolfe), 5 (Wolfe, tubos) y 12 (Helmholtz). Una prueba
  comprueba que cada número sigue apuntando a esa fuente.

### Ronda de corrección 1 (20 de noviembre): lo que cambió

- caso de uso, «El caso concreto»: «…del W3C es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ hecha con las amplitudes de sus armónicos [1].…» → «…del W3C (Recomendación del 17 de junio de 2021) es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ, una receta de armónicos [1].…»
- Paso 4: «…en mi$\flat$4, fortísimo y sin vibrato [3], y mido sus recetas… la exponencial de ˋsetTargetAtTimeˋ [1].» → «…(mi$\flat$4, fortísimo, sin vibrato) [3] y mido sus recetas… la exponencial de ˋsetTargetAtTimeˋ (§1.6.2) [1].»
- Paso 4, «En el fenómeno»: «Con el mismo tono cambian los armónicos y el arranque.…» → «Con el mismo tono cambian los armónicos y el arranque, no las fases, que casi no se oyen [12].…»
- Paso 4, «En la ecuación»: «…[9], y una ˋPeriodicWaveˋ, periódica por definición, no la puede tocar.…» → «…[9]: una ˋPeriodicWaveˋ, periódica por definición, no puede tocarla.…»
- pie de la figura 11.4: (dos frases) → se añade la frase de Helmholtz (abajo, en la entrada del pie)
- recuadro «Visto en clase»: «…El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ en el MCU, con $\omega$ como frecuencia angular.…» → «…El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ del MCU, con $\omega$ como velocidad angular; aquí, la frecuencia angular.…» (el curso la llama «velocidad angular»)
- recuadro Chrome Music Lab: «…es $f_n = n f_1$, con seis armónicos [10].…» → «…es $f_n = n f_1$ [10].…»
- Paso 2 y otros recortes de prosa (para seguir en 650): «…abierto en los dos extremos…» · «…Las dos ecuaciones dicen…» · «…cambia la sonoridad entre recetas (§1.28.5)…» · «Un sintetizador escribe esa diferencia…» · «…la presión del aire en un punto oscila…» · «…con varios armónicos haría…» → «…abierto en ambos extremos…» · «…Las dos dicen…» · «…cambia la sonoridad (§1.28.5)…» · «Un sintetizador la escribe…» · «…la presión del aire oscila…» · «…con armónicos haría…»
- análisis del sostenido del clarinete: «…según Wolfe (UNSW).…» → «…según Wolfe (fuente 6).…»
- análisis conjunto, «Lo que el espectro no cuenta»: «…Wolfe advierte que los libros de introducción dan a entender que el espectro decide el timbre de un instrumento y que,…» → «…Wolfe (fuente 4) advierte que los libros de introducción a veces dan a entender que el espectro es la contribución dominante al timbre de un instrumento y que,…»
- tabla 11.1, leyenda: «…el coeficiente $b_n$ de cada armónico…, son valores del producto…» → «…los coeficientes $b_n$ de cada armónico…, son valores del producto…»
- tabla 11.3, «Intérprete y fecha» del clarinete: «Christine Bellomy, 3 de agosto de 1998; Buffet R13» → «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998» (el mismo texto que la línea de crédito, de una sola fuente de datos)

### Página (`src/content/topics/sintesis-sonido.mdx`)

- `src/content/topics/sintesis-sonido.mdx:5`, título corto: «Síntesis de sonido»
- `src/content/topics/sintesis-sonido.mdx:6`, concepto: «Tono puro, modos normales de un tubo y superposición de armónicos (series de Fourier): por qué una flauta y un clarinete en la misma nota no suenan igual, y cómo un sintetizador escribe un timbre como una receta de amplitudes.»
- `src/content/topics/sintesis-sonido.mdx:9`, caso de uso, producto: «Web Audio API del W3C (OscillatorNode y PeriodicWave) y su implementación en Chromium»
- `src/content/topics/sintesis-sonido.mdx:10`, caso de uso, industria: «Navegadores web y síntesis de audio por software»
- `src/content/topics/sintesis-sonido.mdx:11` y siguientes, lista de fuentes (lo que va en castellano):
  - fuente 1 (`:12`): «Web Audio API» · «Paul Adenot y Hongchan Choi (editores), W3C» · «Recomendación del W3C, 17 de junio de 2021: §1.6.2, §1.9, §1.26 y §1.28.4 a §1.28.6»
  - fuente 2 (`:19`): «Chromium 160.0.8168.1 (commit 22cf9aec), periodic_wave_handler.cc» · «The Chromium Authors» · «Repositorio de Chromium, licencia BSD; third_party/blink/renderer/modules/webaudio/periodic_wave_handler.cc L42-L54, L80-L87, L105-L109, L320-L335 y L408-L428»
  - fuente 3 (`:26`): «Musical Instrument Samples» · «University of Iowa Electronic Music Studios, dir. Lawrence Fritts» · «University of Iowa; flauta de Sonja Feig (2000) y clarinete en si bemol de Christine Bellomy (1998), grabados en cámara anecoica»
  - fuente 4 (`:32`): «What is a Sound Spectrum?» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 5 (`:38`): «Open vs Closed pipes (Flutes vs Clarinets)» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 6 (`:44`): «Clarinet acoustics: an introduction» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 7 (`:50`): «How harmonic are harmonics?» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 8 (`:56`): «University Physics, Volume 1: §15.3, §16.6 y §17.4» · «William Moebs, Samuel J. Ling y Jeff Sanny» · «OpenStax, Rice University»
  - fuente 9 (`:63`): «Physical Audio Signal Processing: Dispersion Filter-Design» · «Julius O. Smith III» · «CCRMA, Stanford University»
  - fuente 10 (`:69`): «Chrome Music Lab, «Harmonics & Strings» (commit e54bb41)» · «Google Creative Lab» · «Repositorio googlecreativelab/chrome-music-lab en GitHub, licencia Apache-2.0; harmonics & strings/js/Harmonic.js L66-L71 y L257, index.js L36-L37»
  - fuente 11 (`:76`): «Electrical musical instrument, patente US 1 956 350» · «Laurens Hammond» · «Oficina de Patentes de los Estados Unidos, concedida el 24 de abril de 1934»
  - fuente 12 (`:83`): «On the Sensations of Tone, parte I, capítulo VI» · «Hermann L. F. Helmholtz; traducción y notas de Alexander J. Ellis» · «2.ª edición inglesa, reimpresión de 1895, págs. 126 y 127; dominio público, en Internet Archive»
- `src/content/topics/sintesis-sonido.mdx:93`, «Con lo visto en clase», tema: «Tema 4 · Resonancia, Sistemas Acoplados y Ondas Armónicas/Sonoras · Ondas Armónicas y Sonoras»
- `src/content/topics/sintesis-sonido.mdx:94`, «Con lo visto en clase», nota: «Cada partícula del medio hace un MAS, $y(x,t) = A\sin(kx - \omega t)$; en un punto fijo es la (11.1).»
- `src/content/topics/sintesis-sonido.mdx:96`, «Con lo visto en clase», tema: «Tema 4 · Resonancia, Sistemas Acoplados y Ondas Armónicas/Sonoras · Sistemas Acoplados»
- `src/content/topics/sintesis-sonido.mdx:97`, «Con lo visto en clase», nota: «Los modos normales, que según el módulo explican el acoplamiento acústico en los instrumentos: en un tubo son los de las (11.2) y (11.3).»
- `src/content/topics/sintesis-sonido.mdx:99`, «Con lo visto en clase», tema: «Tema 1.4 · Movimiento Circular Uniforme (MCU)»
- `src/content/topics/sintesis-sonido.mdx:100`, «Con lo visto en clase», nota: «$T = 2\pi/\omega$ y $f = 1/T$ en Hz: el periodo y la frecuencia de la (11.1), que es la proyección de un MCU.»
- `src/content/topics/sintesis-sonido.mdx:119`, introducción: «Una flauta y un clarinete en la misma nota no suenan igual. Un sintetizador la escribe como una receta de armónicos.»
- `src/content/topics/sintesis-sonido.mdx:121`, Paso 1, título: «Un tono puro»
- `src/content/topics/sintesis-sonido.mdx:123`, Paso 1: «El sonido más simple es un seno: la presión del aire oscila con una sola frecuencia [8].»
- `src/content/topics/sintesis-sonido.mdx:131`, Paso 1, leyenda de la (11.1): «presión acústica en un punto, respecto de la del ambiente»
- `src/content/topics/sintesis-sonido.mdx:134`, Paso 1, leyenda de la (11.1): «amplitud: fija la sonoridad»
- `src/content/topics/sintesis-sonido.mdx:135`, Paso 1, leyenda de la (11.1): «frecuencia: fija el tono, grave o agudo»
- `src/content/topics/sintesis-sonido.mdx:136`, Paso 1, leyenda de la (11.1): «periodo»
- `src/content/topics/sintesis-sonido.mdx:137`, Paso 1, leyenda de la (11.1): «tiempo»
- `src/content/topics/sintesis-sonido.mdx:145`, Paso 1, «En el fenómeno»: «Subir $f$ sube la nota; subir $A$ la hace más fuerte. Con la misma $f$ y la misma $A$, dos tonos puros suenan idénticos.»
- `src/content/topics/sintesis-sonido.mdx:151`, Paso 1, «En la ecuación»: «La (11.1) es la proyección de un MCU con $\omega = 2\pi f$. Con dos números no distingue instrumentos: le falta el timbre, lo que separa dos sonidos «which have the same pitch and the same loudness» [4].»
- `src/content/topics/sintesis-sonido.mdx:160`, pie de la figura 11.1: «Un tono puro de 310,10 Hz, el $f_1$ medido del clarinete: cuatro periodos de $T$ = 3,22 ms y su contenido armónico, una sola barra en $n$ = 1. Los ejes son los de las figuras 11.3 y 11.4.»
- `src/content/topics/sintesis-sonido.mdx:162`, fuente de la figura 11.1: «Gráfica que calculé con la (11.1); la frecuencia es la del clarinete de la figura 11.4»
- `src/content/topics/sintesis-sonido.mdx:170`, Paso 2, título: «Los modos de un tubo»
- `src/content/topics/sintesis-sonido.mdx:172`, Paso 2: «Un tubo solo deja sonar sus ondas estacionarias: abierto en ambos extremos, como la flauta, todas; cerrado en uno, como el clarinete con su caña, solo las impares [8] [5] [6].»
- `src/content/topics/sintesis-sonido.mdx:178`, Paso 2, leyenda de la (11.2): «frecuencia del modo $n$, el armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:179`, Paso 2, leyenda de la (11.2): «frecuencia fundamental, la del modo 1»
- `src/content/topics/sintesis-sonido.mdx:180`, Paso 2, leyenda de la (11.2): «rapidez del sonido en el aire, unos 340 m/s»
- `src/content/topics/sintesis-sonido.mdx:181`, Paso 2, leyenda de la (11.2): «longitud efectiva del tubo»
- `src/content/topics/sintesis-sonido.mdx:191`, Paso 2, «En el fenómeno»: «Con la misma longitud, el clarinete suena «one octave lower than the flute» [5]; para dar los mismos 310 Hz, su columna de aire mide la mitad.»
- `src/content/topics/sintesis-sonido.mdx:197`, Paso 2, «En la ecuación»: «El aire no se mueve en el extremo cerrado, un nodo, y se mueve al máximo en el abierto, un vientre: solo caben $L = \lambda/4,\ 3\lambda/4,\ 5\lambda/4, \dots$, con $n$ impar. Las dos dicen qué frecuencias suenan, no cuánto.»
- `src/content/topics/sintesis-sonido.mdx:206`, pie de la figura 11.2: «Los tres primeros modos de dos tubos ideales con $f_1$ = 310 Hz, a la misma escala: el abierto-abierto mide 0,55 m y admite $n$ = 1, 2 y 3; el cerrado-abierto mide 0,27 m y solo $n$ = 1, 3 y 5. Las curvas son la amplitud del desplazamiento del aire: vientres en los extremos abiertos, un nodo en el cerrado.»
- `src/content/topics/sintesis-sonido.mdx:208`, fuente de la figura 11.2: «Diagrama que dibujé con las (11.2) y (11.3) y $v$ ≈ 340 m/s de Wolfe (UNSW), fuente 5; longitudes efectivas (cálculo propio), sin la corrección de extremo»
- `src/content/topics/sintesis-sonido.mdx:216`, Paso 3, título: «La receta de armónicos»
- `src/content/topics/sintesis-sonido.mdx:218`, Paso 3: «Toda vibración que se repite cada $T$ es una suma de armónicos [4]. La Web Audio API la escribe con senos y cosenos [1].»
- `src/content/topics/sintesis-sonido.mdx:224`, Paso 3, leyenda de la (11.4): «amplitud del armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:225`, Paso 3, leyenda de la (11.4): «fase del armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:226`, Paso 3, leyenda de la (11.4): «número de armónicos de la receta»
- `src/content/topics/sintesis-sonido.mdx:236`, Paso 3, leyenda de la (11.5): «coeficientes de coseno y de seno: los arreglos real e imag de una PeriodicWave»
- `src/content/topics/sintesis-sonido.mdx:240`, Paso 3, leyenda de la (11.5): «tiempo medido en periodos, de 0 a 1 en cada ciclo: la §1.28.4 lo escribe $t$»
- `src/content/topics/sintesis-sonido.mdx:251`, Paso 3, leyenda de la (11.6): «correlación entre $y(t)$ y $-y(t + T/2)$ sobre periodos completos»
- `src/content/topics/sintesis-sonido.mdx:255`, Paso 3, leyenda de la (11.6): «potencia de los armónicos impares y de los pares, la suma de sus $A_n^2$»
- `src/content/topics/sintesis-sonido.mdx:264`, Paso 3, «En el fenómeno»: «Cada término se repite cada $T$: la suma conserva el tono y cambia la forma, el timbre. Con solo impares, la segunda mitad de cada periodo es la primera invertida.»
- `src/content/topics/sintesis-sonido.mdx:270`, Paso 3, «En la ecuación»: «Desarrollando $\sin(\alpha + \varphi)$, la (11.4) da la (11.5). Medio periodo multiplica el armónico $n$ por $(-1)^n$: los impares cambian de signo y los pares no. Con los dos, $\rho$ pesa sus potencias (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:279`, pie de la figura 11.3: «Dos recetas de la Web Audio API con $f_1$ = 310,10 Hz y doce armónicos: la onda cuadrada, solo impares, y el diente de sierra, todos (tabla 11.1). En la cuadrada, $-y(t + T/2)$ cae sobre $y(t)$, como pide la (11.6); en el diente de sierra, no: $\rho$ = 0,52.»
- `src/content/topics/sintesis-sonido.mdx:281`, fuente de la figura 11.3: «Gráfica que calculé con la (11.4) y las recetas de la §1.28.6 de la Web Audio API (W3C, 2021), fuente 1»
- `src/content/topics/sintesis-sonido.mdx:291`, Paso 4, título: «Dos instrumentos reales»
- `src/content/topics/sintesis-sonido.mdx:293`, Paso 4: «Comparo una flauta y un clarinete en si$\flat$ de la University of Iowa (mi$\flat$4, fortísimo, sin vibrato) [3] y mido sus recetas con un FFT propio. Una nota real empieza y termina: la (11.7) multiplica la receta por la exponencial de ˋsetTargetAtTimeˋ (§1.6.2) [1].»
- `src/content/topics/sintesis-sonido.mdx:299`, Paso 4, leyenda de la (11.7): «envolvente: el nivel de la nota en cada instante»
- `src/content/topics/sintesis-sonido.mdx:300`, Paso 4, leyenda de la (11.7): «nivel al empezar la rampa y nivel al que tiende»
- `src/content/topics/sintesis-sonido.mdx:301`, Paso 4, leyenda de la (11.7): «instante en que empieza la rampa»
- `src/content/topics/sintesis-sonido.mdx:302`, Paso 4, leyenda de la (11.7): «constante de tiempo de la rampa»
- `src/content/topics/sintesis-sonido.mdx:313`, Paso 4, leyenda de la (11.8): «coeficiente de inarmonicidad de una cuerda rígida, adimensional; 0 en una cuerda ideal»
- `src/content/topics/sintesis-sonido.mdx:322`, Paso 4, leyenda de la (11.9): «frecuencia de muestreo del audio digital»
- `src/content/topics/sintesis-sonido.mdx:326`, Paso 4, leyenda de la (11.9): «frecuencia a la que se pliega un armónico por encima de $f_s/2$, con el entero $m$ que la deja entre 0 y $f_s/2$»
- `src/content/topics/sintesis-sonido.mdx:336`, Paso 4, «En el fenómeno»: «Con el mismo tono cambian los armónicos y el arranque, no las fases, que casi no se oyen [12]. Soplados, sus armónicos son múltiplos exactos de $f_1$; una cuerda pulsada o golpeada los estira [7].»
- `src/content/topics/sintesis-sonido.mdx:342`, Paso 4, «En la ecuación»: «La (11.8) aparta los parciales de $n f_1$ [9]: una ˋPeriodicWaveˋ, periódica por definición, no puede tocarla. La (11.9) limita la receta: con 310 Hz y 44,1 kHz caben 71 armónicos (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:350`, pie de la figura 11.4 (el recurso): «Flauta y clarinete en si$\flat$ en la misma nota, mi$\flat$4, igualados en sonoridad: lo que cambia es el timbre. Bajo cada audio analizo dos instantes, el ataque y el sostenido, y muestro con los mismos ejes su envolvente, cuatro periodos de su forma de onda y sus doce armónicos; al final, qué diferencia produce qué. Muestro amplitudes y no fases porque el oído casi no distingue las fases: para Helmholtz, la cualidad de un sonido depende «solely on the number and relative strength of its partial simple tones, and in no respect on their differences of phase» («solo del número y la intensidad relativa de sus parciales, y en nada de sus diferencias de fase»), aunque su traductor, Ellis, anota que los experimentos de Koenig piden «a slight modification» («una ligera modificación»), fuente 12.»
- `src/content/topics/sintesis-sonido.mdx:352`, fuente de la figura 11.4 (el recurso): «Grabaciones: University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), fuente 3: flauta de Sonja Feig (2000) y clarinete en si bemol Buffet R13 de Christine Bellomy (1998), en cámara anecoica con un micrófono Neumann KM 84. Los recorté, los pasé a mono e igualé su sonoridad a −20 LUFS; el MIS permite usarlos «for any projects, without restrictions». Envolventes, formas de onda y espectros: cálculo propio sobre los archivos originales»
- `src/content/topics/sintesis-sonido.mdx:371`, caso de uso, «El caso concreto»: «La Web Audio API del W3C (Recomendación del 17 de junio de 2021) es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ, una receta de armónicos [1]. Chromium la implementa en ˋperiodic_wave_handler.ccˋ (tag 160.0.8168.1, commit ˋ22cf9aecˋ) [2].»
- `src/content/topics/sintesis-sonido.mdx:377`, caso de uso, «La ecuación»: «La §1.28.4 escribe la (11.5); la §1.28.6, las recetas de la tabla 11.1. Chromium aplica la (11.9) en tablas por tercio de octava: ˋnumber_of_partials = culling_scale * max_number_of_partialsˋ (L320-L335) recorta «just in time to truncate partials before aliasing occurs» (L105-L109).»
- `src/content/topics/sintesis-sonido.mdx:383`, caso de uso, «Por qué modelar la física»: «Una muestra grabada vale para una nota y una intensidad; transponerla con ˋplaybackRateˋ la acelera y corre su espectro (§1.9). Doce amplitudes en la (11.4) tocan ese timbre en cualquier nota y duración.»
- `src/content/topics/sintesis-sonido.mdx:389`, caso de uso, «Qué se gana y qué cuesta»: «Gano cualquier timbre periódico con pocos números. Cuesta memoria, 576 KiB por receta en 36 tablas (cálculo propio), y filtrar sobre Nyquist, un trato entre CPU y fidelidad (§1.26); normalizar al pico cambia la sonoridad (§1.28.5), y la (11.4) no tiene ataque, ruido ni inarmonicidad.»
- `src/content/topics/sintesis-sonido.mdx:395`, recuadro, título: «Otro diseño: Chrome Music Lab»
- `src/content/topics/sintesis-sonido.mdx:397`, recuadro: «Su experimento «Harmonics» usa un oscilador seno por armónico: ˋstartingFrequency * (this.ind+1)ˋ es $f_n = n f_1$ [10]. Cada armónico cuesta un oscilador; la ˋPeriodicWaveˋ, una tabla para todos.»
- `src/content/topics/sintesis-sonido.mdx:401`, recuadro, título: «Antes del software: el órgano Hammond»
- `src/content/topics/sintesis-sonido.mdx:403`, recuadro: «Su patente de 1934 ya sumaba al fundamental «the first eight harmonics» [11], tomados de la escala temperada: su quinto armónico queda 13,69 cents alto (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:407`, recuadro «Visto en clase», título: «Módulo 5 · Tema 4, introductorio; Módulo 1 · Tema 1.4»
- `src/content/topics/sintesis-sonido.mdx:409`, recuadro «Visto en clase»: «En el Módulo 5, cada partícula del medio hace un MAS: la (11.1) en un punto; sus modos normales son, en un tubo, los de las (11.2) y (11.3). El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ del MCU, con $\omega$ como velocidad angular; aquí, la frecuencia angular. Las (11.2) a (11.9) son extensiones.»
- `src/content/topics/sintesis-sonido.mdx:415`, «Conexiones»: «Con el Tema 5: el actuador del DualSense vibra «like a small speaker» con $F_0\sin(\omega t)$, un tono puro; con armónicos haría la (11.4). Con el Tema 3: la (11.1) proyecta el MCU del hábitat.»

### Figura 11.4: las dos grabaciones (`src/components/topics/sintesis-sonido/`)

- `src/lib/data/instrumentSamples.ts:63`, nombres de las muestras (tarea 6; en pantalla, «♭» lo compone KaTeX: «si$\flat$»): «Flauta» · «Clarinete en si♭»
- `src/lib/data/instrumentSamples.ts:77`, intérprete y fecha de cada grabación (una sola fuente para el crédito y la tabla 11.3): «Sonja Feig, abril de 2000» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998»
- `src/components/topics/sintesis-sonido/SampleAnalysis.tsx:37`, título de cada grabación: «Flauta: $f_1$ = 310,34 Hz» y «Clarinete en si$\flat$: $f_1$ = 310,10 Hz»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:88`, nombre accesible de cada audio (se oye): «Flauta, mi bemol 4 fortísimo sin vibrato» y «Clarinete en si bemol, mi bemol 4 fortísimo sin vibrato»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:95`, línea de crédito bajo cada audio (tras «Audio: »): «Sonja Feig, abril de 2000; University of Iowa, Musical Instrument Samples, archivo Flute.nonvib.ff.Eb4.stereo.aif. Lo recorté desde 0,10 s y lo igualé a −20 LUFS.» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998; University of Iowa, Musical Instrument Samples, archivo BbClarinet.ff.Eb4.stereo.aif. Lo recorté desde 0,38 s y lo igualé a −20 LUFS.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:59`, flauta, marca 0:00 «El ataque»: «Desde aquí se oye cómo empieza la nota. En la envolvente, el nivel pasa del 10 al 90 % del sostenido en 0,12 s, de 0,05 a 0,17 s del audio: la flauta arranca casi de golpe. La receta (11.4) sola sonaría completa desde el primer instante; la (11.7) le da esta subida con la envolvente $E(t)$.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:64`, flauta, marca 0:01 «El sostenido»: «A 1 s la nota ya es estable: estoy dentro de la ventana de análisis. En el espectro, los seis primeros armónicos quedan a ±5 dB del fundamental y el más fuerte es el 2.º, +3,7 dB: suenan pares e impares, como pide la (11.2) en un tubo abierto. Por eso la discontinua $-y(t + T/2)$ no sigue a la continua: su correlación con $y(t)$ es −0,084 y la (11.6) no se cumple. En el 7.º armónico el nivel cae de golpe, a −18,4 dB.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:72`, clarinete, marca 0:00 «El ataque»: «El clarinete tarda 0,40 s en pasar del 10 al 90 % de su nivel, de 0,05 a 0,45 s del audio: más del triple que la flauta, y se oye cómo la nota crece. Es la envolvente $E(t)$ de la (11.7). La ventana de análisis empieza a los 0,22 s, todavía dentro de este ataque: en la envolvente, la ventana y el ataque se solapan.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:77`, clarinete, marca 0:01 «El sostenido»: «En el espectro, los armónicos pares (2, 4, 6 y 8) quedan entre 21 y 37 dB por debajo del fundamental, y el 3.º es más fuerte que el propio fundamental: +3,3 dB. Es la (11.3) de un tubo cerrado en un extremo: solo los impares forman ondas estacionarias, y esas refuerzan los impares de la caña, según Wolfe (fuente 6). Con los impares 25,7 dB por encima de los pares, la (11.6) se ve a simple vista: la discontinua $-y(t + T/2)$ cae sobre la continua, con correlación 0,992.»
- `src/components/topics/sintesis-sonido/SampleContrast.tsx:18`, título del análisis conjunto: «Qué diferencia produce qué»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:106`, análisis conjunto: «**Lo que comparten: el tono.** Las dos notas repiten su forma cada $T$ = 3,22 ms: $f_1$ = 310,10 Hz en el clarinete y 310,34 Hz en la flauta, a 1,4 cents. El corchete de $T$ mide lo mismo en las dos formas de onda: por la (11.4), el tono lo pone $f_1$, no la forma.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:110`, análisis conjunto: «**Lo que cambia: qué armónicos suenan.** Los impares pesan 25,7 dB más que los pares en el clarinete y −0,7 dB en la flauta: la (11.3) de un tubo cerrado frente a la (11.2) de uno abierto. Con el mismo tono y la misma sonoridad, esa receta es lo que distingue aquí sus timbres.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:114`, análisis conjunto: «**Dónde se ve: la simetría de media onda.** Con esas potencias, la (11.6) predice correlaciones de 0,995 y −0,083 entre $y(t)$ y $-y(t + T/2)$; mido 0,992 y −0,084. Por eso la curva discontinua solo cae sobre la continua en el clarinete.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:118`, análisis conjunto: «**Lo que el espectro no cuenta.** El ataque, de 0,40 s frente a 0,12 s (11.7), y el ruido del soplido. Wolfe (fuente 4) advierte que los libros de introducción a veces dan a entender que el espectro es la contribución dominante al timbre de un instrumento y que, «with the exception of the closed pipes mentioned above, this is very misleading» («salvo en los tubos cerrados, eso es muy engañoso»): esta pareja funciona porque el clarinete es uno.»
- `src/components/topics/sintesis-sonido/SampleAnalysis.tsx:53`, títulos de las gráficas: «Envolvente de la nota completa» · «Cuatro periodos del sostenido» · «Contenido armónico»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:142`, nombre accesible de la envolvente (se oye): «Envolvente RMS de la flauta, relativa a su sostenido: sube del 10 al 90 % en 0,12 s, de 0,05 a 0,17 s; la ventana de análisis va de 0,24 a 2,32 s y la caída, de 2,21 a 2,50 s.» · «Envolvente RMS del clarinete en si bemol, relativa a su sostenido: sube del 10 al 90 % en 0,40 s, de 0,05 a 0,45 s; la ventana de análisis va de 0,22 a 1,86 s y la caída, de 1,91 a 2,02 s.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:143`, nombre accesible de la forma de onda (se oye): «Cuatro periodos de la forma de onda de la flauta, cada uno de T = 3,22 ms. La misma curva medio periodo después e invertida no sigue a la original: correlación −0,084.» · «Cuatro periodos de la forma de onda del clarinete en si bemol, cada uno de T = 3,22 ms. La misma curva medio periodo después e invertida cae sobre la original: correlación 0,992.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:144`, nombre accesible del espectro (se oye): «Espectro de la flauta, armónicos 1 a 12 en dB respecto del fundamental: los seis primeros armónicos dentro de ±5 dB del fundamental; el más fuerte es el 2.º, con +3,7 dB. Los impares pesan −0,7 dB sobre los pares.» · «Espectro del clarinete en si bemol, armónicos 1 a 12 en dB respecto del fundamental: los pares 2, 4, 6 y 8 entre 21 y 37 dB por debajo del fundamental; el más fuerte es el 3.º, con +3,3 dB. Los impares pesan +25,7 dB sobre los pares.»

### Gráficas compartidas (figuras 11.1, 11.3 y 11.4)

- `src/components/topics/sintesis-sonido/soundPlots.ts:64`, ejes de la forma de onda: «Tiempo $t$ (ms)» · «Señal $y$ / pico (adimensional)»
- `src/components/topics/sintesis-sonido/soundPlots.ts:76`, ejes de la envolvente: «Tiempo del audio $t$ (s)» · «Nivel RMS / sostenido (adimensional)»
- `src/components/topics/sintesis-sonido/WaveformPlot.tsx:39`, rótulo del corchete: «$T$ = 3,22 ms»
- `src/components/topics/sintesis-sonido/WaveformPlot.tsx:64`, leyenda: «Señal $y(t)$» · «Medio periodo después, invertida: $-y(t + T/2)$»
- `src/components/topics/sintesis-sonido/EnvelopePlot.tsx:63`, rótulos de la envolvente: «Ataque» · «Caída» · «Ventana de análisis»; serie: «Envolvente RMS»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:241`, línea sobre las barras (en la onda cuadrada, «sin pares» en lugar del valor): «Impares sobre pares, $n \le 10$: +25,7 dB»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:196`, nombre accesible de la leyenda del espectro (se oye): «Leyenda del espectro»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:199`, leyenda del espectro: «Impares, $n$ = 1, 3, 5…» · «Pares, $n$ = 2, 4, 6…» · «Rango entre ventanas de 0,25 s»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:263`, ejes del espectro: «Armónico $n$ (adimensional)» · «$A_n/A_1$ (dB)»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:85`, título de la gráfica del paso 1: «Tono puro de 310,10 Hz»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:86`, nombres accesibles del paso 1 (se oyen): «Cuatro periodos de un seno de 310,10 Hz, cada uno de T = 3,22 ms.» · «Espectro del tono puro: una sola barra, el fundamental n = 1; no hay más armónicos.»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:33`, títulos del paso 3: «Onda cuadrada: solo impares, $A_n = 4/(n\pi)$» · «Diente de sierra: todos los armónicos, $|A_n| = 2/(n\pi)$» · «Cuatro periodos» · «Contenido armónico»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:47`, nombres accesibles del paso 3 (se oyen): «Cuatro periodos de la onda cuadrada sumada con doce armónicos, T = 3,22 ms: la misma curva medio periodo después e invertida cae sobre la original.» · «Cuatro periodos del diente de sierra sumado con doce armónicos, T = 3,22 ms: la curva medio periodo después e invertida es otra, correlación 0,52.» · «Espectro de la onda cuadrada: solo los armónicos impares 1, 3, 5, 7, 9 y 11, que bajan como 1/n; los pares no existen.» · «Espectro del diente de sierra: los doce armónicos, que bajan como 1/n.»

### Figura 11.2: los modos de los dos tubos (`PipeModes.tsx`)

- `src/components/topics/sintesis-sonido/PipeModes.tsx:37`, títulos (con la longitud que añade el componente): «Abierto-abierto (flauta): $L$ = 0,55 m» · «Cerrado-abierto (clarinete): $L$ = 0,27 m»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:80`, rótulo de cada modo: «$n$ = 1 · 310 Hz» … «$n$ = 5 · 1 550 Hz»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:176`, escala y leyenda: «10 cm» · «Modo impar» · «Modo par»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:54`, nombre accesible (se oye; sale de los datos de los tubos): «Tres primeros modos de dos tubos ideales con fundamental de 310 Hz, a la misma escala. Abierto en los dos extremos, de 0,55 m: n = 1, 2 y 3, a 310, 620 y 930 Hz, con vientres de desplazamiento en ambos extremos. Cerrado en un extremo, de 0,27 m: solo n = 1, 3 y 5, a 310, 930 y 1 550 Hz, con un nodo en el extremo cerrado y un vientre en el abierto.»

### Tablas 11.1 a 11.3 (`src/lib/tables/topics/sintesis-sonido.ts`)

- `src/lib/tables/topics/sintesis-sonido.ts:37`, leyenda de la tabla 11.1: «Las cuatro ondas de un OscillatorNode como recetas de armónicos: los coeficientes $b_n$ de cada armónico en la (11.5), con todos los $a_n$ = 0, son valores del producto, la Web Audio API. La cuadrada y la triangular solo tienen impares; el diente de sierra tiene todos, con signo alterno.»
- encabezados de la tabla 11.1: «Armónico $n$» · «Seno, $b_1 = 1$» · «Cuadrada, $4/(n\pi)$ en impares» · «Diente de sierra, $(-1)^{n+1}\,2/(n\pi)$» · «Triangular, $8\sin(n\pi/2)/(\pi n)^2$»
- `src/lib/tables/topics/sintesis-sonido.ts:52`, fuente de la tabla 11.1: «W3C, Web Audio API, Recomendación del 17 de junio de 2021, §1.28.6; las mismas recetas en Chromium, periodic_wave_handler.cc L408-L428 (tag 160.0.8168.1)»
- `src/lib/tables/topics/sintesis-sonido.ts:84`, leyenda de la tabla 11.2: «Receta medida de las dos grabaciones: el nivel de cada armónico respecto del fundamental, como promedio de Welch con ventanas de Hann de 0,25 s sobre la ventana de análisis, y el menor y el mayor de esas ventanas. Es una medida mía sobre los originales (cálculo propio), no un valor del producto ni un supuesto: la flauta fluctúa más que el clarinete.»
- encabezados de la tabla 11.2: «Armónico $n$» · «Flauta, $A_n/A_1$ (dB)» · «Flauta, rango (dB)» · «Clarinete en si$\flat$, $A_n/A_1$ (dB)» · «Clarinete en si$\flat$, rango (dB)»
- `src/lib/tables/topics/sintesis-sonido.ts:102`, fuente de la tabla 11.2: «Cálculo propio con un FFT en TypeScript (src/lib/audio/spectrum.ts, pnpm run data:harmonics) sobre Flute.nonvib.ff.Eb4.stereo.aif y BbClarinet.ff.Eb4.stereo.aif del MIS de la University of Iowa»
- `src/lib/tables/topics/sintesis-sonido.ts:126`, leyenda de la tabla 11.3: «Las dos grabaciones del MIS de la University of Iowa y lo que medí en ellas, con el método de la investigación (cálculo propio). Los audios de la figura 11.4 son estos archivos recortados, en mono y a la misma sonoridad.»
- encabezados de la tabla 11.3: «Dato» · «Flauta» · «Clarinete en si$\flat$»
- `src/lib/tables/topics/sintesis-sonido.ts:151`, fuente de la tabla 11.3: «University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), fichas de la flauta y del clarinete en si bemol; medidas: cálculo propio»
- `src/lib/tables/topics/sintesis-sonido.ts:132` y siguientes, filas de la tabla 11.3 (dato · flauta · clarinete):
  - «Archivo del MIS» · «Flute.nonvib.ff.Eb4.stereo.aif» · «BbClarinet.ff.Eb4.stereo.aif»
  - «Intérprete y fecha» · «Sonja Feig, abril de 2000» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998»
  - «Formato del original» · «AIFF de 24 bits a 44 100 Hz, dos canales idénticos» · «AIFF de 24 bits a 44 100 Hz, dos canales idénticos»
  - «Fundamental $f_1$» · «310,34 Hz» · «310,10 Hz»
  - «Periodo $T = 1/f_1$» · «3,222 ms» · «3,225 ms»
  - «Impares sobre pares ($n \le 10$)» · «−0,7 dB» · «25,7 dB»
  - «Correlación de $y(t)$ y $-y(t + T/2)$» · «−0,084» · «0,992»
  - «Ataque, 10 → 90 %» · «0,12 s» · «0,40 s»
  - «Caída, 90 → 10 %» · «0,29 s» · «0,11 s»
  - «Audio publicado» · «desde 0,10 s del original; 2,86 s, MP3 mono a −20 LUFS» · «desde 0,38 s del original; 2,52 s, MP3 mono a −20 LUFS»
  - «Origen de los números» · «Medida propia (cálculo propio)» · «Medida propia (cálculo propio)»
  - «Permiso de uso» · ««may be downloaded and used for any projects, without restrictions», según la página del MIS» · ««may be downloaded and used for any projects, without restrictions», según la página del MIS»
- `src/lib/tables/topics/sintesis-sonido.ts:59`, tabla 11.2, rango del fundamental: «referencia»
- `src/lib/tables/topics/sintesis-sonido.ts:110`, tabla 11.3, palabras del formato: «un canal» · «dos canales» · «idénticos»

### Laboratorio (figura 11.5, tarea 8: `src/components/topics/sintesis-sonido/`)

Todo es nuevo («antes» vacío, —). Los `${…}` salen del estado o de los datos; abajo los escribo como se ven al abrir
(clarinete medido, $f_1$ = 310,1 Hz, $f_s$ = 44 100 Hz). Elecciones de Claude que se ven en el texto:

- **Dónde va.** Cierra el paso 4, tras las tablas 11.2 y 11.3: usa las recetas medidas de ese paso y su interruptor
  «Fases aleatorias» apunta al pie de la figura 11.4 (Helmholtz, decisión R18). Es la figura 11.5, sin insignia.
- **Rótulos de los preajustes** (decisión R8): «(receta clásica)» en las cuatro de la Web Audio API y «(medida:
  grabación MIS)» en las dos medidas, no «producto».
- **Amplitudes de 0 a 1,6**, no de 0 a 1,5 como decía la tarea: el 2.º armónico medido de la flauta vale 1,54 y no
  cabría.
- **Frecuencia de muestreo $f_s$** (8 000, 16 000, 22 050, 44 100 y 48 000 Hz, por omisión 44 100, la de las
  grabaciones): sin ella, con $f_1$ ≤ 880 Hz y diez armónicos, ningún armónico pasaría nunca de $f_s/2$ en un equipo
  normal y la (11.9) no se vería. Con 8 000 Hz y 880 Hz solo suenan 4.
- **Un cursor sobre la forma de onda** marca $y(t)$ y $-y(t + T/2)$ en el mismo instante: es la (11.6) leída en un
  punto, y es el asidero que toda prueba de laboratorio exige.
- **El espectro del laboratorio** dice «Nivel de $A_n$ (dB)», $20\log_{10} A_n$, y no $A_n/A_1$: $A_1$ también se
  mueve y puede valer 0 (con solo pares, el periodo es $T/2$). Con $A_1$ = 1, como en todos los preajustes, es lo
  mismo que en la figura 11.4.
- **Un preajuste es el timbre**: elegirlo no cambia $f_1$, $f_s$ ni las fases aleatorias, y mover $f_1$ no deja el
  preajuste (la nota «Valores modificados…» solo sale al tocar una amplitud).
- **Fases aleatorias** con semilla fija: el primer sorteo es siempre el mismo (servidor, navegador y pruebas), y los
  cuatro primeros cambian a la vista la forma del clarinete (correlación < 0,9).
- **Volumen**: −18 dBFS de pico, con rampas de 30 ms en cada cambio; el navegador normaliza el pico (§1.28.5), así que
  las recetas suenan con el mismo pico y no con la misma sonoridad. Lo dice «Cómo se usa».

Página (`src/content/topics/sintesis-sonido.mdx`):

- `src/content/topics/sintesis-sonido.mdx:369`, pie de la figura 11.5: — → «Laboratorio de síntesis aditiva con la Web
  Audio API: diez amplitudes $A_n$ y la fundamental $f_1$ forman la receta (11.4), que suena como una PeriodicWave
  (11.5) solo después de pulsar «Reproducir»; la forma de onda y el espectro se recalculan con cada control. Los
  preajustes son las recetas clásicas de la tabla 11.1 y las medidas de la tabla 11.2, con sus fases. «Fases
  aleatorias» cambia la forma y deja el espectro; con $f_s$ baja y $f_1$ alta se apagan los armónicos sobre $f_s/2$,
  como pide la (11.9).»
- `src/content/topics/sintesis-sonido.mdx:371`, línea de fuente: — → «Simulación que programé con la Web Audio API
  (W3C, 2021), fuente 1: un OscillatorNode toca la receta como PeriodicWave; recetas clásicas de su §1.28.6 y medidas
  propias de las grabaciones del MIS (tabla 11.2). El pico de −18 dBFS y las frecuencias de muestreo son elecciones
  mías»
- `src/content/topics/sintesis-sonido.mdx:376`, «Qué deja fuera el modelo»: — → «Lo que deja fuera: (1) el ataque y la
  caída, pues la nota suena entera desde el primer instante, sin la envolvente $E(t)$ de la (11.7), y solo entra y
  sale con una rampa de 30 ms para no hacer clic; (2) el ruido del soplido y las fluctuaciones de la flauta, pues la
  receta es periódica y fija, el promedio de la tabla 11.2 y no sus rangos; (3) el vibrato: $f_1$ no oscila; (4) el
  aliasing, pues los armónicos por encima de $f_s/2$ se apagan, como hace Chromium al recortar sus tablas, en lugar de
  plegarse a $|n f_1 - m f_s|$; (5) los armónicos 11 y 12 de las grabaciones y la inarmonicidad de la (11.8).»

Lienzo (`SynthStage.tsx`) y estado del sonido (`synthTexts.ts`, `additiveVoiceEngine.ts`):

- `src/components/topics/sintesis-sonido/SynthLab.tsx:233`, título del laboratorio: — → «Laboratorio de síntesis
  aditiva»
- `src/components/topics/sintesis-sonido/SynthStage.tsx:67`, botón (cambia al pulsarlo): — → «Reproducir» · «Detener»
- `src/components/topics/sintesis-sonido/synthTexts.ts:20`, línea de estado junto al botón: — → «Nada suena hasta que
  pulses «Reproducir».» · «Suena a −18 dBFS de pico; «Detener» lo apaga.» · «Todas las amplitudes que suenan valen 0:
  no se oye nada.»
- `src/components/topics/sintesis-sonido/additiveVoiceEngine.ts:22`, la misma línea si no puede sonar: — → «Este
  navegador no tiene Web Audio: la receta se dibuja, pero no puede sonar.» · «El navegador no dejó empezar el sonido:
  vuelve a pulsar «Reproducir».» · «Este navegador no admite $f_s$ = 8 000 Hz: elige otra frecuencia de muestreo.»
- `src/components/topics/sintesis-sonido/SynthStage.tsx:79`, título de la gráfica del lienzo: — → «Forma de onda que
  suena» (ejes y leyenda, los de las figuras 11.1, 11.3 y 11.4)
- `src/components/topics/sintesis-sonido/SynthStage.tsx:86`, rótulo del cursor: — → «$t$ = 1,00 ms»
- `src/components/topics/sintesis-sonido/synthTexts.ts:65`, nombre accesible de la forma de onda (se oye): — → «Forma de
  onda que suena a 310,1 Hz, cada periodo de T = 3,22 ms. La misma curva medio periodo después e invertida cae sobre
  la original.» (con fases sorteadas añade «, con fases sorteadas»; con el diente de sierra, «La curva medio periodo
  después e invertida es otra: correlación 0,53.»; en silencio, «No suena ningún armónico: es una recta.»)

Parámetros, escenario y ajustes (`SynthLab.tsx`, `synthTexts.ts`, `synthPresets.ts`):

- `src/components/topics/sintesis-sonido/synthTexts.ts:40`, rótulo de cada amplitud: — → «Armónico 1, $A_{1}$» …
  «Armónico 10, $A_{10}$»; sobre Nyquist añade « (sobre $f_s/2$)»
- `src/components/topics/sintesis-sonido/SynthLab.tsx:179`, rótulos: — → «Fundamental $f_1$» · «Frecuencia de
  muestreo $f_s$»; opciones: «8 000 Hz» · «16 000 Hz» · «22 050 Hz» · «44 100 Hz» · «48 000 Hz»
- `src/components/topics/sintesis-sonido/synthTexts.ts:48`, nota de la (11.9) bajo los parámetros: — → «Con $f_s$ =
  44 100 Hz caben bajo $f_s/2$ los diez armónicos: $\lfloor f_s/(2 f_1) \rfloor$ = 71, la (11.9).» · con 8 000 Hz y
  880 Hz: «Con $f_s$ = 8 000 Hz y $f_1$ = 880,0 Hz solo caben 4 armónicos bajo $f_s/2$ (11.9): de $A_{5}$ a $A_{10}$
  no suenan y quedan desactivados, como Chromium quita los parciales que se plegarían.»
- `src/components/topics/sintesis-sonido/synthPresets.ts:64`, opciones del selector de preajustes (texto plano): — →
  «Seno (receta clásica)» · «Cuadrada (receta clásica)» · «Diente de sierra (receta clásica)» · «Triangular (receta
  clásica)» · «Flauta (medida: grabación MIS)» · «Clarinete (medida: grabación MIS)»; sus nombres en «Valores
  modificados a partir de «…»»: «Seno» · «Cuadrada» · «Diente de sierra» · «Triangular» · «Flauta (medida)» ·
  «Clarinete (medido)»
- `src/components/topics/sintesis-sonido/synthPresets.ts:91`, notas de los preajustes: — →
  - «Un solo armónico, $A_1$ = 1: el tono puro de la (11.1).»
  - «Solo impares, $A_n = 1/n$: la segunda mitad de cada periodo es la primera invertida, la (11.6).»
  - «Todos los armónicos, $A_n = 1/n$, con fase $\pi$ en los pares: el signo alterno de la tabla 11.1.»
  - «Solo impares, $A_n = 1/n^2$, con fase $\pi$ en $n$ = 3 y 7: el signo de $\sin(n\pi/2)$ en la tabla 11.1.»
  - (`:87`) «Los diez primeros armónicos de la tabla 11.2, con sus fases, medidos en la flauta de la figura 11.4, a
    310,34 Hz: el más fuerte es el 2.º, pares e impares por igual.»
  - (`:87`) «Los diez primeros armónicos de la tabla 11.2, con sus fases, medidos en el clarinete en si$\flat$ de la
    figura 11.4, a 310,10 Hz: el 3.º supera al fundamental y los pares casi no suenan.»
- `src/components/topics/sintesis-sonido/synthPresets.ts:40`, sus fuentes (tras «Fuente:», enlazadas): — → «W3C, Web
  Audio API, §1.28.6 (tabla 11.1)» · «cálculo propio sobre la grabación del MIS (tabla 11.2)»
- `src/components/topics/sintesis-sonido/SynthLab.tsx:211`, interruptor: — → «Fases aleatorias»
- `src/components/topics/sintesis-sonido/synthTexts.ts:34`, nota bajo el interruptor: — → apagado: «Apagado, cada
  armónico suena con la fase de su receta: la medida, o 0 y $\pi$ en las clásicas.» · encendido: «Fases sorteadas: la
  forma de onda cambia y el espectro no. Para Helmholtz el timbre no depende de las fases, con la ligera salvedad de
  Ellis (pie de la figura 11.4).»
- `src/components/topics/sintesis-sonido/SynthLab.tsx:225`, ajuste del engranaje: — → «Curva $-y(t + T/2)$ sobre la
  forma de onda»

Lecturas y gráfica de apoyo (`SynthLab.tsx`, `synthTexts.ts`):

- `src/components/topics/sintesis-sonido/SynthLab.tsx:55`, lecturas: — → «Fundamental $f_1$» 310,1 Hz · «Periodo
  $T = 1/f_1$» 3,22 ms · «Impares sobre pares, $n \le 10$» 25,7 dB (— cuando falta una paridad o no suena nada) ·
  «Armónico más fuerte, $n$» 3
- `src/components/topics/sintesis-sonido/SynthLab.tsx:243`, título y eje del espectro: — → «Contenido armónico de la
  receta» · «Nivel de $A_n$ (dB)» (el eje $x$, la leyenda y la línea «Impares sobre pares…», los de las figuras)
- `src/components/topics/sintesis-sonido/synthTexts.ts:75`, nombre accesible del espectro (se oye): — → «Espectro de la
  receta, armónicos 1 a 10 en dB: el más fuerte es el 3.º.» (con armónicos sobre Nyquist añade «Del 5.º en adelante
  no suenan: pasan de la mitad de la frecuencia de muestreo.»; en silencio, «ninguno suena.»)

«Cómo se usa» (`src/components/topics/sintesis-sonido/synthTexts.ts:54`): — →

1. «Pulsa «Reproducir» para oír la receta: nada suena antes. Empieza a −18 dBFS de pico con una rampa de 30 ms, y
   «Detener» lo apaga; cada cambio de receta baja el volumen, cambia la onda y lo vuelve a subir en 30 ms.»
2. «Las amplitudes $A_1$ a $A_{10}$ son relativas al $A_1$ = 1 de los preajustes; las barras dan su nivel,
   $20\log_{10} A_n$, que con $A_1$ = 1 es el $A_n/A_1$ de la figura 11.4. $f_1$ cambia la nota y deja la receta: el
   timbre se conserva.»
3. «El navegador normaliza el pico de cada receta (§1.28.5 de la Web Audio API): todas llegan al mismo pico, no a la
   misma sonoridad. La $f_s$ y el nivel de pico son elecciones mías, no valores de un producto.»
4. «Arrastra el cursor de la forma de onda, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %): marca
   $y(t)$ y $-y(t + T/2)$ en el mismo instante. La curva discontinua se quita en los ajustes del engranaje.»

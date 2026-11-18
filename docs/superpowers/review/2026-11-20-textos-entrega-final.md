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

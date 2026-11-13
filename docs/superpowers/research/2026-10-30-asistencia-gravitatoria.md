# Tema 9 — Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible

Investigación (solo lectura del repo). Fecha de acceso de todas las fuentes y consultas: **2026-10-30**
(las respuestas de Horizons llevan sello «Thu Oct 29 23:57 2026 Pasadena», que es 2026-10-30 en UTC).
Convención del archivo `docs/superpowers/research/2026-10-08-sources.md`: valores copiados de la fuente
abierta; «(cálculo propio)» = calculado por mí con los datos de Horizons; «NO CONFIRMADO» = no verificado.
Decimales con coma en el texto; los parámetros de consulta se dejan tal cual.

Archivos de trabajo (scratchpad, no en el repo):
- Datos crudos de Horizons: `.../scratchpad/research/data/voyager/*.txt`
- Escaneos históricos: `.../scratchpad/research/data/history/flandro1966.pdf`, `minovitch_LD-1.pdf`
- Scripts (Python, ejecutados con `python3 -I`): `.../scratchpad/research/scripts/{hz,coarse,encounter,eps,legs,cross,ca,extras,proto_dataset}.py`
- Prototipo del dataset compacto: `.../scratchpad/research/data/proto-voyager-speed.json` (68 217 bytes; 22 KB con gzip)

---

## 1. Recomendación

**Caso de uso recomendado: el diseño y la navegación de trayectorias interplanetarias en JPL, del cálculo
de cónicas empalmadas (Minovitch 1961, Flandro 1966) al servicio JPL Horizons, que publica hoy la
trayectoria de la Voyager 2.** Es verificable de punta a punta con documentos primarios abiertos:

1. El memo técnico de JPL #312-130 (M. A. Minovich, 23 ago 1961) define el método: dentro de una
   «esfera de influencia» de radio ρ* = (m/M)^(2/5)·c solo actúa el planeta y la trayectoria relativa es
   una hipérbola; fuera, solo el Sol (CONFIRMADO, escaneo del memo).
2. Flandro (1966, *Astronautica Acta* 12(4):329) lo aplica a Júpiter y describe la oportunidad
   «grand tour» Tierra–Júpiter–Saturno–Urano–Neptuno de 1978; cita clave: «the intermediate planet
   appears as a field of force moving relative to the inertial heliocentric coordinate system. Thus, work
   is done on the spacecraft, and its heliocentric energy may be increased or decreased» (CONFIRMADO).
3. JPL Horizons (software y API) publica la trayectoria; su cabecera documenta qué modelo físico hay
   detrás de cada tramo (cónicas empalmadas de diseño hasta 1989-08-29; ajuste de 2022 a datos de
   seguimiento con DE440, aceleraciones no gravitatorias y 24 maniobras impulsivas). La gráfica del tema
   sale directamente de esa API, con la consulta registrada.

Por qué gana el modelo físico frente a lo no físico: una trayectoria precalculada/animada o una tabla
«sume Δv en el planeta» no puede responder qué pasa si la sonda llega 1 h tarde o 1000 km más cerca; el
modelo da Δv como función de r_p y v∞ (sin(δ/2) = 1/(1 + r_p v∞²/GM)) y explica incluso el caso de
Neptuno, donde la sonda **perdió** 2,1 km/s (la tabla «el planeta suma velocidad» falla). Lo que cuesta:
integrar n cuerpos, la sensibilidad extrema a las condiciones de llegada (un error en r_p cambia δ y el
destino siguiente), ventanas de lanzamiento raras (la alineación «se da cada ~175 años», NASA) y
maniobras de corrección guiadas por navegación (el ajuste de 2022 tuvo que estimar 24 maniobras para la V2
y 96 para la V1).

**Alternativas:**
- **MONTE (JPL)** — «JPL's signature astrodynamic computing platform», librería Python con núcleo C++,
  «Caltech Proprietary» (CONFIRMADO en montepy.jpl.nasa.gov). Buen ejemplo de software actual, pero
  cerrado: no se puede mostrar su código ni sus ecuaciones con fuente primaria → menos verificable.
- **NASA GMAT (General Mission Analysis Tool)** — código abierto (NASA Open Source Agreement según un
  artículo de 2010 visto solo en buscador). Modelaría el sobrevuelo integrando
  r̈ = −GM_☉ r/r³ + Σ GM_k [(r_k − r)/|r_k − r|³ − r_k/r_k³]. **NO CONFIRMADO**: no pude abrir la
  documentación oficial de ForceModel/PointMasses (gmat.sourceforge.net/docs devuelve 404/403).

---

## 2. Casos de uso candidatos (ordenados)

| # | Caso | Qué calcula el software | Ecuación explícita | Alternativa no física y por qué pierde | Qué se gana / qué cuesta | Estado de fuentes |
|---|---|---|---|---|---|---|
| 1 | **Diseño de trayectorias del Grand Tour en JPL + Horizons** | Hipérbola relativa al planeta empalmada con elipses/hipérbolas heliocéntricas; Horizons publica estados x, y, z, vx, vy, vz | ρ* = (m/M)^(2/5) c (memo 312-130); v = V_p + v_rel; sin(δ/2) = 1/(1 + r_p v∞²/GM_p) | Trayectoria guionizada o «+Δv fijo por planeta»: no generaliza a otra fecha, otro r_p ni explica la pérdida en Neptuno | Gana: predicción, búsqueda de ventanas, presupuesto de combustible casi nulo. Cuesta: precisión (Horizons advierte «rough accuracy» en el tramo de diseño), sensibilidad, correcciones | CONFIRMADO (memo, Flandro, cabecera Horizons, manual Horizons) |
| 2 | MONTE (navegación JPL actual) | Propagación de alta precisión, determinación de órbita, filtros UD/SRIF | (integración n cuerpos; ecuación interna NO CONFIRMADA) | idem | idem + coste computacional y licencia propietaria | Parcial |
| 3 | NASA GMAT | Propagación con masas puntuales y objetivos de B-plane | r̈ arriba (forma estándar, no copiada de GMAT) | idem | Abierto y reproducible; documentación oficial no abierta | NO CONFIRMADO |

---

## 3. Fuentes

| id | Título | Autores | Año | Editor | URL | Estado |
|---|---|---|---|---|---|---|
| horizons | NASA/JPL Horizons On-Line Ephemeris System (datos recuperados 2026-OCT-30) | J. D. Giorgini y JPL Solar System Dynamics Group | 2026 | NASA/JPL | https://ssd.jpl.nasa.gov/horizons/ | CONFIRMADO (formato de cita tomado del manual) |
| horizons-api | Horizons API documentation (v1.2) | JPL SSD | 2026 | NASA/JPL | https://ssd-api.jpl.nasa.gov/doc/horizons.html | CONFIRMADO |
| horizons-manual | Horizons System Manual | J. D. Giorgini (JPL SSD) | 2026 | NASA/JPL | https://ssd.jpl.nasa.gov/horizons/manual.html | CONFIRMADO |
| giorgini-1996 | JPL's On-Line Solar System Data Service. *Bull. AAS* 28(3), 1158 | Giorgini, Yeomans, Chamberlin, Chodas, Jacobson, Keesey, Lieske, Ostro, Standish, Wimberly | 1996 | AAS | (referencia copiada del manual de Horizons; artículo no abierto) | CONFIRMADO como referencia; contenido NO abierto |
| astro-par | Astrodynamic Parameters | JPL SSD (GM de DE440: Park et al. 2021) | 2026 | NASA/JPL | https://ssd.jpl.nasa.gov/astro_par.html | CONFIRMADO |
| minovitch-1961 | A Method For Determining Interplanetary Free-Fall Reconnaissance Trajectories, JPL Technical Memo #312-130 (23 ago 1961) | M. A. Minovich (firma así en el memo) | 1961 | Jet Propulsion Laboratory | http://www.gravityassist.com/Letters/LD-1.pdf (pág. 24 del PDF) | CONFIRMADO (escaneo; alojado en el sitio personal de Minovitch, no en un archivo de NASA) |
| flandro-1966 | Fast Reconnaissance Missions to the Outer Solar System Utilizing Energy Derived from the Gravitational Field of Jupiter. *Astronautica Acta* 12(4), 329–337 | G. A. Flandro | 1966 | Pergamon/IAF | http://www.gravityassist.com/IAF3-2/Ref.%203-143.pdf | CONFIRMADO (escaneo; nota al pie: investigación hecha en JPL, contrato NAS 7-100) |
| nasa-v2 | Voyager 2 (mission page), «Page Last Updated: Sep 28, 2026» | NASA Science | 2026 | NASA | https://science.nasa.gov/mission/voyager/voyager-2/ | CONFIRMADO |
| nasa-v1 | Voyager 1 (mission page), «Page Last Updated: Oct 15, 2026» | NASA Science | 2026 | NASA | https://science.nasa.gov/mission/voyager/voyager-1/ | CONFIRMADO |
| nasa-planetary-voyage | Planetary Voyage, «Page Last Updated: Apr 07, 2025» | NASA Science | 2025 | NASA | https://science.nasa.gov/mission/voyager/planetary-voyage/ | CONFIRMADO |
| nssdca-v2 | Voyager 2 (1977-076A) | NSSDCA | 2026 | NASA GSFC | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1977-076A | CONFIRMADO |
| nssdca-v1 | Voyager 1 (1977-084A) | NSSDCA | 2026 | NASA GSFC | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1977-084A | CONFIRMADO |
| monte | Monte | JPL MDN | s. f. | NASA/JPL | https://montepy.jpl.nasa.gov | CONFIRMADO (solo descripción) |
| gmat | General Mission Analysis Tool | NASA GSFC | — | NASA | (docs oficiales no accesibles) | NO CONFIRMADO |
| serway | Física para ciencias e ingeniería, cap. 13 (gravitación universal) | Serway y Jewett | 2018 | Cengage | (ya en el repo) | — |
| nssdca-saturn-rings | Saturnian Rings Fact Sheet, «Last Updated: 19 April 2022, DRW» | D. R. Williams (NSSDCA) | 2022 | NASA GSFC | https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html | CONFIRMADO 2026-11-12 (§10) |
| nssdca-jupiter-rings | Jupiter Rings Fact Sheet, «Last Updated: 14 October 2015, DRW» | D. R. Williams (NSSDCA) | 2015 | NASA GSFC | https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupringfact.html | CONFIRMADO 2026-11-13 (§10; no se cita en la página) |
| nssdca-neptune-rings | Neptunian Rings Fact Sheet (enlazada desde la *Neptune Fact Sheet*) | D. R. Williams (NSSDCA) | — | NASA GSFC | https://nssdc.gsfc.nasa.gov/planetary/factsheet/nepringfact.html | CONFIRMADO 2026-11-13 (§10; no se cita en la página) |
| nssdca-uranus-rings | Uranus Rings Fact Sheet, «Last Updated: 14 October 2015, DRW» | D. R. Williams (NSSDCA) | 2015 | NASA GSFC | https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html | CONFIRMADO 2026-11-12 (§10; no se cita en la página) |

Citas textuales útiles (≤ 25 palabras):
- Horizons, cabecera V2: «A patched conic mission-design type trajectory in which the conics were constructed to approximately match specific events (such satellite encounters), providing a rough accuracy.» (tramo 1977-Aug-20 a 1989-Aug-29)
- Horizons, cabecera V2: «Refit of tracking data spanning 1989-1992 … Produced in 2022 by R. Jacobson (former Voyager navigation) using DE440» (tramo 1989-Aug-29 a 2100-Jan-1); estima «24 impulsive maneuvers».
- Horizons, cabecera V1: tramo de diseño 1977-Sep-5 a 1981-Jan-1; ajuste 2022 desde 1981-Jan-1, «96 impulsive maneuvers through Feb 1992».
- Minovich 1961: «When the vehicle (treated as a particle) is inside a "sphere of influence" … only the field of this body influences its motion.»
- Manual Horizons, formato de cita: Giorgini, JD and JPL Solar System Dynamics Group, NASA/JPL Horizons On-Line Ephemeris System, https://ssd.jpl.nasa.gov/horizons/, data retrieved 2026-OCT-30.
- NASA Planetary Voyage: «This layout of Jupiter, Saturn, Uranus and Neptune, which occurs about every 175 years».

Datos publicados por NASA para contrastar:
- V2 (nasa-v2): Júpiter «22:29 UT July 9, 1979, at a range of about 400,785 miles» (~645 000 km);
  Saturno «01:21 UT Aug. 26, 1981 … about 63,000 miles» (~101 000 km); Urano «17:59 UT Jan. 24, 1986 …
  50,640 miles» (~81 500 km); Neptuno «Aug. 25, 1989, at 03:56 UT … 2,980 miles (4,800 kilometers)» sobre
  las nubes. Masa «1,592 pounds (721.9 kilograms)». nasa-planetary-voyage da para Neptuno «about 4,950
  kilometers (3,000 miles) above Neptune's north pole».
- V1 (nasa-v1): lanzamiento «Sept. 5, 1977 / 12:56:01 UT»; Júpiter «12:05 UT on March 5, 1979, at a range
  of 174,000 miles (280,000 km)»; Saturno «23:46 UT on Nov. 12, 1980, at a range of about 78,000 miles
  (126,000 km)».
- NSSDCA: V2 «about 3.13 AU/year»; V1 «about 3.50 AU/year»; masa de ambas «721.9 kg».

---

## 4. Consultas a Horizons (parámetros exactos) y lo que devolvieron

Endpoint `https://ssd.jpl.nasa.gov/api/horizons.api`, GET. Parámetros comunes:
```
format=text  OBJ_DATA='YES'  MAKE_EPHEM='YES'  EPHEM_TYPE='VECTORS'  VEC_TABLE='2'
REF_PLANE='ECLIPTIC'  REF_SYSTEM='ICRF'  OUT_UNITS='KM-S'  CSV_FORMAT='YES'  VEC_LABELS='NO'
```
| Archivo | COMMAND | CENTER | START / STOP | STEP_SIZE | Filas |
|---|---|---|---|---|---|
| v2_helio_1d | '-32' | '500@10' | 1977-08-21 / 1990-01-01 | '1 d' | 4517 |
| v1_helio_1d | '-31' | '500@10' | 1977-09-06 / 1982-01-01 | '1 d' | 1579 |
| {v2_jup,v2_sat,v2_ura,v2_nep,v1_jup,v1_sat}_{pc,helio,planet_helio}_1h | -32/-31 y 599/699/799/899 | '500@599' etc. (pc), '500@10' | CA ±~10 d (p. ej. 1979-06-29 / 1979-07-20) | '1 h' | 505 c/u |
| *_pc_1m (+ TIME_TYPE='UT', OBJ_DATA='NO') | -32/-31 | '500@planeta' | CA ±2–3 h | '1 m' | 241–301 |

Lo que confirma la salida:
- **Unidades/marco**: «Output units: KM-S», «Output type: GEOMETRIC cartesian states», «Reference frame:
  Ecliptic of J2000.0», tiempo TDB (por defecto en vectores; con TIME_TYPE='UT' se obtiene UT).
- **Cobertura**: V2 «No ephemeris … prior to A.D. 1977-AUG-20 15:32:32.1830 TDB»; V1 «prior to A.D.
  1977-SEP-05 13:59:24.3830 TDB». Ojo: el TIMELINE de la cabecera de V1 dice «1977-Sep-06 Launch» pero
  NASA y NSSDCA dicen 5 sep 1977 (errata de la cabecera).
- **Fuentes**: «Voyager_2_ST+refit2022_m», «Voyager_1_ST+refit2022_m»; planetas jup365_merged,
  sat441l, ura184_merged, nep098_merged; Sol DE441.
- **Pasos permitidos** (doc API): días `d`, horas `h`, minutos `m`, meses/años de calendario, o un
  entero sin unidad = número de intervalos (único modo para < 1 min). No hay límite de filas ni de tasa
  documentado.
- **Consistencia** (cálculo propio): v_helio − (v_planeta-céntrica + V_planeta) < 2×10⁻⁵ km/s en todas las
  ventanas.
- **GM y radios** impresos por Horizons (OBJ_DATA): Júpiter GM = 126686531,900 km³/s², R_eq = 71492 km,
  masa 18,9819×10²⁶ kg; Saturno 37931206,234, 60268 km; Urano 5793950,6103, 25559 km; Neptuno
  6835099,97, 24766 km (polar 24342 km). GM_☉ = 1,32712440041279419×10²⁰ m³/s² (astro_par, DE440);
  GM de sistemas (DE440): Júpiter 126712764,1; Saturno 37940584,8418; Urano 5794556,4; Neptuno
  6836527,10058 km³/s². Uso los de cuerpo (Horizons) para el marco planetocéntrico.

---

## 5. Números clave (Voyager 2; todo cálculo propio con datos de Horizons salvo «NASA»)

| Encuentro | Máxima aproximación (UT, paso 1 min) | r_p desde el centro | Altura sobre R_eq (NASA) | v∞ entrada / salida (km/s) | δ | v_☉ antes → después (cónicas empalmadas) | Δ\|v\| cónicas | Δ\|v\| datos (vis-viva) | Δ\|v\| datos (±30 d) | \|Δv⃗\| = 2v∞ sin(δ/2) |
|---|---|---|---|---|---|---|---|---|---|---|
| Júpiter | 1979-07-09 22:29 | 721 375 km (10,09 R_J) | 649 883 km (NASA ~645 000) | 7,639 / 7,579 | 97,5° | 9,59 → 19,50 | +9,91 | +10,22 | +9,98 | 11,45 |
| Saturno | 1981-08-26 03:24 | 160 691 km (2,67 R_S) | 100 423 km (NASA ~101 000) | 10,675 / 10,675 | 84,8° | 15,34 → 20,26 | +4,92 | +4,94 | +4,82 | 14,40 |
| Urano | 1986-01-24 17:59 | 107 154 km (4,19 R_U) | 81 595 km (NASA ~81 500) | 14,732 / 14,732 | 23,0° | 17,84 → 19,70 | +1,86 | +1,87 | +1,82 | 5,88 |
| Neptuno | 1989-08-25 03:56 | 29 240 km (1,18 R_N) | 4 474 km sobre R_eq; 4 898 km sobre R_polar (NASA 4 800 / 4 950) | 16,743 / 16,742 | 54,2° | 18,82 → 16,68 | **−2,13** | −2,12 | −2,15 | 15,23 |

Voyager 1 (mismo método): Júpiter 1979-03-05 12:05 UT, r_p = 348 436 km (4,87 R_J; altura 276 944 km,
NASA 280 000), v∞ 10,765/10,772, δ = 98,6°, 12,61 → 23,33 (+10,72; vis-viva +10,93); Saturno 1980-11-12
23:46 UT, r_p = 184 031 km (altura 123 763 km; NASA 126 000), v∞ 15,169 → 15,110, δ = 56,6°, +1,49
(vis-viva +1,50). Las horas de máxima aproximación coinciden al minuto con NASA, salvo Saturno-V2: NASA
dice 01:21 UT y Horizons da 03:24 UT → **discrepancia NO RESUELTA** (usar la de Horizons y citarla así).

Definiciones (para que el texto no mezcle cosas):
- «Δ|v| vis-viva» = √(2(ε_después + GM_☉/r_enc)) − √(2(ε_antes + GM_☉/r_enc)), con ε = v²/2 − GM_☉/r
  tomada 120 d antes y después: es el salto «limpio» a la distancia del encuentro.
- «±30 d» = |v| a CA+30 d menos |v| a CA−30 d, directo de la serie (incluye frenado solar).
- Durante el sobrevuelo la rapidez heliocéntrica tiene un **pico** (la sonda está en el pozo del planeta):
  V2 llega a 26,87 km/s (Júpiter), 32,45 (Saturno), 22,05 (Urano), 27,86 (Neptuno) en la serie horaria;
  el salto neto es lo que queda al salir. Con paso diario el pico aparece como un diente de sierra.

**Escape solar** (ε_☉ > 0 ⇔ v > √(2GM_☉/r)):
- V2: antes de Júpiter ε_☉ ≈ −121,6 km²/s² (ligada: a = 3,64 UA, e = 0,727, perihelio 0,997 UA, afelio
  6,29 UA, periodo 6,96 años — «sin Júpiter» habría vuelto). ε_☉ cruza 0 el **1979-07-09 entre 09:00 y
  10:00 TDB** (v = 18,52 > v_esc = 18,25 km/s), ~13 h antes de la máxima aproximación. Tras Júpiter
  ε_☉ ≈ +25,5 a +27,6 (hiperbólica): a la distancia de Júpiter, 19,7 km/s > 18,26 km/s de escape.
- V1: cruza 0 el 1979-03-04 entre 18:00 y 19:00 TDB.
- Velocidad de exceso respecto al Sol, v∞,☉ = √(2ε_☉): V2 7,18 km/s (1980) → 15,04 (1983) → 17,21 (1987)
  → **14,86 km/s = 3,134 UA/año (1989-12)**, que coincide con NSSDCA «about 3.13 AU/year» (= 14,84 km/s).
  V1 tras Saturno: 16,63 km/s = 3,51 UA/año vs NSSDCA «3.50 AU/year». Buena prueba de coherencia.

**Esfera de influencia** r_SOI = a (m/M)^(2/5) (con a = distancia al Sol en el encuentro): Júpiter
4,94×10⁷ km (691 R_J), Saturno 5,49×10⁷ km (911 R_S), Urano 5,16×10⁷ km (2018 R_U), Neptuno 8,71×10⁷ km
(3516 R_N). A 7,6 km/s la V2 tarda ~2 meses en cruzar la de Júpiter.

**Retroceso de Júpiter** (m Δv⃗ = −M ΔV⃗): m = 721,9 kg (NASA), M_J = 1,89819×10²⁷ kg (Horizons),
|Δv⃗| = 11,45 km/s ⇒ ΔV_J = 4,4×10⁻²¹ m/s; en un año eso desplaza a Júpiter 1,4×10⁻¹³ m
(0,14 pm: unas mil veces menos que el tamaño de un átomo, ~10⁻¹⁰ m). (cálculo propio)

---

## 6. Verificación en el marco del planeta (la afirmación central)

Energía específica ε_p = v²/2 − GM_p/r en el marco planetocéntrico, a lo largo de ±10 d (cálculo propio):
- Saturno, Urano, Neptuno (V2): v∞ de entrada y salida iguales a 10⁻³ km/s (10,6747/10,6748;
  14,7323/14,7324; 16,7434/16,7426). **Se cumple |v∞,in| = |v∞,out|; solo gira la dirección.**
- Júpiter (V2): 7,639 → 7,579 km/s (−0,8 %). ε_p cambia entre el 9 jul 00 h y el 10 jul 02 h: la
  trayectoria de diseño se ajustó a encuentros con lunas («conics … constructed to approximately match
  specific events (such satellite encounters)»). Interpretación propia: las lunas galileanas también hacen
  trabajo sobre la sonda en el marco de Júpiter. NO CONFIRMADO cuál luna.
- Saturno (V1): 15,169 → 15,110 km/s; el salto de ε_p ocurre el 12 nov entre 05 h y 07 h, horas antes de la
  máxima aproximación a Saturno (23:46): es el **sobrevuelo de Titán** (una asistencia dentro de otra).
  Hora exacta del sobrevuelo de Titán: NO CONFIRMADO con fuente NASA.
- Neptuno: una sola muestra en la máxima aproximación baja 0,5 km²/s²; probablemente el GM de Neptuno usado
  en el diseño de 1989 difiere del actual (~0,2 %) o achatamiento. NO CONFIRMADO.
- El ángulo δ medido entre las velocidades extremas de la ventana coincide con el de la fórmula:
  Saturno 84,78° vs 84,83°, Urano 23,01° vs 23,01°, Neptuno 54,02° vs 54,21°, Júpiter 95,8° vs 97,5° (la
  ventana de ±10 d no llega a las asíntotas en Júpiter).

**Advertencia de honestidad**: antes de 1989-08-29 (V2) y 1981-01-01 (V1) la trayectoria de Horizons ES
una trayectoria de diseño por cónicas empalmadas, así que |v∞,in| = |v∞,out| está en parte «construido».
Lo que sí es independiente: (a) la coherencia con 3,13 UA/año medida tras Neptuno (tramo ajustado a
seguimiento), (b) las horas y distancias de NASA. El texto debe decir «trayectoria de diseño de la misión
publicada por JPL Horizons», no «trayectoria medida».

---

## 7. Física en 4 pasos (estilo de la casa)

**Paso 1 — Modelo simple: solo el Sol.**
F = G M_☉ m / r² (N), U = −G M_☉ m / r (J). Sin otras fuerzas, E = ½ m v² − G M_☉ m / r se conserva:
½ v² − GM_☉/r = ε (J/kg = m²/s²), equivalente a vis-viva v² = GM_☉ (2/r − 1/a).
Con los datos: entre Júpiter y Saturno ε_☉ ≈ 25,5–26 km²/s² casi constante mientras v cae de 19,89 km/s
(5,46 UA) a 15,56 km/s (9,43 UA). Verificación: a 6,23 UA, v = √(2(26,32 + 142,4)) = 18,37 km/s vs 18,375
de Horizons (cálculo propio). Conclusión: la sonda «sube la cuesta» del Sol y se frena; con solo el Sol,
ningún sobrevuelo podría añadir energía, y la órbita de partida (afelio 6,29 UA) nunca escapaba.

**Paso 2 — Por qué no basta: el marco del planeta.**
Dentro de r_SOI ≈ a (m_p/M_☉)^(2/5) domina el planeta. En su marco (aprox. inercial durante las horas del
encuentro) la energía se conserva: ½ v∞,in² = ½ v∞,out² ⇒ |v∞,in| = |v∞,out|. La hipérbola tiene
e = 1 + r_p v∞²/GM_p y gira la velocidad un ángulo δ con sin(δ/2) = 1/e = 1/(1 + r_p v∞²/GM_p).
V2 en Júpiter: v∞ = 7,616 km/s, r_p = 721 375 km, GM_J = 1,26687×10⁸ km³/s² ⇒ e = 1,330, δ = 97,5°.
En el marco del planeta la sonda **no gana rapidez**.

**Paso 3 — Lo que falta: volver al marco del Sol.**
v⃗ = V⃗_p + v⃗_rel. Girar v⃗_rel sin cambiar su módulo cambia |v⃗|. |Δv⃗| = 2 v∞ sin(δ/2) = 11,45 km/s.
Júpiter: V_p = 12,749 km/s, ángulo entre V⃗_p y v⃗∞,in = 131,5°, entre V⃗_p y v⃗∞,out = 34,6° ⇒
|v_in| = √(V_p² + v∞² + 2V_p v∞ cos θ) = 9,59 km/s → |v_out| = 19,50 km/s: +9,91 km/s.
La energía viene del planeta: m Δv⃗ = −M ΔV⃗ ⇒ Júpiter pierde 4,4×10⁻²¹ m/s. Si la sonda pasa «por
delante» del planeta (v⃗∞,out gira en contra de V⃗_p) pierde rapidez: Neptuno, −2,13 km/s, porque el paso
sobre el polo norte se eligió para ver Tritón (NASA describe el paso «above Neptune's north pole»; que
el motivo fuera Tritón: NO CONFIRMADO en las páginas abiertas → verificar antes de afirmarlo).

**Paso 4 — Modelo mejorado / qué muestran los datos.**
Cónicas empalmadas vs datos (Δ|v|): Júpiter +9,91 vs +10,22 (vis-viva) / +9,98 (±30 d); Saturno +4,92 vs
+4,94; Urano +1,86 vs +1,87; Neptuno −2,13 vs −2,12. Error < 0,4 % salvo Júpiter (~3 %), donde el cruce
de la SOI dura ~2 meses y el planeta sigue tirando: ε_☉ después de Júpiter baja de 35,2 (ago 1979) a 25,5
km²/s² (1981) — la sonda sigue «pagando» la subida desde Júpiter mucho después. Entre encuentros la serie
sigue vis-viva. Modelo mejorado = integrar n cuerpos (Sol + planetas + lunas): r̈ = −GM_☉ r⃗/r³ +
Σ_k GM_k [(r⃗_k − r⃗)/|r⃗_k − r⃗|³ − r⃗_k/r_k³].

---

## 8. Gráfica y laboratorio

**Gráfica prescrita** (VISUALIZACIÓN DE DATOS):
- Panel principal: rapidez heliocéntrica |v| (km/s) vs fecha, 1977-08 → 1990-01, V2 (línea principal) y V1
  hasta 1981-12 (secundaria, más tenue). Marcas en Júpiter, Saturno, Urano, Neptuno con etiqueta Δ|v|
  (+10,2 / +4,9 / +1,9 / −2,1 km/s, vis-viva) y fecha/hora UT.
- Curva de rapidez de escape √(2GM_☉/r(t)) evaluada en la posición de la sonda (línea discontinua); el área
  donde |v| > v_esc se sombrea suave: queda claro que tras Júpiter la V2 ya es hiperbólica.
- Línea contrafactual «solo el Sol, sin Júpiter» (Kepler desde el estado de 1979-01-01: a = 3,64 UA,
  e = 0,727): la rapidez seguiría bajando hasta 6,21 km/s en el afelio (6,29 UA) y volvería.
- Segundo panel (opcional): distancia al Sol (UA) con el mismo eje de tiempo.
- Zoom (inset o modo detalle): ventana horaria ±5 d alrededor de cada encuentro, para ver el pico y el
  salto neto.
- Nota de fuente al pie: «Datos: NASA/JPL Horizons (Giorgini y JPL SSD), consultados 2026-10-30;
  trayectoria de diseño hasta 1989-08-29 y ajuste de 2022 a datos de seguimiento después» + parámetros.
- Colores con significado: Júpiter/Saturno/Urano/Neptuno con su color real (Urano cian pálido, Neptuno
  azul intenso, Júpiter ocre, Saturno arena); Sol (escape) amarillo/ámbar.

**Laboratorio compañero (marco del planeta, 2D)**: deslizar r_p (1–100 R_J) y el lado de paso
(detrás/delante), con presets reales; mostrar la hipérbola, v⃗∞,in, v⃗∞,out, V⃗_p y el triángulo de
velocidades. Números V2-Júpiter: V_p = 12,749 km/s, v∞ = 7,616 km/s, θ_in = 131,5°, GM_J = 126 686 531,9
km³/s², R_J = 71 492 km. Tabla (cálculo propio, plano):

| r_p | e | δ | \|Δv⃗\| | v_out paso por detrás | v_out paso por delante |
|---|---|---|---|---|---|
| 1 R_J | 1,033 | 151,1° | 14,75 | 20,09 | 16,21 |
| 2 R_J | 1,066 | 139,6° | 14,30 | 20,32 | 14,98 |
| 5 R_J | 1,164 | 118,5° | 13,09 | 20,24 | 12,41 |
| 10,09 R_J (real) | 1,330 | 97,5° | 11,45 | 19,53 | 9,65 |
| 20 R_J | 1,655 | 74,4° | 9,21 | 18,05 | 6,77 |
| 50 R_J | 2,637 | 44,6° | 5,78 | 15,20 | 5,18 |
| 100 R_J | 4,273 | 27,1° | 3,56 | 13,12 | 6,31 |

(v_in = 9,59 km/s; cota superior V_p + v∞ = 20,37 km/s). Lección: acercarse más no siempre da más
(máximo cerca de 2 R_J para este v∞ y este ángulo de llegada) y el lado de paso decide ganar o perder.
Presets: V2 Júpiter, Saturno, Urano, Neptuno (con sus V_p, v∞, r_p, δ de la tabla §5) y V1 Júpiter.
Requisitos de la casa: controles de reproducción, línea de tiempo, ajustes y presets (no solo deslizador).

**Pipeline reproducible propuesto** (`scripts/generate-voyager-speed.ts`, como `generate-drone-route.ts`):
1. Peticiones a la API (parámetros comunes de §4), una por bloque: base heliocéntrica con STEP_SIZE='5 d'
   (V2 1977-08-21→1990-01-01; V1 1977-09-06→1982-01-01) + ventanas horarias ±5 d alrededor de cada máxima
   aproximación (6 ventanas, '1 h'); opcional: ventanas planetocéntricas para el laboratorio.
2. Guardar en el JSON: `query` (todos los parámetros y URL), `retrieved` (fecha), la línea `source:` de la
   cabecera, `GM_sun`, y por punto [JD_TDB − 2443000, |v| km/s con 3 decimales, r UA con 4 decimales];
   calcular v_esc en el cliente o guardarla.
3. Prototipo con este plan: 1955 puntos V2 + 841 V1 = **68 KB** (22 KB gzip), conserva los picos (26,868;
   32,447; 22,049; 27,862 km/s).
4. Validar el JSON con un esquema (zod) y probar en vitest: saltos de ±signo esperado, ε_☉ < 0 antes de
   Júpiter y > 0 después, 3,13 UA/año al final.

---

## 9. Trampas

- **Tramo de diseño ≠ seguimiento** (ver §6). No llamar «medida» a la trayectoria de 1977–1989.
- **TDB vs UT**: los vectores salen en TDB por defecto (~50 s de diferencia en 1979); para horas de máxima
  aproximación usar TIME_TYPE='UT'.
- **Pico durante el sobrevuelo**: la rapidez heliocéntrica máxima (p. ej. 32 km/s en Saturno) no es el
  salto; el salto es la diferencia de antes y después. Con paso diario el pico depende del muestreo.
- **Cómo medir el salto**: con ventanas cortas (±10 d) el salto en Júpiter sale +11,15 (aún dentro de la
  SOI); con ±120 d sale +7,8 (incluye el frenado solar). Usar vis-viva a la distancia del encuentro y
  explicarlo.
- **Neptuno resta**: la gráfica debe mostrar el salto negativo, no esconderlo.
- **El cruce de escape** de la V2 ocurre durante el sobrevuelo (13 h antes de la máxima aproximación), cuando
  la sonda está en el pozo de Júpiter; el dato robusto es ε_☉ antes (−121,6) y después (+25,5).
- **Distancias de NASA** son alturas sobre las nubes y redondeadas; Horizons da distancia al centro.
- **Errata Horizons**: cabecera de V1 «1977-Sep-06 Launch» (es 5 sep). Hora de Saturno-V2 en NASA (01:21) ≠
  Horizons (03:24).
- **Minovitch**: firma «Minovich» en el memo; el memo está alojado en su sitio personal. Hay disputas de
  prioridad (Wikipedia menciona publicaciones previas): no afirmar que «inventó» la asistencia; decir
  «calculó en JPL en 1961».
- **GM**: usar el del cuerpo (Horizons) en el marco planetocéntrico; el de sistema (DE440) en el
  heliocéntrico si se modelan los planetas como masas puntuales.
- **GMAT**: no citar ecuaciones de GMAT sin abrir su documentación oficial.

---

## 10. Anillos de Saturno y detalles «ilustrativos» del marco del planeta (D2, 2026-11-12)

Fuente primaria abierta y leída el 2026-11-12: NSSDCA, *Saturnian Rings Fact Sheet* (D. R. Williams,
V1.0 del 17-07-1995, «Last Updated: 19 April 2022, DRW»),
https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html. Radio ecuatorial de referencia
60 268 km (el mismo de Horizons en `planets.ts`).

| Borde | km | R_S (hoja) | Profundidad óptica | Albedo |
|---|---|---|---|---|
| C interior | 74 658 | 1,239 | 0,05–0,35 | 0,12–0,30 |
| C exterior | 91 975 | 1,526 | 0,05–0,35 | 0,2 |
| B interior | 91 975 | 1,526 | 0,4–2,5 | 0,4–0,6 |
| B exterior | 117 507 | 1,950 | 0,4–2,5 | 0,4–0,6 |
| División de Cassini | (entre B y A) | 1,950–2,030 | 0–0,1 | 0,2–0,4 |
| A interior | 122 340 | 2,030 | 0,4–1,0 | 0,4–0,6 |
| A exterior | 136 780 | 2,270 | 0,4–1,0 | 0,4–0,6 |

Confirmación de las cifras de la auditoría (§8): las de radios (1,24; 1,95–2,03; 2,27 R_S) se
confirman. **Dos cifras en km no coinciden con la hoja**: el borde interior del C es **74 658 km**,
no 74 490 (74 510 km es el borde exterior del anillo D), y el exterior del A, **136 780 km**, no
136 775. Se usan las de la hoja. Se omiten los anillos tenues D, F, G y E y los huecos de menos de
1 000 km (Encke, Keeler), que la hoja da solo por su radio interior.

r_p de los presets (Horizons, `src/data/voyager-speed.json`): V2 160 691 km = **2,67 R_S**; V1
184 031 km = **3,05 R_S** (la auditoría decía 3,09, que sale de sumar el radio a la cifra
redondeada de NASA para la V1, «126 000 km»: (126 000 + 60 268)/60 268 = 3,09; el laboratorio usa
la distancia al centro de Horizons). Ambas por fuera del borde del A (2,27 R_S), a
0,40 y 0,78 R_S (24 000 y 47 000 km). El laboratorio lo muestra a escala y `planetRings.test.ts` lo
fija a ×1, ×2, ×4 y ×8.

Decisiones de honestidad del dibujo:

- **Plano**: los anillos se dibujan como círculos en el plano del sobrevuelo (abatidos), no como su
  proyección, que sería una elipse de semiejes R y R·cos i con una inclinación i que el modelo plano
  no tiene. El círculo conserva la distancia al centro, que es lo que se compara con r_p; la nota
  «Qué deja fuera» lo dice.
- **Color**: B y A con el token `--saturn`; C más oscuro (`color-mix` con negro al 70 %) porque su
  albedo es menor (0,12–0,30 frente a 0,4–0,6). La división de Cassini queda vacía en el dibujo
  (profundidad óptica 0–0,1).
- **Urano**: hoja *Uranus Rings Fact Sheet* (D. R. Williams, «Last Updated: 14 October 2015»): anillo ε
  a 51 149 km = 2,006 R_U, de 20 a 96 km de ancho y albedo ~0,018; oblicuidad 97,77° (*Uranus Fact Sheet* de la
  NSSDCA). **No se dibujan**: el ε mediría menos de 1 px incluso a ×8 (habría que inventarle el
  ancho) y el eje tumbado necesita la orientación 3D que el modelo plano no tiene.
- **Júpiter (bandas, Gran Mancha Roja) y el tono de Neptuno**: no se dibujan bandas (el lienzo mira
  el plano del sobrevuelo desde su normal, y el modelo no sabe qué cara del planeta se vería); los
  colores de los planetas se declaran «ilustrativos» en la nota.
- **Anillos de Júpiter y Neptuno** (ronda 1, leídos el 2026-11-13): *Jupiter Rings Fact Sheet*
  (actualizada el 14-10-2015): halo 1,25–1,72 R_J, principal 1,72–1,80 R_J (123 000–128 940 km),
  anillos de gasa de Amaltea y Tebe hasta 3,92 R_J, todos con profundidad óptica de 10⁻⁷ a 5·10⁻⁶.
  *Neptunian Rings Fact Sheet*: Galle ~41 900 km = 1,692 R_N (~2 000 km de ancho, profundidad
  ~0,0001), LeVerrier 2,148 R_N (< 100 km), Lassell ~4 000 km de ancho (~0,0001), Arago 2,310 R_N
  (< 100 km) y Adams 62 933 km = 2,541 R_N (~15 km, 0,01–0,1, con sus arcos). La V2 en Neptuno pasa
  a 1,18 R_N, **por dentro** de todos ellos (dato que no se pone en la página: necesitaría otra
  fuente numerada). No se dibujan: los de Júpiter y los anchos de Neptuno son casi transparentes, y
  los estrechos de Urano y Neptuno (≤ 100 km) medirían menos de 1 px a ×8. La nota da a cada omisión
  su razón: bandas y eje dependen de desde dónde se mire; los anillos de Júpiter, Urano y Neptuno son
  «muy tenues o muy estrechos para verse a esta escala» (sin cifras, así que sin fuente nueva).
- **Legibilidad sobre los anillos** (ronda 1): la pista, el tramo recorrido y la línea discontinua de
  r_p van sobre un borde del color de la superficie (1,5 px a cada lado, con los mismos guiones):
  sin él, sobre el C y el B, el gris y el acento quedaban entre 1,06 y 1,9:1.

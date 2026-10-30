# Tema 8 — Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada

Investigación de fuentes, 2026-10-30. Concepto: conservación del momento angular y torque. Recurso prescrito: **DIAGRAMA**.

Convenciones de esta nota (mismo estándar que `docs/superpowers/research/2026-10-08-sources.md`):

- Fecha de acceso de todas las fuentes: **2026-10-30**.
- Cada número sale de la fuente abierta (PDF descargado, página web o código clonado). Las citas textuales van en el idioma original.
- Lo calculado por mí lleva la marca **(cálculo propio)**; el script está en `scratchpad/research/scripts/rw_calc.py`.
- **NO CONFIRMADO** = no se encontró ni se abrió la fuente primaria.
- Descargas (datos no confiables; no se ejecutó nada de ellas) en `scratchpad/research/data/ruedas/` (`pdf/`, `html/`, `42/`, `basilisk/`).
- En la prosa de esta nota los decimales van con coma. El código y las citas en inglés se dejan tal cual.

---

## 1. Recomendación

**Caso de uso recomendado: «42», el simulador de naves espaciales de código abierto del NASA Goddard Space Flight Center (Eric Stoneking).** Como evidencia de misión van dos casos: **Kepler → K2** (la NASA salvó la misión modelando el torque de la presión de radiación solar) y **Hubble** (descarga del momento con magnetopares).

Por qué este caso:

1. **Todo el tema está escrito en unas 40 líneas de C.** Las líneas que valen en el commit fijado son estas:
   - la rueda: `W->Hdot = W->Trq`, o sea dL_w/dt = τ;
   - la nave: `WhlTorq[i]-=S->Whl[j].Trq*S->Whl[j].A[i]`, el −τ de la tercera ley;
   - la saturación: `if (W->Trq > 0.0 && W->H >= W->Hmax) W->Trq = 0.0;`;
   - el magnetopar: `MTB->Trq = M (A × B)`, o sea τ = m × B;
   - la ley de descarga del software de vuelo: `AC->MTB[i].Mcmd = C->Kunl*HxB[i]`, con m ∝ (H_w − H_cmd) × B.

   Así, cada paso del modelo (1 a 4) tiene su línea de código.
2. **La fuente y la licencia se pueden verificar.** Es un software de la NASA bajo la «NASA Open Source Agreement Version 1.3» (`License/`). En el README dice: «Its primary purpose is to support design and validation of attitude control systems, from concept studies through integration and test.» La forma de citarlo viene en el propio repositorio (designación NASA GSC-16720-1).
3. **Se ve claro qué se gana y qué cuesta modelar la física.** Las alternativas no físicas («girar N grados durante t segundos» en lazo abierto, una tabla de ángulos fijos o una maniobra con guion) fallan en tres cosas:
   - no ven la inercia real ni sus errores (Dougherty 1988: la realimentación existe «to account for variances in parameters such as the vehicle inertia estimate»);
   - no ven los torques externos que se acumulan en la rueda;
   - no saben cuándo la rueda se satura.

   Kepler y Hubble muestran el costo de no ver esto, y JWST muestra el costo de tener que verlo (combustible).

**Alternativa 1: Basilisk** (AVS Lab, CU Boulder, licencia ISC). Tiene un efector de rueda con saturación de torque, de potencia y de velocidad, explícitas en `ConfigureRWRequests`. También trae módulos de descarga con magnetopares (`mtbMomentumManagementSimple`, τ = −K_p h_ruedas) y con propulsores (`thrMomentumManagement`). Su código es más moderno y está mejor documentado, pero es menos «NASA» como relato.

**Alternativa 2: la operación de Kepler/K2** como sistema (software de vuelo y operaciones de Ball/NASA Ames). Es el mejor relato, pero no tiene código público. Conviene que sea la motivación del tema dentro del paso 3 o 4, no el producto.

---

## 2. Casos de uso candidatos, ordenados

| # | Caso | Qué calcula | Ecuación explícita en el código | Por qué la física le gana a lo no físico | Qué cuesta |
|---|---|---|---|---|---|
| 1 | **42 (NASA GSFC)** | Dinámica de actitud de la nave y de sus ruedas, actuadores (ruedas, magnetopares, propulsores) y software de vuelo de ejemplo con control PD y gestión del momento | Ḣ_w = τ; nave: τ_nave = τ_ext − ω×H − Σ τ_w â; saturación: τ = 0 si \|H\| ≥ H_max en el mismo sentido; τ_MTB = M (â × B); m_cmd = K_unl (H_err × B) | Un temporizador «gira 90° en 60 s» no sabe que Δθ_s depende de I_s/I_w. Tampoco ve que el gradiente de gravedad y la presión solar llenan la rueda, así que no puede prever la saturación ni programar la descarga | Sensores de actitud (giróscopos, seguidores de estrellas, magnetómetro), lazos de control y ganancias que hay que ajustar, magnetopares o propulsores para descargar, y modelar fricción, vibración y campo magnético |
| 2 | **Basilisk (AVS Lab, CU Boulder)** | Igual, en C/C++ con Python. El efector de rueda acopla Ω̇ con ω̇ de la nave | Ω̇ = (u + τ_fric)/J_s − ĝ_s·ω̇_BN; u se recorta a ±u_max, a P_max/Ω y a 0 si \|Ω\| ≥ Ω_max y u acelera la rueda; descarga τ = −K_p h_ruedas | Igual que 42. Además modela la potencia (P = uΩ) y la fricción de Stribeck cerca de Ω = 0 | Igual, más un modelo de fricción y de potencia |
| 3 | **Operación de Kepler/K2** | Equilibrar la presión solar con dos ruedas más propulsores | Cualitativa en Howell et al. 2014: la presión solar es «the only disturbing force»; rueda en Y y Z, propulsores en X | Con dos ruedas no hay control en tres ejes. Solo modelando dónde cae el centro de presión solar se encontró una actitud estable en balanceo | Combustible: descargas cada 2 días y correcciones de balanceo cada 12 h, lo que da un presupuesto de 2–3 años |

---

## 3. Fuentes

### 3.1 Misiones

**[K1] Kepler Mission Manager Update 07.20.12** — Roger Hunter (NASA Ames), 2012, NASA. — CONFIRMADO
- URL original: http://www.nasa.gov/mission_pages/kepler/news/keplerm-20122007.html. Abierta por Wayback: http://web.archive.org/web/20120723172623/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20122007.html (copia en `data/ruedas/html/k20120720.html`).
- Citas: «On July 14, 2012, the Kepler spacecraft experienced a disruption in science data collection due to a pointing error.» / «one of the spacecraft's four reaction control wheels has ceased responding to flight software commands.» / «The spacecraft design is tolerant to the failure of a reaction wheel and can meet all mission objectives operating with three wheels.»

**[K2] Kepler Mission Manager Update 07.24.2012** — Roger Hunter, 2012, NASA. — CONFIRMADO
- Wayback: http://web.archive.org/web/20120727032310/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20122407.html
- Citas: «the anomaly appears to be isolated to reaction wheel #2.» / «The RWA consists of four reaction wheels mounted on non-orthogonal axes. The wheels are actively redundant.» / «The loss of science data is estimated to be six days.»
- Fechas: la falla fue el 14 de julio de 2012, se detectó el 16 de julio y la rueda se retiró del control el 19 de julio.

**[K3] Kepler Mission Manager Update, May 15, 2013** — The Kepler Team, 2013, NASA. — CONFIRMADO
- URL original: https://www.nasa.gov/mission_pages/kepler/news/keplerm-20130515.html. Abierta por Wayback (snapshot del 2014-02-28): http://web.archive.org/web/20140228202745/http://www.nasa.gov:80/mission_pages/kepler/news/keplerm-20130515.html
- Citas: «At our semi-weekly contact on Tuesday, May 14, 2013, we found the Kepler spacecraft once again in safe mode.» / «reaction wheel 4 remained at full torque while the spin rate dropped to zero. This is a clear indication that there has been an internal failure within the reaction wheel, likely a structural failure of the wheel bearing.» / «With the failure of a second reaction wheel, it's unlikely that the spacecraft will be able to return to the high pointing accuracy that enables its high-precision photometry.»
- Nota: algunas notas de prensa dicen «11 de mayo». La fuente primaria solo dice que el 14 de mayo encontraron la nave en modo seguro. Usar «mayo de 2013».

**[K4] The K2 Mission: Characterization and Early Results** — Steve B. Howell, Charlie Sobeck, Michael Haas, et al., 2014, *PASP* 126, DOI 10.1086/676406. arXiv: https://arxiv.org/abs/1402.5163 (PDF en `pdf/k2_howell2014.pdf`, v2 del 7 de marzo de 2014). — CONFIRMADO
- Citas (§2): «The K2 mission is driven by the spacecraft's ability to maintain pointing in all three axes with only two reaction wheels (Putnam & Wiemer, 2014).» / «Solar pressure represents the only disturbing force, which is controlled by wheels about the Y- and Z-axes and by thrusters about the X-axis.» / «By carefully selecting the initial roll angle and correcting for drift every 12 hours, the spacecraft can remain stable in roll» / «the reaction wheels control pointing about the Y- and Z-axes as in the Kepler mission, absorbing the torque generated by the solar radiation pressure. The accumulated momentum is dumped through thruster firings every two days. This operating mode provides a fuel budget that allows for a 2-3 year mission duration.»
- Cómo se equilibra: se apunta en el plano de la órbita, para que el Sol siga la línea de simetría de la nave en el plano X–Y, «providing a balanced pressure and minimizing the X-axis disturbance».
- Detalle (Putnam & Wiemer 2014, AAS 14-102): citado por [K4], no abierto. NO CONFIRMADO de primera mano.

**[K5] «Tackling Hybrid Control is Right in the GNC Wheelhouse»** — NASA Engineering and Safety Center (NESC), 2015 (PDF creado el 2015-06-29), https://www.nasa.gov/sites/default/files/atoms/files/gnc_wheelhouse.pdf. — CONFIRMADO
- Citas: «Since reaction wheel problems began emerging in 2001, efforts have been underway to address the issue.» / menciona los controles híbridos de FUSE y TIMED, y los problemas de Kepler, Dawn y Mars Odyssey / «after the successful development of a new two-wheel/thruster hybrid controller by the spacecraft's prime contractor, Kepler is once again collecting valuable science data.»
- Sirve para decir, con fuente, que Dawn, Odyssey y FUSE también tuvieron problemas con ruedas. Los detalles de cada una: NO CONFIRMADO (no se buscaron sus fuentes primarias).

**[H1] Hubble — Pointing Control** — NASA Science, «Page Last Updated: Jan 21, 2025», https://science.nasa.gov/mission/hubble/observatory/design/pointing-control. — CONFIRMADO
- Citas: «Hubble relies on its complement of four 100-pound (45 kg) reaction wheel assemblies for attitude control» / «If one of the reaction wheels turns clockwise, Hubble will turn counterclockwise.» / «The four reaction wheels are each approximately two feet wide» / «approximately 90 degrees in 15 minutes» / «There are four magnetic torquers installed on Hubble, located at 90-degree intervals on the outside of the spacecraft.» / «The magnetic torquers are used to help reduce reaction wheel speeds, which can build up because of drag caused by Earth's atmosphere» / «Neither of these systems uses propellants, since the byproducts could contaminate the telescope's field of view.»

**[H2] The Hubble Program — Technology: Pointing Control System** — NASA GSFC ASD (archivo), «Page Last Updated: 29-Mar-2021», https://asd.gsfc.nasa.gov/archive/hubble/technology/pcs.html. — CONFIRMADO
- Citas: «The reaction wheels work by rotating a large flywheel up to 3000 rpm or braking it.» / «Reacting against Earth's magnetic field, the torquers reduce the reaction wheel speed, thus managing angular momentum.» Lista: 4 RWA, 4 magnetopares (MT), 3 RSU con 2 giróscopos cada una.

**[H3] Space Telescope Pointing Control** — Hugh Dougherty (Lockheed Missiles and Space Co.), NTRS 19900004138 (fecha NTRS 1988-08-15), https://ntrs.nasa.gov/citations/19900004138 (PDF en `pdf/hst_1990.pdf`). — CONFIRMADO
- Citas: «maneuver the telescope 90 deg in 18 min, or less» / «magnetometers and magnetic torquers for momentum management» / «Disturbance torques, e.g., gravity gradient and aerodynamics, act upon the Space Telescope causing the wheel speeds of the reaction wheel assemblies to increase. To prevent the reaction wheels from reaching a saturated condition that would cause a loss of vehicle control, a momentum control system that manages the speed buildup in the reaction wheels is provided.» / «This system uses a magnetometer or an onboard computer model of the Earth's magnetic field, and magnetic torquers for control torques.»
- **Es la cita ideal para el paso 3** (fuente primaria de la NASA que describe la saturación y la pérdida de control).

**[H4] High-Performance Reaction Wheel Optimization for Fine-Pointing Space Platforms … Lessons Learned from Hubble Space Telescope** — Martin D. Hasha, 2016-05-04, NTRS 20160008147 (Aerospace Mechanisms Symposium, NASA Ames), https://ntrs.nasa.gov/citations/20160008147. — CONFIRMADO
- Citas: «HST's PCS uses 4 RWAs (i.e., variable-rate, fixed-spin-axis units) in an overall canted-pyramidal arrangement to generate torques for large target-to-target maneuvers/attitude changes (~6°/min)» / rango de operación «(0-3000 RPM)».
- Hasha (1987), NTRS 19870020440: el rango de velocidades para apuntado fino es «0 to 1200 RPM» (abierto, `pdf/hst_rwa_1987b.pdf`).
- **Capacidad de momento (N·m·s) e inercia del rotor de las RWA del Hubble: NO CONFIRMADO.** No aparece en [H1]–[H4]. No inventarla.

**[J1] The James Webb Space Telescope Mission** — Jonathan P. Gardner, John C. Mather, et al., 2023, *PASP* 135, DOI 10.1088/1538-3873/acd1b5. arXiv: https://arxiv.org/abs/2304.04869. — CONFIRMADO
- Cita: «There are six reaction wheels, of which two provide redundancy. The star trackers, gyros and reaction wheels maintain the attitude and coarse pointing of the observatory.»

**[J2] JWST Momentum Management** — STScI, JWST User Documentation (JDox), publicada el 17 de mayo de 2017 y actualizada el 22 de julio de 2022, https://jwst-docs.stsci.edu/jwst-observatory-hardware/jwst-attitude-control-subsystem/jwst-momentum-management. — CONFIRMADO
- Citas: «During science observations, solar photon pressure causes angular momentum to build up within the reaction wheels.» / «Before launch, momentum unloads were projected to occur 4–8 times per month.» / «In science operations, the frequency of momentum unloads is now roughly every six weeks.» / «Each momentum unload activity takes a few hours.» / el observatorio «slews to a particular orientation to minimize the impact on the orbit».

**[J3] JWST Propulsion** — STScI JDox, publicada el 17 de mayo de 2017, https://jwst-docs.stsci.edu/jwst-observatory-hardware/jwst-spacecraft-bus/jwst-propulsion. — CONFIRMADO
- Citas: «the smaller mono-propellant rocket engines (MRE-1) are used for attitude control» / «There are 8 MRE-1s located on the spacecraft».

**[J4] Webb's Aft Momentum Flap Deployed** — NASA Webb Mission Team (Goddard), blog de NASA, 30 de diciembre de 2021, https://science.nasa.gov/blogs/webb/2021/12/30/webbs-aft-momentum-flap-deployed. — CONFIRMADO
- Citas: «The aft momentum flap helps minimize the fuel engineers will need to use throughout Webb's lifetime» / «if not properly balanced, this solar pressure would cause rotations of the observatory … that must be accommodated by its reaction wheels.» El despliegue tomó unos ocho minutos.

**[J5] Genesis of the James Webb Space Telescope architecture: The designers' story** — Pierre Y. Bely, Garth D. Illingworth, et al., enero de 2025, borrador enviado a *JATIS* («not yet peer-reviewed»), arXiv: https://arxiv.org/abs/2501.09072. — CONFIRMADO (con la advertencia de que es preprint)
- Citas: «after a while, the wheels' spin speeds can reach their maximum limit and they need to be "desaturated". On HST this was done by creating a counter torque with electromagnetic rods working against the Earth's magnetic field. But far from Earth, such as at L2, that is not possible, so the reaction wheels on JWST are desaturated by firing thrusters.» / «a deployable flap was added to the aft of the sunshield» / «This flap is not movable on orbit, but its post-deployment angle was adjusted just prior to launch based on final measured mass properties. The compensation is not exact, but it minimizes the momentum build-up».
- Es el mejor párrafo para contrastar Hubble (magnetopares) con JWST (propulsores más la aleta).

### 3.2 Hojas de datos de ruedas (PDF del propio fabricante)

**[W1] VECTRONIC Aerospace — Reaction Wheel VRW-D-4** (DS11; PDF creado el 2022-06-21), https://www.vectronic-aerospace.com/wp-content/uploads/2022/06/VAS-VRW-D-4-DS11.pdf. — CONFIRMADO. **Es la única hoja que da la inercia del rotor.** La hoja enuncia el principio: «According to the principle of angular momentum conservation, a torque is exerted onto the spacecraft if the wheel speed is changed. The ratio between acceleration of the wheel and the spacecraft is equal to the ratio of their moments of inertia.»

**[W2] AAC Clyde Space — RW400** («Release date 15 November 2021»; PDF del 2022-08-10), https://www.aac-clyde.space/wp-content/uploads/2021/11/RW400.pdf. — CONFIRMADO. Diseñada «for 6 - 12U CubeSat platforms».

**[W3] AAC Clyde Space — RW210** (PDF del 2022-08-10), https://www.aac-clyde.space/wp-content/uploads/2021/11/RW210.pdf. — CONFIRMADO.

**[W4] Rocket Lab — RW-0.03 Data Sheet, Version 3.0 – 2024-08-02**, https://rocketlabusa.com/assets/Uploads/RW-0.03-Datasheet-v3.0.pdf. La versión 2 (7 de abril de 2022) está en https://www.rocketlab.co.nz/assets/Uploads/30-Nms-RW-0.03-Data-Sheet.pdf. — CONFIRMADO. **No da velocidad máxima ni inercia**; tampoco aparecen en el ICD mecánico (https://www.rocketlab.co.nz/assets/Uploads/1030-mNms-RW-0.01-RW-0.03-ICD.pdf). La versión 2 dice: «Demonstrated 12 arc-sec RMS pointing on 7 kg satellite».

**[W5] Rocket Lab — GEO Reaction Wheels (RW4-1.0)** (PDF modificado el 2020-07-07), https://rocketlabcorp.com/assets/Uploads/1-NMS-product-sheet.pdf. — CONFIRMADO. Tampoco da velocidad máxima.

- Honeywell HR12/HR16 y Collins RSI 12: **NO CONFIRMADO**. No se encontró ni se pudo descargar la hoja del fabricante. El PDF «Constellation_Series_Reaction_Wheels.pdf» de honeywell.com no respondió, y para Collins solo hay catálogos de terceros (satcatalog, satsearch). No usar los números de esos catálogos.
- Blue Canyon RWP050/RWP100: el PDF del fabricante devolvió 403/404. Solo hay catálogos de terceros, así que queda NO CONFIRMADO.

### 3.3 Software (código fijado a commit)

**[S1] 42: A General-Purpose Spacecraft Simulation** — Eric Stoneking, NASA GSFC, designación NASA GSC-16720-1, 2010–2019 (cita sugerida en `License/HowToCite.txt`), https://github.com/ericstoneking/42. Licencia: «NASA Open Source Agreement Version 1.3» (`License/NASA Open Source Software Agreement.pdf`) y «Copyright 2010 United States Government … No copyright is claimed in the United States under Title 17, U.S. Code.» — CONFIRMADO
- Commit fijado: **`df4fbdf5bf75557a06b9dd3aeb8693b98392e334`** (2026-10-21, «Instituted Local Fonts for Graphics»).
- Rueda en el actuador, con saturación de torque y de momento — `Source/42actuators.c` L52–L72: https://github.com/ericstoneking/42/blob/df4fbdf5bf75557a06b9dd3aeb8693b98392e334/Source/42actuators.c#L52-L72
  ```c
  W->Trq = W->Tcmd;                                          /* L58 */
  if (W->Trq < -W->Tmax) W->Trq = -W->Tmax;                  /* L63 */
  if (W->Trq >  W->Tmax) W->Trq =  W->Tmax;                  /* L64 */
  if (W->Trq < 0.0 && W->H <= -W->Hmax) W->Trq = 0.0;        /* L65 */
  if (W->Trq > 0.0 && W->H >=  W->Hmax) W->Trq = 0.0;        /* L66 */
  ```
  (L58 y L63–L66 están verificadas con grep.) **Esto es la saturación:** con la rueda en H_max, el torque que la aceleraría se anula, así que la nave ya no recibe torque en ese sentido.
- Magnetopar τ = M (â × B) — `Source/42actuators.c` L76–L86 (producto vectorial en L83–L85). Se suma al cuerpo en L255–L257: `S->B[0].Trq[j] += S->MTB[i].Trq[j];`
- Ecuación de la rueda Ḣ = τ — `Source/42dynamics.c` L3325–L3329: `/* Wheel EOM */ … W->Hdot = W->Trq;`
- Nave de un cuerpo, con la tercera ley — `Source/42dynamics.c` `OneBodyEOM` desde L2445:
  - L2465–L2472: H_b = I ω + Σ h_j â_j (momento total con las ruedas);
  - L2474–L2480 (L2478): `WhlTorq[i]-=S->Whl[j].Trq*S->Whl[j].A[i];`, el **−τ sobre la nave**;
  - L2484–L2486: `Trq = B->Trq - ω×H + WhlTorq`;
  - L2488–L2490: ω̇ = I⁻¹ Trq;
  - L2492–L2495: `hdot[i] = S->Whl[i].Trq;`, el **+τ sobre la rueda**.

  URL: https://github.com/ericstoneking/42/blob/df4fbdf5bf75557a06b9dd3aeb8693b98392e334/Source/42dynamics.c#L2445-L2495
- Software de vuelo de ejemplo `ThreeAxisFSW` — `Source/42fsw.c` desde L1374:
  - L1415–L1420: control PD, `C->Tcmd[i] = -C->Kr[i]*AC->wbn[i]-C->Kp[i]*(2.0*qbr[i]);` y `AC->Whl[i].Tcmd = -C->Tcmd[i];`. La rueda recibe el **negativo** del torque que se quiere dar al cuerpo, que es la tercera ley escrita en el software;
  - L1422–L1427 («Momentum Management»): `Herr[i] = AC->Whl[i].H - C->Hwcmd[i];`, `VxV(Herr,AC->bvb,HxB);` y `AC->MTB[i].Mcmd = C->Kunl*HxB[i];`, o sea m = K (H_err × B);
  - L1404: `C->Kunl = 1.0E6;`.

  URL: https://github.com/ericstoneking/42/blob/df4fbdf5bf75557a06b9dd3aeb8693b98392e334/Source/42fsw.c#L1374-L1428
- Estructura `WhlType` — `Include/42types.h` L359–L371: `double H; /* Angular Momentum, [[Nms]] */`, `double J; /* Rotary inertia, kg-m^2 */`, `double w; /* Angular speed, rad/sec */`. La relación ω = H/J se aplica en `42dynamics.c` L338–L339.

**[S2] Basilisk** — Autonomous Vehicle Systems Lab, University of Colorado Boulder, licencia ISC («Copyright (c) 2016»), https://github.com/AVSLab/basilisk. Documentación: https://avslab.github.io/basilisk/Documentation/simulation/dynamics/reactionWheels/reactionWheelStateEffector.html. — CONFIRMADO
- Commit fijado: **`f78c2978213ee3eaffde0146877df9755fc62f1f`** (2026-10-29).
- `src/simulation/dynamics/reactionWheels/reactionWheelStateEffector.cpp`:
  - L452–L454: `OmegasDot = (rw.u_current + rw.frictionTorque) / rw.Js - rw.gsHat_B.transpose() * omegaDotBNLoc_B;`
  - L681–L736 `ConfigureRWRequests`:
    - saturación de torque a ±u_max (L690–L696);
    - potencia, con u = P_max/Ω si |uΩ| ≥ P_max (L715–L721);
    - **velocidad** (L723–L729): `if (std::abs(Omega) >= Omega_max && Omega_max > 0.0 && Omega * u_cmd >= 0.0) cmd.u_cmd = 0.0;` con el comentario «check if torque would accelerate wheel speed beyond Omega_max».

  URL: https://github.com/AVSLab/basilisk/blob/f78c2978213ee3eaffde0146877df9755fc62f1f/src/simulation/dynamics/reactionWheels/reactionWheelStateEffector.cpp#L681-L736
- `src/fswAlgorithms/attControl/mtbMomentumManagementSimple/mtbMomentumManagementSimple.c` L119: `v3Scale(-configData->Kp, hWheels_B, …torqueRequestBody);`. En el `.rst`: h_wheels = Σ ĝ_si J_si Ω_i y τ_desired = −K_p h_wheels.
- `src/fswAlgorithms/attControl/thrMomentumManagement/thrMomentumManagement.c` L101–L114: si |h_s| ≥ h_s,min, Δh = −(|h_s| − h_s,min)/|h_s| · h_s. El umbral de descarga es explícito.
- Ejemplos del repositorio: `examples/scenarioMomentumDumping.py` y `examples/scenarioMtbMomentumManagement.py` (no se ejecutaron).
- El catálogo `src/utilities/simIncludeRW.py` trae HR16 y HR12 con `Omega_max = 6000 rpm` y `u_max = 0.200` N·m, pero es un tercero que cita a Honeywell, así que no reemplaza la hoja de datos.

### 3.4 Apoyo para el ejemplo numérico

**[C1] CubeSat Design Specification Rev. 14.1** — The CubeSat Program, Cal Poly SLO, 2022-02 (PDF), https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf. — CONFIRMADO
- Tabla 1 («typical maximum mass»): 3U = 6,00 kg; **6U = 12,00 kg**; 12U = 24,00 kg.
- Dibujo «6U CUBESAT» (p. 33): **100,0 × 226,3 × 366,0 mm**. 3U: 100,0 × 100,0 × 340,5 mm (p. 32).

**[C2] NASA SP-8024, Spacecraft Gravitational Torques** — NASA Space Vehicle Design Criteria (Guidance and Control), mayo de 1969, NTRS 19700014113, https://ntrs.nasa.gov/citations/19700014113. — CONFIRMADO
- Tabla II, cabeceo: τ = −(3/2) ω₀² (I_R − I_Y) sen 2θ, con ω₀² = k/R³ en órbita circular (k = μ). La extracción OCR está algo dañada, pero se lee bien.

**[C3] GomSpace NanoTorque GST-600 Mk2 Datasheet**, DS 1062432 2.0, 17 de febrero de 2025, https://gomspace.com/wp-content/uploads/2025/09/gs-ds-NanoTorqueGST600mk2-1062432-2-EXT.pdf. — CONFIRMADO
- «designed for 6U CubeSats». Momento dipolar típico de 0,50 A·m² en Z (mín. 0,34) y de 0,40 A·m² en X/Y (mín. 0,23).

**[C4] NOAA NCEI — World Magnetic Model**, https://www.ncei.noaa.gov/products/world-magnetic-model (WMM2025, época 2025.0). — CONFIRMADO
- Cita: campo principal «typically 20,000 to 60,000 nT» (en superficie).

**[T1] Serway y Jewett, *Física para ciencias e ingeniería* Vol. 1, 10.ª ed. (2018)** — ya está en la bibliografía del sitio. Capítulos de momento angular (τ = dL/dt, L = Iω, conservación cuando τ_ext = 0). Número de capítulo: NO CONFIRMADO aquí (no se abrió el libro); verificarlo con el ejemplar de Dylan.

---

## 4. Números clave

### 4.1 Ruedas (hojas del fabricante)

| Rueda | L máx. (N·m·s) | τ máx. | ω máx. | Inercia del rotor | Masa | Potencia | Fuente |
|---|---|---|---|---|---|---|---|
| **VECTRONIC VRW-D-4** | 4,0 | 50 mN·m | 6000 rpm | **6,37·10⁻³ kg·m² (impresa)**; comprobación: 6,37·10⁻³ × 628,3 = 4,00 N·m·s (cálculo propio) | 2,5 kg | <1,3 W en reposo; <9,0 W a velocidad máxima; <65 W a torque y velocidad máximos | [W1] |
| **AAC Clyde RW400** (variante de 50 mN·m·s) | ±0,050 (también ±0,015 y ±0,030) | ±8 mN·m en la tabla («> 12 mN.m (braking)» en los destacados) | 5000 rpm | 9,55·10⁻⁵ kg·m² = 0,050/523,6 (cálculo propio, suponiendo que las 5000 rpm valen para la variante de 50) | 375 g (197/210 g las otras) | «< 1900 mW @ 55 mN.m.s»; la tabla de potencia tiene superíndices fusionados (10001, 19001), así que hay que leerla con cuidado | [W2] |
| AAC Clyde RW210 | ±0,0015 / ±0,003 / ±0,006 | ±0,1 mN·m | 10000/15000/15000 rpm | 1,43·10⁻⁶; 1,91·10⁻⁶; 3,82·10⁻⁶ kg·m² (cálculo propio) | 21/32/48 g | <800 mW pico | [W3] |
| Rocket Lab RW-0.03 | nominal ±0,03; pico ±0,04 (a 5 V) | ±2 mN·m a 0,02 N·m·s; ±0,5 mN·m a 0,04 N·m·s | no publicada | no derivable | 183 g (v3) / 185 g (v2) | 1,8 W a 0,02 N·m·s y +2 mN·m; 0,3 W a 0,04 N·m·s en régimen | [W4] |
| Rocket Lab RW4-1.0 | 1,0 | ±100 mN·m a 0,8 N·m·s (28 V) | no publicada | no derivable | 1380 g | 43 W (+60 mN·m a 1 N·m·s); 5,3 W en régimen; −28 W en frenado regenerativo | [W5] |

Para el tema convienen **VRW-D-4** (la rueda «grande» con inercia impresa) y **RW400** (la rueda de CubeSat 6U con la que se hace el ejemplo). La RW-0.03 sirve para mostrar que un dato puede faltar en la hoja: el torque baja de 2 a 0,5 mN·m cerca del momento máximo. Es una saturación «suave».

### 4.2 Misiones

| Misión | Dato | Fuente |
|---|---|---|
| Kepler | 4 ruedas en ejes no ortogonales, «actively redundant»; diseñada para funcionar con 3 | [K1], [K2] |
| Kepler | Rueda #2: falla el 14 de julio de 2012, detectada el 16 de julio, retirada el 19 de julio; unos 6 días de datos perdidos | [K1], [K2] |
| Kepler | Rueda 4: modo seguro detectado el 14 de mayo de 2013, «likely a structural failure of the wheel bearing» | [K3] |
| K2 | 2 ruedas (ejes Y y Z) más propulsores (eje X); presión solar como única perturbación; corrección de balanceo cada 12 h; descarga cada 2 días; combustible para 2–3 años | [K4] |
| Hubble | 4 RWA de 45 kg (100 lb), unos 60 cm (2 ft) de ancho; hasta 3000 rpm; pirámide inclinada | [H1], [H2], [H4] |
| Hubble | 4 magnetopares a 90°; descargan el momento contra el campo terrestre; sin propelente (contaminaría la óptica) | [H1], [H2], [H3] |
| Hubble | Unos 90° en 15 min (NASA, 2025); especificación de diseño de 90° en 18 min o menos (Dougherty); unos 6°/min (Hasha) | [H1], [H3], [H4] |
| Hubble | Capacidad de momento de cada RWA | **NO CONFIRMADO** |
| JWST | 6 ruedas, 2 de ellas redundantes | [J1] |
| JWST | Descarga con propulsores MRE-1 (8 en total); unas horas por descarga; antes del lanzamiento se preveían 4–8 al mes y en operación hay una cada unas 6 semanas | [J2], [J3] |
| JWST | Aleta de momento («aft momentum flap») desplegada el 30 de diciembre de 2021; ángulo fijado antes del lanzamiento; reduce la acumulación de momento por presión solar | [J4], [J5] |

---

## 5. Pasos de física (estilo de la casa: modelo simple → por qué no alcanza → qué falta → modelo mejorado)

Notación: Serway/Sears-Zemansky, SI. «s» = nave (*spacecraft*) sin la rueda; «w» = rueda (*wheel*). Un eje (z) para que todo sea escalar con signo.

### Paso 1 — Sistema aislado: el momento angular total no cambia

Sin torque externo, el momento angular del sistema nave + rueda se conserva:

```latex
\sum \tau_{\text{ext}} = 0 \;\Longrightarrow\; L_{\text{total}} = I_s\,\omega_s + I_w\,\omega_w = \text{constante}
```

Si todo parte del reposo (L_total = 0) y el motor hace girar la rueda en un sentido, la nave gira en el otro:

```latex
I_s\,\Delta\omega_s = -\,I_w\,\Delta\omega_w
\qquad\Longrightarrow\qquad
I_s\,\Delta\theta_s = -\,I_w\,\Delta\theta_w
```

La segunda igualdad sale de integrar la primera en el tiempo, partiendo del reposo. Como I_w ≪ I_s, la rueda da cientos de vueltas para que la nave gire un cuarto de vuelta (ver §6). VECTRONIC [W1] lo dice con sus palabras: «The ratio between acceleration of the wheel and the spacecraft is equal to the ratio of their moments of inertia.» NASA [H1] lo dice para el público: «If one of the reaction wheels turns clockwise, Hubble will turn counterclockwise.»

*Sutileza (no la pongas en el texto principal, pero tenla presente):* ω_w en la ecuación es la velocidad de la rueda respecto al espacio inercial. Los programas usan la velocidad relativa al cuerpo, Ω = ω_w − ω_s; por eso Basilisk escribe Ω̇ = u/J_s − ĝ·ω̇. Cuando I_w ≪ I_s la diferencia es despreciable.

### Paso 2 — Torque: el motor empuja la rueda y la rueda empuja la nave

El motor está entre la rueda y la nave. Por la tercera ley, aplica τ a la rueda y −τ a la nave:

```latex
\tau = \frac{dL_w}{dt} = I_w\,\alpha_w,
\qquad
-\tau = \frac{dL_s}{dt} = I_s\,\alpha_s
```

En el código de 42: `hdot = Whl.Trq` (+τ a la rueda) y `WhlTorq -= Whl.Trq * A` (−τ a la nave).

**Maniobra de reposo a reposo (*rest-to-rest*):** se aplica torque constante durante T/2 y luego el opuesto durante T/2. La nave acelera con α_s = τ/I_s y luego frena:

```latex
\theta = \alpha_s\left(\frac{T}{2}\right)^2 \;\Longrightarrow\; \tau = \frac{4\,I_s\,\theta}{T^2},
\qquad
\omega_{s,\text{pico}} = \frac{2\theta}{T},
\qquad
L_{w,\text{pico}} = I_s\,\omega_{s,\text{pico}}
```

Al final la rueda vuelve a su velocidad inicial: todo el momento que «prestó» a la nave lo recupera al frenarla.

### Paso 3 — Por qué no alcanza: los torques externos se acumulan en la rueda

En órbita, Σ τ_ext ≠ 0. Actúan el gradiente de gravedad, la presión de radiación solar, el arrastre atmosférico y el magnetismo residual. Para mantener la nave quieta (ω_s = 0), la rueda tiene que absorber todo ese torque:

```latex
\frac{dL_{\text{total}}}{dt} = \tau_{\text{ext}}
\quad\xrightarrow{\;\omega_s = 0\;}\quad
L_w(t) = L_w(0) + \int_0^t \tau_{\text{ext}}\,dt
```

Si la perturbación tiene una parte que no se cancela (secular), L_w crece hasta el límite:

```latex
|L_w| = L_{\max} = I_w\,\omega_{\max}
\qquad\Longrightarrow\qquad
t_{\text{sat}} \approx \frac{L_{\max} - |L_w(0)|}{|\bar\tau_{\text{ext}}|}
```

En la saturación, el motor ya no puede acelerar la rueda en ese sentido; solo puede frenarla. Por eso la nave pierde el control en ese eje frente a la perturbación. En el código, 42 anula el torque (`if (W->Trq > 0.0 && W->H >= W->Hmax) W->Trq = 0.0;`) y Basilisk hace lo mismo con Ω_max. Fuente primaria de la NASA para Hubble [H3]: «To prevent the reaction wheels from reaching a saturated condition that would cause a loss of vehicle control, a momentum control system … is provided.»

Torque de gradiente de gravedad en cabeceo, según NASA SP-8024 [C2]:

```latex
\tau_{gg} = \frac{3}{2}\,\frac{\mu}{R^3}\,(I_R - I_Y)\,\operatorname{sen}2\theta
```

Su máximo está en θ = 45°.

Kepler es el ejemplo real de lo que falta. Con dos ruedas no hay un tercer eje que absorba nada, y la solución de K2 fue elegir una actitud en la que la presión solar quedara equilibrada en ese eje [K4].

### Paso 4 — Modelo mejorado: descargar el momento con un torque externo, y usar 3–4 ruedas

Solo un torque **externo** cambia L_total. La idea es aplicar uno a propósito y dejar que el control frene la rueda al mismo tiempo, mientras la nave sigue quieta:

```latex
\vec\tau_{\text{MTQ}} = \vec m \times \vec B
\qquad\text{(magnetopares; Hubble, CubeSats en órbita baja)}
```

```latex
\vec\tau_{\text{prop}} = \vec r \times \vec F
\qquad\text{(propulsores; K2, JWST en L2)}
```

Ley de descarga de 42 (`42fsw.c` L1424–L1427), donde B es el campo terrestre medido por el magnetómetro:

```latex
\vec m = K\,(\vec H_w - \vec H_{\text{cmd}}) \times \vec B
```

El torque resultante τ = m × B se opone a la parte de H_w perpendicular a B. Como τ ⊥ B siempre, la componente de H_w paralela a B no se puede descargar en ese instante. Hay que esperar a que la órbita cambie la dirección de B; por eso la descarga magnética tarda al menos una fracción de órbita.

Basilisk usa la forma más simple: τ_deseado = −K_p h_ruedas [S2].

**Varias ruedas.** Para controlar 3 ejes hacen falta al menos 3 ruedas con ejes linealmente independientes; con una cuarta hay redundancia:

```latex
\vec L_w = \sum_{i=1}^{N} I_{w,i}\,\omega_{w,i}\,\hat g_i, \qquad N \ge 3
```

- Kepler: 4 ruedas, «can meet all mission objectives operating with three wheels» [K1].
- Hubble: 4 ruedas en pirámide [H4].
- JWST: 6 ruedas, 2 de ellas redundantes [J1].

**Qué cuesta descargar:**
- Hubble: nada de propelente, pero necesita magnetómetro y campo terrestre, y solo funciona en órbita baja [H1], [J5].
- JWST: propelente y unas horas de observación cada unas 6 semanas [J2]. La aleta reduce cuánto se acumula [J4], [J5].
- K2: propelente cada 2 días, que fija la vida útil en 2–3 años [K4].

---

## 6. Ejemplo numérico (todo es cálculo propio salvo los datos citados)

**Datos:**
- Nave: CubeSat 6U de **12 kg** y **100,0 × 226,3 × 366,0 mm** [C1], modelado como **caja homogénea**, I = m(a² + b²)/12. Es una idealización; un 6U real tiene la masa más concentrada y su inercia sería algo menor.
  - Eje perpendicular a la cara de 226,3 × 366,0: **I_s = 0,1852 kg·m²** (la mayor).
  - Eje paralelo a la arista de 226,3 mm: 0,1440 kg·m².
  - Eje largo (366 mm): 0,0612 kg·m².
- Rueda: **AAC Clyde RW400, 50 mN·m·s** [W2]: L_max = 0,050 N·m·s, τ_max = 8 mN·m, ω_max = 5000 rpm = 523,6 rad/s, de modo que **I_w = 9,55·10⁻⁵ kg·m²**.
- I_s/I_w ≈ 1940.

**a) Giro de 90° en 60 s, de reposo a reposo, alrededor del eje de I_s = 0,1852 kg·m²:**
- τ = 4 I_s θ / T² = 4 × 0,1852 × 1,5708 / 3600 = **3,23·10⁻⁴ N·m = 0,32 mN·m**, el 4 % del máximo de la rueda.
- α_s = 1,75·10⁻³ rad/s²; ω_s,pico = 2θ/T = 0,0524 rad/s = **3,0°/s** a t = 30 s.
- L_w,pico = I_s ω_s,pico = **9,70·10⁻³ N·m·s**, el 19 % de L_max.
- Δω_w,pico = L_w,pico / I_w = **101,5 rad/s ≈ 970 rpm**.
- Ángulo de la rueda: θ_w = (I_s/I_w) θ_s = 1940 × π/2 ≈ **3050 rad ≈ 485 vueltas** para que la nave gire 90°. Este resultado no depende de T.
- Con T = 30 s: τ = 1,29 mN·m, ω_s,pico = 6°/s, L_w,pico = 0,0194 N·m·s (39 %) y unas 1940 rpm.
- **Giro más rápido posible:**
  - limitado por torque: T_min = √(4 I_s θ / τ_max) = **12,1 s**;
  - limitado por momento: T_min = 2 I_s θ / L_max = 11,6 s.

  Las dos restricciones quedan casi iguales, así que la rueda está bien dimensionada para este 6U. A 12,1 s el pico es de 0,048 N·m·s (96 % de L_max) y 4820 rpm, con ω_s = 14,9°/s.
- Alrededor del eje largo (I = 0,0612 kg·m²) y en 60 s: 0,107 mN·m, 321 rpm y unas 160 vueltas.

**b) Perturbación y saturación (órbita circular de 500 km, gradiente de gravedad en cabeceo):**
- μ = 3,986·10¹⁴ m³/s² y R = 6871 km, así que ω₀ = 1,108·10⁻³ rad/s y el período es de 94,5 min.
- Cabeceo alrededor del eje de 226,3 mm: I_R − I_Y = 0,1852 − 0,0612 = 0,1240 kg·m² (los otros dos ejes).
- **τ_gg,máx = (3/2) ω₀² ΔI = 2,29·10⁻⁷ N·m** (θ = 45°).
- Si ese torque se mantiene constante, como en una nave que apunta al nadir con un ángulo de cabeceo fijo, la rueda vacía se satura en t = 0,050 / 2,29·10⁻⁷ = **2,19·10⁵ s ≈ 61 h ≈ 2,5 días ≈ 39 órbitas**.
- Con θ = 10° el torque es 0,34 veces menor (sen 20° = 0,342), y se satura en unos 7,4 días.
- Advertencia: en apuntado inercial, el gradiente de gravedad oscila dos veces por órbita y gran parte se cancela. El caso constante es una **cota superior** del ritmo de acumulación, no la acumulación típica.
- Contraste con el diseño: el giro de 90° en 60 s usa el 19 % de la capacidad, mientras que la perturbación llena el 100 % en unos días. Por eso no se puede omitir la descarga.

**c) Descarga con magnetopares (GomSpace GST-600 Mk2 [C3]):**
- m = 0,40 A·m² en X/Y.
- B a 500 km: la superficie tiene 20 000–60 000 nT [C4]. Escalando como dipolo, (R_T/R)³ = 0,797, así que B ≈ 16 000–48 000 nT (cálculo propio con un modelo dipolar).
- τ_MTQ = m B ≈ 0,40 × 3·10⁻⁵ = **1,2·10⁻⁵ N·m**, unas **50 veces** τ_gg,máx.
- Vaciar 0,050 N·m·s toma unos 4200 s ≈ **70 min**, casi una órbita. El rango va de 44 min (B fuerte) a 131 min (B débil). Además solo se descarga la componente ⊥ B, así que en la práctica se reparte a lo largo de la órbita.

**Mensaje para el texto:** la rueda resuelve el giro gastando una fracción de su capacidad. Lo que la llena es la perturbación pequeña que nunca para (unas 10⁻⁷ N·m). La solución es otro actuador que sí intercambia momento con algo externo (unas 10⁻⁵ N·m).

---

## 7. Contenido del diagrama (recurso prescrito)

**Panel A — Intercambio de momento (modelo de los pasos 1 y 2):**
- Nave como caja (en proporción 6U, o genérica) con la rueda dentro, en corte, y el eje de giro común z dibujado de forma explícita.
- Flecha curva de ω_w en la rueda en un sentido y flecha curva de ω_s en la nave en el sentido opuesto.
- Vectores **L_w** y **L_s** sobre el eje z, opuestos y de **igual largo**. Rótulo: L_s + L_w = 0 (parte del reposo).
- Motor entre rueda y nave: **τ** sobre la rueda y **−τ** sobre la nave (pares de acción y reacción, mismo color y punta contraria). Rótulo: «tercera ley».
- Ecuaciones anotadas: I_s ω_s + I_w ω_w = constante; I_s Δθ_s = −I_w Δθ_w; τ = dL_w/dt = I_w α_w.
- Nota numérica: «la rueda da unas 485 vueltas para que la nave gire 90°» (§6a).

**Panel B — Saturación y descarga (pasos 3 y 4):**
- Barra o medidor de L_w con una marca roja en **L_max = I_w ω_max** (0,050 N·m·s) y el relleno llegando al tope.
- Flecha pequeña y constante de τ_ext (gradiente de gravedad o presión solar) entrando a la rueda, con el rótulo L_w = ∫τ_ext dt.
- En la saturación: «el motor ya no puede acelerar la rueda en este sentido → la nave deriva».
- Descarga: vector **B** de la Tierra (líneas de campo), dipolo **m** del magnetopar y **τ = m × B** (perpendicular a ambos), con la rueda frenando (L_w bajando). Variante para L2: propulsor con **τ = r × F** (JWST, K2).
- Un recuadro de «3–4 ruedas» con ejes en pirámide: Kepler 4 → funciona con 3; con 2, K2 depende del equilibrio solar.

Colores con significado: la Tierra y las líneas de B en azul; el Sol y la presión solar en amarillo o ámbar. La rueda y la nave en neutros; τ y −τ en el mismo color con sentido opuesto; L_max en rojo (límite).

**Figura secundaria sugerida (interactiva o de datos): «una maniobra y un día en la vida de la rueda».**

1. **Maniobra (T = 60 s, 6U con RW400)** — ver la tabla de abajo. Curvas: θ_s(t) en forma de S; ω_w(t) en triángulo, hasta −970 rpm a los 30 s y de vuelta a 0. Opcional: un control deslizante para T, con la marca de T_min ≈ 12 s (torque y momento casi iguales).

   | t (s) | ω_s (rad/s) | θ_s (°) | ω_w (rpm) | L_w (N·m·s) |
   |---|---|---|---|---|
   | 0 | 0 | 0 | 0 | 0 |
   | 10 | 0,0175 | 5 | −323 | −0,00323 |
   | 20 | 0,0349 | 20 | −646 | −0,00646 |
   | 30 | 0,0524 | 45 | −970 | −0,00970 |
   | 40 | 0,0349 | 70 | −646 | −0,00646 |
   | 50 | 0,0175 | 85 | −323 | −0,00323 |
   | 60 | 0 | 90 | 0 | 0 |

   (cálculo propio, §6a, con la rueda partiendo de 0 rpm.)
2. **Acumulación y descarga** — L_w(t) en rampa con 2,29·10⁻⁷ N·m hasta un umbral de descarga. Usar, por ejemplo, el 80 % de L_max = 0,040 N·m·s (≈ 48 h), al estilo de `hs_min` en Basilisk; el porcentaje es una elección de diseño, no un dato. Luego bajada con unos 1,2·10⁻⁵ N·m (≈ 56 min hasta 0) y otra rampa. Diente de sierra con la línea roja de L_max. Los controles podrían elegir «magnetopar (órbita baja)» o «propulsor (L2)», con la cadencia de JWST: una descarga cada unas 6 semanas y unas horas cada una [J2].

---

## 8. Trampas a evitar

1. **No inventar la capacidad de las ruedas del Hubble.** Solo están confirmados 45 kg, unos 60 cm (2 ft), 3000 rpm y 4 unidades. Los N·m·s están NO CONFIRMADOS.
2. **No usar los números de las configuraciones demo de 42.** `Demo/SC_Cubesat3U.txt`, `SC_Cubesat6U.txt` y `SC_HST.txt` traen una plantilla de rueda de «0.14 N-m, 50 N-m-sec, 0.012 kg-m^2» con «0 ! Number of wheels», o sea, desactivada. Los CubeSat tienen además una masa de 1,0 kg con inercias de 2,0/3,0/1,2 kg·m². Son marcadores de lugar, no datos de misión. `SC_Aura.txt` y `SC_LRO.txt` sí activan 3 ruedas (Aura: 0,5 N·m y 100 N·m·s), pero tampoco hay una fuente que las ate al hardware de vuelo.
3. **Honeywell HR16, Collins RSI y Blue Canyon:** solo hay números de catálogos de terceros o del catálogo de Basilisk. No son la hoja del fabricante, así que no van en la tabla como «confirmados».
4. **RW400:** la tabla da ±8 mN·m y los destacados dicen «> 12 mN.m (braking)». Hay una sola velocidad máxima (5000 rpm) para tres capacidades, así que la inercia derivada supone que vale para la de 50 mN·m·s. La tabla de potencia tiene notas al pie fusionadas con los números.
5. **RW-0.03:** sin ω_max no hay inercia derivable; no la uses para el ejemplo.
6. **Fecha de la rueda 4 de Kepler:** la fuente primaria dice que el modo seguro se encontró el 14 de mayo de 2013. El «11 de mayo» de la prensa no está en [K3].
7. **Gradiente de gravedad:** el valor de 2,3·10⁻⁷ N·m es el máximo a θ = 45° y la saturación en unos 2,5 días es una cota con torque constante. No presentarlo como «el satélite se satura cada 2,5 días».
8. **τ = m × B es siempre ⊥ B:** no se puede descargar instantáneamente cualquier componente. Decirlo, o al menos no afirmar lo contrario.
9. **Velocidad relativa frente a inercial de la rueda:** en el texto de clase usa ω_w inercial (paso 1); el código usa Ω relativa. No mezclar sin aclararlo.
10. **Paso por cero:** las ruedas reales suelen operar con una velocidad de sesgo para no cruzar 0 rpm, donde la fricción (Stribeck) es peor. Basilisk lo modela (`omegaLimitCycle`, `frictionStribeck`) y Hubble opera en fino entre 0 y 1200 rpm [H4]. El ejemplo parte de 0 rpm por simplicidad; mencionarlo si hace falta.
11. **El preprint de JWST ([J5]) no está revisado por pares.** Para el número de ruedas, cita [J1] (PASP). Para la aleta, [J4] (NASA) y [J5] como explicación.
12. **Notación:** en el sitio, L para el momento angular (como Serway), no H como en 42. Avisar en una nota del caso de uso que 42 llama H a L.

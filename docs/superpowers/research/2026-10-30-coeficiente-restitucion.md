# Tema 7: el coeficiente de restitución en un motor de videojuego (por qué la pelota rebota mal)

Investigación de solo lectura. Todas las fuentes se consultaron el **2026-10-30**. Los valores están copiados de la fuente abierta (código en un tag o commit fijo, con número de línea). Lo que calculé yo lleva la marca "(cálculo propio)" y lo que no pude verificar, "NO CONFIRMADO". Las citas textuales están en el idioma original. Las descargas (código y PDF) están en `scratchpad/research/data/restitucion/` y son datos no confiables: no se ejecutó nada de ellas.

---

## 1. Recomendación

**Caso de uso: Box2D v3 (Erin Catto, licencia MIT), el solver de restitución de `contact_solver.c`.**

Motivos:
- Es código abierto y fijable a un tag (`v3.2.0`, commit `178495b`, 2026-10-18; también `v3.1.1`, commit `8c66146`, 2025-06-03). Todo lo que necesita el tema está escrito ahí: la ecuación del impulso, el umbral `restitutionThreshold` con su valor por defecto, la regla de mezcla `max` y el orden de las etapas del solver. Además, el autor explica cada decisión en la documentación oficial del mismo repo (`docs/simulation.md`, `docs/questions.md`) y en sus charlas de GDC alojadas en box2d.org. El rigor queda al nivel del tema 2 (Celeste + desensamblado de SMB).
- La historia que cuenta el código coincide con los 4 pasos del tema. Primero, el modelo ideal e = −v′/v. Después, la serie infinita de rebotes (Zenón), que obliga a poner un umbral. Luego, el impulso discreto con umbral, mezcla, tiempo de paso y estabilización. Por último, el refinamiento de v3.2, la "Poisson kinetic restitution", que garantiza que no se gane energía.
- Permite comparar con otros motores de forma verificable: cada motor usa una regla de mezcla distinta (máx, promedio, producto, suma) y un umbral distinto (0,2, 1 o 2 m/s). Esa comparación es justo el "qué se gana y qué cuesta" que pide la banda superior de la rúbrica.

**Alternativas:**
1. **Unity 3D (PhysX): `PhysicsMaterial.bounciness`, `bounceCombine` y `Physics.bounceThreshold`.** Está muy documentado y es el motor que más estudiantes reconocen. La documentación de Unity es oficial, y el código de PhysX es abierto (`NVIDIA-Omniverse/PhysX`), de modo que la ecuación también se puede citar con línea. Como caso principal pierde un poco porque el código de integración de Unity es cerrado. Sirve muy bien como contraste: por defecto usa promedio y un umbral de 2.
2. **Rocket League (Psyonix, motor Bullet modificado).** Es un caso muy atractivo, pero las cifras de la pelota (restitución 0,6 y similares) solo están en reimplementaciones comunitarias como RocketSim, no en una fuente de Psyonix. La charla de GDC 2018 existe, pero no pude abrir ni su video ni su transcripción, así que los detalles de restitución quedan NO CONFIRMADOS. Solo vale como mención o "callout".

---

## 2. Casos de uso candidatos, ordenados

| # | Caso | Qué calcula el software | Ecuación explícita en el código | Por qué la física supera a la animación con guion o a la tabla | Qué cuesta |
|---|---|---|---|---|---|
| 1 | **Box2D v3** (C, MIT) | Impulso normal en cada punto de contacto, con objetivo de velocidad −e·v_n⁻ tras el paso principal del solver | `impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity )` (v3.1.1). En v3.2.0 se usa `velocityBias = restitution * cp->relativeVelocity` con un tope de Poisson | Un solo número por forma (`restitution`) da rebotes correctos para cualquier altura, ángulo, masa y pila de cuerpos. Una animación con guion solo sirve para el caso que se animó. Una tabla precalculada tendría que barrer altura × ángulo × giro × par de materiales y aun así no resuelve colisiones entre varios cuerpos ni la conservación del momento | Umbral (debajo de 1 m/s no hay rebote), mezcla `max` (una pelota con e alto rebota igual de alto sobre barro), rebote aproximado cuando hay varios contactos (solver secuencial), dependencia del paso de tiempo, efecto túnel entre cuerpos dinámicos sin CCD, iteraciones extra de restitución |
| 2 | **Unity + PhysX** | Velocidad objetivo de contacto `targetVelocity = −vrel·restitution` si `vrel < bounceThreshold` | `FSel(isGreater2, FMul(FNeg(vrel), restitution), zero)` (PhysX, DyContactPrepShared.h) | Lo mismo que en Box2D, y además el diseñador combina materiales sin tabla de pares | Umbral por defecto de 2 (Unity) = 0,2·10 m/s (PhysX). Promedio por defecto: una pelota con 0,8 sobre un suelo con 0 queda en 0,4. Unity advierte que las aproximaciones "might still add small amounts of energy" |
| 3 | **Rocket League** (Bullet modificado) | Rebote de la pelota contra la arena y contra los coches a 120 Hz (NO CONFIRMADO en fuente primaria) | Bullet: `rest = restitution * -rel_vel` con umbral de 0,2 y mezcla por producto (fuente: Bullet 3.25). Valores de RL: NO CONFIRMADO | Juego competitivo en red: el rebote tiene que ser predecible y determinista para el jugador | Ajuste de la sensación de juego frente al realismo; las cifras no son públicas |

---

## 3. Fuentes

### 3.1 Código y documentación de motores

**[box2d-v320] Box2D v3.2.0.** Erin Catto. 2026. GitHub `erincatto/box2d`, tag `v3.2.0`, commit `178495ba35695aefe9c321e569d2277f06db3b90` (fecha del commit: 2026-10-18), licencia MIT. **CONFIRMADO.**
- Mezcla por defecto. `src/contact.h` L162-L165, https://github.com/erincatto/box2d/blob/v3.2.0/src/contact.h#L162-L165:
  ```c
  static inline float b2MixRestitution( float restitutionA, float restitutionB )
  {
  	return b2MaxFloat( restitutionA, restitutionB );
  }
  ```
  Se aplica en `src/contact.c` L369-L371 (con callback opcional, L375). En `include/box2d/types.h` L146-L147: "Optional mixing callback for restitution. The default uses max(restitutionA, restitutionB)."
- Umbral y valores por defecto. `src/types.c` L13-L22, https://github.com/erincatto/box2d/blob/v3.2.0/src/types.c#L13-L22:
  `def.gravity.y = -10.0f;` · `def.restitutionThreshold = 1.0f * lengthUnits;` · `def.restitutionIterations = 2;` · `def.enableRestitutionPropagation = false;` · `def.contactSpeed = 3.0f * lengthUnits;` · `def.contactHertz = 30.0;`
  `lengthUnits` = `b2GetLengthUnitsPerMeter()` y vale `1.0f` por defecto (`src/core.c` L36). En consecuencia, **el umbral por defecto es 1 m/s** (cálculo propio a partir de las dos líneas).
- Documentación del umbral. `include/box2d/types.h` L112-L114: "Restitution speed threshold, usually in m/s. Collisions above this speed have restitution applied (will bounce)." En `include/box2d/box2d.h` L145-L146: "It is recommended not to make this value very small because it will prevent bodies from sleeping. Usually in meters per second."
- Iteraciones. `types.h` L116-L119: "Number of iterations of the restitution solver. More iterations can lead to less box spinning." Máximo: `#define B2_MAX_RESTITUTION_ITERATIONS 63` (`include/box2d/constants.h` L85).
- Material. `types.h` L406-L408: "The coefficient of restitution (bounce) usually in the range [0,1]." La restitución por defecto del material es 0, porque `b2DefaultSurfaceMaterial` solo fija `.friction = 0.6f` (`types.c` L73-L77). Sobre esto último, el valor exacto no está escrito como literal, así que lo leí del inicializador: el campo omitido vale 0 en C.
- Validación: `src/shape.c` L1328 `B2_CHECK_INPUT( b2IsValidFloat( restitution ) && restitution >= 0.0f );`. **Box2D sí acepta e > 1**, porque solo exige que e sea ≥ 0.
- Orden de etapas del solver. `src/solver.c` L1050-L1061 (comentario "Stage sequence"; lista en L1052-L1060): `PrepareJoints, PrepareContacts, IntegrateVelocities, WarmStart, Solve, IntegratePositions, Relax, Restitution, StoreImpulses`. **La restitución se aplica después del paso de relajación, como un paso aparte al final de cada paso de tiempo** (las demás etapas se repiten por subpaso).
- Función de restitución (versión escalar "overflow"). `src/contact_solver.c` L571-L689, https://github.com/erincatto/box2d/blob/v3.2.0/src/contact_solver.c#L571-L689. Líneas clave:
  - L629-L630: `float compressionImpulse = cp->totalNormalImpulse - cp->restitutionImpulse;` y `bool armed = restitution > 0.0f && cp->relativeVelocity < -threshold && compressionImpulse > 0.0f;`
  - L635: `velocityBias = restitution * cp->relativeVelocity;`
  - L649: `float impulse = -cp->normalMass * ( vn + velocityBias );`
  - L651-L652: el impulso acumulado se recorta a ≥ 0 (`b2MaxFloat( cp->normalImpulse + impulse, 0.0f )`).
  - L658-L659: "// Poisson kinetic restitution guarantees no energy gain." `float allowance = restitution * ( compressionImpulse + approachImpulse ) - cp->restitutionImpulse;`
  - La versión SIMD está en `src/contact_solver_wide.inl` L1934-L2060.
- Documentación oficial (`docs/simulation.md` L776-L804, https://github.com/erincatto/box2d/blob/v3.2.0/docs/simulation.md#L776-L804):
  - "Restitution is combined this way so that you can have a bouncy super ball without having a bouncy floor."
  - "When a shape develops multiple contacts, restitution is simulated approximately. This is because Box2D uses a sequential solver. Box2D also uses inelastic collisions when the collision velocity is small. This is done to prevent jitter."
  - "Restitution is solved after the main solver pass using the pre-solve approach velocity."
- `docs/questions.md` L129-L139: "constraints are not perfectly rigid and sometimes you will see some bounce even when the restitution is zero. Box2D uses Gauss-Seidel … Semi-implicit Euler … Slow moving shapes may have small overlap for a few time steps."
- Efecto túnel y CCD. `docs/simulation.md` L345-L359: "you may see some objects incorrectly pass through each other. This effect is called *tunneling*." Además: "By default, Box2D uses continuous collision detection (CCD) to prevent dynamic bodies from tunneling through static bodies" y "Normally CCD is not used between dynamic bodies. This is done to keep performance reasonable."
- Paso recomendado. `docs/hello.md` L171 `float timeStep = 1.0f / 60.0f;` y L182-L188: "The suggested sub-step count for Box2D is 4."
- Notas de versión. `docs/release_notes_v320.md` L21: "Restitution iterations and propagation."

**[box2d-v311] Box2D v3.1.1.** Erin Catto. 2025. Tag `v3.1.1`, commit `8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3`. **CONFIRMADO.** Es la versión más simple, la mejor para mostrar en el tema.
- `src/contact_solver.c` L394 `float threshold = context->world->restitutionThreshold;`
- L433-L439: "// if the normal impulse is zero then there was no collision …" `if ( cp->relativeVelocity > -threshold || cp->totalNormalImpulse == 0.0f ) { continue; }`
- L450-L451: "// compute normal impulse" `float impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity );`
- L455-L457: recorte del impulso acumulado a ≥ 0.
- L150-L153 (preparación): "// Save relative velocity for restitution" `cp->relativeVelocity = b2Dot( normal, b2Sub( vrB, vrA ) );`. Es la velocidad de aproximación **antes** del solver.
- `src/world.c` L94-L97 `b2DefaultRestitutionCallback … return b2MaxFloat( restitutionA, restitutionB );` · `src/types.c` L15 `def.restitutionThreshold = 1.0f * b2_lengthUnitsPerMeter;`
- `src/solver.c` L737-L738 y L957-L958: etapas `b2_stageRelax`, `b2_stageRestitution`.
- URL: https://github.com/erincatto/box2d/blob/v3.1.1/src/contact_solver.c#L383-L470

**[box2d-v242] Box2D v2.4.2.** Erin Catto. 2023. Tag `v2.4.2`, commit `411acc32eb6d4f2e96fc70ddbdf01fe5f9b16230`. **CONFIRMADO.**
- `include/box2d/b2_contact.h` L47-L52: "/// Restitution mixing law. The idea is allow for anything to bounce off an inelastic surface. /// For example, a superball bounces on anything." Devuelve el mayor de los dos valores. En L54-L58, el umbral se mezcla con mínimo (`b2MixRestitutionThreshold`).
- `include/box2d/b2_fixture.h` L67-L69: `restitution = 0.0f;` y `restitutionThreshold = 1.0f * b2_lengthUnitsPerMeter;`. En v2.4 el umbral es **por fixture**.
- `src/dynamics/b2_contact_solver.cpp` L214-L220: `if (vRel < -vc->threshold) { vcp->velocityBias = -vc->restitution * vRel; }`

**[box2d-v231] Box2D v2.3.1.** Tag `v2.3.1`, commit `7e633c4fb86a68bf072fb8ae67ea2c060114750e`. **CONFIRMADO.**
- `Box2D/Box2D/Common/b2Settings.h` L88-L90: "/// A velocity threshold for elastic collisions. Any collision with a relative linear velocity below this threshold will be treated as inelastic." `#define b2_velocityThreshold 1.0f`
- `Box2D/Box2D/Dynamics/Contacts/b2ContactSolver.cpp` L211 `if (vRel < -b2_velocityThreshold)`

**[unity-material] Physics Material component reference.** Unity Technologies. Unity 6.6 (6000.6) User Manual. https://docs.unity.com/en-us/engine/current/manual/physics-section/physics-overview/collision-section/collider-surfaces/class-physics-material **CONFIRMADO.**
- Bounciness: "A value of 0 means the surface is not at all bouncy (like soft clay) … A value of 1 means the surface is very bouncy (like rubber), and other colliders bounce without any loss of kinetic energy. By default, **Bounciness** is set to 0." También: "Note that the physics system's bounce approximations might still add small amounts of energy to the simulation."
- Bounce Combine: "By default, **Bounce Combine** is set to **Average**."

**[unity-combine] How collider surface values combine.** Unity 6.6. https://docs.unity.com/en-us/engine/6000.6/manual/physics-section/physics-overview/collision-section/collider-surfaces/combine **CONFIRMADO.** Prioridad: Maximum (1), Multiply (2), Minimum (3), Average (4). "Unity takes priority into consideration when the colliders in a collider pair have Physic Material assets with different combine settings."

**[unity-bouncecombine] PhysicsMaterial.bounceCombine.** Unity 6.6 Scripting API. https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physicsmaterial/bouncecombine **CONFIRMADO.** "Traditionally bounciness properties are dependent on the combination of the two materials in contact. This is however impractical in a game."

**[unity-bouncethreshold] Physics.bounceThreshold.** Unity 6.6. https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physics/bouncethreshold **CONFIRMADO.** "Two colliding objects with a relative velocity below this will not bounce (default 2). Must be positive." La página no indica unidades. Que sean m/s se deduce de PhysX (abajo).

**[unity-2d-bounciness] PhysicsMaterial2D.bounciness.** Unity 6.6. https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physicsmaterial2d/bounciness **CONFIRMADO.** "Values higher than one are allowed but will add "energy" to the collision response. Use caution, as this can cause a Rigidbody2D to move quickly without limit, leading to simulation problems."

**[unity-2d-bouncecombine] PhysicsMaterial2D.bounceCombine.** Unity 6.6. https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physicsmaterial2d/bouncecombine **CONFIRMADO.** "Defaults to PhysicsMaterialCombine2D.Maximum which allows either Collider2D to maximize bounciness. For example, a very bouncy ball always remains very bouncy."

**[unity-2d-bouncethreshold] Physics2D.bounceThreshold.** Unity 6.6. https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physics2d/bouncethreshold **CONFIRMADO** en cuanto al texto: "Any collisions with a relative linear velocity below this threshold will be treated as inelastic so no bounce will occur." Valor por defecto: **NO CONFIRMADO**, porque la página no lo da y la página de ajustes 2D devolvió 404.

**[physx] NVIDIA PhysX SDK, cabeceras y fuente.** NVIDIA. GitHub `NVIDIA-Omniverse/PhysX`, rama `main` en el commit `b97365c6ddb32fda8469bc788ec18024862b0368` (es el mismo commit que el tag `ovphysx-0.7.0`; las cabeceras descargadas de `main` y del commit coinciden byte a byte). **CONFIRMADO.**
- `physx/include/PxSceneDesc.h` L686-L696: "A contact with a relative velocity below this will not bounce. A typical value for simulation stability is about 0.2 * gravity." y "**Default:** 0.2 * PxTolerancesScale::speed". En L1047: `bounceThresholdVelocity (0.2f * scale.speed),`
- `physx/include/common/PxTolerancesScale.h` L40-L56: `speed` es "The typical magnitude of velocities of objects in simulation. This is used to estimate whether a contact should be treated as bouncing or resting based on its impact velocity" y su valor por defecto es `defaultSpeed=10.0f`. Por tanto, **0,2 × 10 = 2 m/s** (cálculo propio). Coincide con el "default 2" de Unity.
- `physx/include/PxMaterial.h` L75-L89: "Physics doesn't have any inherent combinations because the coefficients are determined empirically on a case by case basis. However, simulating this with a pairwise lookup table is often impractical." y "The effective combine mode for the pair is maximum(material0.combineMode, material1.combineMode)." L100-L107: `eAVERAGE = 0 … eMIN = 1 … eMULTIPLY = 2 … eMAX = 3`. L289: "<b>Default:</b> PxCombineMode::eAVERAGE" (combinación de restitución). L164-L175: rango de restitución "(-INF,1]". Un valor negativo se interpreta como rigidez de un contacto blando.
- `physx/source/lowleveldynamics/src/DyContactPrepShared.h` L318-L323: `const BoolV isGreater2 = BAnd(BAnd(FIsGrtr(restitution, zero), FIsGrtr(bounceThreshold, vrel)), collidingWithVrel);` y `FloatV targetVelocity = FAdd(cTargetVel, FSel(isGreater2, FMul(FNeg(vrel), restitution), zero));`. El signo de `bounceThreshold` en este punto (si llega negado) no lo verifiqué en el llamador: NO CONFIRMADO el detalle del signo. El sentido sí está claro: rebota solo si |v_rel| supera el umbral.
- Doc PhysX 5.4.1, Rigid Body Dynamics: https://nvidia-omniverse.github.io/PhysX/physx/5.4.1/docs/RigidBodyDynamics.html. "The coefficient of restitution of two colliding objects is a fractional value representing the ratio of speeds". **CONFIRMADO.**

**[bullet] Bullet Physics 3.25.** Erwin Coumans y colaboradores. GitHub `bulletphysics/bullet3`, tag `3.25` (commit `2c204c49e56ed15ec5fcfa71d199ab6d6570b3f5`), licencia zlib. **CONFIRMADO.**
- `src/BulletCollision/CollisionDispatch/btManifoldResult.cpp` L68-L71: `return body0->getRestitution() * body1->getRestitution();`. **La mezcla es por producto.**
- `src/BulletDynamics/ConstraintSolver/btSequentialImpulseConstraintSolver.cpp` L494-L502: `if (btFabs(rel_vel) < velocityThreshold) return 0.;` y `btScalar rest = restitution * -rel_vel;`. Se usa en L913.
- `src/BulletDynamics/ConstraintSolver/btContactSolverInfo.h` L108: `m_restitutionVelocityThreshold = 0.2f;  //if the relative velocity is below this threshold, there is zero restitution`. En L87 `m_erp2 = btScalar(0.2);` y en L95-L96 `m_splitImpulse = true;` / `m_splitImpulsePenetrationThreshold = -.04f;`. En L82 `m_timeStep = btScalar(1.f / 60.f);`.

**[jolt] Jolt Physics v5.6.0.** Jorrit Rouwe. GitHub `jrouwe/JoltPhysics`, tag `v5.6.0` (`e77f175`), licencia MIT. **CONFIRMADO.**
- `Jolt/Physics/PhysicsSettings.h` L89-L92: "Minimal velocity needed before a collision can be elastic. If the relative velocity between colliding objects in the direction of the contact normal is lower than this, the restitution will be zero regardless of the configured value. This lets an object settle sooner. Must be a positive number. (unit: m)" `float mMinVelocityForRestitution = 1.0f;`. El "(unit: m)" está así en la fuente, aunque por su uso la magnitud es m/s.
- `Jolt/Physics/Constraints/ContactConstraintManager.h` L60-L61: "Default method is max(restitution1, restitution1)". El typo está en la fuente.
- `Jolt/Physics/Constraints/ContactConstraintManager.cpp` L77-L118. Contiene dos comentarios que valen oro para el tema:
  - L81-L87: "…the object will bounce from its current position rather than from a position where it is touching the other object. This causes the object to appear to move faster for 1 frame (the opposite of time stealing)."
  - L90-L93: "The gravity / constant forces are applied in the beginning of the time step. If we get here, there was a collision at the beginning of the time step, so we've applied too much force. This means that our calculated restitution can be too high resulting in an increase in energy. So, when we apply restitution, we cancel the added velocity due to these forces."
  - L118: `normal_velocity_bias = inSettings.mCombinedRestitution * (normal_velocity - force_delta_velocity);`

**[godot] Godot Engine 4.7.2-stable.** Godot contributors. GitHub `godotengine/godot`, tag `4.7.2-stable` (`ed1daf0`), licencia MIT. **CONFIRMADO.**
- Doc `PhysicsMaterial` (Godot 4.7): https://docs.godotengine.org/en/stable/classes/class_physicsmaterial.html. `bounce` tiene valor por defecto `0.0`: "Values range from `0` (no bounce) to `1` (full bounciness)." `absorbent` tiene valor por defecto `false`: "If `true`, subtracts the bounciness from the colliding object's bounciness instead of adding it."
- `scene/resources/physics_material.h` L66-L68: `return absorbent ? -bounce : bounce;`
- GodotPhysics: `modules/godot_physics_3d/godot_body_pair_3d.cpp` L255-L256 `return CLAMP(A->get_bounce() + B->get_bounce(), 0, 1);`. **La mezcla es por suma, recortada a [0,1].** Lo mismo ocurre en 2D, en `godot_body_pair_2d.cpp` L243-L244. En L444-L450 (3D) el rebote se calcula como `c.bounce * dv.dot(c.normal)` usando la velocidad del paso **anterior**. En ese bloque no vi ningún umbral de velocidad (observación de lectura; para afirmar que "no hay umbral en GodotPhysics" haría falta revisar más: NO CONFIRMADO de forma global).
- `godot_body_pair_3d.cpp` L164-L167 (CCD): "WARNING: The way velocity is adjusted down to cause a collision means the momentum will be weaker than it should for a bounce!"
- Jolt en Godot: `modules/jolt_physics/jolt_project_settings.cpp` L45 `bounce_velocity_threshold` vale por defecto `1.0f`, con sufijo "m/s". `modules/jolt_physics/spaces/jolt_space_3d.cpp` L131 `settings.mMinVelocityForRestitution = …bounce_velocity_threshold;` y L158-L159 `return CLAMP(p_body1.GetRestitution() + p_body2.GetRestitution(), 0.0f, 1.0f);`. Godot reemplaza la mezcla `max` de Jolt por la suma.
- Cuál es el motor 3D por defecto de Godot 4.7 (Jolt o GodotPhysics): NO CONFIRMADO.

**[rocketsim] RocketSim, `src/RLConst.h`.** ZealanL. GitHub `ZealanL/RocketSim`, commit `c2baacb8f4b441dd8505e63c2aeb5a1679b60b02`. Es una **reimplementación comunitaria, NO oficial**, y su README dice "not a perfectly accurate replication of Rocket League". Sus constantes son: `BALL_RESTITUTION = 0.6f, // Bounce factor` (L47), `ARENA_COLLISION_BASE_RESTITUTION = 0.3f` (L26), `CARBALL_COLLISION_RESTITUTION = 0.0f` (L35), `GRAVITY_Z = -650.f` (L12) y `BALL_DRAG = 0.03f` (L45). Están en uu (unidades de Unreal). Estado: **NO CONFIRMADO como dato de Psyonix**.

### 3.2 Charlas y artículos de motor

**[catto-solver2d] Solver2D (blog).** Erin Catto. 2024-02-05. box2d.org. https://box2d.org/posts/2024/02/solver2d/ **CONFIRMADO.**
- Baumgarte: `float incrementalImpulse = -meff * (vn + 0.2f * contactSeparation / timeStep);`. "The main complaint is that it is not physically accurate and it can lead to energy creation and jitter if not tuned carefully."
- Relajación: "With Baumgarte Stabilization or soft constraints, the first call to SolveConstraints will add extra energy to the impulses to push the bodies apart. … in the second call to SolveConstraints I'm disabling the use of Baumgarte Stabilization or soft constraints. This serves to remove the extra energy". Esto explica por qué en Box2D v3 la restitución va **después** de `Relax`.

**[catto-gdc2014] Understanding Constraints.** Erin Catto. GDC 2014. https://box2d.org/files/ErinCatto_UnderstandingConstraints_GDC2014.pdf **CONFIRMADO.** Pág. 52, "Biased contact constraint" (C′ = v·n − β s/Δt): "the velocity bias adds kinetic energy to the simulation and this is may cause instabilities."

**[catto-gdc2013] Continuous Collision.** Erin Catto. GDC 2013. https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf **CONFIRMADO.**
- Pág. 3: "Consider a bouncing ball. … suppose the discrete time steps skip over the time where the ball hits the floor. How can the ball bounce if it never touches the floor?"
- Pág. 4: "If you ignore the missed collision you can get tunneling."
- Pág. 7 (speculative contacts): "restitution needs special handling because the velocity will be zero when the ball hits the floor".

**[catto-gdc2006] Fast and Simple Physics using Sequential Impulses.** Erin Catto. GDC 2006. https://box2d.org/files/ErinCatto_SequentialImpulses_GDC2006.pdf **CONFIRMADO.** Pág. 6: "Impulses are good at making things bounce. Many attempts to use impulses leads to bouncy simulations (aka jitter)." y "It's always easy to add back in the bounce." Las págs. 23-24 tratan "Bias Impulse / Bias Velocity".

**[rl-gdc2018] It IS Rocket Science! The Physics of Rocket League Detailed.** Jared Cone (Psyonix). GDC 2018. Que la charla existe está **CONFIRMADO** por Game Developer: https://gamedeveloper.com/design/video-the-rocket-science-behind-i-rocket-league-s-i-physics (artículo del 2018-04-24: "networked physics of Rocket League"). El video en YouTube (`ueEmiDM94IE`) no se pudo leer. El uso de Bullet, los 120 Hz y la restitución de la pelota vienen solo de un resumen de terceros (glasp.co): **NO CONFIRMADO**. La página de rocketleague.com devolvió 403.

### 3.3 Normas de pelotas reales

**[itf-rules-2026] ITF Rules of Tennis 2026, Appendix I "The Ball".** International Tennis Federation. 2025 (vigente en 2026; ModDate del PDF: 2025-12-23). https://www.itftennis.com/media/7221/2026-rules-of-tennis-english.pdf **CONFIRMADO.** Pág. 19, tabla (b), REBOUND: Type 1 (Fast) **138-151 cm**; Type 2 (Medium) **135-147 cm**; Type 3 (Slow) **135-147 cm**; High Altitude **122-135 cm**. Masa: 56,0-59,4 g; tamaño: 6,54-6,86 cm (Type 3: 7,00-7,30 cm). La regla remite el método de ensayo a "ITF Approved Tennis Balls, Classified Surfaces & Recognised Courts". La altura de caída no está en el Appendix.

**[itf-tests] Ball Approval Tests.** ITF Technical Centre. Noviembre de 2019. https://www.itftennis.com/media/2100/balls-ball-approval-tests.pdf **CONFIRMADO.** "The rule specifying how the ball should bounce was set in 1925 and is still in use today. The test involves dropping a ball vertically from a height of 254 cm (100 inches) and measuring the rebound." También: "a smooth granite block onto which the ball bounces". Condiciones del laboratorio: 20 ± 2 °C y 60 ± 5 % de humedad relativa. El documento no dice si los 254 cm se miden a la base o al centro de la pelota: NO CONFIRMADO.

**[fiba-2026-eq] Official Basketball Rules 2026: Basketball Equipment, v1.0.** FIBA. Julio de 2026 (vigente desde el 2026-10-01). https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-equipment-v1-0.pdf **CONFIRMADO.** Pág. 11, cláusula 2.4: "when it is dropped onto the floor from a height of approximately **1,800 mm** measured from the underside of the ball, it shall rebound to a height of between **1,035 and 1,085 mm**, measured to the underside of the ball." Pág. 18, cláusula 10 (Floor): "Ball rebound, according to EN 12235 ≥ 93 %" (Level 1). Este dato del piso sirve para ilustrar que **el suelo también participa** en el e efectivo.
- Nota: la cifra "1 200-1 400 mm" que circula en webs secundarias **no** está en la edición 2026. No la usé.

**[fifa-balls-2018] FIFA Quality Programme for Footballs, Testing Manual.** FIFA. Febrero de 2018. https://digitalhub.fifa.com/m/4e93a32cd03542cf/original/testing-manual-fifa-quality-programme-for-footballs-2018.pdf **CONFIRMADO.**
- Pág. 8, Test 03 Rebound: "free fall vertically from a height of **2.00m±0.01m** (measured from the bottom of the ball … The surface … shall be metal". También "Velocity at the impact 6.25 ± 0.15/sec (equals a drop height of 2m)" y "the height of rebound, from the underside side of the ball".
- Pág. 9, método acústico: "H = 1.23 (T - Δt)² x 100", donde T es el tiempo entre el primer y el segundo impacto y Δt = 0,025 s. Esto se conecta con el paso 1: h = g T²/8 y g/8 = 1,226 (cálculo propio).
- Pág. 17, requisitos para balón de exterior de talla 5, a 20 °C: **FIFA Quality PRO 135-155 cm**; FIFA Quality 125-155 cm; FIFA Basic 125-155 cm. A 5 °C: mínimos de 125 / 115 / 115 cm. Los encabezados de columna son logotipos y los verifiqué viendo la página renderizada.
- Existe una edición de enero de 2026 (citada en fxbaogao.com), pero no la abrí: NO CONFIRMADO que los valores sigan iguales.

**[usga-cor] Límite de COR 0,830 en cabezas de palo de golf (USGA).** **NO CONFIRMADO.** usga.org devolvió 403, y solo hay patentes y prensa (golf.com, entre otras) que dicen que USGA limitó el COR del driver a 0,830 (0,822 + 0,008 de tolerancia), medido con una bola disparada a 160 ft/s, y que hoy se usa la prueba CT (239 μs + 18 μs). Es un choque palo-bola, no un bote contra el suelo. **No recomiendo usarlo**, o solo con la marca NO CONFIRMADO.

### 3.4 Física del bote (literatura revisada por pares)

**[cross-1999-bounce] The bounce of a ball.** Rod Cross. 1999. *American Journal of Physics* 67(3), 222-227, AAPT. DOI 10.1119/1.19229. PDF del autor: https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/5.%20BallBounce.pdf **CONFIRMADO.** Tabla I, con v1 (incidente) y v2 (rebote) a baja velocidad sobre un disco piezoeléctrico montado en una barra de latón:

| Pelota | v1 (m/s) | v2 (m/s) | e = v2/v1 (cálculo propio) |
|---|---|---|---|
| Tenis | 2,95 | 2,38 | 0,81 |
| Superbola | 3,12 | 2,33 | 0,75 (el autor advierte: "did not bounce particularly well … microscopic cracks") |
| Golf | 1,47 | 1,24 | 0,84 |
| Béisbol | 1,25 | 0,61 | 0,49 |
| Bola de acero | 0,77 | 0,65 | 0,84 |
| Plastilina | 1,47 | 0 | 0 |

**[cross-1999-tennis] Dynamic properties of tennis balls.** Rod Cross. 1999. *Sports Engineering* 2, 23-33, Blackwell Science. https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/7.%20BallsDynamicTests.PDF **CONFIRMADO.**
- Pág. 31: "The standard 100 inch drop test corresponds to an incident ball speed of 7.05 ms⁻¹, and the range of e at this speed, specified in the rules of tennis, is 0.728 < e < 0.762." Esto coincide con mi cálculo a partir de la ITF.
- Pág. 28: "tailor the coefficient of restitution to decrease, as the ball speed increases, by a specified amount. This already happens, but the amount is not specified."
- Figs. 8 y 10, págs. 30-31, **e frente a v1** (lectura aproximada de las gráficas): Dunlop Airloc, e ≈ 0,76 a ~4 m/s y e ≈ 0,64 a ~17 m/s; Wilson, e ≈ 0,77 a ~5 m/s y ≈ 0,66 a ~14 m/s. Son valores leídos de la figura y no impresos como números; en la página marcarlos "aprox., leído de la Fig. 8 de Cross (1999)".

**[cross-2002-superball] Measurements of the horizontal coefficient of restitution for a superball and a tennis ball.** Rod Cross. 2002. *American Journal of Physics* 70(5), 482-489. DOI 10.1119/1.1450571. https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/20.%20HorizCOR.PDF **CONFIRMADO.**
- Superbola sobre madera dura: "v_y1 = −4.13 m/s … v_y2 = 3.57 m/s … with **e_y = 0.86**", y e_x = 0,76.
- Resumen: "Ideally, the coefficient of restitution (COR) of a superball is 1.0 in both the vertical and horizontal directions."
- Este es el valor que conviene usar para el preset de la superbola.

**[cross-2007-twoball] Vertical bounce of two vertically aligned balls.** Rod Cross. 2007. *American Journal of Physics* 75(11), 1009-1016. https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/38.%202BallBounce.pdf **CONFIRMADO** (solo como respaldo): con superbolas obtiene buenos ajustes con e = 0,88-0,92, y "e = 0.78 for the large ball".

**[serway] Serway y Jewett, *Física para ciencias e ingeniería*, Vol. 1, 10.ª ed., Cengage 2018** (ya está en el repo). Es la fuente de libro de texto para el momento lineal, las colisiones y e. Hay que verificar el capítulo y la sección en el ejemplar (NO CONFIRMADO el número de sección en esta nota).

---

## 4. Números clave

| Dato | Valor | Fuente |
|---|---|---|
| Umbral de restitución por defecto en Box2D v3 | 1 m/s (`1.0f * lengthUnits`, con lengthUnits = 1) | box2d-v320 `types.c` L18; `core.c` L36 |
| Umbral en Box2D v2.x | `b2_velocityThreshold 1.0f` (v2.3.1); por fixture `1.0f * b2_lengthUnitsPerMeter` (v2.4.2) | box2d-v231, box2d-v242 |
| Mezcla de e en Box2D (v2 y v3) | máx(e_A, e_B) | `contact.h` L162-L165 |
| Iteraciones de restitución en Box2D v3.2 | 2 por defecto, 63 como máximo | `types.c` L19; `constants.h` L85 |
| Paso recomendado en Box2D | 1/60 s con 4 subpasos | `docs/hello.md` L171, L182-L188 |
| Umbral en PhysX | 0,2 × `PxTolerancesScale::speed` = 0,2 × 10 = **2 m/s** (cálculo propio) | PxSceneDesc.h L686-L696, L1047; PxTolerancesScale.h L55, L65-L67 |
| Umbral en Unity 3D | 2 ("default 2") | unity-bouncethreshold |
| Mezcla en Unity 3D / PhysX | Average por defecto; prioridad Max > Multiply > Min > Average | unity-material, unity-combine, PxMaterial.h |
| Mezcla en Unity 2D | Maximum por defecto | unity-2d-bouncecombine |
| Umbral en Bullet | 0,2 (`m_restitutionVelocityThreshold`); mezcla por producto | bullet |
| Umbral en Jolt | 1,0 (`mMinVelocityForRestitution`); mezcla máx | jolt |
| Godot | suma recortada a [0,1]; con Jolt, umbral de 1,0 m/s | godot |
| Tenis (ITF Type 2) | 254 cm → 135-147 cm ⇒ **e = 0,729-0,761** (cálculo propio; Cross da 0,728-0,762) | itf-rules-2026, itf-tests |
| Tenis (ITF Type 1) | 254 → 138-151 cm ⇒ e = 0,737-0,771 (cálculo propio) | itf-rules-2026 |
| Velocidad de impacto del ensayo ITF | √(2·9,81·2,54) = 7,06 m/s (cálculo propio; Cross: 7,05) | — |
| Baloncesto (FIBA 2026) | 1 800 → 1 035-1 085 mm ⇒ **e = 0,758-0,776** (cálculo propio); impacto a 5,94 m/s | fiba-2026-eq |
| Fútbol (FIFA Quality PRO, 20 °C) | 2,00 m → 135-155 cm ⇒ **e = 0,822-0,880** (cálculo propio); impacto a 6,25 m/s (manual) | fifa-balls-2018 |
| Fútbol (FIFA Quality) | 2,00 → 125-155 cm ⇒ e = 0,791-0,880 (cálculo propio) | fifa-balls-2018 |
| Superbola sobre madera | **e_y = 0,86** | cross-2002-superball |
| Béisbol (baja velocidad) | e ≈ 0,49 (cálculo propio, Tabla I) | cross-1999-bounce |
| Plastilina | e = 0 | cross-1999-bounce |
| e de tenis frente a velocidad | ≈ 0,76 → ≈ 0,64 entre ~4 y ~17 m/s (aprox., figura) | cross-1999-tennis |

**Umbral expresado como altura** (cálculo propio, h_th = v_th²/2g):

| Umbral | Altura equivalente |
|---|---|
| Bullet, 0,2 m/s | 2,0 mm |
| Box2D o Jolt, 1 m/s | 5,1 cm |
| Unity o PhysX, 2 m/s | 20,4 cm |

**Ejemplos de "parada en seco"** (cálculo propio; caída desde h₀ sin rozamiento del aire; N = número de rebotes antes de que el impacto quede por debajo del umbral):

| h₀ | e | v_th | N rebotes | Altura del último rebote | Impacto final (ya sin rebote) |
|---|---|---|---|---|---|
| 1 m | 0,9 | 2 m/s (Unity) | 8 | **18,5 cm** | 1,91 m/s |
| 1 m | 0,9 | 1 m/s (Box2D) | 15 | 4,2 cm | 0,91 m/s |
| 1 m | 0,75 | 1 m/s | 6 | 3,2 cm | 0,79 m/s |
| 1 m | 0,75 | 2 m/s | 3 | 17,8 cm | 1,87 m/s |
| 1 m | 0,9 | 0,2 m/s (Bullet) | 30 | 1,8 mm | 0,19 m/s |

En la primera fila, una superbola de e = 0,9 en Unity rebota 18,5 cm y en el siguiente contacto se queda pegada al suelo. Ese es el "rebota mal" que se ve.

**Tiempo total de rebotes** (cálculo propio, T = t₀(1+e)/(1−e) con t₀ = √(2h₀/g) = 0,4515 s para h₀ = 1 m): e = 0,5 da T = 1,35 s; e = 0,75 da T = 3,16 s; e = 0,9 da T = 8,58 s.

**Penetración por paso** (cálculo propio): una pelota que cae desde 1 m llega a 4,43 m/s y en un paso de 1/60 s recorre 7,4 cm; con 4 subpasos (1/240 s), 1,8 cm. La gravedad añade g·Δt = 0,164 m/s por paso a 60 Hz (0,041 m/s por subpaso).

---

## 5. La física en 4 pasos (formato de la casa)

Convención: eje +y hacia arriba, suelo en y = 0, g = 9,81 m/s². v_y < 0 es bajando.

### Paso 1. Modelo simple: la pelota contra un suelo fijo
- Definición de e (Newton) para un suelo inmóvil:
  `e = -\dfrac{v_y'}{v_y}`, con 0 ≤ e ≤ 1, donde v_y es la velocidad justo antes del contacto y v_y′ la de justo después.
- Por conservación de energía en vuelo, v = √(2gh). Entonces h′/h = (v′/v)² = e², es decir `e = \sqrt{h'/h}`. Esta es la fórmula de los ensayos ITF, FIBA y FIFA.
- Alturas sucesivas: `h_n = e^{2n} h_0`. Velocidades de impacto: `v_n = e^n v_0`, con `v_0 = \sqrt{2 g h_0}`.
- Tiempo de vuelo entre el impacto n y el n+1 (subida y bajada): `t_n = \dfrac{2 e v_n}{g} = \dfrac{2 v_0 e^{n+1}}{g}`. Ojo con el índice: la pelota sale del impacto n con velocidad e·v_n. Si se define v_n como la velocidad **de salida**, entonces t_n = 2v_n/g.
- Tiempo total, contando desde que se suelta: `T = t_0 + \sum_{n\ge1} 2 t_0 e^n = t_0\,\dfrac{1+e}{1-e}`, con `t_0 = \sqrt{2h_0/g}` y usando 2v₀/g = 2t₀.
  Comprobación (cálculo propio): Σ_{n≥1} eⁿ = e/(1−e), así que T = t₀(1 + 2e/(1−e)) = t₀(1+e)/(1−e). ✔
- **Conclusión del paso:** hay infinitos rebotes en un tiempo finito (paradoja de Zenón). Un motor con paso Δt no puede resolver rebotes que duran menos que Δt.
- Puente con la FIFA (cálculo propio): si T es el tiempo entre dos botes, h = g(T/2)²/2 = gT²/8. Como g/8 = 1,226, sale el "H = 1.23 (T − Δt)² × 100" del manual.

### Paso 2. Por qué no basta: el choque entre dos cuerpos (momento lineal)
- Conservación del momento lineal en 1D: `m_1 v_1 + m_2 v_2 = m_1 v_1' + m_2 v_2'`.
- Restitución (ley de Newton): `e = -\dfrac{v_2' - v_1'}{v_2 - v_1}`.
- Al resolver el sistema:
  `v_1' = \dfrac{(m_1 - e\,m_2)\,v_1 + (1+e)\,m_2 v_2}{m_1+m_2}`, `v_2' = \dfrac{(m_2 - e\,m_1)\,v_2 + (1+e)\,m_1 v_1}{m_1+m_2}`
- Casos límite: con e = 1 (elástico) se conserva K; con e = 0 (perfectamente inelástico) `v_1' = v_2' = \dfrac{m_1 v_1 + m_2 v_2}{m_1+m_2}`.
- Energía. Con masa reducida `\mu = \dfrac{m_1 m_2}{m_1+m_2}` y v_rel = v₂ − v₁: `\Delta K = -\tfrac12\,\mu\,(1-e^2)\,v_{rel}^2`. La energía cinética del movimiento relativo (la del sistema centro de masas) es ½μ v_rel², así que **la fracción perdida en el sistema CM es 1 − e²**. La energía del centro de masas no se toca.
- El suelo es el caso m₂ → ∞ con v₂ = 0: v₁′ = −e v₁, y se recupera el paso 1.
- Ejemplos numéricos (cálculo propio): la pelota de tenis ITF pierde entre 1 − 0,761² = 42 % y 1 − 0,729² = 47 % de su K en cada bote; el balón FIFA Pro, entre 23 % y 32 %.
- **Por qué no basta todavía:** el modelo trata el choque como instantáneo y aislado. En un motor de juego hay pasos de tiempo discretos, varios contactos a la vez, penetración y materiales que se mezclan. El modelo no dice qué hacer cuando la colisión "ocurrió entre fotogramas".

### Paso 3. Lo que falta: qué hace un motor discreto (Box2D)
- Impulso normal sobre el contacto (sin rotación, para simplificar): `j = -(1+e)\,\dfrac{\mathbf v_{rel}\cdot\mathbf n}{1/m_1 + 1/m_2}`, y se aplica `\mathbf v_1' = \mathbf v_1 - \dfrac{j}{m_1}\mathbf n`, `\mathbf v_2' = \mathbf v_2 + \dfrac{j}{m_2}\mathbf n`. Con rotación, el denominador incluye los términos (r × n)²/I. En Box2D, `normalMass` es exactamente 1/K.
- Box2D v3.1.1 lo resuelve como un incremento sobre la velocidad actual v_n, que ya incluye el impulso de no penetración, con objetivo v_n⁺ = −e v_n⁻:
  `\Delta j = -m_{\text{eff}}\,(v_n + e\,v_n^-)`, con el impulso acumulado recortado a ≥ 0. Código: `impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity );`
- Tres reglas que no son física sino decisiones de ingeniería:
  1. **Umbral:** `e_{\text{efectivo}} = \begin{cases} e & \text{si } -v_n^- > v_{th}\\ 0 & \text{si no}\end{cases}`. En Box2D, v_th = 1 m/s. Esto corta la serie infinita del paso 1 al cabo de N rebotes, con `N = \left\lfloor \dfrac{\ln(v_0/v_{th})}{\ln(1/e)} \right\rfloor + 1` (cálculo propio, si v₀ > v_th).
  2. **Mezcla:** `e = \max(e_A, e_B)` en Box2D, Jolt y Unity 2D; (e_A+e_B)/2 en Unity 3D y PhysX; e_A·e_B en Bullet; min(e_A+e_B, 1) en Godot. En la naturaleza, e es una propiedad **del par** y no de cada material: esto lo admiten PhysX ("determined empirically on a case by case basis") y Unity.
  3. **Paso de tiempo:** la colisión se detecta con penetración de hasta |v|Δt. La corrección de posición (Baumgarte, `vn + 0.2·s/Δt`, o restricciones blandas) añade energía, y por eso Box2D v3 corre `Relax` (sin sesgo) **antes** de `Restitution`. La gravedad del paso ya entró en v_n⁻: Jolt resta explícitamente ese g·Δt para no ganar energía.
- Qué cuesta (para el `<Why>`): una pasada extra del solver (2 iteraciones por defecto en v3.2); la exactitud solo es aproximada cuando hay varios contactos ("restitution is simulated approximately … sequential solver"); el umbral produce paradas en seco; la elección de la mezcla cambia el resultado según el motor; y para cuerpos rápidos hace falta CCD, con su coste.

### Paso 4. Modelo mejorado (dentro del tema)
Dos mejoras con fuente, de menor a mayor riqueza:

1. **Restitución de Poisson, sobre el impulso en lugar de la velocidad** (Box2D v3.2.0). Se divide el choque en compresión (impulso J_c) y restitución (J_r):
   `J_r \le e\,J_c`. El código v3.2 la usa como tope (`allowance = restitution * ( compressionImpulse + approachImpulse ) - cp->restitutionImpulse`), con el comentario "Poisson kinetic restitution guarantees no energy gain".
   Contra un suelo fijo, sin rozamiento y con un solo punto, coincide con la ley de Newton (cálculo propio: J_c = m|v⁻|, J_r = e m|v⁻| ⇒ v⁺ = e|v⁻|). Con varios contactos o con rotación evita la ganancia de energía que puede producir la definición por velocidades.
2. **e depende de la velocidad de impacto.** Las medidas de Cross (1999) muestran que para pelotas de tenis e baja de ≈ 0,76 a ≈ 0,64 cuando v sube de ~4 a ~17 m/s, y el mismo artículo afirma: "This already happens, but the amount is not specified". Modelo propuesto, lineal y ajustado a esos dos puntos aproximados (cálculo propio, marcar como ajuste ilustrativo):
   `e(v) = e_0 - k\,|v|`, con e₀ ≈ 0,79 y k ≈ 0,009 s/m, recortado a [0, 1].
   Con este modelo, las alturas ya no siguen h_n = e^{2n}h₀. Cada bote usa e(v_n), y a velocidad baja e es **mayor**, así que la secuencia de rebotes pequeños se alarga en lugar de cortarse. Esto agudiza el contraste con el umbral del motor, que hace justo lo contrario: pone e = 0 a velocidad baja. Si se prefiere no ajustar una recta a una figura, se puede presentar solo cualitativamente con la cita y la figura de Cross.
   - Efecto colateral que conviene mencionar: el giro y el rozamiento producen un "e horizontal", 0,76 en la superbola de Cross (2002). Es una extensión válida para un callout, pero queda fuera del 1D del tema.

---

## 6. "Por qué rebota mal": mecanismos citados

| Mecanismo | Qué se ve | Causa en el motor | Cita |
|---|---|---|---|
| (a) Umbral contra la serie de Zenón | Una pelota con e alto rebota 18 cm y se queda pegada (Unity, v_th = 2); o al revés, si v_th es muy bajo, micro-rebotes y temblor que no la dejan dormir | `relativeVelocity > -threshold ⇒ continue` | Box2D `docs/simulation.md` L794-L795 ("inelastic collisions when the collision velocity is small. This is done to prevent jitter"); `box2d.h` L145-L146 ("prevent bodies from sleeping"); Jolt PhysicsSettings.h L89-L91 ("This lets an object settle sooner"); Catto GDC 2006, pág. 6 (jitter) |
| (b) Ganancia de energía por corrección de penetración | Rebota más alto de lo soltado, o tiembla en reposo; "bounce even when the restitution is zero" | Baumgarte / sesgo de velocidad β s/Δt | Catto, Solver2D ("energy creation and jitter"); Catto GDC 2014, pág. 52 ("adds kinetic energy"); Box2D `questions.md` L129-L131; Unity manual ("might still add small amounts of energy") |
| (b′) Gravedad aplicada antes del contacto | Ligera ganancia de energía por bote; la pelota parece ir más rápido durante 1 frame | v_n⁻ ya incluye g·Δt; rebota desde la posición penetrada | Jolt ContactConstraintManager.cpp L81-L93 |
| (b″) e ≥ 1 | Cada bote sube más: la pelota "se dispara" | Ningún motor de los revisados lo prohíbe del todo: Box2D exige ≥ 0, Unity 2D lo permite con advertencia y PhysX limita a ≤ 1 | Unity `PhysicsMaterial2D.bounciness`; Box2D `shape.c` L1328; PhysX PxMaterial.h L175 |
| (c) Mezcla de materiales | Con `max`, una pelota "viva" rebota igual sobre barro o alfombra. Con promedio, una pelota de 0,8 sobre suelo 0 queda en 0,4. Con producto (Bullet), sobre suelo 0 queda muerta. Con suma (Godot), 0,5 + 0,5 = 1: rebote eterno | Regla de mezcla por defecto | Box2D `contact.h`; PhysX/Unity; Bullet `btManifoldResult.cpp` L68-L71; Godot `godot_body_pair_3d.cpp` L255-L256 |
| (d) Paso discreto y efecto túnel | La pelota rápida atraviesa el suelo o rebota desde dentro; el resultado cambia con los fps | Detección por muestreo; CCD solo contra cuerpos estáticos | Catto GDC 2013, págs. 3-4 y 7; Box2D `simulation.md` L345-L359; Godot L164-L167 (CCD que "steals" momento) |
| (e) Rebote aproximado con varios contactos | Una caja que debería rebotar recta gira ("box spinning") | Solver secuencial (Gauss-Seidel) | Box2D `simulation.md` L793-L794; `types.h` L116-L117 |

---

## 7. Diseño de la simulación (recurso SIMULACIÓN INTERACTIVA)

Requisitos de la casa ("simulations must be rich"): controles de transporte (reproducir, pausar, paso a paso, reiniciar), línea de tiempo, panel de ajustes y presets, no solo deslizadores. El JumpLab del tema 2 (`src/components/topics/salto-personaje/JumpLab.tsx`, `jumpModel.ts`, `jumpWorlds.ts`) es la referencia de estructura.

**Vista principal (dos pelotas en paralelo, mismo h₀):**
- Izquierda, "**Física ideal**": la solución analítica del paso 1 (o del 4, si se activa e(v)), con eventos de impacto exactos.
- Derecha, "**Motor de juego**": un integrador semi-implícito de Euler con paso Δt, detección por penetración, impulso del paso 3, umbral, mezcla y, opcionalmente, Baumgarte.
- Gráficas sincronizadas: y(t) de ambas, energía mecánica E(t) (escalones de 1 − e² por bote; ganancias marcadas en rojo) y la secuencia de alturas h_n frente a la recta teórica e^{2n} en escala logarítmica.
- Lecturas: e efectivo del último bote (= √(h′/h) medido), número de rebotes, T total frente a T teórico t₀(1+e)/(1−e).

**Controles:**
- e de la pelota (0-1,2, con zona >1 marcada), e del suelo, modo de mezcla (máx / promedio / mín / producto / suma recortada), v_th (0-3 m/s, con marcas en 0,2 / 1 / 2), Δt (1/30, 1/60, 1/120, 1/240), subpasos, Baumgarte β (0-1), e(v) activado o no, h₀.
- Modo **"Choque 1D de dos cuerpos"**: m₁, m₂, v₁, v₂ y e. Muestra p antes y después (igual) y ΔK y ΔK/K_CM = 1 − e², además del caso m₂ → ∞.

**Presets** (todos con g = 9,81 m/s²):

| Preset | e | Otros ajustes | Fuente de los números |
|---|---|---|---|
| Tenis ITF (Type 2) | 0,745 (centro de 0,729-0,761) | h₀ = 2,54 m | itf-rules-2026 + itf-tests (cálculo propio) |
| Baloncesto FIBA | 0,767 (centro de 0,758-0,776) | h₀ = 1,80 m | fiba-2026-eq (cálculo propio) |
| Fútbol FIFA Quality PRO | 0,851 (centro de 0,822-0,880) | h₀ = 2,00 m | fifa-balls-2018 (cálculo propio) |
| Superbola | 0,86 | h₀ = 1 m | cross-2002-superball |
| Béisbol (baja velocidad) | 0,49 | h₀ = 0,5 m | cross-1999-bounce (cálculo propio) |
| Plastilina | 0 | — | cross-1999-bounce |
| **"Se siente mal": e = 1** | 1 | sin umbral | rebota para siempre; E constante (Box2D docs: "perfectly elastic") |
| **"Se siente mal": e > 1** | 1,1 | — | gana energía en cada bote (advertencia de Unity 2D) |
| **"Se siente mal": e demasiado bajo** | 0,2 | pelota "de tenis" | muere al primer bote; con 1 − 0,04 se pierde el 96 % de K_CM |
| **"Se siente mal": umbral alto (Unity)** | 0,9 | v_th = 2 m/s, h₀ = 1 m | 8 botes y parada en seco tras uno de 18,5 cm (cálculo propio) |
| **Box2D por defecto** | 0,9 | v_th = 1 m/s, Δt = 1/60, 4 subpasos, mezcla máx | box2d-v320 |
| **"Se siente mal": mezcla** | pelota 0,85 / suelo 0 o 0,5 | alternar máx / prom / producto / suma | máx → 0,85; prom → 0,425 / 0,675; producto → 0 / 0,425; suma → 0,85 / 1,0 (cálculo propio) |
| **"Se siente mal": fps bajos + Baumgarte** | 0,75 | Δt = 1/30, β = 0,2 (Catto), sin relajación | la penetración por paso (hasta 14,8 cm desde 1 m) más el sesgo añaden energía (cálculo propio, ilustrativo) |
| **Realista mejorado** | e(v) = 0,79 − 0,009·|v| | tenis | ajuste ilustrativo a la Fig. 8 de Cross (1999) |

---

## 8. Riesgos y advertencias

- **No inventar cifras de Rocket League.** Solo es verificable que la charla existe. El 0,6 de la pelota viene de RocketSim, que no es oficial.
- **"Angry Birds usa Box2D"**: no encontré una fuente primaria (Rovio). NO CONFIRMADO. No decirlo, o decirlo solo con esa marca.
- **Golf, COR 0,830**: es un choque palo-bola, no un bote, y no pude abrir usga.org. Mejor no usarlo.
- **FIBA**: usar la edición 2026 (1 035-1 085 mm, medido de base a base). La cifra antigua "1 200-1 400 mm" medía a la parte superior de la pelota en ediciones anteriores, y no la verifiqué.
- **ITF**: los 254 cm vienen del documento técnico de 2019, no del Appendix I de 2026, y no se especifica el punto de medida. Aun así, e = √(h′/h) da 0,729-0,761, que coincide con el 0,728-0,762 de Cross.
- **e = √(h′/h) desprecia el arrastre del aire.** Para pelotas ligeras (tenis, a 7 m/s) subestima un poco el e real. Decirlo en una nota.
- **Unidades del umbral**: la página de Unity no da unidades. Que sean m/s se deduce de PhysX (`speed`, "velocities of objects in simulation") y no está escrito en Unity. El comentario de Jolt dice "(unit: m)" por error en la fuente; no corregirlo dentro de la cita.
- **El umbral es estricto** en Box2D (`>`/`<`): un impacto exactamente igual a v_th no rebota.
- **v3.1.1 frente a v3.2.0**: la ecuación más didáctica (impulso = −m_eff(v_n + e v_n⁻)) está en v3.1.1. En v3.2.0 el mismo objetivo aparece como `velocityBias` más el tope de Poisson. Para el paso 3 citar v3.1.1 y para el paso 4 citar v3.2.0. Tag y commit fijos en ambos casos.
- **Índices de la serie de rebotes**: definir explícitamente si v_n es la velocidad de impacto o la de salida. La fórmula T = t₀(1+e)/(1−e) es correcta con la caída inicial incluida.
- **Colores con significado** (regla de la casa): pelota de tenis amarillo-verde ITF ("White or Yellow"), baloncesto naranja (FIBA: "a single shade of orange"), superbola de color libre. Física ideal frente a motor: usar un par neutro y coherente con el resto del sitio.
- **Notación**: decimales con coma en la página; los literales de código se citan tal cual (con punto).
- **No rebajar el alcance**: el modo de dos cuerpos (momento y ΔK) es parte del concepto prescrito (colisiones elásticas e inelásticas y conservación del momento). No dejarlo fuera aunque el recurso pida "una pelota que rebota".

import type { Source } from '../../content/topicSchema';
import type { CombineRule } from '../physics';

/**
 * Default restitution threshold and mixing rule of seven physics engines, copied from code
 * pinned to a tag or commit and from the vendors' documentation
 * (docs/superpowers/research/2026-10-30-coeficiente-restitucion.md, §3.1 and §4). Thresholds are
 * in m/s; where the source does not write the unit the note says how it follows.
 */

const ACCESSED = '2026-10-30';

export interface EngineRestitutionRow {
  engine: string;
  /** Default restitution threshold (m/s); null when the source does not give it. */
  threshold: number | null;
  /** Where the threshold comes from, quoting the code or documentation as written. */
  thresholdNote: string;
  /** Default rule that mixes the two materials' e; 'unknown' when no source states it. */
  combine: CombineRule | 'unknown';
  /** Where the mixing rule comes from, quoting the code or documentation as written. */
  combineNote: string;
  /** Source of the threshold. */
  source: Source;
  /** Source of the mixing rule (the same object when one source gives both). */
  combineSource: Source;
}

const BOX2D_V320: Source = {
  id: 'box2d-v320',
  title: 'Box2D v3.2.0 (tag v3.2.0, commit 178495b)',
  authors: 'Erin Catto',
  year: 2026,
  publisher: 'Repositorio erincatto/box2d en GitHub, licencia MIT',
  url: 'https://github.com/erincatto/box2d/tree/v3.2.0',
  accessed: ACCESSED,
};

const UNITY_BOUNCE_THRESHOLD: Source = {
  id: 'unity-bouncethreshold',
  title: 'Physics.bounceThreshold. Unity Scripting API, Unity 6.6',
  authors: 'Unity Technologies',
  year: 2026,
  url: 'https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physics/bouncethreshold',
  accessed: ACCESSED,
};

const UNITY_MATERIAL: Source = {
  id: 'unity-material',
  title: 'Physics Material component reference. Unity 6.6 User Manual',
  authors: 'Unity Technologies',
  year: 2026,
  url: 'https://docs.unity.com/en-us/engine/current/manual/physics-section/physics-overview/collision-section/collider-surfaces/class-physics-material',
  accessed: ACCESSED,
};

const PHYSX: Source = {
  id: 'physx',
  title: 'NVIDIA PhysX SDK (commit b97365c)',
  authors: 'NVIDIA',
  publisher: 'Repositorio NVIDIA-Omniverse/PhysX en GitHub',
  url: 'https://github.com/NVIDIA-Omniverse/PhysX/tree/b97365c6ddb32fda8469bc788ec18024862b0368',
  accessed: ACCESSED,
};

const UNITY_2D_BOUNCE_THRESHOLD: Source = {
  id: 'unity-2d-bouncethreshold',
  title: 'Physics2D.bounceThreshold. Unity Scripting API, Unity 6.6',
  authors: 'Unity Technologies',
  year: 2026,
  url: 'https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physics2d/bouncethreshold',
  accessed: ACCESSED,
};

const UNITY_2D_BOUNCE_COMBINE: Source = {
  id: 'unity-2d-bouncecombine',
  title: 'PhysicsMaterial2D.bounceCombine. Unity Scripting API, Unity 6.6',
  authors: 'Unity Technologies',
  year: 2026,
  url: 'https://docs.unity.com/en-us/engine/current/script-reference/unityengine/physicsmaterial2d/bouncecombine',
  accessed: ACCESSED,
};

const BULLET: Source = {
  id: 'bullet',
  title: 'Bullet Physics 3.25 (tag 3.25, commit 2c204c4)',
  authors: 'Erwin Coumans y colaboradores',
  publisher: 'Repositorio bulletphysics/bullet3 en GitHub, licencia zlib',
  url: 'https://github.com/bulletphysics/bullet3/tree/3.25',
  accessed: ACCESSED,
};

const JOLT: Source = {
  id: 'jolt',
  title: 'Jolt Physics v5.6.0 (tag v5.6.0, commit e77f175)',
  authors: 'Jorrit Rouwe',
  publisher: 'Repositorio jrouwe/JoltPhysics en GitHub, licencia MIT',
  url: 'https://github.com/jrouwe/JoltPhysics/tree/v5.6.0',
  accessed: ACCESSED,
};

const GODOT: Source = {
  id: 'godot',
  title: 'Godot Engine 4.7.2-stable (tag 4.7.2-stable, commit ed1daf0)',
  authors: 'Godot contributors',
  publisher: 'Repositorio godotengine/godot en GitHub, licencia MIT',
  url: 'https://github.com/godotengine/godot/tree/4.7.2-stable',
  accessed: ACCESSED,
};

export const ENGINE_RESTITUTION: readonly EngineRestitutionRow[] = [
  {
    engine: 'Box2D v3',
    threshold: 1,
    thresholdNote:
      '`def.restitutionThreshold = 1.0f * lengthUnits;` (src/types.c L18), con lengthUnits = 1 por defecto (src/core.c L36): 1 m/s.',
    combine: 'max',
    combineNote:
      '`b2MixRestitution` devuelve `b2MaxFloat( restitutionA, restitutionB )` (src/contact.h L162-L165).',
    source: BOX2D_V320,
    combineSource: BOX2D_V320,
  },
  {
    engine: 'Unity 3D',
    threshold: 2,
    thresholdNote:
      '«Two colliding objects with a relative velocity below this will not bounce (default 2).» La página no da unidades; son m/s por el umbral de PhysX.',
    combine: 'average',
    combineNote: '«By default, Bounce Combine is set to Average.»',
    source: UNITY_BOUNCE_THRESHOLD,
    combineSource: UNITY_MATERIAL,
  },
  {
    engine: 'PhysX',
    threshold: 2,
    thresholdNote:
      '`bounceThresholdVelocity`, «Default: 0.2 * PxTolerancesScale::speed» (PxSceneDesc.h L686-L696), con `defaultSpeed=10.0f` (PxTolerancesScale.h): 0,2 × 10 = 2 m/s.',
    combine: 'average',
    combineNote:
      'Combinación de restitución, «Default: PxCombineMode::eAVERAGE» (PxMaterial.h L289).',
    source: PHYSX,
    combineSource: PHYSX,
  },
  {
    engine: 'Unity 2D',
    threshold: null,
    thresholdNote:
      'Valor por defecto no documentado: la página de Physics2D.bounceThreshold no lo da. Por debajo del umbral, «no bounce will occur».',
    combine: 'max',
    combineNote:
      '«Defaults to PhysicsMaterialCombine2D.Maximum which allows either Collider2D to maximize bounciness.»',
    source: UNITY_2D_BOUNCE_THRESHOLD,
    combineSource: UNITY_2D_BOUNCE_COMBINE,
  },
  {
    engine: 'Bullet 3.25',
    threshold: 0.2,
    thresholdNote:
      '`m_restitutionVelocityThreshold = 0.2f;  //if the relative velocity is below this threshold, there is zero restitution` (btContactSolverInfo.h L108).',
    combine: 'multiply',
    combineNote:
      '`return body0->getRestitution() * body1->getRestitution();` (btManifoldResult.cpp L68-L71).',
    source: BULLET,
    combineSource: BULLET,
  },
  {
    engine: 'Jolt',
    threshold: 1,
    thresholdNote:
      '`float mMinVelocityForRestitution = 1.0f;` (PhysicsSettings.h L89-L92). El comentario dice «(unit: m)», aunque por su uso es una velocidad.',
    combine: 'max',
    combineNote:
      '«Default method is max(restitution1, restitution1)» (ContactConstraintManager.h L60-L61).',
    source: JOLT,
    combineSource: JOLT,
  },
  {
    engine: 'Godot',
    threshold: 1,
    thresholdNote:
      'Con Jolt dentro de Godot: `bounce_velocity_threshold`, 1.0f con sufijo «m/s» (modules/jolt_physics/jolt_project_settings.cpp L45). Para GodotPhysics no hay un valor confirmado.',
    combine: 'sumClamped',
    combineNote:
      '`return CLAMP(A->get_bounce() + B->get_bounce(), 0, 1);` (godot_body_pair_3d.cpp L255-L256); con Jolt, la misma suma recortada (jolt_space_3d.cpp L158-L159).',
    source: GODOT,
    combineSource: GODOT,
  },
];

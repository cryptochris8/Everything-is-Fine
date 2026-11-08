// ─────────────────────────────────────────────────────────────────────────────
// MODELS CONTRACT — procedural low-poly toon models (NO external asset files).
// Units are metres. Every model's local origin is on the ground (y = 0) at its
// footprint centre, facing local +Z (the renderer sets rotation.y = sim yaw).
// Gameplay objects (raccoon, enemies, cans, loot) get a dark outline and are
// more saturated than scenery. Palette: src/render/palette.ts / GDD §17.
// Animations are procedural transforms driven by update() — no skeletal rigs.
// ─────────────────────────────────────────────────────────────────────────────
import type * as THREE from 'three';
import type {
  CanKind,
  CanState,
  DogBreed,
  EnemyMode,
  FenceStyle,
  HouseDef,
  HumanStyle,
  LootId,
  MoveMode,
  PlayerAction,
  PropKind,
  SpecialCanStyle,
} from '../../sim/types';

/** Shared per-frame context for animated models. */
export interface ModelContext {
  /** Real seconds since last frame (visual time; 0 while paused). */
  dt: number;
  /** Monotonic visual seconds. */
  time: number;
}

export interface AnimatedModel {
  readonly root: THREE.Object3D;
  update(ctx: ModelContext): void;
  dispose(): void;
}

export type RaccoonExpression = 'neutral' | 'happy' | 'sneaky' | 'surprised' | 'panic' | 'dizzy' | 'proud';

export interface RaccoonVisualState {
  moveMode: MoveMode;
  /** m/s — drives gait frequency/amplitude. */
  speed: number;
  action: PlayerAction;
  actionTime: number;
  /** 0..1 rummage progress (arm/head dig animation). */
  rummage01: number;
  /** Carried items, oldest first — rendered as a wobbling pile on the back (cap visible count ~7). */
  carried: readonly LootId[];
  /** 0..1 load/capacity — heavier = more waddle, bent posture. */
  load01: number;
  chased: boolean;
  hidden: boolean;
  /** Blink when true && (time*10)%2<1 — the model handles blinking itself. */
  invulnerable: boolean;
  /** 0..1 enemy detection on the raccoon — ears perk / eyes widen as it rises. */
  danger01: number;
}

export interface RaccoonModel extends AnimatedModel {
  setState(s: RaccoonVisualState): void;
  /** Force an expression for a moment (e.g. 'happy' on rare loot); falls back to state-driven after `seconds`. */
  emote(expression: RaccoonExpression, seconds: number): void;
  /** Trigger a one-shot hop/wiggle: 'hop' (startle), 'wiggle' (happy loot), 'dance' (big deposit), 'spin' (caught). */
  playOneShot(kind: 'hop' | 'wiggle' | 'dance' | 'spin'): void;
}

export interface EnemyVisualState {
  mode: EnemyMode;
  speed: number;
  /** 0..1 */
  awareness: number;
  /** Currently shouting/barking (mouth open, bounce). */
  vocal: boolean;
}

export interface DogModel extends AnimatedModel {
  setState(s: EnemyVisualState): void;
}

export interface HumanModel extends AnimatedModel {
  setState(s: EnemyVisualState): void;
  /** World-space-independent local position of the flashlight lens (for the renderer's light cone), or null. */
  readonly flashlightAnchor: THREE.Object3D | null;
}

export interface CanModel extends AnimatedModel {
  /** Lid open/closed, shaking while rummaging, tipped over, empty (open + dark inside). */
  setState(state: CanState, stateTime: number): void;
  /** Aim highlight when it's the focus target (rim glow + bob of a small arrow). */
  setHighlight(on: boolean): void;
  setSparkle(level: 'none' | 'faint' | 'gold'): void;
}

export interface CatModel extends AnimatedModel {
  setState(s: { mode: 'hiss' | 'roam' | 'flee' | 'sit'; speed: number }): void;
}

export interface HouseModel extends AnimatedModel {
  /** Porch light bulb emissive on/off (renderer adds the light pool). */
  setPorchLight(on: boolean): void;
  /** 0..1 fraction of windows glowing warm. */
  setWindowsLit(frac: number): void;
  /** Fade for camera obstruction (1 = opaque). Model switches its materials to transparent clones when < 1. */
  setOpacity(alpha: number): void;
}

export interface DenModel extends AnimatedModel {
  /** Pulse/celebrate when food is deposited. */
  celebrate(): void;
  /** Glow ring intensity 0..1 (brighter when carrying food). */
  setBeacon(level: number): void;
}

/** Scenery drawn with InstancedMesh: one merged, vertex-coloured geometry per kind + variant bucket. */
export interface SceneryGeometry {
  geometry: THREE.BufferGeometry;
  /** Rough radius (m). */
  radius: number;
  /** True if the renderer should fade it when it occludes the raccoon (trees). */
  occluder: boolean;
}

export interface ModelsApi {
  createRaccoon(): RaccoonModel;
  createDog(breed: DogBreed, variant: number): DogModel;
  createHuman(style: HumanStyle, variant: number): HumanModel;
  createCan(kind: CanKind, special: SpecialCanStyle | null, variant: number): CanModel;
  createCat(variant: number): CatModel;
  /** Static-ish loot item (~0.35 m across, origin at its centre bottom). Shared geometry/materials per id. */
  createLoot(item: LootId): THREE.Object3D;
  createHouse(def: HouseDef): HouseModel;
  createDen(style: 'hollowLog' | 'culvert' | 'bridgeNook'): DenModel;
  /**
   * Instancable scenery: trees, bushes, hedges, flower beds, rocks, mailboxes, streetlights (pole only; the
   * renderer adds bulbs/pools), hydrants, gnomes, flamingos, stop signs, etc. Variant buckets 0..3 (variant & 3).
   * Returns null for kinds that must be built as individual objects (see createProp).
   */
  sceneryGeometry(kind: PropKind, variantBucket: number): SceneryGeometry | null;
  /** Individual props (cars, pickups, vans, swing sets, sheds, doghouses, bridge, culvert, pond, grill…). */
  createProp(kind: PropKind, variant: number): THREE.Object3D;
  /** Fence run from a to b (length in metres along local +X, starting at the origin). Merged geometry. */
  createFence(style: FenceStyle, length: number, height: number): THREE.Object3D;
  /** Shared toon material for vertex-coloured scenery geometry. */
  sceneryMaterial(): THREE.Material;
}

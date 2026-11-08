// ─────────────────────────────────────────────────────────────────────────────
// SIM CONTRACT — pure game state. No DOM, no Three.js, no Math.random.
// World space: metres, Y up, X east, Z south. yaw: facing = (sin yaw, cos yaw)
// in (x, z); yaw 0 faces +Z. See docs/GDD.md §3.
// Renderer/UI/audio READ this state; only src/sim writes it.
// The sim owner may ADD optional fields; changing/removing fields needs sign-off.
// ─────────────────────────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  z: number;
}

/** Axis-aligned rectangle on the ground plane, x0 < x1, z0 < z1. */
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

// ── static world (generated once per night, never mutated during the night) ──

export type SurfaceKind = 'road' | 'sidewalk' | 'driveway' | 'lawn' | 'park' | 'alley' | 'dirt' | 'water' | 'patio';

export interface Surface {
  kind: SurfaceKind;
  rect: Rect;
}

/** Road markings: dashed centre lines, crosswalks, cul-de-sac circle. Visual only. */
export interface RoadMarking {
  kind: 'centerDash' | 'crosswalk' | 'stopLine';
  /** Start/end of the marking's centre line. */
  a: Vec2;
  b: Vec2;
}

/** A disc-shaped surface (cul-de-sac bulb, park pond). Drawn over rect surfaces. */
export interface DiscSurface {
  kind: SurfaceKind;
  x: number;
  z: number;
  r: number;
}

export type HouseStyle = 'ranch' | 'cottage' | 'twoStory' | 'bungalow' | 'aFrame' | 'colonial';

export interface HouseDef {
  id: number;
  lotId: number;
  style: HouseStyle;
  /** Footprint centre. */
  x: number;
  z: number;
  /** Footprint size along the house's local X (width) and Z (depth). */
  w: number;
  d: number;
  /** Facing: the front door side faces (sin yaw, cos yaw). Always a multiple of π/2. */
  yaw: number;
  /** CSS hex colours. */
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doorColor: string;
  /** Front door (world, on the ground just outside the door). Homeowners exit/enter here. */
  door: Vec2;
  /** Porch light position (world, ground point below it). */
  porch: Vec2;
  motionLight: boolean;
  /** 0..1 seeded: which windows are lit initially (renderer picks window pattern from this). */
  windowSeed: number;
  /** Has a garage on the driveway side (+1 or −1 in local X), or 0. */
  garageSide: -1 | 0 | 1;
}

export interface LotDef {
  id: number;
  /** Whole lot rectangle (front lawn + house + backyard). */
  rect: Rect;
  houseId: number;
  /** Backyard rectangle (fenced if `fenced`). */
  backyard: Rect;
  fenced: boolean;
  /** Area / district id (see AreaDef) — for the Tourist challenge and HUD. */
  areaId: number;
}

export type FenceStyle = 'picket' | 'wood' | 'hedge' | 'chainlink';

export interface FenceDef {
  a: Vec2;
  b: Vec2;
  style: FenceStyle;
  /** Metres. picket ~0.9, wood ~1.6, hedge ~1.3, chainlink ~1.2. */
  height: number;
}

export type PropKind =
  | 'treeOak'
  | 'treePine'
  | 'treeBirch'
  | 'treeRound'
  | 'bush'
  | 'hedge'
  | 'flowerBed'
  | 'streetlight'
  | 'mailbox'
  | 'car'
  | 'pickup'
  | 'van'
  | 'gnome'
  | 'flamingo'
  | 'birdbath'
  | 'swingSet'
  | 'sandbox'
  | 'kiddiePool'
  | 'bench'
  | 'lawnChair'
  | 'grill'
  | 'shed'
  | 'doghouse'
  | 'bikeRack'
  | 'fireHydrant'
  | 'stopSign'
  | 'picnicTable'
  | 'rock'
  | 'pond'
  | 'bridge'
  | 'culvert'
  | 'lampPost';

export interface PropDef {
  kind: PropKind;
  x: number;
  z: number;
  yaw: number;
  /** Seeded 0..255, picks colour/shape variant. */
  variant: number;
  /** Uniform scale (default 1). */
  scale: number;
}

export type ColliderShape =
  | { type: 'circle'; x: number; z: number; r: number }
  | { type: 'box'; rect: Rect };

export interface Collider {
  shape: ColliderShape;
  /** Blocks line of sight (houses, fences ≥ 1.2 m, cars, tree trunks are 'tall'; low fences/props are not). */
  tall: boolean;
}

export interface HideSpot {
  x: number;
  z: number;
  r: number;
}

export type CanKind = 'standard' | 'recycling' | 'dumpster' | 'premium' | 'special';
/** Special cans look different per event. */
export type SpecialCanStyle = 'bbqGrill' | 'goldenDumpster';

export interface CanSlot {
  id: number;
  x: number;
  z: number;
  yaw: number;
  lotId: number | null;
  areaId: number;
  zone: 'curb' | 'side' | 'back' | 'alley' | 'park';
  /** Reserve slots activate later in the night (or at start on Garbage Day). */
  reserve: boolean;
  /** Layout hint for the can kind placed here (e.g. park dumpster). Optional. */
  preferKind?: CanKind;
}

export interface Den {
  x: number;
  z: number;
  /** Safe-zone radius (m). */
  radius: number;
  /** The entrance faces (sin yaw, cos yaw). */
  yaw: number;
  style: 'hollowLog' | 'culvert' | 'bridgeNook';
}

export interface AreaDef {
  id: number;
  name: string;
  rect: Rect;
}

export interface NavGrid {
  /** Metres per cell (0.5). */
  cell: number;
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  /** cols*rows, 1 = walkable (collider-inflated). Row-major: index = row * cols + col (row ↔ z). */
  walkable: Uint8Array;
}

export interface Patrol {
  /** Closed loop of waypoints (walkable). */
  points: Vec2[];
}

export interface DogYard {
  houseId: number;
  /** Walkable yard rect the dog lives in. */
  rect: Rect;
  /** Gate gap centre in the yard fence (dogs chase out through it). */
  gate: Vec2;
  patrol: Patrol;
}

export type LayoutId = 'mapleCourt' | 'culDeSac' | 'elmAlley';
/** Settings → Difficulty (scales the neighborhood; see src/sim/difficulty.ts). */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface WorldMap {
  layoutId: LayoutId;
  /** "Maple Court" etc. */
  name: string;
  seed: number;
  bounds: Rect;
  surfaces: Surface[];
  discs: DiscSurface[];
  markings: RoadMarking[];
  lots: LotDef[];
  houses: HouseDef[];
  fences: FenceDef[];
  props: PropDef[];
  colliders: Collider[];
  hideSpots: HideSpot[];
  canSlots: CanSlot[];
  den: Den;
  spawn: Vec2;
  areas: AreaDef[];
  dogYards: DogYard[];
  /** Street patrol loops for street dogs / watch humans. */
  streetPatrols: Patrol[];
  nav: NavGrid;
}

// ── dynamic state ─────────────────────────────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'junk';

export type LootId =
  | 'appleCore'
  | 'sandwich'
  | 'donut'
  | 'fries'
  | 'bananaPeel'
  | 'pizzaSlice'
  | 'hotDog'
  | 'burger'
  | 'drumstick'
  | 'taco'
  | 'pizza'
  | 'cake'
  | 'goldenFish'
  | 'burrito'
  | 'ribs'
  | 'forbiddenDonut'
  | 'goldenBurger'
  | 'midnightPizza'
  | 'gnome';

export interface LootDef {
  id: LootId;
  name: string;
  rarity: Rarity;
  points: number;
  /** Load units (capacity cost). */
  weight: number;
}

export type MoveMode = 'idle' | 'sneak' | 'walk' | 'run' | 'sprint';

export type PlayerAction =
  | 'none'
  | 'rummage'
  /** Just grabbed an item: short hold-it-up beat (non-blocking; sim sets actionTime). */
  | 'grab'
  | 'deposit'
  | 'caught'
  | 'startled'
  | 'celebrate'
  | 'emerge';

export interface Player {
  x: number;
  z: number;
  /** Facing (eased toward move direction). */
  yaw: number;
  vx: number;
  vz: number;
  /** Current planar speed m/s. */
  speed: number;
  moveMode: MoveMode;
  action: PlayerAction;
  /** Seconds since `action` started. */
  actionTime: number;
  /** Can being rummaged (action 'rummage'), else null. */
  rummageCanId: number | null;
  /** 0..1 progress toward the next item popping out. */
  rummage01: number;
  /** Carried items, oldest first. */
  carried: LootId[];
  /** Sum of carried item weights. */
  load: number;
  capacity: number;
  hidden: boolean;
  inDen: boolean;
  /** Any enemy currently chasing. */
  chased: boolean;
  /** Highest enemy detection meter on the player (0..1) — drives HUD danger vignette. */
  danger01: number;
  /** Seconds of post-catch invulnerability remaining (blink). */
  invuln: number;
  /** Current footstep noise radius (visual ring). */
  noiseRadius: number;
  /** Id of the can in interaction range (prompt target), else null. */
  focusCanId: number | null;
}

export type CanState = 'closed' | 'rummaging' | 'open' | 'empty' | 'tipped';

export interface CanEntity {
  id: number;
  slotId: number;
  kind: CanKind;
  special: SpecialCanStyle | null;
  x: number;
  z: number;
  yaw: number;
  state: CanState;
  /** Items left inside (contents are hidden from the player until rummaged). */
  itemsLeft: number;
  /** Faint sparkle hint: premium/special cans and cans holding a legendary. */
  sparkle: 'none' | 'faint' | 'gold';
  /** False until a reserve can activates (not rendered, not interactable). */
  active: boolean;
  /** Seconds since the can last changed state (render uses it for lid/shake anims). */
  stateTime: number;
  /** Visual variant 0..255. */
  variant: number;
}

export type SurpriseKind = 'empty' | 'loudLid' | 'cat' | 'gnome' | 'jackpot' | 'tipOver';

export interface GroundLoot {
  id: number;
  item: LootId;
  x: number;
  z: number;
  /** Seconds until it despawns (Infinity for tipped-can spills that stay all night). */
  ttl: number;
  /** Seconds since dropped (render: pop/bounce). */
  age: number;
}

export type EnemyKind = 'dog' | 'human';
export type DogBreed = 'beagle' | 'bulldog' | 'poodle' | 'dachshund' | 'retriever';
export type HumanStyle = 'pajamas' | 'flashlight' | 'gardener' | 'watch';

export type EnemyMode =
  | 'inside' // humans: in the house, not in the world (render hides)
  | 'sleep'
  | 'idle'
  | 'patrol'
  | 'investigate'
  | 'notice' // detection ≥ 0.5: stops and stares; dogs bark
  | 'chase'
  | 'search'
  | 'return'
  | 'distracted' // dog chasing a cat
  | 'tired' // dog gave up: pants, sits
  | 'gloat'; // just caught the raccoon

export interface Enemy {
  id: number;
  kind: EnemyKind;
  breed: DogBreed | null;
  style: HumanStyle | null;
  /** Colour/visual variant 0..255. */
  variant: number;
  homeHouseId: number | null;
  x: number;
  z: number;
  yaw: number;
  /** Planar speed m/s (animation). */
  speed: number;
  mode: EnemyMode;
  modeTime: number;
  /** Detection meter 0..1 ("?" fills, "!" at 1). */
  awareness: number;
  /** Vision cone for ground decal. */
  visionRange: number;
  /** Half-angle, radians. */
  visionHalfAngle: number;
  hasFlashlight: boolean;
  /** Current speech/bark bubble text, null when silent. */
  bubble: string | null;
  bubbleTime: number;
  /** A human walking a street dog (render only: draw a leash between them). */
  leashToId: number | null;
}

export interface Cat {
  id: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  mode: 'hiss' | 'roam' | 'flee' | 'sit';
  variant: number;
}

export interface HouseState {
  houseId: number;
  suspicion: number;
  porchLight: boolean;
  /** 0..1 how many windows are lit (grows with suspicion). */
  windowsLit: number;
  /** Window yell bubble (render/UI anchor at the house front, ~3 m up). */
  yell: string | null;
  yellTime: number;
}

export type AlertStage = 0 | 1 | 2 | 3;

export interface AlertState {
  /** 0..100 */
  value: number;
  stage: AlertStage;
  peakStage: AlertStage;
}

export type NightEventId = 'pizzaNight' | 'garbageDay' | 'dogWalk' | 'watch' | 'bbq' | 'legendaryDumpster' | 'catDistraction';

export type ChallengeId =
  | 'ninjaPaws'
  | 'bigHaul'
  | 'treasureHunter'
  | 'ghost'
  | 'houdini'
  | 'tourist'
  | 'dumpsterDiver'
  | 'nightOwl'
  | 'calmCritter'
  | 'snackStack';

export interface ChallengeState {
  id: ChallengeId;
  /** Current progress / goal (e.g. 3/5). Binary challenges use 0/1. */
  progress: number;
  goal: number;
  done: boolean;
  /** 'ghost' / 'calmCritter' can fail permanently. */
  failed: boolean;
  reward: number;
}

export interface UpgradeLevels {
  belly: number;
  paws: number;
  legs: number;
  rummager: number;
  dodger: number;
  lucky: number;
}
export type UpgradeId = keyof UpgradeLevels;

export interface RunStats {
  banked: number;
  itemsBanked: number;
  cansRaided: number;
  rareFound: number;
  legendaryFound: number;
  timesCaught: number;
  escapes: number;
  bestHaul: number;
  highestAlert: AlertStage;
  itemsLost: number;
  /** Area ids raided (Tourist). */
  areasRaided: number[];
  /** Loot ids banked this night (results screen shows the best few). */
  bankedItems: LootId[];
}

export type GamePhase = 'intro' | 'playing' | 'over';

/** What the context prompt should say (UI formats it with the device glyphs). */
export type PromptKind = 'rummage' | 'stopRummage' | 'full' | 'hideHere' | null;

export interface GameState {
  seed: number;
  phase: GamePhase;
  /** Sim seconds since GO (0 during intro). */
  time: number;
  /** Seconds left in the intro (phase 'intro'). */
  introLeft: number;
  nightLength: number;
  /** 0..1 night progress. */
  night01: number;
  /** In-game minutes since 21:00 (0..540). */
  clockMinutes: number;
  world: WorldMap;
  player: Player;
  cans: CanEntity[];
  groundLoot: GroundLoot[];
  enemies: Enemy[];
  cats: Cat[];
  houses: HouseState[];
  alert: AlertState;
  events: GameEvent[];
  activeEvents: NightEventId[];
  challenges: ChallengeState[];
  upgrades: UpgradeLevels;
  stats: RunStats;
  prompt: PromptKind;
  /** Attract/test mode: raccoon can't be caught. */
  invincible: boolean;
  /** Monotonic id counter (internal). */
  nextId: number;
}

// ── per-frame input to the sim (world space; the app rotates stick input by camera yaw) ──

export interface ControlFrame {
  /** World-space desired move direction * magnitude, |(moveX, moveZ)| ≤ 1. */
  moveX: number;
  moveZ: number;
  sprint: boolean;
  sneak: boolean;
  /** Edge: true for exactly one frame per press. */
  interact: boolean;
  /** Edge: drop the most recently picked item. */
  drop: boolean;
}

export const NO_CONTROLS: Readonly<ControlFrame> = Object.freeze({
  moveX: 0,
  moveZ: 0,
  sprint: false,
  sneak: false,
  interact: false,
  drop: false,
});

export interface GameOptions {
  seed: number;
  /** Force a layout (default: picked from the seed; first night → 'mapleCourt'). */
  layout?: LayoutId;
  upgrades?: Partial<UpgradeLevels>;
  /** Default 'normal' (the GDD tuning). */
  difficulty?: Difficulty;
  /** Force tonight's events (default: rolled). [] = none. */
  events?: NightEventId[];
  /** First night ever: GARBAGE DAY, gentler. */
  firstNight?: boolean;
  /** Force challenge ids (default: rolled). */
  challenges?: ChallengeId[];
  invincible?: boolean;
  /** Skip the 3 s intro (tests, attract). */
  skipIntro?: boolean;
  /** Override night length (s) — tests. */
  nightLength?: number;
}

// ── events (cleared at the start of every stepGame) ──────────────────────────

export type GameEvent =
  | { type: 'go' }
  | { type: 'rummageStart'; canId: number }
  | { type: 'rummageStop'; canId: number; reason: 'empty' | 'full' | 'moved' | 'cancel' | 'spotted' | 'caught' }
  | { type: 'lidOpen'; canId: number; loud: boolean }
  | { type: 'loot'; canId: number | null; item: LootId; rarity: Rarity; points: number; x: number; z: number }
  | { type: 'surprise'; canId: number; kind: SurpriseKind; x: number; z: number }
  | { type: 'canEmpty'; canId: number }
  | { type: 'pawsFull' }
  | { type: 'drop'; item: LootId; x: number; z: number }
  | { type: 'pickup'; item: LootId; x: number; z: number }
  | {
      type: 'deposit';
      items: LootId[];
      /** Base points of the items. */
      points: number;
      /** 1, 1.2 or 1.5. */
      multiplier: number;
      /** Legendary flat bonus (0 or 100). */
      bonus: number;
      /** Points actually banked = round(points*multiplier)+bonus. */
      total: number;
      label: 'none' | 'bigHaul' | 'megaHaul';
    }
  | { type: 'enterDen' }
  | { type: 'leaveDen' }
  | { type: 'noise'; x: number; z: number; radius: number; source: 'step' | 'rummage' | 'lid' | 'crash' | 'bark' | 'drop' | 'cat' | 'yell' }
  | { type: 'alertStage'; stage: AlertStage; prev: AlertStage }
  | { type: 'suspicious'; enemyId: number }
  | { type: 'notice'; enemyId: number }
  | { type: 'bark'; enemyId: number }
  | { type: 'spotted'; enemyId: number }
  | { type: 'chaseStart'; enemyId: number }
  | { type: 'chaseEnd'; enemyId: number; escaped: boolean }
  | { type: 'escaped' }
  | { type: 'caught'; enemyId: number; confiscated: LootId[]; scattered: LootId[]; x: number; z: number }
  | { type: 'respawn'; x: number; z: number }
  | { type: 'shout'; enemyId: number; text: string }
  | { type: 'houseOut'; houseId: number; enemyId: number }
  | { type: 'houseIn'; houseId: number; enemyId: number }
  | { type: 'windowYell'; houseId: number; text: string }
  | { type: 'porchLight'; houseId: number; on: boolean }
  | { type: 'catDistract'; catId: number; enemyId: number }
  | { type: 'catSpawn'; catId: number }
  | { type: 'hidden'; on: boolean }
  | { type: 'canActivate'; canId: number }
  | { type: 'nightEvent'; id: NightEventId }
  | { type: 'banner'; text: string; tone: 'info' | 'good' | 'warn' | 'danger' }
  | { type: 'hour'; hour: number }
  | { type: 'sunriseWarning' }
  | { type: 'sunrise'; lostItems: LootId[] }
  | { type: 'challengeProgress'; id: ChallengeId; progress: number; goal: number }
  | { type: 'challengeComplete'; id: ChallengeId; reward: number }
  | { type: 'challengeFailed'; id: ChallengeId }
  | { type: 'hint'; id: 'nearCan' | 'firstCarry' | 'firstNotice' | 'heavy' | 'full' | 'hide' };

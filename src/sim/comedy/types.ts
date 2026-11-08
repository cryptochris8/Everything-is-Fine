/**
 * The Comedy Director's content language.
 *
 * Every incident, ambient gag and mission is DATA written in this vocabulary: typed
 * conditions (predicates) and typed actions (effects) interpreted by `scenario.ts`. There is
 * no eval and no free-form code in content; `validate.ts` checks every reference at
 * startup. Adding a new gag means adding data, not touching the engine.
 *
 * Reference rules: anywhere a `Ref` is accepted, the string is first looked up as a ROLE
 * declared in the scenario's `cast`/`props`, then as a literal actor/prop id.
 */
import type { FactValue } from '../core/ledger.js';
import type { Vec2 } from '../core/vec.js';
import type { SpotId } from '../world/layout.js';

export type BeatKind = 'setup' | 'complication' | 'escalation' | 'payoff' | 'aftermath';

export type IncidentKind = 'mission' | 'major' | 'ambient' | 'finale';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** A role name or a literal actor/prop id. */
export type Ref = string;

/** Somewhere in the world, resolved each tick (actors and props move). */
export type TargetRef =
  | { spot: SpotId }
  | { zone: string }
  | { actor: Ref }
  | { prop: Ref }
  | { player: true }
  | { point: Vec2 };

export type Emote =
  | '!'
  | '?'
  | 'heart'
  | 'anger'
  | 'sweat'
  | 'music'
  | 'zzz'
  | 'star'
  | 'dizzy'
  | 'laugh'
  | 'gasp'
  | 'thumbsup'
  | 'note';

export type FxKind =
  | 'smoke'
  | 'bigsmoke'
  | 'splash'
  | 'dust'
  | 'confetti'
  | 'stars'
  | 'sparkle'
  | 'feathers'
  | 'landing'
  | 'fireworks'
  | 'hearts'
  | 'leaves';

export type MoveStyle = 'walk' | 'run' | 'drive' | 'waddle' | 'sprint' | 'stroll';

/** Text with optional variants; one is chosen by the seeded RNG. `{name}` tokens are filled from cast names. */
export type Lines = string | readonly string[];

// ---------------------------------------------------------------- conditions

export type Cond =
  | { all: readonly Cond[] }
  | { any: readonly Cond[] }
  | { not: Cond }
  | { always: true }
  /** Round fact from the ledger. No eq/gte → truthy test. */
  | { fact: string; eq?: FactValue; gte?: number }
  /** Persistent memory flag (survives between days). No eq/gte → truthy test. */
  | { memory: string; eq?: FactValue; gte?: number }
  | { affinity: Ref; gte?: number; lte?: number }
  | { propState: Ref; is: string | readonly string[] }
  | { heldBy: Ref; by: Ref | 'player' | 'nobody' }
  | { playerNear: TargetRef; r: number }
  | { actorNear: Ref; target: TargetRef; r: number }
  | { propNear: Ref; target: TargetRef; r: number }
  | { propInZone: Ref; zone: string }
  | { actorInZone: Ref; zone: string }
  /** The actor finished its current move order. */
  | { arrived: Ref }
  /** Seconds since the current stage began. */
  | { elapsed: number }
  | { chaosGte: number }
  | { chaosLt: number }
  | { difficulty: Difficulty | readonly Difficulty[] }
  /** Player pressed Interact on this actor/prop during the current stage. */
  | { used: Ref }
  /** Player picked choice N (0-based) in the current stage. */
  | { chose: number }
  /** Actor is free (not reserved by any running incident). */
  | { available: Ref }
  | { missionPhase: string }
  | { noMajor: true }
  | { incidentDone: string }
  | { incidentActive: string }
  /** Seeded coin, rolled once when the stage is entered (stable while the stage runs). */
  | { roll: number }
  | { runAtLeast: number }
  /** Player stands within the difficulty's catch radius of the target (flying burgers). */
  | { catchable: TargetRef };

// ---------------------------------------------------------------- actions

export type Action =
  | { say: Ref; line: Lines; dur?: number }
  | { caption: Lines; dur?: number }
  | { emote: Ref; icon: Emote }
  | { move: Ref; to: TargetRef; style?: MoveStyle; offset?: Vec2 }
  /** Keep chasing a (moving) target until another order replaces it. */
  | { follow: Ref; target: TargetRef; style?: MoveStyle; keep?: number }
  /** Run through spots in order (fleeing dog, joyriding cart). */
  | { route: Ref; via: readonly (SpotId | Vec2)[]; style?: MoveStyle; pauses?: number }
  | { stop: Ref }
  | { face: Ref; target: TargetRef }
  | { anim: Ref; play: ActorAnim; dur?: number }
  | { setProp: Ref; state: string }
  /** Hand a prop to an actor, the player, or nobody (dropped where it is or at `at`). */
  | { give: Ref; to: Ref | 'player' | 'nobody'; at?: TargetRef }
  | { place: Ref; at: TargetRef; y?: number; offset?: Vec2 }
  /** Arc a prop through the air. It lands `dur` seconds later. */
  | { launch: Ref; to: TargetRef; height: number; dur: number; landY?: number; offset?: Vec2 }
  /** Arc an ACTOR (trampoline neighbour, flipped Randy). */
  | { hop: Ref; to: TargetRef; height: number; dur: number }
  | { fact: string; value?: FactValue }
  | { bump: string; by?: number }
  | { memory: string; value?: FactValue }
  | { affinity: Ref; by: number }
  | { hoaRule: string; text: string }
  | { chaos: number }
  | { objective: string | null; target?: TargetRef }
  | { choices: readonly string[]; from?: Ref }
  | { fx: FxKind; at: TargetRef; dur?: number; r?: number }
  /** Landing marker sized to the difficulty's catch radius. */
  | { marker: TargetRef; dur: number }
  | { sound: string; at?: TargetRef }
  | { stun: 'slip' | 'spin' | 'soaked'; dur: number }
  /** Ask the Director for a complication from this pool; falls back to `fallback` if none is eligible. */
  | { request: readonly string[]; fallback?: string }
  /** Reserve an extra actor into this incident (enlisting help). Fails silently if busy. */
  | { recruit: Ref; as?: string }
  | { release: Ref }
  | { if: Cond; then: readonly Action[]; else?: readonly Action[] }
  /** Seeded choice between alternative action lists. */
  | { oneOf: readonly (readonly Action[])[] }
  | { outcome: string }
  | { award: string; text: string }
  | { headline: string };

export type ActorAnim =
  | 'idle'
  | 'wave'
  | 'cheer'
  | 'facepalm'
  | 'shrug'
  | 'point'
  | 'flail'
  | 'spin'
  | 'sit'
  | 'write'
  | 'grill'
  | 'dance'
  | 'tumble'
  | 'proud'
  | 'sniff'
  | 'beg';

// ---------------------------------------------------------------- stages & incidents

export interface Transition {
  when: Cond;
  to: string;
  do?: readonly Action[];
}

export interface Stage {
  beat: BeatKind;
  /** Actions run once, on entering the stage. */
  do?: readonly Action[];
  /** Checked every tick in order; first match wins. */
  go?: readonly Transition[];
  /** Required on every non-terminal stage: guarantees the incident always ends. */
  timeout?: { sec: number; to: string; do?: readonly Action[] };
  /** Terminal stage: incident completes after its `do` actions (and an optional linger). */
  end?: boolean;
  /** Seconds a terminal stage lingers (lets the punchline land) before releasing actors. */
  linger?: number;
}

export interface IncidentDef {
  id: string;
  /** Human title for debug panel and recap. */
  title: string;
  kind: IncidentKind;
  tags: readonly string[];
  /** Base selection weight. */
  weight: number;
  /** Seconds before it may be selected again after finishing. */
  cooldown: number;
  /** Eligible chaos band [min, max). */
  chaos?: { min?: number; max?: number };
  requires?: Cond;
  /** Roles → actor id (or candidates, first free one by seeded order). */
  cast: Readonly<Record<string, string | readonly string[]>>;
  /** Roles → prop id. Reserved while running. */
  props?: Readonly<Record<string, string>>;
  /** Score bonus when the player is within r metres of this target (prefer visible action). */
  near?: { target: TargetRef; r: number };
  /** Hard cap; on expiry the incident jumps to `fallback`. */
  maxDuration: number;
  fallback: string;
  start: string;
  stages: Readonly<Record<string, Stage>>;
  /** Punchline id for the repeat-gag penalty. Defaults to the incident id. */
  punchline?: string;
  /** Tags of incidents that make good follow-ups (score bonus). */
  compatibleNext?: readonly string[];
  /** At most once per day. */
  once?: boolean;
  /** Chaos added when it starts (escalation pressure); payoffs add more via actions. */
  chaosOnStart?: number;
  /** Not chosen spontaneously; only via a mission `request` or `startIncident`. */
  requestOnly?: boolean;
}

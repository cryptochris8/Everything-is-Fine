/**
 * Live world state: where everyone and everything is, what state props are in, who is
 * reserved by which incident. Owned by the Sim; the Genesys adapter only reads it (plus the
 * event stream) to draw the frame.
 */
import type { ActorAnim, Emote, FxKind, MoveStyle } from '../comedy/types.js';
import type { Vec2 } from '../core/vec.js';

export type HolderId = 'player' | string;

export interface PropState {
  id: string;
  state: string;
  pos: Vec2;
  /** Height of the prop's base above ground (table top, roof...). */
  y: number;
  heldBy: HolderId | null;
  /** Incident currently owning this prop, if any. */
  reservedBy: string | null;
  /** In-flight arc (adapter animates; sim lands it at `t1`). */
  flight: Flight | null;
  /** Burgers left on the platter, etc. */
  count: number;
}

export interface Flight {
  from: Vec2;
  fromY: number;
  to: Vec2;
  toY: number;
  height: number;
  t0: number;
  t1: number;
}

export type MoveOrder =
  | { kind: 'goto'; to: Vec2; style: MoveStyle }
  | { kind: 'follow'; targetKey: string; style: MoveStyle; keep: number }
  | { kind: 'route'; via: Vec2[]; index: number; style: MoveStyle; pauses: number; pauseLeft: number };

export interface ActorState {
  id: string;
  pos: Vec2;
  yaw: number;
  /** Current order; null = idle (routine may give it one). */
  order: MoveOrder | null;
  /** Set true the tick an order completes; cleared when a new order is given. */
  arrived: boolean;
  /** Incident that owns this actor, if any. */
  reservedBy: string | null;
  /** Current looping animation and when it expires (null = until changed). */
  anim: ActorAnim;
  animUntil: number | null;
  /** Arc through the air (trampoline, flipped). */
  flight: Flight | null;
  /** Routine bookkeeping. */
  routineIndex: number;
  routineWaitUntil: number;
  routinePhase: 'moving' | 'waiting';
  /** Seconds the actor stays stunned/sitting (no routine). */
  busyUntil: number;
  mood: number;
  soaked: boolean;
  /** Visible while true (Todd only appears for his gag). */
  visible: boolean;
}

export interface PlayerState {
  pos: Vec2;
  yaw: number;
  holding: string | null;
  stunUntil: number;
  stunKind: 'slip' | 'spin' | 'soaked' | null;
  /** Last time a sprinkler slip happened (cooldown). */
  lastSlip: number;
}

export interface Choice {
  index: number;
  text: string;
}

export interface ActiveChoices {
  owner: string;
  from: string | null;
  options: Choice[];
}

/** Presentation events, drained by the adapter every frame. */
export type SimEvent =
  | { type: 'say'; actor: string; text: string; dur: number }
  | { type: 'caption'; text: string; dur: number }
  | { type: 'emote'; actor: string; emote: Emote }
  | { type: 'fx'; kind: FxKind; at: Vec2; y: number; dur: number; r: number }
  | { type: 'sound'; id: string; at: Vec2 | null }
  | { type: 'objective'; text: string | null; side: string | null }
  | { type: 'choices'; choices: ActiveChoices | null }
  | { type: 'stun'; kind: 'slip' | 'spin' | 'soaked'; dur: number }
  | { type: 'chaos'; value: number; tier: number }
  | { type: 'toast'; text: string; kind: 'award' | 'rule' | 'info' | 'callback' }
  | { type: 'incident'; id: string; phase: 'start' | 'end'; title: string }
  | { type: 'bounce'; power: number }
  | { type: 'dayOver' }
  | { type: 'propLanded'; prop: string; at: Vec2 };

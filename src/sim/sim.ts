/**
 * The authoritative, deterministic simulation of one day in Pleasant Pines.
 *
 * Engine-agnostic: no Genesys / three.js imports. The Genesys adapter feeds it the player's
 * position and button presses, then draws whatever state it reports. Tests drive it headless
 * with a bot. Same seed + same input log → same day, same ledger, same news.
 */
import { Director } from './comedy/director.js';
import {
  enterStage,
  evalCond,
  pickLine,
  resolveTarget,
  runActions,
  stepIncident,
  waitingOn,
  type RunningIncident,
  type Slot,
} from './comedy/scenario.js';
import type { ActorAnim, Difficulty, IncidentDef, Lines, MoveStyle, TargetRef } from './comedy/types.js';
import { ACTOR_BY_ID, CAST, STYLE_SPEED, actorName } from './content/cast.js';
import { BOX_FINDS, PROPS, PROP_BY_ID, type PlaceTarget } from './content/props.js';
import { Ledger, type FactValue } from './core/ledger.js';
import { Rng } from './core/rng.js';
import { add, dist, fromYaw, norm, stepToward, sub, yawOf, type Vec2 } from './core/vec.js';
import { tuning, type DifficultyTuning } from './gameplay/difficulty.js';
import { freshSave, type SaveData } from './memory/save.js';
import { PLAYER_SPAWN, PLAYER_SPAWN_YAW, SPOTS, WORLD_BOUNDS, describeLocation, inBounds, inZone, zoneById } from './world/layout.js';
import type { ActiveChoices, ActorState, Flight, PlayerState, PropState, SimEvent } from './world/state.js';

export interface SimContent {
  incidents: readonly IncidentDef[];
  /** Mission started at the beginning of the day. */
  missionId: string;
}

export interface SimOptions {
  seed: number;
  content: SimContent;
  save?: SaveData;
  difficulty?: Difficulty;
}

export interface CompletedIncident {
  id: string;
  punchline: string;
  t: number;
  outcome: string | null;
}

export type Interaction =
  | { kind: 'place'; prop: string; target: PlaceTarget; prompt: string }
  | { kind: 'drop'; prop: string; prompt: string }
  | { kind: 'give'; prop: string; actor: string; prompt: string }
  | { kind: 'pickup'; prop: string; prompt: string; highlight: boolean }
  | { kind: 'use'; prop: string; prompt: string; next: string | null; highlight: boolean }
  | { kind: 'talk'; actor: string; prompt: string; highlight: boolean };

export interface TraceEntry {
  t: number;
  source: string;
  what: string;
}

const INTERACT_RADIUS = 2.1;
const THROW_DISTANCE = 7.5;
const DOG_TOY_RADIUS = 16;
const CATCH_DOG_RADIUS = 1.7;
const SLIP_COOLDOWN = 7;
const CHAOS_DECAY_PER_SEC = 0.45;
const CHAOS_DECAY_GRACE = 10;

export class Sim {
  public t = 0;
  public readonly seed: number;
  public readonly day: number;
  public readonly difficulty: Difficulty;
  public readonly tune: DifficultyTuning;
  public readonly ledger = new Ledger();
  public readonly actors = new Map<string, ActorState>();
  public readonly props = new Map<string, PropState>();
  public readonly player: PlayerState;
  public readonly running: RunningIncident[] = [];
  public readonly completed: CompletedIncident[] = [];
  public readonly cooldowns = new Map<string, number>();
  public readonly memory: Map<string, FactValue>;
  public readonly affinity: Map<string, number>;
  public readonly incidents: readonly IncidentDef[];
  public readonly director: Director;
  public readonly rngDirector: Rng;
  public readonly rngLines: Rng;
  public readonly rngRolls: Rng;
  public readonly rngWorld: Rng;
  public readonly lastLine = new WeakMap<readonly string[], string>();
  public readonly timeline: TraceEntry[] = [];
  public readonly pendingRequests: { pool: string[]; parent: string | null; fallback: string | null }[] = [];
  public readonly save: SaveData;
  public chaos = 0;
  public chaosPeak = 0;
  public quietUntil = 0;
  public dayOver = false;
  public choices: ActiveChoices | null = null;

  private events: SimEvent[] = [];
  private readonly objectives = new Map<string, { text: string; target: TargetRef | null; inc: RunningIncident | null; order: number }>();
  private objectiveOrder = 0;
  private lastObjectiveText: string | null = null;
  private uidCounter = 0;
  private lastChaosRise = -999;
  private readonly followTargets = new Map<string, () => Vec2 | null>();
  private readonly incidentMap = new Map<string, IncidentDef>();
  private readonly toyChaseBy = new Set<string>();
  private lastTier = 0;
  private boxIndex = 0;

  public constructor(opts: SimOptions) {
    this.seed = opts.seed >>> 0;
    this.save = opts.save ?? freshSave();
    this.day = this.save.day;
    this.difficulty = opts.difficulty ?? this.save.difficulty;
    this.tune = tuning(this.difficulty);
    const root = new Rng(this.seed);
    this.rngDirector = root.fork('director');
    this.rngLines = root.fork('lines');
    this.rngRolls = root.fork('rolls');
    this.rngWorld = root.fork('world');
    this.incidents = opts.content.incidents;
    for (const d of this.incidents) {
      this.incidentMap.set(d.id, d);
    }
    this.memory = new Map(Object.entries(this.save.memory));
    this.affinity = new Map(Object.entries(this.save.affinity));
    this.player = { pos: { ...PLAYER_SPAWN }, yaw: PLAYER_SPAWN_YAW, holding: null, stunUntil: 0, stunKind: null, lastSlip: -999 };

    for (const def of CAST) {
      const home = SPOTS[def.home];
      const pos = def.homeOffset ? add(home, def.homeOffset) : { ...home };
      this.actors.set(def.id, {
        id: def.id,
        pos,
        yaw: Math.PI,
        order: null,
        arrived: false,
        reservedBy: null,
        anim: def.routine[0]?.anim ?? 'idle',
        animUntil: null,
        flight: null,
        routineIndex: 0,
        routineWaitUntil: this.rngWorld.range(1, 5),
        routinePhase: 'waiting',
        busyUntil: 0,
        mood: 0,
        soaked: false,
        visible: !def.startsHidden,
      });
    }
    for (const def of PROPS) {
      const home = SPOTS[def.home];
      this.props.set(def.id, {
        id: def.id,
        state: def.initial,
        pos: def.offset ? add(home, def.offset) : { ...home },
        y: def.y,
        heldBy: null,
        reservedBy: null,
        flight: null,
        count: def.count ?? 1,
      });
    }
    // Linda never leaves home without the clipboard; Granny's cart rides with Granny.
    this.giveProp('clipboard', 'linda', null);

    // Yesterday's consequences shape today's world (persistent callbacks).
    if (this.memory.get('grill_ruined') === true) {
      this.props.get('grill')!.state = 'campstove';
    }

    this.director = new Director(this);
    const mission = this.incidentMap.get(opts.content.missionId);
    if (!mission) {
      throw new Error(`unknown mission ${opts.content.missionId}`);
    }
    this.startIncident(mission, 'mission', null);
  }

  // ================================================================ public API (adapter)

  public tick(dt: number): void {
    if (dt <= 0) {
      return;
    }
    const step = Math.min(dt, 0.1);
    this.t += step;
    this.updateFlights();
    this.updateActors(step);
    this.updateHeldProps();
    this.systems(step);
    for (const inc of [...this.running]) {
      if (this.running.includes(inc)) {
        stepIncident(this, inc);
      }
    }
    this.director.tick(step);
    this.decayChaos(step);
  }

  /** Engine reports where the player is (physics is authoritative for the player only). */
  public setPlayer(pos: Vec2, yaw: number): void {
    this.player.pos = { x: pos.x, z: pos.z };
    this.player.yaw = yaw;
  }

  public drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  public emit(e: SimEvent): void {
    this.events.push(e);
  }

  public trace(source: string, what: string): void {
    this.timeline.push({ t: Math.round(this.t * 100) / 100, source, what });
    if (this.timeline.length > 600) {
      this.timeline.shift();
    }
  }

  public incidentById(id: string): IncidentDef | undefined {
    return this.incidentMap.get(id);
  }

  public get stunned(): boolean {
    return this.t < this.player.stunUntil;
  }

  /** Best interaction available right now (drives the on-screen prompt). */
  public interaction(): Interaction | null {
    const p = this.player;
    const waiting = this.waitingIds();
    if (p.holding) {
      const held = this.props.get(p.holding)!;
      const def = PROP_BY_ID.get(held.id)!;
      for (const tgt of def.placeTargets ?? []) {
        if (dist(p.pos, SPOTS[tgt.spot]) <= tgt.r) {
          return { kind: 'place', prop: held.id, target: tgt, prompt: tgt.verb };
        }
      }
      for (const a of this.actors.values()) {
        if (a.visible && waiting.has(a.id) && dist(p.pos, a.pos) <= INTERACT_RADIUS + 0.6) {
          return { kind: 'give', prop: held.id, actor: a.id, prompt: `Show the ${def.name} to ${actorName(a.id)}` };
        }
      }
      return { kind: 'drop', prop: held.id, prompt: `Put down the ${def.name}` };
    }
    let best: Interaction | null = null;
    let bestScore = Infinity;
    const consider = (i: Interaction, d: number, highlight: boolean) => {
      const score = d - (highlight ? 0.75 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    };
    for (const a of this.actors.values()) {
      if (!a.visible || a.flight) {
        continue;
      }
      const d = dist(p.pos, a.pos);
      const r = INTERACT_RADIUS + (ACTOR_BY_ID.get(a.id)?.size === 'large' ? 0.5 : 0);
      const loot = a.id === 'dog' ? this.dogLoot() : null;
      if (loot && d <= CATCH_DOG_RADIUS + 0.9) {
        consider({ kind: 'talk', actor: a.id, prompt: `Grab the ${PROP_BY_ID.get(loot)!.name} from Brisket!`, highlight: true }, d, true);
      } else if (d <= r) {
        const highlight = waiting.has(a.id);
        consider({ kind: 'talk', actor: a.id, prompt: ACTOR_BY_ID.get(a.id)?.verb ?? `Talk to ${a.id}`, highlight }, d, highlight);
      }
    }
    for (const pr of this.props.values()) {
      if (pr.flight || (pr.heldBy && pr.heldBy !== 'player')) {
        continue;
      }
      const def = PROP_BY_ID.get(pr.id)!;
      const d = dist(p.pos, pr.pos);
      if (d > (def.interactRadius ?? INTERACT_RADIUS)) {
        continue;
      }
      const highlight = waiting.has(pr.id);
      if (def.carry) {
        consider({ kind: 'pickup', prop: pr.id, prompt: `Pick up the ${def.name}`, highlight }, d, highlight);
      } else {
        const use = def.use?.[pr.state];
        consider(
          { kind: 'use', prop: pr.id, prompt: use ? use[0] : def.inspect ?? `Look at the ${def.name}`, next: use ? use[1] : null, highlight },
          d,
          highlight,
        );
      }
    }
    return best;
  }

  /** The Interact button. Returns what happened (for the adapter's sound/feedback). */
  public interact(): Interaction | null {
    if (this.dayOver || this.stunned) {
      return null;
    }
    const i = this.interaction();
    if (!i) {
      return null;
    }
    switch (i.kind) {
      case 'place': {
        const tgt = i.target;
        const spot = SPOTS[tgt.spot];
        this.player.holding = null;
        const pr = this.props.get(i.prop)!;
        pr.heldBy = null;
        pr.pos = { x: spot.x, z: spot.z };
        pr.y = tgt.y;
        if (tgt.state) {
          this.setPropState(i.prop, tgt.state, 'player');
        }
        if (tgt.fact) {
          this.ledger.record(this.t, tgt.fact, true, 'player', { prop: i.prop });
        }
        this.markUsed(i.prop);
        this.trace('player', `placed ${i.prop} at ${tgt.spot}`);
        this.emit({ type: 'sound', id: 'place', at: { ...pr.pos } });
        break;
      }
      case 'drop':
        this.dropHeld();
        break;
      case 'give':
        this.markUsed(i.actor);
        this.markUsed(i.prop);
        this.trace('player', `showed ${i.prop} to ${i.actor}`);
        break;
      case 'pickup': {
        const pr = this.props.get(i.prop)!;
        pr.heldBy = 'player';
        pr.flight = null;
        this.player.holding = i.prop;
        if (pr.state === 'stored' || pr.state === 'dropped' || pr.state === 'idle') {
          if (PROP_BY_ID.get(i.prop)!.states.includes('carried')) {
            pr.state = 'carried';
          }
        }
        this.ledger.bump(this.t, `player.picked_up.${i.prop}`, 1, 'player');
        this.markUsed(i.prop);
        this.trace('player', `picked up ${i.prop}`);
        this.emit({ type: 'sound', id: 'pickup', at: { ...pr.pos } });
        break;
      }
      case 'use': {
        this.markUsed(i.prop);
        if (i.next) {
          this.setPropState(i.prop, i.next, 'player');
          this.ledger.bump(this.t, `player.used.${i.prop}`, 1, 'player');
          this.emit({ type: 'sound', id: 'click', at: { ...this.props.get(i.prop)!.pos } });
        } else {
          this.inspect(i.prop);
        }
        this.trace('player', `used ${i.prop}${i.next ? ` → ${i.next}` : ''}`);
        break;
      }
      case 'talk': {
        if (i.actor === 'dog' && this.catchDog()) {
          this.markUsed('dog');
          break;
        }
        const claimed = this.markUsed(i.actor);
        if (!claimed) {
          this.defaultTalk(i.actor);
        }
        const a = this.actors.get(i.actor)!;
        if (!a.reservedBy && a.order === null) {
          this.face(i.actor, this.player.pos);
        }
        this.trace('player', `talked to ${i.actor}${claimed ? ' (incident)' : ''}`);
        break;
      }
    }
    return i;
  }

  /** The Throw button: toss what you hold where you're facing. */
  public throwHeld(): boolean {
    if (this.dayOver || this.stunned || !this.player.holding) {
      return false;
    }
    const id = this.player.holding;
    const def = PROP_BY_ID.get(id)!;
    if (!def.throwable) {
      this.caption(
        id === 'platter'
          ? 'You consider throwing the burgers. You decide to be a good neighbor.'
          : `The ${def.name} is not built for flight. You have principles.`,
        2.6,
      );
      return false;
    }
    const dir = fromYaw(this.player.yaw);
    let to = add(this.player.pos, { x: dir.x * THROW_DISTANCE, z: dir.z * THROW_DISTANCE });
    to = { x: Math.max(WORLD_BOUNDS.minX + 1, Math.min(WORLD_BOUNDS.maxX - 1, to.x)), z: Math.max(WORLD_BOUNDS.minZ + 1, Math.min(WORLD_BOUNDS.maxZ - 1, to.z)) };
    this.player.holding = null;
    const pr = this.props.get(id)!;
    pr.heldBy = null;
    pr.state = def.states.includes('thrown') ? 'thrown' : def.states.includes('dropped') ? 'dropped' : pr.state;
    this.launchProp(id, to, 2.6, 0.8, 0);
    this.ledger.bump(this.t, `player.threw.${id}`, 1, 'player', );
    this.trace('player', `threw ${id}`);
    this.emit({ type: 'sound', id: id === 'toy' ? 'squeak' : 'whoosh', at: { ...this.player.pos } });
    return true;
  }

  public choose(index: number): boolean {
    const c = this.choices;
    if (!c || !c.options.some((o) => o.index === index)) {
      return false;
    }
    const inc = this.running.find((r) => r.uid === c.owner);
    if (inc) {
      inc.chose = index;
    }
    this.trace('player', `chose ${index}: ${c.options.find((o) => o.index === index)?.text ?? ''}`);
    this.ledger.record(this.t, `choice.${inc?.def.id ?? 'world'}.${inc?.stageId ?? ''}`, index, 'player');
    this.choices = null;
    this.emit({ type: 'choices', choices: null });
    return true;
  }

  /**
   * Primary objective: the mission's, or a complication the mission asked for (latest wins).
   * Spontaneous encounters never hijack it; they surface as `sideObjective()` instead, and
   * only become primary when nothing else is going on.
   */
  public objective(): { text: string; target: Vec2 | null } | null {
    return this.pickObjective(true) ?? this.pickObjective(false);
  }

  /** A spontaneous encounter's objective, shown as an optional side task. */
  public sideObjective(): { text: string; target: Vec2 | null } | null {
    return this.pickObjective(true) ? this.pickObjective(false) : null;
  }

  private isMissionLine(inc: RunningIncident | null): boolean {
    let cur = inc;
    while (cur) {
      if (cur.slot === 'mission') {
        return true;
      }
      const parent = cur.parent;
      cur = parent ? this.running.find((r) => r.uid === parent) ?? null : null;
    }
    return false;
  }

  private pickObjective(missionLine: boolean): { text: string; target: Vec2 | null } | null {
    let best: { text: string; target: TargetRef | null; inc: RunningIncident | null; order: number } | null = null;
    for (const o of this.objectives.values()) {
      if (this.isMissionLine(o.inc) === missionLine && (!best || o.order > best.order)) {
        best = o;
      }
    }
    return best ? { text: best.text, target: best.target ? resolveTarget(this, best.inc, best.target) : null } : null;
  }

  public chaosTier(): number {
    return this.chaos >= 75 ? 3 : this.chaos >= 50 ? 2 : this.chaos >= 25 ? 1 : 0;
  }

  // ================================================================ incidents

  public startIncident(def: IncidentDef, slot: Slot, parent: RunningIncident | null): RunningIncident {
    const inc: RunningIncident = {
      uid: `${def.id}#${++this.uidCounter}`,
      def,
      slot,
      parent: parent?.uid ?? null,
      roles: new Map(),
      propRoles: new Map(),
      reserved: new Map(),
      t0: this.t,
      stageId: def.start,
      stageT0: this.t,
      used: new Set(),
      chose: null,
      rolls: new WeakMap(),
      ending: false,
      lingerUntil: 0,
      fellBack: false,
      outcome: null,
    };
    // Reserve cast (first free candidate in seeded order) and props.
    for (const [role, cand] of Object.entries(def.cast)) {
      const free = (owner: string | null) => owner === null || owner === inc.parent;
      const ordered = typeof cand === 'string' ? [cand] : shuffled(cand, this.rngDirector);
      const id = ordered.find((x) => {
        const a = this.actors.get(x);
        return !!a && free(a.reservedBy);
      });
      if (id) {
        this.reserveActor(inc, id, role);
      }
    }
    for (const [role, id] of Object.entries(def.props ?? {})) {
      const p = this.props.get(id);
      if (p) {
        inc.reserved.set(`p:${id}`, p.reservedBy);
        p.reservedBy = inc.uid;
        inc.propRoles.set(role, id);
      }
    }
    this.running.push(inc);
    if (def.chaosOnStart) {
      this.addChaos(def.chaosOnStart, def.id);
    }
    this.trace(def.id, `start (${slot})${parent ? ` for ${parent.def.id}` : ''}`);
    if (slot !== 'ambient') {
      this.ledger.record(this.t, `incident.${def.id}`, 'started', def.id);
      this.emit({ type: 'incident', id: def.id, phase: 'start', title: def.title });
    }
    enterStage(this, inc, def.start);
    return inc;
  }

  public reserveActor(inc: RunningIncident, id: string, role: string): boolean {
    const a = this.actors.get(id);
    if (!a) {
      return false;
    }
    const free = a.reservedBy === null || a.reservedBy === inc.parent || a.reservedBy === inc.uid;
    if (!free) {
      return false;
    }
    if (!inc.reserved.has(`a:${id}`)) {
      inc.reserved.set(`a:${id}`, a.reservedBy);
    }
    a.reservedBy = inc.uid;
    a.order = null;
    a.arrived = false;
    this.followTargets.delete(id);
    inc.roles.set(role, id);
    return true;
  }

  public releaseActor(inc: RunningIncident, id: string): void {
    const a = this.actors.get(id);
    const key = `a:${id}`;
    if (!a || !inc.reserved.has(key)) {
      return;
    }
    a.reservedBy = inc.reserved.get(key) ?? null;
    inc.reserved.delete(key);
    for (const [role, id2] of inc.roles) {
      if (id2 === id) {
        inc.roles.delete(role);
      }
    }
    if (a.reservedBy === null) {
      a.routinePhase = 'waiting';
      a.routineWaitUntil = this.t + 1.5;
    }
  }

  public finishIncident(inc: RunningIncident): void {
    const idx = this.running.indexOf(inc);
    if (idx < 0) {
      return;
    }
    this.running.splice(idx, 1);
    // Children first: a mission ending takes its complications with it.
    for (const child of this.running.filter((r) => r.parent === inc.uid)) {
      this.finishIncident(child);
    }
    for (const [key, prev] of inc.reserved) {
      const id = key.slice(2);
      if (key.startsWith('a:')) {
        const a = this.actors.get(id);
        if (a && a.reservedBy === inc.uid) {
          a.reservedBy = prev !== null && this.running.some((r) => r.uid === prev) ? prev : null;
          if (a.reservedBy === null) {
            a.routinePhase = 'waiting';
            a.routineWaitUntil = this.t + 1.5;
          }
        }
      } else {
        const p = this.props.get(id);
        if (p && p.reservedBy === inc.uid) {
          p.reservedBy = prev !== null && this.running.some((r) => r.uid === prev) ? prev : null;
        }
      }
    }
    this.clearChoicesOwnedBy(inc.uid);
    if (this.objectives.delete(inc.uid)) {
      this.publishObjective();
    }
    this.cooldowns.set(inc.def.id, this.t + inc.def.cooldown);
    this.completed.push({ id: inc.def.id, punchline: inc.def.punchline ?? inc.def.id, t: this.t, outcome: inc.outcome });
    this.trace(inc.def.id, `end${inc.outcome ? ` (${inc.outcome})` : ''}`);
    if (inc.slot !== 'ambient') {
      this.ledger.record(this.t, `incident.${inc.def.id}`, inc.outcome ?? 'done', inc.def.id);
      this.emit({ type: 'incident', id: inc.def.id, phase: 'end', title: inc.def.title });
    }
    if (inc.slot === 'major') {
      this.quietUntil = this.t + 9;
      const pending = this.pendingRequests.shift();
      if (pending) {
        const parent = this.running.find((r) => r.uid === pending.parent) ?? null;
        if (parent || pending.parent === null) {
          this.director.request(pending.pool, parent, pending.fallback);
        }
      }
    }
    if (inc.slot === 'mission') {
      this.dayOver = true;
      this.objectives.clear();
      this.publishObjective();
      this.emit({ type: 'dayOver' });
    }
  }

  /** Records a player interaction into every running incident; true if any stage was waiting on it. */
  private markUsed(id: string): boolean {
    let claimed = false;
    for (const inc of this.running) {
      if (waitingOn(this, inc).has(id)) {
        claimed = true;
      }
      inc.used.add(id);
    }
    return claimed;
  }

  private waitingIds(): Set<string> {
    const out = new Set<string>();
    for (const inc of this.running) {
      for (const id of waitingOn(this, inc)) {
        out.add(id);
      }
    }
    return out;
  }

  // ================================================================ world mutation helpers

  public say(actor: string, text: string, dur?: number): void {
    this.emit({ type: 'say', actor, text, dur: dur ?? Math.min(6.5, 2.4 + text.length * 0.045) });
  }

  public caption(text: string, dur?: number): void {
    this.emit({ type: 'caption', text, dur: dur ?? Math.min(6, 2.2 + text.length * 0.04) });
  }

  public orderGoto(id: string, to: Vec2, style: MoveStyle): void {
    const a = this.actors.get(id);
    if (!a) {
      return;
    }
    a.order = { kind: 'goto', to: this.clampWorld(to), style };
    a.arrived = false;
    this.followTargets.delete(id);
  }

  public orderFollow(id: string, target: () => Vec2 | null, style: MoveStyle, keep: number): void {
    const a = this.actors.get(id);
    if (!a) {
      return;
    }
    this.followTargets.set(id, target);
    a.order = { kind: 'follow', targetKey: id, style, keep };
    a.arrived = false;
  }

  public orderRoute(id: string, via: Vec2[], style: MoveStyle, pauses: number): void {
    const a = this.actors.get(id);
    if (!a || via.length === 0) {
      return;
    }
    a.order = { kind: 'route', via: via.map((v) => this.clampWorld(v)), index: 0, style, pauses, pauseLeft: 0 };
    a.arrived = false;
    this.followTargets.delete(id);
  }

  public orderStop(id: string): void {
    const a = this.actors.get(id);
    if (a) {
      a.order = null;
      this.followTargets.delete(id);
    }
  }

  public face(id: string, at: Vec2): void {
    const a = this.actors.get(id);
    if (a) {
      const d = sub(at, a.pos);
      if (Math.hypot(d.x, d.z) > 0.01) {
        a.yaw = yawOf(d);
      }
    }
  }

  public setAnim(id: string, anim: ActorAnim, dur?: number): void {
    const a = this.actors.get(id);
    if (a) {
      a.anim = anim;
      a.animUntil = dur !== undefined ? this.t + dur : null;
    }
  }

  public setPropState(id: string, state: string, source: string): void {
    const p = this.props.get(id);
    if (!p || p.state === state) {
      return;
    }
    p.state = state;
    this.ledger.record(this.t, `prop.${id}`, state, source, { prop: id });
  }

  public giveProp(id: string, to: string, at: Vec2 | null): void {
    const p = this.props.get(id);
    if (!p) {
      return;
    }
    if (p.heldBy === 'player') {
      this.player.holding = null;
    }
    p.flight = null;
    if (to === 'nobody') {
      p.heldBy = null;
      if (at) {
        p.pos = this.clampWorld(at);
      }
      p.y = 0;
      return;
    }
    if (to === 'player') {
      if (this.player.holding && this.player.holding !== id) {
        this.dropHeld();
      }
      this.player.holding = id;
      p.heldBy = 'player';
      return;
    }
    p.heldBy = to;
  }

  public placeProp(id: string, at: Vec2, y: number): void {
    const p = this.props.get(id);
    if (!p) {
      return;
    }
    if (p.heldBy === 'player') {
      this.player.holding = null;
    }
    p.heldBy = null;
    p.flight = null;
    p.pos = this.clampWorld(at);
    p.y = y;
  }

  public launchProp(id: string, to: Vec2, height: number, dur: number, landY: number): void {
    const p = this.props.get(id);
    if (!p) {
      return;
    }
    if (p.heldBy === 'player') {
      this.player.holding = null;
    }
    const fromY = p.heldBy ? 1.1 : p.y;
    const holderPos = p.heldBy === 'player' ? this.player.pos : p.heldBy ? this.actors.get(p.heldBy)?.pos : null;
    const from = holderPos ? { ...holderPos } : { ...p.pos };
    p.heldBy = null;
    p.flight = { from, fromY, to: this.clampWorld(to), toY: landY, height, t0: this.t, t1: this.t + Math.max(0.2, dur) };
  }

  public hopActor(id: string, to: Vec2, height: number, dur: number): void {
    const a = this.actors.get(id);
    if (!a) {
      return;
    }
    a.visible = true;
    a.order = null;
    a.flight = { from: { ...a.pos }, fromY: 0, to: this.clampWorld(to), toY: 0, height, t0: this.t, t1: this.t + Math.max(0.2, dur) };
    a.yaw = yawOf(sub(to, a.pos));
  }

  public stunPlayer(kind: 'slip' | 'spin' | 'soaked', dur: number): void {
    this.player.stunUntil = this.t + dur;
    this.player.stunKind = kind;
    this.emit({ type: 'stun', kind, dur });
  }

  public dropHeld(): void {
    const id = this.player.holding;
    if (!id) {
      return;
    }
    const p = this.props.get(id)!;
    const ahead = fromYaw(this.player.yaw);
    p.heldBy = null;
    p.pos = this.clampWorld(add(this.player.pos, { x: ahead.x * 0.9, z: ahead.z * 0.9 }));
    p.y = 0;
    this.player.holding = null;
    const def = PROP_BY_ID.get(id)!;
    if (p.state === 'carried' && def.states.includes('dropped')) {
      p.state = 'dropped';
    }
    this.trace('player', `dropped ${id}`);
    this.emit({ type: 'sound', id: 'place', at: { ...p.pos } });
  }

  public remember(key: string, value: FactValue, source: string): void {
    const had = this.memory.get(key);
    this.memory.set(key, value);
    this.ledger.record(this.t, `memory.${key}`, value, source);
    if (had === undefined) {
      this.trace(source, `memory ${key}=${String(value)}`);
    }
  }

  public addAffinity(id: string, by: number, source: string): void {
    const v = Math.max(-10, Math.min(10, (this.affinity.get(id) ?? 0) + by));
    this.affinity.set(id, v);
    this.ledger.record(this.t, `affinity.${id}`, v, source);
  }

  public addHoaRule(id: string, text: string, source: string): void {
    const key = `hoa.rule.${id}`;
    if (this.memory.get(key)) {
      return;
    }
    this.remember(key, true, source);
    this.ledger.record(this.t, `hoa_rule_new.${id}`, text, source);
    this.emit({ type: 'toast', text: `NEW HOA RULE: ${text}`, kind: 'rule' });
  }

  public addAward(id: string, text: string, source: string): void {
    const key = `award.${id}`;
    if (this.memory.get(key)) {
      return;
    }
    this.remember(key, true, source);
    this.ledger.record(this.t, `award_new.${id}`, text, source);
    this.emit({ type: 'toast', text, kind: 'award' });
  }

  public addChaos(n: number, source: string): void {
    const before = this.chaos;
    const scaled = n > 0 ? n * this.tune.chaosGain : n;
    this.chaos = Math.max(0, Math.min(100, this.chaos + scaled));
    if (this.chaos > before) {
      this.lastChaosRise = this.t;
    }
    this.chaosPeak = Math.max(this.chaosPeak, this.chaos);
    if (Math.round(before) !== Math.round(this.chaos)) {
      this.ledger.record(this.t, 'chaos', Math.round(this.chaos), source);
    }
    this.publishChaos();
  }

  public setObjective(owner: string, text: string | null, target: TargetRef | null, inc: RunningIncident | null): void {
    if (text === null) {
      this.objectives.delete(owner);
    } else {
      this.objectives.set(owner, { text, target, inc, order: ++this.objectiveOrder });
    }
    this.publishObjective();
  }

  public offerChoices(owner: string, from: string | null, options: readonly string[]): void {
    this.choices = { owner, from, options: options.map((text, index) => ({ index, text })) };
    this.emit({ type: 'choices', choices: this.choices });
  }

  public clearChoicesOwnedBy(owner: string): void {
    if (this.choices && this.choices.owner === owner) {
      this.choices = null;
      this.emit({ type: 'choices', choices: null });
    }
  }

  private publishObjective(): void {
    const o = this.objective();
    const side = this.sideObjective();
    const text = o?.text ?? null;
    const key = `${text}|${side?.text ?? ''}`;
    if (key !== this.lastObjectiveText) {
      this.lastObjectiveText = key;
      this.emit({ type: 'objective', text, side: side?.text ?? null });
    }
  }

  private publishChaos(): void {
    const tier = this.chaosTier();
    this.emit({ type: 'chaos', value: this.chaos, tier });
    if (tier > this.lastTier) {
      const names = ['', 'LIVELY', 'WILD', 'UNHINGED'];
      this.emit({ type: 'toast', text: `Neighborhood status: ${names[tier]}. Everything is fine.`, kind: 'info' });
    }
    this.lastTier = tier;
  }

  private clampWorld(p: Vec2): Vec2 {
    return {
      x: Math.max(WORLD_BOUNDS.minX + 0.5, Math.min(WORLD_BOUNDS.maxX - 0.5, p.x)),
      z: Math.max(WORLD_BOUNDS.minZ + 0.5, Math.min(WORLD_BOUNDS.maxZ - 0.5, p.z)),
    };
  }

  // ================================================================ per-tick updates

  private updateFlights(): void {
    for (const p of this.props.values()) {
      const f = p.flight;
      if (f && this.t >= f.t1) {
        p.flight = null;
        p.pos = { ...f.to };
        p.y = f.toY;
        this.emit({ type: 'propLanded', prop: p.id, at: { ...p.pos } });
        this.onPropLanded(p);
      }
    }
    for (const a of this.actors.values()) {
      const f = a.flight;
      if (f) {
        const k = Math.min(1, (this.t - f.t0) / (f.t1 - f.t0));
        a.pos = { x: f.from.x + (f.to.x - f.from.x) * k, z: f.from.z + (f.to.z - f.from.z) * k };
        if (this.t >= f.t1) {
          a.flight = null;
          a.pos = { ...f.to };
          a.arrived = true;
        }
      }
    }
  }

  private speedOf(a: ActorState, style: MoveStyle): number {
    const def = ACTOR_BY_ID.get(a.id);
    let s = (STYLE_SPEED[style] ?? 2.3) * (def?.speed ?? 1);
    if (a.id === 'dog') {
      s *= this.tune.dogSpeed;
    }
    if (a.id === 'granny' && style === 'drive') {
      s = STYLE_SPEED.drive!;
    }
    return s;
  }

  private updateActors(dt: number): void {
    for (const a of this.actors.values()) {
      if (a.flight) {
        continue;
      }
      if (a.animUntil !== null && this.t >= a.animUntil) {
        a.anim = 'idle';
        a.animUntil = null;
      }
      const o = a.order;
      if (!o) {
        if (a.reservedBy === null && this.t >= a.busyUntil) {
          this.routine(a);
        }
        continue;
      }
      if (o.kind === 'goto') {
        this.moveActor(a, o.to, this.speedOf(a, o.style) * dt, () => {
          a.order = null;
          a.arrived = true;
        });
      } else if (o.kind === 'follow') {
        const target = this.followTargets.get(o.targetKey)?.();
        if (target && dist(a.pos, target) > o.keep) {
          this.moveActor(a, target, this.speedOf(a, o.style) * dt, () => undefined);
          const d = dist(a.pos, target);
          if (d <= o.keep) {
            a.arrived = true;
          }
        }
      } else if (o.kind === 'route') {
        if (o.pauseLeft > 0) {
          o.pauseLeft -= dt;
          continue;
        }
        const next = o.via[o.index];
        if (!next) {
          a.order = null;
          a.arrived = true;
          continue;
        }
        this.moveActor(a, next, this.speedOf(a, o.style) * dt, () => {
          o.index += 1;
          o.pauseLeft = o.pauses;
          if (o.index >= o.via.length) {
            a.order = null;
            a.arrived = true;
          }
        });
      }
    }
  }

  private moveActor(a: ActorState, to: Vec2, step: number, onArrive: () => void): void {
    const r = stepToward(a.pos, to, step);
    const d = sub(r.pos, a.pos);
    if (Math.hypot(d.x, d.z) > 1e-4) {
      a.yaw = yawOf(d);
    }
    a.pos = r.pos;
    if (r.arrived) {
      onArrive();
    }
  }

  private routine(a: ActorState): void {
    const def = ACTOR_BY_ID.get(a.id);
    if (!def || def.routine.length === 0 || !a.visible) {
      return;
    }
    if (a.routinePhase === 'waiting') {
      if (this.t < a.routineWaitUntil) {
        return;
      }
      a.routineIndex = (a.routineIndex + 1) % def.routine.length;
      const step = def.routine[a.routineIndex]!;
      const home = SPOTS[step.at];
      const to = step.offset ? add(home, step.offset) : { ...home };
      a.routinePhase = 'moving';
      a.anim = 'idle';
      if (dist(a.pos, to) > 0.2) {
        a.order = { kind: 'goto', to, style: a.id === 'dog' ? 'walk' : 'stroll' };
        return;
      }
    }
    // Arrived at a routine step: settle in, maybe bark.
    const step = def.routine[a.routineIndex]!;
    a.anim = step.anim ?? 'idle';
    a.animUntil = null;
    a.routinePhase = 'waiting';
    a.routineWaitUntil = this.t + this.rngWorld.range(step.wait[0], step.wait[1]);
    if (step.bark && this.rngWorld.chance(step.barkChance ?? 0) && dist(a.pos, this.player.pos) < 18) {
      this.say(a.id, pickLine(this, step.bark));
    }
  }

  private updateHeldProps(): void {
    for (const p of this.props.values()) {
      if (p.heldBy === 'player') {
        p.pos = { ...this.player.pos };
        p.y = 1;
      } else if (p.heldBy) {
        const a = this.actors.get(p.heldBy);
        if (a) {
          p.pos = { ...a.pos };
          p.y = a.id === 'dog' ? 0.5 : 1;
        }
      }
    }
  }

  // ================================================================ systemic rules

  /**
   * Systemic comedy: small, general rules that combine with any incident. These are what make
   * chains emergent rather than scripted — a thrown toy distracts Brisket no matter WHY he is
   * running, and a running sprinkler soaks whoever crosses it, burgers included.
   */
  private systems(dt: number): void {
    const dog = this.actors.get('dog')!;
    const valve = this.props.get('valve')!;

    // Brisket drops whatever he carries when a squeaky toy lands nearby.
    // (Handled on landing; here: when he reaches the toy, he settles with it.)
    if (this.toyChaseBy.has('dog') && dog.order === null && !dog.flight) {
      this.toyChaseBy.delete('dog');
      const toy = this.props.get('toy')!;
      if (dist(dog.pos, toy.pos) < 1.5 && toy.heldBy === null && !toy.flight) {
        this.giveProp('toy', 'dog', null);
        toy.state = 'chewed';
        this.setAnim('dog', 'sit', 3);
        this.emote('dog', 'heart');
        this.emit({ type: 'sound', id: 'squeak', at: { ...dog.pos } });
        this.ledger.record(this.t, 'dog_has_toy', true, 'systems', { actor: 'dog', prop: 'toy' });
        // Brisket's attention span is legendary; he gives the toy back to the lawn later.
        dog.busyUntil = this.t + 4;
      }
    }

    // Brisket steps on the sprinkler valve while running for his life.
    if (valve.state === 'off' && dog.order && dist(dog.pos, valve.pos) < 1.3) {
      this.setPropState('valve', 'on', 'systems');
      this.ledger.record(this.t, 'sprinkler_on_by_dog', true, 'systems', { actor: 'dog', prop: 'valve' });
      this.caption('Brisket steps directly on the sprinkler valve. Of course he does.', 3);
      this.addChaos(8, 'systems');
    }

    // The sprinkler soaks people, dogs and burgers inside its spray.
    if (valve.state === 'on' || valve.state === 'jammed') {
      const zone = zoneById('sprinkler_zone')!;
      for (const a of this.actors.values()) {
        if (a.visible && !a.soaked && inZone(a.pos, zone)) {
          a.soaked = true;
          this.ledger.record(this.t, `soaked.${a.id}`, true, 'systems', { actor: a.id });
          this.emote(a.id, 'gasp');
          if (a.id !== 'dog' && a.id !== 'chickens') {
            this.say(a.id, pickLine(this, SOAK_LINES[a.id] ?? ['Bracing!']), 2.4);
          }
        }
      }
      const platter = this.props.get('platter')!;
      if (!platter.flight && inZone(platter.pos, zone) && platter.heldBy !== 'player' && ['raw', 'grilled', 'dusty'].includes(platter.state)) {
        this.setPropState('platter', 'soggy', 'systems');
        this.ledger.record(this.t, 'burgers_soggy', true, 'systems');
      }
      if (!this.stunned && inZone(this.player.pos, zone) && this.t - this.player.lastSlip > SLIP_COOLDOWN) {
        this.player.lastSlip = this.t;
        if (!this.ledger.truthy('soaked.player')) {
          this.ledger.record(this.t, 'soaked.player', true, 'systems');
        }
        this.ledger.bump(this.t, 'player_slips', 1, 'systems');
        this.stunPlayer('slip', 0.9);
        this.caption(pickLine(this, ['Whoa! Slippery lawn.', 'You slip with tremendous grace.', 'The lawn is now a water park. You are the ride.']), 2);
      }
    }

    // Props that leave the world come back via a concerned citizen (never a soft-lock).
    for (const p of this.props.values()) {
      if (!p.flight && !p.heldBy && !inBounds(p.pos, 0.6)) {
        const def = PROP_BY_ID.get(p.id)!;
        p.pos = def.offset ? add(SPOTS[def.home], def.offset) : { ...SPOTS[def.home] };
        p.y = def.y;
        this.caption(`The ${def.name} has been returned by a concerned citizen.`, 3);
        this.ledger.bump(this.t, 'props_returned', 1, 'systems');
      }
    }

    // Unstick: an actor that ends up off the map walks home.
    for (const a of this.actors.values()) {
      if (!inBounds(a.pos, 0.2)) {
        const def = ACTOR_BY_ID.get(a.id)!;
        a.pos = def.homeOffset ? add(SPOTS[def.home], def.homeOffset) : { ...SPOTS[def.home] };
        a.order = null;
      }
    }
    void dt;
  }

  /** What Brisket is carrying (other than his own toy), if anything. */
  public dogLoot(): string | null {
    for (const p of this.props.values()) {
      if (p.heldBy === 'dog' && p.id !== 'toy') {
        return p.id;
      }
    }
    return null;
  }

  /** Player grabs Brisket's loot. The dog lets go (it's a little dusty) and bolts. */
  private catchDog(): boolean {
    const dog = this.actors.get('dog')!;
    const id = this.dogLoot();
    if (!id || dist(dog.pos, this.player.pos) > CATCH_DOG_RADIUS + 0.9) {
      return false;
    }
    const carried = this.props.get(id)!;
    this.giveProp(id, 'nobody', dog.pos);
    carried.y = 0;
    if (id === 'platter') {
      this.setPropState('platter', 'dusty', 'systems');
    }
    this.ledger.record(this.t, 'dog_caught', true, 'player', { actor: 'dog', prop: id });
    this.ledger.record(this.t, `dog_dropped.${id}`, true, 'player');
    this.emote('dog', 'gasp');
    const away = add(dog.pos, { x: (dog.pos.x - this.player.pos.x) * 2, z: (dog.pos.z - this.player.pos.z) * 2 });
    this.orderGoto('dog', away, 'run');
    this.caption(`You tackle-hug Brisket. He surrenders the ${PROP_BY_ID.get(id)!.name}. Mostly.`, 3);
    this.emit({ type: 'sound', id: 'catch', at: { ...dog.pos } });
    return true;
  }

  private onPropLanded(p: PropState): void {
    this.ledger.record(this.t, `landed.${p.id}`, describeLocation(p.pos), 'systems', { prop: p.id });
    if (p.id === 'toy') {
      const dog = this.actors.get('dog')!;
      if (dist(dog.pos, p.pos) <= DOG_TOY_RADIUS && !dog.flight) {
        const carried = [...this.props.values()].find((x) => x.heldBy === 'dog' && x.id !== 'toy');
        if (carried) {
          this.giveProp(carried.id, 'nobody', dog.pos);
          carried.y = 0;
          this.ledger.record(this.t, `dog_dropped.${carried.id}`, true, 'systems', { actor: 'dog', prop: carried.id });
          this.ledger.record(this.t, 'dog_distracted_by_toy', true, 'systems', { actor: 'dog' });
          this.caption(`SQUEAK. Brisket drops the ${PROP_BY_ID.get(carried.id)!.name} instantly. Priorities.`, 3);
        } else {
          this.ledger.bump(this.t, 'fetch_games', 1, 'systems');
        }
        this.emote('dog', '!');
        this.toyChaseBy.add('dog');
        dog.order = { kind: 'goto', to: { ...p.pos }, style: 'sprint' };
        dog.arrived = false;
      }
    }
    if (p.id === 'platter' && p.state === 'airborne') {
      // Content decides what airborne burgers become; default to dusty if nobody does.
      this.setPropState('platter', 'dusty', 'systems');
    }
  }

  private decayChaos(dt: number): void {
    if (this.chaos <= 0 || this.director.majorRunning()) {
      return;
    }
    if (this.t - this.lastChaosRise < CHAOS_DECAY_GRACE) {
      return;
    }
    const before = Math.round(this.chaos);
    this.chaos = Math.max(0, this.chaos - CHAOS_DECAY_PER_SEC * dt);
    if (Math.round(this.chaos) !== before) {
      this.publishChaos();
    }
  }

  private emote(actor: string, emote: SimEvent extends infer E ? (E extends { type: 'emote'; emote: infer M } ? M : never) : never): void {
    this.emit({ type: 'emote', actor, emote });
  }

  private defaultTalk(actorId: string): void {
    const def = ACTOR_BY_ID.get(actorId);
    if (!def) {
      return;
    }
    const group = def.talk.find((g) => !g.when || evalCond(this, null, g.when));
    if (!group) {
      return;
    }
    this.ledger.bump(this.t, `talked.${actorId}`, 1, 'player');
    const line = pickLine(this, group.lines);
    if (actorId === 'dog' || actorId === 'mower' || actorId === 'chickens') {
      this.caption(line, 3);
      if (actorId === 'dog') {
        this.emote('dog', 'heart');
        this.ledger.bump(this.t, 'dog_pets', 1, 'player');
      }
    } else {
      this.say(actorId, line);
      if (group.when) {
        this.ledger.bump(this.t, 'callbacks_heard', 1, actorId);
        this.emit({ type: 'toast', text: `${def.name} remembers.`, kind: 'callback' });
      }
    }
  }

  private inspect(propId: string): void {
    this.ledger.bump(this.t, `player.inspected.${propId}`, 1, 'player');
    switch (propId) {
      case 'board': {
        const rules = [...this.memory.keys()].filter((k) => k.startsWith('hoa.rule.') && this.memory.get(k));
        const posted = this.save.hoaRules.map((r) => r.text);
        const fresh = this.ledger
          .all()
          .filter((e) => e.key.startsWith('hoa_rule_new.'))
          .map((e) => String(e.value));
        const all = [...new Set([...posted, ...fresh])];
        if (all.length === 0) {
          this.caption('HOA BOARD: "Rule 1: Have a pleasant day. (Mandatory.)" There is room for more rules. Linda is waiting.', 4.5);
        } else {
          this.caption(`HOA BOARD: ${all.slice(-3).map((r, i) => `Rule ${rules.length - Math.min(3, all.length) + i + 2}: ${r}`).join('  ·  ')}`, 6);
        }
        break;
      }
      case 'mailbox':
        this.setPropState('mailbox', 'open', 'player');
        this.caption('The mailbox snaps open, then shut, then open. It would prefer you didn\'t.', 3);
        this.ledger.bump(this.t, 'mailbox_bites', 1, 'player');
        break;
      case 'boxes':
        this.caption(BOX_FINDS[this.boxIndex % BOX_FINDS.length]!, 4.5);
        this.boxIndex += 1;
        this.ledger.bump(this.t, 'boxes_unpacked', 1, 'player');
        break;
      case 'trampoline':
        this.ledger.bump(this.t, 'trampoline_bounces', 1, 'player');
        this.emit({ type: 'bounce', power: 1 });
        this.emit({ type: 'sound', id: 'boing', at: { ...this.player.pos } });
        this.caption(pickLine(this, ['BOING. You understand Todd now.', 'For one second, you can see the whole neighborhood. It is all fine.', 'Todd gives you a thumbs up from somewhere.']), 2.6);
        break;
      case 'cart':
        this.emit({ type: 'sound', id: 'horn', at: { ...this.props.get('cart')!.pos } });
        this.caption('HONK. Somewhere, Granny Darlene senses it.', 2.4);
        break;
      case 'grill':
        this.caption(this.props.get('grill')!.state === 'campstove' ? 'A tiny camp stove sits where the grill used to be. It is trying its best.' : "Randy's grill. It has a name. Randy won't tell you the name.", 3.2);
        break;
      case 'flipper':
        this.caption('WARNING LABEL: "Do not stand in front of, behind, or near. Do not look directly at the spatula."', 3.6);
        break;
      case 'valve':
        this.caption('The valve is jammed. It has chosen water.', 2.6);
        break;
      case 'gate':
        this.setPropState('gate', 'closed', 'player');
        this.caption('You prop the gate back up. It holds. Spiritually.', 2.6);
        break;
      default:
        break;
    }
  }

  // ================================================================ debug

  /** Plain snapshot for the debug panel and tests. */
  public debugState(): Record<string, unknown> {
    return {
      t: Math.round(this.t * 10) / 10,
      seed: this.seed,
      day: this.day,
      difficulty: this.difficulty,
      chaos: Math.round(this.chaos),
      running: this.running.map((r) => ({ id: r.def.id, slot: r.slot, stage: r.stageId, roles: Object.fromEntries(r.roles), props: Object.fromEntries(r.propRoles) })),
      reservations: [...this.actors.values()].filter((a) => a.reservedBy).map((a) => `${a.id}→${a.reservedBy}`).concat([...this.props.values()].filter((p) => p.reservedBy).map((p) => `${p.id}→${p.reservedBy}`)),
      objective: this.objective()?.text ?? null,
      lastDecision: this.director.lastDecision,
      completed: this.completed.map((c) => c.id),
    };
  }
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const SOAK_LINES: Record<string, Lines> = {
  randy: ["It's fine! It's a marinade now!", 'Folks, this is all part of the experience!'],
  linda: ['This is a Class Two Moisture Event.', "I'm not wet. I'm compliant with the weather."],
  earl: ['Ha! Self-cleaning! I meant that.', 'Note to self: waterproof... everything.'],
  granny: ["I've been wetter. Baptist potluck, '83.", 'Nobody panic! I am already damp!'],
  todd: ['Refreshing!'],
};

export type { Flight };

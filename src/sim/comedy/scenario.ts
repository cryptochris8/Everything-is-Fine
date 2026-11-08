/**
 * Scenario interpreter: runs incidents, ambient gags and missions written in the typed
 * content language (types.ts). Conditions and actions are a closed, whitelisted set —
 * nothing in content can execute code.
 *
 * Lifecycle (blueprint 03): Eligible → Reserved → Setup → Trigger → Escalate → Payoff →
 * Aftermath → Cooldown. Every non-terminal stage has a timeout, and every incident has a
 * hard `maxDuration` that jumps to its `fallback` ending, so nothing can hang.
 */
import type { FactValue } from '../core/ledger.js';
import type { Vec2 } from '../core/vec.js';
import { dist } from '../core/vec.js';
import type { Sim } from '../sim.js';
import { SPOTS, inZone, zoneById, zoneCenter } from '../world/layout.js';
import type { Action, Cond, IncidentDef, Lines, Stage, TargetRef } from './types.js';

export type Slot = 'mission' | 'major' | 'ambient';

export interface RunningIncident {
  uid: string;
  def: IncidentDef;
  slot: Slot;
  parent: string | null;
  roles: Map<string, string>;
  propRoles: Map<string, string>;
  /** Items this incident reserved (keys 'a:<id>' / 'p:<id>') and who owned them before. */
  reserved: Map<string, string | null>;
  t0: number;
  stageId: string;
  stageT0: number;
  used: Set<string>;
  chose: number | null;
  rolls: WeakMap<object, boolean>;
  ending: boolean;
  lingerUntil: number;
  fellBack: boolean;
  outcome: string | null;
}

// ------------------------------------------------------------------ references

export function resolveActor(sim: Sim, inc: RunningIncident | null, ref: string): string | null {
  const viaRole = inc?.roles.get(ref);
  if (viaRole) {
    return viaRole;
  }
  return sim.actors.has(ref) ? ref : null;
}

export function resolveProp(sim: Sim, inc: RunningIncident | null, ref: string): string | null {
  const viaRole = inc?.propRoles.get(ref);
  if (viaRole) {
    return viaRole;
  }
  return sim.props.has(ref) ? ref : null;
}

/** Actor id, prop id, or 'player' — whichever the ref names. */
export function resolveAny(sim: Sim, inc: RunningIncident | null, ref: string): string | null {
  if (ref === 'player') {
    return 'player';
  }
  return resolveActor(sim, inc, ref) ?? resolveProp(sim, inc, ref);
}

export function resolveTarget(sim: Sim, inc: RunningIncident | null, target: TargetRef): Vec2 | null {
  if ('spot' in target) {
    const s = SPOTS[target.spot];
    return s ? { x: s.x, z: s.z } : null;
  }
  if ('zone' in target) {
    const z = zoneById(target.zone);
    return z ? zoneCenter(z) : null;
  }
  if ('actor' in target) {
    const id = resolveActor(sim, inc, target.actor);
    const a = id ? sim.actors.get(id) : undefined;
    return a ? { ...a.pos } : null;
  }
  if ('prop' in target) {
    const id = resolveProp(sim, inc, target.prop);
    const p = id ? sim.props.get(id) : undefined;
    return p ? { ...p.pos } : null;
  }
  if ('player' in target) {
    return { ...sim.player.pos };
  }
  return { ...target.point };
}

// ------------------------------------------------------------------ conditions

function compare(v: FactValue | undefined, c: { eq?: FactValue; gte?: number }): boolean {
  if (c.eq !== undefined) {
    return v === c.eq;
  }
  if (c.gte !== undefined) {
    return typeof v === 'number' && v >= c.gte;
  }
  return v !== undefined && v !== false && v !== 0 && v !== '';
}

export function evalCond(sim: Sim, inc: RunningIncident | null, c: Cond): boolean {
  if ('all' in c) {
    return c.all.every((x) => evalCond(sim, inc, x));
  }
  if ('any' in c) {
    return c.any.some((x) => evalCond(sim, inc, x));
  }
  if ('not' in c) {
    return !evalCond(sim, inc, c.not);
  }
  if ('always' in c) {
    return true;
  }
  if ('fact' in c) {
    return compare(sim.ledger.get(c.fact), c);
  }
  if ('memory' in c) {
    return compare(sim.memory.get(c.memory), c);
  }
  if ('affinity' in c) {
    const id = resolveActor(sim, inc, c.affinity);
    const v = id ? sim.affinity.get(id) ?? 0 : 0;
    return (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte);
  }
  if ('propState' in c) {
    const p = sim.props.get(resolveProp(sim, inc, c.propState) ?? '');
    if (!p) {
      return false;
    }
    return typeof c.is === 'string' ? p.state === c.is : c.is.includes(p.state);
  }
  if ('heldBy' in c) {
    const p = sim.props.get(resolveProp(sim, inc, c.heldBy) ?? '');
    if (!p) {
      return false;
    }
    if (c.by === 'nobody') {
      return p.heldBy === null && p.flight === null;
    }
    if (c.by === 'player') {
      return p.heldBy === 'player';
    }
    return p.heldBy !== null && p.heldBy === resolveActor(sim, inc, c.by);
  }
  if ('playerNear' in c) {
    const t = resolveTarget(sim, inc, c.playerNear);
    return t !== null && dist(sim.player.pos, t) <= c.r;
  }
  if ('actorNear' in c) {
    const a = sim.actors.get(resolveActor(sim, inc, c.actorNear) ?? '');
    const t = resolveTarget(sim, inc, c.target);
    return !!a && t !== null && dist(a.pos, t) <= c.r;
  }
  if ('propNear' in c) {
    const p = sim.props.get(resolveProp(sim, inc, c.propNear) ?? '');
    const t = resolveTarget(sim, inc, c.target);
    return !!p && !p.flight && t !== null && dist(p.pos, t) <= c.r;
  }
  if ('propInZone' in c) {
    const p = sim.props.get(resolveProp(sim, inc, c.propInZone) ?? '');
    const z = zoneById(c.zone);
    return !!p && !!z && !p.flight && inZone(p.pos, z);
  }
  if ('actorInZone' in c) {
    const a = sim.actors.get(resolveActor(sim, inc, c.actorInZone) ?? '');
    const z = zoneById(c.zone);
    return !!a && !!z && inZone(a.pos, z);
  }
  if ('arrived' in c) {
    const a = sim.actors.get(resolveActor(sim, inc, c.arrived) ?? '');
    return !!a && a.order === null && a.flight === null;
  }
  if ('elapsed' in c) {
    return inc !== null && sim.t - inc.stageT0 >= c.elapsed;
  }
  if ('chaosGte' in c) {
    return sim.chaos >= c.chaosGte;
  }
  if ('chaosLt' in c) {
    return sim.chaos < c.chaosLt;
  }
  if ('difficulty' in c) {
    return typeof c.difficulty === 'string' ? sim.difficulty === c.difficulty : c.difficulty.includes(sim.difficulty);
  }
  if ('used' in c) {
    const id = resolveAny(sim, inc, c.used);
    return inc !== null && id !== null && inc.used.has(id);
  }
  if ('chose' in c) {
    return inc !== null && inc.chose === c.chose;
  }
  if ('available' in c) {
    const id = resolveActor(sim, inc, c.available);
    const a = id ? sim.actors.get(id) : undefined;
    return !!a && (a.reservedBy === null || a.reservedBy === inc?.uid);
  }
  if ('missionPhase' in c) {
    const m = sim.running.find((r) => r.slot === 'mission');
    return !!m && m.stageId === c.missionPhase;
  }
  if ('noMajor' in c) {
    return !sim.running.some((r) => r.slot === 'major');
  }
  if ('incidentDone' in c) {
    return sim.completed.some((r) => r.id === c.incidentDone);
  }
  if ('incidentActive' in c) {
    return sim.running.some((r) => r.def.id === c.incidentActive);
  }
  if ('roll' in c) {
    if (!inc) {
      return false;
    }
    const cached = inc.rolls.get(c);
    if (cached !== undefined) {
      return cached;
    }
    const v = sim.rngRolls.chance(c.roll);
    inc.rolls.set(c, v);
    return v;
  }
  if ('runAtLeast' in c) {
    return sim.day >= c.runAtLeast;
  }
  if ('catchable' in c) {
    const t = resolveTarget(sim, inc, c.catchable);
    return t !== null && dist(sim.player.pos, t) <= sim.tune.catchRadius;
  }
  return false;
}

/** All refs a condition waits on with `used`, resolved to ids (prompt highlighting, talk routing). */
export function usedRefs(sim: Sim, inc: RunningIncident, c: Cond, out: Set<string>): void {
  if ('all' in c) {
    c.all.forEach((x) => usedRefs(sim, inc, x, out));
  } else if ('any' in c) {
    c.any.forEach((x) => usedRefs(sim, inc, x, out));
  } else if ('not' in c) {
    usedRefs(sim, inc, c.not, out);
  } else if ('used' in c) {
    const id = resolveAny(sim, inc, c.used);
    if (id) {
      out.add(id);
    }
  }
}

// ------------------------------------------------------------------ actions

export function pickLine(sim: Sim, lines: Lines): string {
  if (typeof lines === 'string') {
    return lines;
  }
  if (lines.length === 1) {
    return lines[0]!;
  }
  const last = sim.lastLine.get(lines);
  let options = lines.filter((l) => l !== last);
  if (options.length === 0) {
    options = [...lines];
  }
  const line = sim.rngLines.pick(options);
  sim.lastLine.set(lines, line);
  return line;
}

export function runActions(sim: Sim, inc: RunningIncident | null, actions: readonly Action[] | undefined): void {
  if (!actions) {
    return;
  }
  for (const a of actions) {
    runAction(sim, inc, a);
  }
}

function source(inc: RunningIncident | null): string {
  return inc ? inc.def.id : 'world';
}

export function runAction(sim: Sim, inc: RunningIncident | null, a: Action): void {
  if ('say' in a) {
    const id = resolveActor(sim, inc, a.say);
    if (id) {
      sim.say(id, pickLine(sim, a.line), a.dur);
    }
    return;
  }
  if ('caption' in a) {
    sim.caption(pickLine(sim, a.caption), a.dur);
    return;
  }
  if ('emote' in a) {
    const id = resolveActor(sim, inc, a.emote);
    if (id) {
      sim.emit({ type: 'emote', actor: id, emote: a.icon });
    }
    return;
  }
  if ('move' in a) {
    const id = resolveActor(sim, inc, a.move);
    const to = resolveTarget(sim, inc, a.to);
    if (id && to) {
      const dest = a.offset ? { x: to.x + a.offset.x, z: to.z + a.offset.z } : to;
      sim.orderGoto(id, dest, a.style ?? 'walk');
    }
    return;
  }
  if ('follow' in a) {
    const id = resolveActor(sim, inc, a.follow);
    if (id) {
      const target = a.target;
      sim.orderFollow(id, () => resolveTarget(sim, inc, target), a.style ?? 'run', a.keep ?? 1.2);
    }
    return;
  }
  if ('route' in a) {
    const id = resolveActor(sim, inc, a.route);
    if (id) {
      const via = a.via.map((v) => (typeof v === 'string' ? { ...SPOTS[v] } : { ...v }));
      sim.orderRoute(id, via, a.style ?? 'run', a.pauses ?? 0);
    }
    return;
  }
  if ('stop' in a) {
    const id = resolveActor(sim, inc, a.stop);
    if (id) {
      sim.orderStop(id);
    }
    return;
  }
  if ('face' in a) {
    const id = resolveActor(sim, inc, a.face);
    const to = resolveTarget(sim, inc, a.target);
    if (id && to) {
      sim.face(id, to);
    }
    return;
  }
  if ('anim' in a) {
    const id = resolveActor(sim, inc, a.anim);
    if (id) {
      sim.setAnim(id, a.play, a.dur);
    }
    return;
  }
  if ('setProp' in a) {
    const id = resolveProp(sim, inc, a.setProp);
    if (id) {
      sim.setPropState(id, a.state, source(inc));
    }
    return;
  }
  if ('give' in a) {
    const id = resolveProp(sim, inc, a.give);
    if (!id) {
      return;
    }
    const to = a.to === 'player' || a.to === 'nobody' ? a.to : resolveActor(sim, inc, a.to);
    if (to) {
      const at = a.at ? resolveTarget(sim, inc, a.at) : null;
      sim.giveProp(id, to, at);
    }
    return;
  }
  if ('place' in a) {
    const id = resolveProp(sim, inc, a.place);
    const at = resolveTarget(sim, inc, a.at);
    if (id && at) {
      sim.placeProp(id, a.offset ? { x: at.x + a.offset.x, z: at.z + a.offset.z } : at, a.y ?? 0);
    }
    return;
  }
  if ('launch' in a) {
    const id = resolveProp(sim, inc, a.launch);
    const to = resolveTarget(sim, inc, a.to);
    if (id && to) {
      sim.launchProp(id, a.offset ? { x: to.x + a.offset.x, z: to.z + a.offset.z } : to, a.height, a.dur, a.landY ?? 0);
    }
    return;
  }
  if ('hop' in a) {
    const id = resolveActor(sim, inc, a.hop);
    const to = resolveTarget(sim, inc, a.to);
    if (id && to) {
      sim.hopActor(id, to, a.height, a.dur);
    }
    return;
  }
  if ('fact' in a) {
    sim.ledger.record(sim.t, a.fact, a.value ?? true, source(inc));
    return;
  }
  if ('bump' in a) {
    sim.ledger.bump(sim.t, a.bump, a.by ?? 1, source(inc));
    return;
  }
  if ('memory' in a) {
    sim.remember(a.memory, a.value ?? true, source(inc));
    return;
  }
  if ('affinity' in a) {
    const id = resolveActor(sim, inc, a.affinity);
    if (id) {
      sim.addAffinity(id, a.by, source(inc));
    }
    return;
  }
  if ('hoaRule' in a) {
    sim.addHoaRule(a.hoaRule, a.text, source(inc));
    return;
  }
  if ('chaos' in a) {
    sim.addChaos(a.chaos, source(inc));
    return;
  }
  if ('objective' in a) {
    sim.setObjective(inc ? inc.uid : 'world', a.objective, a.target ?? null, inc);
    return;
  }
  if ('choices' in a) {
    const from = a.from ? resolveActor(sim, inc, a.from) : null;
    sim.offerChoices(inc ? inc.uid : 'world', from, a.choices);
    return;
  }
  if ('fx' in a) {
    const at = resolveTarget(sim, inc, a.at);
    if (at) {
      sim.emit({ type: 'fx', kind: a.fx, at, y: 0, dur: a.dur ?? 1.5, r: a.r ?? 1 });
    }
    return;
  }
  if ('marker' in a) {
    const at = resolveTarget(sim, inc, a.marker);
    if (at) {
      sim.emit({ type: 'fx', kind: 'landing', at, y: 0, dur: a.dur, r: sim.tune.catchRadius });
    }
    return;
  }
  if ('sound' in a) {
    sim.emit({ type: 'sound', id: a.sound, at: a.at ? resolveTarget(sim, inc, a.at) : null });
    return;
  }
  if ('stun' in a) {
    sim.stunPlayer(a.stun, a.dur);
    return;
  }
  if ('request' in a) {
    sim.director.request(a.request, inc, a.fallback ?? null);
    return;
  }
  if ('recruit' in a) {
    if (inc) {
      const id = resolveActor(sim, inc, a.recruit);
      if (id) {
        sim.reserveActor(inc, id, a.as ?? a.recruit);
      }
    }
    return;
  }
  if ('release' in a) {
    if (inc) {
      const id = resolveActor(sim, inc, a.release);
      if (id) {
        sim.releaseActor(inc, id);
      }
    }
    return;
  }
  if ('if' in a) {
    runActions(sim, inc, evalCond(sim, inc, a.if) ? a.then : a.else);
    return;
  }
  if ('oneOf' in a) {
    if (a.oneOf.length > 0) {
      runActions(sim, inc, sim.rngRolls.pick(a.oneOf));
    }
    return;
  }
  if ('outcome' in a) {
    if (inc) {
      inc.outcome = a.outcome;
    }
    sim.ledger.record(sim.t, `outcome.${inc ? inc.def.id : 'world'}`, a.outcome, source(inc));
    return;
  }
  if ('award' in a) {
    sim.addAward(a.award, a.text, source(inc));
    return;
  }
  if ('headline' in a) {
    sim.ledger.record(sim.t, `headline_hint.${a.headline}`, true, source(inc));
  }
}

// ------------------------------------------------------------------ stepping

export function timeoutSeconds(sim: Sim, stage: Stage): number {
  if (!stage.timeout) {
    return Infinity;
  }
  // Reaction windows stretch on EASY and shrink on HARD. Only short "beat the clock" windows
  // (< 20 s) scale; long safety timeouts stay put.
  return stage.timeout.sec < 20 ? stage.timeout.sec * sim.tune.window : stage.timeout.sec;
}

export function enterStage(sim: Sim, inc: RunningIncident, stageId: string): void {
  const stage = inc.def.stages[stageId];
  if (!stage) {
    // Validation makes this unreachable; still never hang on bad data.
    sim.trace(inc.def.id, `missing stage ${stageId}; ending`);
    inc.ending = true;
    inc.lingerUntil = sim.t;
    return;
  }
  inc.stageId = stageId;
  inc.stageT0 = sim.t;
  inc.used.clear();
  inc.chose = null;
  inc.rolls = new WeakMap();
  sim.clearChoicesOwnedBy(inc.uid);
  sim.trace(inc.def.id, `stage ${stageId} (${stage.beat})`);
  runActions(sim, inc, stage.do);
  if (stage.end) {
    // The punchline is landing: stop pointing the player at the problem.
    sim.setObjective(inc.uid, null, null, inc);
    inc.ending = true;
    inc.lingerUntil = sim.t + (stage.linger ?? 1.5);
  }
}

export function stepIncident(sim: Sim, inc: RunningIncident): void {
  if (inc.ending) {
    if (sim.t >= inc.lingerUntil) {
      sim.finishIncident(inc);
    }
    return;
  }
  if (!inc.fellBack && sim.t - inc.t0 > inc.def.maxDuration) {
    inc.fellBack = true;
    sim.trace(inc.def.id, 'hard timeout → fallback');
    enterStage(sim, inc, inc.def.fallback);
    return;
  }
  const stage = inc.def.stages[inc.stageId];
  if (!stage) {
    enterStage(sim, inc, inc.def.fallback);
    return;
  }
  for (const tr of stage.go ?? []) {
    if (evalCond(sim, inc, tr.when)) {
      runActions(sim, inc, tr.do);
      enterStage(sim, inc, tr.to);
      return;
    }
  }
  if (stage.timeout && sim.t - inc.stageT0 >= timeoutSeconds(sim, stage)) {
    runActions(sim, inc, stage.timeout.do);
    enterStage(sim, inc, stage.timeout.to);
  }
}

/** Stage prompt hints: which ids the current stage is waiting for the player to use. */
export function waitingOn(sim: Sim, inc: RunningIncident): Set<string> {
  const out = new Set<string>();
  const stage = inc.def.stages[inc.stageId];
  if (!stage || inc.ending) {
    return out;
  }
  for (const tr of stage.go ?? []) {
    usedRefs(sim, inc, tr.when, out);
  }
  return out;
}

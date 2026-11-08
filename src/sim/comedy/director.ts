/**
 * The Procedural Comedy Director.
 *
 * Chooses WHICH authored incident happens WHEN, from world state: who is free, which props
 * are where, what the player is near, how chaotic the day already is, what happened
 * recently, and which follow-ups make comedic sense. It never invents events; it assembles
 * authored, reusable beats so that a cause is always visible before its effect.
 *
 * Guarantees (blueprint 03): max 1 major incident + 2 ambient gags at once; no incident
 * starts without reserving its actors and props; no repeated punchline within the last 3
 * completed incidents; a quiet period after every major payoff; seeded selection.
 */
import type { Sim } from '../sim.js';
import { dist } from '../core/vec.js';
import { evalCond, resolveTarget, type RunningIncident, type Slot } from './scenario.js';
import type { IncidentDef } from './types.js';

export const MAX_AMBIENT = 2;
export const QUIET_AFTER_MAJOR = 9;
export const PUNCHLINE_MEMORY = 3;

export interface Candidate {
  id: string;
  ok: boolean;
  reason: string;
  score: number;
}

export interface Decision {
  t: number;
  slot: Slot | 'request' | 'finale';
  picked: string | null;
  candidates: Candidate[];
}

export class Director {
  public nextAmbientAt = 24;
  public nextMajorAt = 70;
  public decisions: Decision[] = [];
  private acc = 0;

  public constructor(private readonly sim: Sim) {}

  public get lastDecision(): Decision | null {
    return this.decisions[this.decisions.length - 1] ?? null;
  }

  /** Called every sim tick; makes decisions about once a second. */
  public tick(dt: number): void {
    this.acc += dt;
    if (this.acc < 1) {
      return;
    }
    this.acc = 0;
    const sim = this.sim;
    if (sim.dayOver) {
      return;
    }

    // Chaos finale preempts everything once the current major wraps up.
    if (sim.chaos >= 100 && !sim.running.some((r) => r.def.kind === 'finale') && !this.majorRunning()) {
      const finale = sim.incidents.filter((d) => d.kind === 'finale');
      const pick = this.choose('finale', finale, null, true);
      if (pick) {
        sim.startIncident(pick, 'major', null);
        return;
      }
    }

    if (this.ambientCount() < MAX_AMBIENT && sim.t >= this.nextAmbientAt) {
      const pool = sim.incidents.filter((d) => d.kind === 'ambient' && !d.requestOnly);
      const pick = this.choose('ambient', pool, null, false);
      if (pick) {
        sim.startIncident(pick, 'ambient', null);
      }
      // Livelier neighbourhood at higher chaos, but never a wall of gags.
      const base = sim.rngDirector.range(8, 15);
      this.nextAmbientAt = sim.t + base / (1 + sim.chaos / 120);
    }

    if (!this.majorRunning() && sim.t >= sim.quietUntil && sim.t >= this.nextMajorAt && !this.missionBusy()) {
      const pool = sim.incidents.filter((d) => d.kind === 'major' && !d.requestOnly);
      const pick = this.choose('major', pool, null, false);
      if (pick) {
        sim.startIncident(pick, 'major', null);
      }
      this.nextMajorAt = sim.t + sim.rngDirector.range(70, 110) / (1 + sim.chaos / 100);
    }
  }

  /**
   * A mission asks for a complication from a pool. Prefers eligible ones by score; if none is
   * eligible, starts `fallback` if its actors/props can be reserved. Returns the started id.
   */
  public request(pool: readonly string[], parent: RunningIncident | null, fallback: string | null): string | null {
    const sim = this.sim;
    if (this.majorRunning()) {
      sim.trace('director', `request [${pool.join(', ')}] deferred: a major incident is running`);
      sim.pendingRequests.push({ pool: [...pool], parent: parent?.uid ?? null, fallback });
      return null;
    }
    const defs = pool.map((id) => sim.incidentById(id)).filter((d): d is IncidentDef => !!d);
    this.preemptAmbientsFor(defs);
    const pick = this.choose('request', defs, parent, true);
    if (pick) {
      sim.startIncident(pick, 'major', parent);
      return pick.id;
    }
    if (fallback) {
      const fb = sim.incidentById(fallback);
      if (fb && this.reservable(fb, parent)) {
        sim.trace('director', `request fell back to ${fallback}`);
        sim.startIncident(fb, 'major', parent);
        return fb.id;
      }
    }
    sim.trace('director', `request [${pool.join(', ')}] found nothing eligible`);
    return null;
  }

  /**
   * The favour outranks background gags: if an ambient bit is holding an actor or prop a
   * requested complication needs, cut the gag short (it simply ends; nothing is recorded).
   */
  private preemptAmbientsFor(defs: readonly IncidentDef[]): void {
    const sim = this.sim;
    const needed = new Set<string>();
    for (const d of defs) {
      for (const cand of Object.values(d.cast)) {
        for (const id of typeof cand === 'string' ? [cand] : cand) {
          needed.add(`a:${id}`);
        }
      }
      for (const id of Object.values(d.props ?? {})) {
        needed.add(`p:${id}`);
      }
    }
    for (const inc of sim.running.filter((r) => r.slot === 'ambient')) {
      if ([...inc.reserved.keys()].some((k) => needed.has(k))) {
        sim.trace('director', `preempted ambient ${inc.def.id} for a mission complication`);
        sim.finishIncident(inc);
      }
    }
  }

  public majorRunning(): boolean {
    return this.sim.running.some((r) => r.slot === 'major');
  }

  private ambientCount(): number {
    return this.sim.running.filter((r) => r.slot === 'ambient').length;
  }

  /** The mission is mid-complication: don't pile a spontaneous major on top of it. */
  private missionBusy(): boolean {
    const m = this.sim.running.find((r) => r.slot === 'mission');
    if (!m) {
      return false;
    }
    const beat = m.def.stages[m.stageId]?.beat;
    return beat === 'complication' || beat === 'escalation' || beat === 'payoff';
  }

  /** Eligibility with a human-readable rejection reason (debug panel, tests). */
  public check(def: IncidentDef, parent: RunningIncident | null, viaRequest: boolean): Candidate {
    const sim = this.sim;
    const no = (reason: string): Candidate => ({ id: def.id, ok: false, reason, score: 0 });
    if (sim.running.some((r) => r.def.id === def.id)) {
      return no('already running');
    }
    if (def.requestOnly && !viaRequest) {
      return no('request-only');
    }
    const cd = sim.cooldowns.get(def.id);
    if (cd !== undefined && sim.t < cd) {
      return no(`cooldown ${(cd - sim.t).toFixed(0)}s`);
    }
    if (def.once && sim.completed.some((c) => c.id === def.id)) {
      return no('once per day');
    }
    const chaosMin = def.chaos?.min ?? 0;
    const chaosMax = def.chaos?.max ?? 101;
    if (sim.chaos < chaosMin || sim.chaos >= chaosMax) {
      return no(`chaos ${sim.chaos.toFixed(0)} outside [${chaosMin}, ${chaosMax})`);
    }
    const punch = def.punchline ?? def.id;
    const recent = sim.completed.slice(-PUNCHLINE_MEMORY).map((c) => c.punchline);
    if (!viaRequest && recent.includes(punch)) {
      return no('punchline used recently');
    }
    if (def.requires && !evalCond(sim, parent, def.requires)) {
      return no('preconditions not met');
    }
    if (!this.reservable(def, parent)) {
      return no('actors/props busy');
    }
    return { id: def.id, ok: true, reason: 'eligible', score: this.score(def) };
  }

  public reservable(def: IncidentDef, parent: RunningIncident | null): boolean {
    const sim = this.sim;
    const free = (owner: string | null) => owner === null || (parent !== null && owner === parent.uid);
    for (const cand of Object.values(def.cast)) {
      const list = typeof cand === 'string' ? [cand] : cand;
      const ok = list.some((id) => {
        const a = sim.actors.get(id);
        return !!a && free(a.reservedBy) && a.flight === null;
      });
      if (!ok) {
        return false;
      }
    }
    for (const id of Object.values(def.props ?? {})) {
      const p = sim.props.get(id);
      if (!p || !free(p.reservedBy)) {
        return false;
      }
    }
    return true;
  }

  public score(def: IncidentDef): number {
    const sim = this.sim;
    let s = def.weight;
    // Proximity: prefer comedy the player can actually see.
    if (def.near) {
      const t = resolveTarget(sim, null, def.near.target);
      s *= t && dist(t, sim.player.pos) <= def.near.r ? 1.8 : 0.55;
    }
    // Variety: anything already seen today is less likely.
    if (sim.completed.some((c) => c.id === def.id)) {
      s *= 0.35;
    }
    // Cross-day variety: whatever happened yesterday is less likely today.
    if (sim.memory.get(`recent.${def.id}`) === sim.day - 1) {
      s *= 0.4;
    }
    // Comedic follow-through: last incident suggested this kind of follow-up.
    const last = sim.completed[sim.completed.length - 1];
    if (last) {
      const lastDef = sim.incidentById(last.id);
      if (lastDef?.compatibleNext?.some((tag) => def.tags.includes(tag))) {
        s *= 1.5;
      }
    }
    // Escalation: bigger set-pieces get likelier as the day gets wilder.
    if (def.tags.includes('big')) {
      s *= 0.6 + sim.chaos / 60;
    }
    // Personality: neighbours who like you more show up to help more.
    for (const cand of Object.values(def.cast)) {
      const id = typeof cand === 'string' ? cand : cand[0];
      if (id) {
        s *= 1 + Math.max(-0.3, Math.min(0.5, (sim.affinity.get(id) ?? 0) * 0.05));
      }
    }
    return Math.max(0.0001, s);
  }

  private choose(
    slot: Decision['slot'],
    pool: readonly IncidentDef[],
    parent: RunningIncident | null,
    viaRequest: boolean,
  ): IncidentDef | null {
    const sim = this.sim;
    const candidates = pool.map((d) => this.check(d, parent, viaRequest));
    const eligible = candidates.filter((c) => c.ok);
    const picked = sim.rngDirector.weighted(eligible, (c) => c.score);
    this.decisions.push({ t: sim.t, slot, picked: picked?.id ?? null, candidates });
    if (this.decisions.length > 40) {
      this.decisions.shift();
    }
    if (picked) {
      sim.trace('director', `${slot}: picked ${picked.id} from ${eligible.length}/${candidates.length}`);
    }
    return picked ? sim.incidentById(picked.id) ?? null : null;
  }
}

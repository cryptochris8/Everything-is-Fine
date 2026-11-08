/**
 * Content validation, run at startup and in tests. Catches the classes of bug that would
 * otherwise only show up mid-play: a typo'd stage, a role nobody declared, a stage with no
 * way out, a news story that could report something that didn't happen.
 */
import { ACTOR_BY_ID } from '../content/cast.js';
import type { NewsTemplate } from '../content/news.js';
import { PROP_BY_ID } from '../content/props.js';
import { SPOTS, zoneById } from '../world/layout.js';
import type { Action, Cond, IncidentDef, TargetRef } from './types.js';

export interface ValidationIssue {
  incident: string;
  where: string;
  problem: string;
}

export function validateContent(incidents: readonly IncidentDef[], news: readonly NewsTemplate[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const def of incidents) {
    if (ids.has(def.id)) {
      issues.push({ incident: def.id, where: 'id', problem: 'duplicate incident id' });
    }
    ids.add(def.id);
  }
  for (const def of incidents) {
    validateIncident(def, ids, incidents, issues);
  }
  for (const n of news) {
    if (!factOnly(n.when)) {
      issues.push({ incident: `news:${n.id}`, where: 'when', problem: 'news templates may only use fact / always / all / any / not conditions' });
    }
    if (n.headline.length === 0 || n.body.length === 0) {
      issues.push({ incident: `news:${n.id}`, where: 'text', problem: 'empty headline or body' });
    }
  }
  return issues;
}

function factOnly(c: Cond): boolean {
  if ('all' in c) {
    return c.all.every(factOnly);
  }
  if ('any' in c) {
    return c.any.every(factOnly);
  }
  if ('not' in c) {
    return factOnly(c.not);
  }
  return 'fact' in c || 'always' in c;
}

function validateIncident(def: IncidentDef, ids: Set<string>, all: readonly IncidentDef[], issues: ValidationIssue[]): void {
  const err = (where: string, problem: string) => issues.push({ incident: def.id, where, problem });
  const stages = def.stages;
  const stageIds = Object.keys(stages);
  if (!stages[def.start]) {
    err('start', `start stage "${def.start}" missing`);
  }
  if (!stages[def.fallback]) {
    err('fallback', `fallback stage "${def.fallback}" missing`);
  }
  if (!stageIds.some((s) => stages[s]!.end)) {
    err('stages', 'no terminal (end) stage');
  }

  // Roles: declared cast/props plus anything recruited.
  const actorRoles = new Set(Object.keys(def.cast));
  const propRoles = new Set(Object.keys(def.props ?? {}));
  for (const [role, cand] of Object.entries(def.cast)) {
    for (const id of typeof cand === 'string' ? [cand] : cand) {
      if (!ACTOR_BY_ID.has(id)) {
        err(`cast.${role}`, `unknown actor "${id}"`);
      }
    }
  }
  for (const [role, id] of Object.entries(def.props ?? {})) {
    if (!PROP_BY_ID.has(id)) {
      err(`props.${role}`, `unknown prop "${id}"`);
    }
  }
  const collectRecruits = (actions: readonly Action[] | undefined): void => {
    for (const a of actions ?? []) {
      if ('recruit' in a) {
        actorRoles.add(a.as ?? a.recruit);
      }
      if ('if' in a) {
        collectRecruits(a.then);
        collectRecruits(a.else);
      }
      if ('oneOf' in a) {
        a.oneOf.forEach(collectRecruits);
      }
    }
  };
  for (const s of Object.values(stages)) {
    collectRecruits(s.do);
    s.go?.forEach((t) => collectRecruits(t.do));
    collectRecruits(s.timeout?.do);
  }

  const isActor = (r: string) => actorRoles.has(r) || ACTOR_BY_ID.has(r);
  const isProp = (r: string) => propRoles.has(r) || PROP_BY_ID.has(r);
  const checkTarget = (where: string, t: TargetRef) => {
    if ('spot' in t && !SPOTS[t.spot]) {
      err(where, `unknown spot "${t.spot}"`);
    } else if ('zone' in t && !zoneById(t.zone)) {
      err(where, `unknown zone "${t.zone}"`);
    } else if ('actor' in t && !isActor(t.actor)) {
      err(where, `unknown actor/role "${t.actor}"`);
    } else if ('prop' in t && !isProp(t.prop)) {
      err(where, `unknown prop/role "${t.prop}"`);
    }
  };
  const checkCond = (where: string, c: Cond): void => {
    if ('all' in c) {
      c.all.forEach((x, i) => checkCond(`${where}.all[${i}]`, x));
    } else if ('any' in c) {
      c.any.forEach((x, i) => checkCond(`${where}.any[${i}]`, x));
    } else if ('not' in c) {
      checkCond(`${where}.not`, c.not);
    } else if ('affinity' in c && !isActor(c.affinity)) {
      err(where, `unknown actor/role "${c.affinity}"`);
    } else if ('propState' in c) {
      if (!isProp(c.propState)) {
        err(where, `unknown prop/role "${c.propState}"`);
      } else {
        const id = def.props?.[c.propState] ?? c.propState;
        const pd = PROP_BY_ID.get(id);
        for (const st of typeof c.is === 'string' ? [c.is] : c.is) {
          if (pd && !pd.states.includes(st)) {
            err(where, `prop "${id}" has no state "${st}"`);
          }
        }
      }
    } else if ('heldBy' in c) {
      if (!isProp(c.heldBy)) {
        err(where, `unknown prop/role "${c.heldBy}"`);
      }
      if (c.by !== 'player' && c.by !== 'nobody' && !isActor(c.by)) {
        err(where, `unknown holder "${c.by}"`);
      }
    } else if ('playerNear' in c) {
      checkTarget(where, c.playerNear);
    } else if ('actorNear' in c) {
      if (!isActor(c.actorNear)) {
        err(where, `unknown actor/role "${c.actorNear}"`);
      }
      checkTarget(where, c.target);
    } else if ('propNear' in c) {
      if (!isProp(c.propNear)) {
        err(where, `unknown prop/role "${c.propNear}"`);
      }
      checkTarget(where, c.target);
    } else if ('propInZone' in c || 'actorInZone' in c) {
      const zone = 'propInZone' in c ? c.zone : (c as { zone: string }).zone;
      if (!zoneById(zone)) {
        err(where, `unknown zone "${zone}"`);
      }
    } else if ('arrived' in c && !isActor(c.arrived)) {
      err(where, `unknown actor/role "${c.arrived}"`);
    } else if ('used' in c && !isActor(c.used) && !isProp(c.used)) {
      err(where, `unknown actor/prop/role "${c.used}"`);
    } else if ('available' in c && !isActor(c.available)) {
      err(where, `unknown actor/role "${c.available}"`);
    } else if (('incidentDone' in c || 'incidentActive' in c) && !ids.has('incidentDone' in c ? c.incidentDone : (c as { incidentActive: string }).incidentActive)) {
      err(where, 'unknown incident id');
    } else if ('missionPhase' in c) {
      const missions = all.filter((d) => d.kind === 'mission');
      if (!missions.some((m) => m.stages[c.missionPhase])) {
        err(where, `no mission has stage "${c.missionPhase}"`);
      }
    } else if ('catchable' in c) {
      checkTarget(where, c.catchable);
    }
  };
  const checkActions = (where: string, actions: readonly Action[] | undefined): void => {
    (actions ?? []).forEach((a, i) => {
      const w = `${where}[${i}]`;
      const actorKeys = ['say', 'emote', 'move', 'follow', 'route', 'stop', 'face', 'anim', 'hop', 'affinity'] as const;
      for (const k of actorKeys) {
        if (k in a) {
          const ref = (a as Record<string, unknown>)[k];
          if (typeof ref === 'string' && !isActor(ref)) {
            err(w, `${k}: unknown actor/role "${ref}"`);
          }
        }
      }
      if ('say' in a || 'caption' in a) {
        const lines = 'say' in a ? a.line : a.caption;
        if ((typeof lines === 'string' && lines.trim() === '') || (typeof lines !== 'string' && lines.length === 0)) {
          err(w, 'empty line');
        }
      }
      for (const k of ['setProp', 'give', 'place', 'launch'] as const) {
        if (k in a) {
          const ref = (a as Record<string, unknown>)[k] as string;
          if (!isProp(ref)) {
            err(w, `${k}: unknown prop/role "${ref}"`);
          }
        }
      }
      if ('setProp' in a) {
        const id = def.props?.[a.setProp] ?? a.setProp;
        const pd = PROP_BY_ID.get(id);
        if (pd && !pd.states.includes(a.state)) {
          err(w, `prop "${id}" has no state "${a.state}"`);
        }
      }
      if ('give' in a && a.to !== 'player' && a.to !== 'nobody' && !isActor(a.to)) {
        err(w, `give: unknown recipient "${a.to}"`);
      }
      if ('move' in a) {
        checkTarget(w, a.to);
      }
      if ('follow' in a) {
        checkTarget(w, a.target);
      }
      if ('face' in a) {
        checkTarget(w, a.target);
      }
      if ('place' in a) {
        checkTarget(w, a.at);
      }
      if ('launch' in a) {
        checkTarget(w, a.to);
      }
      if ('hop' in a) {
        checkTarget(w, a.to);
      }
      if ('fx' in a) {
        checkTarget(w, a.at);
      }
      if ('marker' in a) {
        checkTarget(w, a.marker);
      }
      if ('give' in a && a.at) {
        checkTarget(w, a.at);
      }
      if ('objective' in a && a.target) {
        checkTarget(w, a.target);
      }
      if ('route' in a) {
        for (const v of a.via) {
          if (typeof v === 'string' && !SPOTS[v]) {
            err(w, `route: unknown spot "${v}"`);
          }
        }
      }
      if ('request' in a) {
        for (const id of [...a.request, ...(a.fallback ? [a.fallback] : [])]) {
          const target = all.find((d) => d.id === id);
          if (!target) {
            err(w, `request: unknown incident "${id}"`);
          } else if (target.kind !== 'major') {
            err(w, `request: "${id}" is not a major incident`);
          }
        }
      }
      if ('if' in a) {
        checkCond(`${w}.if`, a.if);
        checkActions(`${w}.then`, a.then);
        checkActions(`${w}.else`, a.else);
      }
      if ('oneOf' in a) {
        a.oneOf.forEach((list, j) => checkActions(`${w}.oneOf[${j}]`, list));
      }
      if ('choices' in a && (a.choices.length < 2 || a.choices.length > 4)) {
        err(w, 'choices must offer 2–4 options');
      }
    });
  };

  if (def.requires) {
    checkCond('requires', def.requires);
  }
  if (def.near) {
    checkTarget('near', def.near.target);
  }
  for (const [sid, s] of Object.entries(stages)) {
    checkActions(`${sid}.do`, s.do);
    if (!s.end && !s.timeout) {
      err(sid, 'non-terminal stage needs a timeout (every incident must always end)');
    }
    if (s.end && (s.go?.length || s.timeout)) {
      err(sid, 'terminal stage should not have transitions');
    }
    s.go?.forEach((t, i) => {
      if (!stages[t.to]) {
        err(`${sid}.go[${i}]`, `unknown stage "${t.to}"`);
      }
      checkCond(`${sid}.go[${i}].when`, t.when);
      checkActions(`${sid}.go[${i}].do`, t.do);
    });
    if (s.timeout) {
      if (!stages[s.timeout.to]) {
        err(`${sid}.timeout`, `unknown stage "${s.timeout.to}"`);
      }
      if (!(s.timeout.sec >= 0)) {
        err(`${sid}.timeout`, 'timeout must be >= 0');
      }
      checkActions(`${sid}.timeout.do`, s.timeout.do);
    }
  }

  // Following timeouts alone from any stage must reach an end stage (no timeout cycles).
  for (const sid of stageIds) {
    const seen = new Set<string>();
    let cur: string | undefined = sid;
    while (cur && stages[cur] && !stages[cur]!.end) {
      if (seen.has(cur)) {
        err(sid, `timeout chain loops (${[...seen].join(' → ')})`);
        break;
      }
      seen.add(cur);
      cur = stages[cur]!.timeout?.to;
    }
  }
}

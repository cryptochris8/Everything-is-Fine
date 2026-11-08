# Procedural Comedy Director — Design Specification

## Goal
Create **comedy from structured causality**, not a pure random event spawner. Events must be compatible with people, places, props, task state, world state, and previous history. The player must be able to perceive why event B follows event A.

## Director inputs
- Mission ID, goal, current phase, location/nearby zones.
- Resident profiles (traits, routines, bonds, grudges, current availability).
- Environment: physical props, statuses, spatial constraints, active hazards.
- Player action/inaction, proximity, play pace, recent repeats.
- Chaos level; cooldowns; incident budget; last punchlines.
- Seeded pseudo-random state; saved event history.

## Content model (proposed schema; implement in actual project conventions)
```ts
type BeatKind = 'setup'|'complication'|'escalation'|'payoff'|'aftermath';
type Beat = {
  id: string;
  kind: BeatKind;
  tags: string[];
  requires: string[];        // predicates validated by engine
  forbids?: string[];
  effects: string[];         // explicit world-state changes
  participants?: string[];   // resident roles, not fixed actors
  props?: string[];
  priority?: number;
  cooldownSeconds?: number;
  compatibleNextTags?: string[];
  objectiveHook?: string;
  subtitles?: string[];      // pre-authored, parameterized lines
  failSafe?: string;
};
```
Don't use arbitrary code evaluation for requirements/effects. Implement a typed, sandboxed registry of predicates and actions. Validate content definitions at startup/build time.

## Incident lifecycle
`Eligible → Reserved → Setup → Trigger → Escalate (0–2) → Payoff → Aftermath → Cooldown`.

1. Gather eligible beats from world state.
2. Choose weighted selection based on thematic compatibility, variety, recent use, personality, geography, and chaos.
3. **Reserve required actors/props** so two incidents cannot commandeer the same grill at once.
4. Check spatial feasibility, player visibility and actor path.
5. Fire an unmistakable setup cue and a short reaction window.
6. Escalate only if preconditions still hold; adapt to what player does.
7. Terminate with payoff even if partial failure. Record event facts.
8. Release reservations; apply cooldown; schedule aftermath callback.

## Key constraints
- Maximum 1 major incident, 1–2 ambient micro-gags simultaneously in MVP.
- Avoid repeated exact punchlines within the last 3 completed incidents.
- Prevent impossible/circular dependencies and NPC conflicts.
- Prefer visible, nearby action instead of off-screen surprises; use an optional attention cue.
- Never erase player progress because of a random event.
- Hard timeouts, prop respawn bounds, actor recovery and event fallback.
- Respect a **quiet period** after big payoff for player comprehension.
- Generate deterministic results with `seed` plus logged player actions.
- No network LLM inference required at runtime: rely on data + rule system for speed, budget, moderation, and reliability.

## Comedy heuristics
- **Contrast:** official seriousness over trivial nonsense.
- **Confidence mismatch:** Randy is always sure he knows how to grill.
- **Rule of three:** two similar failures then a surprising twist; avoid formula fatigue.
- **Callbacks:** previous damage or favors alter future banter.
- **Escalation:** problems remain causally linked; bigger is not always funnier.
- **Visual readability:** player can tell what happened within two seconds.
- **Character consistency:** Granny's driving, Linda's rule obsession, Earl's inventions.

## Example state transitions
`BBQ_STARTED` + dog nearby + uncovered food → `DOG_STEALS_BURGERS`.
If player throws dog toy: dog drops burgers near sprinkler switch → `SPRINKLER_ON` possible.
If player enlists Granny: `GRANNY_CART_RESCUE` may lead to `FENCE_OPENS` and chickens escape.
If player secures burgers early: Randy's auto-flipper can misfire for a *different* payoff.
Record granular facts, e.g. `dog_stole_burgers=true`, `golf_cart_crashed=false`, so recap cannot hallucinate crash.

## Pseudocode
```ts
function tickDirector(world, mission, rng) {
  if (world.majorIncidentActive || world.inQuietPeriod) return;
  const eligible = beats.filter(b => predicatesPass(b, world, mission) &&
    reservationsAvailable(b, world) && !recentlyUsed(b.id, world.history));
  const beat = weightedPick(eligible, b => score(b, world, mission), rng);
  if (beat) beginIncidentWithReservations(beat, world);
}
```

## Debug features (must-have)
- Inspect seed and active incident.
- View event eligibility and rejection reasons.
- Trigger a known beat manually in development mode.
- Reproduce saved seed with action log.
- Timeline of effects and events, with source beat IDs.
- Track: incident completion rate, dead ends, variation, repeated gags, how often player notices payoff.

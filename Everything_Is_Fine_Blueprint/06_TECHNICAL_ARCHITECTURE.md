# Technical Architecture, Platform Discovery, and Integration

## First task: identify the actual supported runtime
**The Sandbox products and creation workflows differ.** Before implementing, inspect the repo and current official docs to identify which target is available (e.g., browser-compatible custom game experience, Sandbox Studio scripting workflow, Game Maker, or another distribution container). Verify supported language/runtime, scene import, physics, saving, audio, networking, packaging, and publishing constraints. Do not assume arbitrary Three.js code can be directly deployed inside every Sandbox experience. Treat any connection to existing AppalachAI assets or servers as optional until confirmed.

### Platform discovery checklist
- [ ] Repository contents, package manager, build scripts, language and engine identified.
- [ ] Official SDK/runtime versions and authoritative docs located.
- [ ] Creation/publishing path and technical restrictions confirmed.
- [ ] Script execution / physics / collision / animation / NPC pathfinding capabilities confirmed.
- [ ] Input (keyboard/mobile/controller) and UI capabilities confirmed.
- [ ] Persistence and external network requests confirmed or alternate design documented.
- [ ] Real platform build/run test completed.

If current repository has an engine, **prefer to work with existing working stack** rather than rewrite it. If no target SDK is installed or verified, build engine-agnostic pure TypeScript simulation as independently testable logic; defer renderer adapter choice until confirmed. Avoid building a fake Sandbox plugin.

## Recommended modular separation
```text
src/
  core/                 # domain state, deterministic RNG, clock, event bus
  comedy/               # beat schema, predicate/effect registry, director, scheduler
  content/              # event catalog, dialogue templates, personality configs
  npc/                  # schedules, finite-state behavior, reactions, relationships
  world/                # object states, interactive props, zones, persistence snapshots
  gameplay/             # mission states, interactions, goals, chaos meter, reward model
  presentation/         # camera, UI, captions, sound hooks, news recap
  adapters/             # actual verified engine/Sandbox integration
  debug/                # seed replay, event trace, simulation console
  tests/                # deterministic incident tests and regressions
```
Equivalent folder structure is fine if consistent with existing repo.

## State
- **WorldState:** prop/zone states, actor positions and reservations, chaos, time, active incidents.
- **NPCState:** affinity, mood, routine, memory flags, available dialogue.
- **MissionState:** goals, phase, outcomes, retries, history.
- **EventLedger:** immutable structured facts with timestamps, actor, prop, action, consequences.
- **SaveSnapshot:** versioned state + RNG seed + content version + time.

## Determinism
Use explicit PRNG, never ambient `Math.random()` within procedural selection. Log seed and player choices. An incident's result must depend on physics/actions; store authoritative outcomes, not imagined headline text. Provide replay or headless deterministic simulation tests.

## Performance
- Object pooling for frequent reactions and particle effects.
- Limited active NPC/incident counts; small vicinity-based simulation bubble.
- Simplified collision/physics and LOD as supported.
- Avoid runtime LLM calls and costly procedural asset generation in real-time gameplay.
- Modest asset budget; measurable frame targets on actual platform.

## Safety, quality, and security
- Data-driven predicates/actions from whitelisted registries; **never eval** content strings.
- Sanitize any player text; ideally no free-text in MVP.
- Guard saves and client state; if multiplayer or rewards later, move authoritative validation server-side.
- Version save format; safe reset and migration path.
- Original or properly licensed assets/music; no copyrighted characters/trademarks without permission.
- Do not incorporate payment, crypto/NFT or account integrations into MVP without separate explicit decision.

## Reporting after inspection
Write `PLATFORM_FINDINGS.md` with **confirmed facts and linked documentation**, decisions, unsupported assumptions, known blockers, and fallback implementation plan. Keep independent game logic portable wherever possible.

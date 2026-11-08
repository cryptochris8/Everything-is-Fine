# Build Plan and Acceptance Gates

## Milestone 0: Inspect and prove runtime
Inspect project, dependencies, and target platform SDK. Make build run. Add `PLATFORM_FINDINGS.md` and `PROJECT_STATUS.md`.

**Done when:** developer can start game and see a rendered neighborhood scene, with build instructions reproducible from fresh checkout.

## Milestone 1: 30-second fun test
Playable player controls in one street, a clear welcome sign, one ambient absurd visual gag (trampoline surprise) and a neighbor asking for help. Include basic collisions, interaction prompt, camera, subtitles.

**Done when:** a new player can move, understand the joke and interact with Randy in less than 30 seconds.

## Milestone 2: Real physical interaction
Create representative props: charcoal bag, grill, burger platter, sprinkler, dog, dog toy, gate. Implement carrying/placing and simple states with feedback.

**Done when:** task works without requiring cutscenes; props cannot soft-lock objective.

## Milestone 3: Randy's BBQ vertical mission
Complete first task with 3 candidate complications and 2+ meaningful outcomes, including success and playful failure. Add recovery from abandoned goals and blocked actors.

**Done when:** can finish 3 seeded runs with different outcomes and understandable causes.

## Milestone 4: Procedural Comedy Director
Build typed beat catalog + precondition/effect registry + seeded selector + reservations, cooldowns, escalation bounds and debug overlay. Wire into mission; add 2–3 spontaneous ambient gags.

**Done when:** repeated runs vary while causal relationships remain valid; same seed/input repeats outcome.

## Milestone 5: Cast and memory
Add Granny Darlene, Linda, Uncle Earl, Big Randy behavior signatures, simple routines, relationship/memory flags, and at least 2 persistent callbacks from player actions.

**Done when:** NPC dialogue/world details reflect ledger facts from earlier runs.

## Milestone 6: Chaos and news
Add chaos meter with readable escalation and cool-off. Add news recap with 2–3 dynamically selected lines based **only on recorded facts** plus screenshot-friendly end card.

**Done when:** three differing playthroughs produce materially differing truthful recaps; chaos never creates unwinnable states.

## Milestone 7: Polish, optimize, package
Improve animation timing, original audio, accessibility, controls, loading, memory/performance, error recovery, and platform build/distribution procedure.

**Done when:** playtest checklist is green; no severe blocker; verified target platform artifact builds.

## Guardrails
- Don't build 30 houses or online multiplayer before milestones 1–4 feel fun.
- No rewrite simply to chase new tech.
- No external AI inference for runtime comedy.
- Keep content editable in data; no giant monolithic event script.
- Create working builds each milestone; validate in actual target runtime.

## First-session deliverables from Claude
1. Findings about real project and platform.
2. App running with an initial neighborhood.
3. Player movement and at least one absurd ambient beat.
4. `PROJECT_STATUS.md` with what works, how to run, blockers, immediate next steps.

If all can be done in one session, continue toward Randy's BBQ. Favor implementation over extensive back-and-forth.

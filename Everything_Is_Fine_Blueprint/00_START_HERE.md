# EVERYTHING IS FINE! — START HERE

**AppalachAI Studios | The Sandbox | Procedural comedy adventure**

## Mission for Claude Code
Build a **complete, playable vertical slice**, not a slideshow, speculative prototype, or planning-only exercise. The game is a colorful, welcoming suburban neighborhood in which the player is the relatively normal new resident and the rest of the world is delightfully absurd. The player tries to help neighbors; well-intentioned fixes create cascading comic disasters. **Failure should be funny rather than punitive.**

Read this entire package, then inspect the actual repository, runtime, and available SDK. Treat any technical claims in the documents as design targets until verified against installed tools and official platform docs. **Do not fabricate The Sandbox APIs, SDK availability, platform permissions, deployment mechanics, or engine capabilities.**

### Reading order
1. `01_CREATIVE_VISION.md`
2. `02_GAMEPLAY_AND_PLAYER_EXPERIENCE.md`
3. `03_PROCEDURAL_COMEDY_DIRECTOR.md`
4. `04_WORLD_CHARACTERS_AND_PROPS.md`
5. `05_CONTENT_EVENT_LIBRARY.md`
6. `06_TECHNICAL_ARCHITECTURE.md`
7. `07_VERTICAL_SLICE_AND_MILESTONES.md`
8. `08_TESTING_AND_QUALITY.md`
9. `09_CLAUDE_CODE_KICKOFF_PROMPT.md`

### Non-negotiable requirements
- Funny within the first 10–30 seconds of play.
- Player is an approachable, semi-normal participant, **not** a prankster or chaos villain.
- A readable, controllable character in a neighborhood with meaningful, immediate interactions.
- Causally connected comedy: setup → interruption → escalating complications → payoff → aftermath.
- Player agency during the comedy. Avoid long unskippable cutscenes.
- Deterministic seeded generation for debugging and reproducibility.
- Authored, reusable *rules* and beats, dynamically assembled—not random nonsense.
- NPC personalities, relationships, persistent consequences, and recurring jokes.
- Fun/failure-forward reward model; no harsh game-overs.
- A local-news recap of actual recorded events, not invented actions.
- Build the first playable slice *before* broad content expansion.

### Immediate implementation goal
One playable street, four memorable NPCs, a small interactive prop ecosystem, one mission (Big Randy's barbecue) with at least **three causally coherent variations**, spontaneous ambient incidents, chaos meter, persistent local memory, and a funny end-of-round recap. Exact scope may be adapted to verified platform capabilities; document any substitutions.

### Working agreement
Inspect project files and available tools first. Create a `PROJECT_STATUS.md` that tracks facts, assumptions, blockers, builds, tests, and next steps. Implement vertically (render → movement → interaction → single incident → director → mission loop → persistence → polish) with working checkpoints. Do not spend most of the work writing plans. Keep runtime, content data, and development tools clearly separated. Ask the creator only for decisions that truly block implementation; otherwise choose sensible defaults and document them.

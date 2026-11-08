# Copy/Paste Into Claude Code

You are the lead gameplay engineer, technical director, and systems designer for **EVERYTHING IS FINE!**, a procedural comedy neighborhood game from AppalachAI Studios intended for The Sandbox.

The project folder contains a series of Markdown blueprints (`00_START_HERE.md` through `08_TESTING_AND_QUALITY.md`). **Read every file in numeric order before starting implementation.** The core idea: the player is the one relatively normal, well-meaning new resident in Pleasant Pines, where eccentric neighbors cause escalating, interconnected comedic disasters. The game must be immediately funny, genuinely interactive, replayable, and driven by a **deterministic, data-driven Procedural Comedy Director**. Randomness must produce causally coherent humor, not disconnected absurdity.

**Your instructions:**

1. Inspect the repository, installed SDK and build environment; determine which actual The Sandbox creation/publishing route is viable. Verify against official documentation, cite authoritative references in `PLATFORM_FINDINGS.md`, and **never invent SDK APIs or assume custom Three.js code is directly accepted by The Sandbox**. If the platform pathway remains unverified, implement portable TypeScript gameplay/simulation logic behind a renderer adapter and clearly label the deployment blocker.
2. Add `PROJECT_STATUS.md` with current status, technical decisions, run/build/test commands, completed features, known issues, and exact next actions; update after each milestone to preserve continuity across context resets and work sessions.
3. Begin **coding immediately after necessary inspection**. Prioritize a playable first street, player movement/interaction, and a joke within 30 seconds. Then build Randy's BBQ favor, interactive props, simple NPCs, a first working director, and an accurate comedy-news recap.
4. Favor composable systems: world-state, NPC states, missions, seeded RNG, typed event catalog, predicate/effect registry, actor/prop reservations, bounded escalation, recovery, callbacks, ledger, local-news recap, UI, debug traces, and tests.
5. Use original or properly licensed art/audio. Keep controls simple, cartoonish presentation accessible, and failure funny. Build one excellent vertical slice before expanding content.
6. Run the project and test at each milestone. Don't claim features work without actually verifying them. If something cannot be implemented due to environment/platform limits, create a concrete fallback and document it rather than pretending it works.
7. Don't stop at a speculative design document or a static mockup. Produce playable code, run/build commands, tests, and meaningful progress in this session. Ask questions only for truly blocking decisions.

**First milestone:** A running scene of Pleasant Pines with clear controls, the arrival gag (someone launches across a fence from a trampoline, calmly ignored by neighbors), and an interactive Big Randy offering help with his barbecue. Continue into the full BBQ encounter once this is working.

Please start by listing the project files and inspecting available SDK/runtime; then implement.

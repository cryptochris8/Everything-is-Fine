# NEXT_SESSION — handoff

**Read first:** this file → PROJECT_STATUS.md → COMEDY_SYSTEM_STATUS.md → ARCHITECTURE_DECISIONS.md → PLATFORM_FINDINGS.md → `docs/ENGINE18_NOTES.md` (only the sections you need). The blueprint is in `Everything_Is_Fine_Blueprint/` (00–10).

## State in one paragraph
*Everything Is Fine!* is a Sandbox Studio (Genesys engine 18.0.0) game, built and verified without the editor. Here is what works:
- **Platform and build:** the build runs in Chrome. 55/55 tests pass. Content validates clean.
- **Controls and camera are Athlete Domains' exactly** (ADR-019): camera-relative walk/run/jump, a drag-to-look orbit camera with no pointer lock, the floating phone stick, the same controller layout. The game's own actions are Enter (interact), T (throw), 1–3 (replies); on the controller, X and Y. `node tools/probe-input.cjs` checks 32 behaviours. Not yet tried on a real controller or phone.
- **Art (2026-11-07):** code-built models ported from Bad Hair Day (skinned cast and the player, Brisket) and Trash Panda (houses, props, trees, fences, cars), plus originals (cart, Mow-Bot, grill, workshop, chickens) and a Skybox-library toon sky. See `docs/ART_SOURCES.md`, ADR-016–018. `?oldart=1` gives the old look and `?gallery=1` a model line-up.
- **The day:** the 30-second opening gag and Big Randy's Cookout run end-to-end, with 3 complications and 8 truthful endings.
- **The world:** 3 free-roam encounters and 7 ambient gags; the Chaos Meter with its Block Party finale; persistent NPC memory and callbacks; the Channel 4 news end card.
- **Verification:** an autopilot played a full day in the browser (screenshots in `tools/_out/`).

What doesn't exist yet:
- It has **not** been uploaded through Studio.
- **Nothing is committed** (the repo has zero commits).

## First moves
1. Start the server: `bash tools/check.sh --serve`, then go to http://127.0.0.1:5207/.
   - If Vite has been up more than a day, restart it.
   - Never use port 5199; another project uses it.
2. After any code change: `bash tools/check.sh`, then `./node_modules/.bin/tsx --test tests/*.test.ts`.
   - Don't run check.sh while a probe is running: it wipes `.dist`.
3. Verify visually with `tools/probe.cjs`. It boots in ~6 s, and a `?bot=helpful&timescale=3` day takes ~90 s of wall time.

## Gotchas already paid for
- **Spawn quirk.** The engine's initial spawn, and teleports in the pawn's first ~1 s, place the capsule ~2 m low. `Show.spawnSettled` re-teleports at 1.5 s; don't remove it.
- **Ground height.** The ground top is `G = -0.85`.
- **No pointer lock** (Athlete Domains): looking is right-mouse drag, or a left-drag on the right half of the screen.
- **Canvas textures (signs) under the engine's WebGPU renderer:** use `flipY = false` with untouched UVs. The default `flipY = true` renders upside down. This was measured, see `signNode`.
- **Model materials:** never use `onBeforeCompile` (the WebGPU renderer ignores it). Use the TSL classes in `src/game/art/render/models/materials.ts`.
- **New asset files** must be added to `src/game/ShippedAssets.ts` as literal paths, or Studio's build drops them silently. Run `bash tools/check.sh --manifest` after changing `assets/`.
- **Ported art code** under `src/game/art/{family,tp,render}` is a copy. Fix bugs here and don't touch the source games.
- **Movement and camera** come from `athleteInput` (Show writes it, NeighborPawn reads it). The engine's controller is deliberately inert (`AthleteController`). Don't re-enable its device handling or pointer lock.
- **Reserved controls (Athlete Domains):**
  - Keyboard: Q/E/R/F, WASD, Shift and Space.
  - Controller: A, B, RT, both sticks, and the D-pad outside replies.
  - Don't map game actions onto them.
- **Jumping:** take off only when grounded and not rising, because the engine's coyote time over-jumps.
- **Player-facing text** must not name keys ("press 1 or 2"). The HUD labels buttons per device.
- **Engine install.** `@gnsx/genesys.js@18.0.0` is not on public npm. Always use `pnpm install --offline` with pnpm 11 (command in PROJECT_STATUS).
- **Content changes:** add data to `src/sim/content/**`, register it in `content/index.ts`, and run the tests. The validator catches bad refs, missing timeouts and non-fact news.
- **New verbs:** extend the `Cond`/`Action` unions in `types.ts`, then `evalCond`/`runAction` in `scenario.ts`, then `validate.ts`.
- **Determinism.** Never use `Math.random()` in `src/sim`. Use `sim.rngRolls`, `rngLines`, `rngDirector` or `rngWorld`.
- **Engine bumps.** Don't open this folder in Studio casually: it can silently bump the engine. Turn on "Ask before project update" and check the version triple afterwards.

## Open decisions for Chris
- Title and branding clearance (not technical).
- The player character's look: currently a teal-tee "new neighbor" from the Bad Hair Day kit. Should there be a customiser?
- Whether to commit and push to a GitHub repo, and its name.

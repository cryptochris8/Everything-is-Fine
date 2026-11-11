# PLATFORM_FINDINGS — Everything Is Fine! on The Sandbox

_Last verified 2026-11-07. Confirmed means checked against an installed tool, the engine source, a running build, or official docs. The engine changes often, so re-verify after any engine update._

## Summary
- **Target platform:** **The Sandbox Studio**, the TypeScript/WebGPU engine codenamed **Genesys**, engine **19.0.1** (upgraded from 18.0.0 on 2026-11-10, when the platform began requiring 19; Studio 19 needs Node ≥ 24.22.1).
  - Games are browser-playable links at `studio.sandbox.game/play/<uuid>`.
  - This is **not** the legacy Unity voxel *Game Maker*, which is also installed on this machine. That product is unrelated.
- **Status:** the game builds and runs in Chrome (WebGPU, ~140 fps on the laptop's dGPU). A whole day was played end-to-end in the browser by the autopilot, with the news card and save working. **Uploaded through Studio 2026-11-08** (unpublished draft): gameId `1260c06a-f9db-4f89-b8c8-4d1a9f9b54df`, play link https://studio.sandbox.game/play/1260c06a-f9db-4f89-b8c8-4d1a9f9b54df. Probed headless on the live link: engine v18.0.0 requested and loaded, day 1 runs, music/ambience playing, voice lines play and duck the music, all 238 MP3s served by the CDN, `localStorage` available.

## Confirmed facts
| Area | Finding | Source |
|---|---|---|
| Studio install | `C:\Program Files\Sandbox-Studio` (live channel, updater `studio.sandbox.game/api/sdk/releases/live/`) and `C:\Program Files\Sandbox-Studio-Staging` | local filesystem |
| Engine | `@gnsx/genesys.js` **19.0.1** (18.0.0 until 2026-11-10), installed by Studio when it opens the project. It is not on public npm. | `node_modules/@gnsx/genesys.js/package.json` |
| Language / build | TypeScript, Vite, pnpm. Entry is `src/game.ts` → `main()`. The runtime loads `.dist/game.js` as a CJS bundle in which only `@gnsx/genesys.js`, `three`, `three/tsl` and `three/webgpu` are external. | `scripts/build-dist.mjs`; Sandbox/last-hayride (shipped engine-18 game) |
| Project template | The official "3rd Person Movement" template = `CharacterPawn` + `GameMode` + scene with light/ground/PlayerStart/Sky. Our project starts from it. | `C:\Program Files\Sandbox-Studio\resources\vendor\src\templates\src\templates\thirdPerson` |
| Player movement | `CharacterPawn` uses `CharacterMovementNode`, not the Mover stack. Defaults: 5 m/s, no sprint, mouse look **only while the pointer is locked**. | `docs/ENGINE18_NOTES.md` §1 (file:line citations) |
| Physics | Rapier. Static/kinematic/dynamic bodies. The `MeshNode` default collider is ConvexHull, so we pass BoundingBox explicitly. | ENGINE18_NOTES §3–4; https://studio-docs.sandbox.game/the-editor/what-physics-and-rapier-mean.md |
| NPC navigation | `AIController` requires the Mover stack, and the navmesh is unverified. **We use sim-driven kinematic movement** (same as both shipped reference games). | ENGINE18_NOTES §10 |
| UI | DOM inside `#ui-container` (z-index 1000, above the canvas) is supported. Our HUD is plain DOM. | ENGINE18_NOTES §6 |
| Audio | **Works in dev (2026-11-07).** Looping `SoundNode`s (music beds, ambience) and `GlobalAudioManager.playGlobalSound` one-shots (effects, voices) load `@project/assets/audio/*.mp3`. `world.audioListener.context.resume()` from a gesture starts it. The synth stingers are now the fallback. **Verified on the live Studio build 2026-11-08.** | ADR-021; `src/game/GameAudio.ts` |
| Input | A window `keydown` listener works. Built-in WASD/Space/Q/Z are consumed by the controller. Mobile virtual joysticks are set explicitly (never `'auto'`). | ENGINE18_NOTES §2 |
| Persistence | **The engine has no player-data/save API.** `window.localStorage` works on the local dev page. It is **unverified on the published play host**. | Sandbox memory `sandbox-studio-tech-constraints`; `__eif.stats().storage === true` locally |
| Multiplayer | Netcode exists but there is no hosting for published links. Out of scope; the game is single-player. | Sandbox memory `sandbox-studio-build-surface` |
| Upload | Studio editor → cloud icon → choose/create game → files from `.dist` → upload → unpublished draft link (no account needed to play the draft). Publish is a separate step. | https://studio-docs.sandbox.game/publishing/uploading-your-project.md, https://studio-docs.sandbox.game/publishing/how-to-publish.md |
| Docs index | https://studio-docs.sandbox.game/llms.txt (any page as raw Markdown with `.md`) | official |
| Genesys MCP | `sandbox-studio-genesys(-staging)` is configured in `~/.claude.json`. It **failed to connect this session (ECONNREFUSED)** because it only serves while Studio is open with a project. It was not needed. | session start |

## Engine-18 traps found in THIS project (all worked around)
1. **Spawn wedges the player in the ground.** The engine's initial spawn, and any teleport during the pawn's first ~1 s, places the capsule about 2 m low. The player then sits half inside the ground (or falls through it).
   - Workaround: teleport once after the pawn has existed for 1.5 s (`Show.spawnSettled`).
   - Plus a fall safety net: below y = G − 6, you return home. The engine has no kill-Z.
   - Later teleports are exact.
2. **The ground top is y = −0.85**, not 0. The template's ground box sits at −0.9 and is 0.1 thick. All world geometry uses `G = -0.85`.
3. **Port 5199 is used by another project's Vite.** This project serves on **:5207 `--strictPort`**.
4. **Canvas textures render upside down with the default `flipY = true`** (engine WebGPURenderer, 2026-11-07).
   - Every sign read upside down.
   - Measured three ways; `flipY = false` with untouched UVs is correct (`Neighborhood.signNode`).
5. **`onBeforeCompile` material patches are ignored** (WebGPU renderer).
   - Model materials must be TSL node materials (`src/game/art/render/models/materials.ts`, ADR-017).
6. **Sky:** a `SceneEnvironmentNode` (Textured, `@project/assets/...webp`) works.
   - Hide the template `SkyNode` (`setHiddenInGame(true)`). The first visible registered source wins.
   - The texture must also be listed literally in `src/game/ShippedAssets.ts` for the Studio build.

## Decisions driven by the platform
- **Portable core, thin adapter.**
  - `src/sim/` (comedy director, world state, content) has zero engine imports and is tested headless under Node.
  - `src/game/` is the only Genesys-specific code.
  - If the platform path changes, only the adapter is rewritten.
- **Kinematic everything.** NPCs and props are moved by the deterministic sim, not by physics. This gives replayable seeds and avoids the KCC/dynamic-body traps.
- **Session-first persistence.** A day is self-contained. Memory between days goes through `BrowserStore` (localStorage when available, otherwise in-memory) and never crashes on a blocked or corrupt store.

## Unverified / blockers
- [x] **Studio upload + live play link** (2026-11-08): https://studio.sandbox.game/play/1260c06a-f9db-4f89-b8c8-4d1a9f9b54df. How it went: the project was registered in `%APPDATA%\Sandbox-Studio\genesys-config.json` (Studio ignores a project path on its command line), Chris clicked it open, Build, cloud icon. Studio stamped the gameId into the project file (committed, so re-uploads hit the same game), rewrote `CLAUDE.md` to an SDK block (our text restored below it), `.npmignore`, and editor metadata in the scene. `src/auto-imports.ts` must exist (tools/gen-auto-imports.mjs). Live-page 404 for `.genesys/baked-assets.json` and the analytics failures are normal.
  - Engine 19 (2026-11-10): the 18→19 guide (`.agents/skills/engine-upgrades/references/18-19.md`) needed no code changes here; our jumpSpeed is explicit, the pawn is a root, no removed APIs used. Studio 19 sorts `src/auto-imports.ts` by whole path (`game-data.ts` before `game/`); `tools/gen-auto-imports.mjs` matches it. The published play page hosts the game in a cross-origin iframe.
  - Run the version-triple check: `EverythingIsFine.genesys-project`, `.dist/EverythingIsFine.genesys-project` and `node_modules/@gnsx/genesys.js` must all read the same version (19.0.1 now).
  - Click Build, upload, then probe the live link.
- [ ] **Does localStorage persist on the published play page?** Test it on the draft link with `__eif.stats().storage`, then reload and check that the day counter advanced.
- [ ] **Does Studio's own build pick up everything?**
  - We have no `ShippedAssets` literals because we have no asset files yet. Everything is procedural geometry, canvas textures and synthesized audio, so this is low risk.
  - `src/auto-imports.ts` is generated by Studio on build. We deleted a foreign copy.
- [ ] Real-phone test: touch buttons, joysticks, performance on the iGPU and on mobile.
- [ ] Title/branding legal clearance (blueprint 01). Not a technical item.

## Fallback plan
If the Studio upload path broke, the game still runs:
- as a standalone page via the dev launcher (`vite`);
- as a static build of `.dist` + launcher on Netlify or Vercel.

The sim is engine-agnostic, so a Three.js-only adapter is also possible. Neither fallback is The Sandbox, so we would only use them for playtests.

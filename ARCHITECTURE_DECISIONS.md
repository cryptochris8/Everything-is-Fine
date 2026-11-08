# ARCHITECTURE_DECISIONS — Everything Is Fine!

Each record: decision, why, consequences. Newest at the bottom. Status: these are proposals made by Claude, not yet explicitly approved by Chris.

---

### ADR-001 — Target The Sandbox Studio (Genesys engine 18), built without the editor (2026-11-07)
**Decision.** Use the engine-18 SDK from Chris's last shipped Studio game (`Sandbox/last-hayride`, copied read-only). Start from the official "3rd Person Movement" template. Build `.dist` with `scripts/build-dist.mjs` (esbuild) and verify in headless Chrome. Open Studio only to upload.
**Why.** Studio silently bumps engine versions when a project is opened, and that has shipped blank screens before. The no-editor loop was proven on four of Chris's Studio games.
**Consequences.** Upload is a manual step for Chris. Always run the version-triple check before uploading.

### ADR-002 — Engine-agnostic comedy simulation behind a thin adapter
**Decision.** All game logic lives in `src/sim/`, which has no engine imports:
- world state, NPC routines, props, the Comedy Director, missions, chaos, ledger, news, saves.

`src/game/` only renders sim state and feeds input in.
**Why.** The blueprint says to keep logic portable and testable. Headless tests and seed sweeps run in milliseconds. The engine churns. The sim is also the source of truth for determinism.
**Consequences.** Player position is the only physics-owned input; everything else is deterministic. The adapter is roughly 2.5k lines and replaceable.

### ADR-003 — Comedy content is data in a closed, typed DSL (no eval)
**Decision.**
- Incidents, ambient gags and missions are `IncidentDef` objects made of stages (`setup → complication → escalation → payoff → aftermath`).
- Each stage has whitelisted `Action`s and `Cond`itions (`src/sim/comedy/types.ts`).
- They are interpreted by `scenario.ts` and validated at startup and in tests by `validate.ts`, which checks references, states, timeouts, timeout-loop detection, and fact-only news.

**Why.** Blueprint 03 and 06: authored reusable beats, no arbitrary code, validated content, and easy to add new gags without touching the engine.
**Consequences.** New mechanics sometimes need a new Cond or Action (one case in each of `evalCond`/`runAction` + the validator). Content files are verbose but readable.

### ADR-004 — Every non-terminal stage must have a timeout; every incident has maxDuration + fallback
**Why.** It guarantees termination, so no hangs and no soft-locks. The validator enforces it, and test 4 forces every incident to run with an idle player.

### ADR-005 — Director slots and reservations
**Decision.**
- Slots: 1 mission + 1 major + up to 2 ambient incidents at once.
- Actors and props are reserved per incident. A child (a complication requested by the mission) can borrow the parent's reservations.
- Majors get a quiet period afterwards.
- A punchline cannot repeat within the last 3 completed incidents.
- Scoring uses proximity, same-day variety, cross-day variety (`recent.<id>` memory), compatible follow-up tags, chaos scaling for `big` set-pieces, and affinity.
- Mission requests preempt ambient gags holding needed actors (added after an in-browser run showed Brisket's zoomies blocking the burger heist).

**Why.** Blueprint 03 key constraints.

### ADR-006 — Systemic rules alongside scripted beats
**Decision.** A handful of general rules in `Sim.systems()` / `onPropLanded()`:
- a thrown squeaky toy makes Brisket drop whatever he carries;
- Brisket stepping on the valve turns the sprinkler on;
- the sprinkler soaks actors, the burgers and the player (who slips);
- props that leave the map come back "via a concerned citizen";
- grabbing Brisket takes his loot.

**Why.** This makes chains emergent rather than one fixed script. For example, the dog's random escape route can pass the sprinkler valve, which turns the cookout into a Water BBQ.

### ADR-007 — Seeded, forked RNG streams
**Decision.** `Rng(seed)` → `fork('director' | 'lines' | 'rolls' | 'world')`. `Math.random()` is only used in cosmetic FX.
**Why.** Adding a line of dialogue must not change which complication happens. Tests 1 and 1b prove identical replays.

### ADR-008 — The ledger is the only source of truth for the past
**Decision.** News templates may only use fact conditions (validator). The end card and saves read the ledger.
**Why.** Blueprint: "the recap cannot hallucinate". Test 8 sweeps seeds and policies to confirm it.

### ADR-009 — Procedural low-poly art from primitives, batched by vertex colour
**Decision.**
- Houses, trees, the street and props are built from three.js primitives in code.
- The static street is merged into one vertex-coloured mesh with invisible box colliders.
- Characters are chunky primitives: body batched, limbs separate for the animation vocabulary.
- The player uses the engine's mannequin (with its run/jump clips).

**Why.**
- No asset pipeline is needed for milestone 1.
- It gives a consistent "bright low-poly cartoon" look.
- It keeps draw calls low: the whole static street is one mesh. Draw calls are not measured yet; the frame rate is (140 fps on the laptop's dGPU in headless Chrome; the iGPU number is still to measure).
- It avoids GLB import traps.

**Consequences.** Characters are charming but simple. A later milestone can swap in rigged GLBs per actor behind the same `ActorView` interface.

### ADR-010 — Synthesized audio first
**Decision.** WebAudio stingers (`Sfx.ts`). Sound ids from content map to synth voices.
**Why.** Original sound with zero licensing, and nothing to load. ElevenLabs SFX/VO can replace the voices later using the same ids.

### ADR-011 — Persistence via localStorage with graceful fallback
**Decision.** A versioned, validated `SaveData` (memory flags, affinity, HOA rules, awards, headline archive, settings, difficulty, stats) stored through `BrowserStore`, which falls back to memory.
**Why.** The engine has no save API. Persistence on the play host is unverified, so the game must work either way.

### ADR-012 — Difficulty (Easy/Normal/Hard)
**Decision.** Per Chris's standing rule (2026-10-01). It is persisted and defaults to Normal. It scales:
- reaction windows (stage timeouts under 20 s);
- Brisket's speed;
- the burger-catch radius;
- chaos gain.

It is separate from accessibility settings (captions, text size, reduced motion, volume).

### ADR-013 — Spontaneous encounters are side objectives
**Decision.** The primary objective comes from the mission line (the mission or a complication it requested). Spontaneous majors show as "⚡ Also happening: …".
**Why.** The first in-browser run showed the gnome heist hijacking the objective while the player carried the burgers. The world should feel alive, but must not derail the favour.

### ADR-014 — Engine-18 spawn workaround
**Decision.** Re-teleport the pawn 1.5 s after it first exists, and add a fall safety net.
**Why.** Spawning and teleporting during the pawn's first second place the capsule about 2 m low, wedged in or falling through the ground (measured, see PLATFORM_FINDINGS). Later teleports are exact.

### ADR-015 — One input map for keyboard, gamepad and touch
**Decision.** `src/game/Controls.ts` (engine-free, unit-tested) maps keys and gamepad buttons to one `Action` type that `Show.act()` handles. The engine's DefaultPlayerController keeps what it already does on a gamepad:
- left stick moves, right stick looks;
- A / ✕ jumps;
- bumpers and triggers zoom.

The game uses only buttons the engine leaves alone:
- X / □ interacts, B / ○ throws;
- the D-pad picks replies: the top reply is always ↑ and the bottom one always ↓, and a 3-reply prompt uses ↑ → ↓;
- Start pauses, Select unsticks, L3 toggles run;
- on the news card, Y / △ replays the day.

The HUD shows the labels of whichever device the player touched last (keyboard, Xbox or PlayStation glyphs, or touch).

Touch adds:
- JUMP, which presses the engine's own Space key with a synthetic KeyboardEvent so the engine times the jump;
- RUN, a toggle shared with L3 (`RunLatch`) that turns itself off once you stop moving;
- a ❚❚ pause button.

The pause menu gained an "I'm stuck!" button for every device.

**Why.** Before this, a controller could walk but couldn't play the mission, and touch had no jump, run or pause. Keeping the game's buttons off the engine's avoids double actions.
**Verified.** `tools/probe-input.cjs` injects a fake standard gamepad and emulates a phone, then checks 20 behaviours in headless Chrome (20/20 pass). Real hardware is still untested.

### ADR-019 — Controls and camera exactly as in Athlete Domains (supersedes ADR-015's movement/camera)
**Decision.** Chris asked on 2026-11-07 for "player controls and cameras ... exactly [like] our Athlete Domains game". The source is `athlete-domains-relaunch/src/world/{camera,walker,cityPad,WorldScreen}` and `src/input/virtualStick`. Its numbers and maths are ported to the pure, tested `src/game/athlete.ts`.

**Movement:**
- Camera-relative: pushing up walks away from the camera.
- Walk 4.2 m/s, run 7 m/s, with no acceleration ramp and full air control.
- The athlete turns instantly to face the walk.
- Jump: 1.25 m apex under 26 m/s², with a 250 ms jump buffer. Holding jump hops again on landing.

**Camera:**
- It has its own yaw and pitch and orbits a point 1.45 m above the feet at 6.7 m.
- Resting pitch is atan2(1.65, 6.5); range is 50° up to 70° down. Below −0.12 it stops swinging lower and only tilts.
- FOV 60. The engine spring arm pulls it in at walls.

**Input:**

| Device | Walk | Look | Run | Jump |
|---|---|---|---|---|
| Keyboard + mouse | WASD / arrows | Right-mouse drag anywhere, or left-drag on the right half (0.008 / 0.006 rad per px, no pointer lock); Q/E turn, R/F look | Shift | Space |
| Controller | Left stick, or D-pad (unless replies are showing) | Right stick (2.6 / 1.7 rad/s) | B or RT ≥ 0.35, or full tilt | A |
| Phone | Floating stick on the left side (56 px throw, 15 % dead zone, base follows the thumb) | Drag on the right side | Full tilt (> 0.92) | JUMP button |

**Engine side:**
- `AthleteController` (`src/game/AthleteControl.ts`) ignores every device event and skips DefaultPlayerController's per-frame feed.
- Show writes the frame's intent to `athleteInput`.
- `NeighborPawn` drives itself: it sets its rotation, calls `moveForward`, and jumps only when grounded and not rising. The engine's coyote time re-launched held jumps to ~1.9 m.
- The pawn counter-rotates the camera pivot so the camera keeps its own yaw.
- Movement node settings: lambdas 1000 (instant), `simulatedGravityScale` 26/9.81.
- The engine's virtual joysticks are off.

**The game's own actions moved off the camera keys:**
- Interact is **Enter**, Athlete Domains' action key (it was E).
- Throw is **T** (it was F).
- Unstick is the pause menu's "I'm stuck!" or the controller's Select (it was R).
- On the controller, X interacts and **Y** throws, because B now runs. L3 run and the touch RUN button are gone (full tilt runs).

**Verified.** 13 maths tests and `tools/probe-input.cjs` (32/32 in headless Chrome): speeds measured 4.26 and 7.18 m/s, jump 1.21–1.26 m, camera-relative walking after a turn, right-drag turns exactly 0.8 rad per 100 px, no pointer lock, the floating stick runs at the rim, and a full bot day completes.

### ADR-016 — Art from our own code-built model kits
**Decision.** The procedural primitive art (ADR-009) is replaced with code-built models ported from Chris's own games:
- Bad Hair Day: skinned humans and the dog;
- Trash Panda Trouble: houses, props, scenery and fences;
- the WebGPU material approach from Mailbox Mayhem;
- originals in the same kit (cart, Mow-Bot, trampoline, grill, workshop, chickens).

Each cast member gets an original outfit. Provenance is in `docs/ART_SOURCES.md`. `?oldart=1` keeps the old look.
**Why.**
- Chris asked for clean houses, cars and character models in a bright poly look, reusing assets from his games.
- Those games build everything in code, in exactly that flat-colour, ink-outlined toon style.
- The humans have faces, about 30 gestures and 15 expressions, which matters for comedy.
- The cost is tiny (no downloads) and nothing needs a licence.
- The AppalachAI Meshy library was rejected: it's textured, 2–8 MB per model, and its items are sold separately.

### ADR-017 — WebGPU/TSL port of the model materials
**Decision.** `src/game/art/render/models/materials.ts` re-implements the ported games' material API (`modelMaterial`, `instanceMaterial`, `setFade`, `windowMaterial`, `fadeableSceneryMaterial`, `basicMaterial`, `sceneryMaterial`) as `MeshToonNodeMaterial` subclasses with TSL:
- the ink hull is a `positionNode`;
- tint, fade, glow and ink are applied in `setupOutput`.

Window glass is lifted to a daytime sky blue.
**Why.** The originals patch GLSL through `onBeforeCompile`, which the engine's WebGPURenderer ignores. Keeping the API means the ported model code runs unchanged.

### ADR-018 — Sky panorama via SceneEnvironmentNode, with literal shipped-asset paths
**Decision.** The sky is `m4-toon-hills` from the Skybox library at `assets/textures/sky_toon_hills.webp`, applied with `ENGINE.SceneEnvironmentNode` (Textured), and the template SkyNode is hidden. Every shipped asset is listed literally in `src/game/ShippedAssets.ts`, which `main()` installs on `globalThis`.
**Why.**
- It follows Chris's sky rule (use the library) and the cel-outlined clouds match the ink outlines.
- Studio's editor build ships only asset paths that appear literally in the bundle (measured in outgrown).

# GENESYS-SDK-BEGIN
@AGENTS.md
# GENESYS-SDK-END

# Add your custom Claude instructions below.

# Everything-is-Fine!

**The Sandbox Studio game** (Genesys engine 18.0.0, TypeScript). AppalachAI Studios. A procedural comedy neighborhood: *Good neighbors. Bad decisions. Endless possibilities.*
_(Originally scaffolded by Builder Hub as a "Web app" on 2026-11-07. The actual type is a **Sandbox Studio game**; the profile is `C:\Users\chris\.claude\stack-profiles\sandbox.md`.)_

## Start here
1. `NEXT_SESSION.md`: handoff, first moves, gotchas.
2. `PROJECT_STATUS.md`: run/build/test commands, milestones, known issues, next steps.
3. `COMEDY_SYSTEM_STATUS.md`, `ARCHITECTURE_DECISIONS.md`, `PLATFORM_FINDINGS.md`.
4. `docs/ENGINE18_NOTES.md`: a verified engine API cheat sheet. Trust it over model memory.
5. The blueprint, `Everything_Is_Fine_Blueprint/00..10`. **Do not edit it without Chris's approval.**

## Rules for this project
- Keep **`src/sim/` engine-free and deterministic.**
  - No `@gnsx`/`three` imports there.
  - No `Math.random()`; use the sim's RNG streams.
- `src/game/` is the only Genesys adapter code.
- Comedy content is **data** in `src/sim/content/`, validated by `validateContent`. Add a gag by adding data.
- Keep these files current as work happens: PROJECT_STATUS.md, ARCHITECTURE_DECISIONS.md, COMEDY_SYSTEM_STATUS.md, NEXT_SESSION.md.
- Every function gets tests (`tests/*.test.ts`, run with `./node_modules/.bin/tsx --test tests/*.test.ts`). They must all pass before moving on.
- Verify in the real runtime with `tools/probe.cjs` before claiming a visual feature works.
- Dev server port is **5207** (strict). Port 5199 belongs to another project.
- Don't open this folder in Sandbox Studio casually: it silently bumps the engine. See PLATFORM_FINDINGS.

## Tools and stacks available
- **Full tool catalog:** `C:\Users\chris\TOOL-STACK.md`.
- **Sandbox profile:** `C:\Users\chris\.claude\stack-profiles\sandbox.md`.
- **Reference Studio games:** `C:\Users\chris\Sandbox\` (last-hayride is engine 18; Sporeling and outgrown). Their memory notes are in `C:\Users\chris\.claude\projects\C--Users-chris-Sandbox\memory\`.
- **Other projects:** `C:\Users\chris\.claude\builder-hub-projects.md`.

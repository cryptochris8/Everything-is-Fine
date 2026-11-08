# PROJECT_STATUS — Everything Is Fine!

**AppalachAI Studios · The Sandbox Studio (Genesys engine 18.0.0) · procedural comedy neighborhood**
_Updated 2026-11-07 (session 1)._

## Where we are
**Milestones 0–6 of the blueprint (07) have a working first pass, playable in the browser.** Milestone 7 (polish, original audio/VO, the real Studio upload) is next.

| Milestone | Status | Evidence |
|---|---|---|
| M0 Inspect + prove runtime | ✅ | Engine 18 installed offline; `.dist` builds; boots in headless Chrome in ~6 s at ~140 fps (laptop dGPU). PLATFORM_FINDINGS.md |
| M1 30-second fun test | ✅ | Todd lands in the street at ~6 s ("Commuting."), "(Nobody reacts.)", Randy jogs over and offers the favour with 2 replies at ~15–18 s. Screenshots `tools/_out/open_t*.png`. Test "opening…within 30 seconds" |
| M2 Physical interaction | ✅ | Carry/place/throw/use for 14 props with visible states; placement targets; off-map recovery |
| M3 Randy's BBQ | ✅ | 3 complications plus a fallback, 3 fetch hooks, 8 fact-driven endings; a full day completed in the browser by the autopilot (`tools/_out/day_*.png`) |
| M4 Comedy Director | ✅ | Typed DSL, validator, reservations, cooldowns, punchline penalty, quiet periods, scoring, debug log; same seed + inputs → identical trace (test 1) |
| M5 Cast + memory | ✅ (first pass) | 4 core residents + Brisket, Todd, Mow-Bot, chickens; routines; memory callbacks change dialogue and complication eligibility the next day (tests 7, 7b) |
| M6 Chaos + news | ✅ | Chaos meter with tiers, cool-off and the Block Party finale; fact-only Channel 4 news end card (tests 8, 8b) |
| M7 Polish/package | 🟡 | **Visual overhaul done** (2026-11-07):
- Bad Hair Day's skinned, expressive cast, the player included;
- Trash Panda houses, props, trees, fences and parked cars;
- original cart, Mow-Bot, grill, workshop and chickens;
- toon sky.

Screenshots are in `tools/_out/dress_*.png`, `close_a.png` and `artday_*.png`. Controller and touch are done (ADR-015). Audio/VO and the Studio upload are still to do. |

## How to run
Use Bash from the project root.

```bash
# one-time (engine is not on public npm; installs from the local pnpm store)
CI=true npm_config_manage_package_manager_versions=false \
  /c/Users/chris/AppData/Local/pnpm/.tools/pnpm/11.24.0/bin/pnpm install --offline --ignore-scripts
./node_modules/.bin/tsx ./scripts/genesys/post-install.ts      # mirrors engine source to .engine/

bash tools/check.sh                 # typecheck + build .dist
bash tools/check.sh --manifest      # + dev file manifest (when assets/ change)
bash tools/check.sh --serve         # + vite on http://127.0.0.1:5207 (strict port; 5199 belongs to another project)
```

Then open the dev page at **http://127.0.0.1:5207/** in Chrome.

**URL switches:**
| Switch | Effect |
|---|---|
| `?seed=1234` (or a word) | fixed seed |
| `?autostart=1` | skip the title |
| `?difficulty=easy\|normal\|hard` | set difficulty |
| `?bot=helpful\|lazy\|slow` | autopilot |
| `?timescale=3` | faster comedy clock (verification only) |
| `?debug=1` | Director panel |
| `?reset=1` | fresh save |
| `?touch=1` | force touch UI |
| `?oldart=1` | session-1 primitive art (comparison) |
| `?gallery=1` | ported-model line-up on the street (art check) |

**Controls match Athlete Domains exactly (ADR-019).**

**Keys:** WASD/arrows walk (camera-relative) · hold the right mouse button anywhere, or left-drag on the right half, to look (no pointer lock) · Q/E turn · R/F look up/down · Shift run · Space jump · **Enter** interact/pick up/put down · **T** throw · **1–3** reply · Esc/P/Tab pause · <code>`</code> debug panel.

**Gamepad** (standard mapping, Xbox or PlayStation labels): left stick / D-pad walk (full tilt runs) · right stick look · A/✕ jump · B/○ or RT run · **X/□** interact · **Y/△** throw · **D-pad** reply (while replies show) · Select unstick · Start pause (B resumes). On the title and news cards, A/Start starts and Y/△ replays the day.

**Touch** (auto on phones, or `?touch=1`): a floating stick wherever your thumb lands on the left side (push to the rim to run) · drag on the right side to look · **JUMP** · **USE** · **THROW** · ❚❚ pause · tap a reply. The pause menu has an "I'm stuck!" button.

## Tests (all passing: 74/74)
```bash
./node_modules/.bin/tsx --test tests/*.test.ts     # ~20 s
./node_modules/.bin/tsx tools/sweep.ts 8           # seed sweep summary: outcomes + incident mix
node tools/probe.cjs "http://127.0.0.1:5207/?bot=helpful&seed=21&timescale=3" tools/_out/day.png 3000 --ready \
  --shots "a=0;;b=0;;c=0;;d=0;;e=0;;f=0;;g=0;;h=0;;i=0;;j=0;;k=0;;l=0" --shot-settle 7000 --eval "JSON.stringify(__eif.stats())"
node tools/probe-input.cjs                         # Athlete Domains controls: fake gamepad + keyboard/mouse + emulated phone, 32 checks (~3 min)
```
The tests cover blueprint 08 functional tests 1–9:
- determinism and replay;
- reservations;
- off-map recovery;
- termination of every incident with an idle player;
- concurrency caps;
- failure is not a dead end;
- save round-trip and callbacks;
- news truthfulness;
- the repeat-gag penalty.

They also cover systems (toy, grab, sprinkler, valve chain), interactions, chaos finale and decay, difficulty, objectives, and the RNG, ledger, vector, layout and save units. Test 10 (captions off) is a UI concern: on-screen speech always shows a bubble.

## Code map
| Path | What |
|---|---|
| `src/sim/` | **Engine-free simulation** (portable, tested) |
| `src/sim/sim.ts` | world state, ticking, interactions, systemic rules, objectives |
| `src/sim/comedy/` | `types.ts` (content DSL), `scenario.ts` (interpreter), `director.ts`, `validate.ts` |
| `src/sim/content/` | `cast.ts`, `props.ts`, `incidents/{bbq,encounters,ambient,finale}.ts`, `news.ts`, `index.ts` |
| `src/sim/gameplay/` | difficulty, news builder |
| `src/sim/memory/` | save format and stores, day commit |
| `src/sim/world/` | layout (street map), state types |
| `src/sim/debug/bot.ts` | autopilot for tests, sweeps and `?bot=` |
| `src/game/` | **Genesys adapter**: `GameMode`, `Player` (pawn), `Show` (conductor), `Neighborhood`, `Characters`, `PropViews`, `Fx`, `Hud`, `Sfx`, `Batch` |
| `src/game.ts` | engine entry `main()` |
| `docs/ENGINE18_NOTES.md` | verified engine-18 API cheat sheet with file:line citations |
| `src/game/athlete.ts` | **Athlete Domains controls and camera maths** (pure, tested): camera rig, drag/key/pad look, sticks, run, jump buffer |
| `src/game/AthleteControl.ts` | `athleteInput` (the frame's intent) and the inert `AthleteController` |
| `src/game/Controls.ts` | engine-free map of the game's own actions (interact, throw, replies, pause) per device, plus button labels |
| `src/game/art/` | **code-built model kits** (see `docs/ART_SOURCES.md`): `render/` builder + WebGPU materials, `family/` skinned humans + dog (Bad Hair Day), `tp/` houses/props/scenery (Trash Panda), `neighbors.ts` cast outfits, `yard.ts` originals, `street.ts` placement, `animMap.ts`, `gallery.ts` |
| `src/game/CastViews.ts` | actor views for the cast + Brisket on the skinned rigs |
| `src/game/ShippedAssets.ts` | literal asset paths for the Studio build (keep in sync with `assets/`) |
| `tools/` | `check.sh`, `probe.cjs` (headless Chrome), `probe-input.cjs` (gamepad + touch checks), `sweep.ts` |
| `Everything_Is_Fine_Blueprint/` | the original 11 blueprint docs (unchanged) |

## Known issues
- **Not yet uploaded to Studio.** See PLATFORM_FINDINGS → blockers.
- The art is code-built from the in-house kits (ADR-016).
  - The engine mannequin is gone.
  - Not yet checked on an integrated GPU or a phone. The laptop's dedicated GPU runs at ~140 fps.
- No music; stingers are synthesized. No voice-over.
- A competent player gets the "classic" ending often. Needs foil-twists (COMEDY_SYSTEM_STATUS #1).
- Only 3 free-roam encounters, so the gnome heist and the Mow-Bot recur most days.
- Engine-18 spawn quirk is worked around (a teleport 1.5 s after spawn). During that first 1.5 s the player stands slightly sunk.
- Two console 404s on boot that aren't game requests (the probe's network log shows 0 failed requests; probably the favicon).
- Line endings are mixed (CRLF from some edits). Harmless; normalize before the first commit.
- **Nothing is committed yet.** The repo has no commits; Chris hasn't asked for one.

## Next steps (in order)
1. **Chris:** play it at http://127.0.0.1:5207/ (run `bash tools/check.sh --serve` first). Is it funny in 30 s? Which bits land?
2. Studio upload pass: open Studio on this folder, decline the engine bump, run the version-triple check, Build, upload, probe the draft link, test localStorage on the host.
3. Comedy depth: foil-twists (rule of three); 3 more encounters (cat on a robot vacuum, cake on the roof, wind steals the HOA forms); a camp-stove complication.
4. Second mission: GOLF-01 package delivery with Granny.
5. Presentation:
   - ElevenLabs stingers and a light music bed, and a title wordmark.
   - Art polish ideas: Linda's clipboard prop in hand, a Granny sun hat, and grass/flower detail on the lawns.
   - Player look options (the character is currently a teal-tee "new neighbor").
6. Mobile pass on a real phone and a real controller (both pass emulated checks); measure on the iGPU.

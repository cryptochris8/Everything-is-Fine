# COMEDY_SYSTEM_STATUS — Everything Is Fine!

_Updated 2026-11-07. Content lives in `src/sim/content/`; the engine is in `src/sim/comedy/`._

## The Procedural Comedy Director (implemented)
- **Typed content language:** 29 condition kinds and 34 action kinds, all whitelisted. No eval.
- **Validation:** `validateContent` runs at boot and in tests and currently reports 0 issues.
- **Lifecycle:** Eligible → Reserved → stages (setup/complication/escalation/payoff/aftermath) → linger → release → cooldown.
- **Slots:** 1 mission, 1 major, 2 ambient. Reservations, with complications able to borrow the mission's.
- **Pacing:** a 9 s quiet period after majors, and no punchline repeat within the last 3 incidents.
- **Selection score:** weight × proximity × variety (same day and yesterday) × compatible follow-up × chaos scaling × affinity.
- **Debug:** every decision is logged with per-candidate rejection reasons, visible in the in-game panel.
- **Chaos meter (0–100):**
  - Incidents and payoffs add chaos, scaled by difficulty.
  - It decays when calm, after a 10 s grace period.
  - Tiers are CALM / LIVELY / WILD / UNHINGED.
  - At 100, the safe **Block Party** finale starts and resets chaos to about 35.
- **Ledger:** append-only facts. News, outcomes and saves read only from it.

## Content catalog
### Mission: BIG RANDY'S COOKOUT (`bbq.ts`)
Spine: arrival gag → meet Randy (2 replies) → fetch charcoal from Earl's garage → bring the burgers → **complication** → serve → feast → wrap.
- **Fetch hooks** (one is chosen):
  - **Granny's Express Delivery:** ride or walk. The ride takes a "shortcut" through her garden and into Linda's hedges, and gets you deputized. Walking means she escorts you, honking.
  - **Form C-4:** sign it, explain "it's for Randy" (two forms), or keep walking ("Noted. In pen.").
  - **A quiet walk.**
- **Cooking complications** (one is chosen):
  - **The Great Burger Heist (dog):**
    - Spot Brisket in time and grab the burgers (foiled).
    - Or he runs one of 3 seeded routes. Counter with the squeaky toy, grab him, or recruit Granny's cart (which ends in a bush), or let it happen.
    - If you let it happen, he becomes the birthday-dog head chef.
    - The sprinkler route can chain into a Water BBQ.
  - **The Flip-O-Matic 3000 (Earl):**
    - Only appears if you chatted with Earl or read the warning label.
    - Hit OFF early, choose "let it rip" or "turn it down" (it works twice), then catch the burgers in the landing circle.
    - Misses land on Linda's clipboard (new Rule 14-B), Randy's roof (Todd rescues them via trampoline) or the table.
    - At chaos ≥ 40 it can go rogue.
  - **The Sprinkler Timer:**
    - Shut the valve off in time.
    - Or rescue the burgers.
    - Or the valve jams at high chaos, and you either call Earl (who sits on it) or get the Water BBQ.
  - **A Flavor Event (fallback):** grab the burgers or lose the grill. Tomorrow Randy cooks on a camp stove.
- **Endings** (picked from facts): dog_chef, water_bbq, clipboard_catering, perfect_catch, potluck, soggy, dusty, classic.

### Spontaneous encounters (`encounters.ts`, shown as side objectives)
- **Mow-Bot Has Ambitions:** hit its switch, or it mows a giant arrow across 3 lawns pointing at Linda's house. The mowed trail stays on the lawn.
- **The Sir Reginald Affair:** protect the gnome, or chase Brisket and return it, or it joins his 11-gnome collection (Gnome Watch rule).
- **The Great Escape (Poultry Edition):** shoo the chickens home, or they take the picnic table's VIP seats.

### Ambient micro-gags (`ambient.ts`)
- Todd's trampoline commute.
- Granny honking at Kevin the squirrel.
- Earl's self-opening mailbox shutting on him.
- Linda measuring your grass with a tiny ruler.
- Linda straightening the HOA board during a crisis.
- Brisket's zoomies.
- Earl's garage welcome.

### Systemic rules (emergent chains)
- The squeaky toy makes Brisket drop his loot.
- Brisket running over the valve turns the sprinkler on.
- The sprinkler soaks actors, the burgers and the player (the player slips).
- Grab Brisket to take back what he's carrying.
- Off-map props come back "via a concerned citizen".
- Interactive extras: unpack moving boxes (8 finds), bounce on Todd's trampoline, check Earl's mailbox, read the HOA board (shows your accumulated rules), honk Granny's horn.

### Memory and callbacks (persist across days)
| Memory flag | Callback |
|---|---|
| `randy.guards_food` | the dog heist can no longer happen; Randy: "I am the system" |
| `grill_ruined` | camp stove the next day, plus new lines |
| `dog_head_chef` | Randy and Brisket lines |
| `water_bbq` | Randy and Linda lines; HOA puddle permits |
| `deputized` | Granny: "Morning, Deputy" |
| `flipper_flung` | Earl's next invention line, and the flipper stays unlocked |
| `hoa.rule.*` | Linda quotes the rules; the board lists them |
| `randy.timer_fixed` | removes the sprinkler complication |
| `recent.<id>` | cross-day variety penalty |

Affinity per NPC shifts Randy's greeting and Director scoring.

### Local news (`content/news.ts`)
27 fact-gated templates, prioritized. The end card shows:
- headline, up to 3 stories and the ending title;
- "Problems solved / New problems / Peak chaos";
- new HOA rules and awards;
- the shareable seed, plus Replay-this-seed and Next-Day buttons.

## Measured (headless seed sweep, `tools/sweep.ts`, 8 seeds × 3 bot policies × 2 days)
- All 9 major incident types fire. Every cooking complication occurs.
- Endings across 48 days: classic 31, water_bbq 7, dog_chef 7, clipboard_catering 2, perfect_catch 1.
- Days last about 1–6 minutes of game time depending on play.

## Known limitations / next comedy work
1. **Competent play is too often "classic".** A helpful player foils most complications, so the cookout ends calmly.
   - Add rule-of-three twists: after a foil, escalate sometimes (Brisket steals Linda's clipboard instead; the sprinkler you prevented triggers on Linda's inspection).
   - Make the "classic" ending reference what was foiled.
2. GNOME_HEIST and MOWER_RUNAWAY appear on most days because there are only 3 free-roam encounters. More are needed (blueprint 05 seeds: PET-01 cat on a robot vacuum, PARTY-01 cake on the roof, HOA-02 wind takes the forms, ECHO-01 quiet machine).
3. Only one mission. Next is GOLF-01 "Deliver a package", where Granny offers a ride.
4. The player can't ride the golf cart; it's simulated as Granny taking the cargo. A vehicle mount is a later engine task.
5. There is no spoken VO. Lines are bubbles and captions.
6. The "Flavor Event" fallback cannot run once the grill is a camp stove, so a day can have no cooking complication. Needs a camp-stove variant.

# Gameplay and Player Experience

## Core loop
1. Explore Pleasant Pines and spot a neighbor/incident.
2. Accept an everyday favor or intervene in spontaneous nonsense.
3. Perform a simple physical/social task (carry, grab, toggle, push, drive, return, escort).
4. Experience one or more **legible** complications; choose how to respond.
5. Reach a hilarious payoff/outcome, even if the task fails.
6. Receive a **local-news recap** + neighborhood relationship/reputation changes.
7. Return to the persistent neighborhood for new favors, consequences, and callbacks.

## MVP interactions
- Walk/run/jump; context-sensitive interact / pick up / put down / throw (safely cartoonish).
- Simple objects: grill, burgers, dog toy, sprinkler switch, hose, cake, lawn chair, ladder, gate, leaf blower, golf cart (if technically feasible).
- Small interaction radius, clear prompts, clear collision, forgiving hitboxes.
- Lightweight objective tracking and optional hint.
- Reactions through subtitles, expressive animations, visual cues, and concise sound stingers. Accessibility: readable captions; do not convey the only clue via audio.

## Play modes in the vision
- **Neighborhood free roam:** Ambient incidents occur even without an active task, but never overwhelm the player.
- **Favors:** Optional structured 3–7-minute episodes with goals and generated complications.
- **Aftermath:** NPCs reference previous incidents; props/landmarks may reflect events.

## Player agency
For every incident, provide at least two meaningful responses where possible: retrieve, repair, redirect, enlist NPC help, or accept the funny consequences. Players may improvise, but the director must handle common branches and gracefully recover from unanticipated behavior.

## Chaos meter
0–100 *director intensity* rather than a simple punishment meter. As chaos increases: more elaborate eligible incidents, funnier reactions, larger (but coherent) payoffs. Avoid blocking basic movement or making chaos unmanageable. Use cooldowns, limits on concurrent incidents, and cool-off periods. At 100 trigger a **safe, exaggerated neighborhood finale** and reset to a manageable baseline instead of game-over. Progression should reward both clever fixes and amusing unintended outcomes. The meter should never coerce destructive behavior.

## Reward model
- Neighbor appreciation and relationship changes.
- Discoverable recurring gags and local-news headlines.
- Cosmetic or playful neighborhood collectibles (e.g. honorary “Deputy” badge).
- Optional performance summaries: “Problems solved: 2; new problems: 7.”
- No punishing fail state for humorous outcomes.

## Mission example: Big Randy's BBQ
Initial objective: Fetch a bag of charcoal. Randy boasts about his grilling expertise. The director chooses a compatible complication: dog takes burgers, faulty sprinkler activates, or Earl's auto-flipper goes rogue. From that trigger, systems generate causal escalation depending on the player's response. The outcome records what **actually** occurred. Some branches could involve golf cart, neighbors, leaf blower, runaway chickens. Always include a recovery path, cap escalation, and end in an earned comedic line.

## UX priorities
- Immediate movement and visible interaction affordances.
- Mission status small and clear; no dialogue walls.
- Quick reset for soft-locks; graceful return if props leave bounds.
- Friendly camera, easy navigation, controller/keyboard where supported.
- Short, optional tutorial woven into first favor.
- Responsive performance on target Sandbox delivery formats.

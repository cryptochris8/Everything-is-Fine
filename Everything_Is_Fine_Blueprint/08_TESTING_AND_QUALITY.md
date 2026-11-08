# Testing, Playtesting, and Quality Gates

## Comedy scorecard (1–5 each)
- **Immediate hook:** funny within 30 seconds.
- **Comprehensibility:** can explain what went wrong and why.
- **Agency:** player input changes outcome.
- **Surprise:** payoff feels novel but earned.
- **Character:** behavior fits residents' personalities.
- **Replay:** rerunning creates meaningful difference.
- **Pacing:** not constant noise; sufficient breathing room.
- **Shareability:** player would tell a friend about a specific outcome.

## Functional tests
1. Identical seed + identical input log → identical beat selection and state transition trace (excluding legitimate nondeterministic physics if not controlled; isolate or reconcile it).
2. No beat may start without reserved necessary actors and props.
3. Event cancels or gracefully reroutes if required prop leaves play area.
4. Each incident has a timeout/fallback and terminates cleanly.
5. No more than configured incidents active concurrently.
6. Failed task does not prevent later neighborhood play.
7. World snapshot can load and preserve callback flags.
8. News report mentions only facts present in ledger.
9. Repeated gag penalty prevents identical punchline spam.
10. Player can reach and complete core interactions with captions/audio disabled.

## Edge cases
- Player walks away mid-scene; returns later.
- Player moves required prop early.
- Player refuses NPC assistance.
- Dog loses its path to burger platter.
- Granny's cart gets stuck.
- Rapidly toggling sprinkler switch.
- Save/load during incident.
- Chaos reaches 100 during active mission.
- Player spams interactions.
- Mobile/controller interactions if supported.

## Observability
Create debug panel with current seed, beat, current goal, reservations, predicates/rejection reasons, chaos, NPC short memory, incident timers, and recent event log. Ship debug disabled by default.

## Player test prompt
Ask a tester to play three 5-minute sessions without explanation. Record: first laugh, whether they knew next objective, one moment they chose to do something surprising, one funniest occurrence, whether two runs felt different, and any frustrating/blocking moment. Improve *cause/effect clarity and comedic timing* before adding breadth.

## Acceptance target for first slice
- Player can complete the main favor from clean boot.
- At least 3 genuinely different complications across seeded replays.
- At least 2 agency-influenced endings.
- One spontaneous ambient event.
- Two distinct personality callbacks.
- Accurate end-of-round local news headline.
- No reproducible critical blocker in regression cases.

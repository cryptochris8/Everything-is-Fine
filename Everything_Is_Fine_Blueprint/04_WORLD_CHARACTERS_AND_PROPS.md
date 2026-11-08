# World, Cast, Props, and Behaviors

## Initial location: Pleasant Pines
One lush, readable suburban street (approximately 5–6 houses with interactable yards), shared sidewalk, street sign, Big Randy's barbecue, an HOA information board, Earl's garage, and Granny's golf cart parking spot. Provide short travel times and distinctive landmarks. A static recognizable street with variable incidents is preferred to constant full-world reshuffles.

## NPC cast
### Granny Darlene — self-appointed neighborhood sheriff
- Traits: fiercely helpful, overconfident driver, proud, loyal.
- Goals: “keep the peace,” patrol in golf cart, recruit deputy.
- Behaviors: arrives uninvited, offers high-risk transportation, interrupts trivial disputes.
- Sample line: “Don't you worry. I've handled worse at the church potluck.”
- Callback: after player rescues her, she appoints them honorary deputy.

### Big Randy — barbecue evangelist
- Traits: generous, optimistic, comically incompetent with grills.
- Goals: host the world's best cookout, win admiration.
- Behaviors: overuses gadgets, interprets failure as success, misplaces essentials.
- Sample line: “Now that's not smoke. That's flavor finding its way out.”
- Callback: after a destroyed grill, switches to a tiny camp stove and distrusts player's help.

### Linda — HOA president
- Traits: procedural, hyper-organized, takes small rules seriously.
- Goals: make Pleasant Pines exemplary, issue citations.
- Behaviors: inspects hedges during escalating chaos, lectures residents about signage.
- Sample line: “The incident itself isn't against the rules. Your lawn chair placement is.”
- Callback: writes new HOA rules based on actual incidents.

### Uncle Earl — enthusiastic inventor
- Traits: creative, sincere, wrong about safety margins.
- Goals: automate every chore.
- Behaviors: unveils robot mower, leaf blower attachments, self-flipping grill arm.
- Sample line: “The good news is it worked. The bad news is it worked twice.”
- Callback: revised inventions incorporate previous failures, causing novel problems.

## NPC design principle
Each resident owns recognizable cause-and-effect patterns. Residents have schedules, current task, mood, short memory flags, and interaction state. Reuse a small expressive animation set across characters, augmented by personalized gestures and emotes.

## Prop grammar
Properties: `id`, `category`, `interactions`, `state`, `physicsProfile`, `requiresActor`, `eventTags`, `resetStrategy`.

| Prop | States | Comedic affordance |
|---|---|---|
| Grill | cold / cooking / smoking / ruined | Randy overconfidently cooks, smoke cue |
| Burger platter | on table / carried / stolen / recovered | dog theft chain |
| Sprinkler valve | off / on / jammed | makes yard slippery, redirects actors |
| Golf cart | parked / driving / stuck | Granny rescue attempt, misplaced confidence |
| Dog | roaming / interested / fleeing / waiting | steals items, responds to toy |
| Leaf blower | off / on / misdirected | moves lightweight props, comic rescue |
| Fence gate | closed / open / broken | escape routes for chickens |
| HOA clipboard | carried / dropped / lost | Linda prioritizes paperwork |
| Garden gnome | placed / taken / moved | ambient neighbor disagreement |
| Automatic mower | idle / cutting / rogue / disabled | Earl experiments |

## Animation and audio priorities
Expressive anticipation, reactions, physical momentum, exaggerated but safe falls, funny idles, eye contact toward absurdity, brief pauses before punchline. Build simple reusable animation vocabulary first. Short original musical stingers, whistle/squeak/plop/cart horn, spatialized cues if available. Include subtitles for all important lines.

## Accessibility and comfort
Readability over visual clutter; avoid rapid flashing, harsh failure audio, random camera shakes; offer reduced motion/FX and volume controls where feasible. Avoid culturally targeted humiliation; humor should be affectionate.

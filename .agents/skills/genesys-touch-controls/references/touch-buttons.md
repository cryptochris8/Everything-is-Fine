# Touch buttons

The engine ships sticks but no action buttons. A touch button is an engine `Button`
(`genesys-ui` owns its look) plus pointer events for hold state; `holdButton` is in `SKILL.md`.
`Button.onClick` listens for `click`, which fires on release, so it suits only tap actions
(pause, menu). Anything held — jump with variable height, auto-fire, throttle, sprint — uses
`pointerdown` / `pointerup` / `pointercancel`.

## Sizes and placement

One size table, the same in `genesys-ui`:

| Target | Size |
|---|---|
| Any tap target (pause, close, menu, small toggle) | 48 px minimum, 12 px between neighbours |
| Secondary action (dash, reload, ability) | 56-64 px |
| Primary action (jump, fire, attack) | 72-88 px |
| Puzzle grid cell that is the play surface | 44 px minimum (only then; a button is never below 48 px) |

Every offset adds the safe-area inset so nothing hides under a notch or home bar: write `max(24px, env(safe-area-inset-right))` for a right margin and `calc(170px + env(safe-area-inset-bottom))` for a raised bottom one. The page needs `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`; without `viewport-fit=cover` the insets stay 0.

| Button | Size | Place (from the corner) |
|---|---|---|
| Primary (jump in a platformer, fire in a shooter) | 88 px | right 24 px, bottom 170 px (above a right stick) or bottom 24 px when there is no right stick |
| Secondary (dash, reload, ability) | 64 px | 104 px left of the primary, same baseline |
| Pause | 48 px | top 16 px, right 16 px: the outer top-right corner |
| Throttle up / down (flight) | 64 px each | stacked, right 24 px, bottom 24 / 100 px |

**Pause and the score.** Pause owns the outer top-right corner. The objective and score stack sits immediately left of it (60 px = 48 + 12 from the edge), or directly below it in portrait (`genesys-ui` → placement → *Corner rule*). The score never sits in the corner on a touch layout.

Keep 16–24 px from the edges (or the safe-area inset, when larger) and out of the center third. The UI container (`#ui-container`,
`z-index` 1000) sits above the stick zones, so a button inside the dynamic right-stick zone gets the
touch rather than spawning a stick (verify in Play).

## Classic pawn (`DefaultCharacterPawn`)

The buttons call the same pawn methods the controller calls for Space and LMB.

Source: .engine/src/entities/DefaultPlayerController.ts (jump and fire paths), .engine/src/entities/PawnActions.ts (`isCombatPawn`), .engine/src/entities/MovementPawn.ts (`jump`, `stopJump`) (composed — typechecked against 18.1.0-alpha.317)
```ts
/** Main verbs + pause for a classic (DefaultCharacterPawn) hero. Call once after the HUD is built. */
export async function buildTouchControls(world: ENGINE.World, controller: ENGINE.PlayerController, onPause: () => void): Promise<ENGINE.Button[]> {
  const pawn = (): ENGINE.Pawn | null => controller.getPawn();
  const jump = await holdButton(world, 'Jump', 88, { right: 'max(24px, env(safe-area-inset-right))', bottom: 'calc(170px + env(safe-area-inset-bottom))' },
    () => { const p = pawn(); if (p instanceof ENGINE.MovementPawn) p.jump(); },
    () => { const p = pawn(); if (p instanceof ENGINE.MovementPawn) p.stopJump(); });
  const fire = await holdButton(world, 'Fire', 88, { right: 'calc(128px + env(safe-area-inset-right))', bottom: 'calc(96px + env(safe-area-inset-bottom))' },
    () => { const p = pawn(); if (ENGINE.isCombatPawn(p)) p.fire(); },
    () => { const p = pawn(); if (ENGINE.isCombatPawn(p)) p.endFire(); });
  const pause = await holdButton(world, '', 48, { right: 'max(16px, env(safe-area-inset-right))', top: 'max(16px, env(safe-area-inset-top))' }, onPause);
  pause.getElement()?.element.append(pauseGlyph()); // a pause glyph, not the text "II"
  return [jump, fire, pause]; // hide() these with the sticks on title, pause and result screens
}
```

Resolve the pawn on every press (`controller.getPawn()`), since Retry spawns a new one. Calling
`pawn.jump()` directly is what `DefaultPlayerController` does offline; on a predicted online client
the controller routes jump through `movementNode.setJumpEdges()` instead, so an online classic game
needs a controller subclass that sets those edges (verify in Play with two clients). `stopJump()`
only changes height on a node that implements it (`PlatformerMovementNode` in `genesys-movement`).

## GSS pawn

The sim reads input only from its producer, so buttons set flags on a `GSSPlayerController`
subclass and the producer reports them as currently-down tags. Prediction and edge detection then
work exactly as for keys.

Source: .engine/src/gameplay-sim/entities/GSSPlayerController.ts (`produceInputCmd`), .engine/src/gameplay-sim/GSSTagSet.ts (`tagSetAdd`) (composed — typechecked against 18.1.0-alpha.317)
```ts
/** GSS: touch buttons set held flags; the producer reports them as currently-down tags. */
@ENGINE.GameClass()
export class TouchGSSController extends ENGINE.GSSPlayerController {
  public touchJump = false; // holdButton(..., () => c.touchJump = true, () => c.touchJump = false)
  public touchDash = false;
  public override produceInputCmd(cmd: ENGINE.GSSInputCmd, dt: number): void {
    super.produceInputCmd(cmd, dt);
    if (this.touchJump) ENGINE.tagSetAdd(cmd.inputTagsDown, ENGINE.GSSTags.InputJump);
    if (this.touchDash) ENGINE.tagSetAdd(cmd.inputTagsDown, ENGINE.GSSTags.InputDash);
  }
}
```

A custom GSS verb (sprint, fire) is a registered tag added the same way (`genesys-movement`
gss-abilities-effects); GSS fire wiring is `genesys-combat`.

## Pause button

The pause button is 48 px at the outer top-right corner and shows a glyph, not text. `ENGINE.Icons` has no pause icon (it covers `heart`, `shield`, `bolt`, `star`, `gear`, `home` and similar), so draw two bars as an inline SVG with `createElementNS`; static shapes, no markup string (`genesys-ui` → safe-ui). `currentColor` makes it follow the button's ink.

Source: Composed — typechecked against 18.1.0-alpha.317 (browser SVG DOM; `holdButton` is in `SKILL.md`)
```ts
/** Pause glyph: no pause icon exists in ENGINE.Icons, so build an inline SVG (static shapes, createElementNS). */
export function pauseGlyph(): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  for (const x of [6, 14]) {
    const bar = document.createElementNS(NS, 'rect');
    bar.setAttribute('x', String(x)); bar.setAttribute('y', '5'); bar.setAttribute('width', '4'); bar.setAttribute('height', '14');
    bar.setAttribute('rx', '1'); bar.setAttribute('fill', 'currentColor');
    svg.append(bar);
  }
  return svg;
}
```

Give the button an accessible name too (`aria-label="Pause"` on its element).

## Pause and screens

The pause button calls the GameMode's pause transition (`genesys-game-boot`); that transition hides
the sticks (`world.inputManager.hideVirtualJoystick()`) and every touch button (`button.hide()`),
and Resume shows them again — only when they were shown at start (touch device or `FORCE_TOUCH`).
Title Start and result Retry are ordinary `Button`s with `onClick`; a tap fires `click`.

/**
 * Input mapping for keyboard, gamepad and touch. Engine-free and pure (unit-tested in
 * tests/controls.test.ts); Show.ts reads the devices and feeds them through here.
 *
 * Movement and the camera follow Athlete Domains exactly (src/game/athlete.ts, read by Show): WASD /
 * left stick / D-pad / phone stick to walk, mouse drag · right stick · Q/E/R/F to look, Shift · B · RT
 * · full tilt to run, Space / A / JUMP to jump. This file maps the *game's* actions onto what is left,
 * using Athlete Domains' action key (Enter / X) for interact:
 *   Keyboard: Enter interact · T throw · 1–4 reply · Esc/P/Tab pause
 *   Gamepad:  X / □ interact · Y / △ throw (replay day on the news card) · D-pad reply (only while
 *             replies are showing; otherwise it walks) · Start pause/resume/start/next · Select unstick
 *             · B / ○ also resumes from pause
 */

export type Device = 'keyboard' | 'gamepad' | 'touch';
export type PadStyle = 'xbox' | 'playstation';
export type Phase = 'title' | 'playing' | 'paused' | 'news';

export type Action =
  | { kind: 'interact' }
  | { kind: 'throw' }
  | { kind: 'choose'; index: number }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'start' }
  | { kind: 'nextDay' }
  | { kind: 'replayDay' }
  | { kind: 'unstick' }
  | { kind: 'toggleDebug' };

/** W3C "standard" gamepad button indices (same as the engine's GamepadButton enum). */
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

/** Keyboard → action. `code` is KeyboardEvent.code. */
export function keyAction(code: string, phase: Phase): Action | null {
  if (code === 'Backquote' || code === 'F2') {
    return { kind: 'toggleDebug' };
  }
  switch (phase) {
    case 'title':
      return code === 'Enter' || code === 'NumpadEnter' ? { kind: 'start' } : null;
    case 'news':
      return code === 'Enter' || code === 'NumpadEnter' || code === 'KeyN' ? { kind: 'nextDay' } : null;
    case 'paused':
      return code === 'Escape' || code === 'KeyP' ? { kind: 'resume' } : null;
    case 'playing':
      break;
  }
  if (code === 'Enter' || code === 'NumpadEnter') {
    return { kind: 'interact' };
  }
  if (code === 'KeyT') {
    return { kind: 'throw' };
  }
  if (code === 'KeyP' || code === 'Tab' || code === 'Escape') {
    return { kind: 'pause' };
  }
  const m = /^(?:Digit|Numpad)([1-4])$/.exec(code);
  if (m) {
    return { kind: 'choose', index: Number(m[1]) - 1 };
  }
  return null;
}

/**
 * Which D-pad button picks each reply, top to bottom. The top reply is always Up and the
 * bottom one always Down, so a 2-reply prompt reads as ↑/↓ and a 3-reply one as ↑/→/↓.
 */
export function replyButtons(count: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [PAD.UP];
  }
  if (count === 2) {
    return [PAD.UP, PAD.DOWN];
  }
  if (count === 3) {
    return [PAD.UP, PAD.RIGHT, PAD.DOWN];
  }
  return [PAD.UP, PAD.RIGHT, PAD.DOWN, PAD.LEFT];
}

/** Gamepad button press → action. `choiceCount` is how many replies are on screen. */
export function padAction(button: number, phase: Phase, choiceCount: number): Action | null {
  switch (phase) {
    case 'title':
      return button === PAD.A || button === PAD.START ? { kind: 'start' } : null;
    case 'news':
      if (button === PAD.A || button === PAD.START) {
        return { kind: 'nextDay' };
      }
      return button === PAD.Y ? { kind: 'replayDay' } : null;
    case 'paused':
      return button === PAD.START || button === PAD.B ? { kind: 'resume' } : null;
    case 'playing':
      break;
  }
  switch (button) {
    case PAD.X:
      return { kind: 'interact' };
    case PAD.Y:
      return { kind: 'throw' };
    case PAD.START:
      return { kind: 'pause' };
    case PAD.SELECT:
      return { kind: 'unstick' };
  }
  const idx = replyButtons(Math.min(choiceCount, 4)).indexOf(button);
  return idx >= 0 ? { kind: 'choose', index: idx } : null;
}

/** Sony pads report vendor 054c or a Sony/DualShock/DualSense name; everything else gets Xbox glyphs. */
export function padStyleFromId(id: string): PadStyle {
  return /054c|sony|dualshock|dualsense|playstation/i.test(id) ? 'playstation' : 'xbox';
}

const PAD_GLYPHS: Record<PadStyle, Record<number, string>> = {
  xbox: { [PAD.A]: 'A', [PAD.B]: 'B', [PAD.X]: 'X', [PAD.Y]: 'Y', [PAD.START]: '☰', [PAD.SELECT]: '⧉', [PAD.L3]: 'L3' },
  playstation: { [PAD.A]: '✕', [PAD.B]: '○', [PAD.X]: '□', [PAD.Y]: '△', [PAD.START]: 'OPTIONS', [PAD.SELECT]: 'SHARE', [PAD.L3]: 'L3' },
};
const DPAD_GLYPHS: Record<number, string> = { [PAD.UP]: '↑', [PAD.DOWN]: '↓', [PAD.LEFT]: '←', [PAD.RIGHT]: '→' };

export function padGlyph(button: number, style: PadStyle): string {
  return DPAD_GLYPHS[button] ?? PAD_GLYPHS[style][button] ?? '?';
}

/** On-screen button labels for the active device. */
export interface Labels {
  interact: string;
  throw: string;
  /** Badge for reply `index` of `count`. */
  reply(index: number, count: number): string;
  /** One-line controls summary for the title card. */
  summary: string;
}

export function labelsFor(device: Device, style: PadStyle): Labels {
  if (device === 'gamepad') {
    const g = (b: number) => padGlyph(b, style);
    return {
      interact: g(PAD.X),
      throw: g(PAD.Y),
      reply: (i, n) => padGlyph(replyButtons(n)[i] ?? PAD.UP, style),
      summary:
        `<b>Controls:</b> left stick / D-pad walk (push all the way to run) · right stick look · <b>${g(PAD.A)}</b> jump · <b>${g(PAD.B)}</b> / RT run · ` +
        `<b>${g(PAD.X)}</b> interact / pick up / put down · <b>${g(PAD.Y)}</b> throw · <b>D-pad</b> reply · <b>${g(PAD.SELECT)}</b> unstick · <b>${g(PAD.START)}</b> pause`,
    };
  }
  if (device === 'touch') {
    return {
      interact: 'USE',
      throw: 'THROW',
      reply: (i) => String(i + 1),
      summary:
        '<b>Controls:</b> thumb on the left side to walk (push all the way to run) · drag on the right side to look · <b>JUMP</b> · <b>USE</b> to interact · <b>THROW</b> to toss what you hold · tap a reply to answer · <b>❚❚</b> pause',
    };
  }
  return {
    interact: 'Enter',
    throw: 'T',
    reply: (i) => String(i + 1),
    summary:
      '<b>Controls:</b> WASD walk · hold the right mouse button (or drag on the right side) to look · Q/E turn · R/F look up/down · Shift run · Space jump · ' +
      '<b>Enter</b> interact / pick up / put down · <b>T</b> throw · <b>1–3</b> reply · Esc pause · gamepad works too',
  };
}

/** Turns a per-frame "which buttons are down" snapshot into newly-pressed buttons. */
export class ButtonEdges {
  private prev: boolean[] = [];

  public update(down: readonly boolean[]): number[] {
    const pressed: number[] = [];
    for (let i = 0; i < down.length; i++) {
      if (down[i] && !this.prev[i]) {
        pressed.push(i);
      }
    }
    this.prev = down.slice();
    return pressed;
  }

  public reset(): void {
    this.prev = [];
  }
}

/** Largest stick deflection (0..1) past a dead zone; 0 when inside it. */
export function stickMagnitude(axes: readonly number[], deadZone = 0.2): number {
  let m = 0;
  for (let i = 0; i + 1 < axes.length && i < 4; i += 2) {
    m = Math.max(m, Math.hypot(axes[i] ?? 0, axes[i + 1] ?? 0));
  }
  return m > deadZone ? Math.min(1, m) : 0;
}

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ButtonEdges,
  PAD,
  keyAction,
  labelsFor,
  padAction,
  padGlyph,
  padStyleFromId,
  replyButtons,
  stickMagnitude,
} from '../src/game/Controls.ts';

test('keyAction: playing keys map to game actions (Athlete Domains layout)', () => {
  assert.deepEqual(keyAction('Enter', 'playing'), { kind: 'interact' });
  assert.deepEqual(keyAction('NumpadEnter', 'playing'), { kind: 'interact' });
  assert.deepEqual(keyAction('KeyT', 'playing'), { kind: 'throw' });
  assert.deepEqual(keyAction('KeyP', 'playing'), { kind: 'pause' });
  assert.deepEqual(keyAction('Tab', 'playing'), { kind: 'pause' });
  assert.deepEqual(keyAction('Escape', 'playing'), { kind: 'pause' });
  // Q/E turn and R/F look in Athlete Domains: the game must not also act on them.
  for (const code of ['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'ShiftLeft']) {
    assert.equal(keyAction(code, 'playing'), null, `${code} belongs to the camera/movement`);
  }
  assert.deepEqual(keyAction('Digit1', 'playing'), { kind: 'choose', index: 0 });
  assert.deepEqual(keyAction('Numpad3', 'playing'), { kind: 'choose', index: 2 });
  assert.equal(keyAction('Digit5', 'playing'), null);
  assert.equal(keyAction('Digit0', 'playing'), null);
  assert.equal(keyAction('KeyW', 'playing'), null, 'movement stays with the engine');
  assert.equal(keyAction('Space', 'playing'), null, 'jump stays with the engine');
});

test('keyAction: menus only answer their own keys', () => {
  assert.deepEqual(keyAction('Enter', 'title'), { kind: 'start' });
  assert.equal(keyAction('KeyE', 'title'), null);
  assert.deepEqual(keyAction('KeyN', 'news'), { kind: 'nextDay' });
  assert.deepEqual(keyAction('Enter', 'news'), { kind: 'nextDay' });
  assert.deepEqual(keyAction('Escape', 'paused'), { kind: 'resume' });
  assert.deepEqual(keyAction('KeyP', 'paused'), { kind: 'resume' });
  assert.equal(keyAction('KeyE', 'paused'), null);
  for (const phase of ['title', 'playing', 'paused', 'news'] as const) {
    assert.deepEqual(keyAction('Backquote', phase), { kind: 'toggleDebug' });
  }
});

test('replyButtons: top reply is always Up, bottom always Down, no repeats', () => {
  assert.deepEqual(replyButtons(0), []);
  assert.deepEqual(replyButtons(1), [PAD.UP]);
  assert.deepEqual(replyButtons(2), [PAD.UP, PAD.DOWN]);
  assert.deepEqual(replyButtons(3), [PAD.UP, PAD.RIGHT, PAD.DOWN]);
  assert.deepEqual(replyButtons(4), [PAD.UP, PAD.RIGHT, PAD.DOWN, PAD.LEFT]);
  for (let n = 1; n <= 4; n++) {
    assert.equal(new Set(replyButtons(n)).size, n);
  }
});

test('padAction: gameplay buttons, none on the movement buttons', () => {
  assert.deepEqual(padAction(PAD.X, 'playing', 0), { kind: 'interact' });
  assert.deepEqual(padAction(PAD.Y, 'playing', 0), { kind: 'throw' });
  assert.deepEqual(padAction(PAD.START, 'playing', 0), { kind: 'pause' });
  assert.deepEqual(padAction(PAD.SELECT, 'playing', 0), { kind: 'unstick' });
  // Athlete Domains: A jumps, B / RT run; the rest unused while walking.
  for (const b of [PAD.A, PAD.B, PAD.LB, PAD.RB, PAD.LT, PAD.RT, PAD.L3, PAD.R3]) {
    assert.equal(padAction(b, 'playing', 3), null, `button ${b} belongs to movement`);
  }
});

test('padAction: D-pad picks replies only while replies are showing', () => {
  assert.equal(padAction(PAD.UP, 'playing', 0), null);
  assert.deepEqual(padAction(PAD.UP, 'playing', 2), { kind: 'choose', index: 0 });
  assert.deepEqual(padAction(PAD.DOWN, 'playing', 2), { kind: 'choose', index: 1 });
  assert.equal(padAction(PAD.RIGHT, 'playing', 2), null);
  assert.deepEqual(padAction(PAD.RIGHT, 'playing', 3), { kind: 'choose', index: 1 });
  assert.deepEqual(padAction(PAD.DOWN, 'playing', 3), { kind: 'choose', index: 2 });
  assert.deepEqual(padAction(PAD.LEFT, 'playing', 9), { kind: 'choose', index: 3 }, 'caps at 4 replies');
});

test('padAction: menus', () => {
  assert.deepEqual(padAction(PAD.A, 'title', 0), { kind: 'start' });
  assert.deepEqual(padAction(PAD.START, 'title', 0), { kind: 'start' });
  assert.equal(padAction(PAD.X, 'title', 0), null);
  assert.deepEqual(padAction(PAD.A, 'news', 0), { kind: 'nextDay' });
  assert.deepEqual(padAction(PAD.Y, 'news', 0), { kind: 'replayDay' });
  assert.deepEqual(padAction(PAD.START, 'paused', 0), { kind: 'resume' });
  assert.deepEqual(padAction(PAD.B, 'paused', 0), { kind: 'resume' });
  assert.equal(padAction(PAD.X, 'paused', 2), null);
  assert.equal(padAction(PAD.UP, 'paused', 2), null, 'no replying from the pause menu');
});

test('padStyleFromId + glyphs', () => {
  assert.equal(padStyleFromId('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'xbox');
  assert.equal(padStyleFromId('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'playstation');
  assert.equal(padStyleFromId('Wireless Controller (Vendor: 054c Product: 09cc)'), 'playstation');
  assert.equal(padStyleFromId('8BitDo Pro 2'), 'xbox');
  assert.equal(padGlyph(PAD.X, 'xbox'), 'X');
  assert.equal(padGlyph(PAD.X, 'playstation'), '□');
  assert.equal(padGlyph(PAD.B, 'playstation'), '○');
  assert.equal(padGlyph(PAD.UP, 'xbox'), '↑');
  assert.equal(padGlyph(99, 'xbox'), '?');
});

test('labelsFor: each device names its own buttons', () => {
  const kb = labelsFor('keyboard', 'xbox');
  assert.equal(kb.interact, 'Enter');
  assert.equal(kb.throw, 'T');
  assert.match(kb.summary, /right mouse/);
  assert.equal(kb.reply(1, 2), '2');
  const pad = labelsFor('gamepad', 'xbox');
  assert.equal(pad.interact, 'X');
  assert.equal(pad.throw, 'Y');
  assert.equal(pad.reply(0, 2), '↑');
  assert.equal(pad.reply(1, 2), '↓');
  assert.equal(pad.reply(1, 3), '→');
  assert.match(pad.summary, /D-pad/);
  const ps = labelsFor('gamepad', 'playstation');
  assert.equal(ps.interact, '□');
  assert.equal(ps.throw, '△');
  const touch = labelsFor('touch', 'xbox');
  assert.equal(touch.interact, 'USE');
  assert.equal(touch.throw, 'THROW');
  assert.match(touch.summary, /JUMP/);
});

test('ButtonEdges: reports each press once, again after release', () => {
  const e = new ButtonEdges();
  assert.deepEqual(e.update([false, false, false]), []);
  assert.deepEqual(e.update([false, true, false]), [1]);
  assert.deepEqual(e.update([false, true, false]), [], 'held is not a new press');
  assert.deepEqual(e.update([true, true, true]), [0, 2]);
  assert.deepEqual(e.update([false, false, false]), []);
  assert.deepEqual(e.update([false, true, false]), [1]);
  e.reset();
  assert.deepEqual(e.update([false, true, false]), [1], 'reset forgets held buttons');
});

test('stickMagnitude: dead zone, either stick, clamped', () => {
  assert.equal(stickMagnitude([0.1, 0.1, 0, 0]), 0);
  assert.equal(stickMagnitude([0, -1, 0, 0]), 1);
  assert.ok(Math.abs(stickMagnitude([0, 0, 0.6, 0]) - 0.6) < 1e-9);
  assert.equal(stickMagnitude([1, 1, 0, 0]), 1);
  assert.equal(stickMagnitude([]), 0);
});

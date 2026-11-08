/** Audio decisions (src/game/audioPlan.ts) and the generated catalog's consistency. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ANCHOR_LINES, MUSIC, SFX, VOICES, voiceLines } from '../tools/audio-catalog.mjs';
import { AMBIENCE_LEVEL, CHAOS_MUSIC_AT, DUCK, MUSIC_LEVEL, NEWS_SCRIPT, OPENING_LEVEL, VoiceQueue, approach, distanceGain, mixTargets, musicFor, voiceIndex, voiceKey } from '../src/game/audioPlan.ts';
import { MUSIC_FILES, SFX_FILES, VOICE_LINES } from '../src/game/audioManifest.ts';

test('music: the theme bookends the day; the street bed plays; chaos or the finale swaps it', () => {
  assert.equal(musicFor('title', 0, false), 'theme');
  assert.equal(musicFor('news', 90, true), 'theme');
  assert.equal(musicFor('playing', 10, false), 'street');
  assert.equal(musicFor('playing', CHAOS_MUSIC_AT, false), 'chaos');
  assert.equal(musicFor('playing', 5, true), 'chaos');
  assert.equal(musicFor('paused', 5, false), 'street', 'pausing keeps the bed (quieter)');
});

test('mix: one bed at a time, ducked under dialogue and when paused; ambience only in the street', () => {
  const m = mixTargets('playing', 0, false, false);
  assert.equal(m.street, MUSIC_LEVEL.street);
  assert.equal(m.theme, 0);
  assert.equal(m.chaos, 0);
  assert.equal(m.ambience, AMBIENCE_LEVEL);
  assert.equal(mixTargets('playing', 0, false, true).street, MUSIC_LEVEL.street * DUCK);
  assert.ok(mixTargets('paused', 0, false, false).street < MUSIC_LEVEL.street);
  assert.equal(mixTargets('title', 0, false, false).ambience, 0);
  assert.equal(mixTargets('news', 0, false, false).theme, MUSIC_LEVEL.theme);
});

test('approach: linear fade that never overshoots', () => {
  assert.equal(approach(0, 1, 0.6, 0.5), 0.3);
  assert.equal(approach(0.9, 1, 0.6, 0.5), 1);
  assert.equal(approach(1, 0, 0.6, 0.5), 0.7);
  assert.equal(approach(0.2, 0.2, 0.6, 0.5), 0.2);
});

test('distanceGain: full nearby, quieter far away, never silent', () => {
  assert.equal(distanceGain(null), 1);
  assert.equal(distanceGain(2), 1);
  assert.ok(distanceGain(30) < 1 && distanceGain(30) > 0.3);
  assert.equal(distanceGain(500), 0.3);
});

test('voice queue: in order, one at a time, stale lines dropped', () => {
  const q = new VoiceQueue(4);
  q.push('a', 0);
  q.push('b', 1);
  q.push('c', 2);
  assert.equal(q.next(1)?.file, 'a');
  assert.equal(q.next(5.5)?.file, 'c', '"b" waited 4.5 s and is dropped');
  assert.equal(q.next(6), null);
  q.push('d', 7);
  q.clear();
  assert.equal(q.size, 0);
});

test('catalog: sound ids cover every sound the content plays; music has the three beds', () => {
  assert.deepEqual(Object.keys(MUSIC).sort(), ['chaos', 'street', 'theme']);
  for (const id of ['horn', 'wind', 'catch', 'boing', 'vacuum', 'sproing', 'fanfare', 'crash', 'cluck', 'beep', 'whoosh', 'tick', 'thwump', 'thud', 'stamp', 'spray', 'splat', 'sniff', 'meow', 'clank', 'chitter', 'alarm', 'news', 'award', 'rule', 'chaos', 'squeak', 'splash']) {
    assert.ok(SFX[id], `no sfx prompt for "${id}"`);
  }
  assert.ok(SFX.ambience.loop, 'the ambience bed loops');
});

test('catalog: voice lines are unique, speakers are cast, no {tokens}, the anchor is voiced', () => {
  const lines = voiceLines();
  const keys = new Set(lines.map((l) => voiceKey(l.speaker, l.text)));
  assert.equal(keys.size, lines.length);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length, 'file ids are unique');
  for (const l of lines) {
    assert.ok(VOICES[l.speaker], l.speaker);
    assert.ok(!l.text.includes('{'), l.text);
  }
  for (const t of ANCHOR_LINES) {
    assert.ok(lines.some((l) => l.speaker === 'anchor' && l.text === t), t);
  }
  for (const step of NEWS_SCRIPT) {
    if (step.anchor) {
      assert.ok(ANCHOR_LINES.includes(step.anchor), `news script line not in the catalog: ${step.anchor}`);
    }
  }
  // New encounter dialogue is voiced by the right people.
  assert.ok(lines.some((l) => l.speaker === 'granny' && l.text === 'I TOLD you the squirrels were organizing!'));
  assert.ok(lines.some((l) => l.speaker === 'linda' && l.text.startsWith('Legally... the chickens')));
});

test('manifest: literal @project paths for Studio, and every voice entry resolves', () => {
  for (const f of [...Object.values(MUSIC_FILES), ...Object.values(SFX_FILES), ...VOICE_LINES.map((l) => l.file)]) {
    assert.match(f, /^@project\/assets\/audio\/(music|sfx|voice)\/[a-z0-9_]+\.mp3$/);
  }
  const idx = voiceIndex(VOICE_LINES);
  for (const l of VOICE_LINES) {
    assert.equal(idx.get(voiceKey(l.speaker, l.text)), l.file);
  }
});

test('cold open: each day starts under the theme song, then the street bed takes over', () => {
  assert.equal(musicFor('playing', 0, false, true), 'theme');
  assert.equal(musicFor('playing', 0, false, false), 'street');
  assert.equal(musicFor('playing', CHAOS_MUSIC_AT, false, true), 'chaos', 'chaos still wins');
  const m = mixTargets('playing', 0, false, true, true);
  assert.equal(m.theme, OPENING_LEVEL * DUCK, 'the theme ducks under the opening dialogue');
  assert.equal(m.street, 0);
});

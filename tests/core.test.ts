import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Ledger } from '../src/sim/core/ledger.ts';
import { Rng, hashString, parseSeed } from '../src/sim/core/rng.ts';
import { add, clampToRect, dist, fromYaw, len, lerp, norm, round2, scale, stepToward, sub, yawOf } from '../src/sim/core/vec.ts';
import { DIFFICULTY, nextDifficulty, parseDifficulty, tuning } from '../src/sim/gameplay/difficulty.ts';
import { BrowserStore, MemoryStore, SAVE_VERSION, freshSave, parseSave, serializeSave } from '../src/sim/memory/save.ts';
import { SPOTS, ZONES, describeLocation, inBounds, inZone, isSpotId, zoneById, zoneCenter } from '../src/sim/world/layout.ts';

test('rng: same seed gives the same sequence; different seeds differ', () => {
  const a = new Rng(42);
  const b = new Rng(42);
  const c = new Rng(43);
  const sa = Array.from({ length: 8 }, () => a.next());
  assert.deepEqual(sa, Array.from({ length: 8 }, () => b.next()));
  assert.notDeepEqual(sa, Array.from({ length: 8 }, () => c.next()));
  for (const v of sa) {
    assert.ok(v >= 0 && v < 1);
  }
});

test('rng: int/range/chance/pick stay in bounds', () => {
  const r = new Rng(1);
  for (let i = 0; i < 500; i++) {
    const n = r.int(2, 5);
    assert.ok(n >= 2 && n <= 5 && Number.isInteger(n));
    const f = r.range(-1, 1);
    assert.ok(f >= -1 && f < 1);
    assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
  }
  assert.equal(new Rng(1).chance(0), false);
  assert.equal(new Rng(1).chance(1), true);
  assert.throws(() => r.pick([]));
});

test('rng: weighted never picks zero-weight items and returns undefined when all are zero', () => {
  const r = new Rng(9);
  for (let i = 0; i < 200; i++) {
    assert.equal(r.weighted(['x', 'y'], (s) => (s === 'x' ? 0 : 1)), 'y');
  }
  assert.equal(r.weighted(['x'], () => 0), undefined);
});

test('rng: fork is stable and independent; snapshot/restore replays', () => {
  const a = new Rng(5).fork('dog');
  const b = new Rng(5).fork('dog');
  assert.equal(a.next(), b.next());
  assert.notEqual(new Rng(5).fork('dog').next(), new Rng(5).fork('cat').next());
  const r = new Rng(77);
  const snap = r.snapshot();
  const first = r.next();
  r.restore(snap);
  assert.equal(r.next(), first);
});

test('hashString / parseSeed accept numbers and words', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  assert.equal(parseSeed('1234', 0), 1234);
  assert.equal(parseSeed('Tuesday', 0), parseSeed('tuesday', 0));
  assert.equal(parseSeed('', 99), 99);
  assert.equal(parseSeed(null, 7), 7);
  assert.equal(parseSeed(12.9, 0), 12);
});

test('vec helpers', () => {
  assert.equal(dist({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
  assert.deepEqual(add({ x: 1, z: 2 }, { x: 3, z: 4 }), { x: 4, z: 6 });
  assert.deepEqual(sub({ x: 1, z: 2 }, { x: 3, z: 4 }), { x: -2, z: -2 });
  assert.deepEqual(scale({ x: 1, z: 2 }, 2), { x: 2, z: 4 });
  assert.equal(len({ x: 3, z: 4 }), 5);
  assert.deepEqual(norm({ x: 0, z: 0 }), { x: 0, z: 0 });
  assert.ok(Math.abs(len(norm({ x: 3, z: 4 })) - 1) < 1e-9);
  assert.deepEqual(lerp({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.5), { x: 5, z: 0 });
  const s = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 3);
  assert.deepEqual(s, { pos: { x: 3, z: 0 }, arrived: false });
  assert.equal(stepToward({ x: 0, z: 0 }, { x: 1, z: 0 }, 3).arrived, true);
  const y = yawOf({ x: 1, z: 0 });
  assert.ok(Math.abs(fromYaw(y).x - 1) < 1e-9);
  assert.equal(yawOf({ x: 0, z: 1 }), 0);
  assert.deepEqual(clampToRect({ x: 5, z: -5 }, 0, 1, 0, 1), { x: 1, z: 0 });
  assert.deepEqual(round2({ x: 1.234, z: 5.678 }), { x: 1.23, z: 5.68 });
});

test('ledger: records facts, bumps counters, keeps order and a trace', () => {
  const l = new Ledger();
  l.record(1, 'dog_stole_burgers', true, 'DOG');
  l.bump(2, 'problems_solved', 1, 'BBQ');
  l.bump(3, 'problems_solved', 2, 'BBQ');
  assert.equal(l.truthy('dog_stole_burgers'), true);
  assert.equal(l.truthy('golf_cart_crashed'), false);
  assert.equal(l.has('golf_cart_crashed'), false);
  assert.equal(l.num('problems_solved'), 3);
  assert.equal(l.size(), 3);
  assert.equal(l.all()[0]!.seq, 0);
  assert.equal(l.get('dog_stole_burgers'), true);
  assert.equal(l.facts().size, 2);
  assert.match(l.trace(), /DOG dog_stole_burgers=true/);
  assert.throws(() => {
    (l.all()[0] as { key: string }).key = 'tampered';
  });
});

test('layout: spots are in bounds, zones resolve, locations describe', () => {
  for (const [id, p] of Object.entries(SPOTS)) {
    assert.ok(inBounds(p), `${id} out of bounds`);
    assert.ok(isSpotId(id));
  }
  assert.equal(isSpotId('nope'), false);
  const sprinkler = zoneById('sprinkler_zone')!;
  assert.ok(inZone(SPOTS.picnicTable, sprinkler), 'picnic table must be in the sprinkler spray (water BBQ needs it)');
  assert.ok(!inZone(SPOTS.grillTable, sprinkler), 'grill table must be dry');
  assert.deepEqual(zoneCenter(sprinkler), { x: -9, z: 11.5 });
  assert.equal(describeLocation(SPOTS.earlGarage), "Earl's garage");
  assert.equal(describeLocation({ x: 0, z: 0 }), 'the middle of Maple Street');
  assert.ok(ZONES.length > 6);
  assert.equal(inBounds({ x: 999, z: 0 }), false);
});

test('difficulty: default normal, easy is kinder, hard is harder, cycle', () => {
  assert.equal(tuning(undefined), DIFFICULTY.normal);
  assert.ok(DIFFICULTY.easy.window > DIFFICULTY.normal.window && DIFFICULTY.normal.window > DIFFICULTY.hard.window);
  assert.ok(DIFFICULTY.easy.catchRadius > DIFFICULTY.hard.catchRadius);
  assert.ok(DIFFICULTY.easy.dogSpeed < DIFFICULTY.hard.dogSpeed);
  assert.equal(parseDifficulty('hard'), 'hard');
  assert.equal(parseDifficulty('legendary'), null);
  assert.equal(nextDifficulty('hard'), 'easy');
  assert.equal(nextDifficulty('easy'), 'normal');
});

test('save: round-trips, rejects garbage and future versions, clamps values', () => {
  const s = freshSave();
  s.memory['dog_head_chef'] = true;
  s.affinity['randy'] = 4;
  s.hoaRules.push({ id: 'airborne_catering', text: 'Rule 14-B', day: 1 });
  const back = parseSave(serializeSave(s));
  assert.equal(back.memory['dog_head_chef'], true);
  assert.equal(back.affinity['randy'], 4);
  assert.equal(back.hoaRules[0]!.id, 'airborne_catering');
  assert.deepEqual(parseSave('not json'), freshSave());
  assert.deepEqual(parseSave(null), freshSave());
  assert.deepEqual(parseSave(JSON.stringify({ version: SAVE_VERSION + 5 })), freshSave());
  const weird = parseSave(JSON.stringify({ version: 1, day: -4, affinity: { randy: 900 }, memory: { ok: true, bad: { nested: 1 } }, difficulty: 'nightmare', settings: { volume: 9 } }));
  assert.equal(weird.day, 1);
  assert.equal(weird.affinity['randy'], 10);
  assert.equal(weird.memory['bad'], undefined);
  assert.equal(weird.difficulty, 'normal');
  assert.equal(weird.settings.volume, 1);
});

test('save stores: memory store and browser store degrade gracefully without localStorage', () => {
  const m = new MemoryStore();
  assert.equal(m.load(), null);
  m.store('x');
  assert.equal(m.load(), 'x');
  m.clear();
  assert.equal(m.load(), null);
  const b = new BrowserStore('test-key'); // Node has no window.localStorage by default
  b.store('hello');
  assert.equal(b.load(), 'hello');
  b.clear();
  assert.equal(b.load(), null);
  assert.equal(typeof BrowserStore.available(), 'boolean');
});

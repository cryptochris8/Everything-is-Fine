import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as THREE from 'three';

import type { ActorAnim } from '../src/sim/comedy/types.ts';
import { HOUSES } from '../src/sim/world/layout.ts';
import { dogAnimFor, humanAnimFor } from '../src/game/art/animMap.ts';
import { HOUSE_HEIGHT, HOUSE_STYLE, tpHouseDef } from '../src/game/art/street.ts';
import {
  burgerGeometry,
  campStoveGeometry,
  chickenGeometry,
  gnomeGeometry,
  golfCartGeometry,
  kettleGrillGeometry,
  movingBoxesGeometry,
  mowBotGeometry,
  platterGeometry,
  trampolineGeometry,
  workshopGeometry,
} from '../src/game/art/yard.ts';
import { admiralCatGeometry, formsGeometry, ladderGeometry, robotVacuumGeometry, sheetGeometry, squirrelGeometry, welcomeCakeGeometry } from '../src/game/art/encounterModels.ts';

const ALL_ANIMS: ActorAnim[] = ['idle', 'wave', 'cheer', 'facepalm', 'shrug', 'point', 'flail', 'spin', 'sit', 'write', 'grill', 'dance', 'tumble', 'proud', 'sniff', 'beg'];

// The rig's own vocabularies (src/game/art/family/types.ts).
const RIG_ACTIONS = new Set(['wave', 'cheer', 'jump', 'yawn', 'stretch', 'gasp', 'noooo', 'point', 'shrug', 'checkWatch', 'sip', 'lunge', 'grab', 'pickUpLow', 'handOff', 'toss', 'giggle', 'hug', 'nod', 'shakeHead', 'facepalm', 'dance', 'hairFlip', 'inspect', 'brushFast', 'thumbsUp', 'shh', 'sleepwalk', 'bounce']);
const RIG_FACES = new Set(['neutral', 'happy', 'joy', 'sleepy', 'asleep', 'surprised', 'determined', 'worried', 'pout', 'smug', 'love', 'eek', 'dramatic', 'proud', 'yawn']);
const DOG_ACTIONS = new Set(['bark', 'wag', 'sniff', 'pee', 'stare', 'zoomies', 'jump', 'shake', 'tilt', 'pounce', 'roll', 'scratch', 'beg', 'yawn', 'stretch', 'dig']);

test('humanAnimFor: every sim animation maps to a real rig gesture and face', () => {
  for (const a of ALL_ANIMS) {
    const m = humanAnimFor(a);
    if (m.action !== null) {
      assert.ok(RIG_ACTIONS.has(m.action), `${a} → ${m.action}`);
    }
    assert.ok(RIG_FACES.has(m.face), `${a} face ${m.face}`);
  }
  assert.equal(humanAnimFor('idle').action, null, 'idle is just the walk/idle blend');
  assert.equal(humanAnimFor('wave').loop, true, 'a wave lasts as long as the sim says');
  assert.equal(humanAnimFor('flail').face, 'dramatic');
  assert.equal(humanAnimFor('facepalm').action, 'facepalm');
});

test('dogAnimFor: every sim animation maps to a real dog action (or a pose)', () => {
  for (const a of ALL_ANIMS) {
    const m = dogAnimFor(a);
    if (m.action !== null) {
      assert.ok(DOG_ACTIONS.has(m.action), `${a} → ${m.action}`);
    }
  }
  assert.equal(dogAnimFor('sit').sit, true);
  assert.equal(dogAnimFor('beg').action, 'beg');
  assert.equal(dogAnimFor('sniff').loop, true);
});

test('houses: every owner has a style and a collider height', () => {
  for (const h of HOUSES) {
    const style = HOUSE_STYLE[h.owner];
    assert.ok(style, `no style for ${h.owner}`);
    assert.ok(HOUSE_HEIGHT[style] >= 5, `${style} height`);
  }
  assert.equal(HOUSE_STYLE.randy, 'twoStory', "Randy's roof must be tall enough for the burger-on-the-roof gag");
});

test('tpHouseDef: houses face the street, door on the street side', () => {
  HOUSES.forEach((h, i) => {
    const d = tpHouseDef(h, i);
    // TP: front faces (sin yaw, cos yaw). North-side houses (facing −1) face −Z.
    assert.ok(Math.abs(Math.cos(d.yaw) - h.facing) < 1e-9, `${h.owner} faces the street`);
    assert.equal(d.x, h.center.x);
    assert.equal(d.w, h.width);
    assert.equal(d.d, h.depth);
    assert.ok(Math.abs(d.door.z) < Math.abs(h.center.z), `${h.owner} door is between the house and the street`);
    assert.equal(d.garageSide, 0);
    assert.match(d.wallColor, /^#[0-9a-f]{6}$/i);
  });
});

const BUILDERS: [string, () => THREE.BufferGeometry][] = [
  ['golfCart', golfCartGeometry],
  ['mowBot', mowBotGeometry],
  ['trampoline', trampolineGeometry],
  ['kettle', () => kettleGrillGeometry(false)],
  ['kettleRuined', () => kettleGrillGeometry(true)],
  ['campStove', campStoveGeometry],
  ['boxes', movingBoxesGeometry],
  ['gnome', gnomeGeometry],
  ['platter', platterGeometry],
  ['burger', () => burgerGeometry(0x6e3b1f, 0xf0b459)],
  ['chicken', chickenGeometry],
  ['workshop', workshopGeometry],
  ['robotVacuum', robotVacuumGeometry],
  ['admiralCat', admiralCatGeometry],
  ['cake', () => welcomeCakeGeometry(false)],
  ['cakeEaten', () => welcomeCakeGeometry(true)],
  ['squirrel', squirrelGeometry],
  ['ladder', ladderGeometry],
  ['forms', formsGeometry],
  ['sheet', sheetGeometry],
];

test('yard models: inked toon geometry with the attributes modelMaterial needs', () => {
  for (const [name, make] of BUILDERS) {
    const g = make();
    for (const attr of ['position', 'normal', 'color', 'aInk', 'aGlow']) {
      assert.ok(g.getAttribute(attr), `${name} has ${attr}`);
    }
    const n = g.getAttribute('position').count;
    assert.ok(n > 30 && n % 3 === 0, `${name}: ${n} vertices`);
    const ink = g.getAttribute('aInk');
    let inked = 0;
    for (let i = 0; i < ink.count; i++) {
      if (ink.getX(i) !== 0 || ink.getY(i) !== 0 || ink.getZ(i) !== 0) {
        inked++;
      }
    }
    assert.ok(inked > 0, `${name} has an ink outline hull`);
    g.computeBoundingBox();
    assert.ok(g.boundingBox!.min.y >= -0.05, `${name} sits on the ground (min y ${g.boundingBox!.min.y})`);
  }
});

test('yard models: cached per key, variants differ', () => {
  assert.equal(golfCartGeometry(), golfCartGeometry());
  assert.notEqual(kettleGrillGeometry(false), kettleGrillGeometry(true));
  assert.notEqual(burgerGeometry(1, 2), burgerGeometry(3, 2));
  assert.equal(burgerGeometry(1, 2), burgerGeometry(1, 2));
});

test('yard models: sizes the sim relies on', () => {
  const box = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox();
    return g.boundingBox!;
  };
  // Trampoline mat at ~0.8 m (Todd launches from it; the bounce inspect expects a low pad).
  assert.ok(Math.abs(box(trampolineGeometry()).max.y - 0.9) < 0.15);
  // Open kettle: rim/grate at ~0.95 m, the hung lid peaks a little higher; never a closed ball.
  const k = box(kettleGrillGeometry(false));
  assert.ok(k.max.y > 0.9 && k.max.y < 1.4, `kettle top ${k.max.y}`);
  const pos = kettleGrillGeometry(false).getAttribute('position');
  let aboveCentre = 0;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 1.15 && Math.abs(pos.getX(i)) < 0.2) {
      aboveCentre++;
    }
  }
  assert.equal(aboveCentre, 0, 'nothing covers the grate (the lid hangs to the side)');
  // The golf cart fits Granny (canopy ~2 m) and the 1.3 m lane.
  const c = box(golfCartGeometry());
  assert.ok(c.max.y > 1.9 && c.max.y < 2.3);
  assert.ok(c.max.x - c.min.x < 1.7);
});

test('encounter models: sizes the scenarios rely on', () => {
  const box = (g: THREE.BufferGeometry) => {
    g.computeBoundingBox();
    return g.boundingBox!;
  };
  // The ladder must reach a bungalow eave (~3.3 m) when leaned at 0.27 rad.
  const ladder = box(ladderGeometry());
  assert.ok(ladder.max.y * Math.cos(0.27) > 3.1, `ladder reach ${ladder.max.y}`);
  // The admiral fits on his vacuum: cat footprint inside the disc.
  const cat = box(admiralCatGeometry());
  const vac = box(robotVacuumGeometry());
  assert.ok(cat.max.x <= vac.max.x + 0.02 && cat.min.x >= vac.min.x - 0.02, 'the cat overhangs the vacuum');
  // Whole cake and eaten cake really differ; the eaten one is shorter.
  assert.ok(box(welcomeCakeGeometry(true)).max.y < box(welcomeCakeGeometry(false)).max.y);
  assert.equal(welcomeCakeGeometry(false), welcomeCakeGeometry(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// Loot: 19 funny food items (and Gerald the Gnome). ~0.35 m across, origin at
// the centre of the bottom, one merged inked geometry per id (cached, shared).
// Legendary items carry unlit "glow" parts so they read as magical at night.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { LootId } from '../../sim/types';
import { GeoBuilder } from './builder';
import { cachedGeo, inked } from './common';
import { modelMaterial } from './materials';

const BREAD = 0xe0a55a;
const CRUST = 0xc98a3c;
const CHEESE = 0xffd24a;
const LETTUCE = 0x6fcf5a;
const TOMATO = 0xe8473a;
const PATTY = 0x6b3d24;
const PEPPERONI = 0xc0392b;
const GOLD = 0xffcf3a;

function tri(b: GeoBuilder, w: number, len: number, h: number, color: number, y: number, ink = true): void {
  // Wedge pointing +Z (tip) with its back edge at z = -len/2.
  b.extrude(
    [
      [-w / 2, -len / 2],
      [w / 2, -len / 2],
      [0, len / 2],
    ],
    h,
    color,
    { at: [0, y, 0], rot: [Math.PI / 2, 0, 0], ink },
  );
}

function appleCore(): THREE.BufferGeometry {
  const b = inked();
  b.lathe(
    [
      [0.001, 0],
      [0.09, 0.01],
      [0.1, 0.04],
      [0.045, 0.1],
      [0.04, 0.15],
      [0.1, 0.22],
      [0.105, 0.26],
      [0.001, 0.28],
    ],
    10,
    0xf6ecc8,
    {},
  );
  b.cyl(0.1, 0.09, 0.05, 10, 0xd63a2f, { at: [0, 0.03, 0] });
  b.cyl(0.095, 0.1, 0.05, 10, 0xd63a2f, { at: [0, 0.245, 0] });
  b.cyl(0.012, 0.012, 0.07, 5, 0x5a3a22, { at: [0.01, 0.31, 0], rot: [0, 0, 0.3] });
  b.ball(0.035, 0, LETTUCE, { at: [0.045, 0.315, 0], scale: [1.4, 0.4, 0.8], ink: false });
  for (const s of [-1, 1]) b.ball(0.013, 0, 0x2a1a10, { at: [s * 0.03, 0.13, 0.04], ink: false, scale: [1, 1.4, 0.6] });
  return b.build();
}

function sandwich(): THREE.BufferGeometry {
  const b = inked();
  tri(b, 0.34, 0.3, 0.05, 0xf3dcae, 0.03);
  tri(b, 0.36, 0.32, 0.03, LETTUCE, 0.07, false);
  tri(b, 0.33, 0.29, 0.03, 0xf08a9a, 0.095, false);
  tri(b, 0.35, 0.31, 0.02, CHEESE, 0.115, false);
  tri(b, 0.34, 0.3, 0.05, 0xf3dcae, 0.15);
  // bite mark: a darker notch ball
  b.ball(0.05, 0, 0x9a7a52, { at: [0.09, 0.15, 0.06], ink: false, scale: [1, 0.6, 1] });
  return b.build();
}

function donut(icing: number, sprinkles: readonly number[], r = 0.13, glow?: number): THREE.BufferGeometry {
  const b = inked();
  b.torus(r, r * 0.55, 8, 16, BREAD, { at: [0, r * 0.55, 0], rot: [Math.PI / 2, 0, 0] });
  b.torus(r, r * 0.45, 6, 16, icing, { at: [0, r * 0.75, 0], rot: [Math.PI / 2, 0, 0], ink: false, scale: [1.02, 1.02, 0.7], glow });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.3;
    const rr = r * (0.8 + ((i * 7) % 5) * 0.08);
    b.box(0.03, 0.012, 0.012, sprinkles[i % sprinkles.length]!, {
      at: [Math.cos(a) * rr, r * 1.1, Math.sin(a) * rr],
      rot: [0, a * 2.3, 0],
      ink: false,
    });
  }
  return b.build();
}

function fries(): THREE.BufferGeometry {
  const b = inked();
  for (let i = 0; i < 9; i++) {
    const x = ((i % 3) - 1) * 0.05 + ((i * 13) % 7) * 0.004;
    const z = (Math.floor(i / 3) - 1) * 0.035;
    b.box(0.03, 0.2, 0.03, 0xf7d25c, { at: [x, 0.2 + ((i * 5) % 4) * 0.015, z], rot: [z * 2, 0, x * 2.5], ink: i % 2 === 0 });
  }
  b.taper(0.16, 0.11, 0.22, 0.13, 0.2, 0xe03a2e, { at: [0, 0.1, 0] });
  b.box(0.08, 0.06, 0.005, CHEESE, { at: [0, 0.12, 0.066], ink: false });
  return b.build();
}

function bananaPeel(): THREE.BufferGeometry {
  const b = inked();
  b.cyl(0.04, 0.05, 0.14, 7, 0xf5d547, { at: [0, 0.1, 0] });
  b.cyl(0.018, 0.022, 0.04, 5, 0x5a4020, { at: [0, 0.19, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.ball(0.08, 1, i % 2 ? 0xf5d547 : 0xe8c43a, {
      at: [Math.cos(a) * 0.1, 0.025, Math.sin(a) * 0.1],
      scale: [1.5, 0.25, 0.6],
      rot: [0, -a, 0.15],
    });
    b.ball(0.02, 0, 0x6b4a1a, { at: [Math.cos(a) * 0.21, 0.03, Math.sin(a) * 0.21], ink: false });
  }
  return b.build();
}

function pizzaSlice(): THREE.BufferGeometry {
  const b = inked();
  tri(b, 0.32, 0.36, 0.035, CHEESE, 0.02);
  b.cyl(0.035, 0.035, 0.34, 8, CRUST, { at: [0, 0.035, -0.18], rot: [0, 0, Math.PI / 2] });
  const pep: [number, number][] = [
    [-0.06, -0.08],
    [0.06, -0.06],
    [0, 0.04],
    [0.02, -0.12],
  ];
  for (const [x, z] of pep) b.cyl(0.035, 0.035, 0.012, 10, PEPPERONI, { at: [x, 0.043, z], ink: false });
  return b.build();
}

function hotDog(): THREE.BufferGeometry {
  const b = inked();
  b.ball(0.08, 1, BREAD, { at: [-0.045, 0.06, 0], scale: [0.7, 0.8, 2.2] });
  b.ball(0.08, 1, BREAD, { at: [0.045, 0.06, 0], scale: [0.7, 0.8, 2.2] });
  b.cyl(0.04, 0.04, 0.4, 8, 0xc4533a, { at: [0, 0.09, 0], rot: [Math.PI / 2, 0, 0] });
  b.ball(0.04, 0, 0xc4533a, { at: [0, 0.09, 0.2] });
  b.ball(0.04, 0, 0xc4533a, { at: [0, 0.09, -0.2] });
  for (let i = 0; i < 6; i++) b.box(0.05, 0.012, 0.018, CHEESE, { at: [i % 2 ? 0.012 : -0.012, 0.13, -0.15 + i * 0.06], rot: [0, i % 2 ? 0.7 : -0.7, 0], ink: false });
  return b.build();
}

function burger(bun: number, glow?: number): THREE.BufferGeometry {
  const b = inked();
  b.cyl(0.15, 0.13, 0.05, 14, bun, { at: [0, 0.025, 0], glow: undefined });
  b.cyl(0.155, 0.155, 0.05, 14, PATTY, { at: [0, 0.075, 0] });
  b.box(0.27, 0.015, 0.27, CHEESE, { at: [0, 0.105, 0], rot: [0, 0.4, 0], ink: false });
  b.cyl(0.165, 0.165, 0.02, 12, LETTUCE, { at: [0, 0.12, 0], ink: false, jitter: 0.01, seed: 3 });
  b.cyl(0.13, 0.13, 0.02, 12, TOMATO, { at: [0, 0.135, 0], ink: false });
  b.sphere(0.155, 14, 6, bun, { at: [0, 0.145, 0], scale: [1, 0.62, 1], glow });
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4;
    const rr = 0.04 + (i % 3) * 0.035;
    b.ball(0.012, 0, 0xfff3d0, { at: [Math.cos(a) * rr, 0.235 - rr * 0.35, Math.sin(a) * rr], scale: [1, 0.5, 1.5], ink: false });
  }
  return b.build();
}

function drumstick(): THREE.BufferGeometry {
  const b = inked();
  b.ball(0.1, 1, 0xb8662e, { at: [0.05, 0.09, 0], scale: [1.5, 0.95, 1], jitter: 0.008, seed: 4 });
  b.cyl(0.025, 0.03, 0.14, 7, 0xf6efe0, { at: [-0.13, 0.08, 0], rot: [0, 0, Math.PI / 2 + 0.15] });
  b.ball(0.032, 0, 0xf6efe0, { at: [-0.21, 0.09, 0.025] });
  b.ball(0.032, 0, 0xf6efe0, { at: [-0.21, 0.07, -0.025] });
  b.ball(0.04, 0, 0xd88a44, { at: [0.08, 0.16, 0.04], ink: false, scale: [1.3, 0.4, 1] });
  return b.build();
}

function taco(): THREE.BufferGeometry {
  const b = inked();
  // Crescent shell profile (bottom half ring) extruded along X.
  const pts: [number, number][] = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const a = Math.PI + (i / N) * Math.PI;
    pts.push([Math.cos(a) * 0.16, Math.sin(a) * 0.16]);
  }
  for (let i = N; i >= 0; i--) {
    const a = Math.PI + (i / N) * Math.PI;
    pts.push([Math.cos(a) * 0.13, Math.sin(a) * 0.13]);
  }
  b.extrude(pts, 0.1, 0xf2c14e, { at: [0, 0.16, 0], rot: [0, Math.PI / 2, 0] });
  for (let i = 0; i < 7; i++) {
    const z = -0.1 + i * 0.033;
    b.ball(0.035, 0, i % 3 === 0 ? TOMATO : i % 3 === 1 ? LETTUCE : PATTY, { at: [0, 0.1 + (i % 2) * 0.02, z], ink: false, jitter: 0.01, seed: i });
  }
  b.box(0.05, 0.012, 0.22, CHEESE, { at: [0, 0.135, 0], ink: false, rot: [0, 0, 0.2] });
  return b.build();
}

function wholePizza(sauceTop: number, pep: number, crust: number, glowPep?: number): THREE.BufferGeometry {
  const b = inked();
  b.box(0.5, 0.03, 0.5, 0xc9a06a, { at: [0, 0.015, 0] }); // open box base
  b.box(0.5, 0.26, 0.02, 0xc9a06a, { at: [0, 0.15, -0.25], rot: [-0.35, 0, 0] }); // lid
  b.cyl(0.22, 0.22, 0.04, 20, crust, { at: [0, 0.05, 0.01] });
  b.cyl(0.19, 0.19, 0.045, 20, sauceTop, { at: [0, 0.055, 0.01], ink: false });
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9;
    const rr = i === 0 ? 0 : 0.11;
    b.cyl(0.035, 0.035, 0.012, 10, pep, { at: [Math.cos(a) * rr, 0.08, 0.01 + Math.sin(a) * rr], ink: false, glow: glowPep });
  }
  for (const a of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) b.box(0.44, 0.005, 0.006, 0x8a5a2a, { at: [0, 0.079, 0.01], rot: [0, a, 0], ink: false });
  return b.build();
}

function cake(): THREE.BufferGeometry {
  const b = inked();
  b.cyl(0.19, 0.2, 0.02, 16, 0xe8e8f0, { at: [0, 0.01, 0] }); // plate
  b.cyl(0.16, 0.16, 0.12, 16, 0xfbe3ef, { at: [0, 0.08, 0] });
  b.cyl(0.165, 0.165, 0.025, 16, 0xf06ea9, { at: [0, 0.14, 0], ink: false });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.ball(0.025, 0, 0xf06ea9, { at: [Math.cos(a) * 0.16, 0.12, Math.sin(a) * 0.16], scale: [1, 1.6, 1], ink: false });
  }
  b.cyl(0.12, 0.12, 0.08, 14, 0xfbe3ef, { at: [0, 0.19, 0] });
  b.cyl(0.125, 0.125, 0.02, 14, 0x7ad7f0, { at: [0, 0.23, 0], ink: false });
  b.ball(0.035, 0, 0xe8473a, { at: [0.06, 0.25, 0.04] });
  b.cyl(0.012, 0.012, 0.09, 6, 0x7ad7f0, { at: [-0.02, 0.28, 0] });
  b.ball(0.022, 0, 0xffc040, { at: [-0.02, 0.345, 0], scale: [0.8, 1.4, 0.8], ink: false, glow: 0xffd878 });
  return b.build();
}

function fish(body: number, fin: number, glow?: number): THREE.BufferGeometry {
  const b = inked();
  b.ball(0.12, 1, body, { at: [0, 0.1, 0.02], scale: [0.7, 0.9, 1.7], glow });
  b.extrude(
    [
      [0, 0],
      [0.1, 0.1],
      [0.1, -0.1],
    ],
    0.02,
    fin,
    { at: [0, 0.1, -0.18], rot: [0, Math.PI / 2, 0] },
  );
  b.extrude(
    [
      [-0.06, 0],
      [0.06, 0],
      [0, 0.07],
    ],
    0.015,
    fin,
    { at: [0, 0.19, 0.02], rot: [0, Math.PI / 2, 0], ink: false },
  );
  for (const s of [-1, 1]) {
    b.ball(0.028, 0, 0xffffff, { at: [s * 0.075, 0.13, 0.15], ink: false });
    b.ball(0.015, 0, 0x16161c, { at: [s * 0.09, 0.13, 0.16], ink: false });
  }
  for (let i = 0; i < 3; i++) b.torus(0.07 - i * 0.012, 0.006, 3, 10, fin, { at: [0, 0.1, 0.05 - i * 0.06], ink: false, scale: [0.95, 1.25, 1] });
  return b.build();
}

function burrito(): THREE.BufferGeometry {
  const b = inked();
  b.cyl(0.1, 0.1, 0.24, 12, 0xf1dcae, { at: [0, 0.1, 0.06], rot: [Math.PI / 2, 0, 0] });
  b.cyl(0.105, 0.105, 0.2, 12, 0xc8ccd6, { at: [0, 0.1, -0.14], rot: [Math.PI / 2, 0, 0], jitter: 0.008, seed: 2 }); // foil
  b.ball(0.1, 1, 0xf1dcae, { at: [0, 0.1, 0.18], scale: [1, 1, 0.5] });
  b.ball(0.07, 0, 0x7a4a2a, { at: [0, 0.11, 0.23], scale: [1, 1, 0.3], ink: false });
  b.ball(0.035, 0, LETTUCE, { at: [0.03, 0.14, 0.24], ink: false });
  b.ball(0.03, 0, TOMATO, { at: [-0.03, 0.08, 0.24], ink: false });
  return b.build();
}

function ribs(): THREE.BufferGeometry {
  const b = inked();
  b.box(0.34, 0.08, 0.2, 0x8a3a1c, { at: [0, 0.05, 0], jitter: 0.01, seed: 5 });
  b.box(0.35, 0.02, 0.18, 0xb0482a, { at: [0, 0.095, 0], ink: false });
  for (let i = 0; i < 5; i++) {
    b.cyl(0.018, 0.018, 0.08, 6, 0xf6efe0, { at: [-0.14 + i * 0.07, 0.05, 0.13], rot: [Math.PI / 2, 0, 0] });
    b.box(0.012, 0.01, 0.18, 0x5a2410, { at: [-0.105 + i * 0.07, 0.1, 0], ink: false });
  }
  return b.build();
}

function gnome(): THREE.BufferGeometry {
  const b = inked();
  b.cyl(0.07, 0.09, 0.14, 10, 0x3f6fd8, { at: [0, 0.07, 0] });
  b.box(0.05, 0.03, 0.06, 0x5a3a22, { at: [-0.035, 0.015, 0.03] });
  b.box(0.05, 0.03, 0.06, 0x5a3a22, { at: [0.035, 0.015, 0.03] });
  b.ball(0.06, 1, 0xf6c8a8, { at: [0, 0.19, 0.01] });
  b.cone(0.07, 0.1, 8, 0xffffff, { at: [0, 0.145, 0.045], rot: [Math.PI, 0, 0], scale: [1, 1, 0.5] }); // beard
  b.ball(0.02, 0, 0xf09a8a, { at: [0, 0.195, 0.065] });
  b.cone(0.07, 0.16, 10, 0xd63a2f, { at: [0, 0.29, -0.01], rot: [-0.2, 0, 0] });
  return b.build();
}

const BUILDERS: Record<LootId, () => THREE.BufferGeometry> = {
  appleCore,
  sandwich,
  donut: () => donut(0xf49ac1, [0xffffff, 0x7ad7f0, 0xffd24a, 0x6fcf5a], 0.13),
  fries,
  bananaPeel,
  pizzaSlice,
  hotDog,
  burger: () => burger(BREAD),
  drumstick,
  taco,
  pizza: () => wholePizza(0xf7c948, PEPPERONI, CRUST),
  cake,
  goldenFish: () => fish(GOLD, 0xf0a020),
  burrito,
  ribs,
  forbiddenDonut: () => donut(0x9b4dff, [0x6dff8a, 0xffffff, 0xff5ad1], 0.16, 0xb070ff),
  goldenBurger: () => burger(GOLD, 0xffe07a),
  midnightPizza: () => wholePizza(0x3a2a7a, 0xffe86a, 0x5a3aa0, 0xfff2a0),
  gnome,
};

export const LOOT_MODEL_IDS = Object.keys(BUILDERS) as LootId[];

export function lootGeometry(item: LootId): THREE.BufferGeometry {
  const make = BUILDERS[item] ?? BUILDERS.appleCore;
  return cachedGeo('loot|' + item, make);
}

/** Loot item mesh (shared geometry + material): origin at the centre of its bottom. */
export function createLoot(item: LootId): THREE.Object3D {
  const m = new THREE.Mesh(lootGeometry(item), modelMaterial());
  m.name = 'loot:' + item;
  return m;
}

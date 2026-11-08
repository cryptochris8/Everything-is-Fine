/**
 * Models for the 2026-11-07 encounters, in the same inked low-poly toon kit as yard.ts
 * (GeoBuilder + modelMaterial): Admiral Biscuit and his robot vacuum, Granny's welcome cake
 * (whole and squirrel-eaten), a roof squirrel, Earl's ladder and Linda's HOA forms.
 * Local frame: +Z forward, origin on the ground. Every builder is cached by key.
 */
import type * as THREE from 'three';

import { GeoBuilder, shadeHex } from './render/models/builder';
import { cachedGeo, eyeParts } from './render/models/common';

/** The robot vacuum Admiral Biscuit rides: a dark disc with a glowing status light. */
export function robotVacuumGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|robotVacuum', () => {
    const b = new GeoBuilder(true);
    b.cyl(0.37, 0.39, 0.1, 22, 0x3a3f4a, { at: [0, 0.07, 0] });
    b.cyl(0.31, 0.33, 0.035, 22, 0x6b7380, { at: [0, 0.135, 0] });
    b.box(0.3, 0.06, 0.06, 0x2b2f38, { at: [0, 0.07, 0.35] }); // front bumper
    b.ball(0.035, 1, 0x4fc3ff, { at: [0, 0.16, 0.24], glow: 0x4fc3ff });
    b.ball(0.025, 1, 0x7cfc6a, { at: [0.12, 0.16, 0.22], glow: 0x7cfc6a });
    for (const sx of [-1, 1]) {
      b.cyl(0.05, 0.05, 0.03, 8, 0x22252b, { at: [sx * 0.24, 0.025, 0.18] }); // side brushes
    }
    return b.build();
  });
}

/** Admiral Biscuit: an orange tabby loaf in a tiny navy bicorne. Sits on the vacuum (y 0.15). */
export function admiralCatGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|admiralCat', () => {
    const b = new GeoBuilder(true);
    const fur = 0xf2a04a;
    const cream = 0xfbe3c4;
    const stripe = shadeHex(fur, 0.78);
    const navy = 0x1f2d5a;
    const gold = 0xf2c94c;
    b.sphere(0.2, 12, 8, fur, { at: [0, 0.3, -0.04], scale: [0.95, 0.82, 1.2], smooth: true }); // loaf
    b.sphere(0.12, 10, 6, cream, { at: [0, 0.28, 0.13], scale: [1, 0.9, 0.7], smooth: true }); // chest
    for (const z of [-0.16, -0.06, 0.04]) {
      b.box(0.3, 0.025, 0.04, stripe, { ink: false, at: [0, 0.45, z] });
    }
    b.sphere(0.15, 12, 8, fur, { at: [0, 0.52, 0.15], smooth: true }); // head
    for (const sx of [-1, 1]) {
      b.cone(0.06, 0.12, 4, fur, { at: [sx * 0.085, 0.67, 0.13], rot: [0, 0, sx * -0.3] });
      b.cone(0.03, 0.07, 4, 0xf3b8b8, { ink: false, at: [sx * 0.085, 0.66, 0.155], rot: [0, 0, sx * -0.3] });
    }
    b.sphere(0.06, 8, 5, cream, { at: [0, 0.47, 0.27], scale: [1.3, 0.8, 0.8], smooth: true }); // muzzle
    b.ball(0.02, 0, 0xf08a8a, { at: [0, 0.5, 0.31] }); // nose
    eyeParts(b, [-0.06, 0.55, 0.26], 0.035);
    eyeParts(b, [0.06, 0.55, 0.26], 0.035);
    // Tail wrapped round the loaf.
    b.cyl(0.04, 0.035, 0.3, 6, fur, { at: [0.2, 0.2, -0.05], rot: [Math.PI / 2, 0, 0.15] });
    b.cyl(0.035, 0.03, 0.2, 6, stripe, { at: [0.15, 0.2, 0.15], rot: [Math.PI / 2, -0.7, 0] });
    // The admiral's bicorne.
    b.sphere(0.12, 10, 6, navy, { at: [0, 0.69, 0.13], scale: [1.55, 0.6, 0.5], smooth: true });
    b.box(0.34, 0.025, 0.03, gold, { at: [0, 0.665, 0.19] });
    b.ball(0.03, 1, gold, { at: [0.09, 0.72, 0.19] });
    return b.build();
  });
}

/** Granny's welcome cake on a plate: two pink tiers, cherries and one candle. */
export function welcomeCakeGeometry(eaten: boolean): THREE.BufferGeometry {
  return cachedGeo(`eif|cake|${eaten ? 'eaten' : 'whole'}`, () => {
    const b = new GeoBuilder(true);
    b.cyl(0.3, 0.27, 0.03, 20, 0xf4f4f4, { at: [0, 0.015, 0] });
    if (eaten) {
      // What the squirrels left: a lopsided stump of bottom tier and crumbs.
      b.cyl(0.17, 0.2, 0.09, 9, 0xfde2ec, { at: [-0.05, 0.075, 0.02], rot: [0.12, 0.4, 0.08] });
      b.cyl(0.12, 0.15, 0.05, 8, 0xc98b5a, { ink: false, at: [-0.05, 0.13, 0.02], rot: [0.12, 0.4, 0.08] });
      for (const [x, z] of [[0.18, 0.1], [0.14, -0.15], [-0.2, -0.16], [0.05, 0.21], [-0.22, 0.12]] as const) {
        b.ball(0.025, 0, 0xfde2ec, { at: [x, 0.045, z] });
      }
      return b.build();
    }
    b.cyl(0.24, 0.24, 0.16, 20, 0xfde2ec, { at: [0, 0.11, 0] }); // bottom tier
    b.torus(0.24, 0.025, 5, 20, 0xffffff, { at: [0, 0.19, 0], rot: [Math.PI / 2, 0, 0] }); // frosting rim
    b.cyl(0.16, 0.16, 0.12, 18, 0xfff6e0, { at: [0, 0.25, 0] }); // top tier
    b.torus(0.16, 0.02, 5, 18, 0xf6a6c1, { at: [0, 0.31, 0], rot: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.ball(0.03, 1, 0xd8253a, { at: [Math.cos(a) * 0.2, 0.21, Math.sin(a) * 0.2] }); // cherries
    }
    b.cyl(0.014, 0.014, 0.11, 6, 0x7fd3ff, { at: [0, 0.37, 0] }); // candle
    b.ball(0.024, 1, 0xffc94a, { at: [0, 0.44, 0], glow: 0xffc94a });
    return b.build();
  });
}

/** One of Granny's organizing squirrels. Faces +Z, ~0.3 m tall. */
export function squirrelGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|squirrel', () => {
    const b = new GeoBuilder(true);
    const fur = 0x9a6b43;
    b.sphere(0.08, 9, 6, fur, { at: [0, 0.1, 0], scale: [0.85, 1.1, 1], smooth: true });
    b.sphere(0.06, 8, 5, 0xe9d2b4, { at: [0, 0.1, 0.05], scale: [0.8, 1, 0.6], smooth: true }); // belly
    b.sphere(0.06, 9, 6, fur, { at: [0, 0.21, 0.04], smooth: true });
    for (const sx of [-1, 1]) {
      b.cone(0.022, 0.05, 4, fur, { at: [sx * 0.035, 0.27, 0.03] });
    }
    eyeParts(b, [-0.025, 0.225, 0.09], 0.018);
    eyeParts(b, [0.025, 0.225, 0.09], 0.018);
    b.sphere(0.08, 9, 6, shadeHex(fur, 1.15), { at: [0, 0.2, -0.11], scale: [0.6, 1.7, 0.7], rot: [-0.35, 0, 0], smooth: true }); // tail
    return b.build();
  });
}

/** Earl's aluminium step ladder, 3.4 m, standing on its feet along +Y. */
export function ladderGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|ladder', () => {
    const b = new GeoBuilder(true);
    const rail = 0xc3ccd6;
    for (const sx of [-1, 1]) {
      b.box(0.06, 3.4, 0.05, rail, { at: [sx * 0.24, 1.7, 0] });
      b.box(0.09, 0.06, 0.09, 0xe8473a, { at: [sx * 0.24, 0.03, 0] }); // rubber feet
    }
    for (let y = 0.3; y < 3.35; y += 0.3) {
      b.box(0.48, 0.035, 0.045, shadeHex(rail, 0.92), { at: [0, y, 0] });
    }
    b.box(0.56, 0.04, 0.06, 0xe8473a, { at: [0, 3.38, 0] }); // "NOT A STEP" cap
    return b.build();
  });
}

/** Linda's annual compliance forms: a tall stack with a binder clip and a red HOA tab. */
export function formsGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|forms', () => {
    const b = new GeoBuilder(true);
    for (let k = 0; k < 5; k++) {
      b.box(0.3, 0.035, 0.4, k % 2 ? 0xffffff : 0xf3f1ea, { ink: k === 0, at: [Math.sin(k * 1.7) * 0.012, 0.018 + k * 0.035, Math.cos(k * 2.3) * 0.012], rot: [0, Math.sin(k * 3.1) * 0.06, 0] });
    }
    b.box(0.12, 0.05, 0.05, 0x22252b, { at: [0, 0.16, 0.19] }); // binder clip
    b.box(0.06, 0.02, 0.1, 0xd63a2f, { at: [0.12, 0.185, 0.12] }); // HOA tab
    b.box(0.2, 0.004, 0.05, 0x5a6b8c, { ink: false, at: [0, 0.178, -0.08] }); // printed heading
    return b.build();
  });
}

/** A single loose sheet (flutters around the forms in the wind). */
export function sheetGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|sheet', () => {
    const b = new GeoBuilder(true);
    b.box(0.21, 0.006, 0.28, 0xffffff, { at: [0, 0.003, 0] });
    b.box(0.15, 0.002, 0.02, 0x5a6b8c, { ink: false, at: [0, 0.007, -0.1] });
    return b.build();
  });
}

/**
 * Pleasant Pines originals in the shared inked low-poly toon style (GeoBuilder + modelMaterial,
 * the same kit as the ported Trash Panda / Bad Hair Day models): things none of those games
 * had — Granny's golf cart, the Mow-Bot, Todd's trampoline, Randy's kettle grill, moving
 * boxes, the gnome and the burger platter. Every builder returns a geometry cached by key;
 * meshes share one material. Local frame: +Z forward, origin on the ground.
 */
import * as THREE from 'three';

import { GeoBuilder, shadeHex } from './render/models/builder';
import { cachedGeo, eyeParts } from './render/models/common';
import { modelMaterial } from './render/models/materials';

const RZ: [number, number, number] = [0, 0, Math.PI / 2];

export function yardMesh(geo: THREE.BufferGeometry, name: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, modelMaterial());
  m.name = name;
  m.castShadow = true;
  return m;
}

function wheel(b: GeoBuilder, x: number, y: number, z: number, r: number, w: number, hub = 0xd8d8de): void {
  b.cyl(r, r, w, 12, 0x26262b, { at: [x, y, z], rot: RZ });
  b.cyl(r * 0.55, r * 0.55, w + 0.03, 10, hub, { ink: false, at: [x, y, z], rot: RZ });
}

/** Granny's pink golf cart (she drives it through her own garden, and Linda's hedges). */
export function golfCartGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|golfCart', () => {
    const b = new GeoBuilder(true);
    const pink = 0xf2a6c8;
    const white = 0xfdfaf2;
    b.box(1.3, 0.4, 2.3, white, { at: [0, 0.55, 0] });
    b.box(1.3, 0.35, 0.7, pink, { at: [0, 0.6, 1.0], rot: [-0.15, 0, 0] }); // nose
    b.box(1.22, 0.16, 0.75, pink, { at: [0, 0.85, -0.05] }); // seat
    b.box(1.22, 0.55, 0.14, pink, { at: [0, 1.15, -0.4], rot: [-0.12, 0, 0] }); // backrest
    b.box(1.1, 0.4, 0.6, 0xc9c2b2, { at: [0, 0.95, -0.85] }); // bag well
    for (const sx of [-1, 1]) {
      b.cyl(0.03, 0.03, 1.3, 6, 0xc0c4cc, { at: [sx * 0.6, 1.4, 0.75], rot: [0.1, 0, 0] });
      b.cyl(0.03, 0.03, 1.3, 6, 0xc0c4cc, { at: [sx * 0.6, 1.4, -0.9] });
    }
    b.box(1.45, 0.08, 2.05, pink, { at: [0, 2.06, -0.08] }); // canopy
    b.box(1.47, 0.12, 0.06, white, { at: [0, 2.0, 0.95] }); // canopy trim
    b.cyl(0.17, 0.17, 0.035, 12, 0x2b2b30, { at: [-0.3, 1.25, 0.55], rot: [-1.0, 0, 0] }); // steering wheel
    b.cyl(0.025, 0.025, 0.45, 6, 0x2b2b30, { at: [-0.3, 1.05, 0.68], rot: [0.55, 0, 0] });
    b.ball(0.07, 1, 0xfff3b0, { at: [-0.45, 0.65, 1.32], glow: 0xfff3b0 }); // headlights
    b.ball(0.07, 1, 0xfff3b0, { at: [0.45, 0.65, 1.32], glow: 0xfff3b0 });
    for (const sx of [-1, 1]) {
      wheel(b, sx * 0.64, 0.26, 0.8, 0.26, 0.18);
      wheel(b, sx * 0.64, 0.26, -0.78, 0.26, 0.18);
    }
    // Fuzzy dice. Of course Granny has fuzzy dice.
    b.box(0.08, 0.08, 0.08, 0xffffff, { at: [0.08, 1.82, 0.85], rot: [0.4, 0.3, 0] });
    b.box(0.08, 0.08, 0.08, 0xd63a2f, { at: [-0.04, 1.78, 0.86], rot: [0.2, 0.7, 0] });
    return b.build();
  });
}

/** The Mow-Bot: a red robot mower with big worried eyes and an antenna. */
export function mowBotGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|mowBot', () => {
    const b = new GeoBuilder(true);
    const red = 0xe8473a;
    b.box(1.0, 0.32, 1.3, red, { at: [0, 0.36, 0] });
    b.taper(0.95, 1.2, 0.7, 0.85, 0.22, shadeHex(red, 1.08), { at: [0, 0.63, -0.02] });
    b.box(0.5, 0.08, 0.3, 0x2b2b30, { at: [0, 0.76, -0.35] }); // control panel
    b.ball(0.05, 1, 0x7cfc6a, { at: [0.12, 0.81, -0.35], glow: 0x7cfc6a });
    b.ball(0.05, 1, 0xffd23f, { at: [-0.12, 0.81, -0.35], glow: 0xffd23f });
    // Face on the front.
    eyeParts(b, [-0.2, 0.47, 0.66], 0.1);
    eyeParts(b, [0.2, 0.47, 0.66], 0.1);
    b.box(0.5, 0.06, 0.04, 0x2b2b30, { at: [0, 0.3, 0.66] }); // grille "mouth"
    b.cyl(0.015, 0.015, 0.55, 5, 0x9aa3ad, { at: [0.35, 1.0, -0.45] }); // antenna
    b.ball(0.05, 1, 0xff3b30, { at: [0.35, 1.29, -0.45], glow: 0xff3b30 });
    for (const sx of [-1, 1]) {
      wheel(b, sx * 0.54, 0.2, 0.42, 0.2, 0.14, 0xffd23f);
      wheel(b, sx * 0.54, 0.2, -0.42, 0.2, 0.14, 0xffd23f);
    }
    return b.build();
  });
}

/** Todd's trampoline: frame, blue safety pad, black mat, legs. Mat at ~0.8 m. */
export function trampolineGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|trampoline', () => {
    const b = new GeoBuilder(true);
    b.cyl(2.05, 2.05, 0.05, 24, 0x1b1b2a, { at: [0, 0.8, 0] });
    b.torus(2.12, 0.13, 6, 28, 0x2e86de, { at: [0, 0.83, 0], rot: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.cyl(0.045, 0.045, 0.8, 6, 0x9aa3ad, { at: [Math.cos(a) * 2.05, 0.4, Math.sin(a) * 2.05] });
      b.box(0.1, 0.05, 0.4, 0x9aa3ad, { at: [Math.cos(a) * 2.05, 0.03, Math.sin(a) * 2.05], rot: [0, -a, 0] });
    }
    return b.build();
  });
}

/** Randy's kettle grill (bowl, lid hinge, legs, side shelf). Grate at ~0.95 m. */
export function kettleGrillGeometry(ruined: boolean): THREE.BufferGeometry {
  return cachedGeo(`eif|kettle|${ruined ? 1 : 0}`, () => {
    const b = new GeoBuilder(true);
    const body = ruined ? 0x3b2a20 : 0x24242a;
    // Open bowl (lower hemisphere) so the burgers on the grate stay visible…
    b.add(new THREE.SphereGeometry(0.55, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), body, { at: [0, 0.95, 0], scale: [1, 0.85, 1], smooth: true });
    // …and the domed lid hung open on its side hook.
    b.add(new THREE.SphereGeometry(0.5, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2), body, { at: [-0.72, 0.85, 0], rot: [0, 0, Math.PI / 2 + 0.15], scale: [1, 0.7, 1], smooth: true });
    b.ball(0.05, 0, 0x9aa3ad, { at: [-0.56, 1.05, 0] }); // lid hook
    b.torus(0.55, 0.03, 4, 18, 0x9aa3ad, { at: [0, 0.96, 0], rot: [Math.PI / 2, 0, 0] });
    b.cyl(0.52, 0.52, 0.02, 16, 0x5a5a62, { ink: false, at: [0, 0.94, 0] }); // grate
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      b.cyl(0.03, 0.03, 0.82, 5, 0x55555a, { at: [Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3], rot: [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18] });
    }
    b.box(0.55, 0.04, 0.32, 0xb07a45, { at: [0.78, 0.86, 0] }); // side shelf
    b.cyl(0.05, 0.05, 0.08, 8, 0x8a6a4a, { at: [0, 0.4, 0] }); // ash catcher
    b.cyl(0.18, 0.2, 0.04, 10, 0x9aa3ad, { at: [0, 0.4, 0] });
    if (ruined) {
      b.ball(0.12, 0, 0x1a1a1a, { at: [0.15, 1.0, 0.1] });
    }
    return b.build();
  });
}

/** A camp stove (the grill's replacement after it's ruined). */
export function campStoveGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|campStove', () => {
    const b = new GeoBuilder(true);
    b.box(0.55, 0.2, 0.32, 0x2e86c1, { at: [0, 0.1, 0] });
    b.box(0.55, 0.22, 0.03, 0x2e86c1, { at: [0, 0.3, -0.16], rot: [-0.3, 0, 0] });
    for (const x of [-0.13, 0.13]) b.torus(0.08, 0.015, 4, 10, 0x3a3a40, { at: [x, 0.21, 0.02], rot: [Math.PI / 2, 0, 0] });
    return b.build();
  });
}

/** A stack of moving boxes with tape stripes (the player's, day 1). */
export function movingBoxesGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|boxes', () => {
    const b = new GeoBuilder(true);
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, yaw: number, c: number) => {
      b.box(w, h, d, c, { at: [x, y + h / 2, z], rot: [0, yaw, 0], shade: 0.04, seed: Math.round(x * 10) });
      b.box(w * 0.18, h + 0.005, d + 0.01, 0xe8d8a8, { ink: false, at: [x, y + h / 2, z], rot: [0, yaw, 0] });
    };
    box(0.9, 0.7, 0.9, 0, 0, 0, 0, 0xc8a26a);
    box(0.9, 0.7, 0.9, 1, 0, 0.2, 0.3, 0xc09660);
    box(0.7, 0.55, 0.7, 0.4, 0.7, 0.1, 0.5, 0xd4ae78);
    return b.build();
  });
}

/** Gerald-style garden gnome (bigger than a lawn gnome: he's a plot point). */
export function gnomeGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|gnome', () => {
    const b = new GeoBuilder(true);
    b.cyl(0.16, 0.2, 0.35, 10, 0x2e86c1, { at: [0, 0.18, 0] });
    b.box(0.34, 0.05, 0.08, 0x5a3a2a, { at: [0, 0.2, 0.0] }); // belt
    b.ball(0.13, 1, 0xffdbac, { at: [0, 0.45, 0] });
    b.ball(0.045, 0, 0xf08a8a, { at: [0, 0.44, 0.13] }); // nose
    b.cone(0.15, 0.26, 8, 0xffffff, { at: [0, 0.32, 0.08], rot: [Math.PI, 0, 0], scale: [1, 1, 0.55] }); // beard
    b.cone(0.15, 0.38, 8, 0xe74c3c, { at: [0, 0.69, -0.02], rot: [-0.18, 0, 0] });
    eyeParts(b, [-0.05, 0.49, 0.1], 0.025);
    eyeParts(b, [0.05, 0.49, 0.1], 0.025);
    return b.build();
  });
}

/** The burger platter base (burgers are separate so they can change colour by state). */
export function platterGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|platter', () => {
    const b = new GeoBuilder(true);
    b.cyl(0.44, 0.38, 0.05, 20, 0xe6ebee, { at: [0, 0.03, 0] });
    b.torus(0.42, 0.02, 4, 20, 0xc9d1d6, { ink: false, at: [0, 0.055, 0], rot: [Math.PI / 2, 0, 0] });
    return b.build();
  });
}

/** One burger (bun-patty-bun), patty colour baked per state. */
export function burgerGeometry(patty: number, bun: number): THREE.BufferGeometry {
  return cachedGeo(`eif|burger|${patty}|${bun}`, () => {
    const b = new GeoBuilder(true);
    b.cyl(0.11, 0.1, 0.04, 10, bun, { at: [0, 0.02, 0] });
    b.cyl(0.115, 0.115, 0.04, 10, patty, { at: [0, 0.06, 0] });
    b.cyl(0.12, 0.12, 0.012, 10, 0x6fcf5a, { ink: false, at: [0, 0.085, 0] }); // lettuce
    b.sphere(0.11, 10, 4, bun, { at: [0, 0.09, 0], scale: [1, 0.7, 1], smooth: true });
    return b.build();
  });
}

/** A plump white hen (Earl's escape-artist chickens). Faces +Z. */
export function chickenGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|chicken', () => {
    const b = new GeoBuilder(true);
    b.sphere(0.24, 10, 7, 0xfdfaf2, { at: [0, 0.32, -0.02], scale: [0.9, 0.85, 1.1], smooth: true });
    b.cone(0.12, 0.22, 6, 0xf1ece0, { at: [0, 0.45, -0.25], rot: [-0.9, 0, 0] }); // tail
    for (const sx of [-1, 1]) b.sphere(0.12, 8, 5, 0xefe8da, { at: [sx * 0.2, 0.33, -0.02], scale: [0.35, 0.8, 1.2], smooth: true }); // wings
    b.sphere(0.13, 10, 6, 0xfdfaf2, { at: [0, 0.56, 0.17], smooth: true });
    b.box(0.03, 0.1, 0.14, 0xe74c3c, { at: [0, 0.71, 0.16] }); // comb
    b.cone(0.045, 0.1, 5, 0xf39c12, { at: [0, 0.54, 0.31], rot: [Math.PI / 2, 0, 0] }); // beak
    b.ball(0.03, 0, 0xe74c3c, { at: [0, 0.48, 0.27] }); // wattle
    b.ball(0.022, 0, 0x16161c, { ink: false, at: [-0.075, 0.59, 0.27] });
    b.ball(0.022, 0, 0x16161c, { ink: false, at: [0.075, 0.59, 0.27] });
    for (const sx of [-1, 1]) {
      b.cyl(0.015, 0.015, 0.18, 4, 0xf39c12, { at: [sx * 0.07, 0.09, 0] });
      b.box(0.08, 0.015, 0.1, 0xf39c12, { at: [sx * 0.07, 0.008, 0.03] });
    }
    return b.build();
  });
}

/**
 * Earl's workshop garage: open front (−Z, toward the street), siding walls with trim and a
 * window per side, gable roof, rolled-up door, header for the sign, pegboard with tools.
 * Footprint 8.4 × 9 (walls at x = ±4.2, back wall at z = +4.4), walls 3.6 high.
 */
export function workshopGeometry(): THREE.BufferGeometry {
  return cachedGeo('eif|workshop', () => {
    const b = new GeoBuilder(true);
    const wall = 0xd8c48a;
    const trim = 0xf5f0d0;
    const roof = 0x6d5a3a;
    b.box(8.4, 0.03, 9, 0x9a9a9e, { ink: false, at: [0, 0.02, 0] }); // concrete floor
    b.box(8.4, 3.6, 0.3, wall, { at: [0, 1.8, 4.4], shade: 0.03, seed: 3 });
    for (const sx of [-1, 1]) {
      b.box(0.3, 3.6, 9, wall, { at: [sx * 4.2, 1.8, 0], shade: 0.03, seed: 4 + sx });
      // Window per side.
      b.box(0.06, 1.0, 1.6, 0x9fd6ff, { ink: false, at: [sx * 4.36, 2.1, 0.6] });
      b.box(0.1, 1.2, 0.12, trim, { at: [sx * 4.38, 2.1, -0.26] });
      b.box(0.1, 1.2, 0.12, trim, { at: [sx * 4.38, 2.1, 1.46] });
      b.box(0.1, 0.12, 1.85, trim, { at: [sx * 4.38, 2.66, 0.6] });
      b.box(0.1, 0.12, 1.85, trim, { at: [sx * 4.38, 1.54, 0.6] });
      // Corner boards.
      b.box(0.36, 3.6, 0.18, trim, { at: [sx * 4.2, 1.8, -4.45] });
      b.box(0.36, 3.6, 0.18, trim, { at: [sx * 4.2, 1.8, 4.45] });
    }
    b.box(8.7, 0.7, 0.3, wall, { at: [0, 3.25, -4.45] }); // header over the opening (sign goes here)
    b.box(8.8, 0.12, 0.34, trim, { at: [0, 2.9, -4.45] });
    b.cyl(0.25, 0.25, 7.6, 10, 0xb9b2a2, { at: [0, 2.6, -4.2], rot: RZ }); // rolled-up door
    b.gable(9.2, 1.6, 9.8, roof, { at: [0, 3.6, 0] });
    // Pegboard + tools on the back wall.
    b.box(3.2, 1.4, 0.05, 0xc8a26a, { at: [-1.5, 2.0, 4.22] });
    b.box(0.08, 0.6, 0.05, 0x9aa3ad, { ink: false, at: [-2.5, 2.1, 4.18], rot: [0, 0, 0.3] }); // wrench
    b.box(0.5, 0.08, 0.05, 0xd63a2f, { ink: false, at: [-1.6, 2.4, 4.18] }); // hammer head
    b.box(0.06, 0.5, 0.05, 0x8a6a4a, { ink: false, at: [-1.6, 2.15, 4.18] });
    b.cyl(0.18, 0.18, 0.05, 12, 0xffd23f, { ink: false, at: [-0.6, 1.9, 4.18], rot: [Math.PI / 2, 0, 0] }); // saw blade
    // A suspicious contraption under a tarp in the corner.
    b.sphere(0.8, 8, 5, 0x5a7ab0, { at: [2.8, 0.47, 3.2], scale: [1, 0.58, 1.2], shade: 0.08, seed: 9 });
    return b.build();
  });
}

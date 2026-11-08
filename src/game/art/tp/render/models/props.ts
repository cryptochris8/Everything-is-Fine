// ─────────────────────────────────────────────────────────────────────────────
// Individual props (not instanced): parked cars, pickups, vans, swing sets,
// sandbox, kiddie pool, lawn chair, grill, shed, doghouse, picnic table, pond,
// bridge, culvert. Toy-like, rounded, no ink (scenery). Facing +Z. Geometry and
// materials are cached & shared — just remove the object from the scene; don't
// dispose (or use disposeObject(), which skips shared resources).
// createProp() also accepts the instancable kinds (wraps sceneryGeometry()).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { PropKind } from '../../sim/types';
import { GeoBuilder, shadeHex } from './builder';
import { cachedGeo, plain } from './common';
import { modelMaterial, sceneryMaterial } from './materials';
import { sceneryGeometry } from './scenery';

const CAR_COLORS = [0xe8473a, 0x3f7fd8, 0xf2c14e, 0x6fcf8c, 0xf4f0e8, 0x9a7aea, 0xff8a4a, 0x4a5a6a] as const;
const GLASS = 0x2a3452;
const TYRE = 0x222228;

function wheels(b: GeoBuilder, xs: readonly number[], zs: readonly number[], r: number): void {
  for (const x of xs)
    for (const z of zs) {
      b.cyl(r, r, 0.24, 12, TYRE, { at: [x, r, z], rot: [0, 0, Math.PI / 2] });
      b.cyl(r * 0.55, r * 0.55, 0.26, 10, 0xc8ccd6, { at: [x, r, z], rot: [0, 0, Math.PI / 2] });
    }
}

function car(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = CAR_COLORS[v % CAR_COLORS.length]!;
  // Rounded toy sedan ~4.1 × 1.8.
  b.taper(1.8, 4.0, 1.75, 3.9, 0.55, c, { at: [0, 0.62, 0] });
  b.sphere(0.9, 14, 8, c, { at: [0, 0.9, 1.25], scale: [1, 0.32, 0.95] });
  b.sphere(0.9, 14, 8, c, { at: [0, 0.9, -1.35], scale: [1, 0.32, 0.75] });
  b.taper(1.6, 2.2, 1.3, 1.5, 0.62, GLASS, { at: [0, 1.2, -0.2], sz: -0.1 });
  b.taper(1.66, 2.26, 1.36, 1.5, 0.08, c, { at: [0, 1.55, -0.22], sz: -0.1 });
  b.box(0.08, 0.5, 0.06, c, { at: [0, 1.2, -0.2] }); // B-pillar hint
  wheels(b, [-0.86, 0.86], [-1.25, 1.3], 0.34);
  for (const s of [-1, 1]) {
    b.sphere(0.12, 8, 6, 0xfff4c8, { at: [s * 0.62, 0.78, 2.0], scale: [1.2, 0.8, 0.4] });
    b.box(0.3, 0.1, 0.05, 0x9a1a1a, { at: [s * 0.62, 0.8, -2.0] });
    b.box(0.08, 0.06, 0.2, shadeHex(c, 0.7), { at: [s * 0.92, 1.05, 0.55] }); // mirrors
  }
  b.box(1.7, 0.14, 0.12, 0xc8ccd6, { at: [0, 0.45, 2.02] });
  b.box(1.7, 0.14, 0.12, 0xc8ccd6, { at: [0, 0.45, -2.02] });
  return b.build();
}

function pickup(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = CAR_COLORS[(v + 3) % CAR_COLORS.length]!;
  b.box(1.9, 0.6, 4.8, c, { at: [0, 0.75, 0] });
  b.taper(1.85, 1.8, 1.7, 1.4, 0.75, c, { at: [0, 1.42, 0.55] });
  b.taper(1.75, 1.7, 1.55, 1.2, 0.5, GLASS, { at: [0, 1.45, 0.58], sz: 0.05, scale: [1.02, 1, 1.04] });
  b.box(1.9, 0.5, 0.08, c, { at: [0, 1.25, -2.35] });
  for (const s of [-1, 1]) b.box(0.08, 0.5, 2.0, c, { at: [s * 0.91, 1.25, -1.3] });
  b.box(1.8, 0.05, 2.0, 0x3a3a40, { at: [0, 1.06, -1.3] });
  b.box(0.6, 0.35, 0.5, 0xb07a45, { at: [0.3, 1.25, -1.4] }); // crate in the bed
  wheels(b, [-0.9, 0.9], [-1.5, 1.55], 0.4);
  for (const s of [-1, 1]) b.box(0.32, 0.18, 0.06, 0xfff4c8, { at: [s * 0.65, 0.9, 2.42] });
  return b.build();
}

function van(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = CAR_COLORS[(v + 5) % CAR_COLORS.length]!;
  b.box(1.95, 1.55, 4.6, c, { at: [0, 1.25, -0.1] });
  b.taper(1.95, 1.0, 1.9, 0.6, 0.9, c, { at: [0, 0.95, 2.5] });
  b.box(1.8, 0.62, 0.06, GLASS, { at: [0, 1.65, 2.18], rot: [-0.25, 0, 0] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.box(0.06, 0.5, 0.9, GLASS, { at: [s * 0.98, 1.6, 1.2 - i * 1.3] });
  b.box(1.95, 0.12, 4.6, shadeHex(c, 0.8), { at: [0, 1.0, -0.1] });
  wheels(b, [-0.92, 0.92], [-1.6, 1.8], 0.38);
  for (const s of [-1, 1]) b.box(0.3, 0.18, 0.06, 0xfff4c8, { at: [s * 0.65, 0.95, 2.97] });
  return b.build();
}

function swingSet(): THREE.BufferGeometry {
  const b = plain();
  const c = 0x3f7fd8;
  for (const x of [-1.5, 1.5])
    for (const z of [-0.6, 0.6]) b.cyl(0.06, 0.06, 2.4, 6, c, { at: [x, 1.15, z * 0.5], rot: [z > 0 ? 0.25 : -0.25, 0, 0] });
  b.cyl(0.07, 0.07, 3.2, 6, c, { at: [0, 2.3, 0], rot: [0, 0, Math.PI / 2] });
  for (const x of [-0.7, 0.7]) {
    b.box(0.02, 1.7, 0.02, 0x8a8a92, { at: [x - 0.2, 1.45, 0] });
    b.box(0.02, 1.7, 0.02, 0x8a8a92, { at: [x + 0.2, 1.45, 0] });
    b.box(0.5, 0.05, 0.22, x < 0 ? 0xe8473a : 0xf2c14e, { at: [x, 0.6, 0] });
  }
  return b.build();
}

function sandbox(): THREE.BufferGeometry {
  const b = plain();
  for (const [x, z, w, d] of [
    [0, 1, 2.2, 0.15],
    [0, -1, 2.2, 0.15],
    [1.05, 0, 0.15, 2.0],
    [-1.05, 0, 0.15, 2.0],
  ] as const)
    b.box(w, 0.3, d, 0xb07a45, { at: [x, 0.15, z] });
  b.box(2.0, 0.2, 1.9, 0xf2dca0, { at: [0, 0.1, 0], jitter: 0.02, seed: 2 });
  b.cone(0.18, 0.3, 6, 0xe8473a, { at: [0.4, 0.35, 0.3], rot: [Math.PI, 0, 0] }); // bucket
  b.box(0.08, 0.02, 0.4, 0x3f7fd8, { at: [-0.4, 0.22, -0.2], rot: [0, 0.5, 0] }); // shovel
  return b.build();
}

function kiddiePool(): THREE.BufferGeometry {
  const b = plain();
  b.torus(0.95, 0.18, 6, 18, 0x7ad7f0, { at: [0, 0.18, 0], rot: [Math.PI / 2, 0, 0] });
  b.cyl(0.95, 0.95, 0.12, 18, 0x4aa8e0, { at: [0, 0.14, 0] });
  b.ball(0.18, 1, 0xf2c14e, { at: [0.3, 0.3, 0.2], scale: [1, 0.7, 1] }); // rubber duck body
  b.ball(0.1, 0, 0xf2c14e, { at: [0.3, 0.46, 0.33] });
  b.cone(0.05, 0.09, 4, 0xff8a4a, { at: [0.3, 0.45, 0.45], rot: [Math.PI / 2, 0, 0] });
  return b.build();
}

function lawnChair(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = [0x6fcf8c, 0xf06ea9, 0x7ad7f0, 0xf2c14e][v % 4]!;
  b.box(0.6, 0.06, 0.6, c, { at: [0, 0.4, 0] });
  b.box(0.6, 0.7, 0.06, c, { at: [0, 0.75, -0.32], rot: [-0.3, 0, 0] });
  for (let i = 0; i < 4; i++) b.box(0.6, 0.02, 0.08, 0xffffff, { at: [0, 0.44, -0.2 + i * 0.14] });
  for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) b.cyl(0.02, 0.02, 0.4, 4, 0xc8ccd6, { at: [x, 0.2, z] });
  return b.build();
}

function grillDecor(): THREE.BufferGeometry {
  const b = plain();
  b.box(1.1, 0.5, 0.6, 0x3a3a40, { at: [0, 0.95, 0] });
  b.taper(1.1, 0.6, 1.0, 0.4, 0.3, 0x2a2a30, { at: [0, 1.35, -0.05] });
  b.box(1.2, 0.8, 0.6, 0x5a5a62, { at: [0, 0.4, 0] });
  for (const x of [-0.4, 0.4]) b.cyl(0.06, 0.06, 0.05, 8, 0x26262b, { at: [x, 0.06, 0.25], rot: [0, 0, Math.PI / 2] });
  return b.build();
}

function shed(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = [0xc86a4a, 0x7aa0c8, 0x8ab87a, 0xd8c08a][v % 4]!;
  b.box(2.6, 2.1, 2.2, c, { at: [0, 1.05, 0] });
  b.gable(3.0, 1.0, 2.6, 0x5a4a6e, { at: [0, 2.6, 0] });
  b.box(1.1, 1.7, 0.08, 0xf4f0e8, { at: [0, 0.85, 1.12] });
  b.box(0.05, 1.7, 0.1, 0xb0a890, { at: [0, 0.85, 1.14] });
  b.box(1.1, 0.06, 0.1, 0xb0a890, { at: [0, 0.85, 1.14], rot: [0, 0, 0.9] });
  return b.build();
}

function doghouse(v: number): THREE.BufferGeometry {
  const b = plain();
  const c = [0xd63a2f, 0x3f7fd8, 0xc8a060, 0x6fcf8c][v % 4]!;
  b.box(1.1, 0.8, 1.2, c, { at: [0, 0.4, 0] });
  b.gable(1.4, 0.6, 1.4, 0x4a4a5a, { at: [0, 1.1, 0] });
  b.cyl(0.26, 0.26, 0.06, 12, 0x16161c, { at: [0, 0.35, 0.6], rot: [Math.PI / 2, 0, 0] });
  b.box(0.52, 0.3, 0.06, 0x16161c, { at: [0, 0.18, 0.6] });
  b.cyl(0.2, 0.22, 0.08, 12, 0x8a8a92, { at: [0.7, 0.04, 0.6] }); // bowl
  b.box(0.5, 0.12, 0.04, 0xfff4c8, { at: [0, 1.0, 0.66] }); // name plate
  return b.build();
}

function picnicTable(): THREE.BufferGeometry {
  const b = plain();
  const w = 0xb07a45;
  b.box(1.9, 0.08, 0.8, w, { at: [0, 0.75, 0] });
  for (const z of [-0.65, 0.65]) b.box(1.9, 0.06, 0.3, w, { at: [0, 0.45, z] });
  for (const x of [-0.7, 0.7]) {
    b.box(0.08, 0.8, 0.08, shadeHex(w, 0.8), { at: [x, 0.38, 0.2], rot: [0.5, 0, 0] });
    b.box(0.08, 0.8, 0.08, shadeHex(w, 0.8), { at: [x, 0.38, -0.2], rot: [-0.5, 0, 0] });
  }
  b.box(0.8, 0.02, 0.6, 0xe8473a, { at: [0.3, 0.8, 0] }); // checkered cloth hint
  return b.build();
}

function pond(): THREE.BufferGeometry {
  const b = plain();
  b.cyl(2.4, 2.4, 0.06, 20, 0x2f5f8f, { at: [0, 0.04, 0], scale: [1.2, 1, 0.9] });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.dodeca(0.3, 0x8a8aa0, { at: [Math.cos(a) * 2.8, 0.12, Math.sin(a) * 2.2], jitter: 0.05, seed: i, scale: [1.2, 0.6, 1] });
  }
  for (let i = 0; i < 4; i++) b.cyl(0.25, 0.25, 0.02, 8, 0x4f9a4a, { at: [Math.cos(i * 1.9) * 1.2, 0.08, Math.sin(i * 1.9) * 0.9] });
  b.ball(0.08, 0, 0xf4a0c8, { at: [Math.cos(1.9) * 1.2, 0.14, Math.sin(1.9) * 0.9] });
  for (let i = 0; i < 5; i++) b.cyl(0.02, 0.02, 0.9, 3, 0x6a8a3a, { at: [2.2 + (i % 2) * 0.2, 0.45, -0.8 + i * 0.25] });
  return b.build();
}

function bridge(): THREE.BufferGeometry {
  // Footbridge spanning local Z (8 m), 3 m wide, arched deck.
  const b = plain();
  const wood = 0x9a6a44;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const z = -4 + (i + 0.5) * (8 / n);
    const y = 0.5 + Math.sin(((i + 0.5) / n) * Math.PI) * 0.5;
    b.box(3.0, 0.14, 8 / n - 0.04, shadeHex(wood, 0.9 + (i % 3) * 0.05), { at: [0, y, z], rot: [-Math.cos(((i + 0.5) / n) * Math.PI) * 0.2, 0, 0] });
  }
  for (const x of [-1.45, 1.45]) {
    for (let i = 0; i <= 4; i++) {
      const z = -4 + i * 2;
      const y = 0.5 + Math.sin((i / 4) * Math.PI) * 0.5;
      b.box(0.14, 1.0, 0.14, 0x7a5236, { at: [x, y + 0.45, z] });
    }
    b.box(0.1, 0.1, 8.2, 0x7a5236, { at: [x, 1.8, 0] });
  }
  for (const z of [-3.2, 3.2]) b.box(3.4, 0.6, 1.4, 0x8a8aa0, { at: [0, 0.2, z] });
  return b.build();
}

/**
 * Drainage embankment backdrop. The sim places this prop at the 'culvert' den's position (same yaw), so it
 * must stay BEHIND the den (local z < −1.1) and low: a grassy berm with rocks and reeds framing the pipe.
 */
function culvert(): THREE.BufferGeometry {
  const b = plain();
  b.ball(0.7, 1, 0x3f7a3c, { at: [-2.1, 0.0, -1.4], scale: [1.1, 0.45, 0.9], jitter: 0.05, shade: 0.1, seed: 3 });
  b.ball(0.65, 1, 0x3a7038, { at: [2.1, 0.0, -1.5], scale: [1.1, 0.45, 0.9], jitter: 0.05, shade: 0.1, seed: 4 });
  const stones = [0x8c8a82, 0x7a786f, 0x9a968a];
  for (let i = 0; i < 5; i++) b.dodeca(0.2 + (i % 2) * 0.08, stones[i % 3]!, { at: [-2.2 + i * 1.1, 0.12, -1.2 - (i % 2) * 0.3], jitter: 0.04, seed: i + 20, scale: [1.2, 0.7, 1] });
  for (let i = 0; i < 6; i++) b.cyl(0.018, 0.018, 0.7, 3, 0x6a8a3a, { at: [2.0 + (i % 3) * 0.12, 0.35, -1.3 - Math.floor(i / 3) * 0.2], rot: [0.1 * (i % 3), 0, 0.12 - (i % 3) * 0.1] });
  return b.build();
}

const INDIVIDUAL: Partial<Record<PropKind, (v: number) => THREE.BufferGeometry>> = {
  car,
  pickup,
  van,
  swingSet: () => swingSet(),
  sandbox: () => sandbox(),
  kiddiePool: () => kiddiePool(),
  lawnChair,
  grill: () => grillDecor(),
  shed,
  doghouse,
  picnicTable: () => picnicTable(),
  pond: () => pond(),
  bridge: () => bridge(),
  culvert: () => culvert(),
};

const VARIANT_COUNT: Partial<Record<PropKind, number>> = { car: 8, pickup: 8, van: 8, lawnChair: 4, shed: 4, doghouse: 4 };

export const INDIVIDUAL_PROP_KINDS = Object.keys(INDIVIDUAL) as PropKind[];

/** Any prop kind as a standalone object (shared geometry + material). */
export function createProp(kind: PropKind, variant: number): THREE.Object3D {
  const v = Math.abs(Math.floor(variant || 0));
  const make = INDIVIDUAL[kind];
  if (make) {
    const vv = v % (VARIANT_COUNT[kind] ?? 1);
    const mesh = new THREE.Mesh(
      cachedGeo(`prop|${kind}|${vv}`, () => make(vv)),
      modelMaterial(),
    );
    mesh.name = 'prop:' + kind;
    return mesh;
  }
  const scn = sceneryGeometry(kind, v & 3);
  const mesh = new THREE.Mesh(scn ? scn.geometry : cachedGeo('prop|missing', () => new THREE.BoxGeometry(0.3, 0.3, 0.3)), sceneryMaterial());
  mesh.name = 'prop:' + kind;
  return mesh;
}

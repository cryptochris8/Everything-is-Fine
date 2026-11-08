// ─────────────────────────────────────────────────────────────────────────────
// Instancable scenery: one merged, vertex-coloured, flat-shaded geometry per
// kind + variant bucket (0..3). position/normal/color only, no ink, origin at
// the base, facing +Z. Use with sceneryMaterial(). Also: fences.
// Anchors the renderer needs (local space):
//   streetlight — lamp head at STREETLIGHT_LAMP (bulb faces down)
//   lampPost    — lamp globe at LAMPPOST_LAMP
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { FenceStyle, PropKind } from '../../sim/types';
import { GeoBuilder, shadeHex } from './builder';
import { cachedGeo } from './common';
import type { SceneryGeometry } from './types';

export const STREETLIGHT_LAMP = new THREE.Vector3(0, 4.3, 1.05);
export const LAMPPOST_LAMP = new THREE.Vector3(0, 3.05, 0);

const S = (): GeoBuilder => new GeoBuilder(false, false);
const BARK = 0x6b4a36;

const OAK_TONES = [
  [0x3f7a3a, 0x4f8f44, 0x356b33],
  [0x4a8a3c, 0x5c9e4a, 0x3a7433],
  [0x3a6e46, 0x4c8656, 0x2f5e3c],
  [0x5a8a36, 0x6c9c40, 0x4a7a2e],
] as const;

function oak(v: number): THREE.BufferGeometry {
  const b = S();
  const t = OAK_TONES[v]!;
  b.cyl(0.18, 0.28, 2.2, 6, BARK, { at: [0, 1.1, 0], shade: 0.08, seed: 1 });
  b.cyl(0.07, 0.1, 1.0, 4, BARK, { at: [0.4, 2.1, 0.1], rot: [0, 0, -0.7] });
  const blobs: [number, number, number, number][] = [
    [0, 3.4, 0, 1.6],
    [1.0, 3.0, 0.3, 1.1],
    [-0.9, 3.1, -0.3, 1.15],
    [0.2, 4.2, -0.2, 1.05],
    [-0.2, 3.0, 0.9, 0.95],
  ];
  blobs.forEach(([x, y, z, r], i) => b.ball(r * (0.95 + v * 0.03), 1, t[i % 3]!, { at: [x, y, z], jitter: 0.14, shade: 0.12, seed: i + 7 + v * 11 }));
  return b.build();
}

function pine(v: number): THREE.BufferGeometry {
  const b = S();
  const tones = [0x2f6a4a, 0x2a5e44, 0x346f52, 0x285a40];
  b.cyl(0.14, 0.2, 1.2, 5, BARK, { at: [0, 0.6, 0] });
  const tiers: [number, number, number][] = [
    [1.6, 2.2, 1.9],
    [1.25, 1.9, 3.1],
    [0.85, 1.6, 4.2],
  ];
  tiers.forEach(([r, h, y], i) => b.cone(r, h, 7, shadeHex(tones[v]!, 1 - i * 0.06), { at: [0, y, 0], rot: [0, i * 0.4 + v, 0], shade: 0.1, seed: i + v * 5, jitter: 0.07 }));
  return b.build();
}

function birch(v: number): THREE.BufferGeometry {
  const b = S();
  b.cyl(0.11, 0.15, 3.2, 6, 0xeeeae0, { at: [0, 1.6, 0] });
  for (let i = 0; i < 5; i++) b.box(0.24, 0.06, 0.24, 0x2a2a2a, { at: [0, 0.5 + i * 0.55, 0], rot: [0, i, 0.1] });
  const t = [0x9ccf5a, 0xb0d860, 0x8cc050, 0xc8d860][v]!;
  for (let i = 0; i < 4; i++) b.ball(0.8, 1, shadeHex(t, 1 - i * 0.05), { at: [Math.sin(i * 2.1) * 0.5, 3.3 + (i % 2) * 0.6, Math.cos(i * 2.1) * 0.5], jitter: 0.12, shade: 0.1, seed: i + v * 3 });
  return b.build();
}

function roundTree(v: number): THREE.BufferGeometry {
  const b = S();
  const t = [0x4e9a5a, 0x6aa84a, 0xc86a9a, 0xe0a040][v]!; // green, lime, blossom pink, autumn gold
  b.cyl(0.13, 0.18, 1.6, 6, BARK, { at: [0, 0.8, 0] });
  b.ball(1.25, 1, t, { at: [0, 2.6, 0], jitter: 0.1, shade: 0.1, seed: 3 + v });
  b.ball(0.5, 0, shadeHex(t, 1.12), { at: [0.5, 3.2, 0.5], jitter: 0.06, seed: 4 + v });
  return b.build();
}

function bush(v: number): THREE.BufferGeometry {
  const b = S();
  const t = [0x3f8a4a, 0x4a9a52, 0x357a44, 0x5a9a40][v]!;
  b.ball(0.7, 1, t, { at: [0, 0.5, 0], scale: [1, 0.8, 1], jitter: 0.08, shade: 0.12, seed: v + 1 });
  b.ball(0.45, 0, shadeHex(t, 1.1), { at: [0.45, 0.45, 0.2], jitter: 0.06, seed: v + 2 });
  b.ball(0.45, 0, shadeHex(t, 0.9), { at: [-0.4, 0.4, -0.2], jitter: 0.06, seed: v + 3 });
  if (v === 2) for (let i = 0; i < 5; i++) b.ball(0.08, 0, 0xf06ea9, { at: [Math.cos(i * 1.3) * 0.6, 0.65 + (i % 2) * 0.2, Math.sin(i * 1.3) * 0.6] });
  if (v === 3) for (let i = 0; i < 5; i++) b.ball(0.07, 0, 0xe8473a, { at: [Math.cos(i * 1.7) * 0.62, 0.6 + (i % 2) * 0.2, Math.sin(i * 1.7) * 0.62] });
  return b.build();
}

function hedge(v: number): THREE.BufferGeometry {
  const b = S();
  const t = [0x2f6e3e, 0x357a44, 0x2a6438, 0x3a7a3a][v]!;
  b.box(2.0, 1.25, 0.9, t, { at: [0, 0.63, 0], jitter: 0.05, shade: 0.08, seed: v });
  for (let i = 0; i < 4; i++) b.ball(0.35, 0, shadeHex(t, 1.08), { at: [-0.75 + i * 0.5, 1.2, 0], scale: [1, 0.5, 1.2], jitter: 0.05, seed: i + v });
  return b.build();
}

function flowerBed(v: number): THREE.BufferGeometry {
  const b = S();
  b.box(2.2, 0.18, 0.8, 0x6b5140, { at: [0, 0.09, 0] });
  b.box(2.3, 0.22, 0.08, 0xb8b4c4, { at: [0, 0.11, 0.42] });
  const cols = [
    [0xf06ea9, 0xffd24a, 0xf4f4f4],
    [0xe8473a, 0xffa040, 0xffd24a],
    [0x9a7aea, 0x7ad7f0, 0xf4f4f4],
    [0xf4a0c8, 0xf06ea9, 0xc792ea],
  ][v]!;
  for (let i = 0; i < 9; i++) {
    const x = -0.9 + (i % 5) * 0.45 + (i > 4 ? 0.22 : 0);
    const z = i > 4 ? 0.15 : -0.15;
    b.cyl(0.02, 0.02, 0.25, 3, 0x3f8a3a, { at: [x, 0.3, z] });
    b.ball(0.11, 0, cols[i % 3]!, { at: [x, 0.45, z], scale: [1, 0.6, 1] });
  }
  return b.build();
}

function rock(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0x8a8aa0, 0x7a7a8a, 0x9a948a, 0x6e7a80][v]!;
  b.dodeca(0.5, c, { at: [0, 0.3, 0], scale: [1.2, 0.7, 1], jitter: 0.08, shade: 0.12, seed: v + 9 });
  b.dodeca(0.25, shadeHex(c, 1.1), { at: [0.5, 0.15, 0.2], jitter: 0.05, seed: v + 10 });
  return b.build();
}

function mailbox(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0x3a3a48, 0xd63a2f, 0x3f7fd8, 0x2f7a52][v]!;
  b.box(0.12, 1.05, 0.12, 0xb07a45, { at: [0, 0.52, 0] });
  b.box(0.38, 0.3, 0.55, c, { at: [0, 1.15, 0] });
  b.cyl(0.19, 0.19, 0.55, 10, c, { at: [0, 1.3, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.55] });
  b.box(0.04, 0.3, 0.06, 0xe8473a, { at: [0.22, 1.35, -0.1] });
  b.box(0.04, 0.12, 0.16, 0xe8473a, { at: [0.22, 1.45, -0.02] });
  return b.build();
}

function streetlight(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0x3a4050, 0x2e3a48, 0x44404c, 0x363c46][v]!;
  b.cyl(0.14, 0.2, 0.5, 8, c, { at: [0, 0.25, 0] });
  b.cyl(0.07, 0.09, 4.2, 8, c, { at: [0, 2.3, 0] });
  b.cyl(0.05, 0.05, 1.1, 6, c, { at: [0, 4.35, 0.5], rot: [Math.PI / 2, 0, 0] });
  b.cyl(0.18, 0.32, 0.22, 10, c, { at: [0, 4.4, STREETLIGHT_LAMP.z] });
  b.cyl(0.26, 0.26, 0.05, 10, 0xffe0a0, { at: [0, 4.27, STREETLIGHT_LAMP.z] }); // lens (renderer adds glow)
  return b.build();
}

function lampPost(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0x2a2e3a, 0x3a3226, 0x2a3a2e, 0x302a3a][v]!;
  b.cyl(0.12, 0.18, 0.4, 8, c, { at: [0, 0.2, 0] });
  b.cyl(0.05, 0.06, 2.6, 8, c, { at: [0, 1.6, 0] });
  b.ball(0.24, 1, 0xfff0c8, { at: [0, LAMPPOST_LAMP.y, 0] });
  b.cone(0.26, 0.2, 8, c, { at: [0, 3.35, 0] });
  return b.build();
}

function hydrant(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0xd63a2f, 0xf2c14e, 0xd63a2f, 0x3f7fd8][v]!;
  b.cyl(0.16, 0.18, 0.55, 10, c, { at: [0, 0.3, 0] });
  b.sphere(0.17, 10, 6, c, { at: [0, 0.58, 0], scale: [1, 0.7, 1] });
  b.cyl(0.05, 0.05, 0.12, 6, 0xe8e8e8, { at: [0, 0.73, 0] });
  for (const s of [-1, 1]) b.cyl(0.07, 0.07, 0.12, 8, 0xe8e8e8, { at: [s * 0.2, 0.4, 0], rot: [0, 0, Math.PI / 2] });
  b.cyl(0.24, 0.24, 0.06, 10, c, { at: [0, 0.03, 0] });
  return b.build();
}

function gnomeDecor(v: number): THREE.BufferGeometry {
  const b = S();
  const hat = [0xd63a2f, 0x3f7fd8, 0x6fcf5a, 0xf06ea9][v]!;
  b.cyl(0.14, 0.18, 0.3, 8, 0x3f6fd8, { at: [0, 0.15, 0] });
  b.ball(0.12, 1, 0xf6c8a8, { at: [0, 0.4, 0] });
  b.cone(0.15, 0.22, 8, 0xffffff, { at: [0, 0.32, 0.08], rot: [Math.PI, 0, 0], scale: [1, 1, 0.5] });
  b.cone(0.14, 0.34, 8, hat, { at: [0, 0.62, -0.02], rot: [-0.2, 0, 0] });
  return b.build();
}

function flamingo(v: number): THREE.BufferGeometry {
  const b = S();
  const pink = [0xff6fae, 0xff8ac0, 0xf06ea9, 0xff9ad0][v]!;
  b.cyl(0.015, 0.015, 0.6, 3, 0x222222, { at: [0.03, 0.3, 0] });
  b.cyl(0.015, 0.015, 0.6, 3, 0x222222, { at: [-0.03, 0.3, 0] });
  b.ball(0.2, 1, pink, { at: [0, 0.72, -0.05], scale: [0.8, 0.8, 1.4] });
  b.cyl(0.035, 0.04, 0.45, 5, pink, { at: [0, 1.0, 0.18], rot: [0.4, 0, 0] });
  b.ball(0.08, 0, pink, { at: [0, 1.22, 0.28] });
  b.cone(0.035, 0.14, 4, 0x222222, { at: [0, 1.17, 0.38], rot: [2.2, 0, 0] });
  return b.build();
}

function birdbath(v: number): THREE.BufferGeometry {
  const b = S();
  const c = [0xc8c4d4, 0xb8b0a0, 0xd0d0d8, 0xa8b8b0][v]!;
  b.cyl(0.3, 0.35, 0.1, 10, c, { at: [0, 0.05, 0] });
  b.cyl(0.1, 0.14, 0.7, 8, c, { at: [0, 0.45, 0] });
  b.cyl(0.45, 0.3, 0.14, 12, c, { at: [0, 0.86, 0] });
  b.cyl(0.38, 0.38, 0.02, 12, 0x5a8ac8, { at: [0, 0.93, 0] });
  return b.build();
}

function stopSign(_v: number): THREE.BufferGeometry {
  const b = S();
  b.cyl(0.04, 0.04, 2.3, 6, 0x8a8a92, { at: [0, 1.15, 0] });
  b.cyl(0.38, 0.38, 0.05, 8, 0xd63a2f, { at: [0, 2.3, 0.04], rot: [Math.PI / 2, Math.PI / 8, 0] });
  b.box(0.42, 0.1, 0.02, 0xffffff, { at: [0, 2.3, 0.075] });
  return b.build();
}

function bench(v: number): THREE.BufferGeometry {
  const b = S();
  const wood = [0xb07a45, 0x8a5a3a, 0x3f7a52, 0xc86a3a][v]!;
  for (let i = 0; i < 3; i++) b.box(1.6, 0.05, 0.13, wood, { at: [0, 0.45, -0.15 + i * 0.15] });
  for (let i = 0; i < 2; i++) b.box(1.6, 0.12, 0.05, wood, { at: [0, 0.65 + i * 0.18, -0.27], rot: [-0.15, 0, 0] });
  for (const x of [-0.7, 0.7]) {
    b.box(0.06, 0.45, 0.4, 0x2a2a30, { at: [x, 0.22, 0] });
    b.box(0.06, 0.5, 0.06, 0x2a2a30, { at: [x, 0.7, -0.28] });
  }
  return b.build();
}

function bikeRack(_v: number): THREE.BufferGeometry {
  const b = S();
  for (let i = 0; i < 4; i++) b.torus(0.35, 0.03, 4, 10, 0x8a8a92, { at: [-0.6 + i * 0.4, 0, 0], rot: [0, Math.PI / 2, 0] }, Math.PI);
  return b.build();
}

const SCENERY: Partial<Record<PropKind, { make: (v: number) => THREE.BufferGeometry; radius: number; occluder: boolean }>> = {
  treeOak: { make: oak, radius: 1.8, occluder: true },
  treePine: { make: pine, radius: 1.5, occluder: true },
  treeBirch: { make: birch, radius: 1.2, occluder: true },
  treeRound: { make: roundTree, radius: 1.3, occluder: true },
  bush: { make: bush, radius: 0.8, occluder: false },
  hedge: { make: hedge, radius: 1.0, occluder: false },
  flowerBed: { make: flowerBed, radius: 1.1, occluder: false },
  rock: { make: rock, radius: 0.6, occluder: false },
  mailbox: { make: mailbox, radius: 0.3, occluder: false },
  streetlight: { make: streetlight, radius: 0.3, occluder: false },
  lampPost: { make: lampPost, radius: 0.3, occluder: false },
  fireHydrant: { make: hydrant, radius: 0.25, occluder: false },
  gnome: { make: gnomeDecor, radius: 0.2, occluder: false },
  flamingo: { make: flamingo, radius: 0.25, occluder: false },
  birdbath: { make: birdbath, radius: 0.45, occluder: false },
  stopSign: { make: stopSign, radius: 0.4, occluder: false },
  bench: { make: bench, radius: 0.85, occluder: false },
  bikeRack: { make: bikeRack, radius: 0.8, occluder: false },
};

export const SCENERY_KINDS = Object.keys(SCENERY) as PropKind[];

export function sceneryGeometry(kind: PropKind, variantBucket: number): SceneryGeometry | null {
  const spec = SCENERY[kind];
  if (!spec) return null;
  const v = Math.abs(Math.floor(variantBucket || 0)) & 3;
  return { geometry: cachedGeo(`scn|${kind}|${v}`, () => spec.make(v)), radius: spec.radius, occluder: spec.occluder };
}

// ── fences ──────────────────────────────────────────────────────────────────
function fenceGeo(style: FenceStyle, len: number, h: number): THREE.BufferGeometry {
  const b = S();
  const L = Math.max(0.2, len);
  const posts = Math.max(1, Math.round(L / 2.2));
  const postAt = (i: number) => (i / posts) * L;
  switch (style) {
    case 'picket': {
      const white = 0xf4f0e8;
      for (let i = 0; i <= posts; i++) b.box(0.12, h + 0.1, 0.12, white, { at: [postAt(i), (h + 0.1) / 2, 0] });
      for (const y of [h * 0.3, h * 0.72]) b.box(L, 0.07, 0.05, white, { at: [L / 2, y, -0.05] });
      const n = Math.floor(L / 0.2);
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (L / n);
        b.box(0.09, h * 0.85, 0.035, white, { at: [x, (h * 0.85) / 2, 0] });
        b.cone(0.065, 0.14, 4, white, { at: [x, h * 0.85 + 0.07, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.4] });
      }
      break;
    }
    case 'wood': {
      const wood = 0x9a6a44;
      for (let i = 0; i <= posts; i++) b.box(0.14, h + 0.12, 0.14, 0x7a5236, { at: [postAt(i), (h + 0.12) / 2, 0] });
      const n = Math.max(1, Math.floor(L / 0.3));
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (L / n);
        b.box(L / n - 0.025, h, 0.05, shadeHex(wood, 0.92 + ((i * 7) % 5) * 0.035), { at: [x, h / 2, 0.04] });
      }
      b.box(L, 0.08, 0.06, 0x7a5236, { at: [L / 2, h - 0.1, -0.03] });
      break;
    }
    case 'hedge': {
      const g = 0x2f6e3e;
      b.box(L, h, 0.8, g, { at: [L / 2, h / 2, 0], jitter: 0.04, shade: 0.08, seed: Math.round(L * 10) });
      const n = Math.max(1, Math.floor(L / 0.7));
      for (let i = 0; i < n; i++) b.ball(0.32, 0, shadeHex(g, 1.08 - (i % 3) * 0.05), { at: [(i + 0.5) * (L / n), h - 0.05, 0], scale: [1, 0.5, 1.25], jitter: 0.04, seed: i });
      break;
    }
    case 'chainlink': {
      const metal = 0x9aa0aa;
      for (let i = 0; i <= posts; i++) b.cyl(0.04, 0.04, h + 0.05, 5, 0x7a808a, { at: [postAt(i), (h + 0.05) / 2, 0] });
      b.cyl(0.03, 0.03, L, 4, 0x7a808a, { at: [L / 2, h, 0], rot: [0, 0, Math.PI / 2] });
      const n = Math.max(1, Math.floor(L / 0.18));
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (L / n);
        b.box(0.012, h * 1.05, 0.012, metal, { at: [x, h / 2, 0], rot: [0, 0, i % 2 ? 0.1 : -0.1] });
      }
      break;
    }
  }
  return b.build();
}

export function fenceGeometry(style: FenceStyle, length: number, height: number): THREE.BufferGeometry {
  const L = Math.round(Math.max(0.2, length) * 10) / 10;
  const H = Math.round(Math.max(0.3, height) * 10) / 10;
  return cachedGeo(`fence|${style}|${L}|${H}`, () => fenceGeo(style, L, H));
}

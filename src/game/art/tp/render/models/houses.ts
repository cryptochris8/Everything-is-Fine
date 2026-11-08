// ─────────────────────────────────────────────────────────────────────────────
// Houses from HouseDef: six styles (ranch, cottage, twoStory, bungalow, aFrame,
// colonial). Local frame: origin at the footprint centre, front door side = +Z,
// footprint def.w (X) × def.d (Z). The door / porch light are placed where the
// sim says (def.door / def.porch are converted into local space), so homeowners
// really do walk out of the front door.
// Meshes per house: body (vertex colours, per-house fadeable material),
// windows (per-house material: each window glows when its rank < windowsLit),
// porch bulb. No ink outlines (scenery).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { HouseDef } from '../../sim/types';
import { PAL } from '../palette';
import { GeoBuilder, linear, shadeHex } from './builder';
import { damp, disposeTree, group, rand01 } from './common';
import { basicMaterial, fadeableSceneryMaterial, windowMaterial } from './materials';
import { markShared } from './shared';
import type { HouseModel, ModelContext } from './types';

const hexNum = (s: string, fallback: number): number => {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  return m ? parseInt(m[1]!, 16) : fallback;
};

interface WinSpec {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  /** Wall normal axis: 'z' (front/back) or 'x' (sides); sign = facing. */
  axis: 'x' | 'z';
  sign: 1 | -1;
}

/** Glass panes as one geometry with an `aRank` attribute (0..1 per window). */
function windowsGeometry(wins: readonly WinSpec[], seed: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const rank: number[] = [];
  const glass = linear(0x28324e);
  const m = new THREE.Matrix4();
  wins.forEach((w, i) => {
    const g = new THREE.BoxGeometry(w.axis === 'z' ? w.w : 0.06, w.h, w.axis === 'z' ? 0.06 : w.w).toNonIndexed();
    m.makeTranslation(w.x, w.y, w.z);
    g.applyMatrix4(m);
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const r = rand01(seed * 7919 + 13, i + 1);
    for (let k = 0; k < p.count; k++) {
      pos.push(p.getX(k), p.getY(k), p.getZ(k));
      nor.push(n.getX(k), n.getY(k), n.getZ(k));
      col.push(glass[0], glass[1], glass[2]);
      rank.push(r);
    }
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('aRank', new THREE.Float32BufferAttribute(rank, 1));
  out.computeBoundingSphere();
  return out;
}

/** Window frame + sill + optional shutters on the body builder. */
function frame(b: GeoBuilder, w: WinSpec, trim: number, shutter: number | null): void {
  const t = 0.07;
  const out = 0.05;
  if (w.axis === 'z') {
    const z = w.z + w.sign * out;
    b.box(w.w + t * 2, t, 0.08, trim, { at: [w.x, w.y + w.h / 2 + t / 2, z] });
    b.box(w.w + t * 2 + 0.1, t * 1.2, 0.16, trim, { at: [w.x, w.y - w.h / 2 - t / 2, z + w.sign * 0.04] });
    b.box(t, w.h, 0.08, trim, { at: [w.x - w.w / 2 - t / 2, w.y, z] });
    b.box(t, w.h, 0.08, trim, { at: [w.x + w.w / 2 + t / 2, w.y, z] });
    b.box(w.w, 0.05, 0.07, trim, { at: [w.x, w.y, z + w.sign * 0.01] });
    b.box(0.05, w.h, 0.07, trim, { at: [w.x, w.y, z + w.sign * 0.01] });
    if (shutter !== null) for (const s of [-1, 1]) b.box(w.w * 0.42, w.h + 0.1, 0.05, shutter, { at: [w.x + s * (w.w / 2 + w.w * 0.26), w.y, z] });
  } else {
    const x = w.x + w.sign * out;
    b.box(0.08, t, w.w + t * 2, trim, { at: [x, w.y + w.h / 2 + t / 2, w.z] });
    b.box(0.16, t * 1.2, w.w + t * 2 + 0.1, trim, { at: [x + w.sign * 0.04, w.y - w.h / 2 - t / 2, w.z] });
    b.box(0.08, w.h, t, trim, { at: [x, w.y, w.z - w.w / 2 - t / 2] });
    b.box(0.08, w.h, t, trim, { at: [x, w.y, w.z + w.w / 2 + t / 2] });
    b.box(0.07, 0.05, w.w, trim, { at: [x + w.sign * 0.01, w.y, w.z] });
    b.box(0.07, w.h, 0.05, trim, { at: [x + w.sign * 0.01, w.y, w.z] });
    if (shutter !== null) for (const s of [-1, 1]) b.box(0.05, w.h + 0.1, w.w * 0.42, shutter, { at: [x, w.y, w.z + s * (w.w / 2 + w.w * 0.26)] });
  }
}

/** Gable prism with the ridge along X (eaves face ±Z), base at y. */
function gableX(b: GeoBuilder, len: number, depth: number, h: number, y: number, x: number, color: number): void {
  b.gable(depth, h, len, color, { at: [x, y + h / 2, 0], rot: [0, Math.PI / 2, 0] });
}
/** Gable prism with the ridge along Z (gable end faces ±Z). */
function gableZ(b: GeoBuilder, width: number, depth: number, h: number, y: number, x: number, z: number, color: number): void {
  b.gable(width, h, depth, color, { at: [x, y + h / 2, z] });
}

interface Built {
  body: THREE.BufferGeometry;
  windows: THREE.BufferGeometry;
  bulb: THREE.Vector3;
  chimney: THREE.Vector3 | null;
}

function buildHouse(def: HouseDef): Built {
  const W = Math.max(4, def.w);
  const D = Math.max(4, def.d);
  const wall = hexNum(def.wallColor, PAL.houseWalls[0]!);
  const roof = hexNum(def.roofColor, PAL.houseRoofs[0]!);
  const trim = hexNum(def.trimColor, PAL.trim);
  const door = hexNum(def.doorColor, 0xb0482a);
  const style = def.style;
  const seed = Math.floor(def.windowSeed * 100000) + def.id * 31;

  // Door / porch in local space (inverse of the house yaw).
  const c = Math.cos(def.yaw);
  const s = Math.sin(def.yaw);
  const toLocal = (px: number, pz: number): [number, number] => {
    const dx = px - def.x;
    const dz = pz - def.z;
    return [dx * c - dz * s, dx * s + dz * c];
  };

  const gs = def.garageSide;
  const gw = gs !== 0 ? Math.min(4, W * 0.36) : 0;
  const mw = W - gw; // main block width
  const mx = -gs * (gw / 2); // main block centre x
  const twoFloors = style === 'twoStory' || style === 'colonial';
  const wallH = style === 'aFrame' ? 1.3 : twoFloors ? 5.4 : style === 'cottage' ? 2.7 : 2.95;

  let [doorX] = toLocal(def.door.x, def.door.z);
  doorX = Math.max(mx - mw / 2 + 0.8, Math.min(mx + mw / 2 - 0.8, doorX));
  let [bulbX] = toLocal(def.porch.x, def.porch.z);
  if (Math.abs(bulbX - doorX) < 0.7) bulbX = doorX + 0.85;
  bulbX = Math.max(mx - mw / 2 + 0.3, Math.min(mx + mw / 2 - 0.3, bulbX));

  const b = new GeoBuilder(false, false);
  const wins: WinSpec[] = [];
  const shutter = style === 'colonial' || style === 'cottage' ? shadeHex(roof, 0.9) : null;

  // Foundation + walls.
  b.box(mw + 0.2, 0.3, D + 0.2, 0x8c8a9a, { at: [mx, 0.15, 0] });
  b.box(mw, wallH, D, wall, { at: [mx, 0.3 + wallH / 2, 0], shade: 0.02, seed });
  // Corner trim boards.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.14, wallH, 0.14, trim, { at: [mx + sx * mw / 2, 0.3 + wallH / 2, sz * D / 2] });
  if (twoFloors) b.box(mw + 0.08, 0.14, D + 0.08, trim, { at: [mx, 0.3 + wallH / 2, 0] });

  // Roof.
  const top = 0.3 + wallH;
  switch (style) {
    case 'ranch': {
      b.taper(mw + 0.9, D + 0.9, mw * 0.55, 0.3, 1.5, roof, { at: [mx, top + 0.75, 0] });
      break;
    }
    case 'cottage':
    case 'twoStory': {
      const h = style === 'cottage' ? 2.6 : 2.1;
      gableX(b, mw + 0.7, D + 0.9, h, top, mx, roof);
      // gable end trim
      break;
    }
    case 'bungalow': {
      gableZ(b, mw + 0.8, D + 0.6, 1.9, top, mx, 0, roof);
      // Deep front porch roof on columns.
      b.box(mw * 0.8, 0.18, 2.0, roof, { at: [mx, top - 0.1, D / 2 + 0.9], rot: [0.12, 0, 0] });
      for (const sx of [-1, 1]) b.box(0.22, top - 0.3, 0.22, trim, { at: [mx + sx * mw * 0.36, 0.3 + (top - 0.3) / 2, D / 2 + 1.7] });
      b.box(mw * 0.8, 0.2, 2.0, 0x9a8472, { at: [mx, 0.2, D / 2 + 0.95] });
      break;
    }
    case 'aFrame': {
      gableZ(b, mw + 0.6, D + 0.6, 5.4, top - 0.2, mx, 0, roof);
      // Front triangle face with a big window.
      b.gable(mw - 0.3, 4.9, 0.1, wall, { at: [mx, top - 0.2 + 2.45, D / 2 + 0.26] });
      break;
    }
    case 'colonial': {
      b.taper(mw + 0.8, D + 0.8, mw * 0.5, D * 0.3, 1.9, roof, { at: [mx, top + 0.95, 0] });
      // Portico with pediment.
      b.box(2.6, 0.2, 1.4, trim, { at: [doorX, 3.2, D / 2 + 0.7] });
      b.gable(2.8, 0.8, 1.5, trim, { at: [doorX, 3.7, D / 2 + 0.7] });
      for (const sx of [-1, 1]) b.cyl(0.13, 0.15, 2.9, 10, trim, { at: [doorX + sx * 1.05, 1.75, D / 2 + 1.25] });
      b.box(2.8, 0.25, 1.6, 0xb8b4c4, { at: [doorX, 0.13, D / 2 + 0.75] });
      break;
    }
  }

  // Chimney.
  let chimney: THREE.Vector3 | null = null;
  if (style === 'cottage' || style === 'twoStory' || style === 'colonial' || style === 'ranch') {
    const cx = mx + (mw / 2 - 1.1) * (gs === 1 ? -1 : 1);
    const ch = style === 'ranch' ? 2.0 : style === 'cottage' ? 3.0 : 2.6;
    b.box(0.8, ch, 0.8, 0xa0523a, { at: [cx, top + ch / 2 - 0.2, -D * 0.18], shade: 0.05, seed: seed + 1 });
    b.box(0.95, 0.15, 0.95, 0x6a3a2a, { at: [cx, top + ch - 0.2, -D * 0.18] });
    chimney = new THREE.Vector3(cx, top + ch - 0.1, -D * 0.18);
  }

  // Garage.
  if (gs !== 0) {
    const gx = gs * (W / 2 - gw / 2);
    const gh = 2.7;
    const gd = D * 0.92;
    b.box(gw + 0.1, 0.25, gd + 0.1, 0x8c8a9a, { at: [gx, 0.12, (D - gd) / 2] });
    b.box(gw, gh, gd, shadeHex(wall, 0.95), { at: [gx, 0.25 + gh / 2, (D - gd) / 2] });
    gableX(b, gw + 0.4, gd + 0.6, 1.1, 0.25 + gh, gx, shadeHex(roof, 0.95));
    // Garage door with panels.
    b.box(gw - 0.8, 2.1, 0.08, shadeHex(trim, 0.95), { at: [gx, 1.3, D / 2 + 0.03] });
    for (let i = 0; i < 4; i++) b.box(gw - 0.85, 0.05, 0.1, shadeHex(trim, 0.8), { at: [gx, 0.5 + i * 0.5, D / 2 + 0.05] });
  }

  // Front door + step + porch light fixture.
  const fz = D / 2;
  b.box(1.05, 2.15, 0.1, door, { at: [doorX, 0.3 + 1.07, fz + 0.03] });
  b.box(1.25, 0.1, 0.12, trim, { at: [doorX, 0.3 + 2.2, fz + 0.04] });
  for (const sx of [-1, 1]) b.box(0.1, 2.2, 0.12, trim, { at: [doorX + sx * 0.58, 0.3 + 1.1, fz + 0.04] });
  b.ball(0.06, 0, 0xffd24a, { at: [doorX + 0.32, 1.35, fz + 0.1] });
  b.box(0.3, 0.3, 0.05, shadeHex(door, 1.25), { at: [doorX, 1.95, fz + 0.09] }); // little door window
  if (style !== 'bungalow' && style !== 'colonial') b.box(1.8, 0.28, 1.0, 0xb8b4c4, { at: [doorX, 0.14, fz + 0.5] });
  b.box(0.9, 0.03, 0.55, 0x8a4a3a, { at: [doorX, 0.3, fz + 0.5] }); // welcome mat
  const bulbY = 0.3 + 2.25;
  b.box(0.16, 0.3, 0.08, 0x2a2a30, { at: [bulbX, bulbY, fz + 0.06] });

  // Windows.
  const rows = twoFloors ? [1.7, 4.3] : [1.75];
  const winW = 1.1;
  const winH = style === 'cottage' ? 0.95 : 1.15;
  const addRow = (y: number) => {
    // Front: skip the door zone.
    const n = Math.max(1, Math.floor(mw / 2.6));
    for (let i = 0; i < n; i++) {
      const x = mx - mw / 2 + (i + 0.5) * (mw / n);
      if (y < 3 && Math.abs(x - doorX) < 1.3) continue;
      if (y < 3 && Math.abs(x - bulbX) < 0.75) continue;
      wins.push({ x, y, z: fz, w: winW, h: winH, axis: 'z', sign: 1 });
    }
    // Back.
    const nb = Math.max(1, Math.floor(mw / 3));
    for (let i = 0; i < nb; i++) wins.push({ x: mx - mw / 2 + (i + 0.5) * (mw / nb), y, z: -fz, w: winW, h: winH, axis: 'z', sign: -1 });
    // Sides (skip the garage side).
    const ns = Math.max(1, Math.floor(D / 3.4));
    for (const sx of [-1, 1] as const) {
      if (sx === gs) continue;
      for (let i = 0; i < ns; i++) wins.push({ x: mx + sx * mw / 2, y, z: -D / 2 + (i + 0.5) * (D / ns), w: winW * 0.9, h: winH, axis: 'x', sign: sx });
    }
  };
  if (style === 'aFrame') {
    wins.push({ x: mx, y: 3.1, z: fz + 0.3, w: 1.6, h: 1.8, axis: 'z', sign: 1 });
    wins.push({ x: mx - 1.6, y: 1.0, z: fz, w: 0.9, h: 0.8, axis: 'z', sign: 1 });
    wins.push({ x: mx, y: 3.1, z: -fz - 0.3, w: 1.4, h: 1.4, axis: 'z', sign: -1 });
  } else {
    for (const y of rows) addRow(y);
  }
  // Keep window frames sensible: frames on everything.
  for (const w of wins) frame(b, w, trim, w.axis === 'z' && w.sign === 1 ? shutter : null);

  // Flower boxes on cottages.
  if (style === 'cottage') {
    for (const w of wins) if (w.axis === 'z' && w.sign === 1) {
      b.box(w.w + 0.1, 0.18, 0.22, 0x8a5a3a, { at: [w.x, w.y - w.h / 2 - 0.2, fz + 0.14] });
      for (let k = 0; k < 4; k++) b.ball(0.08, 0, [0xf06ea9, 0xffd24a, 0xf4f4f4, 0xe8473a][k]!, { at: [w.x - 0.4 + k * 0.27, w.y - w.h / 2 - 0.08, fz + 0.18] });
    }
  }

  const body = b.build();
  const windows = windowsGeometry(wins, seed);
  return { body, windows, bulb: new THREE.Vector3(bulbX, bulbY - 0.1, fz + 0.18), chimney };
}

let bulbGeo: THREE.BufferGeometry | null = null;
function bulbGeometry(): THREE.BufferGeometry {
  if (!bulbGeo) bulbGeo = markShared(new THREE.SphereGeometry(0.1, 10, 8));
  return bulbGeo;
}

export function createHouse(def: HouseDef): HouseModel {
  const built = buildHouse(def);
  const root = group(null, 0, 0, 0, 'house:' + def.style);
  const bodyMat = fadeableSceneryMaterial();
  const winMat = windowMaterial();
  const body = new THREE.Mesh(built.body, bodyMat.material);
  root.add(body);
  const windows = new THREE.Mesh(built.windows, winMat.material);
  root.add(windows);
  const onMat = basicMaterial(PAL.porchLight);
  const offMat = basicMaterial(0x5a5a66);
  const bulb = new THREE.Mesh(bulbGeometry(), offMat);
  bulb.position.copy(built.bulb);
  root.add(bulb);
  root.userData.chimney = built.chimney;
  root.userData.porchLight = built.bulb.clone();

  let lit = 0;
  let litTarget = def.windowSeed * 0.4;
  let alpha = 1;
  function applyFade(): void {
    const t = alpha < 0.999;
    bodyMat.uniforms.uFade.value = alpha;
    winMat.uniforms.uFade.value = alpha;
    for (const m of [bodyMat.material, winMat.material]) {
      if (m.transparent !== t) {
        m.transparent = t;
        m.needsUpdate = true;
      }
    }
    bulb.visible = alpha > 0.5;
  }

  return {
    root,
    update(ctx: ModelContext) {
      // Windows switch on one at a time (rank threshold eases toward the target).
      lit = damp(lit, litTarget, 3, Math.min(0.1, ctx.dt));
      winMat.uniforms.uLit.value = lit;
    },
    setPorchLight(on: boolean) {
      bulb.material = on ? onMat : offMat;
    },
    setWindowsLit(frac: number) {
      litTarget = Math.max(0, Math.min(1, frac));
    },
    setOpacity(a: number) {
      const na = Math.max(0.15, Math.min(1, a));
      if (Math.abs(na - alpha) < 0.001) return;
      alpha = na;
      applyFade();
    },
    dispose() {
      disposeTree(root);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Garbage cans: standard (silver, dented, lid pops off), recycling (blue wheelie
// bin, hinged lid), dumpster (big green, twin hinged lids), premium (shiny can,
// gold band, pizza box on the lid), special: bbqGrill (kettle grill) and
// goldenDumpster. Front faces +Z (the side the raccoon rummages from).
//   root ─┬─ body group (shake / tip) ─┬─ body mesh
//         │                            ├─ lid pivot(s) (hinge at the back edge)
//         │                            └─ spill (tipped)  · flies (empty)
//         ├─ highlight ring + bobbing arrow
//         └─ sparkles
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import type { CanKind, CanState, SpecialCanStyle } from '../../sim/types';
import { PAL } from '../palette';
import { GeoBuilder, shadeHex } from './builder';
import { cachedGeo, damp, disposeTree, group, inked, part, ringGeometry } from './common';
import { lootGeometry } from './loot';
import { basicMaterial, modelMaterial } from './materials';
import type { CanModel, ModelContext } from './types';

type Look = 'standard' | 'recycling' | 'dumpster' | 'premium' | 'bbqGrill' | 'goldenDumpster';

interface LookSpec {
  /** Footprint half-size for ring & arrow placement. */
  radius: number;
  height: number;
  lids: { x: number; w: number }[];
  /** Hinge (back edge) position of the lid pivot. */
  hingeY: number;
  hingeZ: number;
  /** How the lid opens: 'hinge' swings back; 'pop' flies off and lands beside the can. */
  open: 'hinge' | 'pop';
  openAngle: number;
}

const LOOKS: Record<Look, LookSpec> = {
  standard: { radius: 0.34, height: 0.9, lids: [{ x: 0, w: 0 }], hingeY: 0.9, hingeZ: -0.3, open: 'pop', openAngle: 0 },
  recycling: { radius: 0.38, height: 1.0, lids: [{ x: 0, w: 0 }], hingeY: 1.0, hingeZ: -0.33, open: 'hinge', openAngle: -2.0 },
  premium: { radius: 0.34, height: 0.9, lids: [{ x: 0, w: 0 }], hingeY: 0.9, hingeZ: -0.3, open: 'pop', openAngle: 0 },
  dumpster: { radius: 1.05, height: 1.25, lids: [{ x: -0.46, w: 0.9 }, { x: 0.46, w: 0.9 }], hingeY: 1.3, hingeZ: -0.55, open: 'hinge', openAngle: -1.9 },
  goldenDumpster: { radius: 1.05, height: 1.25, lids: [{ x: -0.46, w: 0.9 }, { x: 0.46, w: 0.9 }], hingeY: 1.3, hingeZ: -0.55, open: 'hinge', openAngle: -1.9 },
  bbqGrill: { radius: 0.5, height: 1.0, lids: [{ x: 0, w: 0 }], hingeY: 0.82, hingeZ: -0.3, open: 'hinge', openAngle: -1.7 },
};

function lookFor(kind: CanKind, special: SpecialCanStyle | null): Look {
  if (kind === 'special') return special === 'bbqGrill' ? 'bbqGrill' : 'goldenDumpster';
  return kind;
}

// ── geometry ────────────────────────────────────────────────────────────────
function metalCanBody(color: number, band: number | null, v: number): THREE.BufferGeometry {
  const b = inked();
  const pts: [number, number][] = [
    [0.001, 0],
    [0.24, 0],
    [0.26, 0.04],
    [0.3, 0.84],
    [0.31, 0.88],
    [0.001, 0.88],
  ];
  b.lathe(pts, 16, color, { shade: 0.04, seed: v });
  // corrugation rings
  for (const y of [0.22, 0.46, 0.7]) b.torus(0.265 + y * 0.045, 0.014, 4, 18, shadeHex(color, 0.82), { at: [0, y, 0], rot: [Math.PI / 2, 0, 0], ink: false });
  if (band !== null) b.torus(0.305, 0.03, 4, 18, band, { at: [0, 0.8, 0], rot: [Math.PI / 2, 0, 0], ink: false, glow: shadeHex(band, 1.1) });
  // side handles
  for (const x of [-1, 1]) b.torus(0.06, 0.014, 4, 8, shadeHex(color, 0.7), { at: [x * 0.31, 0.72, 0], rot: [0, Math.PI / 2, 0], ink: false }, Math.PI);
  // dent
  b.ball(0.08, 0, shadeHex(color, 0.75), { at: [0.2, 0.45, 0.2], scale: [0.6, 1, 0.3], rot: [0, 0.8, 0], ink: false });
  return b.build();
}

function metalLid(color: number, pizza: boolean): THREE.BufferGeometry {
  // Built relative to the hinge at (0,0,-0.3): lid centre at z=+0.3.
  const b = inked();
  b.cyl(0.33, 0.33, 0.04, 18, color, { at: [0, 0.02, 0.3] });
  b.sphere(0.32, 16, 6, shadeHex(color, 1.05), { at: [0, 0.04, 0.3], scale: [1, 0.2, 1], ink: false });
  b.torus(0.07, 0.018, 4, 8, shadeHex(color, 0.6), { at: [0, 0.11, 0.3], rot: [0, 0, 0] }, Math.PI);
  if (pizza) {
    b.box(0.5, 0.06, 0.5, 0xf2ead8, { at: [0, 0.14, 0.3], rot: [0, 0.35, 0] });
    b.box(0.26, 0.004, 0.14, 0xd63a2f, { at: [0, 0.172, 0.3], rot: [0, 0.35, 0], ink: false });
    b.box(0.06, 0.01, 0.06, 0xf6c048, { at: [0.12, 0.176, 0.35], rot: [0, 0.35, 0], ink: false });
  }
  return b.build();
}

function recyclingBody(): THREE.BufferGeometry {
  const b = inked();
  const c = PAL.canBlue;
  b.taper(0.56, 0.6, 0.66, 0.7, 0.92, c, { at: [0, 0.5, 0] });
  b.box(0.68, 0.06, 0.08, shadeHex(c, 0.8), { at: [0, 0.97, -0.32] }); // hinge bar
  for (const x of [-1, 1]) {
    b.cyl(0.08, 0.08, 0.06, 10, 0x26262b, { at: [x * 0.3, 0.08, -0.28], rot: [0, 0, Math.PI / 2] });
    b.cyl(0.04, 0.04, 0.07, 8, 0x8a8a92, { at: [x * 0.3, 0.08, -0.28], rot: [0, 0, Math.PI / 2], ink: false });
  }
  // Recycle symbol: three chasing chevrons on the front.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    b.box(0.16, 0.035, 0.01, 0xffffff, { at: [Math.cos(a) * 0.07, 0.55 + Math.sin(a) * 0.07, 0.335], rot: [0.05, 0, a + Math.PI / 2 + 0.5], ink: false, glow: 0xdfefff });
  }
  return b.build();
}

function recyclingLid(): THREE.BufferGeometry {
  const b = inked();
  const c = shadeHex(PAL.canBlue, 0.88);
  b.box(0.72, 0.06, 0.74, c, { at: [0, 0.03, 0.35] });
  b.box(0.2, 0.03, 0.05, shadeHex(c, 0.7), { at: [0, 0.03, 0.73] });
  return b.build();
}

function dumpsterBody(color: number, trim: number, glow: boolean): THREE.BufferGeometry {
  const b = inked();
  b.taper(1.9, 0.95, 2.05, 1.12, 1.15, color, { at: [0, 0.68, 0], sz: -0.05 });
  // front ribs
  for (const x of [-0.6, 0, 0.6]) b.box(0.08, 1.0, 0.05, shadeHex(color, 0.82), { at: [x, 0.68, 0.53], rot: [-0.07, 0, 0], ink: false });
  b.box(2.08, 0.08, 0.1, trim, { at: [0, 1.22, 0.53], ink: false, glow: glow ? 0xffe58a : undefined });
  b.box(2.08, 0.08, 0.1, trim, { at: [0, 0.18, 0.47], ink: false, glow: glow ? 0xffe58a : undefined });
  // side pockets + wheels
  for (const x of [-1, 1]) {
    b.box(0.08, 0.2, 0.5, shadeHex(color, 0.7), { at: [x * 1.04, 0.95, 0] });
    b.cyl(0.09, 0.09, 0.08, 10, 0x26262b, { at: [x * 0.8, 0.09, 0.35], rot: [0, 0, Math.PI / 2] });
    b.cyl(0.09, 0.09, 0.08, 10, 0x26262b, { at: [x * 0.8, 0.09, -0.35], rot: [0, 0, Math.PI / 2] });
  }
  if (glow) {
    // Crown emblem on the front.
    b.box(0.34, 0.12, 0.03, 0xfff1a0, { at: [0, 0.72, 0.56], ink: false, glow: 0xfff3a8 });
    for (const x of [-0.14, 0, 0.14]) b.cone(0.05, 0.12, 4, 0xfff1a0, { at: [x, 0.84, 0.56], ink: false, glow: 0xfff3a8 });
  } else {
    b.box(0.5, 0.14, 0.02, 0xf2ead8, { at: [0, 0.8, 0.56], ink: false }); // label plate
  }
  return b.build();
}

function dumpsterLid(color: number): THREE.BufferGeometry {
  const b = inked();
  b.box(0.92, 0.05, 1.18, color, { at: [0, 0.02, 0.58] });
  b.box(0.3, 0.05, 0.06, shadeHex(color, 0.6), { at: [0, 0.03, 1.16] });
  return b.build();
}

function grillBody(): THREE.BufferGeometry {
  const b = inked();
  const red = 0xc8322a;
  b.sphere(0.36, 16, 8, red, { at: [0, 0.82, 0], scale: [1, 0.75, 1] });
  b.cyl(0.37, 0.37, 0.03, 18, 0x3a3a40, { at: [0, 0.82, 0], ink: false });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    b.cyl(0.025, 0.025, 0.72, 6, 0x3a3a40, { at: [Math.cos(a) * 0.2, 0.36, Math.sin(a) * 0.2], rot: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] });
  }
  b.cyl(0.05, 0.05, 0.06, 8, 0x26262b, { at: [0.2, 0.05, -0.1], rot: [0, 0, Math.PI / 2] });
  // Side table with a plate of sausages.
  b.box(0.45, 0.04, 0.35, 0xb07a45, { at: [0.62, 0.8, 0] });
  b.cyl(0.02, 0.02, 0.78, 5, 0x8a5a2a, { at: [0.8, 0.4, 0.12] });
  b.cyl(0.02, 0.02, 0.78, 5, 0x8a5a2a, { at: [0.8, 0.4, -0.12] });
  b.cyl(0.14, 0.15, 0.02, 12, 0xf6f6f6, { at: [0.6, 0.83, 0] });
  for (let i = 0; i < 3; i++) b.cyl(0.025, 0.025, 0.16, 6, 0xc4533a, { at: [0.6, 0.86, -0.05 + i * 0.05], rot: [0, 0, Math.PI / 2], ink: false });
  // Glowing coals peeking out.
  b.cyl(0.3, 0.3, 0.02, 14, 0xff6a2a, { at: [0, 0.84, 0], ink: false, glow: 0xff7a3a });
  return b.build();
}

// Keep the dome top only (upper hemisphere) for the grill lid.
function grillLidGeo(): THREE.BufferGeometry {
  const b = inked();
  const dome = new THREE.SphereGeometry(0.365, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(dome, 0xc8322a, { at: [0, 0, 0.3], scale: [1, 0.7, 1] });
  b.cyl(0.03, 0.03, 0.08, 6, 0x26262b, { at: [0, 0.27, 0.3] });
  b.box(0.16, 0.03, 0.04, 0x26262b, { at: [0, 0.31, 0.3] });
  return b.build();
}

function spillGeo(big: boolean): THREE.BufferGeometry {
  const b = new GeoBuilder(true, true);
  const k = big ? 2.2 : 1;
  const bits: [number, number, number, number][] = [
    [0.1, 0.55, 0xf2ead8, 0.07],
    [-0.2, 0.75, 0xf5d547, 0.06],
    [0.25, 0.85, 0xc8ccd6, 0.05],
    [-0.05, 1.0, 0x6fcf5a, 0.05],
    [0.18, 1.1, 0xe03a2e, 0.05],
    [-0.28, 1.05, 0xf2ead8, 0.06],
  ];
  bits.forEach(([x, z, c, r], i) => b.ball(r * k, 0, c, { at: [x * k, r * 0.6, z * k], scale: [1.3, 0.5, 1], jitter: 0.01, seed: i, ink: i % 2 === 0 }));
  return b.build();
}

function arrowGeo(): THREE.BufferGeometry {
  const b = new GeoBuilder(true, true);
  b.cone(0.13, 0.22, 4, PAL.focusRing, { rot: [Math.PI, 0, 0], glow: PAL.focusRing });
  b.box(0.08, 0.14, 0.08, PAL.focusRing, { at: [0, 0.17, 0], glow: PAL.focusRing });
  return b.build();
}

function fliesGeo(): THREE.BufferGeometry {
  const b = new GeoBuilder(false, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.ball(0.018, 0, 0x16161c, { at: [Math.cos(a) * 0.18, (i % 2) * 0.08, Math.sin(a) * 0.18] });
  }
  return b.build();
}

function sparkleGeo(): THREE.BufferGeometry {
  return cachedGeo('can-sparkle', () => {
    const g = new THREE.OctahedronGeometry(0.05, 0);
    g.scale(0.6, 1.6, 0.6);
    return g;
  });
}

interface Built {
  body: THREE.BufferGeometry;
  lid: THREE.BufferGeometry;
}

function buildLook(look: Look, v: number): Built {
  switch (look) {
    case 'standard': {
      const tones = [PAL.canSilver, 0x9aa4b2, 0xa8b8a8, 0x8a96aa];
      const c = tones[v % tones.length]!;
      return {
        body: cachedGeo('can-std-body|' + (v % 4), () => metalCanBody(c, null, v % 4)),
        lid: cachedGeo('can-std-lid|' + (v % 4), () => metalLid(shadeHex(c, 1.06), false)),
      };
    }
    case 'premium':
      return {
        body: cachedGeo('can-prem-body', () => metalCanBody(0xd8e0ea, PAL.premiumGold, 1)),
        lid: cachedGeo('can-prem-lid', () => metalLid(0xe8eef6, true)),
      };
    case 'recycling':
      return { body: cachedGeo('can-rec-body', recyclingBody), lid: cachedGeo('can-rec-lid', recyclingLid) };
    case 'dumpster':
      return {
        body: cachedGeo('can-dump-body', () => dumpsterBody(PAL.dumpsterGreen, 0x2a3a30, false)),
        lid: cachedGeo('can-dump-lid', () => dumpsterLid(0x24503a)),
      };
    case 'goldenDumpster':
      return {
        body: cachedGeo('can-gold-body', () => dumpsterBody(PAL.specialGold, 0xfff1a0, true)),
        lid: cachedGeo('can-gold-lid', () => dumpsterLid(0xe8b830)),
      };
    case 'bbqGrill':
      return { body: cachedGeo('can-grill-body', grillBody), lid: cachedGeo('can-grill-lid', grillLidGeo) };
  }
}

export function createCan(kind: CanKind, special: SpecialCanStyle | null, variant: number): CanModel {
  const look = lookFor(kind, special);
  const spec = LOOKS[look];
  const v = Math.abs(Math.floor(variant || 0));
  const built = buildLook(look, v);
  const root = group(null, 0, 0, 0, 'can:' + look);
  const tip = group(root, 0, 0, 0); // pivot for tipping (front-bottom edge)
  const bodyG = group(tip);
  part(bodyG, built.body);
  const lids: THREE.Group[] = spec.lids.map((l) => {
    const pivot = group(bodyG, l.x, spec.hingeY, spec.hingeZ);
    const mesh = part(pivot, built.lid);
    if (l.w > 0) mesh.position.x = 0;
    return pivot;
  });
  // A peek of food inside open cans (premium/special show off their goods).
  const peek = new THREE.Mesh(lootGeometry(look === 'bbqGrill' ? 'ribs' : look === 'premium' ? 'pizzaSlice' : look === 'goldenDumpster' ? 'goldenBurger' : 'bananaPeel'), modelMaterial());
  peek.position.set(0, spec.height * 0.86, 0);
  peek.scale.setScalar(look === 'dumpster' || look === 'goldenDumpster' ? 1.4 : 0.8);
  peek.visible = false;
  bodyG.add(peek);

  const big = look === 'dumpster' || look === 'goldenDumpster';
  const spill = part(root, cachedGeo('can-spill|' + (big ? 1 : 0), () => spillGeo(big)));
  spill.visible = false;
  const flies = part(root, cachedGeo('can-flies', fliesGeo), 0, spec.height + 0.2, 0);
  flies.visible = false;

  const ring = new THREE.Mesh(ringGeometry(spec.radius + 0.12, spec.radius + 0.24, 40), basicMaterial(PAL.focusRing, { additive: true, opacity: 0.9, depthWrite: false }));
  ring.position.y = 0.03;
  ring.visible = false;
  root.add(ring);
  const arrow = part(root, cachedGeo('can-arrow', arrowGeo), 0, spec.height + 0.55, 0);
  arrow.visible = false;

  const sparkles = group(root, 0, 0, 0);
  const sparkleMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(sparkleGeo(), basicMaterial(0xffffff, { additive: true, depthWrite: false }));
    const a = (i / 6) * Math.PI * 2;
    m.position.set(Math.cos(a) * spec.radius * 0.9, spec.height * (0.55 + (i % 3) * 0.2), Math.sin(a) * spec.radius * 0.9);
    sparkles.add(m);
    sparkleMeshes.push(m);
  }
  sparkles.visible = false;
  let sparkleLevel: 'none' | 'faint' | 'gold' = 'none';

  let state: CanState = 'closed';
  let stateTime = 0;
  let highlight = false;
  const sm = { lid: 0, tip: 0, pop: 0 };

  function update(ctx: ModelContext): void {
    const dt = Math.min(0.1, ctx.dt);
    const t = ctx.time;
    stateTime += dt;
    let lidTarget = 0;
    let popTarget = 0;
    let shake = 0;
    switch (state) {
      case 'rummaging':
        lidTarget = 0.35 + Math.abs(Math.sin(t * 13)) * 0.2;
        popTarget = 0.25;
        shake = 1;
        break;
      case 'open':
      case 'empty':
        lidTarget = 1;
        popTarget = 1;
        break;
      case 'tipped':
        lidTarget = 1;
        popTarget = 1;
        break;
      default:
        break;
    }
    // Lid pop overshoots on first opening.
    sm.lid = damp(sm.lid, lidTarget, state === 'rummaging' ? 20 : 9, dt);
    sm.pop = damp(sm.pop, popTarget, 7, dt);
    for (let i = 0; i < lids.length; i++) {
      const p = lids[i]!;
      if (spec.open === 'hinge') {
        p.rotation.x = spec.openAngle * sm.lid * (i === 1 ? 0.92 : 1);
        p.position.set(spec.lids[i]!.x, spec.hingeY, spec.hingeZ);
        p.rotation.z = 0;
      } else {
        // Pop: rises, flips and lands leaning beside the can (to the right).
        const u = sm.pop;
        const arc = Math.sin(Math.min(1, u) * Math.PI) * 0.5;
        p.position.set(u * 0.55, spec.hingeY + arc - u * (spec.hingeY - 0.33), spec.hingeZ + u * 0.1);
        p.rotation.z = -u * 1.35;
        p.rotation.x = -sm.lid * 0.3 * (1 - u);
      }
    }
    // Shake while rummaging (and a little bump when the state changes).
    const bump = Math.max(0, 1 - stateTime * 4) * 0.05;
    bodyG.rotation.z = shake * Math.sin(t * 31) * 0.05 + Math.sin(stateTime * 40) * bump;
    bodyG.rotation.x = shake * Math.sin(t * 23) * 0.03;
    bodyG.position.y = shake * Math.abs(Math.sin(t * 17)) * 0.03;

    // Tip over (rotate around the front-bottom edge).
    sm.tip = damp(sm.tip, state === 'tipped' ? 1 : 0, 10, dt);
    tip.rotation.x = sm.tip * (Math.PI / 2) * (big ? 0.18 : 1);
    tip.position.z = sm.tip * (big ? 0.1 : spec.radius * 0.1);
    tip.position.y = sm.tip * (big ? 0.05 : spec.radius * 0.95);
    spill.visible = state === 'tipped' && sm.tip > 0.5;

    peek.visible = (state === 'open' || state === 'rummaging') && (look === 'premium' || look === 'bbqGrill' || look === 'goldenDumpster');
    flies.visible = state === 'empty';
    if (flies.visible) {
      flies.rotation.y = t * 5;
      flies.position.y = spec.height + 0.2 + Math.sin(t * 7) * 0.05;
    }

    ring.visible = highlight;
    arrow.visible = highlight;
    if (highlight) {
      const s = 1 + Math.sin(t * 6) * 0.06;
      ring.scale.set(s, 1, s);
      arrow.position.y = spec.height + 0.5 + Math.abs(Math.sin(t * 4)) * 0.18;
      arrow.rotation.y = t * 2;
    }

    const showSparkle = sparkleLevel !== 'none' && state !== 'empty' && state !== 'tipped';
    sparkles.visible = showSparkle;
    if (showSparkle) {
      const gold = sparkleLevel === 'gold';
      sparkleMeshes.forEach((m, i) => {
        if (!gold && i >= 3) {
          m.visible = false;
          return;
        }
        m.visible = true;
        const tw = Math.max(0, Math.sin(t * (2.2 + i * 0.37) + i * 1.9));
        const s = (gold ? 1.5 : 0.9) * tw * tw;
        m.scale.setScalar(Math.max(0.001, s));
        m.rotation.y = t * 2 + i;
      });
    }
  }

  return {
    root,
    update,
    setState(next, nextTime) {
      if (next !== state) stateTime = nextTime;
      state = next;
    },
    setHighlight(on) {
      highlight = on;
    },
    setSparkle(level) {
      if (level === sparkleLevel) return;
      sparkleLevel = level;
      const mat = basicMaterial(level === 'gold' ? PAL.specialGold : 0xf4f0ff, { additive: true, depthWrite: false });
      for (const m of sparkleMeshes) m.material = mat;
    },
    dispose() {
      disposeTree(root);
    },
  };
}

/**
 * The Pleasant Pines cast, built from the ported Bad Hair Day body kit (skinned, inked,
 * vertex-coloured, one draw call each). Outfits are original to this game:
 *   randy  — Big Randy: wide build, red tee, white apron, chef's hat, beard
 *   linda  — HOA Linda: lilac blouse with pearls, navy skirt, white visor, glasses
 *   earl   — Inventor Earl: olive coveralls, goggles pushed up, grey buzz, stubble
 *   granny — Granny: lavender cardigan, plum skirt, silver bun, glasses
 *   todd   — Trampoline Todd: lime athletic tee, shorts, sweatband
 *   player — the one normal person: teal tee, jeans, sneakers
 */
import * as THREE from 'three';

import type { Persona } from './family/anim';
import { arms, band, buttons, collar, feet, hands, hipJ, kneeY, legs, skirt, type BodyCtx } from './family/body';
import { HumanRig } from './family/character';
import { buildHair, type HairStyle } from './family/hairdo';
import { buildHead } from './family/head';
import { pelvis, skinHex, sneaker, top } from './family/outfits';
import { B, type Rig } from './family/skeleton';
import { SkinBuilder } from './family/skin';
import { SPECS, type BodySpec } from './family/spec';
import type { Character, MemberLook } from './family/types';
import { shadeHex } from './render/models/builder';
import { PAL } from './render/palette';

export type CastId = 'randy' | 'linda' | 'earl' | 'granny' | 'todd' | 'player';

interface CastLook {
  spec: BodySpec;
  look: MemberLook;
  hair: HairStyle;
  female: boolean;
  persona: Persona;
  dress(ctx: BodyCtx, sb: SkinBuilder, rig: Rig): void;
}

/** A wider, rounder man for Big Randy. */
const BIG: BodySpec = {
  ...SPECS.man,
  torsoW: SPECS.man.torsoW * 1.32,
  torsoD: SPECS.man.torsoD * 1.4,
  waistW: SPECS.man.waistW * 1.45,
  waistD: SPECS.man.waistD * 1.6,
  hipW: SPECS.man.hipW * 1.25,
  hipD: SPECS.man.hipD * 1.3,
  armR: SPECS.man.armR * 1.25,
  legR: SPECS.man.legR * 1.2,
};

/** A slightly shorter, softer build for Granny. */
const GRANNY: BodySpec = { ...SPECS.woman, waistW: SPECS.woman.waistW * 1.15, waistD: SPECS.woman.waistD * 1.15 };

const LOOKS: Record<CastId, CastLook> = {
  randy: {
    spec: BIG,
    look: { skin: 2, hair: 0x5d3a1a, eyes: 0x6b4a2b, glasses: false, beard: 'beard' },
    hair: 'short',
    female: false,
    persona: 'neighbor',
    dress(ctx, sb) {
      const s = ctx.s;
      pelvis(ctx, 0x34495e);
      const shirt = top(ctx, { color: 0xe74c3c, loose: 1.04, hemY: hipJ(s) + 0.01 });
      // Apron: a white front panel over the shirt.
      top(ctx, { color: 0xffffff, loose: 1.1, hemY: kneeY(s) + 0.12, phi0: -0.95, phiLen: 1.9 });
      band(shirt.b, shirt.rings, s.chestY + 0.02, s.chestY + 0.045, 0xffffff, 0.012, 9, false, -0.95, 1.9);
      arms(ctx, { color: 0xe74c3c, width: 1.15, length: 'short', below: ctx.skin, cuff: shadeHex(0xe74c3c, 0.8) });
      legs(ctx, { color: 0x34495e, width: 1.15 });
      feet(ctx, { kind: 'boot', color: 0x3b2e2a, accent: 0x3b2e2a });
      // Chef's hat: band + puffy crown on the hair bone.
      const hat = sb.on(B.hairTop);
      hat.cyl(s.headRx * 0.95, s.headRx * 0.98, 0.16, 14, 0xffffff, { at: [0, s.headRy * 0.05, 0], smooth: true });
      hat.sphere(1, 12, 8, 0xffffff, { at: [0, s.headRy * 0.05 + 0.2, 0], scale: [s.headRx * 1.25, 0.16, s.headRz * 1.2], smooth: true });
    },
  },
  linda: {
    spec: SPECS.woman,
    look: { skin: 0, hair: 0xf1c94a, eyes: 0x3f6f9f, glasses: true, beard: 'none' },
    hair: 'short',
    female: true,
    persona: 'neighbor',
    dress(ctx, sb) {
      const s = ctx.s;
      pelvis(ctx, 0x2c3e50);
      const t = top(ctx, { color: 0xa98bea, loose: 1.03, hemY: hipJ(s) + 0.02 });
      buttons(t.b, t.rings, s.spineY, s.chestY + 0.06, 3, 0xffffff, 0.009, 0);
      collar(ctx, 0xf7f3ea, 0.014);
      skirt(ctx, s.spineY + 0.02, kneeY(s) - 0.02, s.waistW * 1.05, s.waistD * 1.06, s.hipW * 1.3, s.hipD * 1.25, 0x2c3e50);
      arms(ctx, { color: 0xa98bea, width: 1.06, length: 'wrist', cuff: 0xf7f3ea });
      legs(ctx, { color: ctx.skin, width: 0.98 });
      feet(ctx, { kind: 'flat', color: 0x2c3e50, accent: 0x2c3e50 });
      // HOA visor: band + brim.
      const v = sb.on(B.hairTop);
      v.torus(s.headRx * 1.03, 0.016, 4, 18, 0xffffff, { at: [0, -s.headRy * 0.32, 0], rot: [Math.PI / 2 - 0.15, 0, 0], scale: [1, s.headRz / s.headRx, 1], smooth: true });
      v.cyl(s.headRx * 0.75, s.headRx * 0.75, 0.014, 12, 0xffffff, { at: [0, -s.headRy * 0.3, s.headRz * 0.95], rot: [0.32, 0, 0], scale: [1.05, 1, 0.75] });
    },
  },
  earl: {
    spec: SPECS.man,
    look: { skin: 3, hair: 0xb8b8b8, eyes: 0x4f7f4f, glasses: true, beard: 'stubble' },
    hair: 'buzz',
    female: false,
    persona: 'neighbor',
    dress(ctx, sb) {
      const s = ctx.s;
      const olive = 0x7d8b4a;
      pelvis(ctx, olive);
      const t = top(ctx, { color: olive, loose: 1.06, hemY: hipJ(s) - 0.01 });
      buttons(t.b, t.rings, s.spineY, s.chestY + 0.08, 4, 0xd0c070, 0.01, 0);
      collar(ctx, shadeHex(olive, 0.85), 0.016);
      arms(ctx, { color: olive, width: 1.12, length: 'wrist', cuff: shadeHex(olive, 0.8) });
      legs(ctx, { color: olive, width: 1.12 });
      feet(ctx, { kind: 'boot', color: 0x4a3626, accent: 0x4a3626 });
      // Goggles pushed up on the forehead.
      const g = sb.on(B.hairTop);
      g.torus(s.headRx * 1.02, 0.014, 4, 18, 0x3a3a40, { at: [0, -s.headRy * 0.42, 0], rot: [Math.PI / 2 - 0.35, 0, 0], scale: [1, s.headRz / s.headRx, 1], smooth: true });
      for (const sd of [-1, 1]) {
        g.cyl(0.045, 0.045, 0.03, 10, 0x9fd8ff, { at: [sd * 0.055, -s.headRy * 0.12, s.headRz * 0.98], rot: [Math.PI / 2 - 0.5, 0, 0] });
      }
    },
  },
  granny: {
    spec: GRANNY,
    look: { skin: 1, hair: 0xd9d9de, eyes: 0x4a2e1f, glasses: true, beard: 'none' },
    hair: 'bun',
    female: true,
    persona: 'neighbor',
    dress(ctx) {
      const s = ctx.s;
      const card = 0xb39ddb;
      pelvis(ctx, 0x6d3b5f);
      top(ctx, { color: 0xf7f3ea, loose: 1.02, hemY: hipJ(s) + 0.02 });
      const c = top(ctx, { color: card, loose: 1.1, hemY: hipJ(s) - 0.03, hemBand: shadeHex(card, 0.85), v: [0.6, 0.3, 0.32] });
      buttons(c.b, c.rings, s.spineY, s.chestY + 0.04, 3, 0xf7f3ea, 0.01, 0.42);
      skirt(ctx, s.spineY + 0.02, kneeY(s) - 0.08, s.waistW * 1.1, s.waistD * 1.1, s.hipW * 1.38, s.hipD * 1.3, 0x6d3b5f);
      arms(ctx, { color: card, width: 1.14, length: 'wrist', cuff: shadeHex(card, 0.85) });
      legs(ctx, { color: 0xe9d6c4, width: 1 });
      feet(ctx, { kind: 'flat', color: 0x5a3a2a, accent: 0x5a3a2a });
    },
  },
  todd: {
    spec: SPECS.man,
    look: { skin: 4, hair: 0x2b1d14, eyes: 0x4a2e1f, glasses: false, beard: 'none' },
    hair: 'short',
    female: false,
    persona: 'extra',
    dress(ctx, sb) {
      const s = ctx.s;
      const lime = 0x9be15d;
      pelvis(ctx, 0x2d3047);
      top(ctx, { color: lime, loose: 1.02, hemY: hipJ(s) + 0.01 });
      collar(ctx, 0x2d3047, 0.012);
      arms(ctx, { color: lime, width: 1.05, length: 'short', below: ctx.skin, cuff: 0x2d3047 });
      legs(ctx, { color: 0x2d3047, width: 1.08, hemY: kneeY(s) + s.thighL * 0.5, below: ctx.skin, hemBand: lime });
      feet(ctx, sneaker(0xff6b35));
      const hb = sb.on(B.hairTop);
      hb.torus(s.headRx * 1.02, 0.016, 4, 18, 0xff6b35, { at: [0, -s.headRy * 0.45, 0], rot: [Math.PI / 2 - 0.2, 0, 0], scale: [1, s.headRz / s.headRx, 1], smooth: true });
    },
  },
  player: {
    spec: SPECS.man,
    look: { skin: 2, hair: 0x4a3020, eyes: 0x4a2e1f, glasses: false, beard: 'none' },
    hair: 'short',
    female: false,
    persona: 'extra',
    dress(ctx) {
      const s = ctx.s;
      const teal = 0x1abc9c;
      pelvis(ctx, PAL.denim);
      top(ctx, { color: teal, loose: 1.04, hemY: hipJ(s) + 0.005, hemBand: shadeHex(teal, 0.85) });
      collar(ctx, shadeHex(teal, 0.8), 0.012);
      arms(ctx, { color: teal, width: 1.08, length: 'short', below: ctx.skin, cuff: shadeHex(teal, 0.8) });
      legs(ctx, { color: PAL.denim, width: 1.08 });
      feet(ctx, sneaker(0xffd23f));
    },
  },
};

function buildCast(c: CastLook, rig: Rig): THREE.BufferGeometry {
  const s = c.spec;
  const sb = new SkinBuilder(rig.rest);
  const ctx: BodyCtx = { sb, s, skin: skinHex(c.look), low: true };
  buildHead(sb, s, {
    skin: ctx.skin,
    eyes: c.look.eyes,
    hair: c.look.hair,
    lashes: c.female,
    glasses: c.look.glasses ? PAL.glassesFrame : null,
    beard: c.look.beard,
    brows: c.female ? 'arched' : 'thick',
    ears: true,
    starClip: null,
    low: true,
  });
  hands(ctx);
  buildHair(sb, s, rig, c.hair, c.look.hair, 3);
  c.dress(ctx, sb, rig);
  return sb.build();
}

/** Is this one of the cast with a hand-made look? */
export function isCastId(id: string): id is CastId {
  return id in LOOKS;
}

export function createNeighbor(id: CastId): Character {
  const c = LOOKS[id];
  return new HumanRig({
    id: 'extra',
    spec: c.spec,
    persona: c.persona,
    flavor: 'extra',
    key: () => `eif-cast|${id}`,
    build: (_outfit, rig) => buildCast(c, rig),
    outfit: 'day',
    hair: null,
    beard: false,
    low: true,
    hairSim: c.hair === 'bun' || c.hair === 'buzz' ? 'none' : 'bounce',
    seed: id.length * 13,
  });
}

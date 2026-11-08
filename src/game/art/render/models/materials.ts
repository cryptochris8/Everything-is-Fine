// ─────────────────────────────────────────────────────────────────────────────
// Model materials — WebGPU/TSL port of the Bad Hair Day / Trash Panda material
// family (same exported API, so the ported model code runs unchanged).
//
// The originals extend MeshToonMaterial through onBeforeCompile (GLSL), which the
// Genesys engine's WebGPURenderer ignores. Following Mailbox Mayhem's Genesys port
// (That-One-Mailman/src/render/models/materials.ts), every variant is a
// MeshToonNodeMaterial with TSL nodes:
//   • ink hull  — vertices with non-zero `aInk` are pushed out by a
//                 camera-distance-dependent width and painted ink;
//   • glow      — vertices with non-zero `aGlow` draw unlit in that colour;
//   • tint/fade — per-instance materials carry their own colour multiplier + opacity;
//   • windows   — glass that glows warm when its `aRank` < uLit.
// Uniform objects keep the `{ value }` shape (TSL uniform nodes expose `.value`).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { attribute, clamp, dot, max, modelViewMatrix, positionLocal, select, step, uniform, varying, vec3, vec4 } from 'three/tsl';
import { MeshToonNodeMaterial, type Node, type NodeBuilder } from 'three/webgpu';

import { PAL } from '../palette';
import { toonGradient } from '../toon';
import { INK_BASE } from './builder';
import { markShared } from './shared';

/** Outline width (m) = clamp(viewDistance × SCALE, MIN, MAX): roughly constant on screen. */
export const INK_WIDTH = { SCALE: 0.0019, MIN: INK_BASE, MAX: 0.05 } as const;

type U<T> = { value: T };

const shared = {
  uInkColor: uniform(new THREE.Color(PAL.outline)),
  uInkScale: uniform(INK_WIDTH.SCALE as number),
  uInkMin: uniform(INK_WIDTH.MIN as number),
  uInkMax: uniform(INK_WIDTH.MAX as number),
  uInkBase: uniform(INK_BASE),
};

const aInk = attribute('aInk', 'vec3');
const aGlow = attribute('aGlow', 'vec3');

/** Ink hull: body vertices have aInk = 0 and never move. */
const inkPosition = (() => {
  const viewZ = modelViewMatrix.mul(vec4(positionLocal, 1)).z;
  const width = max(clamp(viewZ.negate().mul(shared.uInkScale), shared.uInkMin, shared.uInkMax).sub(shared.uInkBase), 0);
  return positionLocal.add(aInk.mul(width));
})();

const vInk = varying(step(0.0001, dot(aInk, aInk)), 'vEifInk');
const vGlow = varying(aGlow, 'vEifGlow');
const INK_RGB = shared.uInkColor as unknown as Node<'vec3'>;

export interface ModelMatOpts {
  /** Extra constant emissive (hex). */
  emissive?: number;
}

export interface InstanceUniforms {
  uTint: U<THREE.Color>;
  uFade: U<number>;
}

/** Vertex-coloured toon with ink hull, glow, tint and fade. */
class ModelToonMaterial extends MeshToonNodeMaterial {
  constructor(private readonly u: InstanceUniforms) {
    super({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient() });
    this.positionNode = inkPosition;
  }

  override setupOutput(builder: NodeBuilder, outputNode: Node): Node {
    const out = outputNode as unknown as { rgb: Node<'vec3'>; a: Node<'float'> };
    const tint = this.u.uTint as unknown as Node<'vec3'>;
    const fade = this.u.uFade as unknown as Node<'float'>;
    let rgb: Node<'vec3'> = out.rgb.mul(tint);
    rgb = select<'vec3'>(vGlow.r.add(vGlow.g).add(vGlow.b).greaterThan(0.001), vGlow, rgb);
    rgb = select<'vec3'>(vInk.greaterThan(0.5), INK_RGB, rgb);
    return super.setupOutput(builder, vec4(rgb, out.a.mul(fade)));
  }
}

function newInstanceUniforms(): InstanceUniforms {
  return {
    uTint: uniform(new THREE.Color(1, 1, 1)) as unknown as U<THREE.Color>,
    uFade: uniform(1) as unknown as U<number>,
  };
}

function build(key: string, o: ModelMatOpts, uniforms: InstanceUniforms): THREE.MeshToonMaterial {
  const m = new ModelToonMaterial(uniforms);
  if (o.emissive) {
    m.emissive.setHex(o.emissive);
  }
  m.name = 'eif-model-' + key;
  return m as unknown as THREE.MeshToonMaterial;
}

const cache = new Map<string, THREE.MeshToonMaterial>();
const sharedInstance = newInstanceUniforms();

/** Shared vertex-coloured toon material for GeoBuilder geometry (needs aInk/aGlow attributes). */
export function modelMaterial(o: ModelMatOpts = {}): THREE.MeshToonMaterial {
  const key = String(o.emissive ?? 0);
  let m = cache.get(key);
  if (!m) {
    m = markShared(build(key, o, sharedInstance));
    cache.set(key, m);
  }
  return m;
}

/** A per-instance (NOT shared) model material with its own tint + fade uniforms. Dispose it yourself. */
export function instanceMaterial(o: ModelMatOpts = {}): { material: THREE.MeshToonMaterial; uniforms: InstanceUniforms } {
  const uniforms = newInstanceUniforms();
  return { material: build('inst', o, uniforms), uniforms };
}

/** Apply a fade to a per-instance material (switches transparency on/off only when needed). */
export function setFade(material: THREE.Material, uniforms: { uFade: U<number> }, alpha: number): void {
  const a = Math.max(0, Math.min(1, alpha));
  uniforms.uFade.value = a;
  const wantTransparent = a < 0.999;
  if (material.transparent !== wantTransparent) {
    material.transparent = wantTransparent;
    material.depthWrite = true;
    material.needsUpdate = true;
  }
}

// ── scenery: plain vertex-coloured toon (no ink / glow attributes) ─────────────
let sceneryMat: THREE.MeshToonMaterial | null = null;
export function sceneryMaterial(): THREE.MeshToonMaterial {
  if (!sceneryMat) {
    sceneryMat = markShared(new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient() }));
    sceneryMat.name = 'eif-scenery';
  }
  return sceneryMat;
}

const basicCache = new Map<string, THREE.MeshBasicMaterial>();

/** Shared unlit material (halos, bulbs, highlight fills, sparkles). */
export function basicMaterial(
  color: number,
  o: { additive?: boolean; opacity?: number; vertexColors?: boolean; doubleSide?: boolean; depthWrite?: boolean } = {},
): THREE.MeshBasicMaterial {
  const key = `${color}|${o.additive ? 1 : 0}|${o.opacity ?? 1}|${o.vertexColors ? 1 : 0}|${o.doubleSide ? 1 : 0}|${o.depthWrite ?? 'd'}`;
  let m = basicCache.get(key);
  if (!m) {
    const transparent = !!o.additive || (o.opacity ?? 1) < 1;
    m = new THREE.MeshBasicMaterial({
      color,
      vertexColors: !!o.vertexColors,
      transparent,
      opacity: o.opacity ?? 1,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: o.depthWrite ?? !transparent,
      side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      fog: !o.additive,
    });
    m.name = 'eif-basic';
    markShared(m);
    basicCache.set(key, m);
  }
  return m;
}

// ── house windows: per-house material, windows glow when their rank < uLit ─────
export interface WindowUniforms {
  uLit: U<number>;
  uFade: U<number>;
}

const aRank = attribute('aRank', 'float');
const vRank = varying(aRank, 'vEifRank');

class WindowMaterial extends MeshToonNodeMaterial {
  constructor(
    private readonly u: WindowUniforms,
    private readonly warm: THREE.Color,
  ) {
    super({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient() });
  }

  override setupOutput(builder: NodeBuilder, outputNode: Node): Node {
    const out = outputNode as unknown as { rgb: Node<'vec3'>; a: Node<'float'> };
    const lit = this.u.uLit as unknown as Node<'float'>;
    const fade = this.u.uFade as unknown as Node<'float'>;
    const warm = vec3(this.warm.r, this.warm.g, this.warm.b);
    // Daytime glass: Trash Panda's night-blue panes lifted toward a bright sky reflection.
    const day = out.rgb.mul(0.35).add(vec3(0.42, 0.66, 0.86).mul(0.65));
    const rgb = select<'vec3'>(vRank.lessThan(lit), warm, day);
    return super.setupOutput(builder, vec4(rgb, out.a.mul(fade)));
  }
}

/** Window glass material: dark blue glass by vertex colour, lit windows glow warm. One per house. */
export function windowMaterial(): { material: THREE.MeshToonMaterial; uniforms: WindowUniforms } {
  const uniforms: WindowUniforms = { uLit: uniform(0) as unknown as U<number>, uFade: uniform(1) as unknown as U<number> };
  const m = new WindowMaterial(uniforms, new THREE.Color(PAL.windowWarm));
  m.name = 'eif-window';
  return { material: m as unknown as THREE.MeshToonMaterial, uniforms };
}

class FadeMaterial extends MeshToonNodeMaterial {
  constructor(private readonly u: { uFade: U<number> }) {
    super({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient() });
  }

  override setupOutput(builder: NodeBuilder, outputNode: Node): Node {
    const out = outputNode as unknown as { rgb: Node<'vec3'>; a: Node<'float'> };
    return super.setupOutput(builder, vec4(out.rgb, out.a.mul(this.u.uFade as unknown as Node<'float'>)));
  }
}

/** Per-house wall/roof material with fade support (plain vertex-coloured toon). */
export function fadeableSceneryMaterial(): { material: THREE.MeshToonMaterial; uniforms: { uFade: U<number> } } {
  const uniforms = { uFade: uniform(1) as unknown as U<number> };
  const m = new FadeMaterial(uniforms);
  m.name = 'eif-fadeable';
  return { material: m as unknown as THREE.MeshToonMaterial, uniforms };
}

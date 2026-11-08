/**
 * Pooled effects: puffs (smoke/dust), droplets (sprinkler, splash), bits (confetti, leaves,
 * feathers, fireworks), the burger landing marker, a persistent puddle, and the Mow-Bot's
 * mowed trail. Everything is pooled (no allocation in the frame loop) and hidden when idle,
 * so idle effects cost no draw calls. No flashing; reduced-motion halves particle counts.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import type { FxKind } from '../sim/comedy/types.js';
import type { Vec2 } from '../sim/core/vec.js';
import type { Sim } from '../sim/sim.js';
import { SPOTS } from '../sim/world/layout.js';
import { G } from './Neighborhood.js';

interface Particle {
  node: ENGINE.MeshNode;
  mat: THREE.MeshBasicMaterial;
  alive: boolean;
  age: number;
  life: number;
  vel: THREE.Vector3;
  gravity: number;
  grow: number;
  baseScale: number;
  spin: number;
}

const PALETTE: Record<string, readonly string[]> = {
  smoke: ['#f4f6f7', '#eceff1', '#e5e8e8'],
  bigsmoke: ['#7f8c8d', '#95a5a6', '#5d6d7e'],
  dust: ['#d2b48c', '#c8a97e', '#e0c9a6'],
  splash: ['#5dade2', '#85c1e9', '#aed6f1'],
  confetti: ['#ff6fae', '#ffd23f', '#3ec1d3', '#7bed9f', '#b07cff', '#ff8a3d'],
  fireworks: ['#ff4757', '#ffd23f', '#3ec1d3', '#7bed9f', '#ffffff'],
  feathers: ['#ffffff', '#f5f5f5', '#fdebd0'],
  leaves: ['#4fae4a', '#6ccc5e', '#3f9c46'],
  hearts: ['#ff6fae', '#ff4757'],
  stars: ['#ffd23f', '#fff3b0'],
  sparkle: ['#fff3b0', '#ffffff'],
};

export class Fx {
  private readonly puffs: Particle[] = [];
  private readonly bits: Particle[] = [];
  private readonly marker: ENGINE.MeshNode;
  private readonly markerMat: THREE.MeshBasicMaterial;
  private markerLeft = 0;
  private markerDur = 1;
  private readonly puddle: ENGINE.MeshNode;
  private readonly puddleMat: THREE.MeshBasicMaterial;
  private puddleLevel = 0;
  private readonly trail: THREE.BufferGeometry;
  private readonly trailNode: ENGINE.MeshNode;
  private trailCount = 0;
  private lastTrail: Vec2 | null = null;
  private emitAcc = 0;
  private sprayAngle = 0;
  public reducedMotion = false;
  private static readonly TRAIL_MAX = 600;

  public constructor(world: ENGINE.World) {
    const puffGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const bitGeo = new THREE.BoxGeometry(0.12, 0.12, 0.03);
    for (let i = 0; i < 40; i++) {
      this.puffs.push(this.makeParticle(world, puffGeo));
    }
    for (let i = 0; i < 160; i++) {
      this.bits.push(this.makeParticle(world, bitGeo));
    }
    this.markerMat = new THREE.MeshBasicMaterial({ color: '#ff4757', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.marker = ENGINE.MeshNode.create({
      name: 'LandingMarker',
      geometry: new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2),
      material: this.markerMat,
      physicsOptions: { enabled: false },
    });
    this.marker.visible = false;
    world.add(this.marker);

    this.puddleMat = new THREE.MeshBasicMaterial({ color: '#5dade2', transparent: true, opacity: 0, depthWrite: false });
    this.puddle = ENGINE.MeshNode.create({
      name: 'Puddle',
      geometry: new THREE.CircleGeometry(5.6, 28).rotateX(-Math.PI / 2),
      material: this.puddleMat,
      position: new THREE.Vector3(SPOTS.sprinklerHead.x, G + 0.04, SPOTS.sprinklerHead.z),
      physicsOptions: { enabled: false },
    });
    this.puddle.visible = false;
    world.add(this.puddle);

    this.trail = new THREE.BufferGeometry();
    this.trail.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(Fx.TRAIL_MAX * 18), 3));
    this.trail.setDrawRange(0, 0);
    this.trailNode = ENGINE.MeshNode.create({
      name: 'MowTrail',
      geometry: this.trail,
      material: new THREE.MeshBasicMaterial({ color: '#b6ec8f', side: THREE.DoubleSide }),
      physicsOptions: { enabled: false },
    });
    this.trailNode.frustumCulled = false;
    world.add(this.trailNode);
  }

  private makeParticle(world: ENGINE.World, geo: THREE.BufferGeometry): Particle {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false });
    const node = ENGINE.MeshNode.create({ geometry: geo, material: mat, physicsOptions: { enabled: false } });
    node.visible = false;
    world.add(node);
    return { node, mat, alive: false, age: 0, life: 1, vel: new THREE.Vector3(), gravity: 0, grow: 0, baseScale: 1, spin: 0 };
  }

  private spawn(pool: Particle[], x: number, y: number, z: number, color: string, life: number, vel: THREE.Vector3, gravity: number, scale: number, grow: number): void {
    const p = pool.find((q) => !q.alive) ?? pool.reduce((a, q) => (q.age / q.life > a.age / a.life ? q : a));
    p.alive = true;
    p.age = 0;
    p.life = life;
    p.vel.copy(vel);
    p.gravity = gravity;
    p.baseScale = scale;
    p.grow = grow;
    p.spin = (Math.random() - 0.5) * 12; // cosmetic only, never affects the sim
    p.mat.color.set(color);
    p.mat.opacity = 1;
    p.node.position.set(x, y, z);
    p.node.scale.setScalar(scale);
    p.node.visible = true;
  }

  /** One-shot effect requested by the sim. */
  public burst(kind: FxKind, at: Vec2, y: number, r: number, dur: number): void {
    if (kind === 'landing') {
      this.markerLeft = dur;
      this.markerDur = dur;
      this.marker.position.set(at.x, G + 0.06, at.z);
      this.marker.scale.setScalar(Math.max(0.5, r));
      this.marker.visible = true;
      return;
    }
    const k = this.reducedMotion ? 0.5 : 1;
    const colors = PALETTE[kind] ?? PALETTE.sparkle!;
    const pick = () => colors[Math.floor(Math.random() * colors.length)]!;
    const base = G + y;
    if (kind === 'smoke' || kind === 'bigsmoke' || kind === 'dust') {
      const n = Math.round((kind === 'bigsmoke' ? 12 : 7) * k);
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3((Math.random() - 0.5) * 0.8, kind === 'dust' ? 0.5 : 1.2 + Math.random(), (Math.random() - 0.5) * 0.8);
        this.spawn(this.puffs, at.x + (Math.random() - 0.5) * r, base + (kind === 'dust' ? 0.2 : 1.1), at.z + (Math.random() - 0.5) * r, pick(), 1.4 + Math.random() * dur * 0.3, v, 0, kind === 'bigsmoke' ? 1.2 : 0.7, 1.2);
      }
      return;
    }
    const n = Math.round((kind === 'confetti' || kind === 'fireworks' ? 40 : 18) * k);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = kind === 'fireworks' ? 9 + Math.random() * 5 : 3 + Math.random() * 3;
      const out = kind === 'fireworks' ? 1 : 1.5 + Math.random() * 2;
      const v = new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out);
      const startY = kind === 'fireworks' ? base + 2 : base + 0.6;
      this.spawn(this.bits, at.x + (Math.random() - 0.5) * r, startY, at.z + (Math.random() - 0.5) * r, pick(), 1.6 + Math.random() * 0.8, v, kind === 'feathers' || kind === 'leaves' ? 3 : 9, kind === 'hearts' || kind === 'stars' ? 1.6 : 1, 0);
    }
  }

  /** Continuous effects derived from world state (sprinkler, grill smoke, mower trail). */
  public update(dt: number, sim: Sim): void {
    const valve = sim.props.get('valve')!.state;
    const spraying = valve === 'on' || valve === 'jammed';
    const grill = sim.props.get('grill')!.state;
    this.emitAcc += dt;
    if (spraying) {
      this.puddleLevel = Math.min(1, this.puddleLevel + dt * 0.08);
      this.sprayAngle += dt * (valve === 'jammed' ? 0 : 2.2);
      const n = this.reducedMotion ? 1 : 3;
      for (let i = 0; i < n; i++) {
        const a = valve === 'jammed' ? Math.random() * Math.PI * 2 : this.sprayAngle + (Math.random() - 0.5) * 0.5;
        const up = valve === 'jammed' ? 9 + Math.random() * 3 : 4 + Math.random();
        const out = valve === 'jammed' ? 0.6 : 3.4;
        this.spawn(this.bits, SPOTS.sprinklerHead.x, G + 0.3, SPOTS.sprinklerHead.z, PALETTE.splash![i % 3]!, 1.1, new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out), 9.8, 0.8, 0);
      }
    }
    if (this.puddleLevel > 0) {
      this.puddle.visible = true;
      this.puddleMat.opacity = 0.42 * this.puddleLevel;
    }
    if ((grill === 'cooking' || grill === 'smoking' || grill === 'flaming') && this.emitAcc > (grill === 'flaming' ? 0.12 : 0.45)) {
      const g = SPOTS.grill;
      this.spawn(this.puffs, g.x + (Math.random() - 0.5) * 0.4, G + 1.3, g.z + (Math.random() - 0.5) * 0.4, grill === 'flaming' ? '#7f8c8d' : '#f4f6f7', 2.2, new THREE.Vector3((Math.random() - 0.5) * 0.3, 1.1, (Math.random() - 0.5) * 0.3), 0, 0.3, 1.4);
    }
    if (this.emitAcc > 0.45) {
      this.emitAcc = 0;
    }
    // Mow-Bot trail while it's out of control (the arrow it carves stays all day).
    const mower = sim.actors.get('mower')!;
    if (sim.ledger.truthy('mower_rogue') && mower.order) {
      this.extendTrail(mower.pos);
    } else {
      this.lastTrail = null;
    }

    for (const pool of [this.puffs, this.bits]) {
      for (const p of pool) {
        if (!p.alive) {
          continue;
        }
        p.age += dt;
        if (p.age >= p.life) {
          p.alive = false;
          p.node.visible = false;
          continue;
        }
        p.vel.y -= p.gravity * dt;
        const pos = p.node.position;
        pos.addScaledVector(p.vel, dt);
        if (pos.y < G + 0.03) {
          pos.y = G + 0.03;
          p.vel.set(p.vel.x * 0.3, 0, p.vel.z * 0.3);
        }
        const k = p.age / p.life;
        p.node.scale.setScalar(p.baseScale * (1 + p.grow * k));
        p.node.rotation.z += p.spin * dt;
        const peak = pool === this.puffs ? 0.55 : 1;
        p.mat.opacity = peak * (k > 0.5 ? 1 - (k - 0.5) / 0.5 : 1);
      }
    }

    if (this.markerLeft > 0) {
      this.markerLeft -= dt;
      const k = 1 - this.markerLeft / this.markerDur;
      this.markerMat.opacity = 0.55 + 0.35 * Math.sin(k * Math.PI * 8) * (this.reducedMotion ? 0 : 1);
      this.marker.visible = this.markerLeft > 0;
    }
  }

  private extendTrail(p: Vec2): void {
    if (this.lastTrail && Math.hypot(p.x - this.lastTrail.x, p.z - this.lastTrail.z) < 0.5) {
      return;
    }
    if (this.lastTrail && this.trailCount < Fx.TRAIL_MAX) {
      const a = this.lastTrail;
      const dx = p.x - a.x;
      const dz = p.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * 0.55;
      const nz = (dx / len) * 0.55;
      const y = G + 0.045;
      const arr = this.trail.getAttribute('position') as THREE.BufferAttribute;
      const o = this.trailCount * 18;
      const v = [a.x + nx, y, a.z + nz, a.x - nx, y, a.z - nz, p.x + nx, y, p.z + nz, a.x - nx, y, a.z - nz, p.x - nx, y, p.z - nz, p.x + nx, y, p.z + nz];
      for (let i = 0; i < 18; i++) {
        (arr.array as Float32Array)[o + i] = v[i]!;
      }
      arr.needsUpdate = true;
      this.trailCount += 1;
      this.trail.setDrawRange(0, this.trailCount * 6);
      this.trail.computeBoundingSphere();
    }
    this.lastTrail = { ...p };
  }

  /** New day: the street heals overnight. */
  public reset(): void {
    this.puddleLevel = 0;
    this.puddle.visible = false;
    this.trailCount = 0;
    this.trail.setDrawRange(0, 0);
    this.lastTrail = null;
    this.markerLeft = 0;
    this.marker.visible = false;
    for (const p of [...this.puffs, ...this.bits]) {
      p.alive = false;
      p.node.visible = false;
    }
  }
}

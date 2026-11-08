/**
 * The residents, built from chunky primitives with distinct silhouettes (Randy's chef hat,
 * Linda's visor, Earl's goggles, Granny's sheriff hat) and a small reusable animation
 * vocabulary driven by the sim's actor state: walk cycle, wave, cheer, point, write, grill,
 * shrug, flail, sit, sniff, plus arcs through the air.
 *
 * Static parts of each character are batched into one mesh; only limbs are separate, so
 * the whole cast costs ~45 draw calls.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import type { ActorState } from '../sim/world/state.js';
import { Batch, batchMaterial } from './Batch.js';
import { isCastId } from './art/neighbors.js';
import { modelMaterial } from './art/render/models/materials.js';
import { admiralCatGeometry, robotVacuumGeometry } from './art/encounterModels.js';
import { chickenGeometry, mowBotGeometry } from './art/yard.js';
import { CastActor, DogActor } from './CastViews.js';
import { G } from './Neighborhood.js';

/** `?oldart=1` keeps the session-1 primitive look (for comparison). */
const params = new URLSearchParams(globalThis.location?.search ?? '');

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac'] as const;

interface Look {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  height: number;
  width: number;
  extras: (b: Batch, top: number, head: number) => void;
  /** Colour of arms (sleeves). */
  sleeve?: string;
}

const LOOKS: Record<string, Look> = {
  randy: {
    skin: SKIN[0],
    shirt: '#e74c3c',
    pants: '#34495e',
    hair: '#5d3a1a',
    height: 1.08,
    width: 1.45,
    extras: (b, top, head) => {
      // Apron, mustache, towering chef hat.
      b.box(0.62, 0.62, 0.05, '#ffffff', 0, top - 0.42, 0.42);
      b.box(0.24, 0.06, 0.06, '#5d3a1a', 0, head - 0.05, 0.25);
      b.add(new THREE.CylinderGeometry(0.22, 0.2, 0.36, 10), '#ffffff', { x: 0, y: head + 0.36, z: 0 });
      b.add(new THREE.IcosahedronGeometry(0.27, 1), '#ffffff', { x: 0, y: head + 0.6, z: 0 });
    },
  },
  linda: {
    skin: SKIN[3],
    shirt: '#7b68ee',
    pants: '#2c3e50',
    hair: '#f4d03f',
    height: 1.06,
    width: 0.9,
    extras: (b, _top, head) => {
      // Bob haircut, visor, glasses, pearl necklace.
      b.add(new THREE.CylinderGeometry(0.27, 0.27, 0.28, 12), '#f4d03f', { x: 0, y: head + 0.02, z: -0.03 });
      b.box(0.5, 0.05, 0.22, '#ffffff', 0, head + 0.16, 0.2);
      b.box(0.34, 0.06, 0.04, '#222222', 0, head + 0.04, 0.24);
      b.add(new THREE.TorusGeometry(0.15, 0.025, 4, 12), '#fdf6e3', { x: 0, y: head - 0.3, z: 0.05 }, 0, Math.PI / 2);
    },
  },
  earl: {
    skin: SKIN[1],
    shirt: '#f1c40f',
    pants: '#2e86c1',
    hair: '#ecf0f1',
    height: 1.0,
    width: 1.0,
    sleeve: '#f1c40f',
    extras: (b, top, head) => {
      // Overall bib, wild hair tufts, goggles pushed up, beard.
      b.box(0.44, 0.4, 0.06, '#2e86c1', 0, top - 0.3, 0.3);
      for (const [x, z] of [[-0.18, -0.05], [0.18, -0.05], [0, -0.15], [-0.1, 0.1], [0.12, 0.1]] as const) {
        b.add(new THREE.IcosahedronGeometry(0.11, 0), '#ecf0f1', { x, y: head + 0.22, z });
      }
      b.add(new THREE.TorusGeometry(0.24, 0.035, 4, 16), '#444444', { x: 0, y: head + 0.13, z: 0 }, 0, Math.PI / 2);
      b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), '#5dade2', { x: -0.09, y: head + 0.14, z: 0.22 }, 0, Math.PI / 2);
      b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), '#5dade2', { x: 0.09, y: head + 0.14, z: 0.22 }, 0, Math.PI / 2);
      b.add(new THREE.IcosahedronGeometry(0.16, 0), '#d5d8dc', { x: 0, y: head - 0.16, z: 0.12 });
    },
  },
  granny: {
    skin: SKIN[3],
    shirt: '#f5a3c7',
    pants: '#f5a3c7',
    hair: '#f2f3f4',
    height: 0.86,
    width: 1.05,
    extras: (b, top, head) => {
      // Sheriff hat, star badge, white bun, cardigan.
      b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), '#c8a165', { x: 0, y: head + 0.17, z: 0 });
      b.add(new THREE.CylinderGeometry(0.18, 0.22, 0.24, 12), '#b8925a', { x: 0, y: head + 0.3, z: 0 });
      b.add(new THREE.IcosahedronGeometry(0.12, 0), '#f2f3f4', { x: 0, y: head + 0.05, z: -0.22 });
      b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 5), '#f1c40f', { x: 0.13, y: top - 0.2, z: 0.31 }, 0, Math.PI / 2);
      b.box(0.62, 0.5, 0.05, '#ffffff', 0, top - 0.32, -0.33);
    },
  },
  todd: {
    skin: SKIN[2],
    shirt: '#ffffff',
    pants: '#16a085',
    hair: '#2c1608',
    height: 1.02,
    width: 1.0,
    sleeve: SKIN[2],
    extras: (b, _top, head) => {
      // Sweatband, sunglasses. Tank top, swim trunks. Unbothered.
      b.add(new THREE.TorusGeometry(0.24, 0.04, 4, 16), '#e74c3c', { x: 0, y: head + 0.08, z: 0 }, 0, Math.PI / 2);
      b.box(0.36, 0.08, 0.05, '#111111', 0, head + 0.03, 0.23);
    },
  },
};

class Limb {
  public readonly node: ENGINE.MeshNode;
  public constructor(parent: THREE.Object3D, radius: number, length: number, color: string, x: number, y: number, z = 0) {
    const geo = new THREE.CylinderGeometry(radius, radius * 0.9, length, 7).translate(0, -length / 2, 0);
    this.node = ENGINE.MeshNode.create({
      geometry: geo,
      material: new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true }),
      position: new THREE.Vector3(x, y, z),
      castShadow: true,
      physicsOptions: { enabled: false },
    });
    parent.add(this.node);
  }
}

export interface ActorView {
  readonly id: string;
  readonly root: ENGINE.SceneNode;
  /** World-space point above the head for bubbles. */
  headTop(out: THREE.Vector3): THREE.Vector3;
  update(a: ActorState, simT: number, dt: number, seated: boolean): void;
}

function arcY(a: ActorState, simT: number): number {
  const f = a.flight;
  if (!f) {
    return 0;
  }
  const k = Math.min(1, Math.max(0, (simT - f.t0) / (f.t1 - f.t0)));
  return f.fromY + (f.toY - f.fromY) * k + 4 * f.height * k * (1 - k);
}

class Humanoid implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly torso: ENGINE.SceneNode;
  private readonly armL: Limb;
  private readonly armR: Limb;
  private readonly legL: Limb;
  private readonly legR: Limb;
  private readonly hipY: number;
  private readonly topY: number;
  private phase = 0;
  private lastPos = new THREE.Vector2();
  private speed = 0;
  private spin = 0;

  public constructor(world: ENGINE.World, public readonly id: string, look: Look) {
    const h = look.height;
    const w = look.width;
    this.hipY = 0.78 * h;
    const torsoLen = 0.62 * h;
    this.topY = this.hipY + torsoLen;
    const head = this.topY + 0.3;
    this.root = ENGINE.SceneNode.create({ name: `Actor:${id}` });
    this.torso = ENGINE.SceneNode.create({ name: 'Torso' });
    this.root.add(this.torso);

    const b = new Batch();
    const r = 0.27 * w;
    b.add(new THREE.CapsuleGeometry(r, torsoLen - r, 4, 10), look.shirt, { x: 0, y: this.hipY + torsoLen / 2, z: 0 });
    b.add(new THREE.CylinderGeometry(r * 1.02, r * 1.05, 0.22, 10), look.pants, { x: 0, y: this.hipY + 0.06, z: 0 });
    b.add(new THREE.IcosahedronGeometry(0.25, 1), look.skin, { x: 0, y: head, z: 0 });
    b.add(new THREE.IcosahedronGeometry(0.245, 1), look.hair, { x: 0, y: head + 0.1, z: -0.09 });
    b.add(new THREE.IcosahedronGeometry(0.045, 0), '#1b1b1b', { x: -0.085, y: head + 0.03, z: 0.22 });
    b.add(new THREE.IcosahedronGeometry(0.045, 0), '#1b1b1b', { x: 0.085, y: head + 0.03, z: 0.22 });
    b.add(new THREE.IcosahedronGeometry(0.05, 0), look.skin, { x: 0, y: head - 0.04, z: 0.25 });
    look.extras(b, this.topY, head);
    const mesh = ENGINE.MeshNode.create({ geometry: b.build(), material: batchMaterial(), castShadow: true, physicsOptions: { enabled: false } });
    this.torso.add(mesh);

    const armX = r + 0.07;
    const armLen = 0.58 * h;
    const sleeve = look.sleeve ?? look.shirt;
    this.armL = new Limb(this.torso, 0.075, armLen, sleeve, armX, this.topY - 0.06);
    this.armR = new Limb(this.torso, 0.075, armLen, sleeve, -armX, this.topY - 0.06);
    this.legL = new Limb(this.root, 0.1 * w, this.hipY, look.pants, 0.11 * w, this.hipY);
    this.legR = new Limb(this.root, 0.1 * w, this.hipY, look.pants, -0.11 * w, this.hipY);
    world.add(this.root);
  }

  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + this.topY + 0.95, this.root.position.z);
  }

  public update(a: ActorState, simT: number, dt: number, seated: boolean): void {
    this.root.visible = a.visible;
    const y = G + arcY(a, simT) + (seated ? 0.35 : 0);
    this.root.position.set(a.pos.x, y, a.pos.z);
    const moved = Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.y);
    this.lastPos.set(a.pos.x, a.pos.z);
    const inst = dt > 0 ? moved / dt : 0;
    this.speed += (Math.min(inst, 9) - this.speed) * Math.min(1, dt * 10);
    // Face travel / sim yaw (model faces +Z; sim yaw 0 = +Z).
    let yaw = a.yaw;
    if (a.anim === 'spin') {
      this.spin += dt * 12;
      yaw += this.spin;
    }
    this.root.rotation.set(0, yaw, 0);

    const walking = this.speed > 0.4 && !a.flight && !seated;
    this.phase += dt * (walking ? 3 + this.speed * 1.6 : 0);
    const swing = walking ? Math.sin(this.phase) * Math.min(0.9, 0.25 + this.speed * 0.15) : 0;
    const t = simT;
    let aL = { x: -swing * 0.8, z: 0.08 };
    let aR = { x: swing * 0.8, z: -0.08 };
    let legL = swing;
    let legR = -swing;
    let bob = walking ? Math.abs(Math.sin(this.phase)) * 0.06 : Math.sin(t * 2 + a.pos.x) * 0.012;
    let tilt = 0;
    let scale = 1;
    let torsoDrop = 0;

    if (a.flight) {
      aL = { x: -0.4, z: 2.6 };
      aR = { x: -0.4, z: -2.6 };
      legL = 0.5;
      legR = -0.3;
    } else if (seated) {
      legL = -1.5;
      legR = -1.5;
      aL = { x: -1, z: 0.1 };
      aR = { x: -1, z: -0.1 };
    } else {
      switch (a.anim) {
        case 'wave':
          aR = { x: 0, z: -2.5 + Math.sin(t * 12) * 0.35 };
          break;
        case 'cheer':
        case 'dance':
          aL = { x: 0, z: 2.7 + Math.sin(t * 9) * 0.2 };
          aR = { x: 0, z: -2.7 - Math.sin(t * 9) * 0.2 };
          bob = Math.abs(Math.sin(t * 8)) * 0.15;
          break;
        case 'point':
          aR = { x: -1.55, z: 0 };
          break;
        case 'write':
          aL = { x: -1.1, z: 0.2 };
          aR = { x: -0.9 + Math.sin(t * 9) * 0.12, z: 0 };
          break;
        case 'grill':
          aR = { x: -1.1 + Math.sin(t * 6) * 0.45, z: 0 };
          aL = { x: -0.6, z: 0.15 };
          break;
        case 'shrug':
          aL = { x: -0.2, z: 0.9 };
          aR = { x: -0.2, z: -0.9 };
          break;
        case 'facepalm':
          aR = { x: -2.4, z: -0.3 };
          break;
        case 'flail':
          aL = { x: Math.sin(t * 17) * 1.2, z: 1.6 + Math.sin(t * 13) * 0.8 };
          aR = { x: Math.cos(t * 15) * 1.2, z: -1.6 - Math.cos(t * 11) * 0.8 };
          break;
        case 'proud':
          aL = { x: 0, z: 0.55 };
          aR = { x: 0, z: -0.55 };
          scale = 1.06;
          break;
        case 'tumble':
          tilt = Math.sin(t * 14) * 0.35;
          break;
        case 'sit':
          torsoDrop = -0.3;
          legL = -1.4;
          legR = -1.4;
          break;
        default:
          break;
      }
    }
    this.armL.node.rotation.set(aL.x, 0, aL.z);
    this.armR.node.rotation.set(aR.x, 0, aR.z);
    this.legL.node.rotation.set(legL, 0, 0);
    this.legR.node.rotation.set(legR, 0, 0);
    this.torso.position.set(0, bob + torsoDrop, 0);
    this.torso.rotation.set(0, 0, tilt);
    this.torso.scale.setScalar(scale);
    this.legL.node.visible = !seated;
    this.legR.node.visible = !seated;
  }
}

class Dog implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly body: ENGINE.SceneNode;
  private readonly head: ENGINE.MeshNode;
  private readonly tail: ENGINE.MeshNode;
  private readonly legs: ENGINE.MeshNode[] = [];
  private phase = 0;
  private lastPos = new THREE.Vector2();
  private speed = 0;

  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Actor:dog' });
    this.body = ENGINE.SceneNode.create({ name: 'DogBody' });
    this.root.add(this.body);
    const b = new Batch();
    b.add(new THREE.CapsuleGeometry(0.22, 0.55, 4, 10), '#c87533', { x: 0, y: 0.45, z: 0 }, 0, Math.PI / 2);
    b.add(new THREE.CapsuleGeometry(0.15, 0.3, 3, 8), '#fdf2e9', { x: 0, y: 0.38, z: 0.15 }, 0, Math.PI / 2);
    this.body.add(ENGINE.MeshNode.create({ geometry: b.build(), material: batchMaterial(), castShadow: true, physicsOptions: { enabled: false } }));
    const hb = new Batch();
    hb.add(new THREE.IcosahedronGeometry(0.2, 1), '#c87533', { x: 0, y: 0, z: 0 });
    hb.add(new THREE.BoxGeometry(0.16, 0.12, 0.16), '#fdf2e9', { x: 0, y: -0.05, z: 0.18 });
    hb.add(new THREE.IcosahedronGeometry(0.045, 0), '#111111', { x: 0, y: -0.01, z: 0.27 });
    hb.add(new THREE.IcosahedronGeometry(0.035, 0), '#111111', { x: -0.08, y: 0.06, z: 0.16 });
    hb.add(new THREE.IcosahedronGeometry(0.035, 0), '#111111', { x: 0.08, y: 0.06, z: 0.16 });
    hb.add(new THREE.ConeGeometry(0.08, 0.2, 4), '#8e4f22', { x: -0.12, y: 0.2, z: -0.02 }, 0, 0, 0.3);
    hb.add(new THREE.ConeGeometry(0.08, 0.2, 4), '#8e4f22', { x: 0.12, y: 0.2, z: -0.02 }, 0, 0, -0.3);
    this.head = ENGINE.MeshNode.create({ geometry: hb.build(), material: batchMaterial(), position: new THREE.Vector3(0, 0.62, 0.42), castShadow: true, physicsOptions: { enabled: false } });
    this.body.add(this.head);
    this.tail = ENGINE.MeshNode.create({
      geometry: new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6).translate(0, 0.15, 0),
      material: new THREE.MeshStandardMaterial({ color: '#c87533' }),
      position: new THREE.Vector3(0, 0.55, -0.42),
      physicsOptions: { enabled: false },
    });
    this.body.add(this.tail);
    for (const [x, z] of [[-0.12, 0.25], [0.12, 0.25], [-0.12, -0.25], [0.12, -0.25]] as const) {
      const leg = ENGINE.MeshNode.create({
        geometry: new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6).translate(0, -0.15, 0),
        material: new THREE.MeshStandardMaterial({ color: '#8e4f22' }),
        position: new THREE.Vector3(x, 0.3, z),
        physicsOptions: { enabled: false },
      });
      this.root.add(leg);
      this.legs.push(leg);
    }
    world.add(this.root);
  }

  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + 1.25, this.root.position.z);
  }

  public update(a: ActorState, simT: number, dt: number): void {
    this.root.visible = a.visible;
    this.root.position.set(a.pos.x, G + arcY(a, simT), a.pos.z);
    this.root.rotation.set(0, a.yaw, 0);
    const moved = Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.y);
    this.lastPos.set(a.pos.x, a.pos.z);
    this.speed += (Math.min(dt > 0 ? moved / dt : 0, 10) - this.speed) * Math.min(1, dt * 10);
    const running = this.speed > 0.4;
    this.phase += dt * (running ? 6 + this.speed * 2.5 : 0);
    this.legs.forEach((leg, i) => {
      leg.rotation.x = running ? Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.7 : 0;
    });
    const t = simT;
    this.tail.rotation.set(0.5, 0, Math.sin(t * (a.anim === 'beg' || a.anim === 'sit' ? 18 : 10)) * 0.7);
    let headDip = 0;
    let bodyPitch = 0;
    let bob = running ? Math.abs(Math.sin(this.phase)) * 0.08 : 0;
    if (a.anim === 'sniff') {
      headDip = 0.15 + Math.sin(t * 14) * 0.04;
    } else if (a.anim === 'sit' || a.anim === 'beg') {
      bodyPitch = -0.45;
      bob = a.anim === 'beg' ? Math.abs(Math.sin(t * 5)) * 0.05 : 0;
    }
    this.head.position.set(0, 0.62 - headDip, 0.42);
    this.body.rotation.set(bodyPitch, 0, 0);
    this.body.position.set(0, bob, 0);
  }
}

class Mower implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly blade: ENGINE.MeshNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Actor:mower' });
    const b = new Batch();
    b.box(0.9, 0.35, 1.1, '#e74c3c', 0, 0.3, 0);
    b.box(0.5, 0.25, 0.08, '#111111', 0, 0.45, 0.55);
    b.box(0.3, 0.08, 0.02, '#2ecc71', 0, 0.46, 0.6);
    for (const [x, z] of [[-0.48, 0.38], [0.48, 0.38], [-0.48, -0.38], [0.48, -0.38]] as const) {
      b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10), '#222222', { x, y: 0.16, z }, 0, 0, Math.PI / 2);
    }
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), '#bdc3c7', { x: 0.3, y: 0.7, z: -0.4 });
    b.add(new THREE.IcosahedronGeometry(0.06, 0), '#f1c40f', { x: 0.3, y: 0.97, z: -0.4 });
    const art = !params.has('oldart');
    this.root.add(
      ENGINE.MeshNode.create({ geometry: art ? mowBotGeometry() : b.build(), material: art ? modelMaterial() : batchMaterial(), castShadow: true, physicsOptions: { enabled: false } }),
    );
    this.blade = ENGINE.MeshNode.create({ geometry: new THREE.BoxGeometry(0.8, 0.02, 0.08), material: new THREE.MeshStandardMaterial({ color: '#bdc3c7' }), position: new THREE.Vector3(0, 0.1, 0), physicsOptions: { enabled: false } });
    this.root.add(this.blade);
    world.add(this.root);
  }
  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + 1.3, this.root.position.z);
  }
  public update(a: ActorState, simT: number, dt: number): void {
    this.root.visible = a.visible;
    this.root.position.set(a.pos.x, G + arcY(a, simT), a.pos.z);
    this.root.rotation.set(0, a.yaw, 0);
    this.blade.rotation.y += dt * (a.order ? 30 : 2);
  }
}

class Chickens implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly birds: ENGINE.MeshNode[] = [];
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Actor:chickens' });
    const b = new Batch();
    b.add(new THREE.IcosahedronGeometry(0.22, 1), '#fdfefe', { x: 0, y: 0.3, z: 0 });
    b.add(new THREE.IcosahedronGeometry(0.13, 1), '#fdfefe', { x: 0, y: 0.52, z: 0.15 });
    b.add(new THREE.BoxGeometry(0.04, 0.1, 0.12), '#e74c3c', { x: 0, y: 0.66, z: 0.15 });
    b.add(new THREE.ConeGeometry(0.04, 0.1, 4), '#f39c12', { x: 0, y: 0.5, z: 0.29 }, 0, Math.PI / 2);
    b.add(new THREE.IcosahedronGeometry(0.025, 0), '#111111', { x: -0.06, y: 0.55, z: 0.25 });
    b.add(new THREE.IcosahedronGeometry(0.025, 0), '#111111', { x: 0.06, y: 0.55, z: 0.25 });
    b.box(0.03, 0.18, 0.03, '#f39c12', -0.07, 0.09, 0);
    b.box(0.03, 0.18, 0.03, '#f39c12', 0.07, 0.09, 0);
    const art = !params.has('oldart');
    const geo = art ? chickenGeometry() : b.build();
    const mat = art ? modelMaterial() : batchMaterial();
    const offsets = [[0, 0], [0.7, 0.4], [-0.6, 0.5], [0.4, -0.6], [-0.5, -0.5]] as const;
    for (const [x, z] of offsets) {
      const bird = ENGINE.MeshNode.create({ geometry: geo, material: mat, position: new THREE.Vector3(x, 0, z), castShadow: true, physicsOptions: { enabled: false } });
      this.root.add(bird);
      this.birds.push(bird);
    }
    world.add(this.root);
  }
  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + 1.3, this.root.position.z);
  }
  public update(a: ActorState, simT: number): void {
    this.root.visible = a.visible;
    this.root.position.set(a.pos.x, G + arcY(a, simT), a.pos.z);
    this.root.rotation.set(0, a.yaw, 0);
    const moving = a.order !== null;
    this.birds.forEach((bird, i) => {
      const t = simT * (moving ? 11 : 3) + i * 1.7;
      bird.position.y = moving ? Math.abs(Math.sin(t)) * 0.18 : 0;
      bird.rotation.set(moving ? 0 : Math.max(0, Math.sin(t)) * 0.6, Math.sin(simT * 0.7 + i) * 0.6, 0);
    });
  }
}

/** Admiral Biscuit riding his robot vacuum. He never gets off; the vacuum does the walking. */
class CatOnVacuum implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly cat: ENGINE.MeshNode;
  private readonly vacuum: ENGINE.MeshNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Actor:cat' });
    const mat = modelMaterial();
    this.vacuum = ENGINE.MeshNode.create({ name: 'Vacuum', geometry: robotVacuumGeometry(), material: mat, castShadow: true, physicsOptions: { enabled: false } });
    this.cat = ENGINE.MeshNode.create({ name: 'Cat', geometry: admiralCatGeometry(), material: mat, position: new THREE.Vector3(0, 0.1, 0), castShadow: true, physicsOptions: { enabled: false } });
    this.root.add(this.vacuum);
    this.root.add(this.cat);
    world.add(this.root);
  }
  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + 1.1, this.root.position.z);
  }
  public update(a: ActorState, simT: number): void {
    this.root.visible = a.visible;
    this.root.position.set(a.pos.x, G + arcY(a, simT), a.pos.z);
    this.root.rotation.set(0, a.yaw, 0);
    const moving = a.order !== null;
    // Under way: the vacuum hums and wobbles; the admiral leans into the turns, chin up.
    this.vacuum.position.y = moving ? Math.abs(Math.sin(simT * 22)) * 0.012 : 0;
    this.cat.rotation.set(moving ? -0.06 : 0, Math.sin(simT * (moving ? 1.6 : 0.4)) * (moving ? 0.25 : 0.12), moving ? Math.sin(simT * 3.1) * 0.05 : 0);
    this.cat.position.y = 0.1 + (a.anim === 'sniff' ? Math.abs(Math.sin(simT * 2)) * 0.02 : 0);
  }
}

export function createActorView(world: ENGINE.World, id: string): ActorView {
  if (id === 'dog') {
    return params.has('oldart') ? new Dog(world, id) : new DogActor(world, id);
  }
  if (isCastId(id) && !params.has('oldart')) {
    return new CastActor(world, id, id);
  }
  if (id === 'mower') {
    return new Mower(world, id);
  }
  if (id === 'chickens') {
    return new Chickens(world, id);
  }
  if (id === 'cat') {
    return new CatOnVacuum(world, id);
  }
  return new Humanoid(world, id, LOOKS[id] ?? LOOKS.todd!);
}

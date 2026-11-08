/**
 * Visuals for interactive props. Every prop state the sim can reach has a readable look
 * (blueprint: "player can tell what happened within two seconds"): raw vs grilled vs dusty
 * vs soggy burgers, a shaking yellow valve when the timer ticks, flames on a flare-up, the
 * Flip-O-Matic's arm going wild when rogue.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import { fromYaw } from '../sim/core/vec.js';
import type { ActorState, PropState } from '../sim/world/state.js';
import { Batch, batchMaterial } from './Batch.js';
import { G } from './Neighborhood.js';
import { modelMaterial } from './art/render/models/materials.js';
import { burgerGeometry, campStoveGeometry, golfCartGeometry, gnomeGeometry, kettleGrillGeometry, platterGeometry } from './art/yard.js';

/** `?oldart=1` keeps the session-1 primitive props (comparison / fallback). */
const ART = !new URLSearchParams(globalThis.location?.search ?? '').has('oldart');

function artNode(geo: THREE.BufferGeometry, name: string, pos?: THREE.Vector3): ENGINE.MeshNode {
  return ENGINE.MeshNode.create({ name, geometry: geo, material: modelMaterial(), position: pos, castShadow: true, physicsOptions: { enabled: false } });
}

export interface PropCtx {
  simT: number;
  dt: number;
  playerPos: THREE.Vector3;
  playerYaw: number;
  actors: ReadonlyMap<string, ActorState>;
}

export interface PropView {
  readonly id: string;
  readonly root: ENGINE.SceneNode;
  update(p: PropState, ctx: PropCtx): void;
}

function meshFrom(b: Batch): ENGINE.MeshNode {
  return ENGINE.MeshNode.create({ geometry: b.build(), material: batchMaterial(), castShadow: true, physicsOptions: { enabled: false } });
}

function solidColor(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, pos?: THREE.Vector3): ENGINE.MeshNode {
  return ENGINE.MeshNode.create({
    geometry: geo,
    material: new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true }),
    position: pos ?? new THREE.Vector3(),
    castShadow: true,
    physicsOptions: { enabled: false },
  });
}

/** Where a prop should be drawn: carried, flying, or resting. */
function placement(p: PropState, ctx: PropCtx, out: THREE.Vector3): { yaw: number } {
  if (p.flight) {
    const f = p.flight;
    const k = Math.min(1, Math.max(0, (ctx.simT - f.t0) / (f.t1 - f.t0)));
    out.set(f.from.x + (f.to.x - f.from.x) * k, G + f.fromY + (f.toY - f.fromY) * k + 4 * f.height * k * (1 - k), f.from.z + (f.to.z - f.from.z) * k);
    return { yaw: k * 9 };
  }
  if (p.heldBy === 'player') {
    const fwd = fromYaw(ctx.playerYaw);
    out.set(ctx.playerPos.x + fwd.x * 0.6, G + 1.05, ctx.playerPos.z + fwd.z * 0.6);
    return { yaw: ctx.playerYaw };
  }
  if (p.heldBy) {
    const a = ctx.actors.get(p.heldBy);
    if (a) {
      const fwd = fromYaw(a.yaw);
      const mouth = a.id === 'dog';
      const reach = mouth ? 0.62 : 0.5;
      let y = mouth ? 0.48 : 1.0;
      if (a.flight) {
        const f = a.flight;
        const k = Math.min(1, Math.max(0, (ctx.simT - f.t0) / (f.t1 - f.t0)));
        y += f.fromY + (f.toY - f.fromY) * k + 4 * f.height * k * (1 - k);
      }
      out.set(a.pos.x + fwd.x * reach, G + y, a.pos.z + fwd.z * reach);
      return { yaw: a.yaw };
    }
  }
  out.set(p.pos.x, G + p.y, p.pos.z);
  return { yaw: 0 };
}

const tmp = new THREE.Vector3();

class SimpleView implements PropView {
  public readonly root: ENGINE.SceneNode;
  public constructor(world: ENGINE.World, public readonly id: string, build: (root: ENGINE.SceneNode) => void, private readonly onUpdate?: (p: PropState, ctx: PropCtx, root: ENGINE.SceneNode) => void) {
    this.root = ENGINE.SceneNode.create({ name: `Prop:${id}` });
    build(this.root);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    const { yaw } = placement(p, ctx, tmp);
    this.root.position.copy(tmp);
    this.root.rotation.set(0, yaw, 0);
    this.onUpdate?.(p, ctx, this.root);
  }
}

class PlatterView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly patties: THREE.MeshStandardMaterial;
  private readonly buns: THREE.MeshStandardMaterial;
  private readonly burgers: ENGINE.SceneNode;
  private readonly burgerMeshes: ENGINE.MeshNode[] = [];
  private lastState = '';
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:platter' });
    this.root.add(ART ? artNode(platterGeometry(), 'Platter') : solidColor(new THREE.CylinderGeometry(0.42, 0.38, 0.05, 18), '#d5dbdb', new THREE.Vector3(0, 0.03, 0)));
    this.patties = new THREE.MeshStandardMaterial({ color: '#f1948a', roughness: 0.9, flatShading: true });
    this.buns = new THREE.MeshStandardMaterial({ color: '#f0b459', roughness: 0.8, flatShading: true });
    this.burgers = ENGINE.SceneNode.create({ name: 'Burgers' });
    const pattyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 10);
    const bunGeo = new THREE.SphereGeometry(0.12, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 0.24;
      const z = Math.sin(a) * 0.24;
      if (ART) {
        const m = artNode(burgerGeometry(0xf1948a, 0xf0b459), 'Burger', new THREE.Vector3(x, 0.055, z));
        this.burgerMeshes.push(m);
        this.burgers.add(m);
      } else {
        this.burgers.add(ENGINE.MeshNode.create({ geometry: pattyGeo, material: this.patties, position: new THREE.Vector3(x, 0.08, z), physicsOptions: { enabled: false } }));
        this.burgers.add(ENGINE.MeshNode.create({ geometry: bunGeo, material: this.buns, position: new THREE.Vector3(x, 0.1, z), physicsOptions: { enabled: false } }));
      }
    }
    this.root.add(this.burgers);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    const { yaw } = placement(p, ctx, tmp);
    this.root.position.copy(tmp);
    this.root.rotation.set(0, yaw, 0);
    if (p.state !== this.lastState) {
      this.lastState = p.state;
      const patty: Record<string, string> = { raw: '#f1948a', grilled: '#6e3b1f', stolen: '#6e3b1f', served: '#6e3b1f', dusty: '#9c7a54', soggy: '#7f8fa6', airborne: '#6e3b1f' };
      const bun: Record<string, string> = { dusty: '#c9a46b', soggy: '#c8d6e5' };
      this.patties.color.set(patty[p.state] ?? '#6e3b1f');
      this.buns.color.set(bun[p.state] ?? '#f0b459');
      if (ART) {
        const geo = burgerGeometry(new THREE.Color(patty[p.state] ?? '#6e3b1f').getHex(), new THREE.Color(bun[p.state] ?? '#f0b459').getHex());
        for (const m of this.burgerMeshes) {
          m.geometry = geo;
        }
      }
      this.burgers.visible = p.state !== 'eaten';
    }
  }
}

class GrillView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly kettle: ENGINE.SceneNode;
  private readonly stove: ENGINE.MeshNode;
  private readonly body: THREE.MeshStandardMaterial;
  private readonly flames: ENGINE.MeshNode;
  private kettleMesh: ENGINE.MeshNode | null = null;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:grill' });
    this.kettle = ENGINE.SceneNode.create({ name: 'Kettle' });
    this.body = new THREE.MeshStandardMaterial({ color: '#1f1f1f', roughness: 0.5, metalness: 0.3 });
    if (ART) {
      this.kettleMesh = artNode(kettleGrillGeometry(false), 'KettleGrill');
      this.kettle.add(this.kettleMesh);
    } else {
      const bowl = new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      this.kettle.add(ENGINE.MeshNode.create({ geometry: bowl, material: this.body, position: new THREE.Vector3(0, 0.95, 0), castShadow: true, physicsOptions: { enabled: false } }));
      this.kettle.add(solidColor(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16), '#7f8c8d', new THREE.Vector3(0, 0.96, 0)));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        this.kettle.add(solidColor(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 5), '#555555', new THREE.Vector3(Math.cos(a) * 0.32, 0.38, Math.sin(a) * 0.32)));
      }
    }
    this.root.add(this.kettle);
    this.stove = ART ? artNode(campStoveGeometry(), 'CampStove') : solidColor(new THREE.BoxGeometry(0.4, 0.2, 0.3), '#2e86c1', new THREE.Vector3(0, 0.1, 0));
    this.stove.visible = false;
    this.root.add(this.stove);
    this.flames = ENGINE.MeshNode.create({
      geometry: new THREE.ConeGeometry(0.45, 1.2, 7),
      material: new THREE.MeshBasicMaterial({ color: '#ff7f27', transparent: true, opacity: 0.85 }),
      position: new THREE.Vector3(0, 1.55, 0),
      physicsOptions: { enabled: false },
    });
    this.flames.visible = false;
    this.root.add(this.flames);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    this.root.position.set(p.pos.x, G, p.pos.z);
    const camp = p.state === 'campstove';
    this.kettle.visible = !camp;
    this.stove.visible = camp;
    this.body.color.set(p.state === 'ruined' ? '#3b2a20' : '#1f1f1f');
    if (this.kettleMesh) {
      this.kettleMesh.geometry = kettleGrillGeometry(p.state === 'ruined');
    }
    this.kettle.rotation.set(p.state === 'ruined' ? 0.35 : 0, 0, 0);
    this.flames.visible = p.state === 'flaming';
    if (this.flames.visible) {
      const s = 0.8 + Math.sin(ctx.simT * 22) * 0.15 + Math.sin(ctx.simT * 13) * 0.1;
      this.flames.scale.set(s, 0.9 + Math.sin(ctx.simT * 17) * 0.2, s);
    }
  }
}

class ValveView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly wheel: ENGINE.MeshNode;
  private readonly wheelMat: THREE.MeshStandardMaterial;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:valve' });
    this.root.add(solidColor(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 8), '#7f8c8d', new THREE.Vector3(0, 0.35, 0)));
    this.root.add(solidColor(new THREE.BoxGeometry(0.4, 0.3, 0.3), '#566573', new THREE.Vector3(0, 0.15, 0)));
    this.wheelMat = new THREE.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.6 });
    this.wheel = ENGINE.MeshNode.create({ geometry: new THREE.TorusGeometry(0.2, 0.05, 6, 12), material: this.wheelMat, position: new THREE.Vector3(0, 0.75, 0), rotation: new THREE.Euler(Math.PI / 2, 0, 0), physicsOptions: { enabled: false } });
    this.root.add(this.wheel);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    this.root.position.set(p.pos.x, G, p.pos.z);
    const colors: Record<string, string> = { off: '#e74c3c', on: '#3498db', ticking: '#f1c40f', jammed: '#7f8c8d' };
    this.wheelMat.color.set(colors[p.state] ?? '#e74c3c');
    this.wheel.visible = p.state !== 'jammed';
    const shake = p.state === 'ticking' ? Math.sin(ctx.simT * 40) * 0.08 : 0;
    this.root.rotation.set(0, 0, shake);
    this.wheel.rotation.z += ctx.dt * (p.state === 'on' ? 6 : 0);
  }
}

class FlipperView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly arm: ENGINE.SceneNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:flipper' });
    const b = new Batch();
    b.box(0.4, 0.3, 0.4, '#f39c12', 0, 0.15, 0);
    b.box(0.25, 0.08, 0.06, '#c0392b', 0.12, 0.31, 0.2);
    b.add(new THREE.IcosahedronGeometry(0.06, 0), '#e74c3c', { x: -0.12, y: 0.34, z: 0.17 });
    this.root.add(meshFrom(b));
    this.arm = ENGINE.SceneNode.create({ name: 'Arm', position: new THREE.Vector3(0, 0.3, 0) });
    const ab = new Batch();
    ab.box(0.08, 0.08, 0.6, '#bdc3c7', 0, 0, 0.3);
    ab.box(0.26, 0.02, 0.22, '#95a5a6', 0, 0, 0.65);
    this.arm.add(meshFrom(ab));
    this.root.add(this.arm);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    const { yaw } = placement(p, ctx, tmp);
    this.root.position.copy(tmp);
    this.root.rotation.set(0, yaw, 0);
    const t = ctx.simT;
    let pitch = 0;
    if (p.state === 'flipping') {
      pitch = -Math.abs(Math.sin(t * 9)) * 1.4;
    } else if (p.state === 'rogue') {
      pitch = -Math.abs(Math.sin(t * 19)) * 2.2;
      this.root.rotation.y += Math.sin(t * 7) * 0.8;
    } else if (p.state === 'disabled') {
      pitch = 0.5;
    }
    this.arm.rotation.set(pitch, 0, 0);
  }
}

class CartView implements PropView {
  public readonly root: ENGINE.SceneNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:cart' });
    const b = new Batch();
    b.box(1.3, 0.45, 2.2, '#fdfefe', 0, 0.55, 0);
    b.box(1.2, 0.5, 0.5, '#e8a0c0', 0, 0.95, -0.25);
    b.box(1.2, 0.12, 0.7, '#e8a0c0', 0, 0.82, 0.05);
    b.box(1.4, 0.08, 1.9, '#e8a0c0', 0, 2.05, -0.05);
    for (const [x, z] of [[-0.6, 0.75], [0.6, 0.75], [-0.6, -0.85], [0.6, -0.85]] as const) {
      b.box(0.06, 1.25, 0.06, '#bdc3c7', x, 1.45, z);
      b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 10), '#222222', { x: x * 1.08, y: 0.26, z: z > 0 ? 0.8 : -0.75 }, 0, 0, Math.PI / 2);
    }
    b.box(0.5, 0.08, 0.06, '#f1c40f', 0, 0.75, 1.11);
    b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), '#333333', { x: -0.3, y: 1.2, z: 0.55 }, 0, -0.6);
    this.root.add(ART ? artNode(golfCartGeometry(), 'GolfCart') : meshFrom(b));
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    if (p.heldBy) {
      const a = ctx.actors.get(p.heldBy);
      if (a) {
        const back = fromYaw(a.yaw);
        this.root.position.set(a.pos.x - back.x * 0.1, G, a.pos.z - back.z * 0.1);
        this.root.rotation.set(0, a.yaw, Math.sin(ctx.simT * 9) * 0.03);
        return;
      }
    }
    this.root.position.set(p.pos.x, G, p.pos.z);
    this.root.rotation.set(0, p.state === 'stuck' ? 0.6 : 0, p.state === 'stuck' ? 0.15 : 0);
  }
}

class GateView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly panel: ENGINE.SceneNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:gate' });
    this.panel = ENGINE.SceneNode.create({ name: 'Panel' });
    const b = new Batch();
    for (let i = 0; i < 4; i++) {
      b.box(0.06, 0.9, 0.06, '#fbfbf5', -0.6 + i * 0.4 + 0.2, 0.45, 0);
    }
    b.box(1.4, 0.08, 0.06, '#fbfbf5', 0.1, 0.7, 0);
    b.box(1.4, 0.08, 0.06, '#fbfbf5', 0.1, 0.25, 0);
    const m = meshFrom(b);
    m.position.set(0.7, 0, 0);
    this.panel.add(m);
    this.panel.position.set(-0.7, 0, 0);
    this.root.add(this.panel);
    world.add(this.root);
  }
  public update(p: PropState): void {
    this.root.position.set(p.pos.x, G, p.pos.z);
    this.panel.rotation.set(0, p.state === 'open' ? -1.6 : 0, p.state === 'broken' ? 0.4 : 0);
  }
}

class MailboxView implements PropView {
  public readonly root: ENGINE.SceneNode;
  private readonly lid: ENGINE.SceneNode;
  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: 'Prop:mailbox' });
    const b = new Batch();
    b.box(0.12, 1.1, 0.12, '#7c5230', 0, 0.55, 0);
    b.box(0.5, 0.4, 0.75, '#95a5a6', 0, 1.3, 0);
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6), '#f39c12', { x: 0.3, y: 1.45, z: 0 }, 0, 0, Math.PI / 2);
    b.box(0.03, 0.3, 0.03, '#e74c3c', 0.28, 1.6, -0.2);
    this.root.add(meshFrom(b));
    this.lid = ENGINE.SceneNode.create({ name: 'Lid', position: new THREE.Vector3(0, 1.1, -0.38) });
    this.lid.add(solidColor(new THREE.BoxGeometry(0.5, 0.42, 0.04), '#7f8c8d', new THREE.Vector3(0, 0.21, 0)));
    this.root.add(this.lid);
    world.add(this.root);
  }
  public update(p: PropState, ctx: PropCtx): void {
    this.root.position.set(p.pos.x, G, p.pos.z);
    this.root.rotation.set(0, Math.PI / 2, 0);
    const target = p.state === 'open' ? -1.5 : 0;
    this.lid.rotation.x += (target - this.lid.rotation.x) * Math.min(1, ctx.dt * (p.state === 'open' ? 6 : 30));
  }
}

export function createPropViews(world: ENGINE.World): Map<string, PropView> {
  const views = new Map<string, PropView>();
  const add = (v: PropView) => views.set(v.id, v);
  add(new PlatterView(world, 'platter'));
  add(new GrillView(world, 'grill'));
  add(new ValveView(world, 'valve'));
  add(new FlipperView(world, 'flipper'));
  add(new CartView(world, 'cart'));
  add(new GateView(world, 'gate'));
  add(new MailboxView(world, 'mailbox'));
  add(
    new SimpleView(world, 'charcoal', (r) => {
      const b = new Batch();
      b.box(0.5, 0.7, 0.28, '#2c2c2c', 0, 0.35, 0);
      b.box(0.4, 0.22, 0.02, '#f39c12', 0, 0.42, 0.15);
      b.box(0.52, 0.08, 0.3, '#444444', 0, 0.72, 0);
      r.add(meshFrom(b));
    }),
  );
  add(
    new SimpleView(world, 'toy', (r) => {
      const b = new Batch();
      b.add(new THREE.CapsuleGeometry(0.07, 0.32, 3, 8), '#e74c3c', { x: 0, y: 0.1, z: 0 }, 0, Math.PI / 2);
      b.add(new THREE.CapsuleGeometry(0.09, 0.22, 3, 8), '#f0b459', { x: 0, y: 0.06, z: 0 }, 0, Math.PI / 2);
      r.add(meshFrom(b));
    }),
  );
  add(
    new SimpleView(world, 'gnome', (r) => {
      const b = new Batch();
      b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 8), '#2e86c1', { x: 0, y: 0.18, z: 0 });
      b.add(new THREE.IcosahedronGeometry(0.13, 1), '#ffdbac', { x: 0, y: 0.45, z: 0 });
      b.add(new THREE.ConeGeometry(0.15, 0.35, 8), '#e74c3c', { x: 0, y: 0.68, z: 0 });
      b.add(new THREE.ConeGeometry(0.1, 0.22, 6), '#ffffff', { x: 0, y: 0.33, z: 0.09 }, 0, Math.PI);
      r.add(ART ? artNode(gnomeGeometry(), 'Gnome') : meshFrom(b));
    }),
  );
  add(
    new SimpleView(
      world,
      'clipboard',
      (r) => {
        const b = new Batch();
        b.box(0.32, 0.44, 0.03, '#a0522d', 0, 0, 0);
        b.box(0.27, 0.34, 0.01, '#ffffff', 0, -0.02, 0.02);
        b.box(0.12, 0.05, 0.03, '#bdc3c7', 0, 0.21, 0.02);
        r.add(meshFrom(b));
        const burgers = solidColor(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8), '#6e3b1f', new THREE.Vector3(0, 0, 0.08));
        burgers.name = 'ClipBurgers';
        burgers.rotation.set(Math.PI / 2, 0, 0);
        burgers.visible = false;
        r.add(burgers);
      },
      (p, _ctx, r) => {
        r.rotation.x = p.heldBy ? -0.6 : -Math.PI / 2;
        const burgers = r.children.find((c) => c.name === 'ClipBurgers');
        if (burgers) {
          burgers.visible = p.state === 'burgered';
        }
      },
    ),
  );
  return views;
}

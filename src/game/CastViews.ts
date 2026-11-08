/**
 * Actor views built on the ported Bad Hair Day character kit: the Pleasant Pines cast as
 * skinned, inked, expressive humans (src/game/art/neighbors.ts) and Brisket as the
 * skinned dog. They implement the same ActorView contract as the old primitive views, so
 * the sim → view mapping (position, yaw, flight arcs, seated, the anim vocabulary) is
 * unchanged; only the presentation is new.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import type { ActorAnim } from '../sim/comedy/types.js';
import type { ActorState } from '../sim/world/state.js';
import { createDog } from './art/people.js';
import { createNeighbor, type CastId } from './art/neighbors.js';
import { dogAnimFor, humanAnimFor } from './art/animMap.js';
import type { Character, Dog } from './art/family/types.js';
import type { ActorView } from './Characters.js';
import { G } from './Neighborhood.js';

/** Characters read a touch bigger than life from the third-person camera. */
export const CAST_SCALE = 1.12;

function arcY(a: ActorState, simT: number): number {
  const f = a.flight;
  if (!f) {
    return 0;
  }
  const k = Math.min(1, Math.max(0, (simT - f.t0) / (f.t1 - f.t0)));
  return f.fromY + (f.toY - f.fromY) * k + 4 * f.height * k * (1 - k);
}

class Motion {
  private last = new THREE.Vector2();
  private primed = false;
  public speed = 0;

  public step(a: ActorState, dt: number, max: number): number {
    const moved = this.primed ? Math.hypot(a.pos.x - this.last.x, a.pos.z - this.last.y) : 0;
    this.primed = true;
    this.last.set(a.pos.x, a.pos.z);
    const inst = dt > 0 ? moved / dt : 0;
    // Teleports (spawn, flights landing) read as a single huge step: ignore them.
    const v = inst > 25 ? this.speed : Math.min(inst, max);
    this.speed += (v - this.speed) * Math.min(1, dt * 10);
    return this.speed;
  }
}

export class CastActor implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly rig: Character;
  private readonly motion = new Motion();
  private lastAnim: ActorAnim | null = null;
  private lastFlight = false;
  private seatedPose = false;
  private spin = 0;

  public constructor(world: ENGINE.World, public readonly id: string, cast: CastId) {
    this.root = ENGINE.SceneNode.create({ name: `Actor:${id}` });
    this.rig = createNeighbor(cast);
    this.rig.root.scale.setScalar(CAST_SCALE);
    this.rig.root.traverse((o) => {
      o.castShadow = true;
      o.frustumCulled = false; // skinned bounds don't follow the pose
    });
    this.root.add(this.rig.root);
    world.add(this.root);
  }

  public get character(): Character {
    return this.rig;
  }

  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + this.rig.height * CAST_SCALE + 0.45, this.root.position.z);
  }

  public update(a: ActorState, simT: number, dt: number, seated: boolean): void {
    this.root.visible = a.visible;
    const y = G + arcY(a, simT) + (seated ? 0.32 : 0);
    this.root.position.set(a.pos.x, y, a.pos.z);
    let yaw = a.yaw;
    if (a.anim === 'spin') {
      this.spin += dt * 12;
      yaw += this.spin;
    }
    this.root.rotation.set(0, yaw, a.anim === 'tumble' ? Math.sin(simT * 14) * 0.3 : 0);

    // Seated (Granny driving her cart) and sitting.
    const wantSeat = seated || a.anim === 'sit';
    if (wantSeat !== this.seatedPose) {
      this.seatedPose = wantSeat;
      this.rig.setPose(wantSeat ? (seated ? 'drive' : 'sit') : 'stand');
      this.rig.setHold(seated ? 'wheel' : 'none');
    }

    // Flights (trampoline commute, being flung): a pose for the arc.
    const flying = a.flight !== null;
    if (flying !== this.lastFlight) {
      this.lastFlight = flying;
      if (flying) {
        this.rig.play(this.id === 'todd' ? 'cheer' : 'noooo', { loop: true });
        this.rig.setExpression(this.id === 'todd' ? 'smug' : 'dramatic');
      } else {
        this.lastAnim = null; // re-apply the ground animation
        this.rig.cancelAction();
      }
    }

    if (!flying && a.anim !== this.lastAnim) {
      this.lastAnim = a.anim;
      const m = humanAnimFor(a.anim);
      this.rig.cancelAction();
      if (m.action) {
        this.rig.play(m.action, { loop: m.loop });
      }
      this.rig.setExpression(a.soaked ? 'eek' : m.face);
    }

    const speed = this.motion.step(a, dt, 9);
    this.rig.setMotion(flying || wantSeat ? 0 : speed);
    this.rig.update(dt);
  }
}

export class DogActor implements ActorView {
  public readonly root: ENGINE.SceneNode;
  private readonly dog: Dog;
  private readonly motion = new Motion();
  private lastAnim: ActorAnim | null = null;

  public constructor(world: ENGINE.World, public readonly id: string) {
    this.root = ENGINE.SceneNode.create({ name: `Actor:${id}` });
    this.dog = createDog({ name: 'Brisket', coat: 'golden' });
    this.dog.root.scale.setScalar(1.35); // a big, guilty golden boy
    this.dog.root.traverse((o) => {
      o.castShadow = true;
      o.frustumCulled = false;
    });
    this.root.add(this.dog.root);
    this.dog.setMood('excited');
    world.add(this.root);
  }

  /** The dog's mouth socket (stolen burgers ride here). */
  public mouth(): THREE.Object3D {
    return this.dog.socket('mouth');
  }

  public headTop(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.root.position.x, this.root.position.y + 1.2, this.root.position.z);
  }

  public update(a: ActorState, simT: number, dt: number): void {
    this.root.visible = a.visible;
    this.root.position.set(a.pos.x, G + arcY(a, simT), a.pos.z);
    this.root.rotation.set(0, a.yaw, 0);
    if (a.anim !== this.lastAnim) {
      this.lastAnim = a.anim;
      const m = dogAnimFor(a.anim);
      this.dog.cancelAction();
      this.dog.setPose(m.sit ? 'sit' : 'stand');
      if (m.action) {
        this.dog.play(m.action, { loop: m.loop });
      }
    }
    this.dog.setMotion(this.motion.step(a, dt, 12));
    this.dog.update(dt);
  }
}

/**
 * The player: a CharacterPawn that moves and frames exactly like Athlete Domains (src/game/athlete.ts):
 * camera-relative walking at 4.2 m/s (7 running), instant turn to face the walk, a 1.25 m jump under
 * 26 m/s² gravity, and a follow camera with its own yaw/pitch orbiting a point 1.45 m above the feet
 * at 6.7 m (spring arm pulls in at walls). Input arrives through `athleteInput` (AthleteControl.ts).
 * The engine's grey mannequin is replaced by "the new neighbor",
 * a skinned character from the ported Bad Hair Day kit (src/game/art/neighbors.ts), animated
 * from the movement node (walk/jog blend, jump, stun reactions, carrying).
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import { CAMERA, WALK, cameraPivot, engineYaw, facingYaw } from './athlete.js';
import { athleteInput } from './AthleteControl.js';
import { CAST_SCALE } from './CastViews.js';
import { createNeighbor } from './art/neighbors.js';
import type { Character } from './art/family/types.js';

/** `?oldart=1` keeps the engine mannequin (comparison / fallback). */
const OLD_ART = new URLSearchParams(globalThis.location?.search ?? '').has('oldart');

export const WALK_SPEED = WALK.walkSpeed;
export const RUN_MULT = WALK.runSpeed / WALK.walkSpeed;
/** Engine gravity is −9.81 × the controller's simulatedGravityScale; Athlete Domains uses 26 m/s². */
const GRAVITY_SCALE = WALK.gravity / 9.81;
/** Trampoline apex the comedy was tuned for (m). */
const BOUNCE_APEX = 5.9;
/** "Instant" velocity changes, as in Athlete Domains' walker (no acceleration ramp, full air control). */
const INSTANT = 1000;

@ENGINE.GameClass()
export class NeighborPawn extends ENGINE.CharacterPawn {
  public override cameraMinDistance = 3;
  public override cameraMaxDistance = 11;
  public override cameraCollisionBuffer = 0.15;

  private stunLeft = 0;
  private running = false;
  private frozen = false;
  private rig: Character | null = null;
  private wasGrounded = true;
  private holding = false;
  private readonly lastPos = new THREE.Vector3();
  private hasLastPos = false;
  private speed = 0;

  protected override setupAnimationNode(): ENGINE.AnimationStateMachineNode | null {
    return OLD_ART ? super.setupAnimationNode() : null;
  }

  protected override setupVisualNode(): ENGINE.SceneNode | null {
    if (OLD_ART) {
      return super.setupVisualNode();
    }
    const node = ENGINE.SceneNode.create({ name: 'NeighborVisual', position: new THREE.Vector3(0, -ENGINE.CHARACTER_HEIGHT / 2, 0) });
    const rig = createNeighbor('player');
    rig.root.scale.setScalar(CAST_SCALE);
    rig.root.rotation.y = Math.PI; // the rig faces +Z; the pawn's forward is −Z
    rig.root.traverse((o) => {
      o.castShadow = true;
      o.frustumCulled = false;
    });
    node.add(rig.root);
    this.add(node);
    this.rig = rig;
    return node;
  }

  /** The visible character (null with `?oldart=1`). */
  public get character(): Character | null {
    return this.rig;
  }

  /** Carry pose while holding a prop. */
  public setHolding(on: boolean): void {
    if (on !== this.holding) {
      this.holding = on;
      this.rig?.setHold(on ? 'box' : 'none');
    }
  }

  /** A one-shot gesture on the player character (throw, catch, reactions). */
  public gesture(action: Parameters<Character['play']>[0], face?: Parameters<Character['setExpression']>[0]): void {
    this.rig?.play(action);
    if (face) {
      this.rig?.setExpression(face, 1.6);
    }
  }

  protected override createMovementNode(): ENGINE.BasePawnMovementNode {
    return ENGINE.CharacterMovementNode.create({
      name: 'MovementNode',
      maxSpeed: WALK_SPEED,
      jumpSpeed: WALK.jumpSpeed,
      accelerationLambda: INSTANT,
      decelerationLambda: INSTANT,
      midAirAccelerationLambda: INSTANT,
      midAirDecelerationLambda: INSTANT,
      characterControllerOptions: { ...ENGINE.CharacterMovementNode.DEFAULT_CHARACTER_CONTROLLER_OPTIONS, simulatedGravityScale: GRAVITY_SCALE },
    });
  }

  /** Pivot at the look height (the pawn origin is the capsule centre); camera 6.5 back, 1.65 up. */
  protected override getInitialCameraPositions() {
    const pivot = new THREE.Vector3(0, CAMERA.lookHeight - ENGINE.CHARACTER_HEIGHT / 2, 0);
    return { pivotPosition: pivot, cameraPosition: pivot.clone().add(new THREE.Vector3(0, 1.65, 6.5)) };
  }

  /** The Athlete Domains follow camera: its own yaw and pitch, independent of where the athlete faces. */
  protected override updateCamera(_deltaTime: number): void {
    const pivot = this.cameraPivot;
    if (!pivot) {
      return;
    }
    const c = cameraPivot(athleteInput.look, this.rotation.y);
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(c.pivotPitch, c.pivotYaw, 0);
    if (this.springArm) {
      this.springArm.armLength = CAMERA.distance;
    }
    const cam = this.camera;
    if (cam) {
      cam.rotation.set(c.cameraTilt, 0, 0);
    }
  }

  /** Walk where the input says: face it instantly, move forward along it, jump when asked. */
  private drive(): void {
    const input = athleteInput;
    const blocked = this.frozen || this.stunLeft > 0;
    if (!input.enabled) {
      return;
    }
    const m = input.move;
    const walking = !blocked && m.magnitude > 1e-3;
    if (walking) {
      this.rotation.y = engineYaw(facingYaw(m.x, m.z, 0));
    }
    this.setRunning(input.run);
    this.moveForward(walking ? Math.min(1, m.magnitude) : 0, false);
    this.moveRight(0, false);
    const mover = this.mover;
    // Take off only from the ground and not while already rising: the engine's coyote time keeps
    // getGrounded() true for a moment after take-off, and re-launching then over-jumps (measured
    // ~1.9 m instead of Athlete Domains' 1.25 m).
    if (input.jump && !blocked && mover?.getGrounded() && mover.getVelocities().vertical <= 0.01) {
      if (this.isLocalAutonomousProxy()) {
        mover.setJumpEdges(true, false);
      } else {
        this.jump();
      }
    }
  }

  public get mover(): ENGINE.CharacterMovementNode | null {
    const m = this.movementNode;
    return m instanceof ENGINE.CharacterMovementNode ? m : null;
  }

  public setRunning(on: boolean): void {
    this.running = on;
    this.applySpeed();
  }

  /** Freeze movement (pause menu, cutscene-free dialogue never uses this). */
  public setFrozen(on: boolean): void {
    this.frozen = on;
    this.applySpeed();
  }

  public stun(seconds: number): void {
    this.stunLeft = Math.max(this.stunLeft, seconds);
    this.applySpeed();
    this.rig?.play('noooo', { duration: Math.min(seconds, 1.6) });
    this.rig?.setExpression('eek', seconds);
  }

  public bounce(power: number): void {
    // Same apex as before the gravity change (the trampoline gags are tuned to it).
    this.mover?.setVelocities(0, 0, Math.sqrt(2 * WALK.gravity * BOUNCE_APEX) * power);
    this.rig?.play('cheer');
    this.rig?.setExpression('joy', 1.5);
  }

  public teleport(x: number, y: number, z: number, yaw?: number): void {
    this.setWorldTransform({ position: new THREE.Vector3(x, y, z), rotation: yaw === undefined ? undefined : new THREE.Euler(0, yaw, 0) });
    this.mover?.setVelocities(0, 0, 0);
  }

  private applySpeed(): void {
    const m = this.mover;
    if (!m) {
      return;
    }
    const blocked = this.frozen || this.stunLeft > 0;
    m.speedModifier = blocked ? 0 : this.running ? RUN_MULT : 1;
    m.jumpStrengthModifier = blocked ? 0 : 1;
  }

  public override tickPrePhysics(dt: number): void {
    this.drive();
    super.tickPrePhysics(dt);
    this.animateRig(dt);
    if (this.stunLeft > 0) {
      this.stunLeft -= dt;
      if (this.stunLeft <= 0) {
        this.stunLeft = 0;
        this.applySpeed();
      }
    }
  }

  private animateRig(dt: number): void {
    const rig = this.rig;
    if (!rig) {
      return;
    }
    // Ground speed from actual motion (teleports read as one huge step and are ignored).
    const p = this.getWorldPosition(new THREE.Vector3());
    const step = this.hasLastPos ? Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z) : 0;
    this.lastPos.copy(p);
    this.hasLastPos = true;
    const inst = dt > 0 && step < 3 ? step / dt : this.speed;
    this.speed += (Math.min(inst, 10) - this.speed) * Math.min(1, dt * 12);
    const grounded = this.mover?.getGrounded() ?? true;
    if (this.wasGrounded && !grounded && (this.mover?.getVelocities().vertical ?? 0) > 1) {
      rig.play('jump');
    }
    this.wasGrounded = grounded;
    rig.setMotion(grounded ? this.speed : this.speed * 0.4);
    rig.update(dt);
  }
}

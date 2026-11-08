/**
 * Athlete Domains-style control, engine side (the maths is src/game/athlete.ts).
 *
 * The engine's DefaultPlayerController would turn the pawn with the mouse (pointer lock), move it
 * tank-style relative to its own facing and own the gamepad. Athlete Domains instead has a camera
 * with its own yaw/pitch (drag to look), camera-relative movement and an athlete that turns
 * instantly to face where it walks. So:
 *   • `athleteInput` is the one frame of intent, written by Show (keys, mouse drag, controller,
 *     phone stick) and read by NeighborPawn;
 *   • AthleteController ignores every device event and feeds nothing — the pawn drives itself.
 */
import * as ENGINE from '@gnsx/genesys.js';

import { CAMERA, type Look, type StickVector } from './athlete.js';

export interface AthleteInput {
  /** The camera's look (Athlete Domains yaw: 0 faces +Z; pitch > 0 looks down). */
  look: Look;
  /** World-space walk direction on the ground, magnitude 0..1. */
  move: StickVector;
  run: boolean;
  /** Held (or buffered) jump: a grounded athlete takes off. */
  jump: boolean;
  /** False while the autopilot drives (it teleports the pawn itself). */
  enabled: boolean;
}

export const athleteInput: AthleteInput = {
  look: { yaw: 0, pitch: CAMERA.defaultPitch },
  move: { x: 0, z: 0, magnitude: 0 },
  run: false,
  jump: false,
  enabled: true,
};

/** A player controller that leaves all input to Show + NeighborPawn (see the file comment). */
@ENGINE.GameClass()
export class AthleteController extends ENGINE.DefaultPlayerController {
  public override handleKeyDown(): boolean {
    return false;
  }
  public override handleKeyUp(): boolean {
    return false;
  }
  public override handleMouseDown(): boolean {
    return false;
  }
  public override handleMouseUp(): boolean {
    return false;
  }
  public override handleMouseMove(): boolean {
    return false;
  }
  public override handleMouseWheel(): boolean {
    return false;
  }
  public override handleVirtualJoystick(): boolean {
    return false;
  }
  public override handleGamepadButtonDown(): boolean {
    return false;
  }
  public override handleGamepadButtonUp(): boolean {
    return false;
  }
  public override handleGamepadAxisChange(): boolean {
    return false;
  }

  public override tickPrePhysics(deltaTime: number): void {
    // Skip DefaultPlayerController's per-frame feed (it would zero the pawn's inputs every frame);
    // keep the base PlayerController's own tick.
    ENGINE.PlayerController.prototype.tickPrePhysics.call(this, deltaTime);
  }
}

/**
 * Athlete Domains controls, ported (Chris, 2026-11-07: "update the player controls and cameras to be
 * exactly [like] our Athlete Domains game"). Source of truth: athlete-domains-relaunch
 *   src/world/camera.ts      — the follow camera (orbit, pitch limits, drag rates, orbit floor)
 *   src/world/walker.ts      — walk 4.2 / run 7 m/s, gravity 26, 1.25 m jump, instant facing
 *   src/world/WorldScreen.tsx — keys (Q/E turn, R/F look, Shift run, Space jump), right-drag look,
 *                               250 ms jump buffer, run at > 0.92 stick tilt
 *   src/world/cityPad.ts     — controller (look rates, B/RT run, A jump)
 *   src/input/virtualStick.ts — the floating phone stick (56 px throw, 15 % dead zone, follows)
 * Pure: no engine, no DOM. Tested in tests/athlete.test.ts.
 *
 * Conventions (Athlete Domains'): yaw 0 faces +Z; pitch > 0 looks down. The Genesys pawn faces −Z at
 * rotation.y = 0, hence the `engine*` conversions at the bottom.
 */

export const CAMERA = {
  /** Straight-line distance from the look point, metres (6.5 back, 1.65 up). */
  distance: Math.hypot(6.5, 1.65),
  /** Height of the look point above the feet. */
  lookHeight: 1.45,
  /** The resting pitch: a little above the athlete, looking down. */
  defaultPitch: Math.atan2(1.65, 6.5),
  /** Look up at most ~50°. */
  minPitch: -0.87,
  /** Look down at most ~70°. */
  maxPitch: 1.22,
  /** Below this pitch the camera stops swinging lower and only tilts up. */
  orbitFloor: -0.12,
  /** Radians per pixel of drag. */
  dragYaw: 0.008,
  dragPitch: 0.006,
  /** Field of view (degrees). */
  fov: 60,
} as const

export const WALK = {
  walkSpeed: 4.2,
  runSpeed: 7,
  gravity: 26,
  /** Take-off speed for a 1.25 m apex: sqrt(2 g h). */
  jumpSpeed: Math.sqrt(2 * 26 * 1.25),
} as const

/** Keyboard look, per frame at 60 fps in Athlete Domains; here per second so any frame rate matches. */
export const KEY_LOOK = { yawPerSecond: 0.035 * 60, pitchPerSecond: 0.025 * 60 } as const
/** Controller look at full right stick (radians per second). */
export const PAD_LOOK = { yawRate: 2.6, pitchRate: 1.7 } as const
/** Stick deflection that counts as running (touch and controller). */
export const RUN_TILT = 0.92
/** Trigger pull that counts as running. */
export const TRIGGER_RUN = 0.35
/** A jump press counts this long even if released at once. */
export const JUMP_BUFFER_MS = 250
/** The phone stick. */
export const STICK = { radiusPx: 56, deadZone: 0.15, zone: { left: 0, right: 0.5, top: 0.25, bottom: 1 } } as const

export interface Look {
  readonly yaw: number
  readonly pitch: number
}

/** Movement intent: x = screen right, z = screen down (+Z for the default camera), magnitude 0..1. */
export interface StickVector {
  readonly x: number
  readonly z: number
  readonly magnitude: number
}

export const STICK_CENTRE: StickVector = { x: 0, z: 0, magnitude: 0 }

export const clampPitch = (pitch: number): number => Math.min(CAMERA.maxPitch, Math.max(CAMERA.minPitch, pitch))

/** A drag of (dx, dy) pixels: right turns right, up looks up. */
export function dragLook(look: Look, dx: number, dy: number): Look {
  return { yaw: look.yaw - dx * CAMERA.dragYaw, pitch: clampPitch(look.pitch + dy * CAMERA.dragPitch) }
}

/** Keyboard look for `dt` seconds (Q/E turn, R/F look up/down). */
export function keyLook(look: Look, keys: { turnLeft: boolean; turnRight: boolean; lookUp: boolean; lookDown: boolean }, dt: number): Look {
  let { yaw, pitch } = look
  if (keys.turnLeft) yaw += KEY_LOOK.yawPerSecond * dt
  if (keys.turnRight) yaw -= KEY_LOOK.yawPerSecond * dt
  if (keys.lookUp) pitch -= KEY_LOOK.pitchPerSecond * dt
  if (keys.lookDown) pitch += KEY_LOOK.pitchPerSecond * dt
  return { yaw, pitch: clampPitch(pitch) }
}

/**
 * Controller look for `dt` seconds. `lookX` is right-stick right (+1), `lookUp` is right-stick up (+1;
 * the W3C axis is negative for up, so pass −axes[3]). Stick right turns right; up looks up.
 */
export function padLook(look: Look, lookX: number, lookUp: number, dt: number): Look {
  return { yaw: look.yaw - lookX * PAD_LOOK.yawRate * dt, pitch: clampPitch(look.pitch - lookUp * PAD_LOOK.pitchRate * dt) }
}

/** WASD / arrows as a stick: opposite keys cancel, diagonals normalised to the unit circle. Up is −Z. */
export function keysStick(up: boolean, down: boolean, left: boolean, right: boolean): StickVector {
  const x = (right ? 1 : 0) - (left ? 1 : 0)
  const z = (down ? 1 : 0) - (up ? 1 : 0)
  const len = Math.hypot(x, z)
  return len === 0 ? STICK_CENTRE : { x: x / len, z: z / len, magnitude: 1 }
}

/** A gamepad's left stick (W3C axes: +x right, +y down) with a radial dead zone, as a StickVector. */
export function padStick(ax: number, ay: number, deadZone = 0.15): StickVector {
  const len = Math.hypot(ax, ay)
  if (!(len > deadZone)) return STICK_CENTRE
  const magnitude = Math.min(1, (len - deadZone) / (1 - deadZone))
  return { x: (ax / len) * magnitude, z: (ay / len) * magnitude, magnitude }
}

/** The phone stick: a pixel offset (knob minus base) with a radial dead zone, clamped at the rim. */
export function stickFromOffset(dx: number, dy: number): StickVector {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return STICK_CENTRE
  const lengthPx = Math.hypot(dx, dy)
  if (!(lengthPx > 0)) return STICK_CENTRE
  const t = lengthPx / STICK.radiusPx
  const magnitude = Math.min(1, Math.max(0, (t - STICK.deadZone) / (1 - STICK.deadZone)))
  if (magnitude <= 0) return STICK_CENTRE
  return { x: (dx / lengthPx) * magnitude, z: (dy / lengthPx) * magnitude, magnitude }
}

/** Is a point (fractions of the viewport) inside the stick's zone (left half, below the top quarter)? */
export function inStickZone(fx: number, fy: number): boolean {
  return fx >= STICK.zone.left && fx <= STICK.zone.right && fy >= STICK.zone.top && fy <= STICK.zone.bottom
}

/** When the thumb drags past the rim the base follows it, so reversing is instant. Returns the new base. */
export function followBase(base: { x: number; y: number }, knob: { x: number; y: number }): { x: number; y: number } {
  const dx = knob.x - base.x
  const dy = knob.y - base.y
  const len = Math.hypot(dx, dy)
  if (len <= STICK.radiusPx) return base
  const k = (len - STICK.radiusPx) / len
  return { x: base.x + dx * k, y: base.y + dy * k }
}

/** The strongest of several sticks (touch, keys, pad): Athlete Domains lets the most-pushed source win. */
export function strongest(...sticks: StickVector[]): StickVector {
  return sticks.reduce((best, s) => (s.magnitude > best.magnitude ? s : best), STICK_CENTRE)
}

/**
 * A stick reading in world axes for a camera looking along `cameraYaw`: pushing up always moves away
 * from the camera. (Athlete Domains' rotateStick: rotate by cameraYaw − π about +Y.)
 */
export function rotateStick(stick: StickVector, cameraYaw: number): StickVector {
  if (!Number.isFinite(cameraYaw)) return stick
  const a = cameraYaw - Math.PI
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: stick.x * c + stick.z * s, z: -stick.x * s + stick.z * c, magnitude: stick.magnitude }
}

/** Running: Shift, a stick pushed past RUN_TILT, the controller's B held, or a trigger pulled. */
export function isRunning(o: { shift?: boolean; tilt?: number; padB?: boolean; padTrigger?: number }): boolean {
  return !!o.shift || (o.tilt ?? 0) > RUN_TILT || !!o.padB || (o.padTrigger ?? 0) >= TRIGGER_RUN
}

/**
 * The jump buffer: a tap between two frames still jumps. A queued jump lasts until the athlete takes
 * off, or until JUMP_BUFFER_MS has passed after at least one frame saw it.
 */
export class JumpBuffer {
  private queued: { at: number; seen: boolean } | null = null

  public press(now: number): void {
    this.queued = { at: now, seen: false }
  }

  /** Call once per frame; true while the jump should be held. `held` is a button still down. */
  public read(now: number, airborneRising: boolean, held: boolean): boolean {
    const q = this.queued
    if (q && (airborneRising || (q.seen && now - q.at > JUMP_BUFFER_MS))) this.queued = null
    else if (q) q.seen = true
    return held || this.queued !== null
  }
}

/** Facing (Athlete Domains yaw) for a world direction; keeps `current` when there is no direction. */
export function facingYaw(x: number, z: number, current: number): number {
  return Math.hypot(x, z) > 1e-6 ? Math.atan2(x, z) : current
}

// ---------------------------------------------------------------- engine conversions

/** Genesys pawn rotation.y for an Athlete Domains yaw (the pawn faces −Z at 0). */
export function engineYaw(adYaw: number): number {
  return adYaw + Math.PI
}

/** Athlete Domains yaw for a Genesys pawn rotation.y. */
export function adYawFromEngine(rotationY: number): number {
  return rotationY - Math.PI
}

/** Wrap an angle to (−π, π]. */
export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

/**
 * The camera pivot's transform under the pawn (the pivot sits at the look height; the spring arm
 * runs out along its local +Z; the camera at the arm's end looks down local −Z).
 *   pivotYaw   — local yaw relative to the pawn, so the camera keeps its own world yaw while the
 *                athlete turns to face where it walks;
 *   pivotPitch — the pivot's rotation.x (negative = camera above, looking down);
 *   cameraTilt — the camera's own rotation.x: below the orbit floor the camera stops swinging lower
 *                and only tilts up (positive tilts the view up).
 */
export function cameraPivot(look: Look, pawnRotationY: number): { pivotYaw: number; pivotPitch: number; cameraTilt: number } {
  const pitch = clampPitch(look.pitch)
  const orbit = Math.max(pitch, CAMERA.orbitFloor)
  return { pivotYaw: wrapAngle(engineYaw(look.yaw) - pawnRotationY), pivotPitch: -orbit, cameraTilt: orbit - pitch }
}

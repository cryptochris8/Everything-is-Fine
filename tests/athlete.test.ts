import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CAMERA,
  JUMP_BUFFER_MS,
  JumpBuffer,
  STICK,
  STICK_CENTRE,
  WALK,
  adYawFromEngine,
  cameraPivot,
  clampPitch,
  dragLook,
  engineYaw,
  facingYaw,
  followBase,
  inStickZone,
  isRunning,
  keyLook,
  keysStick,
  padLook,
  padStick,
  rotateStick,
  stickFromOffset,
  strongest,
  wrapAngle,
} from '../src/game/athlete.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('Athlete Domains numbers (src/world/camera.ts, walker.ts)', () => {
  assert.ok(near(CAMERA.distance, Math.hypot(6.5, 1.65)));
  assert.equal(CAMERA.lookHeight, 1.45);
  assert.ok(near(CAMERA.defaultPitch, Math.atan2(1.65, 6.5)));
  assert.equal(CAMERA.fov, 60);
  assert.equal(WALK.walkSpeed, 4.2);
  assert.equal(WALK.runSpeed, 7);
  // 1.25 m apex under 26 m/s².
  assert.ok(near((WALK.jumpSpeed * WALK.jumpSpeed) / (2 * WALK.gravity), 1.25));
});

test('clampPitch + dragLook: right turns right, up looks up, pitch clamped', () => {
  assert.equal(clampPitch(5), CAMERA.maxPitch);
  assert.equal(clampPitch(-5), CAMERA.minPitch);
  const l = dragLook({ yaw: 0, pitch: 0.2 }, 100, 0);
  assert.ok(near(l.yaw, -0.8), 'drag right → yaw decreases (turns right)');
  const up = dragLook({ yaw: 0, pitch: 0.2 }, 0, -50);
  assert.ok(near(up.pitch, 0.2 - 0.3), 'drag up → pitch decreases (looks up)');
  assert.equal(dragLook({ yaw: 0, pitch: 0 }, 0, 10000).pitch, CAMERA.maxPitch);
});

test('keyLook: Q/E turn, R/F tilt, frame-rate independent', () => {
  const none = { turnLeft: false, turnRight: false, lookUp: false, lookDown: false };
  const a = keyLook({ yaw: 0, pitch: 0 }, { ...none, turnLeft: true }, 1);
  assert.ok(near(a.yaw, 0.035 * 60));
  const half = keyLook(keyLook({ yaw: 0, pitch: 0 }, { ...none, turnRight: true }, 0.5), { ...none, turnRight: true }, 0.5);
  assert.ok(near(half.yaw, -0.035 * 60), 'two half-seconds = one second');
  assert.ok(keyLook({ yaw: 0, pitch: 0 }, { ...none, lookUp: true }, 0.1).pitch < 0);
  assert.ok(keyLook({ yaw: 0, pitch: 0 }, { ...none, lookDown: true }, 0.1).pitch > 0);
});

test('padLook: stick right turns right, stick up looks up', () => {
  const l = padLook({ yaw: 0, pitch: 0 }, 1, 0, 0.5);
  assert.ok(near(l.yaw, -1.3));
  assert.ok(padLook({ yaw: 0, pitch: 0 }, 0, 1, 0.1).pitch < 0);
  assert.equal(padLook({ yaw: 0, pitch: 0 }, 0, -1, 100).pitch, CAMERA.maxPitch);
});

test('keysStick: normalised diagonals, opposite keys cancel, up is −Z', () => {
  assert.deepEqual(keysStick(false, false, false, false), STICK_CENTRE);
  assert.deepEqual(keysStick(true, false, false, false), { x: 0, z: -1, magnitude: 1 });
  const d = keysStick(true, false, false, true);
  assert.ok(near(Math.hypot(d.x, d.z), 1));
  assert.deepEqual(keysStick(true, true, false, false), STICK_CENTRE);
});

test('padStick + stickFromOffset: radial dead zone, rescaled, clamped', () => {
  assert.deepEqual(padStick(0.1, 0.05), STICK_CENTRE);
  assert.equal(padStick(0, -1).magnitude, 1);
  assert.ok(padStick(0, -1).z < 0, 'stick up (axis −1) is −Z');
  assert.deepEqual(stickFromOffset(0, 0), STICK_CENTRE);
  assert.deepEqual(stickFromOffset(STICK.radiusPx * 0.1, 0), STICK_CENTRE, 'inside the dead zone');
  assert.equal(stickFromOffset(STICK.radiusPx * 3, 0).magnitude, 1);
  const half = stickFromOffset(0, STICK.radiusPx * (0.15 + 0.85 / 2));
  assert.ok(near(half.magnitude, 0.5));
  assert.deepEqual(stickFromOffset(NaN, 1), STICK_CENTRE);
});

test('stick zone + base follow', () => {
  assert.ok(inStickZone(0.2, 0.8));
  assert.ok(!inStickZone(0.7, 0.8), 'right half is for looking');
  assert.ok(!inStickZone(0.2, 0.1), 'top quarter is the HUD');
  assert.deepEqual(followBase({ x: 0, y: 0 }, { x: 30, y: 0 }), { x: 0, y: 0 });
  const b = followBase({ x: 0, y: 0 }, { x: STICK.radiusPx + 20, y: 0 });
  assert.ok(near(b.x, 20) && near(b.y, 0));
});

test('strongest: the most-pushed source wins', () => {
  const a = { x: 0.1, z: 0, magnitude: 0.1 };
  const b = { x: 0, z: -0.8, magnitude: 0.8 };
  assert.equal(strongest(a, b, STICK_CENTRE), b);
  assert.deepEqual(strongest(), STICK_CENTRE);
});

test('rotateStick: pushing up always moves away from the camera', () => {
  const up = { x: 0, z: -1, magnitude: 1 };
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.3]) {
    const w = rotateStick(up, yaw);
    // The camera looks along (sin yaw, cos yaw).
    assert.ok(near(w.x, Math.sin(yaw), 1e-9) && near(w.z, Math.cos(yaw), 1e-9), `yaw ${yaw}`);
  }
  const right = rotateStick({ x: 1, z: 0, magnitude: 1 }, 0);
  assert.ok(near(right.x, -1) && near(right.z, 0), 'camera looking +Z: screen right is world −X');
});

test('isRunning: Shift, full tilt, B or trigger', () => {
  assert.equal(isRunning({}), false);
  assert.equal(isRunning({ shift: true }), true);
  assert.equal(isRunning({ tilt: 0.9 }), false);
  assert.equal(isRunning({ tilt: 0.95 }), true);
  assert.equal(isRunning({ padB: true }), true);
  assert.equal(isRunning({ padTrigger: 0.2 }), false);
  assert.equal(isRunning({ padTrigger: 0.35 }), true);
});

test('JumpBuffer: a quick tap still jumps; clears on take-off or after the buffer', () => {
  const j = new JumpBuffer();
  assert.equal(j.read(0, false, false), false);
  j.press(1000);
  assert.equal(j.read(1001, false, false), true, 'released at once, still queued');
  assert.equal(j.read(1100, false, false), true);
  assert.equal(j.read(1101 + JUMP_BUFFER_MS, false, false), false, 'buffer ran out');
  j.press(2000);
  assert.equal(j.read(2010, false, false), true);
  assert.equal(j.read(2020, true, false), false, 'took off: cleared');
  assert.equal(j.read(3000, false, true), true, 'held button jumps again on landing');
});

test('facingYaw + engine conversions + wrapAngle', () => {
  assert.ok(near(facingYaw(0, 1, 9), 0), 'walking +Z faces yaw 0');
  assert.ok(near(facingYaw(1, 0, 9), Math.PI / 2));
  assert.equal(facingYaw(0, 0, 9), 9, 'no input keeps the facing');
  // The pawn faces −Z at rotation 0; Athlete Domains yaw 0 faces +Z.
  const r = engineYaw(0);
  assert.ok(near(-Math.sin(r), 0, 1e-9) && near(-Math.cos(r), 1), 'engine forward (−sin, −cos) points +Z');
  assert.ok(near(adYawFromEngine(engineYaw(1.234)), 1.234));
  assert.ok(near(wrapAngle(3 * Math.PI), Math.PI) || near(wrapAngle(3 * Math.PI), -Math.PI));
  assert.ok(near(wrapAngle(0.5), 0.5));
});

test('cameraPivot: keeps its own yaw as the pawn turns; tilts only below the orbit floor', () => {
  const look = { yaw: 0.7, pitch: CAMERA.defaultPitch };
  for (const pawn of [0, 1, -2, 3]) {
    const p = cameraPivot(look, pawn);
    assert.ok(near(wrapAngle(pawn + p.pivotYaw), wrapAngle(engineYaw(0.7)), 1e-9), 'world yaw unchanged by the pawn');
  }
  const rest = cameraPivot(look, 0);
  assert.ok(near(rest.pivotPitch, -CAMERA.defaultPitch));
  assert.equal(rest.cameraTilt, 0);
  const up = cameraPivot({ yaw: 0, pitch: -0.6 }, 0);
  assert.ok(near(up.pivotPitch, -CAMERA.orbitFloor), 'stays at the orbit floor');
  assert.ok(near(up.cameraTilt, CAMERA.orbitFloor + 0.6), 'the rest is a tilt up');
  assert.ok(near(cameraPivot({ yaw: 0, pitch: 9 }, 0).pivotPitch, -CAMERA.maxPitch));
});

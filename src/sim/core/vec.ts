/** Ground-plane vector. The sim is 2D (x along the street, z across it); the adapter adds height. */
export interface Vec2 {
  x: number;
  z: number;
}

export const v2 = (x: number, z: number): Vec2 => ({ x, z });

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, z: a.z * s };
}

export function len(a: Vec2): number {
  return Math.hypot(a.x, a.z);
}

export function norm(a: Vec2): Vec2 {
  const l = len(a);
  return l < 1e-9 ? { x: 0, z: 0 } : { x: a.x / l, z: a.z / l };
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Move `from` toward `to` by at most `step`. Returns the new point and whether it arrived.
 */
export function stepToward(from: Vec2, to: Vec2, step: number): { pos: Vec2; arrived: boolean } {
  const d = dist(from, to);
  if (d <= step || d < 1e-6) {
    return { pos: { x: to.x, z: to.z }, arrived: true };
  }
  const t = step / d;
  return { pos: lerp(from, to, t), arrived: false };
}

/** Yaw (radians) that faces along `dir`, matching atan2(x, z) (0 = +Z). */
export function yawOf(dir: Vec2): number {
  return Math.atan2(dir.x, dir.z);
}

export function fromYaw(yaw: number): Vec2 {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function clampToRect(p: Vec2, minX: number, maxX: number, minZ: number, maxZ: number): Vec2 {
  return { x: Math.min(maxX, Math.max(minX, p.x)), z: Math.min(maxZ, Math.max(minZ, p.z)) };
}

export function round2(p: Vec2): Vec2 {
  return { x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100 };
}

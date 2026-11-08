/**
 * Vertex-coloured geometry batching. The whole static neighbourhood (houses, fences,
 * trees, lawns...) is merged into a handful of meshes so it costs a few draw calls instead
 * of hundreds (engine budget: 500 draw calls). Colour lives in a per-vertex attribute, so
 * one material serves everything.
 */
import * as THREE from 'three';

export class Batch {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly tmpColor = new THREE.Color();

  /** Add a geometry, transformed by position/rotation(Y then X)/scale, painted one colour. */
  public add(
    geometry: THREE.BufferGeometry,
    color: THREE.ColorRepresentation,
    position: THREE.Vector3Like,
    rotationY = 0,
    rotationX = 0,
    rotationZ = 0,
  ): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(position.x, position.y, position.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rotationX, rotationY, rotationZ, 'YXZ')),
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(m);
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const nor = g.getAttribute('normal') as THREE.BufferAttribute;
    const c = this.tmpColor.set(color);
    for (let i = 0; i < pos.count; i++) {
      this.positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      this.colors.push(c.r, c.g, c.b);
    }
    g.dispose();
    geometry.dispose();
  }

  public box(w: number, h: number, d: number, color: THREE.ColorRepresentation, x: number, y: number, z: number, rotY = 0): void {
    this.add(new THREE.BoxGeometry(w, h, d), color, { x, y, z }, rotY);
  }

  public get vertexCount(): number {
    return this.positions.length / 3;
  }

  public build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

/** Shared lit material for batched, vertex-coloured meshes. */
export function batchMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, flatShading: true });
}

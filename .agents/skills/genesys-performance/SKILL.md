---
name: genesys-performance
description: Keep a Genesys game fast — frame, draw call, triangle, shadow, texture and particle budgets, plus how to measure them. Covers instancing and LOD with InstancedMeshNode, shadow and light limits, pooling, particle sizing, build-time asset compression, and reading a runtime performance snapshot. Use when adding many objects, lights, shadows, particles or textures, when a game feels slow or stutters, when the user asks to optimise, profile or reduce draw calls, or before declaring a milestone playable.
metadata:
  tokens: 1394
---

# Genesys performance

Genesys runs on Three.js, so cost is dominated by draw calls, triangles in view, shadow passes, fill rate and GPU memory. Plan for the budgets below before adding content, not after the game is slow.

## Budgets

The desktop column is the engine performance report's defaults (`PERFORMANCE_THRESHOLDS` in `.engine/src/systems/PerformanceSnapshot.ts`); confirm the numbers there before quoting them. The mobile column is a safer target, not an engine constant (render stats warn on a phone above `RENDER_BUDGETS.phone`: 300 draw calls, 500 thousand triangles).

| Resource | Desktop budget | Safer target for mobile or low-end |
| --- | --- | --- |
| Frame rate | 60 fps, never below 30 | 30 fps steady |
| Draw calls in view | about 500 | about 150 |
| Triangles in view | about 1 million | about 300 thousand |
| GPU memory | about 512 MB | about 192 MB |
| Texture memory | about 256 MB | about 96 MB |
| Shadow-casting lights | 1 or 2 | 1 |

Treat these as ceilings for a whole scene, not per object.

## Reduce draw calls

- **Repeated props use instancing.** Trees, rocks, crates, coins, fences and grass should be one `InstancedMeshNode` (or `InstancedModelMeshNode` for a loaded model), not hundreds of separate meshes. Open `.engine/src/nodes/visual/BaseInstancedMeshNode.ts` for the instance API (`addInstance`, `addInstances`, `setInstanceTransforms`, `removeInstance`, `setInstanceColors`) and its options (`maxInstances`, `cullDistance`, `perInstanceFrustumCulling`).
- **Set `maxInstances` to the real worst case.** The buffer is fixed; oversizing wastes memory and undersizing drops instances.
- **Add LODs to instanced props.** `InstancedMeshNode` accepts `lods`, an array of `{ geometry, material?, distance }`. LOD0 is the node's own geometry. Pick distances so the cheap tier takes over before individual triangles are visible.
- **Use `cullDistance`** on dense scatter (grass, debris) so far instances stop rendering.
- **Share materials.** Meshes that share a material and geometry batch far better than many near-identical materials.
- **Merge static geometry** that never moves independently into one geometry in code, when it is not repeated enough to instance.

## Shadows and lights

- Only one or two lights should cast shadows. Everything else uses `castShadow: false`.
- Check `.engine/src/nodes/lights/LightNode.ts` for `shadowMapSize`, `shadowNear` and `shadowFar`. Keep the shadow far plane tight around the play area; a huge range wastes resolution and costs more.
- Prefer a 1024 or 2048 shadow map. Larger sizes cost memory and fill rate for little visible gain.
- Point and spot lights that cast shadows are much more expensive than a directional light. Avoid them for casual games.
- Turn off `castShadow` on small or distant props, and on anything the camera never sees close up.

## Particles and effects

- A particle system's `nbParticles` is a fixed pool. Size it for the worst case of concurrent particles, not lifetime totals. See the `genesys-vfx` skill for the pooling footguns.
- Limit the number of distinct looping emitters alive at once. Each is a draw call and a simulation cost.
- Avoid full-screen post-processing stacks unless the visual goal needs them. Each pass costs fill rate.

## Textures and models

- Do not hand-resize assets to fit; let the project build compress them. Texture compression (KTX2) and mesh compression (Meshopt) happen at build time. See the `genesys-asset-compiler` skill for the settings and the exclude list.
- Keep source textures at the size they are actually seen. A 4096 texture on a small prop is wasted memory.
- Prefer one atlas or a small set of shared textures over dozens of unique ones.
- Reuse loaded models and clone or instance them; do not reload the same asset repeatedly.

## Per-frame code

- Do not allocate in per-frame hooks such as `tickPrePhysics` and `tickPostPhysics`. Reuse `THREE.Vector3`, `Quaternion` and `Matrix4` scratch objects held as fields.
- Pool short-lived objects (projectiles, pickups, hit markers). Create them once, then show, hide and reposition them instead of creating and destroying nodes in gameplay.
- Do not scan the whole scene every frame. Cache references to the nodes you need.
- Stop tickers and timers when they are not needed, and clean up listeners on `endPlay`.
- Keep the physics body count modest. Static scenery should use cheap static shapes, not one dynamic body per prop.

## Measure, do not guess

1. Read the snapshot. The game loop exposes an asynchronous performance snapshot (look for `getPerformanceSnapshot` in `.engine/src/game/GameLoop.ts` and the report shape in `.engine/src/systems/PerformanceSnapshot.ts`). It reports frame timing, draw calls, triangles, GPU and texture memory, physics cost, and a list of issues with a suggestion for each.
2. Warm up first. The first second after loading is not representative; read the snapshot after the scene has settled.
3. Fix the issue with the biggest saving first: usually draw calls from repeated meshes, then shadows, then texture memory.
4. Re-measure after each change. If a change did not move the number, revert it.

## Checklist before calling a scene done

- Repeated props are instanced, with `maxInstances` set deliberately.
- At most two shadow-casting lights, with tight shadow ranges.
- No per-frame allocations or per-frame scene scans.
- Particle pools sized for concurrent use.
- Large textures are only as big as they need to be, and the build's asset compression is enabled.
- The snapshot reports no critical performance issues.

# ENGINE 18.0.0 NOTES — verified cheat sheet (2026-11-07)

Engine `@gnsx/genesys.js` 18.0.0. Citations: `E:` = `.engine/src/…`, `LH:` = `C:\Users\chris\Sandbox\last-hayride\src\…` (engine 18.0.0),
`OG:` = `C:\Users\chris\Sandbox\outgrown\src\…` (engine 16.1.21). Snippets assume
`import * as ENGINE from '@gnsx/genesys.js'; import * as THREE from 'three';`.
Snippets marked **[tsc]** were compiled with `tsc --noEmit` against the 18.0.0 `.d.ts`; nothing here was run in a browser.
**Search tip:** ripgrep / the Grep tool can skip `.engine` (gitignored). Use `grep -rn` in Bash.

---

## 0. Five facts that change how you build

1. **The template `CharacterPawn` is NOT the Mover stack.** It uses `CharacterMovementNode` (E:entities/CharacterPawn.ts:93,144-148).
   Ignore engine-14 notes about `WalkingMode`/`FallingMode`/`setVerticalVelocity`. Those apply only to `MoverCharacterPawn`.
2. **Mouse turns the whole pawn, and only while the pointer is locked.** `lookRight` yaws the pawn root (E:nodes/movement/CharacterMovementNode.ts:316-319).
   `DefaultPlayerController.handleMouseMove` returns early unless pointer-locked (E:entities/DefaultPlayerController.ts:285-287).
   So `noPointerLock: true` means **no mouse turning at all** on desktop.
3. **`MeshNode.create()` with no `physicsOptions` is a solid static collider.** The defaults are `enabled:true, Static, BlockAll, ConvexHull` (E:nodes/PrimitiveNode.ts:61-72).
   For decoration, pass `physicsOptions: { enabled: false }`.
4. **`destroy()` during play disposes geometry, materials and textures** unless they are marked cache-owned (E:utils/ThreeJsExtensions.ts:1461-1471, E:utils/Disposer.ts).
5. **The scene's ground top is at y = −0.85, not 0.** The Ground box is 0.1 tall at y=−0.9, and the PlayerStart is at y=0.9 (`assets/default.genesys-scene`).
   The pawn origin is the capsule centre, and its feet are at `pos.y − 0.9` (E:entities/CharacterPawn.ts:132-135,239).
   So the player drops about 0.85 m on spawn. Place props on y = −0.85.

---

## 1. CharacterPawn (third person)

**Class chain.** `CharacterPawn → MovementPawn → Pawn → PrimitiveNode` (E:entities/CharacterPawn.ts:42, MovementPawn.ts:28, Pawn.ts:25).
- The pawn root is a `KinematicPositionBased` body with the `Character` profile (CharacterPawn.ts:95-100).
- An invisible capsule child (r=0.45, total h=1.8) contributes the collider (CharacterPawn.ts:131-142).
- `CHARACTER_HEIGHT=1.8`, `CHARACTER_WIDTH=0.9`, `CHARACTER_MAX_SPEED=5`, `CHARACTER_JUMP_SPEED=20` (E:const.ts:5-9).

**Scene graph.**
- Camera: `pawn → CameraPivot (pitch) → CameraSpringArm → PerspectiveCamera(60°, near 0.1, far 2000)` (CharacterPawn.ts:173-215).
- Visual: `ModelMeshNode '@engine/assets/character/mannequinG.glb'`, rotated π and offset `y=−0.9` (CharacterPawn.ts:232-248, const.ts:81).
- Animation: `AnimationStateMachineNode '@engine/assets/character/config/mannequin.animconfig.json'` (CharacterPawn.ts:220-227, const.ts:82).

**Position and facing each tick.**
- `world.getFirstPlayerPawn()` returns `getNode(PlayerController)?.getPawn()` (E:game/World.ts:947-949).
- `node.forwardDirection()` is local −Z rotated by `this.quaternion` (E:nodes/SceneNode.ts:674-676). That is fine on a root pawn.
- The pawn faces where the camera looks, because yaw is applied to the root (CharacterMovementNode.ts:316-319).
- `GameMode.tickPrePhysics` is overridable and already skips when not playing (E:game/GameMode.ts:127-132). LH:Core/HayrideGameMode.ts:37-39 is the precedent.
- The active camera is `world.getActiveCamera()`: the view-target stack, falling back to `playerControllers[0].getCamera()` (World.ts:1041-1053).

**Spawn.**
- The default is `restartPlayer → findPlayerStart` (a random *unoccupied* PlayerStart) `→ spawnPlayerPawnWithTransform` (GameMode.ts:537-578,628-652).
- Standalone runs `pawnFactory()`, then `setWorldPosition/Rotation`, then `world.add` (GameMode.ts:732-737).
- With no PlayerStart, it warns and spawns at the origin (GameMode.ts:555-557).
- To spawn from code, override `spawnPlayerPawnWithTransform` (public async) or `findPlayerStart`.

**Speeds and jump** (`CharacterMovementNode` options, E:nodes/movement/CharacterMovementNode.ts:27-48; defaults at :52-98):
- `maxSpeed` 5, `accelerationLambda` 100, `decelerationLambda` 10.
- `midAirAccelerationLambda` **5**, `midAirDecelerationLambda` **0.5**. These give weak air control (:234-236). Raise them.
- `jumpSpeed` 20, `maxMidAirJumps` 0, with 100 ms coyote time (:117,364-366).
- Character controller (KCC): `simulatedGravityScale` 5 (so effective g ≈ 49 m/s²), `maxSlopeClimbAngle` π/4, `autoStep.maxHeight` 0.45, `snapToGroundDistance` 0.1, `applyImpulsesToDynamicBodies` true (:82-98,277).
- **There is no run/sprint in 18's CharacterMovementNode.** Effective speed is `maxSpeed * speedModifier` (:237).
  To add a run, drive `speedModifier` from Shift yourself.
  The animation's `isRunning` flag means planar speed > 2 m/s (CharacterPawn.ts:330).
- `deltaTime` is clamped to 0.2 s per step (:228).

**Camera.**
- Fields: `cameraMinDistance` 1, `cameraMaxDistance` 10, `cameraZoomSensitivity` 0.5, `cameraCollisionBuffer` 0.05, `cameraSpringStiffness` 4.5, `cameraMin/MaxPitchDegrees` ±80 (CharacterPawn.ts:62-82).
- Distance and height come from `getInitialCameraPositions()`, whose default is pivot (0,0,0) and camera (0, 2.34, 3.6) (:155-166).
  The arm length is `|camera − pivot|` and the pitch is derived from it (:186-206).
- The spring arm's collision is a `performHitTest` with the `SpringArmCamera` profile, which ignores the Pawn channel (E:nodes/movement/SpringArmNode.ts:111-175, E:systems/collision/CollisionConfig.ts:181-184).
  `BlockAll` props therefore pull the camera in. Use `NoCollision` or a disabled-physics decoration to avoid that.
- Mouse wheel calls `zoomStep` and is clamped to min/max distance (DefaultPlayerController.ts:301-321, CharacterPawn.ts:306-318).
  The Q/Z "zoom" keys set a zoom input that `CharacterMovementNode` never reads, but the keypress is still consumed (DefaultPlayerController.ts:58-59,134-139).

**Pointer lock.**
- `PlayerController.create({ noPointerLock: true })` exists (E:entities/PlayerController.ts:24-27,41-44).
- Without it, `trySetupLocalInput` calls `requestPointerLock` (:175-177). The lock is only *acquired* on the next mousedown or click on the canvas (E:systems/InputManager.ts:554-559,777,802,1194-1219).
- Release the lock with `world.inputManager.exitPointerLock()` (InputManager.ts:868).
- **Trap:** without the lock, mouse look is dead (see §0.2).
  outgrown used `MoverPlayerController.create({ noPointerLock: true })` (OG:Core/OutgrownGameMode.ts:19), but the Mover controller also gates look on the lock (E:entities/MoverPlayerController.ts:206-207).
  **Recommendation:** keep the pointer lock (click to play). Treat losing the lock as "pause".

**Mobile joystick.**
- `virtualJoystickOptions` is passed in `main()` through `BaseGameLoopOptions` (E:game/GameLoop.ts:147). Its `enabled` option defaults to `'auto'` (InputManager.ts:171-197,249-251).
- `'auto'` means `isMobileBrowser()`, which is true for any `ontouchstart` device, including touchscreen laptops (E:utils/Utils.ts:92-108). Pass an explicit boolean instead.
- The left stick moves and the right stick looks (DefaultPlayerController.ts:330-367).
- LH disables the sticks with `{ enabled: false }` (LH:game.ts:22).

**Stun.**
- Set `movementNode.speedModifier = 0` and `jumpStrengthModifier = 0` (E:nodes/movement/BasePawnMovementNode.ts:136-140, used at CharacterMovementNode.ts:183,237). Gravity still applies and look still works.
- Do **not** use `inputManager.setInputEnabled(false)`. While input is disabled, keyup is ignored (InputManager.ts:647-649,763-765), so the controller's private `forward=1` latches and the player walks off when input returns.

**Teleport.**
- `pawn.setWorldTransform({position})`, or `setWorldPosition`, goes through `MovementPawn.setWorldTransform → movementNode.setPawnWorldTransform` (E:entities/MovementPawn.ts:116-123).
  `CharacterMovementNode` then also calls `physicsEngine.teleportBody` (CharacterMovementNode.ts:208-214).
- Zero the fall speed with `setVelocities(0,0,0)` (:384-388).

**Swap the character model.**
- Override `setupVisualNode()` / `setupAnimationNode()`. They must `this.add()` what they return, or `initialize` throws (CharacterPawn.ts:113-124).
- For an unrigged model, return `null` from `setupAnimationNode` (OG:Characters/DragonPawn.ts:140-143).
- The animation node binds to the **first `ModelMeshNode` under the pawn root** (E:nodes/visual/AnimationStateMachineNode.ts:214-216).
  Do not attach other GLB ModelMeshNodes (hats, held props) to the pawn before the body, or they may become the animation target.
- `mannequin.animconfig.json` takes its clips from `mannequinG.glb` (`externalAnimationSources`).
  - Clips: Idle, Run, RunBackward, StrafeLeft, StrafeRight, Jump.
  - Parameters: forward, back, left, right, isRunning, isJumping.
  - Engine character GLBs: `mannequin.glb`, `mannequinG.glb`, `SKM_SB_MediumHuman.glb` under `@engine/assets/character/`.
  - A rigged GLB with the same bone names can reuse that animconfig by pointing `modelUrl` at it. **UNVERIFIED** for non-mannequin skeletons (the animconfig supports `targetSkeletonProfile` retargeting, AnimationStateMachineNode.ts:219-229).
- `getAnimationParameters()` is protected and overridable (CharacterPawn.ts:320-344). The `isJumping` raw-grounded flicker reported in the engine-14 notes is likely here too, because the code is the same shape.

```ts
// [tsc] src/game.ts-style pawn + game mode
@ENGINE.GameClass()
export class ThirdPersonPlayer extends ENGINE.CharacterPawn {
  public override cameraCollisionBuffer = 0.15;          // fields are read during initialize()
  public override cameraMinDistance = 2;
  public override cameraMaxDistance = 8;

  protected override createMovementNode(): ENGINE.BasePawnMovementNode {
    return ENGINE.CharacterMovementNode.create({
      name: 'MovementNode', maxSpeed: 6, jumpSpeed: 14,
      midAirAccelerationLambda: 20, midAirDecelerationLambda: 3,
    });
  }
  protected override getInitialCameraPositions() {       // distance/height
    return { pivotPosition: new THREE.Vector3(0, 0.6, 0), cameraPosition: new THREE.Vector3(0, 2.2, 4.5) };
  }
  protected override setupVisualNode(): ENGINE.SceneNode | null {   // custom rigged GLB
    const mesh = ENGINE.ModelMeshNode.create({
      name: 'MeshNode', modelUrl: '@project/assets/models/hero.glb',
      rotation: new THREE.Euler(0, Math.PI, 0),                         // GLB faces +Z, engine forward is −Z
      position: new THREE.Vector3(0, -ENGINE.CHARACTER_HEIGHT / 2, 0),
      physicsOptions: { enabled: false }, castShadow: true,
    });
    this.add(mesh);
    return mesh;
  }
  // setupAnimationNode(): AnimationStateMachineNode.create({ name, configUrl: '@project/...animconfig.json' }); this.add(it)

  get mover(): ENGINE.CharacterMovementNode | null {
    const m = this.movementNode; return m instanceof ENGINE.CharacterMovementNode ? m : null;
  }
  private stunLeft = 0;
  stun(seconds: number): void {
    if (!this.mover) return;
    this.stunLeft = seconds; this.mover.speedModifier = 0; this.mover.jumpStrengthModifier = 0;
  }
  teleport(pos: THREE.Vector3, yaw?: number): void {
    this.setWorldTransform({ position: pos, rotation: yaw === undefined ? undefined : new THREE.Euler(0, yaw, 0) });
    this.mover?.setVelocities(0, 0, 0);
  }
  public override tickPrePhysics(dt: number): void {
    super.tickPrePhysics(dt);
    if (this.stunLeft > 0 && (this.stunLeft -= dt) <= 0 && this.mover) {
      this.mover.speedModifier = 1; this.mover.jumpStrengthModifier = 1;
    }
  }
}

@ENGINE.GameClass()
export class ThirdPersonGameMode extends ENGINE.GameMode {
  private readonly tmp = new THREE.Vector3();
  public override initialize(options?: ENGINE.GameModeOptions): void {
    super.initialize({
      ...options,
      pawnFactory: async () => ThirdPersonPlayer.create(),
      playerControllerFactory: async () => ENGINE.DefaultPlayerController.create({ noPointerLock: false }),
    });
  }
  // spawn from code instead of PlayerStart:
  public override async spawnPlayerPawnWithTransform(id: number, pc: ENGINE.PlayerController, _p: THREE.Vector3, r: THREE.Euler) {
    return super.spawnPlayerPawnWithTransform(id, pc, new THREE.Vector3(0, 0.1, 5), r);
  }
  public override tickPrePhysics(dt: number): void {
    super.tickPrePhysics(dt);
    const pawn = this.getWorld()?.getFirstPlayerPawn();
    if (!(pawn instanceof ThirdPersonPlayer)) return;
    const pos = pawn.getWorldPosition(this.tmp);            // capsule centre; feet = pos.y - 0.9
    const fwd = pawn.forwardDirection();                    // world −Z of the pawn
    const yaw = Math.atan2(-fwd.x, -fwd.z);
    void pos; void yaw;
  }
}
```

---

## 2. Keyboard and touch input

There are four routes, all verified.

| Route | Where | Use for |
|---|---|---|
| `window.addEventListener('keydown')` | proven: LH:Core/RideDirector.ts:229, OG:Core/RunDirector.ts:123-135,195,211 | Menus, Esc/Tab/number keys, anything that must work while paused. Fires even when the world is not playing, and fires for auto-repeat (check `e.repeat`). The engine never calls `stopPropagation`. |
| `world.inputManager.isKeyDown('KeyE')` | E:systems/InputManager.ts:841-843 (accepts codes, letters, `Shift`) | Per-tick polling of held keys. The key set is only maintained while the world is playing, and repeats are dropped (:738-749). |
| `DefaultPlayerController.onKeyDown` delegate | E:entities/DefaultPlayerController.ts:90-91,109-115 | Runs **before** the built-in WASD/Space/Q/Z/E/R mapping. Return `true` to consume the key (for example to steal Q from zoom). |
| `world.inputManager.addInputHandler(h)` | InputManager.ts:565-568 | **Avoid.** Handlers run in insertion order until one returns true (:750-757). Yours lands after the PlayerController, which consumes WASD/arrows/Space/Q/Z. |

- **Built-in keys** (DefaultPlayerController.ts:54-62):
  - Movement: W/S/A/D and the arrow keys (A/D strafe; they do not turn).
  - Space jumps. Q and Z zoom (and are consumed).
  - E calls `interact()` only for an `IInteractPawn`. A plain `CharacterPawn` is not one, so E falls through unconsumed (:140-143).
  - R calls `reload()` only on a combat pawn.
- **Escape:** if the engine consumes Escape it calls `preventDefault` (InputManager.ts:752-755).
  While the pointer is locked, the browser uses Esc to release the lock. Whether the page also receives that keydown is **UNVERIFIED** (browser behaviour).
  Robust pattern: listen to `document 'pointerlockchange'` and pause when `document.pointerLockElement` becomes null.
- **Tab:** call `preventDefault()` in your window listener, or the browser moves focus.
- **Touch buttons:** the engine has swipe and tap delegates (InputManager.ts:93-94,475-476) but no on-screen button widget.
  Use DOM inside `#ui-container` (see §6). Its children must set `pointer-events:auto`. A DOM button does not hit the canvas, so tapping it does not grab the pointer lock (the lock is acquired on canvas mousedown/click only, :698-702,777,802).

```ts
// [tsc]
export function wireInput(world: ENGINE.World): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (e.code === 'Tab') e.preventDefault();
    if (e.code === 'KeyE') { /* interact */ }
    if (e.code.startsWith('Digit')) { /* slot = Number(e.code.slice(5)) */ }
  };
  window.addEventListener('keydown', onKey);
  const pc = world.getPlayerControllerAt(0);                 // E:game/World.ts:955
  if (pc instanceof ENGINE.DefaultPlayerController) pc.onKeyDown.add((e: KeyboardEvent) => e.code === 'KeyQ');
  const running = world.inputManager.isKeyDown('Shift');     // poll in a tick
  void running;
  return () => window.removeEventListener('keydown', onKey);
}
```

---

## 3. Static scenery at runtime

**Options.**
- `MeshNode.create({ geometry, material, uvScaleTilesPerUnit, physicsOptions, position, rotation, scale, castShadow, receiveShadow, name })` (E:nodes/visual/MeshNode.ts:31-35,62-68; SceneNodeOptions at E:nodes/SceneNode.ts:107-131).
- `castShadow` and `receiveShadow` are forwarded to the inner mesh (SceneNode.ts:198-202).
- The material is a THREE material or an asset path string (MeshNode.ts:85-110).

**Physics defaults.**
- Defaults: `{enabled:true, motionType:Static, density:1, gravityScale:1, generateCollisionEvents:true, collisionMeshType:ConvexHull, collisionProfile:BlockAll}` (E:nodes/PrimitiveNode.ts:61-72).
- Your `physicsOptions` are `Object.assign`ed over those defaults (:132-136).
- The body is registered in `beginPlay` (:361-368) and removed in `endPlay` (:371-381).

**Shape selection** (E:physics/BasePhysicsEngine.ts:697-800):
- Sphere, Capsule, Cone and Cylinder geometry always get an analytic primitive collider, whatever `collisionMeshType` says.
  A cylinder uses the *average* radius, so a cone-ish `CylinderGeometry` is approximate.
- Any other geometry (Box, Torus, merged geometry) with a `collisionMeshType` set becomes a mesh collider. Because the default is ConvexHull, **a BoxGeometry gets a convex hull, not a cuboid**.
- `CollisionMeshType.BoundingBox` builds a cuboid from the bounding box, with a centre offset (E:physics/implementations/RapierPhysics.ts:497-515).
- For a GLB, the ConvexHull default wraps the whole model in one hull, filling in doorways and arches. Use BoundingBox, Trimesh (static only), or separate invisible box colliders.

**Collision profiles** (E:systems/collision/CollisionConfig.ts:117-184):
- `BlockAll` blocks everything, the camera included.
- `NoCollision` means no body is created at all (PrimitiveNode.ts:249-258).
- `Trigger` is query-only and overlaps.
- `Character` ignores the Pawn channel, so pawns pass through each other.

**Scale is baked once.** The collider is built from the world scale at registration (BasePhysicsEngine.ts:664-665,712-800). `shouldSyncToPhysics` compares only position and quaternion (PrimitiveNode.ts:415-423), so animating `scale` never resizes the collider.

**Moving nodes.**
- Writing `node.position` on a body with physics is pushed to the physics engine every tick (`syncToPhysics`, PrimitiveNode.ts:425-433).
- For anything that moves, use `physicsOptions: { enabled: false }` (no collider) or `KinematicPositionBased` (§4).

**Adding children.**
- In 18, `Object3D.add` runs `beginPlaySubtree` when the destination's world is playing (E:utils/ThreeJsExtensions.ts:1344-1356,1394-1413).
  Adding a child to an already-added parent works mid-play. The engine-14 note "parent.add may silently not register" is outdated.
- Moving an already-*Playing* node under a non-playing parent is rejected (`ensure`, :1331-1338). Build groups first, then `world.add(group)`.

**Removing and destroying.**
- `node.destroy()` ends play (unregisters physics and ticks), **disposes** geometry, materials and textures unless they are cache-owned, then detaches (ThreeJsExtensions.ts:1461-1471, E:utils/Disposer.ts:24-110).
- For shared geometry and materials, call `ENGINE.resourceManager.markCacheOwned(x)` (E:utils/ResourceManager.ts:258-262).
- `world.remove(x)` only detaches from the graph; it does not end play (E:game/World.ts:668-700).

```ts
// [tsc]
export function buildScenery(world: ENGINE.World): ENGINE.SceneNode {
  const GROUND_Y = -0.85;                                               // template ground top
  const mat = new THREE.MeshStandardMaterial({ color: 0xffcc66, roughness: 0.8 });
  ENGINE.resourceManager.markCacheOwned(mat);                           // shared -> protect from destroy()
  const wall = ENGINE.MeshNode.create({                                 // solid, explicit cuboid
    name: 'Wall', geometry: new THREE.BoxGeometry(4, 3, 0.3), material: mat,
    position: new THREE.Vector3(0, GROUND_Y + 1.5, -6), castShadow: true, receiveShadow: true,
    physicsOptions: {
      enabled: true, motionType: ENGINE.PhysicsMotionType.Static,
      collisionProfile: ENGINE.DefaultCollisionProfile.BlockAll,
      collisionMeshType: ENGINE.CollisionMeshType.BoundingBox,
    },
  });
  const flower = ENGINE.MeshNode.create({                               // decoration: NO collider
    geometry: new THREE.SphereGeometry(0.2, 12, 8), material: new THREE.MeshStandardMaterial({ color: 0xff3399 }),
    position: new THREE.Vector3(2, GROUND_Y + 0.2, -3), physicsOptions: { enabled: false },
  });
  const npc = ENGINE.SceneNode.create({ name: 'Npc', position: new THREE.Vector3(3, GROUND_Y, 0) }); // group pivot at feet
  const part = (g: THREE.BufferGeometry, y: number) => ENGINE.MeshNode.create({
    geometry: g, material: mat, position: new THREE.Vector3(0, y, 0), castShadow: true, physicsOptions: { enabled: false },
  });
  npc.add(part(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16), 0.6),
          part(new THREE.SphereGeometry(0.3, 16, 12), 1.5),
          part(new THREE.ConeGeometry(0.3, 0.5, 16), 1.95));
  world.add(wall, flower, npc);
  // per tick: npc.position.x += v * dt; npc.rotation.y = heading;  (no collider -> nothing to desync)
  // later:    flower.destroy();
  return npc;
}
```

---

## 4. Dynamic physics, kinematic props, triggers

**Verdict: animate props kinematically, or with physics off. It is less risky.** Neither last-hayride nor outgrown spawns a Dynamic body.
- last-hayride props are `physicsOptions:{enabled:false}` (LH:Core/Props.ts:62-63) with their transforms set every tick (LH:Core/Creatures.ts:233,250).
- outgrown's comment: a tweened static collider is "left behind… an invisible cow" (OG:Core/RunDirector.ts:53-56).

**Dynamic works.**
- Use `motionType: Dynamic`. Physics writes the transform of every non-Static body back to its node each tick (E:physics/implementations/RapierPhysics.ts:251-275).
- Read `getWorldPosition()` in `tickPostPhysics`. World tick order is `runInNextTick` fns → timers → tweens → tickPrePhysics → physics → tickPostPhysics (E:game/World.ts:862-902).

**Velocity is node-level.**
- `node.setPhysicsVectorParam(ENGINE.PhysicsVectorParam.LinearVelocity | AngularVelocity, [x,y,z])` returns `boolean` (E:nodes/PrimitiveNode.ts:395-413, E:physics/PhysicsEngine.ts:317-334).
- Rapier implements it with `setLinvel` (RapierPhysics.ts:867-874). It returns false before the body exists.
- **There is no node-level impulse.** `applyImpulseToPhysicsBody(handle, …)` only works on handle bodies from `createPhysicsBody` (BasePhysicsEngine.ts:1858-1863). Treat "impulse" as "set the velocity once".

**Body exists right after `world.add` during play.**
- `World.add → super.add` uses the patched `Object3D.add`, which runs `beginPlaySubtree` when the world is playing (E:utils/ThreeJsExtensions.ts:1344-1356,1394-1413).
- That calls `PrimitiveNode.beginPlay → registerPhysicsBody → addNode` synchronously (PrimitiveNode.ts:260-281,361-368).
- Verified by reading only. If the set call returns false, retry in `world.runInNextTick`.

**Dynamic traps.**
- Writing `position` on a Dynamic node teleports it with `setTranslation` and keeps its velocity (RapierPhysics.ts:756-761).
- The player KCC shoves Dynamic bodies (`applyImpulsesToDynamicBodies: true`, CharacterMovementNode.ts:86), so props scatter.
- Collider scale is baked at registration (§3).
- Give throwaways `node.setLifeSpan(seconds)`. It auto-`destroy()`s in `tickPrePhysics` (E:nodes/SceneNode.ts:618-625,773-776).

**Kinematic.**
- With `KinematicPositionBased`, writing `node.position` each tick calls `setNextKinematicTranslation/Rotation` (RapierPhysics.ts:763-769, via `syncToPhysics` PrimitiveNode.ts:425-433).
- The KCC sweep excludes only sensors (RapierPhysics.ts:935-941), so kinematic bodies **block** the player. Nothing in the engine *pushes* the player out of the way.
- Whether the player can get trapped when a kinematic body moves into it is **UNVERIFIED at runtime**.
- For NPCs the player must not get stuck on, use **no collider** plus a distance check, or a `Trigger` sensor (below).

**Triggers.**
- Recipe: `collisionProfile: Trigger` (query-only, overlaps; E:systems/collision/CollisionConfig.ts:159-166) + `generateCollisionEvents: true` + the `onOverlapWith` delegate (PrimitiveNode.ts:106-127).
- Sensors are excluded from the KCC sweep.

```ts
// [tsc]
export function tossCrate(world: ENGINE.World, at: THREE.Vector3): ENGINE.MeshNode {
  const crate = ENGINE.MeshNode.create({
    name: 'Crate', geometry: new THREE.BoxGeometry(0.5, 0.5, 0.5),
    material: new THREE.MeshStandardMaterial({ color: 0xaa7744 }), position: at.clone(), castShadow: true,
    physicsOptions: {
      enabled: true, motionType: ENGINE.PhysicsMotionType.Dynamic, density: 1,
      collisionMeshType: ENGINE.CollisionMeshType.BoundingBox,
      collisionProfile: ENGINE.DefaultCollisionProfile.BlockAll, contributeToParentCollider: false,
    },
  });
  world.add(crate);
  crate.setLifeSpan(6);
  crate.setPhysicsVectorParam(ENGINE.PhysicsVectorParam.LinearVelocity, [0, 5, -3]);   // false => body not yet registered
  crate.setPhysicsVectorParam(ENGINE.PhysicsVectorParam.AngularVelocity, [4, 0, 2]);
  return crate;                                           // crate.getWorldPosition() is physics-driven
}

export function trigger(world: ENGINE.World, onEnter: () => void): ENGINE.MeshNode {
  const zone = ENGINE.MeshNode.create({
    geometry: new THREE.BoxGeometry(2, 2, 2), selfHidden: true,
    physicsOptions: {
      enabled: true, motionType: ENGINE.PhysicsMotionType.KinematicPositionBased,
      collisionProfile: ENGINE.DefaultCollisionProfile.Trigger,
      collisionMeshType: ENGINE.CollisionMeshType.BoundingBox, generateCollisionEvents: true,
    },
  });
  zone.onOverlapWith.add((_self, other) => { if (other.getRoot() instanceof ENGINE.CharacterPawn) onEnter(); });
  world.add(zone);                                        // move it each tick via zone.position (kinematic)
  return zone;
}
```

---

## 5. GLB at runtime

**Options.**
- `ModelMeshNode.create({ modelUrl, material?, materials?, useDynamicMaterials?, sockets?, …PrimitiveNodeOptions })` (E:nodes/visual/ModelMeshNode.ts:33-41).
- Methods: `waitForLoad()` (:122-124), `getModel()` (cloned scene, `@deprecated` but works, :356), `getAnimations(): AnimationClip[]` (:364-366), and the `onMeshLoaded` delegate (:50,252).

**Load timing.**
- **The load starts at `beginPlay`, not at `create`** (:105,129-139).
- Calling `waitForLoad()` before the node is in a playing world resolves immediately with nothing loaded (E:utils/IAsyncLoadable.ts:39-41).
- **`world.add` first, then await.**
- LH:Core/Props.ts:65-68 awaits *before* the add. That is a probable latent bug: the tint is skipped. It was found by reading, not by running.

**Physics.**
- Physics defaults ON: Static plus one ConvexHull around the whole model (§3).
- The GLB collider is only built **after the model loads** (`createGLTFMeshRecord` returns null until loaded, E:physics/BasePhysicsEngine.ts:1263-1273; refresh at ModelMeshNode.ts:240-241).
- For decoration, pass `physicsOptions:{enabled:false}`, as LH does everywhere.

**Materials.**
- Materials are shared with the GLTF cache unless `useDynamicMaterials` is set (:247-249). Clone a material before tinting it (LH:Core/Band.ts:57-75).
- Skinned meshes: set `frustumCulled=false` (Band.ts:65-66).

**Paths.**
- `@project/assets/...` and `@engine/assets/...` (E:const.ts:42-43, E:storage/storageProvider.ts:43-50).
- The dev launcher maps `@project/` to `/.dist/` (`scripts/genesys/dev/storage-provider.ts:48-49,98`). Your `build-dist.mjs` copies **all** of `assets/` (`scripts/build-dist.mjs:37-38`), so in the no-Studio flow everything ships.

**ShippedAssets.**
- The Studio build is said to scan the bundle for **literal** asset strings and copy only those (LH:Core/ShippedAssets.ts:1-5; installed at LH:game.ts:17, LH:Core/ShippedAssets.ts:82-84).
- The scanner is in the closed editor and is **UNVERIFIED**. Adopt the pattern only if you ever publish through Studio.

**Clips.**
- Option 1 (proven, LH:Core/Band.ts:57-111): a plain `THREE.AnimationMixer` on `getModel()` with clips from `getAnimations()`. You must call `mixer.update(dt)` every tick yourself.
- Option 2: `AnimationStateMachineNode` (animconfig JSON). It offers `blendTo(clip, dur)` (E:nodes/visual/AnimationStateMachineNode.ts:1316), `playOneShot(clip)` (:1439) and `setParameter` (:717).
- There is no `AnimatorNode` in 18.

**Bundled characters** (`node_modules/@gnsx/genesys.js/assets/`):
- `character/{mannequin,mannequinG,SKM_SB_MediumHuman}.glb`
- `dev/character/SKM_SB_*`, plus clip packs `dev/character/animation/{UAL1,UAL2,HappyIdle}.glb`
- `models/demo/Characters/{Knightdude,Spacedude}.glb`
- Only two animconfigs: `character/config/mannequin.animconfig.json` and `dev/character/animation/mannequin-anim-additive.animconfig.json`.

```ts
// [tsc]
export async function placeGlb(world: ENGINE.World, url: string, at: THREE.Vector3) {
  const root = ENGINE.SceneNode.create({ name: 'Prop', position: at.clone() });
  const model = ENGINE.ModelMeshNode.create({ modelUrl: url, castShadow: true, receiveShadow: true,
    physicsOptions: { enabled: false } });    // or { motionType: Static, collisionMeshType: BoundingBox }
  root.add(model);
  world.add(root);                             // BEFORE waitForLoad: beginPlay starts the load
  await model.waitForLoad();
  const obj = model.getModel();
  const mixer = obj ? new THREE.AnimationMixer(obj) : null;
  const clip = model.getAnimations().find((c) => c.name === 'Wave') ?? model.getAnimations()[0];
  if (mixer && clip) mixer.clipAction(clip).play();
  return { root, model, mixer };               // mixer.update(dt) from your tick
}
// Studio-publish only: keep literal strings alive in the bundle (LH pattern)
export const SHIPPED = ['@project/assets/models/hero.glb'] as const;
export function installShipped(): void { (globalThis as Record<string, unknown>).__eifAssets = SHIPPED; }
```

---

## 6. DOM overlay UI

**`world.gameContainer`.**
- `world.gameContainer: HTMLElement | undefined` (E:game/World.ts:398-400) is undefined when headless.
- `GameLoop` sets it to `position:relative` (E:game/GameLoop.ts:264). The canvas is appended into it (E:render/Renderer.ts:106).

**`#ui-container`.**
- `world.uiManager` creates `<div id="ui-container">` inside `gameContainer` with `position:absolute; 100%×100%; pointer-events:none; z-index:1000` (E:ui/UIManager.ts:35-51). It sits **above the canvas** as a sibling.
- Children need `pointer-events:auto`. `uiManager.createElement` sets that for you (:54-74).

**Input.**
- Canvas mouse and touch listeners are on the renderer element (E:systems/InputManager.ts:698-708). A click on overlay DOM never reaches the canvas, so it neither turns the camera nor grabs the pointer lock.
- `UIManager` is an input handler that consumes events targeted inside `#ui-container` (World.ts:221, UIManager.ts:149-173).
- Keyboard listeners are on `window` (InputManager.ts:695-696). For a text `<input>`, call `stopPropagation()` on its keydown, or WASD drives the pawn (LH:UI/Hud.ts:212-213).

**Joystick zones** are in the game container *below* `#ui-container`, so a DOM button over a stick zone steals the touch. Keep buttons out of the bottom-left and bottom-right zones.

**last-hayride** appends its own root to `gameContainer`: `.lh-root{position:absolute;inset:0;pointer-events:none;z-index:20}` with `pointer-events:auto` on cards and buttons, and `stopPropagation` on `pointerdown` (LH:Core/RideDirector.ts:203-207, LH:UI/Hud.ts:12,21,35,152-155,218,226).

```ts
// [tsc] on-screen touch button (e.g. interact)
export function addButton(world: ENGINE.World, label: string, onClick: () => void): HTMLButtonElement {
  const host = world.gameContainer?.querySelector<HTMLElement>('#ui-container') ?? world.gameContainer ?? document.body;
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = 'position:absolute;right:24px;bottom:180px;pointer-events:auto;font-size:20px'; // above right stick zone
  b.addEventListener('pointerdown', (e) => { e.stopPropagation(); onClick(); });
  host.appendChild(b);
  return b;
}
```

---

## 7. Audio

**SoundNode.**
- Options: `SoundNode.create({ sounds: SoundResource[], loop?, positional?, autoPlay?, autoPlayClipKey?, bus?='SFX' })` (E:nodes/audio/SoundNode.ts:21-34).
- Build each `SoundResource` with `new ENGINE.SoundResource()` and set `name`, `audioPath`, `volume`, … (E:nodes/audio/SoundResource.ts:11-35).
- Methods: `play(key, volume?, forceRestart=false): Promise<boolean>` (:223), `waitForLoad()` (:101-103), `stop/stopAll/setVolume/setLoop`, and `getAudio(key)`, which returns the raw `THREE.Audio` (:366-368).

**Async-decode trap.**
- Buffers decode in an async task started at `beginPlay` (:109-153).
- `play()` before then warns `Sound with key "…" not found` and returns false (:228-231).
- So: `world.add(node)`, then `await node.waitForLoad()`.

**One voice per node.**
- Without `forceRestart`, `play` returns false while the node is playing (:225-227). With it, the current sound is stopped (:234-236).
- For overlapping SFX, round-robin several nodes (LH:Audio/AudioDirector.ts:81,281-292).

**Loops and pitch.**
- `loop` is per node (:196). Use one node per loop.
- Pitch: `getAudio(key)?.setPlaybackRate(r)` is a three.js call; the engine has no pitch API.

**GlobalAudioManager** (`world.globalAudioManager`, E:utils/GlobalAudioManager.ts):
- Methods: `playGlobalSound(url, {volume, loop, bus}): Promise<SoundHandle|null>` (:338), `loadSound(key,url)` preload (:213), `stopSound(handle)` (:416), `getBus('Master'|'SFX'|'Music'|'Voice'|'Ambience')?.setVolume(v)` (:122-127,185).
- It decodes on first play. **It never resumes a suspended AudioContext**, while `SoundNode.play` does (SoundNode.ts:259-271). Start the first sound from a click or tap.

**How last-hayride does it.**
- SoundNodes only, behind a `ready = Promise.all(nodes.map(n => n.waitForLoad()))` gate (LH:Audio/AudioDirector.ts:85-89,294-305).
- Loops start at volume 0.0001 on the RIDE click (:109-113) and fade per frame via `getAudio(key)?.setVolume()` (:163).
- One-shots round-robin over 3 nodes with `forceRestart` (:281-292).
- Mute is `getBus('Master').setVolume(0)` (:275).

```ts
// [tsc]
export async function makeSfx(world: ENGINE.World, clips: string[], loop = false): Promise<ENGINE.SoundNode> {
  const sounds = clips.map((c) => { const r = new ENGINE.SoundResource();
    r.name = c; r.audioPath = `@project/assets/sounds/${c}.mp3`; r.volume = 0.8; return r; });
  const node = ENGINE.SoundNode.create({ name: 'Sfx', sounds, loop, bus: 'SFX', positional: false, autoPlay: false });
  world.add(node);             // beginPlay starts decode
  await node.waitForLoad();    // play() before this silently fails
  return node;                 // node.getAudio('bonk')?.setPlaybackRate(1.2); void node.play('bonk', 1, true);
}
export async function music(world: ENGINE.World) {             // call from a click handler
  const gam = world.globalAudioManager;
  const h = await gam.playGlobalSound('@project/assets/sounds/music.mp3', { loop: true, bus: 'Music', volume: 0.5 });
  return () => { if (h) gam.stopSound(h); };
}
```

---

## 8. Lighting, sky and fog (bright cartoon look)

**What the scene already has** (`assets/default.genesys-scene`):
- A `DirectionalLightNode` at (10,50,−10): **intensity 10**, warm colour, castShadow, shadow camera ±200, far 250, map 2048, bias −0.001, `drivesSky:true`.
- A procedural `SkyNode` with `generateEnvironmentMap:true` and clouds.
- Post-processing: `toneMapping` mode 4, exposure 0.5.
- **No** hemisphere light, ambient light or fog.

**Lights** (E:nodes/lights/):
- `LightNodeOptions`: `color, intensity, castShadow, shadowMapSize, shadowBias, shadowNormalBias, shadowNear, shadowFar, shadowRadius` (LightNode.ts:15-33).
- `DirectionalLightNode` adds `shadowCameraLeft/Right/Top/Bottom` (default ±50), `useCsmShadows`, `drivesSky` (DirectionalLightNode.ts:19-53).
  Aim it with `position.set()` + `lookAt()` (LightNode.ts:350-377).
- `HemisphereLightNode` takes `{color (sky), groundColor, intensity}` (HemisphereLightNode.ts:15-22). `AmbientLightNode` takes the base light options (AmbientLightNode.ts:14).
- `GameBuilder.createDefaultLighting` adds an ambient light at 0.5 (E:game/GameBuilder.ts:56-82).

**Sky.**
- The `SkyNode` sun follows the first `drivesSky` directional light (E:nodes/visual/SkyNode.ts:458-468). For a sunny day, keep it and add a hemisphere light.

**Fog.**
- `FogNode` exists in 18: `{fogMode: Linear|Exponential|ExponentialHeight, fogColor: THREE.Color, fogNear, fogFar, fogDensity, fogHeight, fogHeightFalloff}`. Defaults are Linear, grey, 0.1–50 (E:nodes/visual/FogNode.ts:13-59).
- `fogColor` keeps the *reference*, so pass a `.clone()`.
- Only one fog is active (it writes `scene.fog`), and any FogNode's `endPlay` nulls it (:257-287).
- `ExponentialHeight` needs WebGPU (:262-269).

**Equirect WebP skybox.**
- Use `SceneEnvironmentNode.create({ textureUrl, backgroundIntensity, backgroundBlurriness, backgroundRotation, envMapIntensity })` (E:nodes/visual/SceneEnvironmentNode.ts:29-37). `.webp` is a supported texture (E:utils/TextureManager.ts:33).
- The same texture is used for **both** background and environment lighting (:273-284).
- **Trap 1:** it forces `colorSpace = LinearSRGBColorSpace` (:186-199), so an sRGB WebP looks washed out. Re-tag it to `SRGBColorSpace` after load, as LH:Core/Atmosphere.ts:139-148 does.
- **Trap 2:** the first visible environment source wins (E:render/GenesysScene.ts:83-100). The scene's SkyNode registers first, so **destroy all SkyNodes** first (LH:Core/Atmosphere.ts:36).
- Source skies: `C:\Users\chris\Skybox\library\web\<id>.webp` (2048×1024), copied into `assets/`.
- **UNVERIFIED:** how a real WebP renders.

```ts
// [tsc]
export function sunnySetup(world: ENGINE.World, skyUrl?: string): ENGINE.FogNode {
  const sun = world.getNodes(ENGINE.DirectionalLightNode)[0];          // the scene's light
  if (sun) { sun.intensity = 6; sun.color = new THREE.Color(0xfff2d6); sun.position.set(30, 60, 20); sun.lookAt(0, 0, 0); }
  world.add(ENGINE.HemisphereLightNode.create({ color: 0xbfe3ff, groundColor: 0x6b8f3a, intensity: 1.2 }));
  world.add(ENGINE.AmbientLightNode.create({ color: 0xffffff, intensity: 0.3 }));
  const fog = ENGINE.FogNode.create({ fogMode: ENGINE.FogMode.Linear, fogColor: new THREE.Color(0xcfe8ff), fogNear: 40, fogFar: 180 });
  world.add(fog);
  if (skyUrl) {                                                         // e.g. '@project/assets/sky/day.webp'
    for (const sky of world.getNodes(ENGINE.SkyNode)) sky.destroy();     // else the SkyNode keeps winning
    const env = ENGINE.SceneEnvironmentNode.create({ textureUrl: skyUrl, backgroundIntensity: 1, backgroundBlurriness: 0, envMapIntensity: 0.6 });
    world.add(env);
    const fix = (): void => { const t = env.getTexture();
      if (t) { t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; } else requestAnimationFrame(fix); };
    fix();
  }
  return fog;
}
```

---

## 9. World and time helpers

**Tweens.**
- `world.tweenManager` provides `createTween(obj)`, `removeTween`, `stopTween`, `getCurrentTime()` in ms (E:systems/TweenManager.ts:23-70; World.ts:137,201).
- It is not exported as `ENGINE.TweenManager`. The library is `@tweenjs/tween.js` 25.0.0.
- **`.onComplete` leak.** `createTween` puts its auto-remove in `onComplete`/`onStop` (TweenManager.ts:27-33). tween.js keeps **one** callback per slot (`tween.esm.js:701-702`), so your `.onComplete(fn)` replaces it and the tween is never removed.
  Fix: call `tm.removeTween(t)` inside your callback. The engine's own `TweenMovementNode.ts:202` leaks the same way.
- **Clock trap.** The manager updates with game-time ms, starting at 0 (TweenManager.ts:14,59-65). A bare `.start()` uses `performance.now()` (`tween.esm.js:471-472`), so the tween stalls until game time catches up (`:733`).
  Always use `.start(tm.getCurrentTime())`, as the engine does (E:nodes/movement/TweenMovementNode.ts:212).
- `.chain()`ed tweens must also be created with `createTween`.

**Timers.**
- `world.timerSystem.setTimeout(cb, seconds, tag?)` returns an id, and `setInterval`. Cancel with **`clearTimer(id)`** (there is no `clearTimeout`) or `clearTimersByTag` (E:systems/TimerSystem.ts:68,88,107,119).

**Other world helpers.**
- `world.runInNextTick(fn)` (World.ts:842).
- `world.getGameTime()` (:1020).
- `deltaTime` is in seconds × `slomo`. Nothing ticks while paused or at dt≤0 (:862-876).

**GameMode hooks** (E:game/GameMode.ts):
- Lifecycle: `initialize` (104), `onBeforeBeginPlay` (115), `onAfterEndPlay` (123), `beginPlay`/`endPlay` (from SceneNode), `tickPrePhysics` (127), `tickPostPhysics` (SceneNode).
- Player and spawn: `onPlayerJoined` (486), `handleNewPlayer` (523), `restartPlayer` (537), `findPlayerStart` (628), `spawnPlayerPawnWithTransform` (725), `waitForLocalPlayerController()` (226).
- There is no `tick()` and no `onPawnSpawned`.
- LH pattern: `beginPlay → director.begin(world)`, `tickPrePhysics → director.tick(dt)`, `endPlay → director.end()` (LH:Core/HayrideGameMode.ts:21-40).

**Ticking.**
- `canEverTick` defaults to true and is read **once** at `beginPlay` (E:nodes/SceneNode.ts:276,567). `setTickEnabled` only works if it was true (:499-507).
- Prefer one director ticking a list.

**Camera.**
- `world.getActiveCamera()` (§1). For a cutscene, use `world.pushViewTargetCamera(cam)` / `removeViewTargetCamera(cam)` (World.ts:1074-1100), or `ENGINE.ViewTargetCameraNode.create({ fov, near, far, startActive: true })` (LH:Core/RideDirector.ts:197-198).

```ts
// [tsc]
export function bounce(world: ENGINE.World, node: ENGINE.SceneNode): void {
  const tm = world.tweenManager;
  const t = tm.createTween(node.position).to({ y: node.position.y + 1 }, 300);
  t.onComplete(() => { tm.removeTween(t); });     // you replaced the manager's auto-remove
  t.start(tm.getCurrentTime());                    // manager clock, NOT performance.now()
  const id = world.timerSystem.setTimeout(() => node.destroy(), 2);
  void id;                                         // world.timerSystem.clearTimer(id) to cancel
}
```

---

## 10. NPC walking

**What exists.**
- `ENGINE.AIController` provides `moveToPosition`, `moveToTarget`, `followPath`, `stopMovement` and `setLookAtTarget` (E:entities/AIController.ts:221-262).
- It needs a pawn with a **MoverNode**; otherwise it warns and does nothing (:195-200). So it needs `MoverCharacterPawn`, not the template `CharacterPawn`.
- Without a navmesh it walks a straight line (:553-562).
- Also available: `NpcMovementNode extends CharacterMovementNode` (E:nodes/movement/NpcMovementNode.ts:38) and behavior-tree actions in `npc/behavior-tree` (MoveTo, Follow, Flee, Wander, Wait, …).

**Navmesh without the editor.**
- `await world.createNavigationMeshFromScene()` (World.ts:721) works, but only bakes **Static-physics** MeshNodes and ModelMeshNodes (:741,759).
- It throws if no navigation server exists (:722-724).
- Startup generation is off by default (GameLoop.ts:646-648,728-733).
- Query with `navigationServer.calculatePath(a,b)` (E:navigation/NavigationServer.ts:125-128).
- Runtime cost and quality are **UNVERIFIED**.

**Verdict: kinematic position-lerp is the pragmatic choice.** Use visual-only NPC groups (`physicsOptions:{enabled:false}`) driven from one director tick. Both shipped reference games do this (LH:Core/Creatures.ts:218-250; OG:Core/RunDirector.ts:602-618). Detect "bumped the player" with a distance check or a `Trigger` sensor (§4).

```ts
// [tsc] tick from your GameMode/director; root = §3 NPC group (feet pivot, no collider)
export class Walker {
  private readonly to = new THREE.Vector3();
  constructor(public readonly root: ENGINE.SceneNode, private readonly speed = 1.4) {}
  goTo(p: THREE.Vector3): void { this.to.copy(p); }
  tick(dt: number): boolean {                    // true when arrived
    const pos = this.root.position;
    const dx = this.to.x - pos.x, dz = this.to.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const step = Math.min(d, this.speed * dt);
    pos.x += (dx / d) * step; pos.z += (dz / d) * step;
    this.root.rotation.y = Math.atan2(-dx, -dz);  // local −Z (engine forward) points along travel
    return false;
  }
}
```

---

### Stale engine-14/16 notes to ignore
- `ENGINE_NOTES.md` "parent.add may silently not register". In 18, `Object3D.add` begins play itself (§3).
- "destroy only unparents". In 18 it also disposes (§3).
- The Mover/`WalkingMode` advice does not apply to the template `CharacterPawn` (§1).
- "applyImpulseToPhysicsBody for nodes" is not usable, because no node maps to a handle (§4).

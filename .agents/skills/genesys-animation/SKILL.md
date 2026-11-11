---
name: genesys-animation
description: "Skeletal animation: AnimationStateMachineNode, animconfigs, locomotion parameters, blends, one masked layer, one-shots, event markers, skeleton profiles and retargeting. Use when a character or enemy should play clips, when a mesh stays in its bind pose, or when clips were authored on another humanoid (Mixamo, Manny, VRoid, Rigodotify). Not for binding a mesh onto the mannequin armature in Blender (use `genesys-blender-modeling`) or procedural motion on an unrigged body (use `genesys-creatures`)."
metadata:
  tokens: 1922
---

# Animation

This skill owns skeletal playback. One character has one `AnimationStateMachineNode`. It plays clips on that character's `ModelMeshNode`. Gameplay sets parameters; the node crossfades states, an optional masked layer, and one-shots. Do not add a `THREE.AnimationMixer`, and do not retarget clips in game code when the animconfig can name both skeleton profiles.

Read `AnimationStateMachineNode` in the API digest, then `.engine/src/nodes/visual/AnimationStateMachineNode.ts` at the line ranges you call (`genesys-engine` → Find an engine class). Config shape: [state-machine](references/state-machine.md). Profiles and when a clip is retargeted: [retargeting](references/retargeting.md).

## Use another skill when

- Binding a mesh onto the mannequin armature in Blender, weights, pose check → `genesys-blender-modeling`
- A generated or downloaded mesh with no skeleton worth keeping → `genesys-generated-assets`
- Putting the GLB on the pawn → `genesys-assets`
- Avatar looks, packs, and `bindAnimationToComposedHost` → `genesys-engine` ([avatars](../genesys-engine/references/avatars.md))
- Procedural bob, hit and death on a body with no clips → `genesys-creatures`
- Freezing the pose for hitstop → `genesys-game-feel`
- The Animation, VFX and Skeleton editors are UI only → `genesys-editor-manual`

## What it can do

| Job | How |
|---|---|
| Locomotion on the stock mannequin | Inherit `setupAnimationNode`. The config is `@engine/assets/character/config/mannequin-default.animconfig.json`, and its clips come from `@engine/assets/character/mannequin.glb`. With no `targetSkeletonProfile`, external clips are used as they are, so tracks bind by bone name. |
| The same states on a Mixamo mesh | Override `setupAnimationNode` and set `configUrl` to `@engine/assets/character/config/mannequin.animconfig.json`. That config's clips come from `@engine/assets/character/mannequinG.glb`. It also has no profile: the bones must already be `mixamorig…`. The engine does not look at the skeleton and swap configs. |
| Directional move | A state's `blend` entries, each with a `weight` or a `weightParam`. The stock `run` state blends `Run`, `RunBackward`, `StrafeLeft` and `StrafeRight`. |
| Crossfade | `blendDuration` on the transition, in seconds. |
| Upper body over the walk | One `layer`, and it must name a mask. Bone names, or `BoneRole` values when a target profile is set. |
| Attack, emote, death | List the clip in `oneShotClips`, then `playOneShot`. The state graph does not transition while a one-shot plays. |
| Footsteps and hit frames | `events` on a clip, time from 0 to 1. A marker at `time` 0 never fires. Listen on `onAnimationEvent`. |
| A clip the config does not name | `registerClips`, then `blendTo`. A clip with no action warns, and every current action still fades out. |
| Clips authored on another humanoid | A `.skeleton-profile.json` for the mesh and one for the clip file. Both must be set or nothing is retargeted. |
| No skeleton | `setupAnimationNode` returns `null`. |

## Decide

Read the bone names on the loaded skeleton before choosing. A mesh standing in its bind pose is almost always the wrong config for those names, not a missing mixer.

1. **Bones match the clip file** (the stock mannequin, or a mesh skinned onto that armature) → inherit the animation node and swap only the visual. Building that mesh is `genesys-blender-modeling`.
2. **Bones are Mixamo** (`mixamorigHips`, or the mesh is `@engine/assets/character/mannequinG.glb`) → pin `mannequin.animconfig.json`. Do not leave the default config inherited.
3. **Bones are another humanoid** (Manny `Hips`, VRoid `J_Bip_C_Hips`, Rigodotify, or a rig you can profile) → set `targetSkeletonProfile` on the animconfig and `skeletonProfile` on the external source. Shipped profiles and the rules: [retargeting](references/retargeting.md).
4. **No skin** → return `null` from `setupAnimationNode`. Motion is on the visual child (`genesys-creatures`).

The stock mannequin has no profile file of its own. Every joint in `mannequin.glb` is a `boneToRole` key in the Rigodotify profile, which only adds `Jaw`, `eye_l` and `eye_r`. Playing its own clips leaves `targetSkeletonProfile` unset. Playing another humanoid's clips on that mesh sets `targetSkeletonProfile` to `@engine/assets/animation-profiles/rigodotify.skeleton-profile.json`.

## Parameters

`CharacterPawn` creates the node in `setupAnimationNode`, adds it, and once `isReady()` calls `setParameter` every pre-physics tick with `getAnimationParameters()`. Stock pawns use the driver `character-locomotion@1`.

| Parameter | Value |
|---|---|
| `isRunning` | planar speed above `runSpeedThreshold`, which defaults to 2 |
| `isJumping` | not grounded |
| `forward`, `back`, `left`, `right` | planar velocity split into axes that stay ≥ 0. Under 0.01 m/s, `forward` and `back` become 0. `left` and `right` stay at `Math.max(0, ±right)`. |

A subclass that overrides `getAnimationParameters()` replaces the driver. A slow walker that stays in `idle` needs a lower `runSpeedThreshold`. `setParameter` before `isReady()` is warned and dropped. A name the config did not declare is an error and is skipped once playback is initialized. A headless world stores every name.

Transitions run on the next tick, at most one per graph (the base graph and the layer). The mixer advances in `tickPostPhysics`. `setTickEnabled(false)` on the animation node holds the pose.

On a headless world the node stores parameters and never builds a mixer. `playOneShot` resolves immediately when the world is headless.

## Traps

- Bind pose while moving, and the mesh was skinned to the mannequin → the bone names differ from the clip, or the export has no skin. Fix the rig (`genesys-blender-modeling`). Do not add a mixer.
- Bind pose, Mixamo mesh, default config inherited → the default clips address the mannequin bones. Pin `mannequin.animconfig.json`.
- `playOneShot` before the mixer exists, and on a headless world, resolves and does not throw. After the controller exists, it throws when the clip is missing from `oneShotClips` or has no action.
- The upper body never plays → the layer does not name a mask in `masks`, a role mask has no `targetSkeletonProfile`, or the layer `weight` is 0. An omitted layer `weight` is 0, so a valid mask still shows nothing until `setGraphWeight('layer', weight)`. An omitted `enabled` is true. A layer that does not name a mask in `masks` is not created. A role mask with no `targetSkeletonProfile` is skipped.
- Two characters share a clip name and one plays the other's bones → clips were cached by bare name. The node loads its own sources. Hand a clip to the node that plays it with `registerClips`.
- Several meshes under the pawn → it binds the first `ModelMeshNode` under the entity root, or under the parent when the root has none. An avatar binds the host mesh explicitly (`bindModelMesh`).

## Done

- The report names which of the four paths was used, and the `configUrl`.
- In Play, a rigged character is not stuck in its bind pose while it moves.
- No `THREE.AnimationMixer` in game code, and no call to `retargetAnimationClips` for a clip the animconfig already loads.

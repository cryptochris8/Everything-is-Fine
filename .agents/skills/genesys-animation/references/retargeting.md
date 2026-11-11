# Skeleton profiles and retargeting

A clip plays on a skeleton when its track names match that skeleton's bone names. Retargeting rewrites a clip from one humanoid onto another by mapping both through `BoneRole`. It is how a Mixamo clip plays on a Manny or VRoid mesh. It is not how the stock mannequin plays its own clips: those configs leave the profile unset, and the bones already match.

Source: `.engine/src/animation/SkeletonProfile.ts`; `.engine/src/animation/AnimationTypes.ts` (`ExternalAnimationSource`, `targetSkeletonProfile`); `.engine/src/animation/ExternalAnimationLoader.ts`; `.engine/src/animation/AnimationRetargeting.ts` (`retargetAnimationClips`); `.engine/src/animation/retargeting.ts`

## When a load retargets

The state machine loads each `externalAnimationSources` entry while it binds the mesh.

| Config | What happens |
|---|---|
| No `targetSkeletonProfile` | With no `targetSkeletonProfile`, external clips are used as they are |
| Target profile set, source is a URL string | A source written as a URL string is not retargeted. The node warns, and the tracks stay on the source bone names |
| Both profiles set, and `name` differs | Retargeting runs only when the config sets `targetSkeletonProfile` and that source sets `skeletonProfile`. Bones that share a role are mapped. A bone with no shared role is dropped |
| Both profiles set, and `name` matches | The same profile name skips retargeting when the bind poses match, and retargets when they do not. Bone lengths and rest pose are part of that comparison, so a tall and a short character that share a profile name each get their own clips |
| Target profile set, but the mesh has no skinned mesh | Nothing from the external sources is loaded |

A source GLB that has a skin and clips but no mesh still retargets. The loader builds the source skeleton from that skin's joints and inverse bind matrices. A source that already has a skinned mesh uses that mesh's skeleton.

Profiles are JSON loaded by URL (`@project/...` or `@engine/...`). A profile `name` is the cache identity (`"Mixamo"`, `"Manny"`), not a substitute for the URL. The config stores the URL.

A failed source is logged and skipped. The promise still resolves, so a character can come up with only some of its clips.

## What a retargeted clip keeps

`retargetAnimationClips` maps rotation tracks through the shared roles. A retargeted clip keeps position tracks only for the root bone and the hips. When the source profile has no `Root` and the target's first bone maps to `Root`, the hips position track is removed. Mixamo clips on the mannequin take that path. Scale tracks are removed from a retargeted clip. Root motion on a source that has a root bone is not copied onto a target that has none.

Both skeletons need the same bind orientation for the mapped bones, or the rotations come out wrong. Set `forceTPose: true` on a profile to pose that skeleton into a T-pose before the mapping. The flag applies only to the profile that sets it.

Three.js strips `:` from glTF node names, so a bone stored as `mixamorig:Hips` is `mixamorigHips` at runtime. Write `boneToRole` with the runtime name. The resolver also tries the colon form.

## Profile file

`assets/animation-profiles/<name>.skeleton-profile.json`, or one of the engine files below. `hipBoneName` is required. `boneToRole` maps a bone name to a `BoneRole`. When two bones share a role, the last one wins.

```json
{
  "name": "Mixamo",
  "description": "Mixamo auto-rigged characters",
  "hipBoneName": "mixamorigHips",
  "boneToRole": {
    "mixamorigHips": "Hips",
    "mixamorigSpine": "Spine",
    "mixamorigLeftArm": "LeftUpperArm",
    "mixamorigLeftForeArm": "LeftLowerArm",
    "mixamorigLeftHand": "LeftHand"
  }
}
```

A real profile covers every bone the clips need to move: hips, spine, chest, neck, head, both arms, both legs, and fingers when the clip has them. The full role list is the `BoneRole` enum.

## Shipped profiles

| `name` | URL | Hips bone |
|---|---|---|
| Mixamo | `@engine/assets/animation-profiles/mixamo.skeleton-profile.json` | `mixamorigHips` |
| Manny | `@engine/assets/animation-profiles/manny.skeleton-profile.json` | `Hips` |
| Rigodotify | `@engine/assets/animation-profiles/rigodotify.skeleton-profile.json` | `pelvis` |
| VRoid | `@engine/assets/animation-profiles/vroid.skeleton-profile.json` | `J_Bip_C_Hips` |

Every joint in `mannequin.glb` is a `boneToRole` key in the Rigodotify profile, which only adds `Jaw`, `eye_l` and `eye_r`. That profile is the `targetSkeletonProfile` when those bones play another humanoid's clips. Its own clips leave the profile unset.

Point `targetSkeletonProfile` at the profile whose `boneToRole` keys are the mesh's bone names, and the source's `skeletonProfile` at the profile for the GLB the clips were authored on.

```json
{
  "externalAnimationSources": [{
    "url": "@engine/assets/character/mannequinG.glb",
    "skeletonProfile": "@engine/assets/animation-profiles/mixamo.skeleton-profile.json"
  }],
  "targetSkeletonProfile": "@engine/assets/animation-profiles/vroid.skeleton-profile.json"
}
```

That plays the Mixamo clips on a VRoid mesh. The same shape with `manny.skeleton-profile.json` as the target plays them on a Manny mesh. A mesh whose bones match none of the four files needs its own profile; do not rename its bones to fit Mixamo and also set a profile.

## Calling the retargeter yourself

Prefer the animconfig. The state machine caches the result per target profile, per rig and per source URL, so the next character on that rig does not retarget again.

`ENGINE.retargetAnimationClips` is the call when you already hold the clips, both profiles, both skeletons and the target `SkinnedMesh`. It returns one result per clip, with `success` false and no clip when no bone matched. Do not use it to feed a mixer you created. Register the clips on the character's `AnimationStateMachineNode`, or put them where that node's config loads them.

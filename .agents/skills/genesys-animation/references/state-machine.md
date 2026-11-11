# The animation state machine

`AnimationStateMachineNode` loads an `.animconfig.json` (`AnimationConfigResource`) and plays it on one `ModelMeshNode`. Each instance has its own mixer. `ModelMeshNode` clones the loaded scene per instance, so two enemies that share a GLB do not animate in lockstep.

Source: `.engine/src/nodes/visual/AnimationStateMachineNode.ts` (`beginPlay`, `setParameter`, `tickPostPhysics`, `playOneShot`, `bindModelMesh`); `.engine/src/animation/AnimationTypes.ts`; `.engine/src/entities/CharacterPawn.ts` (`setupAnimationNode`, `tickPrePhysics`)

## Config

A project file is `assets/animations/<name>.animconfig.json`. Copy the stock config and change states rather than inventing a second format. The stock states are `idle`, `run` and `jump`. `run` is a blend. Parameters are `isRunning`, `isJumping`, `forward`, `back`, `left` and `right`.

```json
{
  "$root": {
    "$bc": "ENGINE.AnimationConfigResource",
    "externalAnimationSources": ["@engine/assets/character/mannequin.glb"],
    "initialState": "idle",
    "parameters": { "isRunning": false, "isJumping": false, "forward": 0, "back": 0, "left": 0, "right": 0 },
    "clipOptions": { "Idle": { "loop": "LoopRepeat" }, "Jump": { "loop": "LoopOnce", "clampWhenFinished": true } },
    "oneShotClips": ["Jump"],
    "states": {
      "idle": { "clip": "Idle", "transitions": [{ "to": "run", "blendDuration": 0.2, "condition": { "isRunning": true } }] },
      "run": {
        "blend": [
          { "clip": "Run", "weightParam": "forward" },
          { "clip": "RunBackward", "weightParam": "back" }
        ],
        "transitions": [{ "to": "idle", "blendDuration": 0.2, "condition": { "isRunning": false } }]
      }
    }
  },
  "$version": 2
}
```

| Field | Role |
|---|---|
| `initialState` | State entered when the config loads |
| `parameters` | Names `setParameter` accepts, and their starting values |
| `states` | Each state plays `clip` (one name or a list) or a `blend` |
| `states.__any__` | Transitions that apply from every state and are checked before the current state's own |
| `clipOptions` | `loop` is `LoopOnce`, `LoopRepeat` or `LoopPingPong`. `clampWhenFinished` holds the last frame. `blendMode` is `NormalAnimationBlendMode` or `AdditiveAnimationBlendMode` |
| `oneShotClips` | Names `playOneShot` accepts. `playOneShot` throws when the clip is not listed in `oneShotClips` |
| `events` | Per clip, markers `{ "name", "time", "tag" }`. `time` is clamped to 0-1, and a marker at `time` 0 never fires. `onAnimationEvent` fires when playback crosses one |
| `masks` / `layer` | The single upper layer. See below |
| `externalAnimationSources` | GLB URLs, or `{ "url", "skeletonProfile" }` when retargeting |
| `targetSkeletonProfile` | Profile URL for the mesh. Omit it to bind by bone name |

A condition is a map that must all match. A bare value means equal. Numbers and strings also take `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `equalTo` and `notEqualTo`. `clipFinished: true` is the current state's clip reaching the end.

`blendDuration` on the transition is the crossfade. When it is omitted, the source state's first transition to that destination supplies it, then the `__any__` transition, then the graph default.

## Which clip a name picks

When one name exists in more than one place, the first match wins:

1. A `bindModelMesh` clip source for that name. A `bindModelMesh` clip source wins over the config's own sources for that clip name. Its `clipName` is the name inside the GLB, which may differ from the config's name.
2. `externalAnimationSources`, in the order they are written. When several external sources carry one clip name, the first source declared wins.
3. A clip passed to `registerClips`. A clip passed to `registerClips` wins over the model's clip of the same name. Registered clips survive a rebind.
4. A clip embedded in the bound model.
5. A clip someone added to `AnimationClipCache` by bare name, and only if the config names it. That path warns. Do not use it. `registerClips` is the call.

## Layer

There is one layer, beside the base graph. It needs `id`, `states`, `initialState`, and `mask` naming an entry in `masks`. A layer that does not name a mask in `masks` is not created.

The mask's `include` list is bone names (`selectorType: "bone"`, the default) or role names (`selectorType: "role"`). A role mask with no `targetSkeletonProfile` is skipped. Roles are the `BoneRole` enum in `.engine/src/animation/SkeletonProfile.ts` (`Hips`, `Spine`, `LeftUpperArm`, …). The layer's `selectorType` and `include` override the mask's when both are set.

`mode` is `override` (the upper body replaces the base pose on those bones) or `additive`. An omitted layer `weight` is 0, so a valid mask still shows nothing until `setGraphWeight('layer', weight)`. An omitted `enabled` is true. `setGraphEnabled('layer', true)` turns the layer on later.

## One-shots and direct playback

```ts
const animation = this.getNode(ENGINE.AnimationStateMachineNode);
await animation?.playOneShot('Attack');
```

`playOneShot(clip, true)` freezes on the last frame and sets the node `enabled` to false. Set `enabled` back to true to resume the graph. A second `playOneShot` interrupts the first; the interrupted promise still resolves.

`blendTo(clip, duration)` crossfades the base actions to one clip and ignores the graph until the next transition. A clip with no action warns, and every current action still fades out. Use it for a clip `registerClips` just handed over, not for locomotion the config already blends.

An enemy that should walk while it attacks keeps the legs on the base graph and plays the attack on the layer. `playOneShot` suppresses the layer until it finishes, so it is the wrong call for that.

## Wiring

The player pawn swaps the mesh and keeps the inherited node. An enemy with its own config overrides both.

```ts
protected override setupAnimationNode(): ENGINE.AnimationStateMachineNode | null {
  const node = ENGINE.AnimationStateMachineNode.create({
    name: 'AnimationNode',
    configUrl: '@project/assets/animations/walker.animconfig.json',
  });
  this.add(node);
  return node;
}
```

`setupAnimationNode` must `add` the node. Returning it without `this.add` throws `Animation node not attached to pawn`.

Avatar composition finishes after `beginPlay`, so the node finds no mesh and stays idle until `bindModelMesh(host, { configUrl, clipSources })`. Passing `null` tears the bind down. Details of looks and drivers stay in `genesys-engine` avatars.

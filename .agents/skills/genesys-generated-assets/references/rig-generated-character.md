# Rig a generated character to the mannequin rig

A Scenario (or downloaded) character arrives as one dense, unrigged mesh, or with a rig of its own. The engine's clips (`Idle`, `Walk`, `Run`, `RunBackward`, `StrafeLeft`, `StrafeRight`, `Jump`) bind by bone name to the mannequin's skeleton (`pelvis`, `spine_01`, `upperarm_l`, …), so a foreign rig never plays them. Put the mesh on the mannequin rig in a Blender folder instead. Keeping that foreign skeleton and retargeting the clips onto it is `genesys-animation`.

Generate it for this: **T-pose, arms straight out to the sides, feet apart, facing the camera, no loose cloth below the knees.** An A-pose mesh binds its arms to the wrong bones.

## The folder

```
blender/hero/
  01-rig.py       mannequin_rig()
  02-body.py      import, fit, bind, skin, pose check
  asset.json      { "role": "hero", "export": "assets/models/characters/SKM_Hero.glb", "rig": "mannequin",
                    "expect": { "size": [0, 1.83, 0], "bottom": 0, "tolerance": 0.1 } }
```

Source: .agents/skills/genesys-blender-modeling/scripts/grig.py (`mannequin_rig`, `rig_height`, `apply_all`, `joint`, `region`, `bind_nearest`, `skin`, `pose_check`), gkit.py (`import_glb`, `join`, `decimate`, `clamp_metal`)
```python
# blender/hero/02-body.py — a generated T-pose mesh → the engine rig (01-rig.py ran mannequin_rig()).
holder = import_glb('art-source/hero_raw.glb')
parts = [o for o in holder.children_recursive if o.type == 'MESH']
for o in holder.children_recursive:               # drop any rig the mesh came with
    if o.type == 'ARMATURE':
        bpy.data.objects.remove(o, do_unlink=True)
for o in parts:                                   # keep world placement, drop the import holder and old weights
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    o.vertex_groups.clear()
    for m in [m for m in o.modifiers if m.type == 'ARMATURE']:
        o.modifiers.remove(m)
bpy.data.objects.remove(holder, do_unlink=True)
body = decimate(apply_all(join('hero_body', parts)), 9000)   # under the hero budget
clamp_metal([body])
zs = [v.co.z for v in body.data.vertices]
s = rig_height() / (max(zs) - min(zs))            # default body height ≈ 1.83 m
pelvis = joint('pelvis')
for v in body.data.vertices:
    v.co.z -= min(zs)
    v.co *= s
cx = sum(v.co.x for v in body.data.vertices) / len(body.data.vertices)
cy = sum(v.co.y for v in body.data.vertices) / len(body.data.vertices)
for v in body.data.vertices:
    v.co.x += pelvis.x - cx
    v.co.y += pelvis.y - cy
body.data.update()
bones = sorted(set(region('torso') + region('neck') + ['Head']
                   + [b for side in ('Left', 'Right') for r in ('arm', 'leg', 'foot') for b in region(r, side)]))
bind_nearest(body, bones, k=2)
skin('SKM_Hero', [body])
pose_check('hero')
```

Run `blender.sh build blender/hero`, then open the sheet and every `.scratch/blender/hero-<clip>.png`.

## Checks

| Line | Bar |
|---|---|
| `PRINT decimate` | under the `hero` / `creature` triangle budget |
| `PRINT skin … unweighted 0` | every vertex follows a bone |
| `NUMBERS … h1.83 … bottom 0.0` | rig height, feet on the floor |
| `RIG mannequin: … 0 problems` | the engine clips will bind |
| Pose renders | arms swing with the arms, legs stride, nothing stretches to the origin |

This recipe was run on a T-posed stand-in mesh (the mannequin's own surface, with its rig and weights removed): it skinned with 0 unweighted vertices, passed the rig check, and walked cleanly in the pose renders. Verify the pose renders on each real generated mesh: wide sleeves, skirts and long hair can follow the wrong limb. Fix those parts by splitting them off before `join` and binding them on their own (`bind_rigid(part, 'Head')` for hair, `bind_nearest(part, region('pelvis'))` for a skirt), then pass all parts to `skin`.

Wire it on the pawn exactly like a Blender-built hero (`genesys-assets` → *Wire it*).

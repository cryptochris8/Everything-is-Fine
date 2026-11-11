# The mannequin's armature, untouched: same bone names, hierarchy, T-pose rest and root
# transform, so the engine's clips (Idle, Walk, Run, Jump, strafes) drive this model by bone name.
mannequin_rig()
for n in ('pelvis', 'spine_03', 'neck_01', 'Head', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_l', 'calf_l', 'foot_l', 'ball_l'):
    p = joint(n)
    print(f'PRINT joint {n:12s} ({p.x:.3f}, {p.y:.3f}, {p.z:.3f})')

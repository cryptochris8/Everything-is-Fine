# A skeleton built on the rig's rest-pose joints: every bony piece rides on exactly one bone
# (bind_rigid), which is the ideal case for bony, armoured or robotic creatures — no weight
# painting, no bleeding between limbs. Front faces -Y; the creature's left is +X.
seed(11)
B = shades('skel_bone', '#e6dcc3', n=2, spread=0.1, rough=0.7)
dark = mat('skel_socket', '#0a0a0c', rough=0.9)
rag = mat('skel_rag', '#3d2b22', rough=0.95)
glow = mat('skel_eye', '#6f8f5a', rough=0.4, emit='#6f8f5a', emit_strength=4.0)
PARTS = []
J = joint
T = lambda v: tuple(v)


def P(obj, bone_name):
    """Bind a piece rigidly to the rig bone it rides on."""
    PARTS.append(bind_rigid(obj, bone_name))
    return obj


def bone(name, p0, p1, r, m, r2=None, seg=8):
    """Tapered cylinder from p0 to p1 (Blender coords)."""
    a, b = Vector(p0), Vector(p1)
    d = b - a
    o = cyl(name, r, d.length, at=tuple((a + b) / 2), m=m, seg=seg, r2=r2, center=True)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.normalized().to_track_quat('Z', 'Y')
    return o


def knob(name, r, at, m, scale=(1, 1, 1)):
    return sphere(name, r, at=at, m=m, seg=8, rings=6, scale=scale)

# ---------------- pelvis + loincloth
o = cyl('b_pelvis', 0.15, 0.13, at=(0, 0, 0.88), m=B[1], seg=10, r2=0.17); o.scale = (1, 0.65, 1); P(o, 'pelvis')
P(box('b_sacrum', (0.09, 0.05, 0.12), at=(0, 0.07, 0.88), m=B[1], bevel=0.01), 'pelvis')
for s in (-1, 1):
    P(knob('b_hipball', 0.045, (0.091 * s, 0, 0.935), B[0]), 'pelvis')
    P(box('b_ilium', (0.09, 0.04, 0.1), at=(0.1 * s, 0.0, 0.94), m=B[0], bevel=0.015, rot=(0, -25 * s, 0)), 'pelvis')
o = cyl('b_belt', 0.16, 0.035, at=(0, 0, 0.885), m=rag, seg=10); o.scale = (1, 0.68, 1); P(o, 'pelvis')
def flap(y, w, h, lean):
    n = 6
    top = [(-w / 2 + w * i / n, 0, 0) for i in range(n + 1)]
    bot = [(-w * 0.4 + w * 0.8 * i / n, lean, -h + (0.05 if i % 2 else 0) + rnd(-0.015, 0.015)) for i in range(n + 1)]
    fs = [(i, i + 1, n + 2 + i, n + 1 + i) for i in range(n)]
    o = mesh('b_flap', top + bot, fs, at=(0, y, 0.92), m=rag)
    sol = o.modifiers.new('Sol', 'SOLIDIFY'); sol.thickness = 0.015
    return o
P(flap(-0.1, 0.15, 0.24, -0.03), 'pelvis')
P(flap(0.1, 0.17, 0.26, 0.03), 'pelvis')

# ---------------- lumbar spine: pelvis below the spine_01 joint, spine_01 above
z = 1.0
while z < 1.2:
    bn = 'pelvis' if z + 0.017 < J('spine_01').z else 'spine_01'
    P(cyl('b_vert', 0.035, 0.035, at=(0, 0.04, z), m=B[0], seg=8), bn)
    P(box('b_vproc', (0.02, 0.05, 0.025), at=(0, 0.08, z + 0.005), m=B[0]), bn)
    z += 0.045

# ---------------- ribcage: each ring to the spine bone whose segment holds it
for i, (zz, R) in enumerate([(1.22, 0.12), (1.265, 0.145), (1.31, 0.16), (1.355, 0.165), (1.40, 0.155), (1.445, 0.13)]):
    t = torus('b_rib', R, 0.016, at=(0, 0.01, zz), m=B[i % 2], seg=14, minor_seg=5, rot=(-12, 0, 0))
    t.scale = (1, 0.72, 1)
    P(t, 'spine_02' if zz < J('spine_03').z else 'spine_03')
P(box('b_tspine1', (0.04, 0.04, 0.14), at=(0, 0.11, 1.2), m=B[1], bevel=0.008), 'spine_02')
P(box('b_tspine2', (0.04, 0.04, 0.15), at=(0, 0.11, 1.34), m=B[1], bevel=0.008), 'spine_03')
P(box('b_sternum', (0.045, 0.03, 0.2), at=(0, -0.11, 1.25), m=B[0], bevel=0.01, rot=(-10, 0, 0)), 'spine_03')
for s, side in ((1, 'l'), (-1, 'r')):
    P(bone('b_clav', (0.03 * s, -0.06, 1.46), (0.17 * s, 0.04, 1.44), 0.018, B[0]), f'clavicle_{side}')
    P(box('b_scap', (0.1, 0.02, 0.12), at=(0.12 * s, 0.11, 1.32), m=B[1], bevel=0.01, rot=(10, 0, 0)), 'spine_03')

# ---------------- neck (neck_01) and skull (Head)
for zz in (1.49, 1.525):
    P(cyl('b_neck', 0.03, 0.028, at=(0, 0.02, zz), m=B[0], seg=8), 'neck_01')
H = []
H.append(sphere('h_cranium', 0.12, at=(0, 0.01, 1.685), m=B[0], seg=12, rings=8, scale=(0.92, 1.08, 1.0)))
H.append(box('h_cheek', (0.17, 0.12, 0.07), at=(0, -0.04, 1.585), m=B[0], bevel=0.02))
H.append(box('h_jaw', (0.15, 0.1, 0.04), at=(0, -0.05, 1.535), m=B[1], bevel=0.015, rot=(8, 0, 0)))
for s in (-1, 1):
    H.append(box('h_ramus', (0.025, 0.04, 0.07), at=(0.065 * s, 0.0, 1.535), m=B[1], bevel=0.008))
for i in range(6):
    x = -0.05 + i * 0.02
    H.append(box('h_tooth', (0.014, 0.012, 0.022), at=(x, -0.1, 1.567), m=B[0]))
    H.append(box('h_tooth', (0.014, 0.012, 0.018), at=(x, -0.098, 1.552), m=B[1]))
H.append(box('h_mouth', (0.13, 0.01, 0.018), at=(0, -0.093, 1.553), m=dark))
for s in (-1, 1):
    H.append(sphere('h_socket', 0.036, at=(0.045 * s, -0.093, 1.665), m=dark, seg=10, rings=6, scale=(1.1, 0.6, 1.0)))
    H.append(sphere('h_eye', 0.017, at=(0.045 * s, -0.11, 1.665), m=glow, seg=8, rings=6))
H.append(mesh('h_nose', [(-0.016, 0, 0), (0.016, 0, 0), (0, 0, 0.035), (-0.016, 0.02, 0), (0.016, 0.02, 0), (0, 0.02, 0.035)],
              [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)], at=(0, -0.122, 1.6), m=dark))
for h in H:
    P(h, 'Head')

# ---------------- arms, T-pose along ±X following the rig
for s, side in ((1, 'l'), (-1, 'r')):
    sh, el, wr = J(f'upperarm_{side}'), J(f'lowerarm_{side}'), J(f'hand_{side}')
    P(knob('a_sh', 0.04, T(sh), B[0]), f'upperarm_{side}')
    P(bone('a_hum', T(sh), T(el), 0.03, B[0], r2=0.025), f'upperarm_{side}')
    P(knob('a_el', 0.036, T(el), B[1]), f'lowerarm_{side}')
    P(bone('a_rad', T(el), T(wr), 0.02, B[1], r2=0.017), f'lowerarm_{side}')
    off = Vector((0, 0.015, -0.012))
    P(bone('a_uln', T(el + off + Vector((0.015 * s, 0, 0))), T(wr + off), 0.012, B[0]), f'lowerarm_{side}')
    # palm: flat, palm down, from the wrist to the knuckles
    k = J(f'middle_01_{side}')
    P(box('a_palm', (abs(k.x - wr.x) + 0.01, 0.075, 0.03), at=(((wr.x + k.x) / 2), wr.y + 0.01, wr.z - 0.015), m=B[0], bevel=0.008), f'hand_{side}')
    for f in ('index', 'middle', 'ring', 'pinky'):        # one rigid finger per finger chain
        a, b = J(f'{f}_01_{side}'), J(f'{f}_03_{side}')
        b = b + Vector((0.03 * s, 0, 0))
        P(bone('a_fing', T(a), T(b), 0.008, B[1], seg=6), f'{f}_01_{side}')
    a, b = J(f'thumb_01_{side}'), J(f'thumb_03_{side}')
    P(bone('a_thumb', T(a), T(b + (b - a) * 0.2), 0.009, B[1], seg=6), f'thumb_01_{side}')

# ---------------- legs
for s, side in ((1, 'l'), (-1, 'r')):
    hip, kn, an, toe = J(f'thigh_{side}'), J(f'calf_{side}'), J(f'foot_{side}'), J(f'ball_{side}')
    P(bone('l_fem', T(hip), T(kn), 0.038, B[0], r2=0.032), f'thigh_{side}')
    P(knob('l_knee', 0.042, T(kn), B[1], scale=(1, 1, 0.85)), f'thigh_{side}')
    P(box('l_cap', (0.05, 0.02, 0.05), at=(kn.x, kn.y - 0.04, kn.z - 0.02), m=B[0], bevel=0.01), f'calf_{side}')
    P(bone('l_tib', T(kn), T(an), 0.03, B[1], r2=0.025), f'calf_{side}')
    P(bone('l_fib', (kn.x + 0.025 * s, kn.y + 0.01, kn.z - 0.03), (an.x + 0.02 * s, an.y + 0.01, an.z + 0.02), 0.011, B[0]), f'calf_{side}')
    P(knob('l_ankle', 0.032, T(an), B[0]), f'foot_{side}')
    P(box('l_heel', (0.07, 0.08, 0.07), at=(an.x, an.y + 0.01, 0.0), m=B[0], bevel=0.015), f'foot_{side}')
    fy0, fy1 = an.y - 0.02, toe.y + 0.005               # foot box from the ankle to the toe joint
    P(box('l_foot', (0.085, fy0 - fy1, 0.04), at=(toe.x, (fy0 + fy1) / 2, 0.0), m=B[1], bevel=0.012), f'foot_{side}')
    for i in range(4):
        x = toe.x - 0.03 + i * 0.02
        P(box('l_toe', (0.015, 0.075, 0.02), at=(x, toe.y - 0.045, 0.0), m=B[0], bevel=0.005), f'ball_{side}')
print(f'PRINT pieces {len(PARTS)}')

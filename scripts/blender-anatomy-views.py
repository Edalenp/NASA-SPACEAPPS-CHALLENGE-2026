"""
Render the orthographic silhouette masks that scripts/trace-anatomy.py turns into plate outlines.

Run inside Blender 4.x/5.x (Scripting tab or MCP) after exporting the skin mesh:
  1. Open /scripts/anatomy-views/index.html?obj=1 on the dev server and save the <pre> text as skin.obj.
  2. Set OUT and OBJ below, run this file in Blender.
  3. python -I scripts/trace-anatomy.py <OUT> src/features/guides/art/anatomy-paths.ts

The skin is the Open Anatomy model (CC BY 4.0, see public/models/ATTRIBUTION.md).
Coordinates below are the app's (three.js: x right, y up, z forward), in metres.
"""
import json
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

OUT = os.environ.get("VT_ANATOMY_OUT", "anatomy-views")
OBJ = os.environ.get("VT_SKIN_OBJ", "skin.obj")
K = 4  # render pixels per plate unit

os.makedirs(OUT, exist_ok=True)
if "skin" not in bpy.data.objects:
    bpy.ops.wm.obj_import(filepath=OBJ, forward_axis="NEGATIVE_Z", up_axis="Y")
skin = bpy.data.objects["skin"]


def copy_keep(name, keep):
    if name in bpy.data.objects:
        return bpy.data.objects[name]
    o = skin.copy()
    o.data = skin.data.copy()
    o.name = name
    bpy.context.collection.objects.link(o)
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co)], context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    return o


# Local mesh coordinates keep the app's axes (y is height).
copy_keep("arm_l", lambda c: c.x > 0.2)
copy_keep("arm_r", lambda c: c.x < -0.2)


def examiner_hand():
    """Right hand posed for a radial pulse, the way open-anatomy-3d poses its hands: an armature
    on the measured finger centerlines, linear-blend weights with soft joints, a Corrective Smooth
    modifier, then flexion. Index and middle stay extended together; ring and little curl; thumb tucks."""
    import math
    from mathutils import Quaternion

    if "HAND-examiner" in bpy.data.objects:
        return
    src = bpy.data.objects["arm_r"]
    hand = src.copy()
    hand.data = src.data.copy()
    hand.name = "HAND-examiner"
    bpy.context.collection.objects.link(hand)
    verts = hand.data.vertices

    def centerline(x):
        pts, cx, y = [], x, 0.800
        while y > 0.68:
            sl = [v.co for v in verts if y - 0.003 < v.co.y <= y + 0.003 and abs(v.co.x - cx) < 0.010]
            if len(sl) < 4:
                break
            p = Vector((sum(c.x for c in sl) / len(sl), y, sum(c.z for c in sl) / len(sl)))
            pts.append(p)
            cx, y = p.x, y - 0.006
        pts.append(pts[-1] + (pts[-1] - pts[-2]).normalized() * 0.008)
        return pts

    lines = {n: centerline(x) for n, x in {"index": -0.296, "middle": -0.270, "ring": -0.248, "little": -0.226}.items()}
    lines["thumb"] = [Vector((-0.300, 0.840, 0.045)), Vector((-0.318, 0.818, 0.064)), Vector((-0.334, 0.798, 0.080))]

    def arc(pts):
        acc = [0.0]
        for a, b in zip(pts, pts[1:]):
            acc.append(acc[-1] + (b - a).length)
        return acc

    def point_at(pts, acc, s):
        for i in range(len(acc) - 1):
            if acc[i + 1] >= s:
                return pts[i].lerp(pts[i + 1], (s - acc[i]) / max(1e-9, acc[i + 1] - acc[i]))
        return pts[-1].copy()

    arm_data = bpy.data.armatures.new("ARM-examiner")
    arm = bpy.data.objects.new("ARM-examiner", arm_data)
    bpy.context.collection.objects.link(arm)
    arm.matrix_world = hand.matrix_world.copy()
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    root = arm_data.edit_bones.new("hand")
    root.head, root.tail = Vector((-0.27, 0.86, 0.04)), Vector((-0.27, 0.815, 0.045))
    chains = {}
    for name, pts in lines.items():
        acc = arc(pts)
        cuts = [0, 0.5 * acc[-1], acc[-1]] if name == "thumb" else [0, 0.45 * acc[-1], 0.75 * acc[-1], acc[-1]]
        parent, names = root, []
        for i in range(len(cuts) - 1):
            b = arm_data.edit_bones.new(f"{name}.{i + 1}")
            b.head, b.tail = point_at(pts, acc, cuts[i]), point_at(pts, acc, cuts[i + 1])
            b.parent, b.use_connect = parent, i > 0
            b.align_roll(Vector((0, 0, 1)))
            parent = b
            names.append(b.name)
        chains[name] = (pts, acc, cuts[:-1], names)
    bpy.ops.object.mode_set(mode="OBJECT")

    def project(pts, acc, p):
        best = (1e9, 0.0)
        for i, (a, b) in enumerate(zip(pts, pts[1:])):
            ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
            d = (a + ab * t - p).length
            if d < best[0]:
                best = (d, acc[i] + t * ab.length)
        s0 = (p - pts[0]).dot((pts[1] - pts[0]).normalized())
        return best[0], (s0 if s0 < 0 else best[1])

    smooth = lambda t: 0.0 if t <= 0 else 1.0 if t >= 1 else t * t * (3 - 2 * t)
    groups = {b.name: hand.vertex_groups.new(name=b.name) for b in arm_data.bones}
    for v in verts:
        cand = sorted((d, n, s) for n, (pts, acc, _, _) in chains.items() for d, s in [project(pts, acc, v.co)] if d < 0.016 and s > -0.010)[:2]
        if not cand or v.co.y > 0.85:
            groups["hand"].add([v.index], 1.0, "REPLACE")
            continue
        inv = [1.0 / max(d, 1e-4) ** 4 for d, _, _ in cand]
        total, weights = sum(inv), {}
        for (d, n, s), wi in zip(cand, inv):
            _, _, cuts, names = chains[n]
            w = {"hand": 1.0}
            for j, c in enumerate(cuts):
                blend = 0.010 if j == 0 else 0.004
                k = smooth((s - c + blend) / (2 * blend))
                w = {key: x * (1 - k) for key, x in w.items()}
                w[names[j]] = w.get(names[j], 0) + k
            for key, x in w.items():
                weights[key] = weights.get(key, 0) + x * wi / total
        for key, x in weights.items():
            if x > 1e-4:
                groups[key].add([v.index], x, "REPLACE")

    hand.modifiers.new("Armature", "ARMATURE").object = arm
    cs = hand.modifiers.new("CorrectiveSmooth", "CORRECTIVE_SMOOTH")
    cs.iterations, cs.smooth_type, cs.rest_source = 8, "LENGTH_WEIGHTED", "ORCO"
    X, Z = (1, 0, 0), (0, 0, 1)
    pose = {"ring.1": [(X, 70)], "ring.2": [(X, 95)], "ring.3": [(X, 55)],
            "little.1": [(X, 75)], "little.2": [(X, 95)], "little.3": [(X, 55)],
            "index.1": [(Z, 10)], "thumb.1": [(Z, 30), (X, 10)], "thumb.2": [(X, 20)]}
    for bone, rots in pose.items():
        q = Quaternion((1, 0, 0, 0))
        for axis, deg in rots:
            q = q @ Quaternion(axis, math.radians(deg))
        pb = arm.pose.bones[bone]
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = q


examiner_hand()

white = bpy.data.materials.get("vt_white") or bpy.data.materials.new("vt_white")
white.use_nodes = True
nodes = white.node_tree.nodes
for n in list(nodes):
    nodes.remove(n)
out = nodes.new("ShaderNodeOutputMaterial")
emit = nodes.new("ShaderNodeEmission")
emit.inputs["Color"].default_value = (1, 1, 1, 1)
white.node_tree.links.new(emit.outputs[0], out.inputs["Surface"])

objs = {n: bpy.data.objects[n] for n in ["skin", "arm_l", "arm_r", "HAND-examiner"]}
for o in objs.values():
    o.data.materials.clear()
    o.data.materials.append(white)

scene = bpy.context.scene
scene.render.film_transparent = True
scene.render.use_freestyle = False
cam = scene.camera or bpy.data.objects["Camera"]
cam.data.type = "ORTHO"
cam.data.clip_start, cam.data.clip_end = 0.01, 10


def to_blender(p):
    return Vector((p[0], -p[2], p[1]))


def aim(eye, target):
    f = (target - eye).normalized()
    r = f.cross(Vector((0, 0, 1))).normalized()
    u = r.cross(f)
    m = Matrix((r, u, -f)).transposed().to_4x4()
    m.translation = eye
    return m


# name, eye, target, half extents (m), plate units per metre, object
VIEWS = [
    ("profile", (-2, 1.53, 0), (0, 1.53, 0), (0.16, 0.22), 960, "skin"),
    ("bust", (0, 1.45, 2), (0, 1.45, 0), (0.3, 0.32), 580, "skin"),
    ("body", (-3, 0.86, 0), (0, 0.86, 0), (0.3, 0.88), 245, "skin"),
    ("front", (0, 0.86, 3), (0, 0.86, 0), (0.36, 0.88), 300, "skin"),
    ("palm_l", (0.27, 0.89, 2), (0.27, 0.89, 0), (0.08, 0.21), 1200, "arm_l"),
    ("dorsal_r", (-0.27, 0.86, -2), (-0.27, 0.86, 0), (0.08, 0.15), 1200, "HAND-examiner"),
    ("dorsal_rf_s", (-0.27, 0.86, -2), (-0.27, 0.86, 0), (0.08, 0.15), 580, "arm_r"),
    ("dorsal_l", (0.27, 0.86, -2), (0.27, 0.86, 0), (0.08, 0.15), 1300, "arm_l"),
    ("side_l", (2, 0.84, 0.05), (0.27, 0.84, 0.05), (0.08, 0.13), 330, "arm_l"),
    ("head_s", (-2, 1.53, 0), (0, 1.53, 0), (0.16, 0.22), 300, "skin"),
]

meta = {}
for name, eye, target, half, upm, obj in VIEWS:
    for n, o in objs.items():
        o.hide_render = n != obj
    w, h = round(2 * half[0] * upm * K), round(2 * half[1] * upm * K)
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    cam.matrix_world = aim(to_blender(eye), to_blender(target))
    cam.data.ortho_scale = 2 * max(half)
    scene.render.filepath = f"{OUT}/{name}.mask.png"
    bpy.ops.render.render(write_still=True)
    meta[name] = {"W": w, "H": h, "K": K, "upm": upm}

json.dump(meta, open(f"{OUT}/meta.json", "w"))
print(sorted(meta))

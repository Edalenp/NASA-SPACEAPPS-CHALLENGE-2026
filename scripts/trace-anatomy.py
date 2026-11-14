"""
Trace Blender silhouette renders of the Open Anatomy skin (CC BY 4.0) into SVG path data.

Input: the folder written by scripts/blender-anatomy-views.py: <view>.mask.png (white silhouette
on transparent) and meta.json ({view: {W, H, K, upm}}), rendered at K pixels per plate unit.
Output: src/features/guides/art/anatomy-paths.ts with one clean outline per view (outer contour
and holes, smoothed), in plate units from the top-left. There are no interior lines on purpose:
the plates read as clean silhouettes, and only the outline carries the anatomy.

Usage: python -I scripts/trace-anatomy.py <render-folder> src/features/guides/art/anatomy-paths.ts
"""
import json
import sys

import cv2
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
meta = json.load(open(f"{src}/meta.json"))

# The examiner hand (dorsal_r*) is rendered from a copy of the right arm with the ring finger,
# little finger and thumb removed below the knuckles in Blender (see blender-anatomy-views.py).
EDITS: dict[str, list[tuple[float, float, float, float]]] = {}


# The side view is drawn without the genital contour: between these rows (plate units) the
# front edge is replaced by a straight line from hip to thigh.
FRONT_FLATTEN = {"body": (210, 252)}
# The front view joins the legs a little lower (plate units x0, y0, x1, y1), so the crotch reads neutral.
FILL_BOXES = {"front": [(103, 286, 113, 318)]}


def flatten_front(a, k, rows):
    r0, r1 = rows[0] * k, rows[1] * k
    x0 = np.where(a[r0] > 128)[0].max()
    x1 = np.where(a[r1] > 128)[0].max()
    for r in range(r0, r1 + 1):
        limit = int(round(x0 + (x1 - x0) * (r - r0) / (r1 - r0)))
        a[r, limit + 1:] = 0
    return a


def alpha(path):
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    return img[:, :, 3] if img.shape[2] == 4 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def erase(a, boxes):
    h, w = a.shape
    for x0, y0, x1, y1 in boxes:
        a[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 0
    return a


# Views drawn large in a plate get a softer outline: Gaussian blur of the mask (render pixels)
# and a longer smoothing window, which removes mesh facets and small notches.
SOFTEN = {"palm_l": (10, 27), "dorsal_r": (8, 21)}
# Forearm stretches whose edges are refitted as smooth curves (rows in plate units, polynomial degree):
# the mesh is faceted there and the arm should read as one clean shape.
REFIT_EDGES = {"palm_l": (0, 252, 3)}


def refit_edges(a, k, rows):
    """Rebuild the mask between rows r0..r1 from cubic fits of its left and right edges."""
    r0, r1, degree = rows
    ys, lefts, rights = [], [], []
    for y in range(r0 * k, min(a.shape[0], (r1 + 25) * k), k):
        xs = np.where(a[y] > 127)[0]
        if len(xs):
            ys.append(y)
            lefts.append(xs.min())
            rights.append(xs.max())
    fl = np.polyfit(ys, lefts, degree)
    fr = np.polyfit(ys, rights, degree)
    end = min(a.shape[0], r1 * k)
    ramp = 12 * k  # the last rows blend from the fit back into the real edge
    for y in range(r0 * k, end):
        xs = np.where(a[y] > 127)[0]
        t = max(0.0, (y - (end - ramp)) / ramp)
        left = (1 - t) * np.polyval(fl, y) + t * (xs.min() if len(xs) else np.polyval(fl, y))
        right = (1 - t) * np.polyval(fr, y) + t * (xs.max() if len(xs) else np.polyval(fr, y))
        a[y, :] = 0
        a[y, int(round(left)):int(round(right)) + 1] = 255
    return a


def smooth(points, k, window=11):
    if len(points) < 7:
        return points
    kernel = np.ones(window) / window
    padded = np.concatenate([points[-window:], points, points[:window]])
    xs = np.convolve(padded[:, 0], kernel, mode="same")[window:-window]
    ys = np.convolve(padded[:, 1], kernel, mode="same")[window:-window]
    return np.stack([xs, ys], axis=1)


PAD = 400  # render pixels; cut edges of a view are pushed this far out so no straight cut line shows
# Small helper views are cut inside the plate, where the host covers or clips the cut instead.
NO_PAD = {"side_l", "head_s"}
# Views drawn as a single outer silhouette, without inner limb contours.
OUTER_ONLY = {"body", "front"}


def to_path(mask, k, min_area, eps, pad=PAD, outer=False, window=11):
    mask = cv2.copyMakeBorder(mask, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    mode = cv2.RETR_EXTERNAL if outer else cv2.RETR_CCOMP
    contours, _ = cv2.findContours(mask, mode, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in contours:
        if abs(cv2.contourArea(c)) < min_area:
            continue
        pts = smooth(c[:, 0, :].astype(np.float64), k, window)
        pts = (cv2.approxPolyDP(pts.astype(np.float32).reshape(-1, 1, 2), eps, True)[:, 0, :] - pad) / k
        if len(pts) < 3:
            continue
        d = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
        parts.append(d.replace(".0 ", " ").replace(".0L", "L").replace(".0Z", "Z"))
    return "".join(parts)


out = {}
for name, m in meta.items():
    k = m["K"]
    fill = alpha(f"{src}/{name}.mask.png")
    for edit in EDITS.get(name, []):
        fill = erase(fill, [edit])
    for x0, y0, x1, y1 in FILL_BOXES.get(name, []):
        fill = fill.copy()
        fill[y0 * k:y1 * k, x0 * k:x1 * k] = 255
    if name in FRONT_FLATTEN:
        fill = flatten_front(fill.copy(), k, FRONT_FLATTEN[name])
    body = (fill > 128).astype(np.uint8) * 255
    body = cv2.morphologyEx(body, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    body = cv2.morphologyEx(body, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    if name in REFIT_EDGES:
        body = refit_edges(body.copy(), k, REFIT_EDGES[name])
    blur, window = SOFTEN.get(name, (0, 11))
    if blur:
        body = (cv2.GaussianBlur(body, (0, 0), blur) > 127).astype(np.uint8) * 255
    out[name] = {
        "w": round(m["W"] / k, 1),
        "h": round(m["H"] / k, 1),
        "outline": to_path(body, k, (8 * k) ** 2, 0.4, 0 if name in NO_PAD else PAD, name in OUTER_ONLY, window),
    }

with open(dst, "w", encoding="utf-8") as f:
    f.write("/**\n * Generated by scripts/trace-anatomy.py from Blender silhouette renders of the Open Anatomy\n")
    f.write(" * skin (CC BY 4.0, see public/models/ATTRIBUTION.md). Plate units, origin top-left. Do not edit.\n */\n")
    f.write("export interface AnatomyView { w: number; h: number; outline: string }\n\n")
    f.write("export const anatomy = ")
    f.write(json.dumps(out, indent=1))
    f.write(" satisfies Record<string, AnatomyView>;\n")
print({k: (v["w"], v["h"], len(v["outline"])) for k, v in out.items()})

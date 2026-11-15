import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

/** Laplacian smoothing: each vertex moves halfway towards the average of its neighbours. */
export function relax(geometry: THREE.BufferGeometry, rounds: number) {
  const index = geometry.getIndex()!;
  const pos = geometry.getAttribute('position');
  const near: Set<number>[] = Array.from({ length: pos.count }, () => new Set());
  for (let t = 0; t < index.count; t += 3) {
    const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    near[a].add(b).add(c); near[b].add(a).add(c); near[c].add(a).add(b);
  }
  const v = new THREE.Vector3(), sum = new THREE.Vector3();
  for (let round = 0; round < rounds; round++) {
    const next = Float32Array.from(pos.array as ArrayLike<number>);
    for (let i = 0; i < pos.count; i++) {
      sum.set(0, 0, 0);
      near[i].forEach((j) => sum.add(v.fromBufferAttribute(pos, j)));
      sum.divideScalar(near[i].size).lerp(v.fromBufferAttribute(pos, i), 0.5);
      next.set([sum.x, sum.y, sum.z], i * 3);
    }
    (pos.array as Float32Array).set(next);
  }
  pos.needsUpdate = true;
}

/** Triangles grouped into connected pieces (shared vertex positions), with each piece's size and centre. */
function pieces(geometry: THREE.BufferGeometry) {
  const welded = mergeVertices(geometry.index ? geometry : geometry, 1e-5);
  const index = welded.getIndex()!;
  const pos = welded.getAttribute('position');
  const parent = Array.from({ length: pos.count }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let t = 0; t < index.count; t += 3) {
    const a = find(index.getX(t)), b = find(index.getX(t + 1)), c = find(index.getX(t + 2));
    parent[b] = a; parent[find(c)] = a;
  }
  const groups = new Map<number, number[]>();
  for (let t = 0; t < index.count; t += 3) {
    const root = find(index.getX(t));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(t);
  }
  return { welded, groups: [...groups.values()] };
}

/** Drops the stray pieces a bronchial tree ships with, far from the lung (a loose branch below the
 *  diaphragm read as a green shard). A tree is many small branches, so a piece goes only when its
 *  centre lies well outside where the branches gather: beyond three times their median distance
 *  from the median centre. */
export function keepLungTree(mesh: THREE.Mesh) {
  const { welded, groups } = pieces(mesh.geometry);
  if (groups.length < 3) { welded.dispose(); return; }
  const index = welded.getIndex()!;
  const pos = welded.getAttribute('position');
  const v = new THREE.Vector3();
  const centres = groups.map((tris) => {
    const box = new THREE.Box3();
    tris.forEach((t) => { for (let k = 0; k < 3; k++) box.expandByPoint(v.fromBufferAttribute(pos, index.getX(t + k))); });
    return box.getCenter(new THREE.Vector3());
  });
  const median = (values: number[]) => { const sorted = [...values].sort((x, y) => x - y); return sorted[Math.floor(sorted.length / 2)]; };
  const middle = new THREE.Vector3(median(centres.map((c) => c.x)), median(centres.map((c) => c.y)), median(centres.map((c) => c.z)));
  const reach = centres.map((c) => c.distanceTo(middle));
  const limit = median(reach) * 3;
  const kept: number[] = [];
  groups.forEach((tris, i) => { if (reach[i] <= limit) tris.forEach((t) => kept.push(index.getX(t), index.getX(t + 1), index.getX(t + 2))); });
  welded.setIndex(kept);
  welded.computeVertexNormals();
  mesh.geometry = welded;
}

/**
 * The model's lungs are only bronchial trees. Each tree gets a lobe: a fine sphere cast out from
 * the tree's centre onto its convex hull, a little fuller and gently smoothed, so it keeps the
 * lung's outline with even triangles (the bare hull leaves long slivers). The lobe is drawn as a
 * translucent shell (its outline), so the tree stays visible inside it. Named `<tree>_lobe`,
 * added beside the tree. Returns the lobes.
 */
export function addLungLobes(object: THREE.Object3D): THREE.Mesh[] {
  const trees: THREE.Mesh[] = [];
  object.traverse((node) => { if (node instanceof THREE.Mesh && /^lung_[lr]$/.test(node.name)) trees.push(node); });
  return trees.map((tree) => {
    keepLungTree(tree);
    const pos = tree.geometry.getAttribute('position');
    // Only the vertices the kept branches use: a dropped stray piece must not stretch the lung.
    const used = tree.geometry.index ? [...new Set(tree.geometry.index.array as ArrayLike<number> as number[])] : Array.from({ length: pos.count }, (_, i) => i);
    const points = used.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i));
    const centre = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
    points.forEach((point) => point.sub(centre));
    const faces = new ConvexHull().setFromPoints(points).faces;
    const shell = new THREE.IcosahedronGeometry(1, 4);
    shell.deleteAttribute('normal');
    shell.deleteAttribute('uv');
    const geometry = mergeVertices(shell, 1e-6);
    shell.dispose();
    const surface = geometry.getAttribute('position');
    const dir = new THREE.Vector3();
    // How far the hull reaches along a direction from the tree's centre.
    const hullReach = (d: THREE.Vector3) => {
      let reach = Infinity;
      for (const face of faces) {
        const facing = face.normal.dot(d);
        if (facing > 1e-6) reach = Math.min(reach, face.constant / facing);
      }
      return reach;
    };
    for (let i = 0; i < surface.count; i++) {
      dir.fromBufferAttribute(surface, i).normalize();
      dir.multiplyScalar(hullReach(dir) * 1.08);
      surface.setXYZ(i, dir.x, dir.y, dir.z);
    }
    relax(geometry, 3);
    // Smoothing pulls the surface in; push it back out wherever it fell inside the hull, so every
    // branch of the tree stays within its lung.
    for (let i = 0; i < surface.count; i++) {
      dir.fromBufferAttribute(surface, i);
      const length = dir.length();
      const floor = hullReach(dir.clone().normalize()) * 1.1;
      if (length < floor) { dir.multiplyScalar(floor / length); surface.setXYZ(i, dir.x, dir.y, dir.z); }
    }
    geometry.translate(centre.x, centre.y, centre.z);
    geometry.computeVertexNormals();
    const lobe = new THREE.Mesh(geometry, tree.material);
    lobe.name = `${tree.name}_lobe`;
    lobe.position.copy(tree.position);
    lobe.quaternion.copy(tree.quaternion);
    lobe.scale.copy(tree.scale);
    tree.parent?.add(lobe);
    return lobe;
  });
}

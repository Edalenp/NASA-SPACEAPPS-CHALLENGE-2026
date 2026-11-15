import * as THREE from 'three';

/**
 * Drops the solid, blob-shaped pieces from a vessel mesh. The model's `veins_abdomen` carries a
 * liver-shaped shell among its veins, so circulation lit up a liver. Vessels are long and thin;
 * a welded piece whose bounding box is about as deep and wide as it is long (shortest side over
 * 60% of the longest) and that has hundreds of triangles is an organ surface, not a vessel.
 * Returns the number of triangles removed.
 */
export function stripBlobs(geometry: THREE.BufferGeometry, { minTriangles = 400, roundness = 0.6 } = {}) {
  const pos = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) return 0;
  // Seams are split, so join vertices that share a position before finding the pieces.
  const canonical = new Map<string, number>();
  const rep = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!canonical.has(key)) canonical.set(key, i);
    rep[i] = canonical.get(key)!;
  }
  const parent = Int32Array.from({ length: pos.count }, (_, i) => i);
  const find = (i: number) => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let t = 0; t < index.count; t += 3) {
    const a = find(rep[index.getX(t)]);
    parent[find(rep[index.getX(t + 1)])] = a;
    parent[find(rep[index.getX(t + 2)])] = a;
  }
  const pieces = new Map<number, { triangles: number; box: THREE.Box3 }>();
  const point = new THREE.Vector3();
  for (let t = 0; t < index.count; t += 3) {
    const root = find(rep[index.getX(t)]);
    const piece = pieces.get(root) ?? { triangles: 0, box: new THREE.Box3() };
    piece.triangles += 1;
    for (let k = 0; k < 3; k++) piece.box.expandByPoint(point.fromBufferAttribute(pos, index.getX(t + k)));
    pieces.set(root, piece);
  }
  const size = new THREE.Vector3();
  const blobs = new Set<number>();
  pieces.forEach((piece, root) => {
    piece.box.getSize(size);
    const sides = [size.x, size.y, size.z].sort((a, b) => a - b);
    if (piece.triangles >= minTriangles && sides[0] / sides[2] > roundness) blobs.add(root);
  });
  if (!blobs.size) return 0;
  const keep: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    if (!blobs.has(find(rep[index.getX(t)]))) keep.push(index.getX(t), index.getX(t + 1), index.getX(t + 2));
  }
  const removed = index.count / 3 - keep.length / 3;
  geometry.setIndex(keep);
  return removed;
}

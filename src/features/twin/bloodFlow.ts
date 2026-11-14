import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** Vessel meshes that carry blood glints and cells. */
export const VESSELS = /arter|vein|aorta|vena|vessel|carotid|coronary|pulmonary/i;

/** Plain arrays of a vessel, so it can travel to and from the worker. */
export interface VesselArrays { position: Float32Array; index: Uint32Array }
export interface FlowArrays extends VesselArrays { normal: Float32Array; coord: Float32Array }

/**
 * The vessels ship without UVs, so nothing runs along a tube. This welds a vessel and measures,
 * per vertex, the distance travelled along its own surface from the point nearest the heart
 * (`coord`, in metres). Blood drawn with it follows each vessel instead of being cut by it.
 * `matrix` takes the mesh into the heart's space; `metres` converts model units. It runs in a
 * worker (bloodFlow.worker.ts): about 100 ms per vessel would otherwise stall the first screen.
 */
export function flowCoordinates({ position, index: triangles }: VesselArrays, matrix: THREE.Matrix4, heart: THREE.Vector3, metres: number): FlowArrays {
  const source = new THREE.BufferGeometry();
  source.setAttribute('position', new THREE.BufferAttribute(position, 3));
  source.setIndex(new THREE.BufferAttribute(triangles, 1));
  const geometry = mergeVertices(source, 1e-4);
  source.dispose();
  geometry.computeVertexNormals();
  const index = geometry.getIndex()!;
  const pos = geometry.getAttribute('position');

  const count = pos.count;
  const points = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    points.set([v.x, v.y, v.z], i * 3);
  }
  const gap = (a: number, b: number) =>
    Math.hypot(points[a * 3] - points[b * 3], points[a * 3 + 1] - points[b * 3 + 1], points[a * 3 + 2] - points[b * 3 + 2]) * metres;

  // Neighbours in compressed rows; each component is seeded at its vertex nearest the heart.
  const degree = new Uint32Array(count + 1);
  for (let t = 0; t < index.count; t++) degree[index.getX(t) + 1] += 2;
  for (let i = 0; i < count; i++) degree[i + 1] += degree[i];
  const next = new Uint32Array(degree[count]);
  const fill = degree.slice(0, count);
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    for (let k = 0; k < 3; k++) {
      const a = tri[k];
      next[fill[a]++] = tri[(k + 1) % 3];
      next[fill[a]++] = tri[(k + 2) % 3];
    }
  }
  const root = new Int32Array(count).map((_, i) => i);
  const find = (x: number) => {
    while (root[x] !== x) x = root[x] = root[root[x]];
    return x;
  };
  for (let i = 0; i < count; i++) for (let e = degree[i]; e < degree[i + 1]; e++) root[find(next[e])] = find(i);
  const nearest = new Map<number, { vertex: number; d: number }>();
  for (let i = 0; i < count; i++) {
    const d = Math.hypot(points[i * 3] - heart.x, points[i * 3 + 1] - heart.y, points[i * 3 + 2] - heart.z) * metres;
    const c = find(i);
    const best = nearest.get(c);
    if (!best || d < best.d) nearest.set(c, { vertex: i, d });
  }

  // Dijkstra over the surface, with a small binary heap. Distances stay in 64-bit until the end:
  // comparing a 64-bit candidate to a rounded 32-bit store skips vertices and stalls the front.
  const dist = new Float64Array(count).fill(Infinity);
  const heap: [number, number][] = [];
  const push = (d: number, i: number) => {
    heap.push([d, i]);
    for (let c = heap.length - 1; c > 0; ) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let p = 0; ; ) {
        const l = p * 2 + 1, r = l + 1;
        let m = p;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === p) break;
        [heap[p], heap[m]] = [heap[m], heap[p]];
        p = m;
      }
    }
    return top;
  };
  for (const { vertex, d } of nearest.values()) { dist[vertex] = d; push(d, vertex); }
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    for (let e = degree[i]; e < degree[i + 1]; e++) {
      const j = next[e];
      const nd = d + gap(i, j);
      if (nd < dist[j]) { dist[j] = nd; push(nd, j); }
    }
  }
  const result: FlowArrays = {
    position: Float32Array.from(pos.array as ArrayLike<number>),
    normal: Float32Array.from(geometry.getAttribute('normal').array as ArrayLike<number>),
    index: Uint32Array.from(index.array as ArrayLike<number>),
    coord: Float32Array.from(dist),
  };
  geometry.dispose();
  return result;
}

/** The arrays of a mesh in its own space, dequantised. */
export function vesselArrays(mesh: THREE.Mesh): VesselArrays {
  const pos = mesh.geometry.getAttribute('position');
  const position = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) position.set([pos.getX(i), pos.getY(i), pos.getZ(i)], i * 3);
  const index = mesh.geometry.getIndex();
  return { position, index: index ? Uint32Array.from(index.array as ArrayLike<number>) : Uint32Array.from({ length: pos.count }, (_, i) => i) };
}

/** Builds the vessel's new geometry from the worker's arrays. */
export function flowGeometry({ position, normal, index, coord }: FlowArrays) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('vtFlowCoord', new THREE.BufferAttribute(coord, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return geometry;
}

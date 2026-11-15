import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// These low-resolution muscle sheets were warped from the male asset. Long edges
// bridge the fitted female contours and leave angular fins outside the skin.
const FITTED_MUSCLES = /^(gluteal|quadriceps|hamstrings|adductors|calf|shin_muscles|chest_muscles)_[lr]$/;
const LEG_MUSCLES = /^(gluteal|quadriceps|hamstrings|adductors|calf|shin_muscles)_/;
const CELL = 0.025;

/** A local surface search, in metres, built from the female skin rather than a synthetic body. */
function skinSurface(object: THREE.Object3D) {
  const skin = object.getObjectByName('skin_1');
  if (!(skin instanceof THREE.Mesh)) return null;
  object.updateMatrixWorld(true);
  const armBoxes: THREE.Box3[] = [], bodyBoxes: THREE.Box3[] = [];
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh) || node.parent?.name !== 'skeleton') return;
    const boxes = /^(hand|forearm|humerus)_/.test(node.name) ? armBoxes : bodyBoxes;
    boxes.push(new THREE.Box3().setFromObject(node));
  });
  const pos = skin.geometry.getAttribute('position'), index = skin.geometry.index!;
  const triangles: { triangle: THREE.Triangle; normal: THREE.Vector3; arm: boolean; side: number }[] = [];
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const centre = new THREE.Vector3(), box = new THREE.Box3();
  for (let i = 0; i < index.count; i += 3) {
    const vertices = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(pos, index.getX(i + k)).applyMatrix4(skin.matrixWorld));
    const triangle = new THREE.Triangle(...vertices as [THREE.Vector3, THREE.Vector3, THREE.Vector3]);
    triangle.getMidpoint(centre);
    const arm = Math.min(...armBoxes.map(b => b.distanceToPoint(centre))) < Math.min(...bodyBoxes.map(b => b.distanceToPoint(centre)));
    const id = triangles.length;
    triangles.push({ triangle, normal: triangle.getNormal(new THREE.Vector3()), arm, side: Math.sign(centre.x) });
    box.setFromPoints(vertices);
    for (let x = Math.floor(box.min.x / CELL); x <= Math.floor(box.max.x / CELL); x++)
      for (let y = Math.floor(box.min.y / CELL); y <= Math.floor(box.max.y / CELL); y++)
        for (let z = Math.floor(box.min.z / CELL); z <= Math.floor(box.max.z / CELL); z++) {
          const cell = key(x, y, z), ids = grid.get(cell) ?? [];
          ids.push(id); grid.set(cell, ids);
        }
  }
  const candidate = new THREE.Vector3(), closest = new THREE.Vector3(), normal = new THREE.Vector3(), delta = new THREE.Vector3();
  return (point: THREE.Vector3, leg: boolean) => {
    const cx = Math.floor(point.x / CELL), cy = Math.floor(point.y / CELL), cz = Math.floor(point.z / CELL);
    let distance = Infinity;
    const seen = new Set<number>();
    for (let radius = 0; radius <= 4; radius++) {
      for (let x = cx - radius; x <= cx + radius; x++)
        for (let y = cy - radius; y <= cy + radius; y++)
          for (let z = cz - radius; z <= cz + radius; z++) {
            if (radius && Math.max(Math.abs(x - cx), Math.abs(y - cy), Math.abs(z - cz)) !== radius) continue;
            for (const id of grid.get(key(x, y, z)) ?? []) {
              if (seen.has(id)) continue;
              seen.add(id);
              const face = triangles[id];
              // Hands lie beside the thighs: they must not attract a protruding leg sheet.
              if (leg && (face.arm || face.side !== Math.sign(point.x))) continue;
              face.triangle.closestPointToPoint(point, candidate);
              const d = point.distanceToSquared(candidate);
              if (d < distance) { distance = d; closest.copy(candidate); normal.copy(face.normal); }
            }
          }
      if (Math.sqrt(distance) < (radius - 1) * CELL) break;
    }
    // Only exterior points move. Internal muscle fibres, attachment sites, bones and organs
    // retain their positions. Keep a small clearance beneath the actual skin surface.
    if (distance < 0.1 ** 2 && delta.copy(point).sub(closest).dot(normal) > 0.0005) {
      point.copy(closest).addScaledVector(normal, -0.002);
      return true;
    }
    return false;
  };
}

/** Conform the distorted muscle sheets to the original female skin; never edit the glTF cache. */
export function fitFemaleMuscles(object: THREE.Object3D) {
  const constrain = skinSurface(object);
  if (!constrain) return;
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !FITTED_MUSCLES.test(node.name)) return;
    const source = node.geometry;
    const positions = source.getAttribute('position');
    const model = new THREE.BufferGeometry();
    const point = new THREE.Vector3();
    const coordinates = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
      coordinates.set([point.x, point.y, point.z], i * 3);
    }
    model.setAttribute('position', new THREE.BufferAttribute(coordinates, 3));
    model.setIndex(source.index!.clone());
    // Add samples along long edges before fitting: moving only the coarse corners leaves
    // the same flat triangular fins between them. No anatomical structures are removed.
    const tessellated = new TessellateModifier(0.025, 4).modify(model);
    const fitted = mergeVertices(tessellated, 1e-6);
    model.dispose(); tessellated.dispose();
    const pos = fitted.getAttribute('position');
    // Fair the coarse sheets before the envelope constraint. Keep displacement bounded
    // (8 mm) so the fit cannot drift towards a different muscle or attachment site.
    const neighbours: Set<number>[] = Array.from({ length: pos.count }, () => new Set());
    const ids = fitted.index!;
    for (let i = 0; i < ids.count; i += 3) {
      const a = ids.getX(i), b = ids.getX(i + 1), c = ids.getX(i + 2);
      neighbours[a].add(b).add(c); neighbours[b].add(a).add(c); neighbours[c].add(a).add(b);
    }
    const original = Float32Array.from(pos.array as ArrayLike<number>);
    const average = new THREE.Vector3(), origin = new THREE.Vector3(), displacement = new THREE.Vector3();
    for (let round = 0; round < 3; round++) {
      const next = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        average.set(0, 0, 0);
        neighbours[i].forEach(j => average.add(point.fromBufferAttribute(pos, j)));
        average.divideScalar(neighbours[i].size || 1);
        point.fromBufferAttribute(pos, i).lerp(average, 0.3);
        origin.fromArray(original, i * 3);
        displacement.copy(point).sub(origin).clampLength(0, 0.008);
        point.copy(origin).add(displacement);
        next.set([point.x, point.y, point.z], i * 3);
      }
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, next[i * 3], next[i * 3 + 1], next[i * 3 + 2]);
    }
    const inverse = node.matrixWorld.clone().invert();
    let corrected = 0;
    for (let i = 0; i < pos.count; i++) {
      point.fromBufferAttribute(pos, i);
      if (constrain(point, LEG_MUSCLES.test(node.name))) corrected++;
      point.applyMatrix4(inverse);
      pos.setXYZ(i, point.x, point.y, point.z);
    }
    fitted.computeVertexNormals();
    fitted.computeBoundingBox(); fitted.computeBoundingSphere();
    node.geometry = fitted;
    node.userData.fittedMuscleVertices = corrected;
    source.dispose();
  });
}

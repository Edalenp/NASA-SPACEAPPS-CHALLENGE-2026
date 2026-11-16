import * as THREE from 'three';

/**
 * The female model's vessels are the male BodyParts3D vessels warped to her body (that is how the
 * open-anatomy-3d pipeline builds it), so its leg vessels still carry the male external genital
 * branches: the dorsal arteries and veins of the penis and their perineal neighbours. They are
 * separate pieces of the leg vessel meshes, on the midline at the level of the pubis and running
 * forward past it. This drops exactly those pieces; every other vessel is left as it is.
 */
export function dropMaleGenitalVessels(object: THREE.Object3D) {
  const pelvisNode = object.getObjectByName('pelvis');
  if (!pelvisNode) return 0;
  object.updateMatrixWorld(true);
  const pelvis = new THREE.Box3().setFromObject(pelvisNode);
  let dropped = 0;
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.parent?.name !== 'vessels' || !/^(arteries|veins)_leg_[lr]$/.test(node.name)) return;
    const geometry = node.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    if (!index) return;
    const pos = geometry.getAttribute('position');
    // Pieces: triangles joined through shared vertices (positions welded, so shared indices).
    const parent = Array.from({ length: pos.count }, (_, i) => i);
    const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let t = 0; t < index.count; t += 3) {
      const a = find(index.getX(t)), b = find(index.getX(t + 1)), c = find(index.getX(t + 2));
      parent[b] = a; parent[find(c)] = a;
    }
    const boxes = new Map<number, THREE.Box3>();
    const v = new THREE.Vector3();
    for (let t = 0; t < index.count; t += 3) {
      const root = find(index.getX(t));
      const box = boxes.get(root) ?? boxes.set(root, new THREE.Box3()).get(root)!;
      for (let k = 0; k < 3; k++) box.expandByPoint(v.fromBufferAttribute(pos, index.getX(t + k)).applyMatrix4(node.matrixWorld));
    }
    const male = new Set<number>();
    boxes.forEach((box, root) => {
      const midline = Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) < 0.03;
      const atPubis = box.min.y > pelvis.min.y - 0.05 && box.max.y < pelvis.min.y + 0.07;
      const forward = box.max.z > pelvis.max.z + 0.01;
      if (midline && atPubis && forward) male.add(root);
    });
    if (!male.size) return;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      if (male.has(find(index.getX(t)))) continue;
      kept.push(index.getX(t), index.getX(t + 1), index.getX(t + 2));
    }
    const cleaned = geometry.clone();
    cleaned.setIndex(kept);
    cleaned.computeBoundingBox();
    cleaned.computeBoundingSphere();
    node.geometry = cleaned;
    dropped += male.size;
  });
  return dropped;
}

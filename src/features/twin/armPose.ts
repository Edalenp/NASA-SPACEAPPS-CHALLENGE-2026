import * as THREE from 'three';

/**
 * The model stands in the anatomical position: arms held a little out, elbows open, palms turned
 * forward, as if about to receive something. It has no rig, so the arms are re-posed once on load
 * by moving vertices: the forearm is straightened onto the line of the upper arm (bent 6° forward),
 * pronated 55° about its own axis, the whole arm turned in 20° at the shoulder and drawn 4° closer
 * to the body. The palms end up facing the thighs, like someone standing relaxed, waiting.
 *
 * Every mesh is treated alike (skin, muscles, bones, vessels), so the layers stay together. A vertex
 * belongs to an arm by where it is: below the armpit, beyond the gap between arm and flank; above
 * it, by a smooth blend across the shoulder so the deltoid and skin do not tear.
 */
export const ARM_POSE = { upper: 20, pronation: 55, flexion: 6, adduction: 4 } as const;

interface Arm { shoulder: THREE.Vector3; elbow: THREE.Vector3; wrist: THREE.Vector3 }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How much a point (model space, metres, +x = subject's left) belongs to an arm. */
export function armWeight(p: THREE.Vector3) {
  const ax = Math.abs(p.x);
  if (p.y < 1.12) {
    // Below the armpit the arm is separated from the flank and thigh by a clear gap.
    const gap = p.y <= 0.9 ? 0.185 : 0.185 + (0.15 - 0.185) * ((p.y - 0.9) / 0.22);
    return ax > gap ? 1 : 0;
  }
  return smooth(0.135, 0.19, ax) * (1 - smooth(1.42, 1.5, p.y));
}

function boundsOf(mesh: THREE.Mesh) {
  const box = new THREE.Box3();
  const pos = mesh.geometry.getAttribute('position');
  const point = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) box.expandByPoint(point.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
  return box;
}

export function relaxArms(object: THREE.Object3D, pose = ARM_POSE) {
  object.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  object.traverse((node) => { if (node instanceof THREE.Mesh) meshes.push(node); });
  const find = (name: string) => meshes.find((mesh) => mesh.name === name);
  const arms = new Map<number, Arm>();
  for (const [suffix, side] of [['l', 1], ['r', -1]] as const) {
    const humerus = find(`humerus_${suffix}`);
    const forearm = find(`forearm_${suffix}`);
    if (!humerus || !forearm) return;
    const h = boundsOf(humerus);
    const f = boundsOf(forearm);
    const midZ = (box: THREE.Box3) => (box.min.z + box.max.z) / 2;
    const midX = (box: THREE.Box3) => (box.min.x + box.max.x) / 2;
    arms.set(side, {
      shoulder: new THREE.Vector3(midX(h) - side * 0.005, h.max.y - 0.025, midZ(h)),
      elbow: new THREE.Vector3(midX(f) - side * 0.01, f.max.y - 0.01, midZ(f)),
      wrist: new THREE.Vector3(midX(f), f.min.y + 0.005, midZ(f)),
    });
  }
  const rad = Math.PI / 180;
  const straighten = new Map<number, THREE.Quaternion>();
  arms.forEach(({ shoulder, elbow, wrist }, side) => {
    const upper = elbow.clone().sub(shoulder).normalize();
    const fore = wrist.clone().sub(elbow).normalize();
    const flex = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pose.flexion * rad);
    straighten.set(side, new THREE.Quaternion().setFromUnitVectors(fore, upper).premultiply(flex));
  });
  const q = new THREE.Quaternion();
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, 1);
  const turn = (pivot: THREE.Vector3, rotation: THREE.Quaternion) => {
    point.sub(pivot).applyQuaternion(rotation).add(pivot);
    normal.applyQuaternion(rotation);
  };

  for (const mesh of meshes) {
    const source = mesh.geometry;
    const pos = source.getAttribute('position');
    const nor = source.getAttribute('normal');
    const toModel = mesh.matrixWorld;
    const toLocal = toModel.clone().invert();
    const normalToModel = new THREE.Matrix3().getNormalMatrix(toModel);
    const normalToLocal = new THREE.Matrix3().getNormalMatrix(toLocal);
    const positions = new Float32Array(pos.count * 3);
    const normals = nor ? new Float32Array(nor.count * 3) : null;
    let moved = false;
    for (let i = 0; i < pos.count; i++) {
      point.fromBufferAttribute(pos, i).applyMatrix4(toModel);
      if (nor) normal.fromBufferAttribute(nor, i).applyMatrix3(normalToModel).normalize();
      const w = armWeight(point);
      const arm = w > 0 ? arms.get(Math.sign(point.x) || 1) : undefined;
      if (arm) {
        moved = true;
        const side = Math.sign(point.x) || 1;
        const { shoulder, elbow, wrist } = arm;
        const along = point.y >= elbow.y ? 0 : point.y <= wrist.y ? 1 : smooth(0, 1, (elbow.y - point.y) / (elbow.y - wrist.y));
        if (along > 0) turn(elbow, q.setFromAxisAngle(wrist.clone().sub(elbow).normalize(), side * pose.pronation * rad * along * w));
        const belowElbow = smooth(elbow.y + 0.03, elbow.y - 0.04, point.y);
        if (belowElbow > 0) turn(elbow, new THREE.Quaternion().slerp(straighten.get(side)!, belowElbow * w));
        turn(shoulder, q.setFromAxisAngle(elbow.clone().sub(shoulder).normalize(), side * pose.upper * rad * w));
        turn(shoulder, q.setFromAxisAngle(forward, -side * pose.adduction * rad * w));
      }
      point.applyMatrix4(toLocal);
      positions.set([point.x, point.y, point.z], i * 3);
      if (normals) {
        normal.applyMatrix3(normalToLocal).normalize();
        normals.set([normal.x, normal.y, normal.z], i * 3);
      }
    }
    if (!moved) continue;
    // The loaded geometry is shared with the glTF cache: the posed copy is this clone's own.
    const geometry = source.clone();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normals) geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
  }
}

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { relaxArms } from './armPose';

const RESPIRATORY = /lung|bronch|trache|diaphragm|larynx/i;

/** Prepare a private display copy; never apply the male pose's metre-based mask to the female. */
export function prepareModelGeometry(scene: THREE.Object3D, anatomy: 'male' | 'female', muscleFit?: THREE.Object3D) {
  const object = scene.clone(true);
  object.updateMatrixWorld(true);
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh) || !(anatomy === 'female' || RESPIRATORY.test(node.name))) return;
    const fitted = anatomy === 'female' ? muscleFit?.getObjectByName(node.name) : undefined;
    if (fitted instanceof THREE.Mesh) {
      // The small offline-built overlay is in model metres. Convert it back to this
      // original node's local space; the female skeleton and organs stay untouched.
      node.geometry = fitted.geometry.clone().applyMatrix4(node.matrixWorld.clone().invert());
      node.userData.fittedMuscleVertices = fitted.userData.correctedVertices;
      return;
    }
    // Weld the split shading seams before rebuilding normals. The female's fitted anatomy
    // needs this beyond the lungs as well. This changes shading, not the anatomical shape.
    const source = node.geometry.clone();
    ['normal', 'uv', 'uv1', 'tangent'].forEach(name => source.deleteAttribute(name));
    const smooth = mergeVertices(source, 1e-4);
    smooth.computeVertexNormals();
    source.dispose();
    node.geometry = smooth;
  });
  if (anatomy === 'male') relaxArms(object);
  return object;
}

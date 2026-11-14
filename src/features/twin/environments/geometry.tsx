import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec3 = [number, number, number];
export interface Block { at: Vec3; size: Vec3; rotation?: Vec3 }

/** Static cabin details share one draw call per finish, including their shadows. */
export function Blocks({ items, color, metalness = 0.12, roughness = 0.76, emissive = false }: {
  items: Block[]; color: string; metalness?: number; roughness?: number; emissive?: boolean;
}) {
  const geometry = useMemo(() => {
    const transform = new THREE.Object3D();
    const parts = items.map(({ at, size, rotation = [0, 0, 0] }) => {
      const part = new THREE.BoxGeometry(...size);
      transform.position.set(...at);
      transform.rotation.set(...rotation);
      transform.updateMatrix();
      part.applyMatrix4(transform.matrix);
      return part;
    });
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    return merged;
  }, [items]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow={!emissive} receiveShadow>
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}
        emissive={emissive ? color : '#000000'} emissiveIntensity={emissive ? 0.65 : 0} />
    </mesh>
  );
}

export function Beam({ from, to, width = 0.09, color }: { from: Vec3; to: Vec3; width?: number; color: string }) {
  const { center, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    return {
      center: a.add(b).multiplyScalar(0.5), length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={center} quaternion={quaternion}>
      <boxGeometry args={[width, length, width]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.55} />
    </mesh>
  );
}

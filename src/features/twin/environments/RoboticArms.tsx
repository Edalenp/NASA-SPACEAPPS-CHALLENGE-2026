import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Glows, { type Glow } from './Glows';

/** Two medical service arms behind the crew member: a base, two links and a wrist with a lit tool.
 *  Shared geometry and materials, a slow idle sway on the habitat's ambient clock, no lights. */
export default function RoboticArms({ time }: { time: RefObject<number> }) {
  const parts = useMemo(() => ({
    shell: new THREE.MeshStandardMaterial({ color: '#e6e8e3', metalness: 0.35, roughness: 0.32 }),
    joint: new THREE.MeshStandardMaterial({ color: '#2a312e', metalness: 0.7, roughness: 0.3 }),
    base: new THREE.CylinderGeometry(0.22, 0.28, 0.16, 32),
    link: new THREE.BoxGeometry(0.11, 0.85, 0.13),
    knuckle: new THREE.SphereGeometry(0.1, 24, 16),
    wrist: new THREE.CylinderGeometry(0.05, 0.07, 0.22, 16),
  }), []);
  const tip: Glow[] = useMemo(() => [{ position: [0, -0.16, 0], colour: '#7ff5dd', size: 0.35, blink: 0.3 }], []);
  const arms = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = time.current ?? 0;
    arms.current.forEach((arm, i) => {
      if (!arm) return;
      const shoulder = arm.getObjectByName('shoulder');
      const elbow = arm.getObjectByName('elbow');
      const side = i ? -1 : 1;
      arm.rotation.y = side * (0.5 + Math.sin(t * 0.21 + i) * 0.12);
      if (shoulder) shoulder.rotation.z = side * (-0.25 + Math.sin(t * 0.17 + i * 2) * 0.08);
      if (elbow) elbow.rotation.z = side * (1.25 + Math.sin(t * 0.23 + i) * 0.1);
    });
  });
  return (
    <>
      {[-1.25, 1.25].map((x, i) => (
        <group key={x} position={[x, 0, -1.35]} ref={(g) => { arms.current[i] = g; }}>
          <mesh geometry={parts.base} material={parts.joint} position={[0, 0.08, 0]} />
          <group name="shoulder" position={[0, 0.2, 0]}>
            <mesh geometry={parts.knuckle} material={parts.joint} />
            <mesh geometry={parts.link} material={parts.shell} position={[0, 0.45, 0]} />
            <group name="elbow" position={[0, 0.9, 0]}>
              <mesh geometry={parts.knuckle} material={parts.joint} />
              <mesh geometry={parts.link} material={parts.shell} position={[0, 0.42, 0]} scale={[0.85, 1, 0.85]} />
              <group position={[0, 0.86, 0]} rotation={[0, 0, Math.PI]}>
                <mesh geometry={parts.knuckle} material={parts.joint} scale={0.7} />
                <mesh geometry={parts.wrist} material={parts.shell} position={[0, 0.12, 0]} rotation={[Math.PI, 0, 0]} />
                <group position={[0, 0.26, 0]} rotation={[Math.PI, 0, 0]}><Glows glows={tip} time={time} /></group>
              </group>
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

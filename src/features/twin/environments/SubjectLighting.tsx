import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MathUtils, Object3D, RectAreaLight, SpotLight, Vector3 } from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { ScenePalette } from '../palette';
import { useMission } from '../../../store/mission';
import { focusPoint } from '../inspection';
import { useReducedMotion } from './motion';

RectAreaLightUniformsLib.init();

/** The body has its own stable light rig, independent of the moving habitat. */
export default function SubjectLighting({ p, night }: { p: ScenePalette; night: boolean }) {
  const focus = useMission((s) => s.focus);
  const rotation = useMission((s) => s.rotation);
  const reduced = useReducedMotion();
  const key = useRef<RectAreaLight>(null);
  const spot = useRef<SpotLight>(null);
  const aim = useMemo(() => focusPoint(focus, rotation), [focus, rotation]);
  const offset = useMemo(() => new Vector3(), []);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, 0.95, 0);
    return object;
  }, []);
  useFrame(({ camera }, delta) => {
    if (reduced) target.position.copy(aim);
    else target.position.lerp(aim, 1 - Math.exp(-delta * 9));
    if (key.current) {
      offset.set(-1.65, 1.25, 0.2).applyQuaternion(camera.quaternion);
      key.current.position.copy(camera.position).add(offset);
      key.current.lookAt(target.position);
    }
    if (spot.current) {
      offset.set(0.5, 0.7, 0.2).applyQuaternion(camera.quaternion);
      spot.current.position.copy(camera.position).add(offset);
      const zoom = MathUtils.smoothstep(3.9 - camera.position.distanceTo(aim), 0, 3);
      spot.current.intensity = focus ? 5 + zoom * 5 : 0;
    }
  });
  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={night ? 0.25 : 0.35} />
      <hemisphereLight args={['#f0f2e8', '#6c766c', night ? 0.45 : 0.6]} />
      <rectAreaLight ref={key} name="subject-key" width={2.2} height={2.8} color="#f4f2e5" intensity={night ? 2.5 : 3.4} />
      <directionalLight position={[-2, 4.5, 2]} color="#edeedc" intensity={night ? 0.8 : 1.15}
        castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-2} shadow-camera-right={2}
        shadow-camera-top={3} shadow-camera-bottom={-1} shadow-normalBias={0.014} shadow-radius={5} />
      <spotLight ref={spot} name="selection-light" position={[0.5, 2.5, 2]} target={target}
        color="#edf5e8" intensity={0} angle={0.3} penumbra={1} distance={7} />
      <directionalLight name="subject-rim" position={[1.2, 2.4, -2.5]} color="#d5e5df" intensity={night ? 0.8 : 1.05} />
      <directionalLight position={[3, 1.5, 3]} color="#e7eee7" intensity={night ? 0.35 : 0.5} />
      <mesh name="subject-deck" position={[0, -0.043, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 0.975, 0.075, 96]} />
        <meshStandardMaterial color={night ? '#465043' : '#c3cbbb'} roughness={0.75} metalness={0.12} />
      </mesh>
      {/* The deck glows: a lit rim and a soft pool of light under the crew member. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
        <ringGeometry args={[0.9, 0.93, 128]} />
        <meshBasicMaterial color="#9ff3e6" transparent opacity={night ? 0.75 : 0.55} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]}>
        <circleGeometry args={[0.9, 96]} />
        <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
          vertexShader={'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'}
          fragmentShader={'varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.55, 0.95, 0.88, pow(max(1.0 - d, 0.0), 1.6) * 0.16); }'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.019, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial color={p.shadow} opacity={night ? 0.2 : 0.14} depthWrite={false} />
      </mesh>
    </>
  );
}

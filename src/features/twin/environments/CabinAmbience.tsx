import { useEffect, useMemo, type RefObject } from 'react';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import { habitats } from './config';
import Glows, { type Glow } from './Glows';
import type { RoomStatus } from './StatusLights';

/** The cabin's light follows the crew member's worst status: warm white when all is well, amber on
 *  watch, red on alert. */
const TINT: Record<RoomStatus, { day: string; night: string }> = {
  normal: { day: '#ffe9cc', night: '#ffd9a6' },
  watch: { day: '#ffc27a', night: '#ffad5c' },
  alert: { day: '#ff8c8c', night: '#ff6b70' },
};

const quad = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 world = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-world.xyz);
    gl_Position = projectionMatrix * world;
  }
`;

/** A soft volumetric shaft under a ceiling light: bright at the source, fading to the floor and at
 *  its grazing sides. Additive, no post-processing. */
const SHAFT = /* glsl */ `
  uniform vec3 uColour;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fall = pow(vUv.y, 1.6);
    float side = pow(abs(dot(vNormal, vView)), 1.5);
    gl_FragColor = vec4(uColour, fall * side * 0.09);
  }
`;

/** A pool of light on the floor under each shaft. */
const POOL = /* glsl */ `
  uniform vec3 uColour;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(uColour, pow(max(1.0 - d, 0.0), 2.2) * 0.22);
  }
`;

/** The cabin's light and life: image-based light from a few light panels (baked once by drei's
 *  Environment, it gives every surface soft reflections, as if ray-traced), visible fixtures with
 *  halos, and volumetric shafts with pools on the floor. Displays live in HoloReadouts. */
export default function CabinAmbience({ environment, night, time, status }: {
  environment: EnvironmentId; night: boolean; time: RefObject<number>; status: RoomStatus;
}) {
  const c = habitats[environment];
  const warm = night ? TINT[status].night : TINT[status].day;
  const shafts = useMemo(() => [-c.width * 0.3, 0, c.width * 0.3].map((x) => [x, c.rear * 0.35] as const), [c]);
  const materials = useMemo(() => {
    const make = (fragmentShader: string) => new THREE.ShaderMaterial({
      uniforms: { uColour: { value: new THREE.Color(warm) } }, vertexShader: quad, fragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    });
    return { shaft: make(SHAFT), pool: make(POOL) };
  }, [warm]);
  useEffect(() => () => { materials.shaft.dispose(); materials.pool.dispose(); }, [materials]);
  const halos = useMemo<Glow[]>(() => shafts.flatMap(([x, z]) => [-0.8, 0, 0.8].map((dx) => ({
    position: [x + dx, c.height - 0.16, z] as [number, number, number], colour: warm, size: 1.1,
  }))), [shafts, c, warm]);
  return (
    <group name="cabin-ambience">
      {/* Re-baked only when the status changes (key), so the reflections take its colour. */}
      <Environment key={status} resolution={128} frames={1} environmentIntensity={night ? 0.5 : 0.8}>
        {shafts.map(([x, z]) => (
          <Lightformer key={x} form="rect" intensity={3} color={warm} position={[x, c.height, z]} rotation-x={Math.PI / 2} scale={[2.6, 0.4, 1]} />
        ))}
        <Lightformer form="rect" intensity={1.2} color="#9ff3e6" position={[0, c.sill + c.windowHeight / 2, c.rear]} scale={[c.windowWidth, c.windowHeight, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#7ff5dd" position={[-c.width / 2, 1.6, -2]} rotation-y={Math.PI / 2} scale={[2, 1, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffb24a" position={[c.width / 2, 1.6, -2]} rotation-y={-Math.PI / 2} scale={[2, 1, 1]} />
      </Environment>
      {shafts.map(([x, z]) => (
        <group key={x}>
          <mesh position={[x, c.height / 2, z]} material={materials.shaft}>
            <cylinderGeometry args={[0.35, 1.5, c.height - 0.2, 32, 1, true]} />
          </mesh>
          <mesh position={[x, 0.005, z]} rotation-x={-Math.PI / 2} material={materials.pool}>
            <planeGeometry args={[4, 4]} />
          </mesh>
        </group>
      ))}
      <Glows glows={halos} time={time} />
    </group>
  );
}

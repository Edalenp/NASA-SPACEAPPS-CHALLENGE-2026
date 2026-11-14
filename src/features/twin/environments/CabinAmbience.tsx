import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import { habitats } from './config';
import Glows, { type Glow } from './Glows';

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

/** A wall display: dark glass, a faint grid, scrolling traces and bars, a header rule and scanlines. */
const SCREEN = /* glsl */ `
  uniform float uTime;
  uniform vec3 uAccent;
  uniform float uSeed;
  varying vec2 vUv;
  float trace(float x, float speed, float freq, float amp, float y0) {
    return y0 + sin((x + uTime * speed) * freq + uSeed) * amp + sin((x * 2.3 + uTime * speed * 0.7) * freq) * amp * 0.4;
  }
  void main() {
    vec2 uv = vUv;
    vec3 colour = vec3(0.012, 0.03, 0.03);
    vec2 grid = abs(fract(uv * vec2(16.0, 9.0)) - 0.5);
    colour += vec3(0.04, 0.12, 0.11) * step(0.47, max(grid.x, grid.y));
    float a = abs(uv.y - trace(uv.x, 0.12, 9.0, 0.06, 0.62));
    float b = abs(uv.y - trace(uv.x, 0.2, 14.0, 0.035, 0.42));
    colour += uAccent * smoothstep(0.012, 0.0, a) + vec3(0.55, 0.95, 0.88) * smoothstep(0.01, 0.0, b) * 0.6;
    float column = floor(uv.x * 14.0);
    float bar = 0.08 + 0.16 * (0.5 + 0.5 * sin(uTime * 0.8 + column * 1.7 + uSeed));
    colour += uAccent * 0.55 * step(uv.y, bar) * step(0.18, fract(uv.x * 14.0)) * step(0.06, uv.y);
    colour += vec3(0.7, 0.95, 0.9) * step(0.9, uv.y) * step(uv.y, 0.905) * step(uv.x, 0.6);
    colour *= 0.85 + 0.15 * step(0.5, fract(uv.y * 160.0));
    float edge = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);
    gl_FragColor = vec4(colour * edge, 1.0);
  }
`;

/** A holographic panel on the window glass: the same display, keyed to its light, so it floats. */
const HOLO = SCREEN.replace('gl_FragColor = vec4(colour * edge, 1.0);',
  'float lum = max(max(colour.r, colour.g), colour.b); gl_FragColor = vec4(colour * edge * 1.4, (lum * 1.6 + 0.05) * edge * (0.85 + 0.15 * sin(uTime * 23.0)));');

function Holo({ position, size, seed, time }: {
  position: [number, number, number]; size: [number, number]; seed: number; time: RefObject<number>;
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAccent: { value: new THREE.Color('#7ff5dd') }, uSeed: { value: seed } },
    vertexShader: quad, fragmentShader: HOLO, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  }), [seed]);
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => { if (mesh.current) mesh.current.material.uniforms.uTime.value = time.current ?? 0; });
  return <mesh ref={mesh} position={position} material={material}><planeGeometry args={size} /></mesh>;
}

function Screen({ position, rotation = [0, 0, 0], size, accent, seed, time }: {
  position: [number, number, number]; rotation?: [number, number, number]; size: [number, number];
  accent: string; seed: number; time: RefObject<number>;
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAccent: { value: new THREE.Color(accent) }, uSeed: { value: seed } },
    vertexShader: quad, fragmentShader: SCREEN, toneMapped: false,
  }), [accent, seed]);
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => { if (mesh.current) mesh.current.material.uniforms.uTime.value = time.current ?? 0; });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[size[0] + 0.12, size[1] + 0.12, 0.05]} />
        <meshStandardMaterial color="#1a201e" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh ref={mesh} material={material}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
}

/** The cabin's light and life: image-based light from a few light panels (baked once by drei's
 *  Environment, it gives every surface soft reflections, as if ray-traced), visible fixtures with
 *  halos, volumetric shafts with pools on the floor, and animated wall displays. */
export default function CabinAmbience({ environment, night, time }: {
  environment: EnvironmentId; night: boolean; time: RefObject<number>;
}) {
  const c = habitats[environment];
  const warm = night ? '#ffd9a6' : '#ffe9cc';
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
  const sideX = c.width / 2 - 0.08;
  const screenY = c.sill + c.windowHeight * 0.55;
  const besideWindow = (c.windowWidth / 2 + c.width / 2) / 2;
  return (
    <group name="cabin-ambience">
      <Environment resolution={128} frames={1} environmentIntensity={night ? 0.5 : 0.8}>
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
      <Holo position={[-c.windowWidth * 0.32, c.sill + c.windowHeight * 0.6, c.rear + 0.75]} size={[1.6, 0.85]} seed={8.4} time={time} />
      <Holo position={[c.windowWidth * 0.3, c.sill + c.windowHeight * 0.45, c.rear + 0.75]} size={[1.3, 0.7]} seed={3.3} time={time} />
      <Screen position={[-besideWindow, screenY, c.rear + 0.4]} size={[1.5, 0.9]} accent="#5ff0d0" seed={1.3} time={time} />
      <Screen position={[besideWindow, screenY, c.rear + 0.4]} size={[1.5, 0.9]} accent="#ffb24a" seed={4.1} time={time} />
      <Screen position={[-sideX, 1.7, c.rear * 0.45]} rotation={[0, Math.PI / 2, 0]} size={[2.2, 1.1]} accent="#7ff5dd" seed={2.7} time={time} />
      <Screen position={[sideX, 1.7, c.rear * 0.45]} rotation={[0, -Math.PI / 2, 0]} size={[2.2, 1.1]} accent="#5ff0d0" seed={6.2} time={time} />
    </group>
  );
}

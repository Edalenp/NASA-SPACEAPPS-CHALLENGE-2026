import { forwardRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RING = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x) / 6.2831853 + 0.5;
    float inside = 1.0 - smoothstep(0.76, 0.78, r);
    float rim = exp(-pow((r - 0.78) * 70.0, 2.0)) + 0.45 * exp(-pow((r - 0.71) * 140.0, 2.0));
    float rings = step(0.93, fract(r * 22.0 + uTime * 0.7)) * inside * 0.22;
    float ticks = step(0.94, fract(a * 96.0)) * smoothstep(0.80, 0.82, r) * (1.0 - smoothstep(0.86, 0.87, r));
    float sweep = pow(fract(a - uTime * 0.22), 10.0) * inside * 0.55;
    float glow = exp(-pow((r - 0.78) * 9.0, 2.0)) * 0.18;
    float flicker = 0.9 + 0.1 * sin(uTime * 37.0) * sin(uTime * 13.0);
    float light = (rim + rings + ticks + sweep + glow + inside * 0.05) * flicker;
    vec3 colour = mix(vec3(0.42, 0.95, 0.9), vec3(0.92, 1.0, 1.0), clamp(rim + ticks, 0.0, 1.0));
    gl_FragColor = vec4(colour, clamp(light, 0.0, 1.0));
  }
`;

const CURTAIN = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float rise = pow(1.0 - vUv.y, 2.2);
    float lines = 0.75 + 0.25 * step(0.5, fract(vUv.x * 120.0 + uTime * 2.0));
    gl_FragColor = vec4(vec3(0.55, 1.0, 0.95), rise * lines * 0.32);
  }
`;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** The opening scanner: a holographic ring with a short curtain of light rising above it. */
export const ScanBeam = forwardRef<THREE.Group>(function ScanBeam(_, ref) {
  const time = useMemo(() => ({ value: 0 }), []);
  const materials = useMemo(() => {
    const make = (fragmentShader: string) => new THREE.ShaderMaterial({
      uniforms: { uTime: time }, vertexShader: VERTEX, fragmentShader,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { ring: make(RING), curtain: make(CURTAIN) };
  }, [time]);
  useFrame((_, delta) => { time.value += delta; });
  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={materials.ring}>
        <circleGeometry args={[0.78, 128]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={materials.curtain}>
        <cylinderGeometry args={[0.6, 0.6, 0.14, 128, 1, true]} />
      </mesh>
    </group>
  );
});

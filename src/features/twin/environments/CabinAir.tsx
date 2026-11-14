import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { random } from './config';

/** Sparse illuminated motes give the room scale, without obscuring the body. */
export default function CabinAir({ time, night }: { time: RefObject<number>; night: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const rng = random(382);
    const points = Array.from({ length: 64 }, () => [(rng() - 0.5) * 13, 0.3 + rng() * 2.8, -1.5 - rng() * 6]).flat();
    return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: night ? 0.22 : 0.15 } }), [night]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => { if (material.current) material.current.uniforms.uTime.value = time.current; });
  return (
    <points geometry={geometry} name="illuminated-cabin-air">
      <shaderMaterial ref={material} transparent depthWrite={false} uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime;
          varying float vLight;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.15 + position.y * 2.3) * 0.18;
            p.y += sin(uTime * 0.2 + position.x * 1.7) * 0.13;
            vec4 view = modelViewMatrix * vec4(p, 1.0);
            vLight = 0.45 + 0.55 * sin(position.x * 2.0 + position.z) * sin(position.x * 2.0 + position.z);
            gl_PointSize = clamp(20.0 / -view.z, 1.0, 2.7);
            gl_Position = projectionMatrix * view;
          }
        `} fragmentShader={/* glsl */ `
          uniform float uOpacity;
          varying float vLight;
          void main() {
            float radius = length(gl_PointCoord - 0.5);
            float alpha = (1.0 - smoothstep(0.1, 0.5, radius)) * uOpacity * vLight;
            gl_FragColor = vec4(0.9, 0.94, 0.86, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `} />
    </points>
  );
}

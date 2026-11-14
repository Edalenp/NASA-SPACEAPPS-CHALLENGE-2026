import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { random } from './config';

/** Out-of-focus lights at several depths, like practicals blurred behind glass: they give the
 *  cabin depth without any post-processing. A few dozen soft discs, drifting slowly. */
export default function Bokeh({ time }: { time: MutableRefObject<number> }) {
  const { geometry, material } = useMemo(() => {
    const rng = random(3301);
    const count = 46;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const palette = [new THREE.Color('#ffb24a'), new THREE.Color('#ff8a3d'), new THREE.Color('#5ff0d0'), new THREE.Color('#e9fff6')];
    for (let i = 0; i < count; i++) {
      positions.set([(rng() - 0.5) * 22, rng() * 6 - 0.5, 2 - rng() * 30], i * 3);
      palette[Math.floor(rng() * palette.length)].toArray(colours, i * 3);
      sizes[i] = 0.4 + rng() * 1.6;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('colour', new THREE.BufferAttribute(colours, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */ `
        attribute vec3 colour;
        attribute float size;
        uniform float uTime;
        varying vec3 vColour;
        void main() {
          vec3 p = position + vec3(sin(uTime * 0.05 + size * 9.0) * 0.4, cos(uTime * 0.04 + size * 7.0) * 0.25, 0.0);
          vec4 view = modelViewMatrix * vec4(p, 1.0);
          vColour = colour;
          gl_PointSize = size * 900.0 / -view.z;
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColour;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          // A defocused disc: flat body, slightly brighter rim, soft edge.
          float disc = smoothstep(1.0, 0.86, d) * (0.75 + 0.25 * smoothstep(0.55, 0.95, d));
          gl_FragColor = vec4(vColour, disc * 0.14);
        }
      `,
    });
    return { geometry, material };
  }, []);
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => { if (points.current) points.current.material.uniforms.uTime.value = time.current; });
  return <points ref={points} geometry={geometry} material={material} renderOrder={5} />;
}

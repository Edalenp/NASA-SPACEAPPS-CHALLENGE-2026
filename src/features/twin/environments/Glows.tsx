import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface Glow {
  position: [number, number, number];
  colour: string;
  /** Apparent size; scaled by distance. */
  size: number;
  /** 0: steady; otherwise blinks this many times a second (a short flash). */
  blink?: number;
  /** Seconds of offset, so blinkers do not fire together. */
  phase?: number;
}

/** Small light sources with soft halos — navigation lights, beacons, panel LEDs — as one points
 *  draw, animated with the habitat's ambient clock. */
export default function Glows({ glows, time }: { glows: Glow[]; time: RefObject<number> }) {
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(glows.length * 3);
    const colours = new Float32Array(glows.length * 3);
    const params = new Float32Array(glows.length * 3);
    glows.forEach((glow, i) => {
      positions.set(glow.position, i * 3);
      new THREE.Color(glow.colour).toArray(colours, i * 3);
      params.set([glow.size, glow.blink ?? 0, glow.phase ?? 0], i * 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('colour', new THREE.BufferAttribute(colours, 3));
    geometry.setAttribute('params', new THREE.BufferAttribute(params, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */ `
        attribute vec3 colour;
        attribute vec3 params;
        uniform float uTime;
        varying vec3 vColour;
        varying float vOn;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          float blink = params.y;
          vOn = blink > 0.0 ? smoothstep(0.86, 0.9, fract(uTime * blink + params.z)) * (1.0 - smoothstep(0.96, 1.0, fract(uTime * blink + params.z))) : 1.0;
          vColour = colour;
          gl_PointSize = params.x * 300.0 / -view.z;
          gl_Position = projectionMatrix * view;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColour;
        varying float vOn;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float core = smoothstep(0.22, 0.0, d);
          float halo = pow(max(1.0 - d, 0.0), 2.4) * 0.55;
          gl_FragColor = vec4(mix(vColour, vec3(1.0), core * 0.6), (core + halo) * vOn);
        }
      `,
    });
    return { geometry, material };
  }, [glows]);
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(() => { if (points.current) points.current.material.uniforms.uTime.value = time.current ?? 0; });
  return <points ref={points} geometry={geometry} material={material} />;
}

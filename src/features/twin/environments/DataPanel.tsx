import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Live look over the drawn data: a bright sweep that runs down the panel, fine scanlines and, on
 *  holograms, a faint flicker. The canvas itself is only redrawn when its data changes. */
const LIVE = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uHolo;
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float sweep = exp(-pow((fract(uTime * 0.16) - (1.0 - vUv.y)) * 26.0, 2.0));
    float lines = 0.9 + 0.1 * step(0.5, fract(vUv.y * 180.0 - uTime * 0.6));
    float flicker = mix(1.0, 0.9 + 0.1 * sin(uTime * 31.0) * sin(uTime * 7.0), uHolo);
    vec3 colour = (tex.rgb + vec3(0.55, 1.0, 0.9) * sweep * 0.22) * lines * flicker;
    gl_FragColor = vec4(colour, mix(1.0, tex.a + sweep * 0.12, uHolo));
    #include <colorspace_fragment>
  }
`;

/** Marks a canvas texture for re-upload after the canvas was redrawn. */
function refresh(texture: THREE.Texture) {
  texture.needsUpdate = true;
}

/** A display in the cabin that shows real app data: drawn on a 2D canvas whenever `draw` changes
 *  (the caller memoises it on its data), uploaded once, then free per frame. `holo` floats it as
 *  additive light; otherwise it is an opaque screen in a dark frame. */
export default function DataPanel({ pixels, size, position, rotation = [0, 0, 0], holo = false, draw, time }: {
  pixels: [number, number]; size: [number, number];
  position: [number, number, number]; rotation?: [number, number, number];
  holo?: boolean; draw: (g: CanvasRenderingContext2D, width: number, height: number) => void;
  time: RefObject<number>;
}) {
  const [width, height] = pixels;
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, [width, height]);
  useEffect(() => {
    const g = canvas.getContext('2d');
    if (!g) return;
    draw(g, width, height);
    refresh(texture);
  }, [canvas, texture, draw, width, height]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uMap: { value: texture }, uTime: { value: 0 }, uHolo: { value: holo ? 1 : 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: LIVE, toneMapped: false, transparent: holo, depthWrite: !holo, side: holo ? THREE.DoubleSide : THREE.FrontSide,
    blending: holo ? THREE.AdditiveBlending : THREE.NormalBlending,
  }), [texture, holo]);
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  useFrame(() => { if (mesh.current) mesh.current.material.uniforms.uTime.value = time.current ?? 0; });
  useEffect(() => () => { texture.dispose(); material.dispose(); }, [texture, material]);
  return (
    <group position={position} rotation={rotation}>
      {!holo && (
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.05]} />
          <meshStandardMaterial color="#1a201e" metalness={0.6} roughness={0.35} />
        </mesh>
      )}
      <mesh ref={mesh} material={material}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
}

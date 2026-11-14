import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Marks a canvas texture for re-upload after the canvas was redrawn. */
function refresh(texture: THREE.Texture) {
  texture.needsUpdate = true;
}

/** A display in the cabin that shows real app data: drawn on a 2D canvas whenever `draw` changes
 *  (the caller memoises it on its data), uploaded once, then free per frame. `holo` floats it as
 *  additive light; otherwise it is an opaque screen in a dark frame. */
export default function DataPanel({ pixels, size, position, rotation = [0, 0, 0], holo = false, draw }: {
  pixels: [number, number]; size: [number, number];
  position: [number, number, number]; rotation?: [number, number, number];
  holo?: boolean; draw: (g: CanvasRenderingContext2D, width: number, height: number) => void;
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
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position} rotation={rotation}>
      {!holo && (
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[size[0] + 0.1, size[1] + 0.1, 0.05]} />
          <meshStandardMaterial color="#1a201e" metalness={0.6} roughness={0.35} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={size} />
        {holo ? (
          <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
        ) : (
          <meshBasicMaterial map={texture} toneMapped={false} />
        )}
      </mesh>
    </group>
  );
}

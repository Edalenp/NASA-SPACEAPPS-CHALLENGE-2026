import { useEffect, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { heroClock } from './heroClock';

export const BUST_MODEL = '/models/anatomy-male.glb';

/** Start the model download as soon as the landing loads, before the hero's canvas mounts. */
export function preloadBust() {
  useGLTF.preload(BUST_MODEL, false, true);
}

/** The pointer over an element, in normalised device coordinates, written in place for a head to
 *  follow (no React renders). */
export function usePointer(target: RefObject<HTMLElement | null>, out: { x: number; y: number } = heroClock.pointer) {
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const bounds = target.current?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height) return;
      out.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      out.y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [target, out]);
}

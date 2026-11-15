import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Matrix4, type PerspectiveCamera } from 'three';
import type { ViewLink } from './ViewLink';

/** Controls belong to the medical view; the atmosphere follows its real camera. The habitat is
 *  asked to redraw only when that camera actually moved or changed lens, not on every frame of
 *  the body's motion: its own ambient loop covers the rest. */
export function MedicalCameraLink({ link }: { link: ViewLink }) {
  const last = useRef({ matrix: new Matrix4(), fov: 0, aspect: 0, zoom: 0 });
  useFrame(({ camera }) => {
    const seen = last.current;
    const lens = camera as PerspectiveCamera;
    lens.updateMatrixWorld();
    if (seen.matrix.equals(lens.matrixWorld) && seen.fov === lens.fov && seen.aspect === lens.aspect && seen.zoom === lens.zoom) return;
    seen.matrix.copy(lens.matrixWorld);
    seen.fov = lens.fov;
    seen.aspect = lens.aspect;
    seen.zoom = lens.zoom;
    link.view.copy(lens, false);
    link.redraw();
  });
  return null;
}

export function HabitatCameraLink({ link }: { link: ViewLink }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    link.connect(invalidate);
    return () => { link.connect(() => {}); };
  }, [link, invalidate]);
  useFrame(({ camera }) => {
    (camera as PerspectiveCamera).copy(link.view, false);
    camera.updateMatrixWorld();
  });
  return null;
}

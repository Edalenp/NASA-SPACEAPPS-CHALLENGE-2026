import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import type { ViewLink } from './ViewLink';

/** Controls belong to the medical view; the atmosphere follows its real camera. */
export function MedicalCameraLink({ link }: { link: ViewLink }) {
  useFrame(({ camera }) => {
    link.view.copy(camera as PerspectiveCamera, false);
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

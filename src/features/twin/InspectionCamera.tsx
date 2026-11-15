import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MathUtils, Spherical, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useMission } from '../../store/mission';
import { useReducedMotion } from './environments/motion';
import { focusPoint, inspectionViews, inspectionDistance } from './inspection';

export default function InspectionCamera() {
  const controls = useRef<OrbitControlsImpl>(null);
  const focus = useMission((s) => s.focus);
  const revision = useMission((s) => s.focusRevision);
  const reset = useMission((s) => s.reset);
  const reduced = useReducedMotion();
  const getScene = useThree((s) => s.get);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const path = useRef({
    active: false, started: 0, duration: 1000,
    from: new Vector3(), to: new Vector3(), current: new Vector3(),
    start: new Spherical(), end: new Spherical(),
  });

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const { camera, invalidate } = getScene();
    if (!focus && reset === 0 && revision === 0) return;
    const transition = path.current;
    const rotation = useMission.getState().rotation;
    transition.from.copy(orbit.target);
    transition.to.copy(focusPoint(focus, rotation));
    transition.start.setFromVector3(camera.position.clone().sub(orbit.target));
    if (focus) {
      const profile = inspectionViews[focus];
      const distance = inspectionDistance(focus, width / height);
      transition.end.set(distance, Math.PI / 2 - 0.045, rotation + profile.yaw);
    } else {
      transition.to.set(0, 0.86, 0);
      transition.end.setFromVector3(new Vector3(0.7, 1.2, 3.7).sub(transition.to));
    }
    transition.end.theta = transition.start.theta + MathUtils.euclideanModulo(transition.end.theta - transition.start.theta + Math.PI, Math.PI * 2) - Math.PI;
    transition.duration = reduced ? 0 : focus ? 1050 : 850;
    transition.started = performance.now();
    transition.active = true;
    invalidate();
  }, [focus, revision, reset, reduced, width, height, getScene, path]);

  useFrame(({ camera, invalidate }) => {
    const transition = path.current;
    if (!transition.active || !controls.current) return;
    const t = transition.duration === 0 ? 1 : Math.min(1, (performance.now() - transition.started) / transition.duration);
    const ease = 1 - Math.pow(1 - t, 3);
    controls.current.target.lerpVectors(transition.from, transition.to, ease);
    transition.current.setFromSphericalCoords(
      MathUtils.lerp(transition.start.radius, transition.end.radius, ease),
      MathUtils.lerp(transition.start.phi, transition.end.phi, ease),
      MathUtils.lerp(transition.start.theta, transition.end.theta, ease),
    );
    camera.position.copy(controls.current.target).add(transition.current);
    camera.lookAt(controls.current.target);
    camera.updateMatrixWorld();
    controls.current.update();
    transition.active = t < 1;
    if (transition.active) invalidate();
  }, -0.5);

  return (
    // The wheel zooms towards the point under the pointer, not the centre of the view; picking a
    // system, or Show full body, re-centres the camera.
    <OrbitControls ref={controls} target={[0, 0.86, 0]} minDistance={focus ? 0.5 : 0.8} maxDistance={5.25}
      minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI / 2 + 0.08} enablePan={false} zoomToCursor makeDefault
      onStart={() => { path.current.active = false; }} />
  );
}

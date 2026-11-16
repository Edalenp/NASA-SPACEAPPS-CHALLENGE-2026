import { useMemo, useRef } from 'react';
import type { ShadowMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, MathUtils, Object3D, SpotLight, Vector3 } from 'three';
import { STATUS_LIGHT, type ScenePalette } from '../palette';
import { useMission } from '../../../store/mission';
import { focusPoint } from '../inspection';
import { useReducedMotion } from './motion';
import { useIntro } from '../intro';
import GlassDeck from './GlassDeck';

/** The body has its own stable light rig, independent of the moving habitat. */
export default function SubjectLighting({ p, night, mood = 'normal' }: { p: ScenePalette; night: boolean; mood?: keyof typeof STATUS_LIGHT }) {
  const focus = useMission((s) => s.focus);
  const rotation = useMission((s) => s.rotation);
  const reduced = useReducedMotion();
  const key = useRef<DirectionalLight>(null);
  const spot = useRef<SpotLight>(null);
  const aim = useMemo(() => focusPoint(focus, rotation), [focus, rotation]);
  // The shadows wait for the body: hidden while the opening scan reveals it, then fading in, so a
  // shadow never shows before the body that casts it.
  const scanned = useIntro((s) => s.done);
  const deckShadow = useRef<ShadowMaterial>(null);
  const floorShadow = useRef<ShadowMaterial>(null);
  const shade = useRef(0);
  const offset = useMemo(() => new Vector3(), []);
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, 0.95, 0);
    return object;
  }, []);
  useFrame(({ camera, invalidate }, delta) => {
    const goal = scanned ? 1 : 0;
    if (shade.current !== goal) {
      shade.current = reduced ? goal : Math.min(1, Math.max(0, shade.current + Math.sign(goal - shade.current) * delta / 0.9));
      invalidate();
    }
    if (deckShadow.current) deckShadow.current.opacity = (night ? 0.55 : 0.4) * shade.current;
    if (floorShadow.current) floorShadow.current.opacity = (night ? 0.42 : 0.3) * shade.current;
    if (reduced) target.position.copy(aim);
    else target.position.lerp(aim, 1 - Math.exp(-delta * 9));
    if (key.current) {
      offset.set(-1.65, 1.25, 0.2).applyQuaternion(camera.quaternion);
      key.current.position.copy(camera.position).add(offset);
    }
    if (spot.current) {
      offset.set(0.5, 0.7, 0.2).applyQuaternion(camera.quaternion);
      spot.current.position.copy(camera.position).add(offset);
      const zoom = MathUtils.smoothstep(3.9 - camera.position.distanceTo(aim), 0, 3);
      spot.current.intensity = focus ? 5 + zoom * 5 : 0;
    }
  });
  return (
    <>
      <primitive object={target} />
      <ambientLight intensity={night ? 0.25 : 0.35} />
      <hemisphereLight args={['#f0f2e8', '#6c766c', night ? 0.45 : 0.6]} />
      {/* The key rides with the camera, up and to the left. A directional light, not an area
          light: on integrated GPUs the area light alone cost a third of the body's frame. */}
      <directionalLight ref={key} name="subject-key" target={target} color="#f4f2e5" intensity={night ? 1.6 : 2.2} />
      {/* The room's lamp, high and in front to the left: the body's shadow stretches back across
          the deck and the floor, as a ceiling light's does. */}
      <directionalLight name="subject-lamp" position={[-1.8, 5, 1.8]} color="#f1efe2" intensity={night ? 0.9 : 1.2}
        castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-2} shadow-camera-right={2}
        shadow-camera-top={3} shadow-camera-bottom={-1} shadow-normalBias={0.014} shadow-radius={6} />
      {/* Lit only while inspecting: a light at zero intensity still costs every pixel. */}
      <spotLight ref={spot} name="selection-light" visible={Boolean(focus)} position={[0.5, 2.5, 2]} target={target}
        color="#edf5e8" intensity={0} angle={0.3} penumbra={1} distance={7} />
      {/* Rim: two lights from behind, either side, in the state's colour, so the body's edges
          catch a coloured line against the habitat; and a low warm fill from the front, so the
          shadow side keeps some form. Directional, no shadows: a few instructions per pixel. */}
      <directionalLight name="subject-rim" position={[1.6, 2.2, -2.6]} color={STATUS_LIGHT[mood]} intensity={night ? 2.2 : 1.8} />
      <directionalLight name="subject-rim-2" position={[-1.8, 1.4, -2.4]} color={STATUS_LIGHT[mood]} intensity={night ? 1.6 : 1.3} />
      <directionalLight name="subject-fill" position={[2.4, 0.6, 3]} color="#f3e2c8" intensity={night ? 0.55 : 0.6} />
      <mesh name="subject-deck" position={[0, -0.043, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 0.975, 0.075, 96]} />
        {/* Glass: the habitat floor shows through, the key light glints on its polished face. */}
        <meshPhysicalMaterial color={night ? '#8fa39b' : '#e4ece8'} transparent opacity={night ? 0.5 : 0.42}
          roughness={0.1} metalness={0} clearcoat={1} clearcoatRoughness={0.05} ior={1.5} />
      </mesh>
      <GlassDeck night={night} />
      {/* A shadow catcher on the deck's face: only the lamp's shadow shows on it, so the body's
          shadow stretches clearly across the glass instead of fading among the other lights. */}
      <mesh name="deck-shadow" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow renderOrder={1}>
        <circleGeometry args={[0.95, 96]} />
        <shadowMaterial ref={deckShadow} color={p.shadow} opacity={0} depthWrite={false} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.019, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial ref={floorShadow} color={p.shadow} opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

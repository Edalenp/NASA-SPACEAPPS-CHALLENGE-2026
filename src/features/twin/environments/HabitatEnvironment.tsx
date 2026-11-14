import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import type { ScenePalette } from '../palette';
import { habitats } from './config';
import { useHabitatMotion, useReducedMotion } from './motion';
import HabitatShell from './HabitatShell';
import Exterior from './Exterior';
import CabinAir from './CabinAir';
import StatusLights, { type RoomStatus } from './StatusLights';
import Bokeh from './Bokeh';
import Practicals from './Practicals';
import CabinAmbience from './CabinAmbience';
import RoboticArms from './RoboticArms';

/** Local environment inside the existing Canvas. The medical view stays stable. */
export default function HabitatEnvironment({ environment, p, night, motion = true, status = 'normal' }: {
  environment: EnvironmentId; p: ScenePalette; night: boolean; motion?: boolean; status?: RoomStatus;
}) {
  const exterior = useRef<THREE.Group>(null);
  const room = useRef<THREE.Group>(null);
  const sunlight = useRef<THREE.DirectionalLight>(null);
  const time = useRef(0);
  const previous = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const playing = useHabitatMotion((s) => s.playing);
  const reduced = useReducedMotion();
  const active = playing && motion && !reduced;
  const { gl, invalidate } = useThree();
  const config = habitats[environment];
  const daylight = useMemo(() => new THREE.Color(config.daylight), [config]);
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1);
    return target;
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inView = true;
    const schedule = () => {
      if (!active || document.hidden || !inView) return;
      // Ambient animation is capped at 24 fps; interaction can still render at 60.
      timer = setTimeout(() => { invalidate(); schedule(); }, 1000 / 24);
    };
    const visibility = () => {
      clearTimeout(timer);
      previous.current = performance.now();
      schedule();
    };
    previous.current = performance.now();
    schedule();
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      clearTimeout(timer);
      previous.current = performance.now();
      schedule();
    });
    observer.observe(gl.domElement);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [active, gl, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    const interaction = canvas.closest<HTMLElement>('.three-stage') ?? canvas;
    const move = (event: PointerEvent) => {
      if (!active || event.pointerType === 'touch' || event.buttons) return;
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      invalidate();
    };
    const leave = () => { pointer.current.x = 0; pointer.current.y = 0; };
    interaction.addEventListener('pointermove', move);
    interaction.addEventListener('pointerleave', leave);
    return () => { interaction.removeEventListener('pointermove', move); interaction.removeEventListener('pointerleave', leave); };
  }, [active, gl, invalidate]);

  useFrame(() => {
    const now = performance.now();
    const delta = Math.min((now - previous.current) / 1000, 0.1);
    previous.current = now;
    if (!active || document.hidden) return;
    time.current += delta;
    const response = 1 - Math.exp(-delta * 2.5);
    if (room.current) {
      room.current.rotation.y = THREE.MathUtils.lerp(room.current.rotation.y, pointer.current.x * 0.009 + Math.sin(time.current * 0.075) * 0.002, response);
      room.current.position.y = THREE.MathUtils.lerp(room.current.position.y, pointer.current.y * -0.018, response);
    }
    if (sunlight.current) {
      sunlight.current.position.x = -6 + Math.sin(time.current * 0.065) * 2.2;
      sunlight.current.position.y = 4.5 + Math.sin(time.current * 0.045) * 0.3;
    }
    if (exterior.current) {
      exterior.current.position.x = THREE.MathUtils.lerp(exterior.current.position.x, pointer.current.x * 0.22, response);
      exterior.current.position.y = THREE.MathUtils.lerp(exterior.current.position.y, pointer.current.y * -0.1, response);
    }
  });

  return (
    <group ref={room} name={`habitat-${environment}`}>
      <primitive object={sunTarget} />
      <group ref={exterior}>
        <Exterior environment={environment} night={night} time={time} />
      </group>
      <HabitatShell environment={environment} p={p} night={night} />
      <CabinAir time={time} night={night} />
      <hemisphereLight args={[daylight, p.floor, night ? 0.42 : 0.7]} />
      <directionalLight ref={sunlight} name="habitat-sun" position={[-6, 4.5, -14]} target={sunTarget}
        color={daylight} intensity={night ? 0.65 : 2.4} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={10} shadow-camera-bottom={-10}
        shadow-camera-near={0.5} shadow-camera-far={45} shadow-bias={-0.0004} shadow-normalBias={0.04} shadow-radius={3} />
      <pointLight position={[0, 3.4, -1]} color="#edf0df" intensity={night ? 13 : 24} distance={18} />
      <spotLight position={[4, 3.8, -2]} target={sunTarget} color="#f5e7cc"
        intensity={night ? 18 : 32} angle={0.7} penumbra={1} distance={14} />
      <Bokeh time={time} />
      <Practicals environment={environment} night={night} time={time} />
      <CabinAmbience environment={environment} night={night} time={time} />
      <RoboticArms time={time} />
      <StatusLights status={status} watch={p.watch} alert={p.alert} night={night} time={time} active={active} />
    </group>
  );
}

import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { EnvironmentId } from '../../../data/mission';
import { useMission } from '../../../store/mission';
import { habitats } from './config';
import Glows, { type Glow } from './Glows';
import type { RoomStatus } from './StatusLights';
import { STATUS_LIGHT } from '../palette';

RectAreaLightUniformsLib.init();

type Point = [number, number, number];

/** Light spilled by an LED line onto the surface it is mounted on: brightest along the line,
 *  fading across it. Additive, so it reads as light falling on the floor or wall. */
const SPILL = /* glsl */ `
  uniform vec3 uColour;
  uniform float uDown;
  varying vec2 vUv;
  void main() {
    // uDown 1: a lamp's light falling down the wall from its top edge; 0: spreading both ways.
    float across = mix(abs(vUv.y - 0.5) * 2.0, 1.0 - vUv.y, uDown);
    float along = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float light = exp(-across * 3.2) * 0.6 + exp(-across * 16.0) * 0.4;
    gl_FragColor = vec4(uColour, light * along * 0.5);
  }
`;


/** Horizontal light bars in the background of the cabin — over the window, its light falling down
 *  the wall like a lamp's, and along the sill — each a white-hot core in a coloured sheath with a
 *  halo that swells on every recorded heartbeat. */
export default function NeonEdges({ environment, status, time }: {
  environment: EnvironmentId; status: RoomStatus; time: RefObject<number>;
}) {
  const c = habitats[environment];
  const pulse = useMission((s) => s.readings.pulse);
  // LED neon in the status colour: green when all is well, amber on watch, red on alert.
  const colour = STATUS_LIGHT[status];
  const segments = useMemo<[Point, Point][]>(() => {
    const z = c.rear + 0.62;
    const half = c.windowWidth / 2;
    const top = c.sill + c.windowHeight;
    return [
      [[-half * 0.85, top + 0.42, z], [half * 0.85, top + 0.42, z]],
      [[-half * 0.85, c.sill - 0.08, z], [half * 0.85, c.sill - 0.08, z]],
    ];
  }, [c]);
  // A white-hot centre with the colour at its edges, like a real LED, rather than a flat colour.
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).lerp(new THREE.Color('#ffffff'), 0.55), toneMapped: false }), [colour]);
  const sheath = useMemo(() => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [colour]);
  const spillDown = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color(colour) }, uDown: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SPILL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  }), [colour]);
  const spill = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uColour: { value: new THREE.Color(colour) }, uDown: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SPILL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
  }), [colour]);
  const glows = useMemo<Glow[]>(() => segments.flatMap(([a, b]) => {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const steps = Math.max(2, Math.round(from.distanceTo(to) / 0.22));
    return Array.from({ length: steps + 1 }, (_, i) => ({
      position: from.clone().lerp(to, i / steps).toArray() as Point, colour, size: 0.75,
    }));
  }), [segments, colour]);
  return (
    <group name="neon-edges">
      {segments.map(([a, b], i) => {
        const from = new THREE.Vector3(...a);
        const to = new THREE.Vector3(...b);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), to.clone().sub(from).normalize());
        // The spill lies on the mounting surface: the floor for floor runners, the wall for the rest.
        const onFloor = a[1] < 0.05;
        const normal = onFloor ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        const axis = to.clone().sub(from).normalize();
        const basis = new THREE.Matrix4().makeBasis(axis, normal.clone().cross(axis).normalize(), normal);
        const surface = new THREE.Quaternion().setFromRotationMatrix(basis);
        return (
          <group key={i}>
            <mesh position={mid} quaternion={quaternion} material={core}>
              <boxGeometry args={[from.distanceTo(to), 0.045, 0.045]} />
            </mesh>
            <mesh position={mid} quaternion={quaternion} material={sheath}>
              <boxGeometry args={[from.distanceTo(to) + 0.04, 0.11, 0.11]} />
            </mesh>
            {/* The top bar is a lamp: its light falls down the wall; the sill bar spreads both ways. */}
            {i === 0 ? (
              <mesh position={mid.clone().add(new THREE.Vector3(0, -0.8, -0.06))} quaternion={surface} material={spillDown}>
                <planeGeometry args={[from.distanceTo(to) + 1.2, 1.6]} />
              </mesh>
            ) : (
              <mesh position={mid.clone().addScaledVector(normal, onFloor ? 0.002 : -0.06)} quaternion={surface} material={spill}>
                <planeGeometry args={[from.distanceTo(to) + 1.0, onFloor ? 1.1 : 0.9]} />
              </mesh>
            )}
          </group>
        );
      })}
      {/* Real light from the window frame's LEDs, so the floor and walls near it take the colour. */}
      <rectAreaLight position={[0, c.sill - 0.05, c.rear + 0.7]} rotation={[0, 0, 0]} width={c.windowWidth} height={0.08}
        color={colour} intensity={status === 'alert' ? 9 : 6} />
      <Glows glows={glows} time={time} pulse={typeof pulse === 'number' ? pulse : 72} depth={status === 'alert' ? 0.35 : 0.14} />
    </group>
  );
}

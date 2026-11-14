import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import { useMission } from '../../../store/mission';
import { habitats } from './config';
import Glows, { type Glow } from './Glows';
import type { RoomStatus } from './StatusLights';

type Point = [number, number, number];

/** LED neon in the status colour: green when all is well, amber on watch, red on alert. */
const NEON: Record<RoomStatus, string> = { normal: '#5cf08a', watch: '#ffa23a', alert: '#ff4d63' };

/** LED lines along the cabin's structure — the window frame, its mullions and the floor runners —
 *  each a bright core with a continuous halo that swells on every recorded heartbeat. */
export default function NeonEdges({ environment, status, time }: {
  environment: EnvironmentId; status: RoomStatus; time: RefObject<number>;
}) {
  const c = habitats[environment];
  const pulse = useMission((s) => s.readings.pulse);
  const colour = NEON[status];
  const segments = useMemo<[Point, Point][]>(() => {
    const z = c.rear + 0.62;
    const half = c.windowWidth / 2;
    const top = c.sill + c.windowHeight;
    return [
      [[-half, c.sill - 0.03, z], [half, c.sill - 0.03, z]],
      [[-half, top + 0.03, z], [half, top + 0.03, z]],
      ...c.mullions.map((x) => [[x, c.sill, z], [x, top, z]] as [Point, Point]),
      [[-c.width * 0.42, 0.006, c.rear + 0.8], [c.width * 0.42, 0.006, c.rear + 0.8]],
      [[-half, 0.006, c.rear + 0.8], [-half * 0.55, 0.006, 2.6]],
      [[half, 0.006, c.rear + 0.8], [half * 0.55, 0.006, 2.6]],
    ];
  }, [c]);
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(1.6), toneMapped: false }), [colour]);
  const glows = useMemo<Glow[]>(() => segments.flatMap(([a, b]) => {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const steps = Math.max(2, Math.round(from.distanceTo(to) / 0.22));
    return Array.from({ length: steps + 1 }, (_, i) => ({
      position: from.clone().lerp(to, i / steps).toArray() as Point, colour, size: 0.32,
    }));
  }), [segments, colour]);
  return (
    <group name="neon-edges">
      {segments.map(([a, b], i) => {
        const from = new THREE.Vector3(...a);
        const to = new THREE.Vector3(...b);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), to.clone().sub(from).normalize());
        return (
          <mesh key={i} position={mid} quaternion={quaternion} material={core}>
            <boxGeometry args={[from.distanceTo(to), 0.018, 0.018]} />
          </mesh>
        );
      })}
      <Glows glows={glows} time={time} pulse={typeof pulse === 'number' ? pulse : 72} depth={status === 'alert' ? 0.35 : 0.14} />
    </group>
  );
}

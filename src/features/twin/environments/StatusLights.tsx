import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { PointLight } from 'three';

export type RoomStatus = 'normal' | 'watch' | 'alert';

/** The cabin answers the crew member's worst status, 60-30-10: no colour when all is well, an
 *  amber wash from the ceiling on watch, a slow red pulse on alert (steady while motion is paused). */
export default function StatusLights({ status, watch, alert, night, time, active }: {
  status: RoomStatus; watch: string; alert: string; night: boolean;
  time: MutableRefObject<number>; active: boolean;
}) {
  const lights = useRef<(PointLight | null)[]>([]);
  const base = status === 'alert' ? (night ? 16 : 22) : status === 'watch' ? (night ? 9 : 13) : 0;
  useFrame(() => {
    const pulse = status === 'alert' && active ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time.current * 2.4)) : 1;
    lights.current.forEach((light) => { if (light) light.intensity = base * pulse; });
  });
  if (status === 'normal') return null;
  const colour = status === 'alert' ? alert : watch;
  return (
    <>
      {[[-3.2, 3.2, -2.5], [3.2, 3.2, -2.5], [0, 3.4, 2]].map((position, i) => (
        <pointLight key={i} ref={(light) => { lights.current[i] = light; }} position={position as [number, number, number]}
          color={colour} intensity={base} distance={11} decay={1.6} />
      ))}
    </>
  );
}

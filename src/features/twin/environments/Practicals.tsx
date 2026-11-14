import { useMemo, type RefObject } from 'react';
import type { EnvironmentId } from '../../../data/mission';
import { habitats } from './config';
import Glows, { type Glow } from './Glows';

/** Practical lights of the cabin: warm-white strips along the ceiling and over the window, and small
 *  panel indicators by the sill. Dim and unsaturated, so the status lights keep the colour. */
export default function Practicals({ environment, night, time }: {
  environment: EnvironmentId; night: boolean; time: RefObject<number>;
}) {
  const c = habitats[environment];
  const strip = night ? '#ffe6c4' : '#fff1dc';
  const glows = useMemo<Glow[]>(() => {
    const top = c.sill + c.windowHeight;
    const leds: Glow[] = [];
    for (let i = 0; i < 6; i++) {
      leds.push({ position: [-c.windowWidth / 2 + 0.3 + i * 0.12, c.sill - 0.18, c.rear + 0.2], colour: i === 2 ? '#ffb24a' : '#7ff5dd', size: 0.05, blink: i % 3 === 0 ? 0.6 : 0, phase: i * 0.37 });
      leds.push({ position: [c.windowWidth / 2 - 0.3 - i * 0.12, c.sill - 0.18, c.rear + 0.2], colour: i === 4 ? '#e9fff6' : '#7ff5dd', size: 0.05, blink: i % 2 ? 0.4 : 0, phase: i * 0.21 });
    }
    leds.push({ position: [0, top + 0.12, c.rear + 0.25], colour: '#fff1dc', size: 0.12 });
    return leds;
  }, [c]);
  return (
    <group name="cabin-practicals">
      {[c.rear + 0.6, 2].map((z) => (
        <mesh key={z} position={[0, c.height - 0.12, z]}>
          <boxGeometry args={[c.width * 0.78, 0.03, 0.07]} />
          <meshBasicMaterial color={strip} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, c.sill + c.windowHeight + 0.06, c.rear + 0.18]}>
        <boxGeometry args={[c.windowWidth * 0.92, 0.025, 0.04]} />
        <meshBasicMaterial color={strip} toneMapped={false} />
      </mesh>
      <pointLight position={[0, c.height - 0.3, c.rear + 1.2]} color={strip} intensity={night ? 4 : 6} distance={9} decay={1.8} />
      <Glows glows={glows} time={time} />
    </group>
  );
}

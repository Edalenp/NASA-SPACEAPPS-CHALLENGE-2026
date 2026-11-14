import { useMemo } from 'react';
import type { EnvironmentId } from '../../../data/mission';
import type { ScenePalette } from '../palette';
import { habitats } from './config';
import { Blocks, type Block } from './geometry';

/** Furnished interior on every bearing: storage, working surfaces and pressure hardware. */
export default function CabinFixtures({ environment, p, night }: { environment: EnvironmentId; p: ScenePalette; night: boolean }) {
  const config = habitats[environment];
  const parts = useMemo(() => {
    const ceramic: Block[] = [];
    const frame: Block[] = [];
    const inset: Block[] = [];
    const screens: Block[] = [];
    const lamps: Block[] = [];
    const x = config.width / 2;
    // Full-height equipment racks frame the forward pressure hatch.
    for (const side of [-1, 1]) {
      const rackX = side * Math.min(4.4, x - 1.4);
      ceramic.push({ at: [rackX, 1.35, 7.42], size: [1.7, 2.7, 0.9] });
      inset.push({ at: [rackX, 1.4, 6.95], size: [1.43, 2.3, 0.04] });
      for (const y of [0.42, 0.98, 1.54, 2.1]) {
        ceramic.push({ at: [rackX, y, 6.89], size: [1.3, 0.48, 0.09] });
        frame.push({ at: [rackX + side * 0.43, y, 6.81], size: [0.22, 0.045, 0.055] });
      }
      // Low workstations and a recessed display on the forward wall.
      const deskX = side * Math.min(2.1, x - 3.3);
      ceramic.push({ at: [deskX, 0.46, 6.8], size: [1.65, 0.92, 0.8] });
      frame.push({ at: [deskX, 0.95, 6.65], size: [1.8, 0.1, 1.1] });
      ceramic.push({ at: [deskX, 1.67, 7.57], size: [1.65, 1.05, 0.13] });
      screens.push({ at: [deskX, 1.67, 7.48], size: [1.43, 0.82, 0.025] });
      lamps.push({ at: [deskX, 2.32, 7.4], size: [1.3, 0.04, 0.05] });
      // Rails and service channels join the observation wall to the hatch.
      frame.push({ at: [side * (x - 0.16), 0.65, 1], size: [0.08, 0.065, 11.5] });
      inset.push({ at: [side * (x - 0.09), 2.8, 0.5], size: [0.03, 0.16, 12] });
      for (const z of [-2.7, 0.6, 3.9]) {
        ceramic.push({ at: [side * (x - 0.35), 1.4, z], size: [0.5, 1.8, 2.3] });
        inset.push({ at: [side * (x - 0.62), 1.5, z], size: [0.04, 1.5, 2.0] });
        screens.push({ at: [side * (x - 0.65), 1.65, z - 0.4], size: [0.025, 0.65, 0.9] });
        for (const y of [0.78, 1.05]) {
          frame.push({ at: [side * (x - 0.66), y, z + 0.5], size: [0.045, 0.03, 0.6] });
        }
        lamps.push({ at: [side * (x - 0.68), 2.35, z], size: [0.035, 0.035, 1.85] });
      }
      // Forward medical/storage bench; the centre stays clear for the twin.
      ceramic.push({ at: [side * (x - 1), 0.29, 4.4], size: [1.05, 0.55, 2.0] });
      inset.push({ at: [side * (x - 1), 0.6, 4.4], size: [1.12, 0.12, 2.05] });
    }
    // Chamfered pressure-door surround and overhead service spine.
    frame.push({ at: [-0.9, 1.4, 7.69], size: [0.12, 2.9, 0.15] });
    frame.push({ at: [0.9, 1.4, 7.69], size: [0.12, 2.9, 0.15] });
    frame.push({ at: [0, 2.86, 7.69], size: [1.9, 0.12, 0.15] });
    lamps.push({ at: [0, 3.05, 7.65], size: [1.7, 0.055, 0.08] });
    for (const side of [-1, 1]) {
      ceramic.push({ at: [side * 1.65, 3.3, 0.4], size: [0.24, 0.18, 13] });
      lamps.push({ at: [side * 1.65, 3.2, 0.4], size: [0.09, 0.025, 12.6] });
    }
    if (environment === 'rover') {
      for (const side of [-1, 1]) {
        // Restrained rear seats and cargo crates differentiate the vehicle.
        inset.push({ at: [side * 2.7, 0.65, 4.6], size: [0.85, 0.22, 0.9] });
        inset.push({ at: [side * 2.7, 1.25, 4.95], size: [0.85, 1.0, 0.2], rotation: [-0.08, 0, 0] });
        frame.push({ at: [side * 2.7, 0.3, 4.6], size: [0.12, 0.6, 0.5] });
      }
    } else if (environment === 'base') {
      ceramic.push({ at: [-3.4, 0.8, 4.5], size: [2.4, 0.16, 1.15] });
      frame.push({ at: [-4.2, 0.4, 4.5], size: [0.09, 0.8, 0.8] });
      frame.push({ at: [-2.6, 0.4, 4.5], size: [0.09, 0.8, 0.8] });
      ceramic.push({ at: [-3.4, 1.15, 4.5], size: [0.8, 0.55, 0.65] });
      screens.push({ at: [-3.4, 1.2, 4.15], size: [0.6, 0.3, 0.025] });
    }
    return { ceramic, frame, inset, screens, lamps };
  }, [config, environment]);
  return (
    <group name={`${environment}-interior-equipment`}>
      <Blocks items={parts.ceramic} color={p.panel} />
      <Blocks items={parts.frame} color={p.frame} metalness={0.4} />
      <Blocks items={parts.inset} color={night ? '#26312b' : '#78867d'} />
      <Blocks items={parts.screens} color={night ? '#58675e' : '#53655c'} emissive />
      <Blocks items={parts.lamps} color={night ? '#aebba6' : '#ebeee0'} emissive />
    </group>
  );
}

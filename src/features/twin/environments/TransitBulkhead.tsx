import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ScenePalette } from '../palette';
import { habitats } from './config';
import { Blocks, type Block } from './geometry';
import { chamferedPath } from './shapes';

/** Insulated observation bulkhead: a working deep-space cabin, with a clear medical sightline.
 *  All details are baked at mount: four merged meshes, no textures, lights or animation callbacks. */
export default function TransitBulkhead({ p, night }: { p: ScenePalette; night: boolean }) {
  const { rear, width, height, sill, windowWidth, windowHeight } = habitats.transit;
  const top = sill + windowHeight;
  const details = useMemo(() => {
    const structure: Block[] = [];
    const recess: Block[] = [];
    const fittings: Block[] = [];
    const liners: THREE.BufferGeometry[] = [];

    const liner = (x: number, y: number, w: number, h: number) => {
      // A broad, shallow bevel suggests soft insulation rather than polished armour.
      const geometry = new THREE.ExtrudeGeometry(chamferedPath(w, h, 0.09), {
        depth: 0.035, bevelEnabled: true,
        bevelSize: 0.045, bevelThickness: 0.035, bevelSegments: 1, steps: 1,
      });
      geometry.translate(x, y, rear + 0.35);
      liners.push(geometry);
      recess.push({ at: [x, y, rear + 0.29], size: [w + 0.14, h + 0.14, 0.09] });
      // Small captive fasteners sit on the retaining tabs, outside the soft face.
      for (const side of [-1, 1]) {
        for (const end of [-1, 1]) {
          fittings.push({ at: [x + side * (w / 2 + 0.035), y + end * (h / 2 - 0.16), rear + 0.36], size: [0.035, 0.065, 0.025] });
        }
      }
    };

    // Six removable thermal blankets above the observation aperture.
    const panelBottom = top + 0.42;
    const panelHeight = height - panelBottom - 0.32;
    const pitch = (windowWidth + 0.6) / 6;
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * pitch;
      liner(x, panelBottom + panelHeight / 2, pitch - 0.18, panelHeight);
    }

    // Side piers and chamfered knees make the pressure hull read as a volume.
    const pierX = windowWidth / 2 + 0.64;
    for (const side of [-1, 1]) {
      liner(side * pierX, 1.48, 0.64, 2.32);
      structure.push({ at: [side * (windowWidth / 2 + 0.22), 1.45, rear + 0.48], size: [0.16, 2.84, 0.42] });
      structure.push({ at: [side * (windowWidth / 2 - 0.02), top + 0.18, rear + 0.49], size: [0.58, 0.16, 0.42], rotation: [0, 0, -side * Math.PI / 4] });
      // Grab handles have a real gap behind them and remain neutral at rest.
      for (const y of [1.05, 1.68]) {
        structure.push({ at: [side * pierX, y, rear + 0.54], size: [0.3, 0.045, 0.055] });
        for (const end of [-1, 1]) {
          structure.push({ at: [side * pierX + end * 0.13, y, rear + 0.47], size: [0.04, 0.045, 0.14] });
        }
      }
    }

    // A recessed service raceway connects the ribs; no decorative light strips.
    recess.push({ at: [0, top + 0.34, rear + 0.38], size: [windowWidth + 0.32, 0.17, 0.16] });
    for (const y of [top + 0.29, top + 0.39]) {
      structure.push({ at: [0, y, rear + 0.49], size: [windowWidth + 0.34, 0.035, 0.06] });
    }
    for (const x of [-3.6, 0, 3.6]) {
      structure.push({ at: [x, top + 0.34, rear + 0.5], size: [0.16, 0.22, 0.1] });
      for (const offset of [-0.045, 0.045]) {
        fittings.push({ at: [x + offset, top + 0.34, rear + 0.56], size: [0.025, 0.05, 0.02] });
      }
    }
    // The lower retaining rail ties the window into the deck without hiding the sky.
    structure.push({ at: [0, 0.2, rear + 0.4], size: [width - 0.5, 0.12, 0.18] });

    const insulation = mergeGeometries(liners);
    liners.forEach((geometry) => geometry.dispose());
    return { insulation, structure, recess, fittings };
  }, [rear, width, height, windowWidth, top]);
  useEffect(() => () => details.insulation.dispose(), [details]);

  return (
    <group name="transit-insulated-observation-bulkhead">
      <mesh geometry={details.insulation} receiveShadow>
        <meshStandardMaterial color={night ? '#494b43' : '#d9d6c9'} roughness={0.96} metalness={0} />
      </mesh>
      <Blocks items={details.structure} color={p.frame} metalness={0.32} roughness={0.62} />
      <Blocks items={details.recess} color={night ? '#292e28' : '#8c9185'} roughness={0.9} />
      <Blocks items={details.fittings} color={p.panel} metalness={0.4} roughness={0.58} />
    </group>
  );
}

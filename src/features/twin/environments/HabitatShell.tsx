import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { EnvironmentId } from '../../../data/mission';
import type { ScenePalette } from '../palette';
import { habitats } from './config';
import { Blocks, type Block } from './geometry';
import { chamferedPath } from './shapes';
import CabinFixtures from './CabinFixtures';
import TransitBulkhead from './TransitBulkhead';

export default function HabitatShell({ environment, p, night }: {
  environment: EnvironmentId; p: ScenePalette; night: boolean;
}) {
  const config = habitats[environment];
  const { width, height, rear, windowWidth, windowHeight, sill, chamfer, mullions } = config;
  const windowY = sill + windowHeight / 2;
  const { wall, surround, gasket } = useMemo(() => {
    const opening = chamferedPath(windowWidth, windowHeight, chamfer, 0, windowY);
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-width, -0.2);
    wallShape.lineTo(width, -0.2);
    wallShape.lineTo(width, height + 4);
    wallShape.lineTo(-width, height + 4);
    wallShape.closePath();
    wallShape.holes.push(new THREE.Path(opening.getPoints().reverse()));
    const frame = chamferedPath(windowWidth + 0.4, windowHeight + 0.4, chamfer + 0.14, 0, windowY);
    frame.holes.push(new THREE.Path(opening.getPoints().reverse()));
    const seal = chamferedPath(windowWidth + 0.1, windowHeight + 0.1, chamfer + 0.035, 0, windowY);
    seal.holes.push(new THREE.Path(opening.getPoints().reverse()));
    return {
      wall: new THREE.ExtrudeGeometry(wallShape, { depth: 0.24, bevelEnabled: false }),
      surround: new THREE.ExtrudeGeometry(frame, { depth: 0.3, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2 }),
      gasket: new THREE.ShapeGeometry(seal),
    };
  }, [width, height, windowWidth, windowHeight, chamfer, windowY]);
  useEffect(() => () => { wall.dispose(); surround.dispose(); gasket.dispose(); }, [wall, surround, gasket]);

  const details = useMemo(() => {
    const frame: Block[] = [];
    const panel: Block[] = [];
    const dark: Block[] = [];
    const light: Block[] = [];
    const seams: Block[] = [];
    const hardware: Block[] = [];

    // The front bulkhead and ceiling remain present when the user orbits the twin.
    panel.push({ at: [0, height + 0.12, rear / 2 + 3], size: [width + 0.5, 0.24, -rear + 10] });
    panel.push({ at: [0, height / 2, 8], size: [width, height, 0.24] });
    dark.push({ at: [0, 1.4, 7.85], size: [1.65, 2.8, 0.1] });
    panel.push({ at: [0, 1.4, 7.77], size: [1.47, 2.62, 0.1] });
    hardware.push({ at: [0.52, 1.3, 7.66], size: [0.06, 0.32, 0.08] });
    for (const z of [rear + 2.8, -1.1, 2.4, 5.8]) {
      frame.push({ at: [0, height - 0.06, z], size: [width - 1.5, 0.14, 0.21] });
      light.push({ at: [0, height - 0.15, z], size: [width * 0.52, 0.025, 0.1] });
    }

    // A true aperture, deep sill and an open deck make the room a volume rather than a backdrop image.
    panel.push({ at: [0, sill - 0.24, rear + 0.35], size: [windowWidth + 0.8, 0.23, 0.8] });
    dark.push({ at: [0, sill - 0.08, rear + 0.26], size: [windowWidth + 0.3, 0.05, 0.65] });
    light.push({ at: [0, sill - 0.31, rear + 0.72], size: [windowWidth - 1, 0.025, 0.035] });
    for (const x of mullions) {
      frame.push({ at: [x, windowY, rear + 0.08], size: [0.13, windowHeight, 0.28] });
      dark.push({ at: [x, windowY, rear + 0.24], size: [0.035, windowHeight - 0.1, 0.035] });
    }
    for (const side of [-1, 1]) {
      const x = side * width / 2;
      panel.push({ at: [x + side * 0.2, height / 2, (rear + 8) / 2], size: [0.3, height, 8.4 - rear] });
      for (const z of [rear + 0.3, rear + 2.8, -1.1, 2.4, 5.8, 7.8]) {
        frame.push({ at: [x, height * 0.43, z], size: [0.16, height * 0.86, 0.21] });
        frame.push({ at: [side * (width / 2 - 0.42), height * 0.88, z], size: [1.2, 0.14, 0.21], rotation: [0, 0, -side * 0.62] });
        light.push({ at: [side * (width / 2 - 0.12), height * 0.65, z + 0.5], size: [0.025, height * 0.3, 0.06] });
      }
      for (let z = rear + 1.6; z < 7; z += 2.5) {
        panel.push({ at: [x - side * 0.06, 1.5, z], size: [0.1, 1.8, 1.95] });
        dark.push({ at: [x - side * 0.13, 1.65, z], size: [0.035, 0.035, 1.2] });
        hardware.push({ at: [x - side * 0.17, 1.5, z + 0.54], size: [0.055, 0.23, 0.045] });
      }
      // Low equipment banks leave the view and the body silhouette clear.
      const equipmentX = side * (environment === 'rover' ? 3.9 : width * 0.36);
      panel.push({ at: [equipmentX, 0.47, rear + 1.3], size: [1.45, 0.92, 0.9] });
      dark.push({ at: [equipmentX, 0.95, rear + 1.3], size: [1.5, 0.065, 0.95] });
      for (const y of [0.26, 0.55, 0.83]) {
        seams.push({ at: [equipmentX, y, rear + 1.76], size: [1.25, 0.014, 0.012] });
        hardware.push({ at: [equipmentX + side * 0.45, y - 0.08, rear + 1.8], size: [0.18, 0.025, 0.04] });
      }
    }
    // Broad deck panels, narrow seams. Avoid a game-like infinite grid.
    for (let x = -width / 2 + 1.2; x < width / 2; x += 1.8) {
      seams.push({ at: [x, -0.016, rear / 2 + 1], size: [0.012, 0.006, -rear + 7] });
    }
    for (let z = rear + 0.6; z < 6; z += 1.8) {
      seams.push({ at: [0, -0.016, z], size: [width, 0.006, 0.012] });
    }
    // Recessed deck edge channels are actual cabin lighting, not a status signal.
    for (const x of [-2.9, 2.9]) {
      dark.push({ at: [x, -0.014, rear / 2], size: [0.07, 0.015, -rear + 5] });
      light.push({ at: [x, -0.003, rear / 2], size: [0.023, 0.008, -rear + 4.5] });
    }
    if (environment === 'rover') {
      // Dash and grab rails distinguish a vehicle without obstructing health data.
      panel.push({ at: [0, 0.55, rear + 0.95], size: [windowWidth - 0.4, 0.23, 0.65], rotation: [0.12, 0, 0] });
      dark.push({ at: [0, 0.7, rear + 1], size: [windowWidth - 0.8, 0.035, 0.5], rotation: [0.12, 0, 0] });
      for (const side of [-1, 1]) {
        hardware.push({ at: [side * 3.15, 1.2, rear + 0.35], size: [0.5, 0.055, 0.07] });
      }
    }
    return { frame, panel, dark, light, seams, hardware };
  }, [width, height, rear, windowWidth, windowHeight, windowY, sill, mullions, environment]);

  return (
    <group name={`${environment}-cabin`}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow>
        <planeGeometry args={[width + 0.5, 28]} />
        <meshStandardMaterial color={p.floor} roughness={0.8} metalness={0.18} />
      </mesh>
      <mesh geometry={wall} position={[0, 0, rear]} castShadow receiveShadow>
        <meshStandardMaterial color={p.wall} roughness={0.84} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={surround} position={[0, 0, rear + 0.25]} castShadow receiveShadow>
        <meshStandardMaterial color={p.panel} metalness={0.27} roughness={0.52} />
      </mesh>
      <mesh geometry={gasket} position={[0, 0, rear + 0.56]}>
        <meshStandardMaterial color={night ? '#161e1c' : '#5c6763'} roughness={0.8} />
      </mesh>
      <Blocks items={details.frame} color={p.frame} metalness={0.34} roughness={0.5} />
      <Blocks items={details.panel} color={p.panel} />
      <Blocks items={details.dark} color={night ? '#242e29' : '#728079'} />
      <Blocks items={details.light} color={night ? '#b4bca7' : '#e8eee0'} emissive />
      <Blocks items={details.seams} color={p.seam} />
      <Blocks items={details.hardware} color={p.frame} metalness={0.55} roughness={0.4} />
      {environment === 'transit' && <TransitBulkhead p={p} night={night} />}
      <CabinFixtures environment={environment} p={p} night={night} />
    </group>
  );
}

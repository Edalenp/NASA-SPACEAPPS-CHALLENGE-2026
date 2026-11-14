import { Line } from '@react-three/drei';
import type { ScenePalette } from './palette';

/**
 * Low-contrast procedural habitat: no external textures or downloads.
 * Ported from demo-vitruvio (Santiago); colours now come from the palette.
 */
export default function Cabin({ p, night }: { p: ScenePalette; night: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color={p.floor} roughness={0.88} metalness={0.15} />
      </mesh>
      <gridHelper args={[16, 16, p.seam, p.seam]} position={[0, -0.009, 0]} material-transparent material-opacity={0.32} />
      <mesh position={[0, 1.5, -3.1]} receiveShadow>
        <boxGeometry args={[7.2, 3.1, 0.12]} />
        <meshStandardMaterial color={p.wall} roughness={0.85} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 3.55, 1.4, -0.7]} receiveShadow>
            <boxGeometry args={[0.12, 2.9, 5]} />
            <meshStandardMaterial color={p.wall} roughness={0.9} />
          </mesh>
          {[-2.25, -0.6, 1.05].map((z) => (
            <group key={z}>
              <mesh position={[side * 3.46, 1.45, z]}>
                <boxGeometry args={[0.09, 2.05, 1.38]} />
                <meshStandardMaterial color={p.panel} roughness={0.76} metalness={0.12} />
              </mesh>
              <mesh position={[side * 3.39, 1.45, z + 0.45]}>
                <boxGeometry args={[0.06, 0.3, 0.035]} />
                <meshStandardMaterial color={p.frame} />
              </mesh>
            </group>
          ))}
          {side === 1 &&
            [-2.5, -1.2, 1.2, 2.5].map((x) => (
              <mesh key={x} position={[x, 1.45, -2.99]}>
                <boxGeometry args={[1.04, 2.35, 0.045]} />
                <meshStandardMaterial color={p.panel} roughness={0.9} />
              </mesh>
            ))}
        </group>
      ))}
      {/* Recessed access hatch and pressure ribs define the habitat volume. */}
      <mesh position={[0, 1.35, -2.98]}>
        <boxGeometry args={[1.42, 2.45, 0.07]} />
        <meshStandardMaterial color={p.hatch} roughness={0.8} metalness={0.15} />
      </mesh>
      <Line
        points={[[-0.54, 0.22, -2.92], [-0.68, 0.4, -2.92], [-0.68, 2.32, -2.92], [-0.48, 2.5, -2.92], [0.48, 2.5, -2.92], [0.68, 2.32, -2.92], [0.68, 0.4, -2.92], [0.54, 0.22, -2.92], [-0.54, 0.22, -2.92]]}
        color={p.frame}
        lineWidth={2}
      />
      <mesh position={[0.48, 1.27, -2.86]}>
        <boxGeometry args={[0.055, 0.27, 0.055]} />
        <meshStandardMaterial color={p.frame} metalness={0.35} roughness={0.6} />
      </mesh>
      {[-2.7, -0.5, 1.8].map((z) => (
        <group key={z}>
          <Line points={[[-3.4, 0, z], [-3.4, 2.35, z], [-2.6, 3, z], [2.6, 3, z], [3.4, 2.35, z], [3.4, 0, z]]} color={p.frame} lineWidth={5} />
          <mesh position={[0, 2.95, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.8, 0.12]} />
            <meshStandardMaterial color="#eeeee0" emissive="#eeeee0" emissiveIntensity={night ? 0.15 : 0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

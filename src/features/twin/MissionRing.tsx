import { useMemo } from 'react';
import * as THREE from 'three';
import { MISSION_DAY, MISSION_LENGTH } from '../../data/mission';
import type { ScenePalette } from './palette';

/**
 * The mission ring, laid on the deck around the crew member: one tick per
 * mission day. Past days in ink, future days in grey, flagged days in amber
 * with a longer tick. Every fifth day is longer, like a ruler.
 */
export default function MissionRing({ p, flagged }: { p: ScenePalette; flagged: number[] }) {
  const geometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const ink = new THREE.Color(p.ink);
    const future = new THREE.Color(p.future);
    const watch = new THREE.Color(p.watch);
    const r0 = 0.78;
    for (let d = 1; d <= MISSION_LENGTH; d++) {
      // Day 1 at the front of the body, running clockwise seen from above.
      const a = Math.PI / 2 - (d / MISSION_LENGTH) * Math.PI * 2;
      const flag = flagged.includes(d);
      const len = flag ? 0.11 : d % 5 === 0 ? 0.06 : 0.03;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      pos.push(cos * r0, 0, sin * r0, cos * (r0 + len), 0, sin * (r0 + len));
      const c = flag ? watch : d <= MISSION_DAY ? ink : future;
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    // Inner guide circle.
    const seg = 160;
    const guide = new THREE.Color(p.future);
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pos.push(Math.cos(a0) * (r0 - 0.012), 0, Math.sin(a0) * (r0 - 0.012), Math.cos(a1) * (r0 - 0.012), 0, Math.sin(a1) * (r0 - 0.012));
      col.push(guide.r, guide.g, guide.b, guide.r, guide.g, guide.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [p, flagged]);

  return (
    <lineSegments geometry={geometry} position={[0, 0.002, 0]}>
      <lineBasicMaterial vertexColors toneMapped={false} />
    </lineSegments>
  );
}
